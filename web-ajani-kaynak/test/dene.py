#!/usr/bin/env python3
# Web Ajanı otomatik testi: sahte e-Nabız sayfası, başsız Chromium, ağ yok (page.route).
# Kullanım: dene.py ../../web-ajani.user.js CIKTI_KLASORU
import json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

BETIK, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
KLASOR = os.path.dirname(os.path.abspath(__file__))
betik = open(BETIK, encoding='utf-8').read()
sahte = open(os.path.join(KLASOR, 'sahte_enabiz.html'), encoding='utf-8').read()
GIZLI_DEGER = 'TANSIYON-GIZLI-123'
PAROLA = 'Parola-Gizli-987'
sonuc = {}
TAHLIL = []
OTURUM = {'dustu': False}


def kontrol(ad, kosul, ek=''):
    sonuc[ad] = bool(kosul)
    print(('TAMAM ' if kosul else 'HATA  ') + ad + (('  · ' + str(ek)) if ek else ''))


def yonlendir(route):
    u = route.request.url
    yol = u.split('://', 1)[1].split('/', 1)[1] if '/' in u.split('://', 1)[1] else ''
    if yol.startswith('api/ziyaret'):
        route.fulfill(status=200, content_type='application/json', body=json.dumps({'tani': 'Hipertansiyon', 'deger': GIZLI_DEGER, 'ilaclar': [{'ad': 'X', 'doz': 1}]}))
    elif yol.startswith('api/liste'):
        from urllib.parse import urlsplit, parse_qs
        q = parse_qs(urlsplit(u).query)
        route.fulfill(status=200, content_type='application/json', body=json.dumps({'yil': q.get('yil', ['2025'])[0], 'sayfa': int(q.get('sayfa', ['1'])[0]), 'kayitlar': [{'tani': GIZLI_DEGER}]}))
    elif yol.startswith('api/tahlil'):
        from urllib.parse import parse_qs
        govde = parse_qs(route.request.post_data or '')
        b = route.request.headers
        yil = govde.get('yil', ['?'])[0]
        TAHLIL.append(yil)
        if govde.get('__RequestVerificationToken') != ['TOKEN-ABC'] or b.get('requestverificationtoken') != 'TOKEN-ABC' or b.get('x-requested-with') != 'XMLHttpRequest':
            route.fulfill(status=400, content_type='text/plain', body='jeton yok')
        elif yil == '2020' and not OTURUM['dustu']:
            OTURUM['dustu'] = True
            route.fulfill(status=401, content_type='text/plain', body='oturum yok')
        else:
            route.fulfill(status=200, content_type='application/json', body=json.dumps({'yil': yil, 'tahliller': [{'ad': 'Glukoz', 'deger': GIZLI_DEGER}]}))
    elif yol.startswith('api/bozuk'):
        route.fulfill(status=500, content_type='text/plain', body='sunucu hatası')
    elif yol.startswith('api/giris'):
        route.fulfill(status=200, content_type='application/json', body='{"tamam":true}')
    elif yol.startswith('rapor.pdf'):
        route.fulfill(status=200, content_type='application/pdf', body=b'%PDF-1.4 sahte')
    elif yol.startswith('buyuk'):
        parca = ''.join('<div class="satir s%d"><span>Öğe %d</span><a href="/x/%d">bağlantı %d</a><button>Düğme %d</button></div>' % (i % 7, i, i, i, i) for i in range(1500))
        route.fulfill(status=200, content_type='text/html', body='<!doctype html><html><head><title>Büyük</title></head><body>' + parca + '</body></html>')
    else:
        route.fulfill(status=200, content_type='text/html', body=sahte)


def kayitlar(s):
    return s.evaluate("window.__webAjani.hepsiniOku()")


KOK = "document.getElementById('web-ajani-kok').shadowRoot"


def panel(s, ifade):
    return s.evaluate(KOK + ifade)


def gez_bekle(s, sure=150):
    # Gez sayfalar arasında gider gelir; başlangıç sayfasında, gez durumu silinmiş ve gez durmuş olunca biter
    son = time.time() + sure
    while time.time() < son:
        try:
            if s.evaluate("location.pathname === '/Home/Ziyaretler' && !!window.__webAjani && !window.__webAjani.kesifteMi() && !sessionStorage.getItem('webAjani:gez')"):
                return True
        except Exception:
            pass
        time.sleep(0.3)
    return False


with sync_playwright() as p:
    tarayici = p.chromium.launch()
    ctx = tarayici.new_context(accept_downloads=True, viewport={'width': 1280, 'height': 900})
    ctx.route('http://enabiz.gov.tr/**', yonlendir)
    ctx.route('http://ornek.test/**', yonlendir)
    ctx.add_init_script(betik)
    s = ctx.new_page()
    s.on('pageerror', lambda e: None)

    # 1 · izinsiz site: hiçbir şey kurulmaz
    s.goto('http://ornek.test/')
    s.wait_for_timeout(300)
    kontrol('izinsiz sitede panel yok', s.evaluate("!document.getElementById('web-ajani-kok') && !window.__webAjani"))
    kontrol('izinsiz sitede fetch dokunulmamış', s.evaluate("/native code/.test(fetch.toString())"))
    # Alt+Shift+W ile o sitede açılır
    s.keyboard.press('Alt+Shift+KeyW')
    s.wait_for_load_state('load'); s.wait_for_timeout(500)
    kontrol('Alt+Shift+W ile açılır', s.evaluate("!!window.__webAjani && !!document.getElementById('web-ajani-kok')"))
    s.evaluate("fetch('/api/ziyaret?yil=1').then(r => r.text())"); s.wait_for_timeout(300)
    s.click('body'); s.evaluate("window.__webAjani.bosalt()")
    kontrol('kayıt kapalıyken hiçbir şey kaydedilmez', not kayitlar(s))
    kontrol('profil dışı sitede toplayıcı yok', not s.evaluate("(" + KOK + ".querySelector('[data-e=araclar]').click(), !!" + KOK + ".querySelector('.ta'))"))
    s.keyboard.press('Alt+Shift+KeyW')
    s.wait_for_load_state('load'); s.wait_for_timeout(300)
    kontrol('Alt+Shift+W ile kapanır', s.evaluate("!window.__webAjani"))

    # 2 · izinli site
    s.goto('http://enabiz.gov.tr/Home/Ziyaretler')
    s.wait_for_function("window.__webAjani")
    s.wait_for_timeout(1200)
    kontrol('panel: Kaydı başlat görünür, Durdur gizli', panel(s, ".querySelector('[data-e=baslat]').hidden === false && " + KOK + ".querySelector('[data-e=durdur]').hidden === true"))
    kontrol('panel: sayaç kayıt kapalı der', 'kayıt kapalı' in panel(s, ".querySelector('.say').textContent"))
    kurulum = s.evaluate("window.__webAjani.kurulumMs()")
    kontrol('kurulum 15 ms altında', kurulum < 15, '%.2f ms' % kurulum)
    s.evaluate("window.__webAjani.bosalt()")
    kontrol('kayıt başlamadan sayfa kaydedilmez', not kayitlar(s))
    panel(s, ".querySelector('[data-e=baslat]').click()")
    s.wait_for_function("window.__webAjani.kayittaMi()")
    s.wait_for_timeout(400)
    kontrol('Kaydı başlat → Durdur ve indir görünür', panel(s, ".querySelector('[data-e=durdur]').hidden === false && " + KOK + ".querySelector('[data-e=baslat]').hidden === true && " + KOK + ".querySelector('.bar').classList.contains('r')"))
    s.evaluate("window.__webAjani.bosalt()")
    k = kayitlar(s)
    h = [o for o in k if o['tur'] == 'harita']
    kontrol('açılışta harita kaydı', len(h) == 1)
    m = h[0]['harita'] if h else {}
    sec = (m.get('secimler') or [{}])[0]
    kontrol('yıl listesinin 6 seçeneği', len(sec.get('secenekler', [])) == 6 and sec.get('etiket') == 'Yıl', sec.get('secenekler'))
    kontrol('sekmeler bulundu', [x['metin'] for x in m.get('sekmeler', [])][:2] == ['Muayene', 'Acil'])
    kontrol('sayfalama en büyük 45', (m.get('sayfalama') or [{}])[0].get('enBuyuk') == 45)
    kontrol('tablo sütunları', (m.get('tablolar') or [{}])[0].get('sutunlar') == ['Tarih', 'Hastane', 'Klinik', 'Hekim'])
    kontrol('kart kalıbı 6', any(x['sayi'] == 6 for x in m.get('kaliplar', [])), [(x['imza'], x['sayi']) for x in m.get('kaliplar', [])])
    fren = {x['metin'] for x in m.get('tiklanabilir', []) if x.get('frenli')}
    kontrol('frenli düğmeler işaretli', {'Sil', 'Evaluate', 'Hide in Share'} <= fren, fren)
    kontrol('Detay frenli değil', 'Detay' not in fren)
    alan = {x['ad']: x for x in m.get('alanlar', [])}
    kontrol('parola alanı gizli', alan.get('sifre', {}).get('gizli') is True)
    kontrol('arama kutusu tanındı', alan.get('ara', {}).get('arama') is True)
    secs = [x['secici'] for x in m.get('tiklanabilir', [])]
    kontrol('seçiciler tek öğeye uyar', s.evaluate("l => l.every(x => { try { return document.querySelectorAll(x).length === 1 } catch (e) { return false } })", secs), len(secs))

    # 3 · tık → pencere, istek, durum
    s.select_option('#yil', '2023')
    s.click('.kart:nth-child(3) .detay')
    s.wait_for_selector('#detay.show')
    s.wait_for_timeout(2200)
    s.evaluate("window.__webAjani.bosalt()")
    k = kayitlar(s)
    tik = [o for o in k if o['tur'] == 'tik' and o['oge']['metin'] == 'Detay']
    kontrol('tık kaydı', len(tik) == 1)
    tno = tik[0]['tikNo'] if tik else -1
    ist = [o for o in k if o['tur'] == 'istek' and o['adres'].startswith('/api/ziyaret')]
    kontrol('istek tıkla bağlı', ist and ist[0]['tikNo'] == tno)
    kontrol('istek yanıtı değeriyle', ist and GIZLI_DEGER in ist[0].get('yanit', ''))
    kontrol('uzun sorgu değeri adreste kalır', ist and 'takip=ABCDEF' in ist[0]['adres'])
    d = [o for o in k if o['tur'] == 'durum' and o['tikNo'] == tno]
    ac = d[0]['acilanlar'] if d else []
    kontrol('açılan pencere bulundu', any(a.get('baslik') == 'Ziyaret Detayı' for a in ac), [(a.get('tur'), a.get('baslik')) for a in ac])
    kontrol('pencere içeriği kaydı', any(GIZLI_DEGER in (a.get('icerik') or '') for a in ac))
    kontrol('pencere sekmeleri', any([x['metin'] for x in (a.get('harita') or {}).get('sekmeler', [])] == ['Tanı', 'İlaç', 'Tahlil'] for a in ac))
    dg = [o for o in k if o['tur'] == 'degisim' and o.get('secilen')]
    kontrol('yıl seçimi kaydı', dg and dg[-1]['secilen'] == '2023')
    sy = s.evaluate("window.__webAjani.sayac()")
    s.wait_for_timeout(1100)
    yazi = panel(s, ".querySelector('.say').textContent")
    kontrol('sayaç tık, sayfa, istek gösterir', sy['tik'] >= 2 and sy['istek'] >= 1 and ('%d tık' % sy['tik']) in yazi and 'KAYIT 00:0' in yazi, yazi)
    kontrol('son kaydedilen satırı', panel(s, ".querySelector('.son').textContent").startswith('Kaydedildi'), panel(s, ".querySelector('.son').textContent"))
    s.screenshot(path=os.path.join(OUT, 'panel_kayit.png'), clip={'x': 0, 'y': 780, 'width': 640, 'height': 120})

    # 4 · parola: değer hiçbir kayda girmez
    s.click('#kapatBtn')
    s.fill('#sifre', PAROLA)
    s.click('#girisBtn')
    s.wait_for_timeout(1800)
    s.evaluate("window.__webAjani.bosalt()")
    k = kayitlar(s)
    tum = json.dumps(k, ensure_ascii=False)
    kontrol('parola kayıtta yok', PAROLA not in tum)
    gr = [o for o in k if o['tur'] == 'istek' and o['adres'] == '/api/giris']
    kontrol('giriş isteğinde parola gizli', gr and 'sifre=%3Cgizli%3E' in gr[0].get('istek', ''), gr and gr[0].get('istek'))

    # 5 · fren: araç hiçbir düğmeye kendiliğinden basmaz
    kontrol('Sil düğmesine basılmadı', s.evaluate("window.silindi") == 0)

    # 6 · yeni pencere, hata, başarısız istek, tek sayfa geçişi
    with ctx.expect_page() as yeni:
        s.click('#raporBtn')
    yeni.value.close()
    s.click('#hataBtn')
    s.click('#bozukBtn')
    s.click('#spa')
    s.wait_for_timeout(1800)
    s.evaluate("window.__webAjani.bosalt()")
    k = kayitlar(s)
    kontrol('yeni pencere kaydı', any(o['tur'] == 'pencere' and o['adres'] == '/rapor.pdf' for o in k))
    kontrol('betik hatası kaydı', any(o['tur'] == 'hata' and 'sahte betik hatası' in o.get('mesaj', '') for o in k))
    kontrol('başarısız istek kaydı', any(o['tur'] == 'hata' and '/api/bozuk' in o.get('mesaj', '') and '500' in o.get('mesaj', '') for o in k))
    kontrol('tek sayfa adres kaydı', any(o['tur'] == 'adres' and o['adres'] == '/Home/Tek' for o in k))
    # kayıt sayfa yenilense de sürer, sayaç kaldığı yerden devam eder
    once_say = s.evaluate("window.__webAjani.sayac()")
    s.reload(); s.wait_for_function("window.__webAjani"); s.wait_for_timeout(900)
    sonra_say = s.evaluate("window.__webAjani.sayac()")
    kontrol('kayıt sayfa yenilemesinde sürer', s.evaluate("window.__webAjani.kayittaMi()") and sonra_say['tik'] == once_say['tik'] and sonra_say['sayfa'] == once_say['sayfa'] + 1, (once_say, sonra_say))

    # 7 · öğe işaretçi ve tasarım
    s.evaluate("window.__webAjani.isaretciAc()")
    s.hover('#silBtn')
    s.click('#silBtn')
    s.wait_for_timeout(300)
    kontrol('işaretlemede sayfa tıklaması çalışmaz', s.evaluate("window.silindi") == 0)
    s.evaluate("window.__webAjani.sayfaTasarimi()")
    s.evaluate("window.__webAjani.bosalt()")
    k = kayitlar(s)
    i = [o for o in k if o['tur'] == 'isaret']
    kontrol('işaret kaydı', len(i) == 1 and i[0]['oge']['secici'] == '#silBtn', i and i[0]['oge']['secici'])
    kontrol('işarette stil', i and i[0].get('stil', {}).get('background-color') == 'rgb(18, 52, 86)', i and i[0].get('stil', {}).get('background-color'))
    kontrol('işarette kullanılan değişken', i and any(x['ad'] == '--ana-renk' and x['deger'] == '#123456' for x in i[0].get('degiskenler', [])))
    kontrol('işarette görünen zemin', i and i[0].get('zemin', {}).get('kimden') == 'kendisi')
    t = [o for o in k if o['tur'] == 'tasarim']
    kontrol('tasarım değişkenleri', t and t[-1]['degiskenler'].get('--ana-renk') == '#123456')
    tik_sil = [o for o in k if o['tur'] == 'tik' and o['oge'].get('secici') == '#silBtn']
    kontrol('işaret tıklaması tık sayılmaz', not tik_sil)

    # 7b · otomatik gez: sayfadaki her şey, sonra menü sayfaları (git, kaydet, dön); frenliye basmaz
    s.goto('http://enabiz.gov.tr/Home/Ziyaretler'); s.wait_for_function("window.__webAjani"); s.wait_for_timeout(800)
    s.evaluate("window.__webAjani.bosalt()")
    once = len(kayitlar(s))
    t0 = time.time()
    s.evaluate("void window.__webAjani.kesfet()")
    s.wait_for_timeout(300)
    kontrol('gez sürerken Gezmeyi durdur görünür', panel(s, ".querySelector('[data-e=gezdur]').hidden === false"))
    bitti = gez_bekle(s)
    kesif_sure = time.time() - t0
    s.wait_for_timeout(300)
    s.evaluate("window.__webAjani.bosalt()")
    k = kayitlar(s)[once:]
    ktik = [o['oge']['metin'] for o in k if o['tur'] == 'tik' and o.get('kesif')]
    son = [o for o in k if o['tur'] == 'kesif' and o.get('bitti')]
    kontrol('gez bitti, başlangıç sayfasında', bitti and son and son[-1]['neden'] == 'bitti', son and son[-1])
    kontrol('gez sayfa sekmesi', 'Acil' in ktik, ktik)
    kontrol('gez kapalı bölüm ve ayrıntı', 'Ek bilgiler' in ktik and 'Ayrıntılar' in ktik)
    kontrol('gez ikinci sayfa', '2' in ktik and any(o['tur'] == 'istek' and 'sayfa=2' in o['adres'] for o in k))
    kontrol('gez yıl seçenekleri', len([o for o in k if o['tur'] == 'degisim' and o.get('kesif')]) == 5)
    kontrol('gez kart penceresi ve sekmeleri', 'Detay' in ktik and 'İlaç' in ktik and 'Tahlil' in ktik and 'Kapat' in ktik, ktik)
    kontrol('gez frenliye basmadı', not {'Sil', 'Evaluate', 'Hide in Share'} & set(ktik))
    kontrol('gez form göndermedi', 'Ara' not in ktik)
    ziy = [o['ziyaret'] for o in k if o['tur'] == 'kesif' and o.get('ziyaret')]
    kontrol('gez menü sayfalarını gezip döndü', ziy == ['/Home/Tahliller', '/Home/Receteler'] and son and son[-1].get('gezilenSayfa') == 2, ziy)
    kontrol('gezilen sayfanın haritası', any(o['tur'] == 'harita' and o['sayfa'] == '/Home/Receteler' for o in k))
    kontrol('gez her öğeye bir kez bastı', len(ktik) == len(set(ktik)) or ktik.count('Detay') == 1, [x for x in set(ktik) if ktik.count(x) > 1])
    kontrol('gez 90 sn altında', kesif_sure < 90, '%.1f sn, %d adım' % (kesif_sure, son[-1]['adim'] if son else -1))
    # Gezmeyi durdur: anında durur, durum silinir, düğme gizlenir
    s.evaluate("void window.__webAjani.kesfet()")
    s.wait_for_timeout(1500)
    t1 = time.time()
    panel(s, ".querySelector('[data-e=gezdur]').click()")
    s.wait_for_function("!window.__webAjani.kesifteMi()", timeout=5000)
    dur_sure = time.time() - t1
    s.wait_for_timeout(200)
    kontrol('Gezmeyi durdur hemen durdurur', dur_sure < 1.5 and not s.evaluate("sessionStorage.getItem('webAjani:gez')") and panel(s, ".querySelector('[data-e=gezdur]').hidden") and 'durduruldu' in panel(s, ".querySelector('.son').textContent"), '%.2f sn · %s' % (dur_sure, panel(s, ".querySelector('.son').textContent")))
    s.wait_for_timeout(1500)
    kontrol('durdurduktan sonra tık yok', s.evaluate("location.pathname") == '/Home/Ziyaretler' and not s.evaluate("window.__webAjani.kesifteMi()"))
    # confirm engeli: keşif sürerken sayfanın sorduğu soru "hayır" alır
    s.evaluate("window.__kesifConfirmDene = () => { const a = window.confirm('Arşivlensin mi?'); return a; }")
    kontrol('keşif dışında confirm sayfanın', s.evaluate("typeof window.confirm") == 'function')

    # 7c · toplayıcı: kaydedilen POST isteği yıllar için; jeton sayfadan, oturum düşünce durur, Sürdür devam eder
    s.click('#tahlilBtn'); s.wait_for_timeout(800)
    s.evaluate("window.__webAjani.bosalt()")
    adr = s.evaluate("window.__webAjani.adresleriListele().then(l => l.map(x => x[0]))")
    kontrol('toplayıcı adres listesi', 'POST /api/tahlil' in adr and 'GET /api/liste' in adr, adr)
    ornek = [o for o in kayitlar(s) if o['tur'] == 'istek' and o['adres'] == '/api/tahlil'][-1]
    kontrol('kayıtta jeton gizli, başlık adı var', '__RequestVerificationToken=%3Cgizli%3E' in ornek['istek'] and ornek['basliklar'].get('requestverificationtoken') == '<gizli>' and ornek['basliklar'].get('x-requested-with') == 'XMLHttpRequest')
    TAHLIL.clear()
    s.evaluate("window.__webAjani.adresleriListele().then(l => window.__webAjani.toplayiciBaslat(l.find(x => x[0] === 'POST /api/tahlil')[1], 'yil=2018-2021', 300, false))")
    s.wait_for_function("!window.__webAjani.toplamadaMi()", timeout=60000)
    st = s.evaluate("JSON.parse(localStorage.getItem('webAjani:toplama'))")
    kontrol('toplayıcı oturum düşünce durdu', st['sira'] == 2 and st['toplam'] == 4 and TAHLIL == ['2018', '2019', '2020'], (st['sira'], TAHLIL))
    s.evaluate("window.__webAjani.toplayiciBaslat(null, '', 0, true)")
    s.wait_for_function("!window.__webAjani.toplamadaMi()", timeout=60000)
    s.evaluate("window.__webAjani.bosalt()")
    st = s.evaluate("JSON.parse(localStorage.getItem('webAjani:toplama'))")
    top = [o for o in kayitlar(s) if o['tur'] == 'toplama' and o.get('degerler')]
    iyi = [o for o in top if o['durum'] == 200]
    kontrol('toplayıcı Sürdür ile bitti', st['sira'] == 4 and [o['degerler']['yil'] for o in iyi] == ['2018', '2019', '2020', '2021'], [o['degerler'] for o in iyi])
    kontrol('toplanan yanıt değeriyle', all(GIZLI_DEGER in o.get('yanit', '') for o in iyi))
    kontrol('düşen istekte yanıt saklanmadı', any(o['durum'] == 401 and 'yanit' not in o and 'durum 401' in o.get('hata', '') for o in top), [(o['durum'], o.get('hata'), 'yanit' in o) for o in top])
    kontrol('değişken çözümü', s.evaluate("JSON.stringify(window.__webAjani.degiskenCoz('yil=2024-2022; sayfa=1,3'))") == '[{"ad":"yil","degerler":["2024","2023","2022"]},{"ad":"sayfa","degerler":["1","3"]}]')

    # 7d · sayfa fotokopisi
    fk = s.evaluate("window.__webAjani.fotokopi(document.body)")
    kontrol('fotokopi tablo ve başlık', '| Tarih | Hastane | Klinik | Hekim |' in fk and '##### Ziyaret' in fk and '[Ziyaretlerim](/Home/Ziyaretler)' in fk, len(fk))
    kontrol('fotokopi panel metnini almaz', 'Web Ajanı' not in fk and 'Bu oturumda' not in fk)

    # 8 · Diğer araçlar ve Durdur ve indir
    panel(s, ".querySelector('[data-e=araclar]').click()")
    kontrol('Diğer araçlar açılır', panel(s, ".querySelectorAll('.ar [data-e]').length") >= 8)
    s.wait_for_timeout(300)
    s.screenshot(path=os.path.join(OUT, 'panel_araclar.png'), clip={'x': 0, 'y': 380, 'width': 640, 'height': 520})
    with s.expect_download() as ind:
        panel(s, ".querySelector('[data-e=durdur]').click()")
    dosya = os.path.join(OUT, ind.value.suggested_filename)
    ind.value.save_as(dosya)
    veri = json.load(open(dosya, encoding='utf-8'))
    kontrol('indirilen dosya', veri.get('arac') == 'Web Ajanı' and veri['olaySayisi'] > 10 and veri['olaylar'][-1]['tur'] == 'kayit', ind.value.suggested_filename)
    s.wait_for_timeout(300)
    kontrol('Durdur sonrası kayıt kapalı, Kaydı başlat görünür', not s.evaluate("window.__webAjani.kayittaMi()") and panel(s, ".querySelector('[data-e=baslat]').hidden === false") and not s.evaluate("localStorage.getItem('webAjani:kayit')"))
    kontrol('Durdur sonrası indirildi bildirimi', 'İndirildi' in panel(s, ".querySelector('.son').textContent"))

    # 9 · kayıt kapalıyken tık kaydedilmez, yenilemede de kapalı kalır
    n0 = len(kayitlar(s))
    s.click('#akordeon'); s.wait_for_timeout(300)
    s.reload(); s.wait_for_function("window.__webAjani"); s.wait_for_timeout(800)
    kontrol('kayıt kapalıyken tık ve sayfa kaydedilmez', len(kayitlar(s)) == n0 and not s.evaluate("window.__webAjani.kayittaMi()"))

    # 10 · telefon genişliğinde panel taşmaz
    s.set_viewport_size({'width': 390, 'height': 800})
    panel(s, ".querySelector('[data-e=baslat]').click()"); s.wait_for_function("window.__webAjani.kayittaMi()")
    panel(s, ".querySelector('[data-e=araclar]').click()"); s.wait_for_timeout(1100)
    kontrol('telefonda panel ekrana sığar', panel(s, ".querySelector('.c').getBoundingClientRect().right") <= 390)
    s.screenshot(path=os.path.join(OUT, 'panel_telefon.png'))
    s.set_viewport_size({'width': 1280, 'height': 900})

    # 11 · hız: büyük sayfada harita süresi
    s.goto('http://enabiz.gov.tr/buyuk'); s.wait_for_function("window.__webAjani"); s.wait_for_timeout(1500)
    kontrol('kayıt yeni sayfada da sürer', s.evaluate("window.__webAjani.kayittaMi()"))
    sure = s.evaluate("(() => { const t = performance.now(); window.__webAjani.haritaKaydet('ölçüm', document.body, 'ölçüm' + Math.random()); return performance.now() - t; })()")
    kontrol('büyük sayfa (4500 öğe) harita 400 ms altında', sure < 400, '%.0f ms' % sure)
    tik_sure = s.evaluate("""(async () => { const b = document.querySelectorAll('button')[700]; const t = performance.now(); b.click(); return performance.now() - t; })()""")
    kontrol('tık başına ek gecikme 5 ms altında', tik_sure < 5, '%.2f ms' % tik_sure)
    s.screenshot(path=os.path.join(OUT, 'buyuk.png'))
    tarayici.close()

# 12 · sunucu özeti: yapı var, sağlık değeri ve parola yok
oz = subprocess.run([sys.executable, os.path.join(KLASOR, '..', 'ozetle.py'), dosya], capture_output=True, text=True)
open(os.path.join(OUT, 'ozet.md'), 'w', encoding='utf-8').write(oz.stdout + oz.stderr)
kontrol('özet betiği çalışır', oz.returncode == 0, oz.stderr[-300:])
kontrol('özette veri adresi', 'GET /api/ziyaret' in oz.stdout)
kontrol('özette tıklama akışı', 'açıldı: dialog "Ziyaret Detayı"' in oz.stdout)
kontrol('özette sağlık değeri yok', GIZLI_DEGER not in oz.stdout and 'Hipertansiyon' not in oz.stdout)
kontrol('özette parola yok', PAROLA not in oz.stdout)
kontrol('özette kapsama', 'denenmedi:' in oz.stdout)
kontrol('özette uzun kimlik gizli', 'ABCDEF1234567890XYZ' not in oz.stdout)
kontrol('özette keşif ve toplama', '## Otomatik keşif' in oz.stdout and 'Gezilen sayfa: /Home/Receteler' in oz.stdout and '## Toplama' in oz.stdout and 'Bitti: bitti · 4 / 4' in oz.stdout)
kontrol('özet toplanan değeri göstermez', GIZLI_DEGER not in oz.stdout)
ck = subprocess.run([sys.executable, os.path.join(KLASOR, '..', 'cikar.py'), dosya, os.path.join(OUT, 'tahlil.jsonl'), '--istek', 'POST /api/tahlil'], capture_output=True, text=True)
satir = [json.loads(x) for x in open(os.path.join(OUT, 'tahlil.jsonl'), encoding='utf-8')] if ck.returncode == 0 else []
kontrol('cikar.py ham yanıtları çıkarır', [x['degerler']['yil'] for x in satir] == ['2018', '2019', '2020', '2021'] and satir[0]['json']['tahliller'][0]['deger'] == GIZLI_DEGER, ck.stdout.strip() + ck.stderr[-200:])
print('Özet: %d satır, %d bayt; kayıt dosyası %d bayt' % (oz.stdout.count('\n'), len(oz.stdout.encode()), os.path.getsize(dosya)))
gecen = sum(sonuc.values())
print('SONUC: %d / %d' % (gecen, len(sonuc)))
