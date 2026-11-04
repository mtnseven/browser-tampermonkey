#!/usr/bin/env python3
# Site Tema v2 otomatik testi: sahte claude.ai sayfası, başsız Chromium.
# Kullanım: dene.py ../../site-tema.user.js http://127.0.0.1:8765/ CIKTI_KLASORU
import json, sys
from playwright.sync_api import sync_playwright

BETIK, KOK, OUT = sys.argv[1], sys.argv[2].rstrip('/') + '/', sys.argv[3]
betik = open(BETIK, encoding='utf-8').read()
SHIM = """
window.__ST_SITE = 'claude.ai';
window.__depo = JSON.parse(sessionStorage.getItem('__depo') || '{}');
window.GM_getValue = (k, v) => k in __depo ? JSON.parse(JSON.stringify(__depo[k])) : v;
window.GM_setValue = (k, v) => { __depo[k] = JSON.parse(JSON.stringify(v)); sessionStorage.setItem('__depo', JSON.stringify(__depo)); };
window.GM_registerMenuCommand = () => {};
window.GM_xmlhttpRequest = o => setTimeout(() => o.onerror && o.onerror(), 0);
window.GM_setClipboard = t => { window.__pano = t; };
"""
K = "document.querySelector('st-kok').shadowRoot"
sonuc = {}
def kontrol(ad, kosul):
    sonuc[ad] = bool(kosul)
    print(('TAMAM ' if kosul else 'HATA  ') + ad)

def css(s, sec, oz):
    return s.evaluate(f"getComputedStyle(document.querySelector({json.dumps(sec)}))[{json.dumps(oz)}]")

def nesne_tikla(s, ad, ctrl=False):
    s.evaluate(f"""(() => {{ const o = [...{K}.querySelectorAll('.lb .o')].find(x => x.textContent.replace('✓ ','').trim() === {json.dumps(ad)});
      o.dispatchEvent(new MouseEvent('click', {{ bubbles: true, ctrlKey: {str(ctrl).lower()} }})); }})()""")
    s.wait_for_timeout(60)

def bolge_tikla(s, ad):
    s.evaluate(f"[...{K}.querySelectorAll('.lb .o')].find(x => x.firstChild.textContent === {json.dumps(ad)}).click()")
    s.wait_for_timeout(60)

def secim(s):
    return s.evaluate("__depo['claude.ai:secim'] || []")

with sync_playwright() as p:
    b = p.chromium.launch()
    for sayfa_adi in ('sahte.html', 'sahte_csp.html'):
        print('==', sayfa_adi)
        c = b.new_context(viewport={'width': 1280, 'height': 860}, accept_downloads=True)
        s = c.new_page()
        hatalar, diyalog = [], {'cevap': ''}
        s.on('pageerror', lambda e: hatalar.append(str(e)))
        oneriler = []
        s.on('dialog', lambda d: (oneriler.append(d.default_value), d.accept(diyalog['cevap']) if d.type == 'prompt' else d.accept()))
        s.add_init_script(SHIM + betik)
        s.goto(KOK + sayfa_adi); s.wait_for_timeout(400)
        t = ('csp ' if 'csp' in sayfa_adi else 'duz ')
        kontrol(t + 'panel kuruldu', s.evaluate(f"!!{K}.querySelector('.panel')"))
        kontrol(t + 'stil yolu adopted', s.evaluate(f"{K}.host && document.adoptedStyleSheets.length > 0"))
        kontrol(t + 'goz temasi uygulandi', css(s, 'body', 'backgroundColor') == 'rgb(0, 0, 0)')
        s.keyboard.press('Control+Shift+Y'); s.wait_for_timeout(150)
        kontrol(t + 'panel acildi', s.evaluate("document.documentElement.classList.contains('st-acik')"))
        kontrol(t + 'panel stili var', s.evaluate(f"getComputedStyle({K}.querySelector('.panel')).display") == 'flex')
        # nesne seç, zemin canlı değişsin
        bolge_tikla(s, 'Sohbet'); nesne_tikla(s, 'Mesaj balonu')
        kontrol(t + 'liste ile secim', secim(s) == ['balon'])
        s.evaluate(f"const h={K}.querySelector('.hex'); h.value='#203040'; h.dispatchEvent(new Event('change'))"); s.wait_for_timeout(120)
        kontrol(t + 'zemin canli degisti', css(s, '.bg-bg-300', 'backgroundColor') == 'rgb(32, 48, 64)')
        nesne_tikla(s, 'Claude yanıtı', ctrl=True)
        kontrol(t + 'ctrl+tik coklu secim', secim(s) == ['balon', 'yanit'])
        kontrol(t + 'secim kutusu 2 etiket', s.evaluate(f"{K}.querySelectorAll('.secim .etk').length") == 2)
        kontrol(t + 'farkli isareti', s.evaluate(f"!!{K}.querySelector('.grup-bas .farkli')"))
        s.evaluate(f"""(() => {{ const r=[...{K}.querySelectorAll('.satir')].find(x=>x.querySelector('.e').textContent.startsWith('Boyut'));
          const n=r.querySelector('input[type=number]'); n.value='19'; n.dispatchEvent(new Event('change')); }})()"""); s.wait_for_timeout(120)
        kontrol(t + 'boyut ikisine birden', css(s, '.font-claude-response', 'fontSize') == '19px' and css(s, '.bg-bg-300', 'fontSize') == '19px')
        kontrol(t + 'boyut alt ogeye indi', css(s, '.font-claude-response p', 'fontSize') == '19px')
        s.evaluate(f"{K}.querySelectorAll('.secim .etk .x')[1].click()"); s.wait_for_timeout(60)
        kontrol(t + 'etiket x secimden cikardi', secim(s) == ['balon'])
        # Ctrl+sağ tık: bilinen nesne, sonra dıştaki, düz sağ tık dokunmaz
        r = s.evaluate("(()=>{const r=document.querySelector('.font-copernicus').getBoundingClientRect();return [r.left+5,r.top+5]})()")
        s.keyboard.down('Control'); s.mouse.click(r[0], r[1], button='right'); s.keyboard.up('Control'); s.wait_for_timeout(120)
        kontrol(t + 'ctrl+sag tik bilinen nesne', secim(s) == ['baslik'])
        s.keyboard.down('Control'); s.mouse.click(r[0], r[1], button='right'); s.keyboard.up('Control'); s.wait_for_timeout(120)
        kontrol(t + 'tekrar ctrl+sag tik distaki', secim(s) == ['ust'])
        s.evaluate("window.__varsayilan = null; window.addEventListener('contextmenu', e => { window.__varsayilan = e.defaultPrevented; })")
        s.mouse.click(r[0], r[1], button='right'); s.wait_for_timeout(100)
        kontrol(t + 'duz sag tik dokunmadi', secim(s) == ['ust'] and s.evaluate('window.__varsayilan') is False)
        diyalog['cevap'] = 'Sabit kutu'
        r = s.evaluate("(()=>{const r=document.querySelector('.sabit').getBoundingClientRect();return [r.left+5,r.top+5]})()")
        s.keyboard.down('Control'); s.mouse.click(r[0], r[1], button='right'); s.keyboard.up('Control'); s.wait_for_timeout(500)
        yeni = s.evaluate("(__depo['claude.ai:kullanici'] || {}).ozelNesneler || []")
        kontrol(t + 'ad onerisi sayfa yazisi degil', oneriler and 'sabit öğe' not in oneriler[-1] and 'div' in oneriler[-1])
        kontrol(t + 'yeni nesne eklendi ve secildi', len(yeni) == 1 and yeni[0]['ad'] == 'Sabit kutu' and secim(s) == [yeni[0]['id']])
        s.evaluate(f"const h={K}.querySelector('.hex'); h.value='#405060'; h.dispatchEvent(new Event('change'))"); s.wait_for_timeout(120)
        kontrol(t + 'yeni nesne canli boyandi', css(s, '.sabit', 'backgroundColor') == 'rgb(64, 80, 96)')
        # tema rengi nesnesi; Yazı grubu kilitli
        bolge_tikla(s, 'Sayfa geneli')
        s.evaluate(f"[...{K}.querySelectorAll('.lb .o')].find(x => x.textContent.includes('tüm sayfanın ana arka planı')).click()"); s.wait_for_timeout(80)
        kontrol(t + 'tema rengi nesnesinde yazi kilitli', s.evaluate(f"[...{K}.querySelectorAll('.grup')][1].classList.contains('kilit')"))
        s.evaluate(f"const h={K}.querySelector('.hex'); h.value='#101418'; h.dispatchEvent(new Event('change'))"); s.wait_for_timeout(120)
        kontrol(t + 'tema rengi canli', css(s, 'body', 'backgroundColor') == 'rgb(16, 20, 24)')
        # sayfa teması ve panel teması
        s.evaluate(f"const t={K}.querySelector('.cubuk select'); t.value='Kağıt (açık)'; t.dispatchEvent(new Event('change'))"); s.wait_for_timeout(150)
        kontrol(t + 'acik sayfa temasi', css(s, 'body', 'backgroundColor') == 'rgb(241, 236, 225)')
        s.screenshot(path=f'{OUT}/v2_kagit_{sayfa_adi[:-5]}.png')
        s.evaluate(f"[...{K}.querySelectorAll('.cubuk button')].find(b=>b.textContent==='☰').click()"); s.wait_for_timeout(80)
        s.evaluate(f"[...{K}.querySelectorAll('.acilir .oge')].find(b=>b.textContent.includes('Sis (açık)')).click()"); s.wait_for_timeout(80)
        kontrol(t + 'panel temasi degisti', s.evaluate(f"getComputedStyle({K}.querySelector('.panel')).backgroundColor") == 'rgb(233, 237, 241)')
        # geri al ve Geçmiş
        s.evaluate(f"{K}.querySelector('.ayar').focus()")
        s.keyboard.press('Control+z'); s.wait_for_timeout(150)
        kontrol(t + 'ctrl+z panel temasi geri', s.evaluate(f"getComputedStyle({K}.querySelector('.panel')).backgroundColor") == 'rgb(11, 15, 20)')
        s.keyboard.press('Control+z'); s.wait_for_timeout(150)
        kontrol(t + 'ctrl+z sayfa temasi geri', css(s, 'body', 'backgroundColor') == 'rgb(16, 20, 24)')
        s.evaluate(f"[...{K}.querySelectorAll('.cubuk button')].find(b=>b.textContent==='Geçmiş').click()"); s.wait_for_timeout(80)
        adim = s.evaluate(f"{K}.querySelectorAll('.acilir .oge').length")
        kontrol(t + 'gecmis listesi', adim >= 8)
        s.evaluate(f"{K}.querySelectorAll('.acilir .oge')[1].click()"); s.wait_for_timeout(150)
        kontrol(t + 'gecmiste geri gitti', css(s, '.bg-bg-300', 'backgroundColor') == 'rgb(32, 48, 64)' and css(s, '.font-claude-response', 'fontSize') != '19px')
        s.evaluate(f"[...{K}.querySelectorAll('.acilir .oge')].pop().click()"); s.wait_for_timeout(150)
        kontrol(t + 'gecmiste ileri gitti', css(s, 'body', 'backgroundColor') == 'rgb(241, 236, 225)')
        uzunluk = s.evaluate("JSON.parse(sessionStorage.getItem('__depo'))['claude.ai:gecmis']")
        s.wait_for_timeout(600)
        s.reload(); s.wait_for_timeout(500)
        kontrol(t + 'yenilemede tema kaldi', css(s, 'body', 'backgroundColor') == 'rgb(241, 236, 225)' and s.evaluate(f"getComputedStyle({K}.querySelector('.panel')).backgroundColor") == 'rgb(233, 237, 241)')
        s.evaluate(f"const t={K}.querySelector('.cubuk select'); t.value='Göz'; t.dispatchEvent(new Event('change'))"); s.wait_for_timeout(150)
        kontrol(t + 'yenilemede nesne ayari kaldi', css(s, '.bg-bg-300', 'backgroundColor') == 'rgb(32, 48, 64)' and css(s, 'body', 'backgroundColor') == 'rgb(16, 20, 24)')
        kontrol(t + 'yenilemede gecmis kaldi', s.evaluate("(__depo['claude.ai:gecmis'] || {liste:[]}).liste.length") >= 8)
        # Orijinal
        s.evaluate(f"const t={K}.querySelector('.cubuk select'); t.value='Orijinal'; t.dispatchEvent(new Event('change'))"); s.wait_for_timeout(150)
        kontrol(t + 'orijinal tema', css(s, 'body', 'backgroundColor') == 'rgb(245, 244, 239)' and css(s, '.bg-bg-300', 'backgroundColor') == 'rgb(232, 230, 220)')
        s.evaluate(f"const t={K}.querySelector('.cubuk select'); t.value='Göz'; t.dispatchEvent(new Event('change'))"); s.wait_for_timeout(150)
        # tarama ve dosyalar
        s.evaluate(f"[...{K}.querySelectorAll('.cubuk button')].find(b=>b.textContent==='☰').click()"); s.wait_for_timeout(80)
        s.evaluate(f"[...{K}.querySelectorAll('.acilir .oge')].find(b=>b.textContent.startsWith('Sayfayı tara')).click()"); s.wait_for_timeout(200)
        tr = s.evaluate("Object.keys((__depo['claude.ai:tarama'] || {ogeler:{}}).ogeler).length")
        kontrol(t + 'tarama ogeleri', tr >= 10)
        with s.expect_download() as d:
            s.evaluate(f"[...{K}.querySelectorAll('.acilir .oge')].find(b=>b.textContent.startsWith('Tarama dosyasını kaydet')).click()")
        paket = json.load(open(d.value.path(), encoding='utf-8'))
        kontrol(t + 'tarama dosyasi', paket['tur'] == 'site-tema-tarama' and len(paket['ogeler']) == tr and paket['stilYolu'] == 'adoptedStyleSheets')
        with s.expect_download() as d:
            s.evaluate(f"[...{K}.querySelectorAll('.acilir .oge')].find(b=>b.textContent==='Dosyaya kaydet').click()")
        ayar = json.load(open(d.value.path(), encoding='utf-8'))
        kontrol(t + 'ayar dosyasi', ayar['tur'] == 'site-tema-ayar' and 'Göz' in ayar['kalici']['temalar'])
        v1 = {'tur': 'claude-tema-ayar', 'surum': 1, 'aktifTema': 'Eski', 'kalici': {'temalar': {'Eski': {'temel': 'goz', 'degerler': {'--zemin-ana': '#121212'}, 'yerler': {'balon': {'renkler.zemin': '#556677', 'yazi.boyut': 17}}}}, 'ozelYerler': [], 'fontlar': []}}
        s.evaluate(f"""(() => {{ const i = {K}.querySelector('input[type=file]'); const dt = new DataTransfer();
          dt.items.add(new File([{json.dumps(json.dumps(v1))}], 'eski.json', {{type:'application/json'}})); i.files = dt.files; i.dispatchEvent(new Event('change')); }})()""")
        s.wait_for_timeout(300)
        kontrol(t + 'v1 dosyasi yuklendi', css(s, '.bg-bg-300', 'backgroundColor') == 'rgb(85, 102, 119)' and css(s, 'body', 'backgroundColor') == 'rgb(18, 18, 18)' and css(s, '.bg-bg-300', 'fontSize') == '17px')
        # Temizle düğmesi ve Ctrl+Alt (panel açık)
        bolge_tikla(s, 'Sohbet'); nesne_tikla(s, 'Kod bloğu'); nesne_tikla(s, 'Claude yanıtı', ctrl=True)
        kontrol(t + 'secim balonu listelerin altinda', s.evaluate(f"(() => {{ const a={K}.querySelector('.secim').getBoundingClientRect(), b={K}.querySelector('.listeler').getBoundingClientRect(); return b.height > 0 && a.top >= b.bottom - 1 && a.bottom <= innerHeight; }})()"))
        s.evaluate(f"[...{K}.querySelectorAll('.secim button')].find(b=>b.textContent==='Temizle').click()"); s.wait_for_timeout(80)
        kontrol(t + 'temizle dugmesi', secim(s) == [])
        nesne_tikla(s, 'Kod bloğu')
        s.keyboard.down('Control'); s.keyboard.down('Alt'); s.keyboard.up('Alt'); s.keyboard.up('Control'); s.wait_for_timeout(100)
        kontrol(t + 'ctrl+alt secimi bosaltti', secim(s) == [] and s.evaluate(f"{K}.querySelectorAll('.kutu-isaret').length") == 0)
        nesne_tikla(s, 'Kod bloğu')
        s.keyboard.down('Control'); s.keyboard.down('Alt'); s.keyboard.press('q'); s.keyboard.up('Alt'); s.keyboard.up('Control'); s.wait_for_timeout(100)
        kontrol(t + 'ctrl+alt+tus secimi korur', secim(s) == ['kodblok'])
        # ◐ sürükleme
        # panel kapanınca düğme 0,15 sn kayar; konumu oturduktan sonra okunur
        s.keyboard.press('Control+Shift+Y'); s.wait_for_timeout(400)
        r = s.evaluate(f"(()=>{{const r={K}.querySelector('.dugme').getBoundingClientRect();return [r.left+17,r.top+17]}})()")
        s.mouse.move(r[0], r[1]); s.mouse.down(); s.mouse.move(30, 250, steps=8); s.mouse.up(); s.wait_for_timeout(200)
        kontrol(t + 'dugme surukle sol kenar', (s.evaluate("__depo.dugmeKonum") or {}).get('k') == 'sol' and not s.evaluate("document.documentElement.classList.contains('st-acik')"))
        kontrol(t + 'sayfa hatasi yok', not hatalar)
        if hatalar: print('   ', hatalar[:3])
        if sayfa_adi == 'sahte.html':
            s.keyboard.press('Control+Shift+Y'); s.wait_for_timeout(150)
            bolge_tikla(s, 'Sohbet'); nesne_tikla(s, 'Mesaj balonu'); nesne_tikla(s, 'Claude yanıtı', ctrl=True)
            s.wait_for_timeout(400)
            s.screenshot(path=f'{OUT}/v2_masaustu.png')
        c.close()
    # Model penceresi (2.1.0): sahte model menüsü claude.ai'nin rol düzenini taklit eder
    SAHTE_MENU = """(() => {
      window.__mm = { model: 'Opus 5.5', caba: 'Yüksek' };
      const tetik = document.querySelector('[data-testid="model-selector-dropdown"]');
      const kapat = () => document.querySelectorAll('[role=menu]').forEach(m => m.remove());
      const ciz = () => { tetik.textContent = __mm.model + ' ' + __mm.caba; };
      const radyo = (ad, secili, is) => { const d = document.createElement('div'); d.setAttribute('role', 'menuitemradio');
        d.setAttribute('aria-checked', String(secili)); d.tabIndex = -1; d.innerHTML = '<span><span>' + ad + '</span></span>';
        d.addEventListener('click', () => { is(); kapat(); ciz(); }); return d; };
      document.addEventListener('keydown', e => { if (e.key === 'Escape') kapat(); });
      tetik.addEventListener('click', () => {
        if (document.querySelector('[role=menu]')) { kapat(); return; }
        const m = document.createElement('div'); m.setAttribute('role', 'menu');
        m.style.cssText = 'position:fixed;top:40px;left:300px;background:#333;color:#fff;padding:4px';
        for (const ad of ['Opus 5.5', 'Sonnet 5.5']) m.append(radyo(ad, __mm.model === ad, () => { __mm.model = ad; __mm.caba = ad === 'Sonnet 5.5' ? 'Orta' : 'Yüksek'; }));
        const ay = document.createElement('div'); ay.setAttribute('role', 'separator'); m.append(ay);
        const alt = document.createElement('div'); alt.setAttribute('role', 'menuitem'); alt.setAttribute('aria-haspopup', 'menu'); alt.tabIndex = -1;
        alt.innerHTML = window.__degersiz ? '<span>Çaba</span>' : '<span>Çaba</span><span><span>' + __mm.caba + '</span></span>';
        alt.addEventListener('keydown', e => { if (e.key !== 'ArrowRight') return;
          const s = document.createElement('div'); s.setAttribute('role', 'menu');
          for (const c of ['Düşük', 'Orta', 'Yüksek']) s.append(radyo(c, __mm.caba === c, () => { __mm.caba = c; }));
          s.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') s.remove(); });
          document.body.append(s); });
        m.append(alt); document.body.append(m);
      });
      ciz();
    })()"""
    MK = "document.querySelector('st-model') && document.querySelector('st-model').shadowRoot"
    def mp_sec(s, ad):
        s.evaluate(f"[...{MK}.querySelectorAll('.oge')].find(b => b.querySelector('.ad span').textContent === {json.dumps(ad)}).click()")
        s.wait_for_timeout(60)
    def mp_acik(s):
        return s.evaluate(f"!!({MK} && {MK}.querySelector('.mp .oge'))")
    c = b.new_context(viewport={'width': 1280, 'height': 860})
    m = c.new_page(); mh = []
    m.on('pageerror', lambda e: mh.append(str(e)))
    m.add_init_script(SHIM + betik); m.goto(KOK + 'sahte.html'); m.wait_for_timeout(400)
    m.evaluate(SAHTE_MENU)
    TETIK = '[data-testid="model-selector-dropdown"]'
    m.click(TETIK); m.wait_for_timeout(1500)
    kontrol('model penceresi acildi', mp_acik(m) and m.evaluate(f"[...{MK}.querySelectorAll('.bas')].some(x => x.textContent === 'Çaba')"))
    kontrol('model ozgun menu kapandi', m.evaluate("document.querySelectorAll('[role=menu]').length") == 0 and not m.evaluate("document.documentElement.classList.contains('st-mp-gizli')"))
    mp_sec(m, 'Sonnet 5.5')
    kontrol('model secim pencereyi kapatmaz', mp_acik(m) and m.evaluate(f"{MK}.querySelector('.ozet').textContent") == 'Sonnet 5.5 · Yüksek' and m.evaluate('__mm.model') == 'Opus 5.5')
    m.mouse.click(700, 500); m.wait_for_timeout(2500)
    kontrol('model disari tik uyguladi', not mp_acik(m) and m.evaluate('__mm') == {'model': 'Sonnet 5.5', 'caba': 'Yüksek'})
    m.click(TETIK); m.wait_for_timeout(1500)
    mp_sec(m, 'Opus 5.5'); mp_sec(m, 'Düşük')
    m.evaluate(f"{MK}.querySelector('.uygula').click()"); m.wait_for_timeout(2500)
    kontrol('model uygula dugmesi', not mp_acik(m) and m.evaluate('__mm') == {'model': 'Opus 5.5', 'caba': 'Düşük'})
    m.click(TETIK); m.wait_for_timeout(1500)
    mp_sec(m, 'Sonnet 5.5'); m.keyboard.press('Escape'); m.wait_for_timeout(600)
    kontrol('model esc vazgecti', not mp_acik(m) and m.evaluate('__mm.model') == 'Opus 5.5')
    m.click(TETIK); m.wait_for_timeout(1500)
    m.click(TETIK); m.wait_for_timeout(600)
    kontrol('model tetige ikinci tik kapatir', not mp_acik(m))
    m.keyboard.press('Control+Shift+Y'); m.wait_for_timeout(150)
    m.evaluate(f"[...{K}.querySelectorAll('.cubuk button')].find(b=>b.textContent==='☰').click()"); m.wait_for_timeout(80)
    m.evaluate(f"[...{K}.querySelectorAll('.acilir .oge')].find(b=>b.textContent.startsWith('Model penceresi')).click()"); m.wait_for_timeout(80)
    m.keyboard.press('Control+Shift+Y'); m.wait_for_timeout(150)
    m.click(TETIK); m.wait_for_timeout(400)
    kontrol('model kapaliyken ozgun menu', m.evaluate("__depo.modelPencere") is False and m.evaluate("document.querySelectorAll('[role=menu]').length") == 1 and not mp_acik(m))
    kontrol('model hatasi yok', not mh)
    if mh: print('   ', mh[:3])
    c.close()
    # telefon
    c = b.new_context(viewport={'width': 400, 'height': 820}, is_mobile=True, has_touch=True, device_scale_factor=2)
    t2 = c.new_page(); th = []
    t2.on('pageerror', lambda e: th.append(str(e)))
    t2.add_init_script(SHIM + betik); t2.goto(KOK + 'sahte.html'); t2.wait_for_timeout(400)
    t2.evaluate(f"{K}.querySelector('.dugme').click()"); t2.wait_for_timeout(200)
    bolge_tikla(t2, 'Sohbet'); nesne_tikla(t2, 'Mesaj balonu')
    t2.evaluate(f"[...{K}.querySelectorAll('.secim button')].find(b=>b.textContent==='Çoklu').click()"); t2.wait_for_timeout(60)
    nesne_tikla(t2, 'Kod bloğu')
    kontrol('telefon coklu dugmesi', secim(t2) == ['balon', 'kodblok'])
    alt = t2.evaluate(f"{K}.querySelector('.listeler').getBoundingClientRect().bottom")
    kontrol('telefon listeler ekranda', alt <= 820)
    t2.screenshot(path=f'{OUT}/v2_telefon.png')
    kontrol('telefon hatasi yok', not th)
    if th: print('   ', th[:3])
    c.close()
    # Model penceresi telefonda (2.1.1): dokunuş pencereyi açmalı, pencere ekrana sığmalı
    c = b.new_context(viewport={'width': 360, 'height': 740}, is_mobile=True, has_touch=True, device_scale_factor=2)
    t3 = c.new_page(); t3h = []
    t3.on('pageerror', lambda e: t3h.append(str(e)))
    t3.add_init_script(SHIM + betik); t3.goto(KOK + 'sahte.html'); t3.wait_for_timeout(400)
    t3.evaluate('window.__degersiz = true'); t3.evaluate(SAHTE_MENU)
    r3 = t3.evaluate(f"(() => {{ const e = document.querySelector('{TETIK}'); e.style.cssText = 'position:fixed;left:16px;bottom:72px;z-index:2147483000'; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }})()")
    t3.touchscreen.tap(r3[0], r3[1]); t3.wait_for_timeout(1500)
    kontrol('telefon model dokunusla acildi', mp_acik(t3))
    gen = t3.evaluate(f"(() => {{ const r = {MK}.querySelector('.mp').getBoundingClientRect(); return [r.left, r.right, r.width]; }})()") if mp_acik(t3) else [0, 999, 999]
    kontrol('telefon model ekrana sigdi', gen[0] >= 0 and gen[1] <= 360 and gen[2] <= 280)
    if mp_acik(t3):
        mp_sec(t3, 'Sonnet 5.5'); mp_sec(t3, 'Düşük')
    isaretler = t3.evaluate(f"[...{MK}.querySelectorAll('.oge')].filter(b => b.querySelector('.isaret') && b.querySelector('.isaret').textContent === '✓').map(b => b.querySelector('.ad span').textContent)") if mp_acik(t3) else []
    kontrol('telefon model ve caba ayri grup', isaretler == ['Sonnet 5.5', 'Düşük'])
    if mp_acik(t3):
        t3.evaluate(f"{MK}.querySelector('.uygula').click()"); t3.wait_for_timeout(3000)
    kontrol('telefon model uygulandi', t3.evaluate('__mm') == {'model': 'Sonnet 5.5', 'caba': 'Düşük'})
    kontrol('telefon model hatasi yok', not t3h)
    if t3h: print('   ', t3h[:3])
    b.close()
print('SONUC:', sum(sonuc.values()), '/', len(sonuc))
