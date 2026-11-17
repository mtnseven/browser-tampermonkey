#!/usr/bin/env python3
# Web Ajanı kayıt dosyasını kısa Markdown özetine çevirir.
# Özet yapıyı gösterir, değeri göstermez: yanıtlarda yalnız alan adı ve tür,
# açılan pencerede yalnız başlık ve uzunluk. Claude yalnız bu özeti okur.
# Kullanım: ozetle.py web-ajani-SITE-TARIH.json [--sayfa YOL] [--fotokopi] > ozet.md
#   --fotokopi  sayfa fotokopilerini de basar (değer içerir; yalnız gerektiğinde)
import json, re, sys
from collections import Counter, OrderedDict
from urllib.parse import urlsplit, parse_qsl

args = sys.argv[1:]
if not args:
    sys.exit('Kullanım: ozetle.py KAYIT.json [--sayfa YOL]')
yol = args[0]
sayfa_suz = args[args.index('--sayfa') + 1] if '--sayfa' in args else None
veri = json.load(open(yol, encoding='utf-8'))
olaylar = [o for o in veri.get('olaylar', []) if not sayfa_suz or o.get('sayfa', '').startswith(sayfa_suz)]
out = []
yaz = out.append


def deger_gizle(v):
    s = str(v)
    if re.fullmatch(r'\d{11}', s):
        return '<11 hane>'
    if len(s) > 12:
        return '<%d karakter>' % len(s)
    return s


def sema(v, d=0):
    if isinstance(v, list):
        return {'[]': len(v), 'oge': sema(v[0], d + 1)} if v else {'[]': 0}
    if isinstance(v, dict):
        if d > 5:
            return '{…}'
        return {k: sema(x, d + 1) for k, x in list(v.items())[:80]}
    return 'null' if v is None else type(v).__name__


def sema_metin(s, girinti='    '):
    t = json.dumps(s, ensure_ascii=False)
    return girinti + (t if len(t) <= 900 else t[:900] + ' …(kısaltıldı)')


def yanit_ozet(k):
    y = k.get('yanit')
    if y is None:
        return k.get('icerikTuru') or 'gövde yok'
    t = y.strip()
    if t[:1] in '{[':
        try:
            j = json.loads(t)
            if isinstance(j, str) and j.strip().startswith('<'):
                t = j
            else:
                return 'json ' + json.dumps(sema(j), ensure_ascii=False)[:900]
        except ValueError:
            pass
    if t.startswith('<'):
        th = re.findall(r'<th[^>]*>(.*?)</th>', t, re.S | re.I)
        th = [re.sub(r'<[^>]+>|\s+', ' ', x).strip() for x in th][:30]
        return 'html %d karakter, %d satır%s' % (len(t), len(re.findall(r'<tr', t, re.I)), (', sütunlar: ' + ' | '.join(th)) if th else '')
    return 'metin %d karakter' % len(t)


def adres_kalibi(a):
    u = urlsplit(a)
    q = parse_qsl(u.query, keep_blank_values=True)
    return u.path or a, q


# ------------------------------------------------ başlık
turler = Counter(o['tur'] for o in olaylar)
zamanlar = [o['zaman'] for o in olaylar if o.get('zaman')]
yaz('# Web Ajanı özeti · %s · %s' % (veri.get('site'), veri.get('surum')))
yaz('')
yaz('- Dosya: %s' % yol.split('/')[-1])
yaz('- Kayıt: %d (%s)' % (len(olaylar), ', '.join('%s %d' % kv for kv in turler.most_common())))
if zamanlar:
    yaz('- Aralık: %s → %s' % (min(zamanlar)[:19], max(zamanlar)[:19]))
kur = [o.get('kurulumMs') for o in olaylar if o['tur'] == 'acilis' and o.get('kurulumMs') is not None]
if kur:
    yaz('- Betik kurulumu: en çok %.1f ms, ortalama %.1f ms (%d açılış)' % (max(kur), sum(kur) / len(kur), len(kur)))
sayfalar = OrderedDict()
for o in olaylar:
    sayfalar.setdefault(o.get('sayfa', '?').split('?')[0], []).append(o)
yaz('- Sayfalar: %d' % len(sayfalar))
yaz('')

# ------------------------------------------------ sayfa haritaları
yaz('## Sayfa haritası')
gorulen = {}  # secici → öğe (kapsama için)
for sayfa, liste in sayfalar.items():
    haritalar = [o for o in liste if o['tur'] == 'harita']
    if not haritalar:
        continue
    yaz('')
    yaz('### %s' % sayfa)
    yaz('Başlık: %s · harita sayısı: %d' % (haritalar[-1].get('baslik', ''), len(haritalar)))
    sekme, secim, alan, sayfala, tablo, kalip, frenli, iframe = OrderedDict(), OrderedDict(), OrderedDict(), OrderedDict(), OrderedDict(), OrderedDict(), OrderedDict(), OrderedDict()
    tik_say = 0
    for h in haritalar:
        m = h['harita']
        for t in m.get('tiklanabilir', []):
            gorulen.setdefault(t['secici'] + '|' + t.get('metin', ''), (sayfa, t))
            if t.get('frenli'):
                frenli[t['secici']] = t.get('metin', '')
        tik_say = max(tik_say, len(m.get('tiklanabilir', [])))
        for x in m.get('sekmeler', []):
            sekme[x['metin']] = x
        for x in m.get('secimler', []):
            secim[x['secici']] = x
        for x in m.get('alanlar', []):
            alan[x['secici']] = x
        for x in m.get('sayfalama', []):
            sayfala[x['secici']] = x
        for x in m.get('tablolar', []):
            tablo[x['secici'] + '|' + '|'.join(x.get('sutunlar', []))] = x
        for x in m.get('kaliplar', []):
            kalip[x['kapsayici'] + x['imza']] = x
        for x in m.get('iframeler', []):
            iframe[x['secici']] = x
    yaz('- Tıklanabilir öğe (en kalabalık haritada): %d' % tik_say)
    if sekme:
        yaz('- Sekmeler: ' + ' | '.join(k for k in sekme if k))
    for x in secim.values():
        s = x.get('secenekler', [])
        yaz('- Açılır liste %s (%s): %d seçenek: %s%s' % (x.get('etiket') or x.get('ad') or '', x['secici'], len(s), ' | '.join(s[:20]), ' …' if len(s) > 20 else ''))
    for x in alan.values():
        ek = ' ARAMA' if x.get('arama') else ''
        ek += ' GİZLİ (değer kaydedilmez)' if x.get('gizli') else ''
        yaz('- Alan %s "%s"%s · %s' % (x.get('tur'), x.get('etiket') or x.get('yerTutucu') or x.get('ad') or '', ek, x['secici']))
    for x in sayfala.values():
        yaz('- Sayfalama %s: en büyük %s, görünen %s' % (x['secici'], x.get('enBuyuk'), x.get('sayfalar', [])[:15]))
    for x in tablo.values():
        yaz('- Tablo %s: %d satır, sütunlar: %s' % (x['secici'], x.get('satir', 0), ' | '.join(x.get('sutunlar', []))))
    for x in kalip.values():
        yaz('- Tekrarlanan kalıp %s × %d (%s), örnek alan sayısı %d' % (x['kapsayici'], x['sayi'], x['imza'], len(x.get('ornekAlanlar', []))))
    for x in iframe.values():
        yaz('- Çerçeve/gömülü: %s %s' % (x['secici'], x.get('adres', '')))
    if frenli:
        yaz('- FRENLİ (araç basmaz): ' + ' | '.join('%s (%s)' % (v, k) for k, v in list(frenli.items())[:30]))

# ------------------------------------------------ tıklama akışı
yaz('')
yaz('## Tıklama akışı')
# Tık numarası her sayfa yüklemesinde 1'den başlar; anahtar (yükleme, tık no)
tk = lambda o: (o.get('yk'), o.get('tikNo'))
istek_tik = {}
for o in olaylar:
    if o['tur'] == 'istek' and o.get('tikNo'):
        istek_tik.setdefault(tk(o), []).append(o)
durum_tik = {tk(o): o for o in olaylar if o['tur'] == 'durum'}
pencere_tik = {}
for o in olaylar:
    if o['tur'] == 'pencere':
        pencere_tik.setdefault(tk(o), []).append(o)
tiklanan = set()
sira = 0
onceki_sayfa = None
for o in olaylar:
    if o['tur'] != 'tik':
        continue
    g = o['oge']
    tiklanan.add(g['secici'] + '|' + g.get('metin', ''))
    sira += 1
    yaz('')
    yaz('%d. %s%s "%s" · %s%s' % (sira, '[keşif] ' if o.get('kesif') else '', g.get('etiket'), g.get('metin', ''), g['secici'], ' · FRENLİ' if g.get('frenli') else ''))
    if sira == 1 or o.get('sayfa') != onceki_sayfa:
        yaz('   (sayfa %s)' % o.get('sayfa'))
    onceki_sayfa = o.get('sayfa')
    d = durum_tik.get(tk(o))
    if d:
        if d.get('adresDegisti'):
            yaz('   → adres: %s' % d['adresDegisti'])
        for a in d.get('acilanlar', []):
            h = a.get('harita') or {}
            yaz('   → açıldı: %s "%s" %s · içerik %d karakter · %d tıklanabilir, %d sekme, %d tablo%s' % (
                a.get('tur'), a.get('baslik', ''), a.get('secici', ''), len(a.get('icerik') or ''),
                len(h.get('tiklanabilir', [])), len(h.get('sekmeler', [])), len(h.get('tablolar', [])),
                (' · adres ' + a['adres']) if a.get('adres') else ''))
            if h.get('sekmeler'):
                yaz('     sekmeler: ' + ' | '.join(x['metin'] for x in h['sekmeler']))
            for t in h.get('tablolar', []):
                yaz('     tablo: %d satır, %s' % (t.get('satir', 0), ' | '.join(t.get('sutunlar', []))))
            for t in h.get('tiklanabilir', []):
                gorulen.setdefault(t['secici'] + '|' + t.get('metin', ''), (o.get('sayfa', ''), t))
        if d.get('degisimYok'):
            yaz('   → değişim yok')
        elif not d.get('acilanlar') and not d.get('adresDegisti'):
            yaz('   → %d öğe eklendi, %d öğe değişti' % (d.get('eklenenOge', 0), d.get('degisenOge', 0)))
    for i in istek_tik.get(tk(o), []):
        yaz('   → istek: %s %s → %s' % (i['yontem'], adres_kalibi(i['adres'])[0], i.get('durum')))
    for p in pencere_tik.get(tk(o), []):
        yaz('   → yeni pencere: %s' % p.get('adres'))
for o in olaylar:
    if o['tur'] == 'degisim':
        g = o['oge']
        ne = o.get('secilen') if 'secilen' in o else ('işaretli' if o.get('isaretli') else 'gizli alan' if o.get('gizli') else '%s karakter' % o.get('uzunluk'))
        yaz('- Seçim değişti%s (tık %s): %s → %s' % (' [keşif]' if o.get('kesif') else '', o.get('tikNo'), g.get('secici'), ne))

# ------------------------------------------------ ağ
yaz('')
yaz('## Veri adresleri')
gruplar = OrderedDict()
for o in olaylar:
    if o['tur'] != 'istek':
        continue
    p, q = adres_kalibi(o['adres'])
    gruplar.setdefault(o['yontem'] + ' ' + p, []).append((o, q))
for ad, liste in gruplar.items():
    durumlar = Counter(str(o.get('durum')) for o, _ in liste)
    tetik = sorted({o.get('tikNo') for o, _ in liste if o.get('tikNo')})
    yaz('')
    yaz('- %s · %d kez · durum %s%s' % (ad, len(liste), dict(durumlar), (' · tık ' + ','.join(map(str, tetik))) if tetik else ''))
    params = OrderedDict()
    for _, q in liste:
        for k, v in q:
            params.setdefault(k, set()).add(deger_gizle(v))
    if params:
        yaz('    sorgu: ' + ', '.join('%s=%s' % (k, '/'.join(sorted(v)[:6])) for k, v in params.items()))
    govdeler = set()
    for o, _ in liste:
        g = o.get('istek')
        if not g:
            continue
        try:
            j = json.loads(g)
            govdeler.add('json ' + json.dumps(sema(j), ensure_ascii=False)[:300])
        except ValueError:
            govdeler.add('form ' + ', '.join(k for k, _ in parse_qsl(g, keep_blank_values=True))[:300] if '=' in g else 'metin %d karakter' % len(g))
    for gv in list(govdeler)[:3]:
        yaz('    gövde: ' + gv)
    ornekler = []
    for o, _ in liste:
        y = yanit_ozet(o)
        if y not in ornekler:
            ornekler.append(y)
    for y in ornekler[:3]:
        yaz('    yanıt: ' + y)

# ------------------------------------------------ keşif
kes = [o for o in olaylar if o['tur'] == 'kesif']
if kes:
    yaz('')
    yaz('## Otomatik keşif')
    for o in kes:
        if o.get('basladi'):
            yaz('- Başladı: %s · %s' % (o.get('sayfa'), o.get('zaman', '')[:19]))
        elif o.get('devam'):
            yaz('- Başlangıç sayfasına dönüldü, devam: %s. adımdan' % o.get('adim'))
        elif o.get('ziyaret'):
            yaz('- Gezilen sayfa: %s "%s"' % (o['ziyaret'], o.get('baslik', '')))
        elif o.get('bitti'):
            yaz('- Bitti: %s · %s adım · %s sayfa · %s frenli/güvensiz atlandı' % (o.get('neden'), o.get('adim'), o.get('gezilenSayfa', 0), o.get('atlanan')))
        elif o.get('uyari'):
            yaz('- Uyarı: %s · %s' % (o['uyari'], o.get('mesaj', '')))

# ------------------------------------------------ toplama
top = [o for o in olaylar if o['tur'] == 'toplama']
if top:
    yaz('')
    yaz('## Toplama')
    for o in top:
        if o.get('basladi'):
            yaz('- Başladı: %s · değişkenler "%s" · %s kombinasyon, sıra %s%s' % (o.get('istek'), o.get('degiskenler'), o.get('toplam'), o.get('sira'), ' (sürdür)' if o.get('surdur') else ''))
        elif o.get('bitti'):
            yaz('- Bitti: %s · %s / %s' % (o.get('neden'), o.get('sira'), o.get('toplam')))
    veri = [o for o in top if o.get('degerler') is not None]
    if veri:
        durumlar = Counter(str(o.get('durum')) for o in veri)
        yaz('- Yanıt: %d · durum %s · toplam %d KB' % (len(veri), dict(durumlar), sum(o.get('boyut', 0) for o in veri) // 1024))
        anahtarlar = OrderedDict()
        for o in veri:
            for k, v in o['degerler'].items():
                anahtarlar.setdefault(k, []).append(v)
        for k, l in anahtarlar.items():
            yaz('  - %s: %s … %s (%d değer)' % (k, l[0], l[-1], len(set(l))))
        ornek = next((o for o in veri if o.get('durum') == 200 and o.get('yanit')), None)
        if ornek:
            yaz('  - yanıt yapısı: ' + yanit_ozet(ornek))
        for o in veri:
            if o.get('hata'):
                yaz('  - hata %s: %s' % (json.dumps(o['degerler'], ensure_ascii=False), o['hata']))

# ------------------------------------------------ sağlık dökümü (değer yok; dönüştürme dokum.py ile)
dok = [o for o in olaylar if o['tur'] == 'dokum']
if dok:
    yaz('')
    yaz('## Sağlık dökümü')
    for o in dok:
        if o.get('basladi'):
            yaz('- Başladı: %d liste' % len(o.get('listeler') or []))
        elif o.get('ayrinti'):
            yaz('- %s: %s istek' % (o['ayrinti'], o.get('sayi')))
        elif o.get('bitti'):
            yaz('- Bitti: %s · %s istek, %s hata' % (o.get('neden'), o.get('istek'), o.get('hata')))
    gruplar = OrderedDict()
    for o in dok:
        if o.get('ad'):
            gruplar.setdefault(o['ad'], []).append(o)
    for ad, l in gruplar.items():
        yaz('  - %s: %d yanıt · durum %s · %d KB%s%s' % (ad, len(l), dict(Counter(str(o.get('durum')) for o in l)), sum(o.get('boyut', 0) for o in l) // 1024,
            ' · kesildi %d' % sum(1 for o in l if o.get('kesildi')) if any(o.get('kesildi') for o in l) else '',
            ' · hata: ' + '; '.join(sorted(set(o['hata'] for o in l if o.get('hata'))))[:200] if any(o.get('hata') for o in l) else ''))

# ------------------------------------------------ kapsama
yaz('')
yaz('## Kapsama')
denenmedi = [(s, t) for k, (s, t) in gorulen.items() if k not in tiklanan]
yaz('- Görülen tıklanabilir: %d · tıklanan: %d · denenmedi: %d (frenli %d)' % (
    len(gorulen), len(tiklanan & set(gorulen)), len(denenmedi), sum(1 for _, t in denenmedi if t.get('frenli'))))
# Tekrarlanan öğe (kart düğmesi, sayfa numarası) tek satırda toplanır.
gruplu = OrderedDict()
for s, t in denenmedi:
    if t.get('frenli'):
        continue
    sec = re.sub(r':nth-of-type\(\d+\)', ':nth-of-type(*)', t['secici'])
    metin = re.sub(r'^\d+$', '<sayı>', t.get('metin', ''))
    gruplu.setdefault((t.get('etiket'), metin, sec), []).append(t)
for (etiket, metin, sec), l in list(gruplu.items())[:40]:
    t = l[0]
    yaz('  - denenmedi: %s "%s" %s%s%s' % (etiket, metin, sec if len(l) > 1 else t['secici'], (' × %d' % len(l)) if len(l) > 1 else '', (' → ' + t['adres']) if t.get('adres') and len(l) == 1 else ''))

# ------------------------------------------------ hatalar
hatalar = Counter((o.get('kaynak'), o.get('mesaj', '')[:200]) for o in olaylar if o['tur'] == 'hata')
if hatalar:
    yaz('')
    yaz('## Hatalar')
    for (k, m), n in hatalar.most_common(30):
        yaz('- %s × %d: %s' % (k, n, m))
    for o in olaylar:
        if o['tur'] == 'hata' and o.get('yigin'):
            yaz('  yığın (ilk): ' + o['yigin'].split('\n')[0][:200] + ' · ' + (o.get('dosya') or ''))
            break

# ------------------------------------------------ işaretlenen öğeler
isaret = [o for o in olaylar if o['tur'] == 'isaret']
if isaret:
    yaz('')
    yaz('## İşaretlenen öğeler')
    for o in isaret:
        g = o['oge']
        yaz('')
        yaz('- %s "%s" · sayfa %s' % (g.get('etiket'), g.get('metin', ''), o.get('sayfa')))
        yaz('    seçici: %s (eşleşen %s)' % (g['secici'], o.get('eslesme')))
        if o.get('sinif'):
            yaz('    sınıf: %s' % o['sinif'])
        if o.get('oznitelikler'):
            yaz('    öznitelik: %s' % json.dumps(o['oznitelikler'], ensure_ascii=False)[:400])
        yaz('    çevre: ' + ' < '.join(c['secici'] for c in o.get('cevre', [])[:4]))
        if o.get('stil'):
            yaz('    stil: ' + '; '.join('%s: %s' % kv for kv in o['stil'].items()))
        if o.get('zemin'):
            yaz('    görünen zemin: %s (%s)' % (o['zemin'].get('renk'), o['zemin'].get('kimden', '')))
        if o.get('degiskenler'):
            yaz('    değişkenler: ' + ', '.join('%s=%s' % (d['ad'], d['deger']) for d in o['degiskenler'][:30]))

# ------------------------------------------------ tasarım
tas = [o for o in olaylar if o['tur'] == 'tasarim']
if tas:
    t = tas[-1]
    yaz('')
    yaz('## Sayfa tasarımı (%s, %s)' % (t.get('sayfa'), t.get('baslik', '')))
    yaz('- Renk şeması: %s · bakılan öğe %s · CSS değişkeni %d' % (t.get('renkSemasi') or '-', t.get('bakilanOge'), len(t.get('degiskenler', {}))))
    yaz('- Yazı renkleri: ' + ', '.join('%s ×%d' % (x['deger'], x['sayi']) for x in t.get('yaziRenkleri', [])[:10]))
    yaz('- Zeminler: ' + ', '.join('%s ×%d' % (x['deger'], x['sayi']) for x in t.get('zeminler', [])[:10]))
    yaz('- Yazı tipleri: ' + ', '.join('%s ×%d' % (x['deger'][:60], x['sayi']) for x in t.get('yaziTipleri', [])[:6]))
    yaz('- Boyutlar: ' + ', '.join('%s ×%d' % (x['deger'], x['sayi']) for x in t.get('boyutlar', [])[:10]))
    if t.get('degiskenler'):
        yaz('- Değişkenler (ilk 60): ' + ', '.join('%s=%s' % kv for kv in list(t['degiskenler'].items())[:60]))

# ------------------------------------------------ fotokopi (yalnız --fotokopi ile; değer içerir)
fk = [o for o in olaylar if o['tur'] == 'fotokopi']
if fk:
    yaz('')
    yaz('## Sayfa fotokopisi')
    for o in fk:
        yaz('- %s · %s · %d karakter' % (o.get('sayfa'), o.get('baslik', ''), len(o.get('metin', ''))))
        if '--fotokopi' in args:
            yaz('')
            yaz(o.get('metin', ''))
            yaz('')

print('\n'.join(out))
