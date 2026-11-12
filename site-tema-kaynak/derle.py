#!/usr/bin/env python3
# Stylus CSS'ini betiğe gömer: :root bloğu DEGISKENLER dizisine,
# geri kalanı KURALLAR metnine; yazı tipi listesi FONTLAR'a.
# Kullanım: derle.py tema.css sablon.js cikti.js [fontlar_google.json]
import json, os, re, sys

css_yol, sablon_yol, cikti_yol = sys.argv[1:4]
css = open(css_yol, encoding='utf-8').read()

bas = css.index(':root {')
son = css.index('\n}', bas)
kok = css[bas:son]
kurallar = css[son + 2:].strip('\n')

def tr_baslik(s):
    # str.title() Türkçe İ'yi bozar (i + birleşik nokta)
    s = s.replace('İ', 'i').replace('I', 'ı').lower()
    ilk = {'i': 'İ', 'ı': 'I'}
    return ' '.join(ilk.get(k[:1], k[:1].upper()) + k[1:] for k in s.split(' '))

degiskenler, grup = [], 'Genel'
for satir in kok.splitlines():
    g = re.match(r'\s*/\*\s*-+\s*(.+?)\s*-+.*\*/', satir)
    if g:
        grup = tr_baslik(g.group(1).strip())
        continue
    if 'KOD İÇİ SÖZDİZİMİ' in satir:
        grup = 'Kod İçi Sözdizimi'
        continue
    d = re.match(r'\s*(--[\w-]+):\s*(.+?);\s*(?:/\*\s*(.*?)\s*\*/)?\s*$', satir)
    if d:
        if d.group(1) == '--model-hover-bg':
            grup = 'Model Seçici'
        degiskenler.append({'grup': grup, 'ad': d.group(1),
                            'deger': d.group(2).strip(), 'not': (d.group(3) or '').strip()})

if '`' in kurallar or '${' in kurallar:
    sys.exit('RED: kurallarda ` veya ${ var, String.raw bozulur')

js = open(sablon_yol, encoding='utf-8').read()
js = js.replace('/*@DEGISKENLER@*/[]', json.dumps(degiskenler, ensure_ascii=False, indent=2))
js = js.replace('/*@KURALLAR@*/', kurallar)
# Otomatik site haritası (0026 3b) ayrı dosyada; gerçek sayfaya tek başına da enjekte edilir
oto = open(os.path.join(os.path.dirname(os.path.abspath(sablon_yol)), 'oto_harita.js'), encoding='utf-8').read().rstrip('\n')
js = js.replace('/*@OTO_HARITA@*/', oto)
# Panelin görünümü ayrı dosyada; Metin'in tasarım dosyası (2.6.0)
panel = open(os.path.join(os.path.dirname(os.path.abspath(sablon_yol)), 'panel.css'), encoding='utf-8').read().rstrip('\n')
if '`' in panel or '${' in panel:
    sys.exit('RED: panel.css icinde ` veya ${ var, String.raw bozulur')
js = js.replace('/*@PANEL_CSS@*/', panel)
fontlar = json.load(open(sys.argv[4] if len(sys.argv) > 4 else 'fontlar_google.json', encoding='utf-8'))
js = js.replace('/*@FONTLAR@*/[]', json.dumps(fontlar, ensure_ascii=False, separators=(',', ':')))
for yer_tutucu in ('/*@DEGISKENLER@*/', '/*@KURALLAR@*/', '/*@FONTLAR@*/', '/*@OTO_HARITA@*/', '/*@PANEL_CSS@*/'):
    if yer_tutucu in js:
        sys.exit('RED: doldurulmamis ' + yer_tutucu)
open(cikti_yol, 'w', encoding='utf-8').write(js)
print(len(degiskenler), 'degisken,', len(kurallar), 'karakter kural')
