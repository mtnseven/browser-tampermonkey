import sys, json
from playwright.sync_api import sync_playwright
betik = open(sys.argv[1], encoding='utf-8').read()
shim = "window.__depo={panelAcik:true};window.GM_getValue=(k,d)=>k in __depo?__depo[k]:d;window.GM_setValue=(k,v)=>{__depo[k]=v};window.GM_registerMenuCommand=()=>{};window.GM_xmlhttpRequest=()=>{};window.GM_setClipboard=()=>{};"
K = "document.querySelector('ct-kok').shadowRoot"
with sync_playwright() as p:
    b = p.chromium.launch()
    for ad, gen, yuk in [('yan', 915, 412), ('dik', 412, 915)]:
        c = b.new_context(viewport={'width': gen, 'height': yuk}, is_mobile=True, has_touch=True)
        s = c.new_page(); h = []
        s.on('pageerror', lambda e: h.append(str(e)))
        s.add_init_script(shim + betik); s.goto(sys.argv[2]); s.wait_for_timeout(300)
        r = s.evaluate(f"""() => {{ const p={K}.querySelector('.panel').getBoundingClientRect();
          return {{dar: document.documentElement.classList.contains('ct-dar'), govde: document.body.getBoundingClientRect().width,
                  panel: [Math.round(p.left), Math.round(p.top), Math.round(p.width), Math.round(p.height)]}} }}""")
        if ad == 'yan':
            t = s.evaluate(f"(()=>{{const r={K}.querySelector('.tutamak').getBoundingClientRect();return [r.left+r.width/2, r.top+r.height/2]}})()")
            s.mouse.move(t[0], t[1]); s.mouse.down(); s.mouse.move(t[0]-120, t[1], steps=5); s.mouse.up(); s.wait_for_timeout(100)
            r['suruklemeSonrasiGovde'] = s.evaluate("document.body.getBoundingClientRect().width")
        s.screenshot(path=f'{sys.argv[3]}/tel_{ad}.png')
        print(ad, json.dumps(r), h)
        c.close()
    b.close()
