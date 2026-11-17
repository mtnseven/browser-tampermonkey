#!/usr/bin/env python3
# Web Ajanı kaydından e-Nabız sağlık dökümü çıkarır: Markdown (okumak için) ve JSON (işlemek için).
# Kaynak: "Sağlık dökümü" aracının yanıtları; yoksa elle gezilen kayıttaki aynı adreslerin yanıtları.
# Çıktı sağlık verisi içerir; sohbete basılmaz, repoya girmez. Ekrana yalnız sayılar yazılır.
# Kullanım: dokum.py KAYIT.json CIKTI_KLASORU
import json, os, re, sys
from html.parser import HTMLParser
from urllib.parse import urlsplit, parse_qsl

BOS = {'br', 'img', 'input', 'meta', 'link', 'hr', 'col', 'source', 'wbr'}


class Dugum:
    def __init__(self, etiket, nit, ust):
        self.etiket, self.nit, self.ust, self.cocuk = etiket, nit, ust, []
        self.sinif = set((nit.get('class') or '').split())

    def metin(self):
        p = []
        for c in self.cocuk:
            p.append(c if isinstance(c, str) else c.metin())
        return re.sub(r'\s+', ' ', ' '.join(p)).strip()

    def hepsi(self, kosul):
        for c in self.cocuk:
            if isinstance(c, Dugum):
                if kosul(c):
                    yield c
                yield from c.hepsi(kosul)

    def sinifli(self, ad):
        return list(self.hepsi(lambda d: ad in d.sinif))

    def ilk(self, ad):
        l = self.sinifli(ad)
        return l[0] if l else None

    def etiketli(self, ad):
        return list(self.hepsi(lambda d: d.etiket == ad))


class Kurucu(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.kok = Dugum('kok', {}, None)
        self.su = self.kok

    def handle_starttag(self, t, a):
        d = Dugum(t, {k: v or '' for k, v in a}, self.su)
        self.su.cocuk.append(d)
        if t not in BOS:
            self.su = d

    def handle_endtag(self, t):
        d = self.su
        while d is not self.kok and d.etiket != t:
            d = d.ust
        if d is not self.kok:
            self.su = d.ust

    def handle_data(self, x):
        if x.strip() and self.su.etiket not in ('script', 'style'):
            self.su.cocuk.append(x)


def agac(html):
    k = Kurucu()
    k.feed(html or '')
    return k.kok


def tablolar(kok):
    # Her tablo: başlıklar ve satırlar (hücre metni); düğme sütunları boş kalır
    sonuc = []
    for t in kok.etiketli('table'):
        bas = [th.metin() for th in t.etiketli('th')]
        sat = []
        for tr in t.etiketli('tr'):
            hucre = [td.metin() for td in tr.cocuk if isinstance(td, Dugum) and td.etiket == 'td']
            if hucre and any(hucre):
                sat.append(hucre)
        if sat:
            sonuc.append({'basliklar': bas, 'satirlar': sat})
    return sonuc


AYLAR = {a: i + 1 for i, a in enumerate(['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'])}


def kart_tarihi(d):
    g, a, y = (d.ilk(s) for s in ('zCardDateGun', 'zCardDateAy', 'zCardDateYil'))
    if not (g and a and y):
        return ''
    try:
        t = '%s-%02d-%02d' % (y.metin(), AYLAR.get(a.metin(), 0), int(g.metin()))
    except ValueError:
        t = ' '.join(x.metin() for x in (g, a, y))
    s = d.ilk('zTarihS')
    return t + (' ' + s.metin() if s and s.metin() else '')


def etiketsiz(d, etiket):
    # "Sonuç : 5,2" → "5,2": hücredeki etiket metni atılır
    m = d.metin()
    return m[len(etiket):].strip() if etiket and m.startswith(etiket) else m


def tahliller(html):
    gunler = []
    for oge in agac(html).sinifli('accordion-item'):
        hst = oge.ilk('hastaneAdi')
        gun = {'tarih': kart_tarihi(oge), 'hastane': hst.metin() if hst else '', 'gruplar': []}
        for tl in oge.sinifli('tahlilList'):
            bas = tl.ilk('tahlilHeader')
            grup_ad = ''
            if bas:
                g = bas.ilk('tahlilGroup') or bas
                grup_ad = re.sub(r'\s*Bu İşlem Bana Ait Değil\s*', ' ', g.metin()).strip()
            sonuclar = []
            for sat in tl.sinifli('rowContainer'):
                hucre = [c for c in sat.cocuk if isinstance(c, Dugum) and 'columnContainer' in c.sinif]
                deger = {}
                for c in hucre:
                    et = c.etiketli('span')
                    etk = et[0].metin() if et else ''
                    ad = etk.rstrip(' :').strip()
                    if ad:
                        deger[ad] = etiketsiz(c, etk)
                    durum = [x[5:] for x in c.sinif if x.startswith('durum') and len(x) > 5]
                    if durum:
                        deger['Durum'] = durum[0]
                if deger:
                    sonuclar.append(deger)
            gun['gruplar'].append({'ad': grup_ad, 'sonuclar': sonuclar})
        if gun['gruplar']:
            gunler.append(gun)
    return gunler


def ziyaret_kartlari(html):
    l = []
    for k in agac(html).sinifli('ziyaretCardList'):
        alan = lambda s: (k.ilk(s).metin() if k.ilk(s) else '')
        l.append({'tarih': kart_tarihi(k), 'hastane': alan('card-text'), 'takipNo': re.sub(r'^Hastane Takip No:\s*', '', alan('hastaneTakipNo')), 'brans': alan('drBrans'), 'hekim': alan('drAdi')})
    return l


def radyoloji_kartlari(html):
    l = []
    for k in agac(html).sinifli('radyolojiCardListe'):
        alanlar = [x for x in (c.metin() for c in k.hepsi(lambda d: not any(isinstance(z, Dugum) for z in d.cocuk))) if x]
        l.append({'tarih': kart_tarihi(k), 'alanlar': alanlar})
    return l


LISTELER = [
    ('/Tahlil/Index', 'Tahliller'), ('/Recete/Index', 'Reçeteler'), ('/Recete/GetOptikReceteler', 'Optik reçeteler'),
    ('/Recete/GetTibbiCihazReceteler', 'Tıbbi cihaz reçeteleri'), ('/Hastalik/Index', 'Hastalıklar'), ('/Ziyaret/Index', 'Ziyaretler'),
    ('/Rapor/Index', 'Raporlar'), ('/RadyolojikGoruntu', 'Radyoloji'), ('/Patoloji/Index', 'Patoloji'), ('/Epikriz/Index', 'Epikrizler')]
AYRINTILAR = [('/Recete/GetReceteDetay', 'Reçete ayrıntısı'), ('/Ziyaret/GetZiyaretDetay', 'Ziyaret ayrıntısı'), ('/Recete/GetIlacKullanimGecmisi', 'İlaç kullanım geçmişi'), ('/hastalik/GetHastalikDetay', 'Hastalık ayrıntısı')]


def yanitlar(olaylar):
    # Adres başına başarılı yanıtlar; döküm yanıtı elle gezilen kayda göre önceliklidir, kesik yanıt sona kalır
    d = {}
    for o in olaylar:
        if o['tur'] not in ('dokum', 'istek') or not o.get('yanit') or (o.get('durum') or 0) >= 400 or o.get('hata'):
            continue
        yol = o.get('adres', '').split('?')[0]
        d.setdefault(yol, []).append(o)
    for yol, l in d.items():
        l.sort(key=lambda o: (bool(o.get('kesildi')), o['tur'] != 'dokum'))
    return d


def md_tablo(bas, sat):
    n = max([len(bas)] + [len(s) for s in sat])
    bas = (bas + [''] * n)[:n]
    temiz = lambda x: str(x).replace('|', '/').replace('\n', ' ')
    c = ['| ' + ' | '.join(temiz(b) for b in bas) + ' |', '|' + ' --- |' * n]
    c += ['| ' + ' | '.join(temiz(x) for x in (s + [''] * n)[:n]) + ' |' for s in sat]
    return c


def bos_sutun_at(t):
    # Düğme sütunları (hep boş) çıkarılır
    n = max([len(t['basliklar'])] + [len(s) for s in t['satirlar']])
    dolu = [i for i in range(n) if any(i < len(s) and s[i] for s in t['satirlar'])]
    return [t['basliklar'][i] if i < len(t['basliklar']) else '' for i in dolu], [[s[i] if i < len(s) else '' for i in dolu] for s in t['satirlar']]


def main():
    if len(sys.argv) < 3:
        sys.exit('Kullanım: dokum.py KAYIT.json CIKTI_KLASORU')
    veri = json.load(open(sys.argv[1], encoding='utf-8'))
    hedef = sys.argv[2]
    os.makedirs(hedef, exist_ok=True)
    y = yanitlar(veri.get('olaylar', []))
    md = ['# Sağlık dökümü · e-Nabız', '', '- Kaynak: %s · Web Ajanı %s · indirildi %s' % (os.path.basename(sys.argv[1]), veri.get('surum'), veri.get('indirildi', '')[:16].replace('T', ' ')), '']
    js = {'kaynak': os.path.basename(sys.argv[1]), 'indirildi': veri.get('indirildi'), 'bolumler': {}}
    sayim = []
    eksik = []
    for yol, ad in LISTELER:
        l = y.get(yol)
        md += ['## ' + ad, '']
        if not l:
            md += ['Kayıtta yok.', '']
            sayim.append((ad, 'yok'))
            eksik.append(ad)
            continue
        o = l[0]
        uyari = ' (UYARI: yanıt kesik, %d / %d karakter; Web Ajanı 0.4.0 Sağlık dökümü ile yeniden al)' % (len(o['yanit']), o['kesildi']) if o.get('kesildi') else ''
        if o.get('kesildi'):
            eksik.append(ad + ' (kesik)')
        aralik = dict(parse_qsl(o.get('istek') or ''))
        if aralik:
            md += ['Sorgu: ' + ', '.join('%s=%s' % kv for kv in aralik.items() if kv[0] != 'activeTab') + uyari, '']
        elif uyari:
            md += [uyari.strip(), '']
        if yol == '/Tahlil/Index':
            g = tahliller(o['yanit'])
            js['bolumler'][ad] = g
            n = sum(len(gr['sonuclar']) for gun in g for gr in gun['gruplar'])
            sayim.append((ad, '%d gün, %d sonuç' % (len(g), n)))
            for gun in g:
                md += ['### %s · %s' % (gun['tarih'], gun['hastane']), '']
                for gr in gun['gruplar']:
                    md += ['#### ' + (gr['ad'] or 'Tahlil'), '']
                    sut = ['İşlem Adı', 'Sonuç', 'Sonuç Birimi', 'Referans Değeri', 'Durum']
                    md += md_tablo(sut, [[s.get(k, '') for k in sut] for s in gr['sonuclar']]) + ['']
        elif yol == '/Ziyaret/Index':
            k = ziyaret_kartlari(o['yanit'])
            js['bolumler'][ad] = k
            sayim.append((ad, '%d ziyaret' % len(k)))
            md += md_tablo(['Tarih', 'Hastane', 'Takip No', 'Branş', 'Hekim'], [[x['tarih'], x['hastane'], x['takipNo'], x['brans'], x['hekim']] for x in k]) + ['']
        elif yol == '/RadyolojikGoruntu':
            k = radyoloji_kartlari(o['yanit'])
            js['bolumler'][ad] = k
            sayim.append((ad, '%d görüntü' % len(k)))
            md += ['- ' + ' · '.join([x['tarih']] + x['alanlar']) for x in k] + ['']
        else:
            t = tablolar(agac(o['yanit']))
            js['bolumler'][ad] = t
            sayim.append((ad, '%d satır' % sum(len(x['satirlar']) for x in t)))
            for x in t:
                md += md_tablo(*bos_sutun_at(x)) + ['']
    md += ['## Ayrıntılar', '']
    for yol, ad in AYRINTILAR:
        l = y.get(yol) or []
        if not l:
            continue
        gorulen, kayitlar = set(), []
        for o in l:
            if o['adres'] in gorulen:
                continue
            gorulen.add(o['adres'])
            q = dict(parse_qsl(urlsplit(o['adres']).query))
            if 'data' in q:
                try:
                    q.update(json.loads(q.pop('data')))
                except ValueError:
                    pass
            if o.get('istek'):
                q.update(dict(parse_qsl(o['istek'])))
            kayitlar.append({'anahtar': q, 'tablolar': tablolar(agac(o['yanit']))})
        js['bolumler'][ad] = kayitlar
        sayim.append((ad, '%d kayıt' % len(kayitlar)))
        md += ['### %s (%d)' % (ad, len(kayitlar)), '']
        for k in kayitlar:
            md += ['#### ' + ' · '.join('%s: %s' % kv for kv in k['anahtar'].items() if kv[1] and kv[0] not in ('hastaneKod',)), '']
            for x in k['tablolar']:
                md += md_tablo(*bos_sutun_at(x)) + ['']
    if eksik:
        md[3:3] = ['- Eksik: ' + ', '.join(eksik), '']
    open(os.path.join(hedef, 'saglik_dokumu.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    json.dump(js, open(os.path.join(hedef, 'saglik_dokumu.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for ad, s in sayim:
        print('%s: %s' % (ad, s))
    print('Eksik: ' + (', '.join(eksik) if eksik else 'yok'))
    print('→ ' + os.path.join(hedef, 'saglik_dokumu.md'))


if __name__ == '__main__':
    main()
