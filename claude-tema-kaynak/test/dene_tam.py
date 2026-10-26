import sys, json, time
from playwright.sync_api import sync_playwright
betik = open(sys.argv[1], encoding='utf-8').read()
URL = sys.argv[2]; OUT = sys.argv[3]
SHIM = """
window.__depo = JSON.parse(sessionStorage.getItem('__depo') || '{}');
window.GM_getValue=(k,d)=>k in __depo?__depo[k]:d;
window.GM_setValue=(k,v)=>{__depo[k]=JSON.parse(JSON.stringify(v));try{sessionStorage.setItem('__depo',JSON.stringify(__depo))}catch(e){}};
window.GM_registerMenuCommand=()=>{};
window.GM_setClipboard=(t)=>{window.__pano=t};
window.GM_xmlhttpRequest=(o)=>{fetch(o.url).then(async r=>{const v=o.responseType==='arraybuffer'?await r.arrayBuffer():await r.text();o.onload({status:r.status,response:v,responseText:typeof v==='string'?v:''})}).catch(()=>o.onerror&&o.onerror())};
"""
sonuc = {}
def kontrol(ad, kosul):
    sonuc[ad] = bool(kosul); print(('TAMAM ' if kosul else 'HATA  ') + ad)

with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={'width': 1366, 'height': 820})
    s = c.new_page(); hatalar = []
    s.on('pageerror', lambda e: hatalar.append(str(e)))
    s.on('console', lambda m: m.type == 'error' and hatalar.append(m.text))
    istemler = []
    def diyalog(d):
        istemler.append(d.message)
        if d.type == 'prompt': d.accept(diyalog.cevap)
        else: d.accept()
    diyalog.cevap = 'Deneme'
    s.on('dialog', diyalog)
    s.add_init_script(SHIM + betik)
    s.goto(URL); s.wait_for_timeout(300)
    K = "document.querySelector('ct-kok').shadowRoot"
    def ev(js): return s.evaluate(js)
    def css(sec, prop): return ev(f"getComputedStyle(document.querySelector({json.dumps(sec)})).{prop}")
    def tikla(sec): ev(f"{K}.querySelector({json.dumps(sec)}).click()")
    s.keyboard.press('Control+Shift+Y'); s.wait_for_timeout(150)
    kontrol('panel acildi', ev("document.documentElement.classList.contains('ct-acik')"))
    # 1 tema rengi: Sayfa zemini
    ev(f"[...{K}.querySelectorAll('.oge .ad')].find(e=>e.textContent.startsWith('tüm sayfanın')).click()")
    s.wait_for_timeout(100)
    kontrol('renk secici acildi', ev(f"!!{K}.querySelector('.secici .sv')"))
    s.screenshot(path=f'{OUT}/t_renk_secici.png')
    ev(f"const h={K}.querySelector('.secici input[type=text]'); h.value='#101820'; h.dispatchEvent(new Event('change'))")
    s.wait_for_timeout(100)
    kontrol('zemin degisti', css('body','backgroundColor') == 'rgb(16, 24, 32)')
    # SV alanında sürükleme
    bx = ev(f"(()=>{{const r={K}.querySelector('.sv').getBoundingClientRect();return [r.left,r.top,r.width,r.height]}})()")
    s.mouse.move(bx[0]+bx[2]*0.5, bx[1]+bx[3]*0.8); s.mouse.down(); s.mouse.move(bx[0]+bx[2]*0.6, bx[1]+bx[3]*0.85); s.mouse.up(); s.wait_for_timeout(100)
    kontrol('surukleme rengi degistirdi', css('body','backgroundColor') not in ('rgb(16, 24, 32)','rgb(0, 0, 0)'))
    # geri al
    ev("document.activeElement && document.activeElement.blur()")
    s.mouse.click(600, 400)
    s.keyboard.press('Control+z'); s.wait_for_timeout(100)
    kontrol('ctrl+z bir adim geri', css('body','backgroundColor') == 'rgb(16, 24, 32)')
    s.keyboard.press('Control+z'); s.wait_for_timeout(100)
    kontrol('ctrl+z ikinci adim', css('body','backgroundColor') == 'rgb(0, 0, 0)')
    s.keyboard.press('Control+Shift+z'); s.wait_for_timeout(100)
    kontrol('yinele', css('body','backgroundColor') == 'rgb(16, 24, 32)')
    # yazma kutusunda ctrl+z sayfaya kalmalı: geçmiş konumu değişmemeli
    ev("document.querySelector('.ProseMirror').setAttribute('contenteditable','true'); document.querySelector('.ProseMirror').focus()")
    s.keyboard.press('Control+z'); s.wait_for_timeout(100)
    kontrol('yazma kutusunda ctrl+z dokunulmadi', css('body','backgroundColor') == 'rgb(16, 24, 32)')
    ev("document.activeElement.blur()")
    # 2 yer seçimi + işaret
    ev(f"const y={K}.querySelector('.yer-sec'); y.value='yanit'; y.dispatchEvent(new Event('change'))"); s.wait_for_timeout(200)
    kontrol('yer isaretlendi', ev(f"{K}.querySelectorAll('.isaret').length") > 0)
    s.screenshot(path=f'{OUT}/t_yer_renkler.png')
    # yer rengi: yazı rengi
    ev(f"[...{K}.querySelectorAll('.oge .ad')].find(e=>e.textContent==='Yazı rengi').click()"); s.wait_for_timeout(80)
    ev(f"const h={K}.querySelector('.secici input[type=text]'); h.value='#a08060'; h.dispatchEvent(new Event('change'))"); s.wait_for_timeout(80)
    kontrol('yer yazi rengi', css('.font-claude-response','color') == 'rgb(160, 128, 96)')
    # 3 Yazı sekmesi: boyut
    ev(f"[...{K}.querySelectorAll('.sekme')].find(e=>e.dataset.kod==='yazi').click()"); s.wait_for_timeout(80)
    ev(f"const r=[...{K}.querySelectorAll('.ayar')].find(e=>e.querySelector('.etiket').textContent==='Boyut'); const n=r.querySelector('input[type=number]'); n.value='18'; n.dispatchEvent(new Event('change'))"); s.wait_for_timeout(80)
    kontrol('yazi boyutu 18', css('.font-claude-response','fontSize') == '18px')
    ev(f"[...{K}.querySelectorAll('.parcali button')].find(e=>e.textContent==='Orta').click()"); s.wait_for_timeout(80)
    kontrol('hizalama orta', css('.font-claude-response','textAlign') == 'center')
    # yazı tipi
    ev(f"[...{K}.querySelectorAll('.ayar')].find(e=>e.querySelector('.etiket').textContent==='Yazı tipi').querySelector('.font-sec').click()"); s.wait_for_timeout(500)
    kontrol('font listesi', ev(f"{K}.querySelectorAll('.font-oge').length") > 150)
    print('   font sayisi', ev(f"{K}.querySelectorAll('.font-oge').length"))
    ev(f"[...{K}.querySelectorAll('.suzgec button')].find(e=>e.textContent==='Göz dostu').click()"); s.wait_for_timeout(1500)
    s.screenshot(path=f'{OUT}/t_font_listesi.png')
    ev(f"[...{K}.querySelectorAll('.font-oge')].find(e=>e.querySelector('.fad').textContent==='Atkinson Hyperlegible').click()")
    s.wait_for_timeout(4000)
    kontrol('font yuklendi', ev("document.fonts.check('16px \"Atkinson Hyperlegible\"') && [...document.fonts].some(f=>f.family.replace(/\"/g,'')==='Atkinson Hyperlegible' && f.status==='loaded')"))
    kontrol('font uygulandi', 'Atkinson Hyperlegible' in css('.font-claude-response','fontFamily'))
    kontrol('font onbellekte', ev("!!(__depo.fontOnbellek||{})['Atkinson Hyperlegible']"))
    s.screenshot(path=f'{OUT}/t_yazi_sekmesi.png')
    # 4 Gizle: model seçici
    ev(f"const y={K}.querySelector('.yer-sec'); y.value='model'; y.dispatchEvent(new Event('change'))"); s.wait_for_timeout(80)
    ev(f"[...{K}.querySelectorAll('.sekme')].find(e=>e.dataset.kod==='gizle').click()"); s.wait_for_timeout(80)
    tikla('.anahtar'); s.wait_for_timeout(80)
    kontrol('gizlendi', css('[data-testid=model-selector-dropdown]','display') == 'none')
    # 5 Çizgi + boşluk (Tümü görünümü, mesaj balonu)
    ev(f"const y={K}.querySelector('.yer-sec'); y.value='balon'; y.dispatchEvent(new Event('change'))")
    ev(f"[...{K}.querySelectorAll('.sekme')].find(e=>e.dataset.kod==='cizgi').click()"); s.wait_for_timeout(80)
    ev(f"const r=[...{K}.querySelectorAll('.ayar')].find(e=>e.querySelector('.etiket').textContent==='Köşe yuvarlığı'); const n=r.querySelector('input[type=number]'); n.value='12'; n.dispatchEvent(new Event('change'))"); s.wait_for_timeout(80)
    kontrol('kose 12', css('.bg-bg-300','borderTopLeftRadius') == '12px')
    ev(f"const y={K}.querySelector('.yer-sec'); y.value=''; y.dispatchEvent(new Event('change'))"); s.wait_for_timeout(80)
    ev(f"[...{K}.querySelectorAll('.sekme')].find(e=>e.dataset.kod==='bosluk').click()"); s.wait_for_timeout(80)
    kontrol('tumu gorunumunde yer gruplari', ev(f"{K}.querySelectorAll('.grup').length") >= 15)
    s.screenshot(path=f'{OUT}/t_bosluk_tumu.png')
    # 6 sağ tık
    r = ev("(()=>{const r=document.querySelector('.font-copernicus').getBoundingClientRect();return [r.left+5,r.top+5]})()")
    s.mouse.click(r[0], r[1], button='right'); s.wait_for_timeout(150)
    kontrol('duz sag tik menu acmaz', ev(f"{K}.querySelectorAll('.menu').length") == 0)
    s.keyboard.down('Control'); s.mouse.click(r[0], r[1], button='right'); s.keyboard.up('Control'); s.wait_for_timeout(150)
    menu = ev(f"[...{K}.querySelectorAll('.menu button')].map(b=>b.textContent)")
    print('   menu:', menu)
    kontrol('sag tik menusu', any('Sohbet başlığı' in m for m in menu))
    s.screenshot(path=f'{OUT}/t_sag_tik.png')
    diyalog.cevap = 'Başlık yazısı'
    ev(f"[...{K}.querySelectorAll('.menu button')].find(b=>b.textContent.startsWith('+ ')).click()"); s.wait_for_timeout(200)
    kontrol('ozel yer eklendi', ev("(__depo.kullanici.ozelYerler||[]).some(y=>y.ad==='Başlık yazısı')"))
    kontrol('ozel yer secildi', ev(f"{K}.querySelector('.yer-sec').selectedOptions[0].textContent").find('Başlık yazısı') >= 0)
    # 7 seçme modu (＋)
    diyalog.cevap = 'Sabit kutu'
    ev(f"[...{K}.querySelectorAll('.satir-yer button')].find(b=>b.textContent==='+').click()"); s.wait_for_timeout(100)
    kontrol('secim modu', ev("document.documentElement.classList.contains('ct-secim')"))
    r = ev("(()=>{const r=document.querySelector('.sabit').getBoundingClientRect();return [r.left+5,r.top+5]})()")
    s.mouse.move(r[0], r[1]); s.mouse.click(r[0], r[1]); s.wait_for_timeout(200)
    kontrol('secimle yer eklendi', ev("(__depo.kullanici.ozelYerler||[]).some(y=>y.ad==='Sabit kutu')"))
    # bozuk yer uyarısı
    ev("__depo.kullanici.ozelYerler.push({id:'obozuk',ad:'Bozuk yer',secici:'.yok-boyle-bir-sey'}); GM_setValue('kullanici', __depo.kullanici)")
    # 8 Temalar
    diyalog.cevap = 'Göz kopya'
    ev(f"[...{K}.querySelectorAll('.sekme')].find(e=>e.dataset.kod==='temalar').click()"); s.wait_for_timeout(80)
    ev(f"[...{K}.querySelectorAll('.dugme-sira button')].find(b=>b.textContent==='Kopyala').click()"); s.wait_for_timeout(200)
    kontrol('kopya tema etkin', ev("GM_getValue('tema')") == 'Göz kopya')
    kontrol('kopya ayarlari tasidi', css('.font-claude-response','fontSize') == '18px')
    s.screenshot(path=f'{OUT}/t_temalar.png')
    ev(f"const t={K}.querySelector('.tema-sec'); t.value='Orijinal'; t.dispatchEvent(new Event('change'))"); s.wait_for_timeout(100)
    kontrol('orijinal: kural yok', ev("document.getElementById('ct-tema').textContent.trim()") == '')
    ev(f"const t={K}.querySelector('.tema-sec'); t.value='Göz'; t.dispatchEvent(new Event('change'))"); s.wait_for_timeout(100)
    # 9 pano + dosya
    ev(f"[...{K}.querySelectorAll('.dugme-sira button')].find(b=>b.textContent==='Panoya kopyala').click()"); s.wait_for_timeout(100)
    pano = json.loads(ev("window.__pano"))
    kontrol('pano json', pano['tur'] == 'claude-tema-ayar' and 'Göz kopya' in pano['kalici']['temalar'])
    with s.expect_download() as d:
        ev(f"[...{K}.querySelectorAll('.dugme-sira button')].find(b=>b.textContent==='Dosyaya kaydet').click()")
    yol = d.value.path(); dosya_json = json.load(open(yol, encoding='utf-8'))
    kontrol('dosya indirildi', dosya_json['kalici']['temalar']['Göz']['degerler'].get('--zemin-ana') == '#101820')
    print('   dosya adi:', d.value.suggested_filename)
    # yükleme: zemin değerini değiştirip geri yükle
    dosya_json['kalici']['temalar']['Göz']['degerler']['--zemin-ana'] = '#202830'
    yuk = OUT + '/yukle.json'; json.dump(dosya_json, open(yuk, 'w', encoding='utf-8'), ensure_ascii=False)
    ev(f"{K}.querySelector('input[type=file][accept^=\".json\"]').id='ctyukle'")
    s.set_input_files(f"ct-kok >> #ctyukle", yuk); s.wait_for_timeout(300)
    kontrol('dosyadan yuklendi', css('body','backgroundColor') == 'rgb(32, 40, 48)')
    # 10 geçmiş sekmesi
    ev(f"[...{K}.querySelectorAll('.sekme')].find(e=>e.dataset.kod==='gecmis').click()"); s.wait_for_timeout(80)
    n = ev(f"{K}.querySelectorAll('.gecmis-oge').length"); print('   gecmis kaydi', n)
    kontrol('gecmis listesi', n > 10)
    s.screenshot(path=f'{OUT}/t_gecmis.png')
    ev(f"{K}.querySelectorAll('.gecmis-oge')[1].click()"); s.wait_for_timeout(150)
    kontrol('gecmiste ileri-geri tikla', css('body','backgroundColor') == 'rgb(16, 24, 32)')
    # 11 yenileme sonrası kalıcılık
    ev(f"{K}.querySelectorAll('.gecmis-oge')[{n-1}].click()"); s.wait_for_timeout(150)
    s.reload(); s.wait_for_timeout(500)
    kontrol('yenilemede kaldi', css('body','backgroundColor') == 'rgb(32, 40, 48)')
    kontrol('yenilemede font yerinde', 'Atkinson Hyperlegible' in css('.font-claude-response','fontFamily'))
    ev("__depo.kullanici.ozelYerler.push({id:'obozuk',ad:'Bozuk yer',secici:'.yok-boyle-bir-sey'}); GM_setValue('kullanici', __depo.kullanici)")
    s.reload(); s.wait_for_timeout(500)
    ev(f"const y={K}.querySelector('.yer-sec'); y.value='obozuk'; y.dispatchEvent(new Event('change'))"); s.wait_for_timeout(100)
    kontrol('bozuk yer uyarisi', ev(f"!!{K}.querySelector('.serit.uyari')"))
    s.screenshot(path=f'{OUT}/t_bozuk_yer.png')
    print('SAYFA HATALARI:', hatalar)
    print('DIYALOGLAR:', istemler)
    # 11b ◐ sürükleme: en yakın kenara yapışır, paneli açıp kapatmaz, yenilemede kalır
    acik0 = ev("document.documentElement.classList.contains('ct-acik')")
    r = ev(f"(()=>{{const r={K}.querySelector('.dugme').getBoundingClientRect();return [r.left+17,r.top+17]}})()")
    s.mouse.move(r[0], r[1]); s.mouse.down(); s.mouse.move(30, 250, steps=8); s.mouse.up(); s.wait_for_timeout(250)
    kontrol('dugme surukle sol kenar', (ev("__depo.dugmeKonum") or {}).get('k') == 'sol')
    kontrol('surukleme paneli degistirmedi', ev("document.documentElement.classList.contains('ct-acik')") == acik0)
    s.reload(); s.wait_for_timeout(400)
    kontrol('dugme yenilemede solda', ev(f"{K}.querySelector('.dugme').getBoundingClientRect().left") < 20)
    # 12 telefon
    c2 = b.new_context(viewport={'width': 400, 'height': 820}, is_mobile=True, has_touch=True)
    t = c2.new_page(); th = []
    t.on('pageerror', lambda e: th.append(str(e)))
    t.add_init_script(SHIM + betik); t.goto(URL); t.wait_for_timeout(300)
    t.evaluate(f"{K}.querySelector('.dugme').click()"); t.wait_for_timeout(200)
    t.evaluate(f"[...{K}.querySelectorAll('.oge .ad')][3].click()"); t.wait_for_timeout(150)
    t.screenshot(path=f'{OUT}/t_telefon.png')
    print('TELEFON HATALARI:', th)
    b.close()
print('SONUC:', sum(sonuc.values()), '/', len(sonuc))
