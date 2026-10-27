// ==UserScript==
// @name         Site Tema
// @namespace    metin-site-tema
// @version      2.0.1
// @description  Sitelere göz teması ve canlı ayar paneli (şimdilik claude.ai)
// @match        https://claude.ai/*
// @run-at       document-start
// @noframes
// @updateURL    https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/site-tema.user.js
// @downloadURL  https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/site-tema.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      fonts.googleapis.com
// @connect      fonts.gstatic.com
// @connect      *
// ==/UserScript==

(function () {
  'use strict';

  const SURUM = '2.0.1';
  const KISAYOL = 'Ctrl+Shift+Y';
  // Test sayfası site adını window.__ST_SITE ile verir; gerçek sitede tanımsızdır
  const SITE = String(window.__ST_SITE || location.hostname).replace(/^www\./, '');

  /* ================================================================
     KALICI AYAR — Metin'in onayladığı varsayılanlar, site başına (0004).
     Paneldeki ☰ → "Panoya kopyala" / "Dosyaya kaydet" çıktısının
     "kalici" kısmı buraya yazılır, @version artırılır.
     ================================================================ */
  const KALICI = {
    'claude.ai': { temalar: {}, ozelNesneler: [], fontlar: [] },
  };

  /* ================================================================
     claude.ai GÖZ TEMASI — Stylus temasından derlendi (stylus_goz_tema.css)
     ================================================================ */
  const DEGISKENLER = [
  {
    "grup": "Genel Zemin & Metin",
    "ad": "--zemin-ana",
    "deger": "#000000",
    "not": "tüm sayfanın ana arka planı"
  },
  {
    "grup": "Genel Zemin & Metin",
    "ad": "--zemin-koyu",
    "deger": "#020a12",
    "not": "sol menü, header, yazma kutusu zemini"
  },
  {
    "grup": "Genel Zemin & Metin",
    "ad": "--zemin-kutu",
    "deger": "#0b0d0f",
    "not": "küçük kutular, mesaj balonu, satır içi kod zemini"
  },
  {
    "grup": "Genel Zemin & Metin",
    "ad": "--metin-ana",
    "deger": "#4691a0",
    "not": "varsayılan metin, senin mesajın"
  },
  {
    "grup": "Genel Zemin & Metin",
    "ad": "--metin-claude",
    "deger": "#6d8da2",
    "not": "Claude yanıt metni"
  },
  {
    "grup": "Genel Zemin & Metin",
    "ad": "--metin-soluk",
    "deger": "#4e8240",
    "not": "ikincil soluk metin (liste, tarih)"
  },
  {
    "grup": "Genel Zemin & Metin",
    "ad": "--metin-placeholder",
    "deger": "#71747f",
    "not": "yazma kutusu \"Write a message\" yer tutucu"
  },
  {
    "grup": "Genel Zemin & Metin",
    "ad": "--metin-parlak",
    "deger": "#70a1c7",
    "not": "hover'da ve kalın yerine öne çıkan metin (saf beyaz yok)"
  },
  {
    "grup": "Çerçeve & Çizgiler",
    "ad": "--cerceve",
    "deger": "#28464d",
    "not": "tüm çerçeveler, ayraç çizgileri"
  },
  {
    "grup": "Çerçeve & Çizgiler",
    "ad": "--kaydirma",
    "deger": "#2a365a",
    "not": "kaydırma çubuğu tutma yeri"
  },
  {
    "grup": "Çerçeve & Çizgiler",
    "ad": "--kaydirma-ustunde",
    "deger": "#51529a",
    "not": "kaydırma çubuğu fare üstünde"
  },
  {
    "grup": "Vurgu / Yeşil",
    "ad": "--vurgu-yesil",
    "deger": "#6b8669",
    "not": "seçili satır çizgisi, rozetler, gönder buton hover"
  },
  {
    "grup": "Vurgu / Yeşil",
    "ad": "--link-hover",
    "deger": "#70a1c7",
    "not": "metin içi link hover"
  },
  {
    "grup": "Vurgu / Yeşil",
    "ad": "--hover-cizgi",
    "deger": "#51529a",
    "not": "sohbet satırı hover sol çizgi"
  },
  {
    "grup": "Metin İçi Linkler",
    "ad": "--link",
    "deger": "#6b8669",
    "not": "sohbet metnindeki gerçek linkler"
  },
  {
    "grup": "Seçili Sohbet Satırı",
    "ad": "--secili-zemin",
    "deger": "#152232",
    "not": "açık sohbet satırı arka planı"
  },
  {
    "grup": "Kod Bloğu Zeminleri",
    "ad": "--kod-zemin",
    "deger": "#080a0d",
    "not": "kod bloğu iç/dış zemini"
  },
  {
    "grup": "Kod Bloğu Zeminleri",
    "ad": "--kod-satirici",
    "deger": "#8a7a6a",
    "not": "satır içi <code> metin rengi"
  },
  {
    "grup": "Kod İçi Sözdizimi",
    "ad": "--kod-duz",
    "deger": "#71747f",
    "not": "token'sız düz kod metni + notr inline token'lar"
  },
  {
    "grup": "Kod İçi Sözdizimi",
    "ad": "--tk-string",
    "deger": "#8a7a6a",
    "not": "String / etiket (örn: \"file-upload\")"
  },
  {
    "grup": "Kod İçi Sözdizimi",
    "ad": "--tk-attribute",
    "deger": "#8a7a6a",
    "not": "Nitelik adları (HTML/CSS attribute)"
  },
  {
    "grup": "Kod İçi Sözdizimi",
    "ad": "--tk-selector",
    "deger": "#4aa02c",
    "not": "Seçiciler & özellik adları & .class yazıları (örn: background, .foo)"
  },
  {
    "grup": "Kod İçi Sözdizimi",
    "ad": "--tk-keyword",
    "deger": "#8a9f5a",
    "not": "Anahtar kelime / işaret (örn: !important)"
  },
  {
    "grup": "Kod İçi Sözdizimi",
    "ad": "--tk-comment",
    "deger": "#5a6a5a",
    "not": "Yorum satırları (/* ... *​/)"
  },
  {
    "grup": "Kod İçi Sözdizimi",
    "ad": "--tk-number",
    "deger": "#6f8f6a",
    "not": "Sayılar ve birimler (örn: 1px, 12)"
  },
  {
    "grup": "Kod İçi Sözdizimi",
    "ad": "--tk-punctuation",
    "deger": "#707070",
    "not": "Noktalama / parantez ( { } : ; )"
  },
  {
    "grup": "Kod İçi Sözdizimi",
    "ad": "--tk-function",
    "deger": "#7a9f5a",
    "not": "Fonksiyonlar (örn: rgb(), attr())"
  },
  {
    "grup": "Model Seçici",
    "ad": "--model-hover-bg",
    "deger": "#1d1128",
    "not": "model seçici (Opus 4.8) butonu hover zemini"
  },
  {
    "grup": "Model Seçici",
    "ad": "--model-hover-metin",
    "deger": "#b09ad6",
    "not": "model seçici buton hover yazı rengi"
  },
  {
    "grup": "Yazı Tipi",
    "ad": "--f-govde",
    "deger": "system-ui, sans-serif",
    "not": ""
  },
  {
    "grup": "Yazı Tipi",
    "ad": "--f-kod",
    "deger": "\"Roboto Mono\", ui-monospace, monospace",
    "not": ""
  }
];

  const KURALLAR = String.raw`
/* ========== GENEL ========== */
body, html {
    background: var(--zemin-ana) !important;
    color: var(--metin-ana) !important;
}
.flex.min-h-screen.w-full { background: var(--zemin-ana) !important; }
.bg-bg-100.rounded-b-2xl { background: var(--zemin-ana); }
.bg-bg-200 { background: var(--zemin-ana); }
.rounded-lg:not(.absolute), .rounded-xl:not(.absolute) { background: var(--zemin-kutu) !important; }
/* Proje paneli (Talimatlar, Bağlam, Bellek, Zamanlanmış): satırın üstüne
   serili görünmez tıklama düğmesi saydam kalmalı, yoksa soldaki yazıyı örter. */
button.absolute.inset-0, button.absolute.inset-0:hover { background: transparent !important; }
.align-middle { background: var(--zemin-ana) !important; }

/* ========== KENAR CUBUGU (sol menu) ========== */
.z-sidebar .mb-1 { margin-bottom: 0 !important; }
nav.h-screen {
    background: var(--zemin-koyu) !important;
    border-right: 1px solid var(--cerceve) !important;
    box-shadow: none !important;
}
/* Sol menü linkleri genel yeşil 'a' kuralından muaf */
nav a { color: var(--metin-ana) !important; }

/* Sohbet listesi satirlari */
ul.flex.flex-col.gap-px li a {
    background: transparent !important;
    color: var(--metin-soluk) !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 6px 8px !important;
    font-size: 12px !important;
    line-height: 1.2 !important;
}
ul.flex.flex-col.gap-px li a:hover {
    background: var(--zemin-kutu) !important;
    color: var(--metin-parlak) !important;
    border-left: 3px solid var(--hover-cizgi) !important;
}
ul.flex.flex-col.gap-px li a[class*="bg-bg-400"] {
    background: var(--secili-zemin) !important;
    color: var(--metin-parlak) !important;
    border-left: 3px solid var(--vurgu-yesil) !important;
}
ul.flex.flex-col.gap-px li a[class*="bg-bg-400"] .text-sm { margin-left: 5px; }

/* ========== ANA SOHBET ALANI ========== */
.h-screen.flex.flex-col.overflow-hidden { background: var(--zemin-ana) !important; }
header {
    background: var(--zemin-koyu) !important;
    border-bottom: 1px solid var(--cerceve) !important;
    box-shadow: none !important;
}
.relative.h-full.flex-1.flex.overflow-x-hidden.overflow-y-scroll { background: var(--zemin-ana) !important; }

/* Kullanici mesaj balonu */
.group.relative.inline-flex.gap-2.bg-bg-300 {
    background: var(--zemin-kutu) !important;
    border: 1px solid var(--cerceve) !important;
    border-radius: 4px !important;
    box-shadow: none !important;
}
.font-user-message {
    color: var(--metin-ana) !important;
    font-size: 13px !important;
}

/* Claude yanit yazisi */
.font-claude-response,
.font-claude-response-body {
    color: var(--metin-claude) !important;
    background: transparent !important;
    font-size: 13px !important;
    line-height: 1.5 !important;
}
/* Satır içi <code> (text-danger-000 kırmızısını ezer) */
.font-claude-response code,
.font-claude-response-body code {
    color: var(--kod-satirici) !important;
    background: var(--zemin-kutu) !important;
}

/* ========== KOD BLOKLARI: DÜZ METİN ========== */
pre, code,
.code-block__code,
div[class*="code-block"],
.language-css,
code.language-css {
    background: transparent !important;
    color: var(--kod-duz) !important;
    border: none !important;
    border-radius: 4px !important;
}

/* ========== KOD İÇİ SÖZDİZİMİ TOKEN'LARI ==========
   Her blok TEK bir kategoriyi boyar ve TEK bir değişkene bağlı.
   Not: Bazı token'lar sınıf yerine inline style="color: rgb(...)" taşır;
   o yüzden hem .token.xxx hem span[style*="rgb(...)"] birlikte hedeflenir. */

/* String / etiket */
pre .token.string, code .token.string,
.code-block__code .token.string, div[class*="code-block"] .token.string,
pre span[style*="rgb(244, 123, 133)"], code span[style*="rgb(244, 123, 133)"],
.code-block__code span[style*="rgb(244, 123, 133)"], div[class*="code-block"] span[style*="rgb(244, 123, 133)"] {
    color: var(--tk-string) !important;
}
/* Nitelik (attribute) */
pre .token.attribute, code .token.attribute,
.code-block__code .token.attribute, div[class*="code-block"] .token.attribute,
span.token.attribute,
pre span[style*="rgb(240, 117, 128)"], code span[style*="rgb(240, 117, 128)"],
.code-block__code span[style*="rgb(240, 117, 128)"], div[class*="code-block"] span[style*="rgb(240, 117, 128)"] {
    color: var(--tk-attribute) !important;
}
/* Seçiciler / özellik adları / .class yazıları  (TEK yerde - çakışma kaldırıldı) */
pre .token.selector, code .token.selector,
pre .token.property, code .token.property,
pre .token.class, code .token.class,
.code-block__code .token.property, div[class*="code-block"] .token.property,
.code-block__code .token.class, div[class*="code-block"] .token.class {
    color: var(--tk-selector) !important;
}
/* Anahtar kelime / işaret (!important) */
pre .token.important, code .token.important,
pre .token.keyword, code .token.keyword,
pre .token.rule, .code-block__code .token.important {
    color: var(--tk-keyword) !important;
}
/* Yorumlar */
pre .token.comment, code .token.comment,
.code-block__code .token.comment {
    color: var(--tk-comment) !important;
}
/* Sayılar ve birimler */
pre .token.number, code .token.number,
pre .token.unit, .code-block__code .token.number {
    color: var(--tk-number) !important;
}
/* Noktalama / parantez */
pre .token.punctuation, code .token.punctuation,
.code-block__code .token.punctuation {
    color: var(--tk-punctuation) !important;
}
/* Fonksiyonlar */
pre .token.function, code .token.function,
.code-block__code .token.function {
    color: var(--tk-function) !important;
}
/* Notr inline token'lar (rgb 129,136,152) -> düz kod rengi */
pre span[style*="rgb(129, 136, 152)"], code span[style*="rgb(129, 136, 152)"],
.code-block__code span[style*="rgb(129, 136, 152)"], div[class*="code-block"] span[style*="rgb(129, 136, 152)"] {
    color: var(--kod-duz) !important;
}

/* Kod bloğu zeminleri */
.\[\&_pre\>div\]\:bg-bg-000\/50 pre>div { background-color: var(--kod-zemin); }
.bg-bg-000.w-full { background: var(--kod-zemin) !important; }

/* Başlık fontu */
.font-copernicus {
    color: var(--metin-ana) !important;
    font-size: 15px !important;
}

/* ========== GIRIS ALANI (yazma kutusu) ========== */
.flex.flex-col.bg-bg-000.border-0\.5.border-border-300 {
    background: var(--zemin-koyu) !important;
    border: 1px solid var(--cerceve) !important;
    border-radius: 4px !important;
    box-shadow: none !important;
}
.ProseMirror {
    background: transparent !important;
    color: var(--metin-ana) !important;
    font-size: 13px !important;
    line-height: 1.4 !important;
    padding: 12px !important;
}
.ProseMirror p.is-editor-empty:first-child:before {
    color: var(--metin-placeholder) !important;
    content: attr(data-placeholder) !important;
}


/* ========== KAYDIRMA CUBUKLARI ========== */
::-webkit-scrollbar { width: 8px !important; background: var(--zemin-koyu) !important; }
::-webkit-scrollbar-thumb { background: var(--kaydirma) !important; border-radius: 4px !important; }
::-webkit-scrollbar-thumb:hover { background: var(--kaydirma-ustunde) !important; }
* { scrollbar-width: thin; scrollbar-color: var(--kaydirma) var(--zemin-koyu); }
::-webkit-scrollbar-track { background: var(--zemin-koyu) !important; }

/* ========== DIGER ========== */
button[class*="model-selector-dropdown"] {
    background: transparent !important;
    color: var(--metin-ana) !important;
    border: 1px solid var(--cerceve) !important;
}

/* Model seçici (Opus 4.8 Medium) butonu hover */
button[data-testid="model-selector-dropdown"]:hover {
    background: var(--model-hover-bg) !important;
    color: var(--model-hover-metin) !important;
}

.bg-gradient-to-b, .bg-gradient-to-t, .bg-gradient-to-r,
.shadow-lg, .shadow-md, .shadow-sm, .drop-shadow, .backdrop-blur {
    background: transparent !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
}
.bg-bg-100.w-full.h-2 { display: none; }

/* Metin içi linkler (nav a bunu sidebar'da ezer) */
a {
    color: var(--link) !important;
    text-decoration: none !important;
}
a:hover {
    color: var(--link-hover) !important;
    text-decoration: underline !important;
}

button {
    background: transparent !important;
    color: var(--metin-ana) !important;
    border: none !important;
    border-radius: 4px !important;
    font-size: 12px !important;
}
button:hover {
    background: var(--zemin-kutu) !important;
    color: var(--metin-parlak) !important;
}

.rounded-full, .rounded-lg, .rounded-xl, .rounded-2xl { border-radius: 4px !important; }

.bg-accent-main-000, .bg-accent-secondary-100, .bg-accent-pro-100 {
    background: var(--vurgu-yesil) !important;
}
.text-text-300, .text-text-400, .text-text-500 { color: var(--metin-soluk) !important; }
.text-text-100, .text-text-000 { color: var(--metin-ana) !important; }

/* Çerçeve silme - senin border-border-300 çerçevelerini korur */
.border-0\.5 { border: none !important; }

/* ========== SAG PANEL ========== */
.bg-bg-000.flex.h-full.flex-col.relative,
.w-full.h-full.relative,
div[class*="bg-bg-000"] {
    background: var(--zemin-ana);
}
.ease-out.duration-200.relative.flex.w-full.flex-1.overflow-x-auto.overflow-y-scroll {
    background: var(--zemin-ana) !important;
}
.text-text-400.pt-5.flex-1.text-right { display: none !important; }

/* ========== YAZI TİPİ VE KALINLIK ========== */
.font-claude-response, .font-claude-response-body,
.font-user-message, .ProseMirror { font-family: var(--f-govde) !important; }
pre, code, .code-block__code { font-family: var(--f-kod) !important; }
/* Kalın yazı yok: kalın ve başlıklar normal kalınlıkta, rengiyle ayrılır */
.font-claude-response :is(strong, b, h1, h2, h3, h4, h5, th),
.font-claude-response-body :is(strong, b, h1, h2, h3, h4, h5, th),
.font-user-message :is(strong, b) {
    font-weight: 400 !important;
    color: var(--metin-parlak) !important;
}

/* ========== DOSYA YUKLEME ========== */
.gap-2.mx-0\.5.mb-3.flex.flex-wrap,
div[class*="file-upload"],
div[class*="attachment"] {
    background: transparent !important;
    border: 1px dashed var(--cerceve) !important;
}
`;

  const VARSAYILAN_DEGER = Object.fromEntries(DEGISKENLER.map(d => [d.ad, d.deger]));

  /* ================================================================
     HAZIR SAYFA TEMALARI — Göz temasının kurallarını kullanır, yalnız
     renk değerleri değişir. Astigmat için saf beyaz ve saf siyah
     yazı/zemin çifti kullanılmaz (Göz Metin'in kendi teması, aynen).
     ================================================================ */
  const RENK_SIRASI = ['--zemin-ana', '--zemin-koyu', '--zemin-kutu', '--metin-ana', '--metin-claude', '--metin-soluk',
    '--metin-placeholder', '--metin-parlak', '--cerceve', '--kaydirma', '--kaydirma-ustunde', '--vurgu-yesil',
    '--link-hover', '--hover-cizgi', '--link', '--secili-zemin', '--kod-zemin', '--kod-satirici', '--kod-duz',
    '--tk-string', '--tk-attribute', '--tk-selector', '--tk-keyword', '--tk-comment', '--tk-number',
    '--tk-punctuation', '--tk-function', '--model-hover-bg', '--model-hover-metin'];
  const renkDizisi = s => Object.fromEntries(s.trim().split(/\s+/).map((r, i) => [RENK_SIRASI[i], r]));
  const HAZIR_TEMALAR = {
    'Göz': { temel: 'goz', degerler: {} },
    'Gece mavisi': { temel: 'goz', degerler: renkDizisi(`
      #0b1320 #0e1828 #142036 #8db0c6 #9db3c3 #6f9180 #66758a #b5cadb #243a52 #2b4062 #4a5f8f #6f9a8a
      #b5cadb #5a6fa8 #7fb0a0 #1a2c46 #0d1626 #c0a582 #8a96a8 #c0a582 #b39a7a #7fb59a #a3a6d6 #5f7085
      #c79a8a #7d8794 #8fb6d6 #1b2540 #b9b4e6`) },
    'Grafit': { temel: 'goz', degerler: renkDizisi(`
      #171614 #1d1c19 #25231f #b9b1a3 #c4bcae #8f9a7a #7a756c #d6cfc2 #3a3731 #44403a #5e584f #8fa07a
      #d6cfc2 #8a7f6a #9fb38a #2b2924 #1a1917 #c9a679 #a39d92 #c9a679 #b8a07f #9fbf8a #c99a7a #6f6a60
      #c7a0a0 #8a857c #a8b88f #2c2722 #d0b8a0`) },
    'Kağıt (açık)': { temel: 'goz', degerler: renkDizisi(`
      #f1ece1 #e8e1d3 #e2dac8 #3b4148 #2f3840 #5e6b4f #8a8476 #1f2830 #cbc1ab #c4b9a2 #a69a80 #5c7a4a
      #24506a #8a7aa8 #3d6a86 #ddd4c0 #ebe4d6 #7a4f2a #444b52 #8a5a2a #7a5a3a #3f6e3a #6a3f8a #8a8a7a
      #9a4a3a #5a5a5a #2f5f7f #e2d8ee #4a3a70`) },
  };

  /* ================================================================
     PANEL TEMALARI — panelin kendi renkleri (4 koyu, 2 açık).
     Her renk "Site Tema paneli" bölgesinde ayrı nesne olarak da ayarlanır.
     ================================================================ */
  const PANEL_DEGISKENLER = [
    ['--p-zemin', 'Panel zemini'], ['--p-cubuk', 'Üst çubuk ve liste alanı'], ['--p-kutu', 'Kutu ve düğme zemini'],
    ['--p-cizgi', 'Çizgi'], ['--p-cizgi2', 'Belirgin çizgi'], ['--p-yazi', 'Yazı'], ['--p-yazi2', 'Soluk yazı'],
    ['--p-yazi3', 'Sönük yazı'], ['--p-vurgu', 'Vurgu'], ['--p-vurgu-yazi', 'Vurgu üstündeki yazı'],
    ['--p-secili', 'Seçili satır'], ['--p-uyari', 'Uyarı, işaret ve eklenen nesne'],
  ];
  const PANEL_TEMALARI = {
    'Gece': '#0b0f14 #121821 #1a2230 #263142 #34425a #c3cfdd #8796ab #5d6a80 #5fb3c9 #06161b #24485a #e0a84f',
    'Grafit': '#1a1a1a #202020 #2a2a2a #353535 #474747 #cfcac2 #9a958d #6d6962 #c8a26a #1a1408 #3d362b #d98f6a',
    'Lacivert': '#0d1324 #121a30 #1a2440 #26325a #344477 #c5cde6 #8a96bd #5d678c #8fa8ff #0b1230 #2a3a6e #e6b35a',
    'Orman': '#0c1410 #111b15 #18251d #22342a #2f4739 #c4d6c8 #8ea897 #5f7866 #86c29a #0a1a10 #264232 #d6b45a',
    'Kağıt (açık)': '#f2ede3 #e9e3d6 #fbf8f1 #d6cdb9 #bfb39a #2f3438 #5b5f63 #85847e #3d6f8a #f7f3ea #d6e2e4 #a5602a',
    'Sis (açık)': '#e9edf1 #dfe5eb #f6f8fa #c9d2dc #aab6c3 #26303a #535d68 #848d97 #4a6fa5 #f6f8fa #d0dcee #b0652e',
  };
  const panelTemaDegerleri = ad => Object.fromEntries((PANEL_TEMALARI[ad] || PANEL_TEMALARI.Gece).split(' ').map((r, i) => [PANEL_DEGISKENLER[i][0], r]));

  /* ================================================================
     SİTE PROFİLLERİ (0017) — her sitenin bölge ve nesne haritası.
     kok: bölgenin sayfadaki kökü; Ctrl+sağ tıkla eklenen nesne,
     içinde bulunduğu ilk bölgeye girer (oncelik sırası).
     Seçiciler v1'den (Stylus temasındaki claude.ai sınıfları); sayfada
     bulunamayan nesne listede ⚠ alır. Tarama dosyasıyla yenilenir (0021).
     ================================================================ */
  const PROFILLER = [{
    ad: 'claude.ai',
    eslesir: h => h === 'claude.ai' || h.endsWith('.claude.ai'),
    gozTemasi: true,
    bolgeler: [
      { id: 'sayfa', ad: 'Sayfa geneli', kok: null },
      { id: 'solmenu', ad: 'Sol menü', kok: 'nav' },
      { id: 'ust', ad: 'Üst çubuk', kok: 'header' },
      { id: 'sohbet', ad: 'Sohbet', kok: 'main, .font-claude-response, .font-user-message' },
      { id: 'yazma', ad: 'Yazma kutusu', kok: 'fieldset, .ProseMirror, [contenteditable="true"]' },
      { id: 'dosya', ad: 'Dosya paneli', kok: null },
      { id: 'acilir', ad: 'Açılır pencereler', kok: '[role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]' },
    ],
    oncelik: ['acilir', 'yazma', 'ust', 'solmenu', 'sohbet'],
    nesneler: [
      { id: 'sayfa', bolge: 'sayfa', ad: 'Sayfa (gövde)', secici: 'body', gizlenemez: true },
      { id: 'dugmeler', bolge: 'sayfa', ad: 'Düğmeler (tümü)', secici: 'button' },
      { id: 'linkler', bolge: 'sayfa', ad: 'Bağlantılar (tümü)', secici: 'a' },
      { id: 'rozet', bolge: 'sayfa', ad: 'Vurgu rozetleri', secici: '.bg-accent-main-000, .bg-accent-secondary-100, .bg-accent-pro-100' },
      { id: 'solmenu', bolge: 'solmenu', ad: 'Sol menü', secici: 'nav.h-screen' },
      { id: 'sohbetler', bolge: 'solmenu', ad: 'Sohbet listesi satırları', secici: 'ul.flex.flex-col.gap-px li a' },
      { id: 'ust', bolge: 'ust', ad: 'Üst çubuk', secici: 'header' },
      { id: 'baslik', bolge: 'ust', ad: 'Sohbet başlığı', secici: '.font-copernicus' },
      { id: 'mesaj', bolge: 'sohbet', ad: 'Senin mesajın', secici: '.font-user-message, [data-testid="user-message"]' },
      { id: 'balon', bolge: 'sohbet', ad: 'Mesaj balonu', secici: '.group.relative.inline-flex.gap-2.bg-bg-300, div:has(> [data-testid="user-message"])' },
      { id: 'yanit', bolge: 'sohbet', ad: 'Claude yanıtı', secici: '.font-claude-response, .font-claude-response-body, .font-claude-message' },
      { id: 'satirkod', bolge: 'sohbet', ad: 'Satır içi kod', secici: '.font-claude-response code, .font-claude-response-body code' },
      { id: 'kodblok', bolge: 'sohbet', ad: 'Kod bloğu', secici: 'pre, .code-block__code' },
      { id: 'dosya', bolge: 'sohbet', ad: 'Dosya ekleri', secici: 'div[class*="attachment"], div[class*="file-upload"]' },
      { id: 'yazma', bolge: 'yazma', ad: 'Yazma alanı', secici: '.ProseMirror' },
      { id: 'model', bolge: 'yazma', ad: 'Model seçici', secici: 'button[data-testid="model-selector-dropdown"], button[data-testid*="model-selector"]' },
      { id: 'pencere', bolge: 'acilir', ad: 'Açılır pencere', secici: '[role="dialog"]' },
      { id: 'menu', bolge: 'acilir', ad: 'Açılır menü', secici: '[role="menu"]' },
    ],
  }];
  const GENEL_PROFIL = {
    ad: SITE, eslesir: () => true, gozTemasi: false,
    bolgeler: [{ id: 'sayfa', ad: 'Sayfa geneli', kok: null }, { id: 'acilir', ad: 'Açılır pencereler', kok: '[role="dialog"], [role="menu"]' }],
    oncelik: ['acilir'],
    nesneler: [
      { id: 'sayfa', bolge: 'sayfa', ad: 'Sayfa (gövde)', secici: 'body', gizlenemez: true },
      { id: 'dugmeler', bolge: 'sayfa', ad: 'Düğmeler (tümü)', secici: 'button' },
      { id: 'linkler', bolge: 'sayfa', ad: 'Bağlantılar (tümü)', secici: 'a' },
    ],
  };
  const PROFIL = PROFILLER.find(p => p.eslesir(SITE)) || GENEL_PROFIL;
  const KS = KALICI[PROFIL.ad] || { temalar: {}, ozelNesneler: [], fontlar: [] };
  const BOLGELER = PROFIL.bolgeler.concat([{ id: 'panel', ad: 'Site Tema paneli', kok: null }]);

  // Tema renkleri "Sayfa geneli" bölgesinde ayrı nesnedir (0016); panel renkleri kendi bölgesinde
  const DEGISKEN_NESNELERI = PROFIL.gozTemasi ? DEGISKENLER.map(d => ({
    id: 'd' + d.ad, bolge: 'sayfa', ad: '◆ ' + (d.not || d.ad).replace(/\s*\(.*$/, ''), uzunAd: `${d.ad} · ${d.not}`,
    tur: /^#/.test(d.deger) ? 'degisken' : 'font', degisken: d.ad,
  })) : [];
  const PANEL_NESNELERI = PANEL_DEGISKENLER.map(([ad, not]) => ({ id: 'p' + ad, bolge: 'panel', ad: not, tur: 'panel', degisken: ad }));
  const PROFIL_NESNELERI = PROFIL.nesneler.map(n => Object.assign({ tur: 'oge' }, n));

  /* ================================================================
     ÖZELLİKLER — tek ayar alanının dört grubu (0016)
     ================================================================ */
  const GRUPLAR = [['renk', 'RENK'], ['yazi', 'YAZI'], ['kutu', 'KUTU'], ['gorunurluk', 'GÖRÜNÜRLÜK']];
  const OZ = {
    zemin: { grup: 'renk', ad: 'Zemin', tur: 'renk', css: 'background-color', hesap: 'backgroundColor' },
    yazi: { grup: 'renk', ad: 'Yazı', tur: 'renk', css: 'color', hesap: 'color' },
    cerceve: { grup: 'renk', ad: 'Çerçeve', tur: 'renk', css: 'border-color', hesap: 'borderTopColor' },
    aile: { grup: 'yazi', ad: 'Yazı tipi', tur: 'font' },
    boyut: { grup: 'yazi', ad: 'Boyut', tur: 'sayi', min: 8, max: 32, adim: 0.5, birim: 'px', css: 'font-size', hesap: 'fontSize' },
    satir: { grup: 'yazi', ad: 'Satır aralığı', tur: 'sayi', min: 0.9, max: 2.6, adim: 0.05, birim: '', css: 'line-height', hesap: 'lineHeight', oran: true },
    harf: { grup: 'yazi', ad: 'Harf aralığı', tur: 'sayi', min: -0.05, max: 0.3, adim: 0.005, birim: 'em', css: 'letter-spacing' },
    kalinlik: { grup: 'yazi', ad: 'Kalınlık', tur: 'secim', css: 'font-weight', secenek: [['300', 'İnce 300'], ['400', 'Normal 400'], ['500', 'Orta 500'], ['600', 'Yarı kalın 600'], ['700', 'Kalın 700']] },
    hiza: { grup: 'yazi', ad: 'Hizalama', tur: 'dugmeler', css: 'text-align', secenek: [['left', 'Sol'], ['center', 'Orta'], ['right', 'Sağ'], ['justify', 'İki yana']] },
    bicem: { grup: 'yazi', ad: 'Biçem', tur: 'dugmeler', css: 'font-style', secenek: [['normal', 'Düz'], ['italic', 'Eğik']] },
    ic: { grup: 'kutu', ad: 'İç boşluk', tur: 'sayi', min: 0, max: 48, adim: 1, birim: 'px', css: 'padding', hesap: 'paddingTop' },
    dis: { grup: 'kutu', ad: 'Dış boşluk', tur: 'sayi', min: 0, max: 48, adim: 1, birim: 'px', css: 'margin-block', hesap: 'marginTop' },
    kose: { grup: 'kutu', ad: 'Köşe', tur: 'sayi', min: 0, max: 32, adim: 1, birim: 'px', css: 'border-radius', hesap: 'borderTopLeftRadius' },
    cizgi: { grup: 'kutu', ad: 'Çizgi kalınlığı', tur: 'sayi', min: 0, max: 8, adim: 0.5, birim: 'px', css: 'border-width', hesap: 'borderTopWidth' },
    cizgiTur: { grup: 'kutu', ad: 'Çizgi türü', tur: 'dugmeler', css: 'border-style', secenek: [['solid', 'Düz'], ['dashed', 'Kesik'], ['dotted', 'Nokta'], ['none', 'Yok']] },
    gizle: { grup: 'gorunurluk', ad: 'Gizle', tur: 'anahtar' },
    saydam: { grup: 'gorunurluk', ad: 'Saydamlık', tur: 'sayi', min: 0.1, max: 1, adim: 0.05, birim: '', css: 'opacity', hesap: 'opacity' },
  };

  /* ================================================================
     YAZI TİPLERİ — Google'dakiler Türkçe karakter için 15.10.2026'da
     tek tek doğrulandı; sistemdekiler cihazda varsa listede çıkar.
     ================================================================ */
  const FONTLAR_GOOGLE = [{"ad":"Atkinson Hyperlegible","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Atkinson Hyperlegible Next","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Atkinson Hyperlegible Mono","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"Lexend","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Lexend Deca","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Lexend Exa","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Lexend Giga","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Andika","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Readex Pro","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Inter","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Noto Sans","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Open Sans","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Source Sans 3","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Figtree","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Public Sans","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Red Hat Text","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Red Hat Display","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"IBM Plex Sans","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Fira Sans","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Nunito","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Nunito Sans","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Lato","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Roboto","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Roboto Flex","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Montserrat","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Poppins","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Work Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Karla","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Rubik","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Manrope","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"DM Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Mulish","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Raleway","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"PT Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Ubuntu","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Cabin","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Quicksand","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Comfortaa","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Varela Round","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Exo 2","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Titillium Web","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Oxygen","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Asap","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Barlow","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Archivo","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Libre Franklin","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Sora","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Outfit","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Plus Jakarta Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Urbanist","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Albert Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Onest","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Golos Text","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Commissioner","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Epilogue","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Be Vietnam Pro","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Kumbh Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Hanken Grotesk","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Schibsted Grotesk","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Instrument Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Bricolage Grotesque","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Space Grotesk","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Overpass","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Hind","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Mukta","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Josefin Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Chivo","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Spline Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Alegreya Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Encode Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Mada","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Heebo","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Assistant","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Signika","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Catamaran","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"M PLUS Rounded 1c","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Gothic A1","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Noto Sans Display","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Merriweather Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Merriweather","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Lora","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Libre Baskerville","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Crimson Pro","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"EB Garamond","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Playfair Display","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Source Serif 4","tur":"serif","astigmat":true,"kaynak":"google"},{"ad":"Noto Serif","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Roboto Slab","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Zilla Slab","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Bitter","tur":"serif","astigmat":true,"kaynak":"google"},{"ad":"PT Serif","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Gelasio","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Literata","tur":"serif","astigmat":true,"kaynak":"google"},{"ad":"Newsreader","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Fraunces","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Alegreya","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Cormorant Garamond","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Spectral","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Vollkorn","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Cardo","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Old Standard TT","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"IBM Plex Serif","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Domine","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Faustina","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Petrona","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Brygada 1918","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Roboto Serif","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Roboto Mono","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"JetBrains Mono","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"IBM Plex Mono","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"Fira Code","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"Fira Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Red Hat Mono","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"Source Code Pro","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"Inconsolata","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Space Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Ubuntu Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Cousine","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Anonymous Pro","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Overpass Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"DM Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Sometype Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Martian Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Fragment Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Victor Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Noto Sans Mono","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"Azeret Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Chivo Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Spline Sans Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Geist Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Geist","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Oswald","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Bebas Neue","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Anton","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Archivo Black","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Righteous","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Alfa Slab One","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Abril Fatface","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Caveat","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Patrick Hand","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Kalam","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Indie Flower","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Shadows Into Light","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Dancing Script","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Pacifico","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Lobster","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Architects Daughter","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Sniglet","tur":"el","astigmat":false,"kaynak":"google"}];
  const FONTLAR_SISTEM = [
    ['system-ui', 'sans', false], ['Segoe UI', 'sans', true], ['Verdana', 'sans', true], ['Tahoma', 'sans', true],
    ['Arial', 'sans', false], ['Calibri', 'sans', false], ['Candara', 'sans', false], ['Corbel', 'sans', false],
    ['Trebuchet MS', 'sans', false], ['Century Gothic', 'sans', false], ['Helvetica', 'sans', false], ['Roboto', 'sans', false],
    ['Georgia', 'serif', false], ['Times New Roman', 'serif', false], ['Cambria', 'serif', false], ['Palatino Linotype', 'serif', false],
    ['Consolas', 'mono', true], ['Cascadia Mono', 'mono', true], ['Courier New', 'mono', false], ['Lucida Console', 'mono', false],
    ['Comic Sans MS', 'el', true], ['sans-serif', 'sans', false], ['serif', 'serif', false], ['monospace', 'mono', false],
  ].map(([ad, tur, astigmat]) => ({ ad, tur, astigmat, kaynak: 'sistem' }));
  const YEDEK_AILE = { sans: 'sans-serif', serif: 'serif', mono: 'monospace', el: 'cursive', gosterim: 'sans-serif' };
  const GENEL_AILE = new Set(['system-ui', 'sans-serif', 'serif', 'monospace', 'cursive']);

  /* ================================================================
     DEPO — site ayarları "site:anahtar", panel ayarları ortak
     ================================================================ */
  const oku = (k, v) => { try { const d = GM_getValue(k); return d === undefined ? v : d; } catch (e) { return v; } };
  const yaz = (k, v) => { try { GM_setValue(k, v); } catch (e) { bildir('Kaydedilemedi: ' + e.message); } };
  const SK = k => SITE + ':' + k;
  const kopya = o => JSON.parse(JSON.stringify(o));

  const depo = {
    kul: oku(SK('kullanici'), null),
    tema: oku(SK('tema'), PROFIL.gozTemasi ? 'Göz' : 'Orijinal'),
    acik: oku('panelAcik', false),
    genislik: oku('panelGenislik', 380),
    panelTema: oku('panelTema', 'Gece'),
    panelOzel: oku('panelOzel', {}),
    panelYazi: oku('panelYazi', 11),
    sagTik: oku('sagTik', true),
    isaret: oku('isaret', true),
    dugmeKonum: oku('dugmeKonum', null),
    sonRenkler: oku('sonRenkler', []),
    renkKip: oku('renkKip', 'HSL'),
    fontSuzgec: oku('fontSuzgec', 'hepsi'),
    fontOnbellek: oku('fontOnbellek', {}),
    fontVeri: oku('fontVeri', {}),
  };
  function kulDuzelt(k) {
    k = k && typeof k === 'object' ? k : {};
    k.temalar = k.temalar && typeof k.temalar === 'object' ? k.temalar : {};
    k.ozelNesneler = Array.isArray(k.ozelNesneler) ? k.ozelNesneler : [];
    k.fontlar = Array.isArray(k.fontlar) ? k.fontlar : [];
    k.silinen = Array.isArray(k.silinen) ? k.silinen : [];
    return k;
  }
  depo.kul = kulDuzelt(depo.kul);
  const durum = {
    secim: oku(SK('secim'), []),
    bolge: oku(SK('bolge'), 'sayfa'),
    hedef: 'zemin',
    coklu: false,
    acilir: null,
  };

  const gecikmeli = {};
  function sonraYaz(k, f, ms) { clearTimeout(gecikmeli[k]); gecikmeli[k] = setTimeout(f, ms || 300); }
  const kulKaydet = () => sonraYaz('kul', () => yaz(SK('kullanici'), depo.kul));
  const panelKaydet = () => sonraYaz('panel', () => { yaz('panelTema', depo.panelTema); yaz('panelOzel', depo.panelOzel); });
  const secimKaydet = () => { yaz(SK('secim'), durum.secim); yaz(SK('bolge'), durum.bolge); };

  /* ================================================================
     TEMA HESABI: hazır + betikteki (KALICI) + cihazdaki (kul)
     ================================================================ */
  function temaAdlari() {
    const ad = [];
    if (PROFIL.gozTemasi) {
      for (const a of Object.keys(HAZIR_TEMALAR).concat(Object.keys(KS.temalar || {}))) {
        if (!ad.includes(a) && !depo.kul.silinen.includes(a)) ad.push(a);
      }
    }
    for (const a of Object.keys(depo.kul.temalar)) if (!ad.includes(a) && a !== 'Orijinal' && !depo.kul.silinen.includes(a)) ad.push(a);
    ad.push('Orijinal');
    return ad;
  }
  const hazirMi = ad => ad === 'Orijinal' || !!HAZIR_TEMALAR[ad] || !!(KS.temalar || {})[ad];

  function tema(ad) {
    if (!temaAdlari().includes(ad)) ad = 'Orijinal';
    const h = ad === 'Orijinal' ? { temel: 'orijinal' } : (HAZIR_TEMALAR[ad] || {});
    const k = (KS.temalar || {})[ad] || {}, u = depo.kul.temalar[ad] || {};
    let temel = ad === 'Orijinal' ? 'orijinal' : (u.temel || k.temel || h.temel || 'goz');
    if (!PROFIL.gozTemasi) temel = 'orijinal';
    const degerler = Object.assign({}, VARSAYILAN_DEGER, h.degerler || {}, k.degerler || {}, u.degerler || {});
    const nesneler = {};
    for (const kaynak of [h.nesneler || {}, k.nesneler || {}, u.nesneler || {}]) {
      for (const [id, o] of Object.entries(kaynak)) nesneler[id] = Object.assign({}, nesneler[id], o);
    }
    for (const o of Object.values(nesneler)) for (const [p, v] of Object.entries(o)) if (v === null || v === '') delete o[p];
    return { ad, temel, degerler, nesneler };
  }
  const aktif = () => tema(depo.tema);

  function kulTema(ad) {
    const u = depo.kul.temalar[ad] || (depo.kul.temalar[ad] = {});
    u.degerler = u.degerler || {}; u.nesneler = u.nesneler || {};
    return u;
  }
  // Betiğe işlenmemiş (yalnız bu cihazdaki) değişiklik sayısı (0013)
  function islenmemis(ad) {
    const u = depo.kul.temalar[ad];
    if (!u) return 0;
    return Object.keys(u.degerler || {}).length + Object.values(u.nesneler || {}).reduce((t, o) => t + Object.keys(o).length, 0) + (hazirMi(ad) ? 0 : 1);
  }

  function tumNesneler() {
    const ozel = depo.kul.ozelNesneler.concat((KS.ozelNesneler || []).filter(k => !depo.kul.ozelNesneler.some(o => o.id === k.id)))
      .map(n => Object.assign({ tur: 'oge', bolge: 'sayfa' }, n, { ozel: true }));
    return PROFIL_NESNELERI.concat(ozel, DEGISKEN_NESNELERI, PANEL_NESNELERI);
  }
  const nesneBul = id => tumNesneler().find(n => n.id === id);
  const seciliNesneler = () => durum.secim.map(nesneBul).filter(Boolean);
  function eslesme(n) {
    if (n.tur !== 'oge' || !n.secici) return -1;
    try { return document.querySelectorAll(n.secici).length; } catch (e) { return 0; }
  }

  /* ================================================================
     DEĞER OKU / YAZ
     ================================================================ */
  const ilkAile = s => String(s || '').split(',')[0].replace(/["']/g, '').trim();
  function panelDegerleri() {
    return Object.assign(panelTemaDegerleri(depo.panelTema), depo.panelOzel[depo.panelTema] || {});
  }
  function destekOz(n, oz) {
    if (n.tur === 'oge') return !(oz === 'gizle' && n.gizlenemez);
    if (n.tur === 'panel') return OZ[oz].grup === 'renk';
    if (aktif().temel !== 'goz') return false;          // tema rengi Orijinal'de yok
    if (n.tur === 'degisken') return OZ[oz].grup === 'renk';
    if (n.tur === 'font') return oz === 'aile';
    return false;
  }
  // Açıkça ayarlanmış değer; yoksa undefined
  function ozDeger(n, oz) {
    const t = aktif();
    if (n.tur === 'panel') return panelDegerleri()[n.degisken];
    if (n.tur === 'degisken') return t.temel === 'goz' ? t.degerler[n.degisken] : undefined;
    if (n.tur === 'font') return t.temel === 'goz' ? ilkAile(t.degerler[n.degisken]) : undefined;
    return (t.nesneler[n.id] || {})[oz];
  }
  // Yalnız kullanıcının değiştirdiği (↺ ile geri alınabilen) değer var mı
  function kullaniciDegeriVar(n, oz) {
    if (n.tur === 'panel') return (depo.panelOzel[depo.panelTema] || {})[n.degisken] !== undefined;
    const u = depo.kul.temalar[depo.tema] || {};
    if (n.tur === 'degisken' || n.tur === 'font') return (u.degerler || {})[n.degisken] !== undefined;
    return ozDeger(n, oz) !== undefined;
  }
  function ilkOge(n) {
    if (n.tur !== 'oge' || !n.secici) return null;
    try { return document.querySelector(n.secici); } catch (e) { return null; }
  }
  function hesaplanan(n, oz) {
    const e = ilkOge(n), o = OZ[oz];
    if (!e || !o || !o.hesap) return null;
    return getComputedStyle(e)[o.hesap];
  }
  function renkDegeri(n, hedef) {
    const oz = n.tur === 'oge' ? hedef : 'zemin';
    const v = ozDeger(n, oz);
    if (v) return cssRenkHex(v) || '#000000';
    return cssRenkHex(hesaplanan(n, oz)) || '#000000';
  }
  function ayarla(n, oz, v) {
    const bos = v === null || v === undefined || v === '';
    if (n.tur === 'panel') {
      const o = depo.panelOzel[depo.panelTema] || (depo.panelOzel[depo.panelTema] = {});
      if (bos) delete o[n.degisken]; else o[n.degisken] = v;
      panelKaydet(); panelRenkUygula();
      return;
    }
    const u = kulTema(depo.tema);
    if (n.tur === 'degisken' || n.tur === 'font') {
      if (bos) delete u.degerler[n.degisken];
      else u.degerler[n.degisken] = n.tur === 'font' ? aileYigini(v) : v;
    } else {
      const o = u.nesneler[n.id] || (u.nesneler[n.id] = {});
      if (bos) delete o[oz]; else o[oz] = v;
      if (!Object.keys(o).length) delete u.nesneler[n.id];
    }
    if (oz === 'aile' && !bos) fontHazirla(v);
    kulKaydet(); uygula();
  }

  /* ================================================================
     CSS ÜRETİMİ
     ================================================================ */
  const fontBilgi = ad => tumFontlar().find(f => f.ad === ad);
  function aileYigini(ad) {
    if (GENEL_AILE.has(ad)) return ad;
    const f = fontBilgi(ad);
    return `"${String(ad).replace(/"/g, '')}", ${YEDEK_AILE[(f && f.tur) || 'sans']}`;
  }
  // Alt öğeye de inen yazı özellikleri (alt öğe kendi rengini/yazı tipini taşıyor olabilir)
  const ALTA_INER = new Set(['yazi', 'aile', 'harf', 'satir', 'kalinlik', 'bicem', 'boyut']);
  function bildirimler(o, alt) {
    const d = [];
    for (const [k, v] of Object.entries(o)) {
      const oz = OZ[k];
      if (!oz || v === null || v === undefined || v === '') continue;
      if (alt && !ALTA_INER.has(k)) continue;
      if (oz.tur === 'font') d.push(`font-family: ${aileYigini(v)} !important`);
      else if (oz.tur === 'sayi') d.push(`${oz.css}: ${v}${oz.birim} !important`);
      else if (oz.tur === 'anahtar') { if (v) d.push('display: none !important'); }
      else d.push(`${oz.css}: ${v} !important`);
    }
    if (!alt && o.cizgi != null && !o.cizgiTur) d.push('border-style: solid !important');
    return d;
  }
  const YERLESIM_CSS = `
html.st-acik:not(.st-dar) body {
  width: calc(100vw - var(--st-genislik, 380px)) !important;
  min-width: 0 !important;
  transform: translateZ(0) !important;
  overflow-x: hidden !important;
}
html.st-secim, html.st-secim * { cursor: crosshair !important; }
`;
  function cssUret() {
    const t = aktif();
    let css = YERLESIM_CSS;
    if (t.temel === 'goz' && PROFIL.gozTemasi) {
      const kok = Object.entries(t.degerler).map(([ad, deger]) => `  ${ad}: ${deger};`).join('\n');
      css += `:root {\n${kok}\n}\n${KURALLAR}\n`;
    }
    for (const n of tumNesneler()) {
      if (n.tur !== 'oge' || !n.secici) continue;
      const o = t.nesneler[n.id];
      if (!o) continue;
      const d = bildirimler(o);
      // :root öneki, temanın eşit güçteki kurallarını yener
      if (d.length) css += `:root :is(${n.secici}) { ${d.join('; ')}; }\n`;
      const a = bildirimler(o, true);
      if (a.length) css += `:root :is(${n.secici}) :not(h1, h2, h3, h4, svg, svg *) { ${a.join('; ')}; }\n`;
    }
    return css;
  }

  /* ================================================================
     TEMAYI SAYFAYA BAS — canlı ayar (H5)
     Asıl yol: kurulabilir stil sayfası (document.adoptedStyleSheets).
     Sayfa <head>'i yeniden kurulsa da yerinde kalır, içeriği CSSOM ile
     değişir; <style> öğesinin metnini değiştirmeye takılan sayfa
     kısıtları (CSP) onu durdurmaz. Olmazsa yedek <style> her değişiklikte
     yenisiyle değiştirilir.
     ================================================================ */
  const stil = { yol: '', sayfa: null, el: null, son: 0, hata: '' };
  const cspIhlal = [];
  document.addEventListener('securitypolicyviolation', e => {
    if (cspIhlal.length < 30) cspIhlal.push({ yonerge: e.violatedDirective, kaynak: String(e.blockedURI || '').slice(0, 80), ornek: String(e.sample || '').slice(0, 60) });
  }, true);

  function stilKur() {
    try {
      const s = new CSSStyleSheet();
      s.replaceSync('');
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, s];
      stil.sayfa = s; stil.yol = 'adoptedStyleSheets';
    } catch (e) { stil.yol = '<style>'; stil.hata = e.message; }
  }
  function cssYaz(css) {
    stil.son = Date.now();
    if (stil.sayfa) {
      try {
        stil.sayfa.replaceSync(css);
        if (![...document.adoptedStyleSheets].includes(stil.sayfa)) document.adoptedStyleSheets = [...document.adoptedStyleSheets, stil.sayfa];
        return;
      } catch (e) { stil.sayfa = null; stil.yol = '<style>'; stil.hata = e.message; }
    }
    const hedef = document.head || document.documentElement;
    if (!hedef) return;
    const yeni = document.createElement('style');
    yeni.id = 'st-tema';
    yeni.textContent = css;
    if (stil.el && stil.el.isConnected) stil.el.replaceWith(yeni); else hedef.append(yeni);
    stil.el = yeni;
  }
  let uygulaBekliyor = false;
  function uygula(hemen) {
    if (hemen) { cssYaz(cssUret()); return; }
    if (uygulaBekliyor) return;
    uygulaBekliyor = true;
    requestAnimationFrame(() => { uygulaBekliyor = false; cssYaz(cssUret()); });
  }
  function kokHazir(fn) {
    if (document.documentElement) return fn();
    const g = new MutationObserver(() => { if (document.documentElement) { g.disconnect(); fn(); } });
    g.observe(document, { childList: true });
  }
  stilKur();
  uygula(true);
  // Yedek yolda sayfa <head>'i yeniden kurarsa stil öğesi geri konur
  kokHazir(() => {
    new MutationObserver(() => {
      if (stil.yol === '<style>' && stil.el && !stil.el.isConnected) (document.head || document.documentElement).append(stil.el);
    }).observe(document.documentElement, { childList: true, subtree: true });
  });

  /* ================================================================
     GEÇMİŞ — son 50 adım, sayfa yenilense de kalır (0016)
     ================================================================ */
  const gecmis = (() => { const g = oku(SK('gecmis'), null); return g && Array.isArray(g.liste) ? g : { liste: [], konum: -1 }; })();
  const durumMetni = () => JSON.stringify({ kul: depo.kul, tema: depo.tema, panelTema: depo.panelTema, panelOzel: depo.panelOzel });
  function anlik(etiket) {
    const s = durumMetni();
    const simdiki = gecmis.liste[gecmis.konum];
    if (simdiki && simdiki.s === s) return;
    gecmis.liste = gecmis.liste.slice(0, gecmis.konum + 1);
    gecmis.liste.push({ etiket, s, z: Date.now() });
    while (gecmis.liste.length > 50) gecmis.liste.shift();
    gecmis.konum = gecmis.liste.length - 1;
    sonraYaz('gecmis', () => yaz(SK('gecmis'), gecmis), 500);
    if (kok) { cubukBoya(); if (durum.acilir === 'gecmis') gecmisCiz(); }
  }
  function gecmiseGit(i) {
    const g = gecmis.liste[i];
    if (!g) return;
    const d = JSON.parse(g.s);
    depo.kul = kulDuzelt(d.kul); depo.tema = d.tema; depo.panelTema = d.panelTema || 'Gece'; depo.panelOzel = d.panelOzel || {};
    gecmis.konum = i;
    yaz(SK('kullanici'), depo.kul); yaz(SK('tema'), depo.tema); yaz('panelTema', depo.panelTema); yaz('panelOzel', depo.panelOzel);
    yaz(SK('gecmis'), gecmis);
    uygula(true); panelRenkUygula(); hepsiniCiz();
  }
  const geriAl = () => gecmiseGit(gecmis.konum - 1);
  const ileriAl = () => gecmiseGit(gecmis.konum + 1);

  /* ================================================================
     RENK HESABI
     ================================================================ */
  const sinirla = (x, a, b) => Math.min(b, Math.max(a, x));
  function hexRgb(h) {
    h = String(h || '').trim().replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  }
  const rgbHex = (r, g, b) => '#' + [r, g, b].map(x => Math.round(sinirla(x, 0, 255)).toString(16).padStart(2, '0')).join('');
  function rgbHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
  }
  function hsvRgb(h, s, v) {
    const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    return [f(5) * 255, f(3) * 255, f(1) * 255];
  }
  function rgbHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    }
    return [(h * 60 + 360) % 360, s, l];
  }
  function hslRgb(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  function cssRenkHex(c) {
    if (!c) return null;
    if (/^#/.test(c)) { const r = hexRgb(c); return r ? rgbHex(...r) : null; }
    const m = String(c).match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?/);
    if (!m) return null;
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
    return rgbHex(+m[1], +m[2], +m[3]);
  }

  /* ================================================================
     YAZI TİPİ YÜKLEME — GM_xmlhttpRequest + FontFace(ArrayBuffer)
     ================================================================ */
  function gmIstek(url, tur) {
    return new Promise((ok, red) => GM_xmlhttpRequest({
      method: 'GET', url, timeout: 25000, responseType: tur === 'ikili' ? 'arraybuffer' : undefined,
      onload: r => (r.status >= 200 && r.status < 300) ? ok(tur === 'ikili' ? r.response : r.responseText) : red(new Error('HTTP ' + r.status)),
      onerror: () => red(new Error('ağ hatası')),
      ontimeout: () => red(new Error('zaman aşımı')),
    }));
  }
  function bufB64(buf) {
    const b = new Uint8Array(buf); let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64Buf(s) {
    const t = atob(s), b = new Uint8Array(t.length);
    for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i);
    return b.buffer;
  }
  function cssFontParcalari(css, tumAltKumeler) {
    const parca = [], re = /(?:\/\*\s*([\w-]+)\s*\*\/\s*)?@font-face\s*\{([^}]*)\}/g;
    let m;
    while ((m = re.exec(css))) {
      const altKume = m[1], g = m[2];
      if (!tumAltKumeler && altKume && !['latin', 'latin-ext'].includes(altKume)) continue;
      const al = p => { const x = g.match(new RegExp(p + '\\s*:\\s*([^;]+);?')); return x ? x[1].trim() : ''; };
      const url = (g.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/) || [])[1];
      if (!url) continue;
      parca.push({ url, style: al('font-style') || 'normal', weight: al('font-weight') || '400', range: al('unicode-range') });
    }
    const grup = new Map();
    for (const p of parca) {
      const k = p.url + '|' + p.style + '|' + p.range;
      if (!grup.has(k)) grup.set(k, Object.assign({}, p, { agirlik: [] }));
      grup.get(k).agirlik.push(...p.weight.split(/\s+/).map(Number).filter(n => n));
    }
    return [...grup.values()].map(p => {
      const mn = Math.min(...p.agirlik), mx = Math.max(...p.agirlik);
      return { url: p.url, style: p.style, weight: mn === mx ? String(mn) : `${mn} ${mx}`, range: p.range };
    });
  }
  async function googleCss(ad) {
    const aile = encodeURIComponent(ad).replace(/%20/g, '+');
    for (const ek of [':ital,wght@0,300;0,400;0,500;0,700;1,400', ':wght@300;400;500;700', ':wght@400;700', '']) {
      try { return await gmIstek(`https://fonts.googleapis.com/css2?family=${aile}${ek}&display=swap`); } catch (e) { /* sıradaki */ }
    }
    throw new Error('Google Fonts\'ta bulunamadı');
  }
  async function fontIndir(f) {
    let parcalar;
    if (f.kaynak === 'google') parcalar = cssFontParcalari(await googleCss(f.ad));
    else if (f.kaynak === 'baglanti') {
      if (/\.(woff2?|ttf|otf)(\?|$)/i.test(f.url)) parcalar = [{ url: f.url, style: 'normal', weight: '100 900', range: '' }];
      else parcalar = cssFontParcalari(await gmIstek(f.url)).map(p => Object.assign(p, { url: new URL(p.url, f.url).href }));
    } else return [];
    const sonuc = [];
    for (const p of parcalar) sonuc.push({ style: p.style, weight: p.weight, range: p.range, b64: bufB64(await gmIstek(p.url, 'ikili')) });
    return sonuc;
  }
  const fontSozu = new Map();
  function fontHazirla(ad) {
    if (!ad || GENEL_AILE.has(ad)) return Promise.resolve();
    if (fontSozu.has(ad)) return fontSozu.get(ad);
    const f = fontBilgi(ad);
    if (!f || f.kaynak === 'sistem') return Promise.resolve();
    const s = (async () => {
      let parcalar = f.kaynak === 'yuklenen' ? depo.fontVeri[ad] : depo.fontOnbellek[ad];
      if (!parcalar) {
        parcalar = await fontIndir(f);
        depo.fontOnbellek[ad] = parcalar;
        onbellekBuda();
      }
      for (const p of parcalar || []) {
        const ff = new FontFace(ad, b64Buf(p.b64), { style: p.style || 'normal', weight: p.weight || '400', unicodeRange: p.range || 'U+0-10FFFF' });
        await ff.load();
        document.fonts.add(ff);
      }
    })();
    s.catch(e => { fontSozu.delete(ad); bildir(`Yazı tipi yüklenemedi: ${ad} (${e.message})`); });
    fontSozu.set(ad, s);
    return s;
  }
  function kullanilanFontlar() {
    const s = new Set();
    for (const ad of temaAdlari()) {
      const t = tema(ad);
      for (const o of Object.values(t.nesneler)) if (o.aile) s.add(o.aile);
      for (const d of ['--f-govde', '--f-kod']) { const ilk = ilkAile(t.degerler[d]); if (ilk) s.add(ilk); }
    }
    return s;
  }
  function onbellekBuda() {
    const kul = kullanilanFontlar();
    for (const ad of Object.keys(depo.fontOnbellek)) if (!kul.has(ad)) delete depo.fontOnbellek[ad];
    yaz('fontOnbellek', depo.fontOnbellek);
  }
  function fontlariHazirla() { for (const ad of kullanilanFontlar()) fontHazirla(ad).catch(() => {}); }
  const onizlenen = new Set();
  function onizlemeYukle(f) {
    if (f.kaynak !== 'google' || onizlenen.has(f.ad)) return;
    onizlenen.add(f.ad);
    const aile = encodeURIComponent(f.ad).replace(/%20/g, '+');
    gmIstek(`https://fonts.googleapis.com/css2?family=${aile}&text=${encodeURIComponent(f.ad + 'Ağıİşöüç')}`)
      .then(css => { const p = cssFontParcalari(css, true)[0]; if (!p) throw 0; return gmIstek(p.url, 'ikili'); })
      .then(buf => { const ff = new FontFace('stOn ' + f.ad, buf); return ff.load().then(() => document.fonts.add(ff)); })
      .catch(() => {});
  }
  let sistemOlcum = null;
  function sistemdeVar(ad) {
    if (GENEL_AILE.has(ad)) return true;
    if (!sistemOlcum) sistemOlcum = document.createElement('canvas').getContext('2d');
    const c = sistemOlcum, metin = 'mmmmmmmmmmlliWWQ@ğışİ0Oo';
    return ['monospace', 'serif', 'sans-serif'].some(y => {
      c.font = `40px ${y}`; const a = c.measureText(metin).width;
      c.font = `40px "${ad}", ${y}`; return c.measureText(metin).width !== a;
    });
  }
  function tumFontlar() {
    const ek = depo.kul.fontlar.concat((KS.fontlar || []).filter(f => !depo.kul.fontlar.some(k => k.ad === f.ad)));
    return ek.map(f => Object.assign({ tur: 'sans', astigmat: false }, f)).concat(FONTLAR_GOOGLE, FONTLAR_SISTEM);
  }

  /* ================================================================
     PANEL (Shadow DOM: sayfanın kuralları panele sızmaz)
     Düzen (0016): üst çubuk → seçim kutusu → ayar alanı → bölge + nesne listesi
     ================================================================ */
  const PANEL_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.kok { --genislik: 380px; font: var(--panel-yazi, 12px)/1.35 ui-monospace, "Cascadia Mono", Consolas, "Roboto Mono", "DejaVu Sans Mono", monospace; color: var(--p-yazi); }
button, input, select { font: inherit; color: var(--p-yazi); background: var(--p-kutu); border: 1px solid var(--p-cizgi2); border-radius: 4px; padding: 3px 6px; margin: 0; }
button { cursor: pointer; line-height: 1.2; }
button:hover:not(:disabled) { border-color: var(--p-vurgu); }
button:disabled, input:disabled, select:disabled { opacity: .45; cursor: default; }
input[type=number] { width: 60px; }
input[type=range] { flex: 1; min-width: 50px; accent-color: var(--p-vurgu); background: none; border: 0; padding: 0; }
.dugme { position: fixed; width: 34px; height: 34px; border-radius: 6px; border: 1px solid var(--p-cizgi2); background: var(--p-cubuk);
  color: var(--p-yazi); font-size: 16px; display: grid; place-items: center; transition: left .15s, top .15s; cursor: grab; touch-action: none; user-select: none; padding: 0; }
.dugme.surukle { transition: none; cursor: grabbing; }
.panel { position: fixed; top: 0; right: 0; bottom: 0; width: var(--genislik); background: var(--p-zemin); border-left: 1px solid var(--p-cizgi);
  display: none; flex-direction: column; min-width: 0; }
.acik .panel { display: flex; }
.dar .panel { top: auto; left: 0; width: auto; height: 60vh; border-left: 0; border-top: 1px solid var(--p-cizgi2); border-radius: 12px 12px 0 0; }
.tutamak { position: absolute; left: -5px; top: 0; bottom: 0; width: 10px; cursor: ew-resize; touch-action: none; z-index: 2; }
.dar .tutamak { display: none; }
.cubuk { flex: none; display: flex; align-items: center; gap: 4px; padding: 6px 8px; background: var(--p-cubuk); border-bottom: 1px solid var(--p-cizgi); position: relative; }
.dar .cubuk { border-radius: 12px 12px 0 0; }
.cubuk .ad { font-weight: 700; margin-right: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.cubuk .ad small { color: var(--p-yazi3); font-weight: 400; }
.cubuk select { max-width: 132px; min-width: 0; }
.cubuk button { padding: 3px 7px; }
.cubuk button.acik { background: var(--p-vurgu); color: var(--p-vurgu-yazi); border-color: var(--p-vurgu); }
.acilir { position: absolute; top: 40px; left: 6px; right: 6px; max-height: calc(100% - 60px); overflow: auto; background: var(--p-cubuk);
  border: 1px solid var(--p-cizgi2); border-radius: 6px; box-shadow: 0 8px 28px rgba(0,0,0,.45); z-index: 5; padding: 4px; display: none; }
.acilir.acik { display: block; }
.acilir .oge { display: block; width: 100%; text-align: left; border: 0; background: none; padding: 6px 8px; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acilir .oge:hover:not(:disabled) { background: var(--p-kutu); }
.acilir .oge.secili { color: var(--p-vurgu); }
.acilir .oge.secili::before { content: '✓ '; }
.acilir .oge.ileri { color: var(--p-yazi3); }
.acilir .oge.konum { background: var(--p-secili); }
.acilir .bas { color: var(--p-yazi3); padding: 8px 8px 2px; font-size: .92em; letter-spacing: .04em; }
.acilir .sira { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px 8px; align-items: center; }
.acilir .bilgi { color: var(--p-yazi2); padding: 2px 8px; white-space: normal; }
.acilir input[type=search], .acilir input[type=text] { flex: 1; min-width: 0; }
.acilir .ornek { margin-right: 6px; vertical-align: -1px; }
.secim { flex: none; display: flex; flex-wrap: wrap; gap: 3px; align-items: center; padding: 3px 8px 5px; border-top: 1px solid var(--p-cizgi);
  background: var(--p-cubuk); max-height: 64px; overflow-y: auto; font-size: .86em; }
.secim button { padding: 1px 6px; }
.secim .say { color: var(--p-yazi3); margin-right: 2px; }
.etk { display: inline-flex; align-items: center; gap: 3px; background: var(--p-secili); color: var(--p-yazi); border: 0; border-radius: 9px; padding: 0 2px 0 6px; max-width: 100%; line-height: 16px; }
.etk.ana { box-shadow: inset 0 0 0 1px var(--p-vurgu); }
.etk span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.etk .x { flex: none; width: 14px; height: 14px; border-radius: 50%; display: inline-grid; place-items: center; background: rgba(0,0,0,.22); border: 0; padding: 0; font-size: 10px; color: inherit; }
.coklu { margin-left: auto; }
.coklu.acik { background: var(--p-vurgu); color: var(--p-vurgu-yazi); border-color: var(--p-vurgu); }
.ayar { flex: 1; overflow-y: auto; padding: 2px 10px 12px; min-height: 0; }
.bos { color: var(--p-yazi2); padding: 16px 4px; line-height: 1.5; }
.grup-bas { display: flex; justify-content: space-between; align-items: center; gap: 6px; color: var(--p-vurgu); font-weight: 700; letter-spacing: .05em;
  border-bottom: 1px solid var(--p-cizgi); padding: 8px 0 4px; margin-bottom: 6px; }
.grup-bas small { color: var(--p-yazi3); font-weight: 400; letter-spacing: 0; }
.grup-bas button { padding: 0 6px; font-weight: 400; letter-spacing: 0; }
.grup.kilit .grup-bas { color: var(--p-yazi3); }
.grup.kilit .icerik { opacity: .32; pointer-events: none; }
.satir { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; min-height: 24px; }
.satir.kilit { opacity: .32; pointer-events: none; }
.satir .e { flex: 0 0 104px; color: var(--p-yazi2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.satir .e.degisti { color: var(--p-yazi); }
.satir .alan { flex: 1; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-width: 0; }
.satir .alan select, .satir .alan .font-dugme { flex: 1; min-width: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sifirla { flex: none; width: 22px; padding: 0 !important; visibility: hidden; color: var(--p-yazi3); background: none !important; border-color: transparent !important; }
.sifirla.var { visibility: visible; }
.farkli { color: var(--p-uyari); border: 1px solid var(--p-uyari); border-radius: 3px; padding: 0 4px; font-size: .82em; font-weight: 400; letter-spacing: 0; }
.dugmeler { display: flex; flex-wrap: wrap; gap: 3px; }
.dugmeler button.s, .anahtar.s { background: var(--p-vurgu); color: var(--p-vurgu-yazi); border-color: var(--p-vurgu); }
.hedef { display: flex; margin-bottom: 7px; }
.hedef button { flex: 1; border-radius: 0; display: flex; align-items: center; justify-content: center; gap: 6px; }
.hedef button:first-child { border-radius: 4px 0 0 4px; }
.hedef button:last-child { border-radius: 0 4px 4px 0; }
.hedef button.s { background: var(--p-vurgu); color: var(--p-vurgu-yazi); border-color: var(--p-vurgu); }
.ornek { display: inline-block; width: 12px; height: 12px; border-radius: 2px; border: 1px solid var(--p-cizgi2); flex: none; }
.sv { position: relative; height: 124px; border-radius: 4px; cursor: crosshair; touch-action: none; border: 1px solid var(--p-cizgi2); }
.sv .imlec { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px #000; pointer-events: none; }
.ton { position: relative; height: 12px; margin: 8px 0; border-radius: 6px; cursor: ew-resize; touch-action: none; border: 1px solid var(--p-cizgi2);
  background: linear-gradient(90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); }
.ton .imlec { position: absolute; top: -3px; width: 6px; height: 16px; margin-left: -3px; background: #fff; border-radius: 2px; box-shadow: 0 0 0 1px #000; pointer-events: none; }
.renk-sat { display: flex; gap: 4px; margin-bottom: 6px; align-items: center; }
.renk-sat input[type=number] { width: 0; flex: 1; min-width: 40px; }
.renk-sat .hex { width: 0; flex: 1.6; min-width: 72px; }
.ornek-sat { display: flex; gap: 6px; align-items: flex-start; margin-bottom: 5px; }
.ornek-sat .e { flex: 0 0 44px; color: var(--p-yazi3); }
.ornekler { display: flex; flex-wrap: wrap; gap: 3px; }
.ornekler button { width: 16px; height: 16px; padding: 0; border-radius: 2px; }
.listeler { flex: none; display: flex; gap: 6px; padding: 6px 8px 8px; border-top: 1px solid var(--p-cizgi); background: var(--p-cubuk); height: clamp(100px, 24vh, 200px); }
.dar .listeler { height: clamp(84px, 17vh, 150px); }
.lk { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.lk .bas { display: flex; align-items: center; gap: 3px; color: var(--p-yazi3); padding: 0 2px 3px; }
.lk .bas span { margin-right: auto; }
.lk .bas button { padding: 0 5px; line-height: 15px; }
.lb { flex: 1; overflow-y: auto; background: var(--p-zemin); border: 1px solid var(--p-cizgi2); border-radius: 4px; }
.lb .o { display: flex; align-items: center; gap: 5px; padding: 3px 7px; color: var(--p-yazi2); cursor: pointer; user-select: none; white-space: nowrap; }
.lb .o > span { overflow: hidden; text-overflow: ellipsis; }
.lb .o:hover { background: var(--p-kutu); }
.lb .o.a { background: var(--p-kutu); color: var(--p-yazi); }
.lb .o.s { background: var(--p-secili); color: var(--p-yazi); }
.lb .o.s > span::before { content: '✓ '; }
.lb .o.ana { box-shadow: inset 3px 0 0 var(--p-vurgu); }
.lb .o.ozel { color: var(--p-uyari); }
.lb .o.yok > span::after { content: ' ⚠'; color: var(--p-uyari); }
.lb .o .n { margin-left: auto; color: var(--p-yazi3); }
.lb .ipucu { padding: 6px 7px; color: var(--p-yazi3); line-height: 1.4; }
.isaret-kat { position: fixed; inset: 0; pointer-events: none; }
.kutu-isaret { position: fixed; outline: 2px dashed var(--p-uyari); outline-offset: 2px; border-radius: 3px; }
.isaret-ad { position: fixed; background: var(--p-uyari); color: #111; font-size: 10px; padding: 1px 5px; border-radius: 3px; white-space: nowrap; }
.bildirim { position: fixed; left: 50%; bottom: 72px; transform: translateX(-50%); background: var(--p-cubuk); color: var(--p-yazi);
  border: 1px solid var(--p-vurgu); border-radius: 6px; padding: 7px 12px; max-width: 90vw; box-shadow: 0 4px 18px rgba(0,0,0,.5); }
.dar .bildirim { bottom: auto; top: 12px; }
.font-liste .oge { font-size: 1.12em; }
.font-liste .oge small { color: var(--p-yazi3); font-family: ui-monospace, monospace; font-size: .75em; margin-left: 6px; }
`;

  let kok, kap, panelEl, acilirEl, secimEl, ayarEl, bolgeLb, nesneLb, isaretKat, temaSec, geriB, ileriB, gecmisB, menuB, cokluB, dosyaGirdi;

  function el(etiket, sinif, metin) {
    const e = document.createElement(etiket);
    if (sinif) e.className = sinif;
    if (metin !== undefined) e.textContent = metin;
    return e;
  }
  function dug(metin, baslik, is, sinif) {
    const b = el('button', sinif || '', metin);
    if (baslik) b.title = baslik;
    if (is) b.addEventListener('click', is);
    return b;
  }
  let bildirimEl = null, bildirimZaman = 0;
  function bildir(metin) {
    if (!kap) return;
    if (bildirimEl) bildirimEl.remove();
    bildirimEl = el('div', 'bildirim', metin);
    kap.append(bildirimEl);
    clearTimeout(bildirimZaman);
    bildirimZaman = setTimeout(() => { if (bildirimEl) { bildirimEl.remove(); bildirimEl = null; } }, 3200);
  }
  function panelStiliKoy(kokSR) {
    try {
      const s = new CSSStyleSheet(); s.replaceSync(PANEL_CSS);
      kokSR.adoptedStyleSheets = [s];
    } catch (e) {
      const s = el('style'); s.textContent = PANEL_CSS; kokSR.append(s);
    }
  }
  function panelRenkUygula() {
    if (!kap) return;
    for (const [ad, deger] of Object.entries(panelDegerleri())) kap.style.setProperty(ad, deger);
    kap.style.setProperty('--panel-yazi', depo.panelYazi + 'px');
  }

  function paneliKur() {
    const host = document.createElement('st-kok');
    host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;';
    kok = host.attachShadow({ mode: 'open' });
    panelStiliKoy(kok);
    kap = el('div', 'kok');
    panelRenkUygula();

    const dugme = dug('◐', `Site Tema (${KISAYOL})`, () => { if (dugmeSuruklendi) { dugmeSuruklendi = false; return; } paneliAc(!depo.acik); }, 'dugme');
    dugmeK = dugme; dugmeSurukleKur(dugme);

    panelEl = el('aside', 'panel');
    const tutamak = el('div', 'tutamak');
    tutamakKur(tutamak);

    // Üst çubuk: nesneye ait olmayan işler (0016)
    const cubuk = el('div', 'cubuk');
    const ad = el('span', 'ad', 'Site Tema ');
    ad.append(el('small', '', SITE));
    temaSec = el('select');
    temaSec.title = 'Sayfa teması';
    temaSec.addEventListener('change', () => temaDegistir(temaSec.value));
    geriB = dug('↶', 'Geri al (Ctrl+Z)', geriAl);
    ileriB = dug('↷', 'Yinele (Ctrl+Shift+Z)', ileriAl);
    gecmisB = dug('Geçmiş', 'Adım listesi', () => acilirAcKapa('gecmis'));
    menuB = dug('☰', 'Menü', () => acilirAcKapa('menu'));
    const kapat = dug('×', `Kapat (${KISAYOL})`, () => paneliAc(false));
    cubuk.append(ad, temaSec, geriB, ileriB, gecmisB, menuB, kapat);
    acilirEl = el('div', 'acilir');

    secimEl = el('div', 'secim');
    ayarEl = el('div', 'ayar');

    const listeler = el('div', 'listeler');
    const lk1 = el('div', 'lk'), b1 = el('div', 'bas');
    b1.append(el('span', '', 'Bölge'));
    bolgeLb = el('div', 'lb'); bolgeLb.setAttribute('role', 'listbox');
    lk1.append(b1, bolgeLb);
    const lk2 = el('div', 'lk'), b2 = el('div', 'bas');
    b2.append(el('span', '', 'Nesne'),
      dug('+', 'Sayfadan nesne seç (sonraki tıklama)', () => secimModu(true)),
      dug('✎', 'Seçili eklenen nesnenin adını değiştir', nesneAdDegistir),
      dug('×', 'Seçili eklenen nesneyi sil', nesneSil));
    nesneLb = el('div', 'lb'); nesneLb.setAttribute('role', 'listbox'); nesneLb.setAttribute('aria-multiselectable', 'true');
    lk2.append(b2, nesneLb);
    listeler.append(lk1, lk2);

    dosyaGirdi = el('input'); dosyaGirdi.type = 'file'; dosyaGirdi.accept = '.json,application/json'; dosyaGirdi.style.display = 'none';
    dosyaGirdi.addEventListener('change', () => {
      const f = dosyaGirdi.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = () => dosyadanYukle(String(r.result)); r.readAsText(f);
      dosyaGirdi.value = '';
    });

    panelEl.append(tutamak, cubuk, acilirEl, ayarEl, listeler, secimEl, dosyaGirdi);
    isaretKat = el('div', 'isaret-kat');
    kap.append(isaretKat, panelEl, dugme);
    kok.append(kap);
    document.documentElement.append(host);
    // Panelin dışına tıklanınca açılır kutu kapanır
    kok.addEventListener('pointerdown', e => {
      if (!durum.acilir) return;
      const yol = e.composedPath();
      if (!yol.includes(acilirEl) && !yol.includes(gecmisB) && !yol.includes(menuB)) acilirKapat();
    });
    genislikUygula(depo.genislik);
    hepsiniCiz();
  }

  function hepsiniCiz() {
    if (!kok) return;
    cubukBoya(); secimCiz(); listeleriCiz(); ayarCiz();
    if (durum.acilir === 'gecmis') gecmisCiz(); else if (durum.acilir === 'menu') menuCiz();
  }
  function cubukBoya() {
    if (!temaSec) return;
    temaSec.replaceChildren(...temaAdlari().map(a => {
      const n = islenmemis(a);
      return new Option(a + (n ? ` •${n}` : ''), a, false, a === depo.tema);
    }));
    temaSec.title = 'Sayfa teması' + (islenmemis(depo.tema) ? ` · ${islenmemis(depo.tema)} değişiklik yalnız bu cihazda (betiğe işlenmemiş)` : '');
    geriB.disabled = gecmis.konum <= 0;
    ileriB.disabled = gecmis.konum >= gecmis.liste.length - 1;
    gecmisB.classList.toggle('acik', durum.acilir === 'gecmis');
    menuB.classList.toggle('acik', durum.acilir === 'menu');
  }
  function temaDegistir(ad) {
    if (!temaAdlari().includes(ad)) return;
    depo.tema = ad; yaz(SK('tema'), ad);
    uygula(true); fontlariHazirla(); hepsiniCiz();
    anlik('Tema: ' + ad);
  }

  /* ---------------- seçim (0020) ---------------- */
  function secimTemizle() {
    durum.secim = []; isaretGecici = null; sonSag = null;
    if (secimModuAcik) secimModu(false);
    secimDegisti();
  }
  function secimDegisti() {
    secimKaydet(); secimCiz(); listeleriCiz(); ayarCiz(); isaretCiz();
  }
  function sec(id, ekle) {
    const n = nesneBul(id);
    if (!n) return;
    if (ekle) {
      const i = durum.secim.indexOf(id);
      if (i >= 0) durum.secim.splice(i, 1); else durum.secim.push(id);
    } else {
      durum.secim = [id];
      durum.bolge = n.bolge;
    }
    secimDegisti();
  }
  function secimCiz() {
    if (!secimEl) return;
    const sec = seciliNesneler();
    durum.secim = sec.map(n => n.id);
    const ogeler = [el('span', 'say', `Seçim · ${sec.length}`)];
    sec.forEach((n, i) => {
      const e = el('span', 'etk' + (i === 0 ? ' ana' : ''));
      e.title = n.uzunAd || n.ad;
      e.append(el('span', '', '#' + n.ad.replace(/^◆\s*/, '').replace(/\s+/g, '_')));
      const x = dug('×', 'Seçimden çıkar', ev => { ev.stopPropagation(); durum.secim = durum.secim.filter(s => s !== n.id); secimDegisti(); }, 'x');
      e.append(x);
      e.addEventListener('click', () => { durum.bolge = n.bolge; listeleriCiz(); });
      ogeler.push(e);
    });
    cokluB = dug('Çoklu', 'Açıkken her dokunuş nesneyi seçime ekler veya çıkarır (telefon); bilgisayarda Ctrl+tık da olur',
      () => { durum.coklu = !durum.coklu; secimCiz(); }, 'coklu' + (durum.coklu ? ' acik' : ''));
    const temizle = dug('Temizle', 'Seçimi boşalt (Ctrl+Alt)', secimTemizle);
    temizle.disabled = !sec.length;
    ogeler.push(cokluB, temizle);
    secimEl.replaceChildren(...ogeler);
  }

  /* ---------------- bölge + nesne listesi ---------------- */
  function listeleriCiz() {
    if (!bolgeLb) return;
    const tum = tumNesneler();
    if (!BOLGELER.some(b => b.id === durum.bolge)) durum.bolge = 'sayfa';
    bolgeLb.replaceChildren(...BOLGELER.map(b => {
      const say = tum.filter(n => n.bolge === b.id).length;
      const o = el('div', 'o' + (b.id === durum.bolge ? ' a' : ''));
      o.setAttribute('role', 'option');
      o.append(el('span', '', b.ad), el('span', 'n', String(say)));
      o.addEventListener('click', () => { durum.bolge = b.id; secimKaydet(); listeleriCiz(); });
      return o;
    }));
    const liste = tum.filter(n => n.bolge === durum.bolge);
    if (!liste.length) {
      nesneLb.replaceChildren(el('div', 'ipucu', 'Bu bölgede henüz nesne yok. Sayfada Ctrl+sağ tıkla ekle ya da ☰ → Sayfayı tara.'));
      return;
    }
    nesneLb.replaceChildren(...liste.map(n => {
      const s = durum.secim.indexOf(n.id);
      const o = el('div', 'o' + (s >= 0 ? ' s' : '') + (s === 0 ? ' ana' : '') + (n.ozel ? ' ozel' : '') + (eslesme(n) === 0 ? ' yok' : ''));
      o.setAttribute('role', 'option');
      o.setAttribute('aria-selected', String(s >= 0));
      o.title = (n.uzunAd || n.ad) + (n.secici ? `\n${n.secici}` : '') + (eslesme(n) === 0 ? '\n⚠ bu sayfada bulunamadı' : '');
      if (n.tur === 'degisken' || n.tur === 'panel') {
        const r = el('span', 'ornek'); r.style.background = renkDegeri(n); o.append(r);
      }
      o.append(el('span', '', n.ad));
      o.addEventListener('click', e => sec(n.id, e.ctrlKey || e.metaKey || durum.coklu));
      o.addEventListener('mouseenter', () => { isaretGecici = n.id; isaretCiz(); });
      o.addEventListener('mouseleave', () => { isaretGecici = null; isaretCiz(); });
      return o;
    }));
  }

  /* ---------------- ayar alanı (0016): dört grup hep açık ---------------- */
  function ayarCiz() {
    if (!ayarEl) return;
    const kaydirma = ayarEl.scrollTop;
    const sec = seciliNesneler();
    ayarEl.replaceChildren();
    if (!sec.length) {
      ayarEl.append(el('div', 'bos', 'Nesne seçilmedi. Alttaki listeden bir nesne seç (Ctrl+tık ile birden çok) ya da sayfada bir yere Ctrl+sağ tıkla.'));
      return;
    }
    renkGrubu(sec);
    for (const [g, baslik] of GRUPLAR.slice(1)) {
      const ozler = Object.keys(OZ).filter(k => OZ[k].grup === g);
      const kutu = grupEl(baslik, sec.some(n => ozler.some(o => destekOz(n, o))));
      for (const o of ozler) kutu.icerik.append(satirEl(o, sec));
    }
    ayarEl.scrollTop = kaydirma;
  }
  function grupEl(baslik, destekli, sagIcerik) {
    const g = el('div', 'grup' + (destekli ? '' : ' kilit'));
    const b = el('div', 'grup-bas');
    b.append(el('span', '', baslik));
    if (!destekli) b.append(el('small', '', aktif().temel !== 'goz' && seciliNesneler().some(n => n.tur === 'degisken' || n.tur === 'font') ? 'bu temada yok' : 'bu nesnede yok'));
    else if (sagIcerik) b.append(sagIcerik);
    const icerik = el('div', 'icerik');
    g.append(b, icerik);
    ayarEl.append(g);
    return { g, b, icerik };
  }
  const adlar = l => l.map(n => n.ad.replace(/^◆\s*/, '')).join(', ');

  function renkGrubu(sec) {
    const ilgili = sec.filter(n => destekOz(n, 'zemin'));
    const ogeVar = ilgili.some(n => n.tur === 'oge');
    const hedefler = ogeVar ? ['zemin', 'yazi', 'cerceve'] : ['zemin'];
    if (!hedefler.includes(durum.hedef)) durum.hedef = hedefler[0];
    const hedefOz = n => n.tur === 'oge' ? durum.hedef : 'zemin';
    const degerler = ilgili.map(n => renkDegeri(n, durum.hedef));
    const farkli = new Set(degerler).size > 1;
    const sag = el('span');
    if (farkli) sag.append(el('span', 'farkli', 'farklı'), document.createTextNode(' '));
    const degismis = ilgili.some(n => kullaniciDegeriVar(n, hedefOz(n)));
    if (degismis) sag.append(dug('↺ temadan', 'Seçili nesnelerde bu rengi temadaki hâline döndür', () => {
      for (const n of ilgili) ayarla(n, hedefOz(n), null);
      anlik(`${ogeVar ? OZ[durum.hedef].ad : 'Renk'} sıfırlandı: ${adlar(ilgili)}`);
      ayarCiz(); listeleriCiz();
    }));
    const kutu = grupEl('RENK', ilgili.length > 0, sag);
    if (!ilgili.length) return;
    const hedefSira = el('div', 'hedef');
    for (const h of hedefler) {
      const b = dug('', '', () => { durum.hedef = h; ayarCiz(); }, h === durum.hedef ? 's' : '');
      const ornek = el('span', 'ornek'); ornek.style.background = renkDegeri(ilgili[0], h);
      b.append(ornek, document.createTextNode(ogeVar ? OZ[h].ad : 'Renk'));
      hedefSira.append(b);
    }
    kutu.icerik.append(hedefSira);
    const secici = renkSecici(degerler[0] || '#000000', (hex, bitti) => {
      for (const n of ilgili) ayarla(n, hedefOz(n), hex);
      if (bitti) {
        sonRenkEkle(hex);
        anlik(`${ogeVar ? OZ[durum.hedef].ad : 'Renk'} ${hex}: ${adlar(ilgili)}`);
        ayarCiz(); listeleriCiz();
      }
    });
    kutu.icerik.append(secici);
    const t = aktif();
    const temaRenkleri = [...new Set(DEGISKENLER.filter(d => /^#/.test(d.deger)).map(d => cssRenkHex(t.degerler[d.ad])).filter(Boolean))];
    for (const [etiket, renkler] of [['Son', depo.sonRenkler], ['Tema', t.temel === 'goz' ? temaRenkleri : []]]) {
      if (!renkler.length) continue;
      const s = el('div', 'ornek-sat'), o = el('div', 'ornekler');
      s.append(el('span', 'e', etiket), o);
      for (const r of renkler) {
        const b = dug('', r, () => {
          for (const n of ilgili) ayarla(n, hedefOz(n), r);
          sonRenkEkle(r); anlik(`${ogeVar ? OZ[durum.hedef].ad : 'Renk'} ${r}: ${adlar(ilgili)}`); ayarCiz(); listeleriCiz();
        });
        b.style.background = r;
        o.append(b);
      }
      kutu.icerik.append(s);
    }
  }
  function sonRenkEkle(hex) {
    depo.sonRenkler = [hex].concat(depo.sonRenkler.filter(r => r !== hex)).slice(0, 16);
    yaz('sonRenkler', depo.sonRenkler);
  }

  // Tek renk seçici: ton/doygunluk alanı, ton şeridi, kip (HSL/RGB/HSV), hex, damlalık
  function renkSecici(hex, degisti) {
    let [h, s, v] = rgbHsv(...(hexRgb(hex) || [0, 0, 0]));
    const kap2 = el('div', 'renk-alan');
    const sv = el('div', 'sv'), svI = el('div', 'imlec'); sv.append(svI);
    const ton = el('div', 'ton'), tonI = el('div', 'imlec'); ton.append(tonI);
    const sat = el('div', 'renk-sat');
    const kip = el('select');
    for (const k of ['HSL', 'RGB', 'HSV']) kip.append(new Option(k, k, false, k === depo.renkKip));
    const k = [0, 1, 2].map(() => { const i = el('input'); i.type = 'number'; return i; });
    const hexI = el('input', 'hex'); hexI.type = 'text'; hexI.spellcheck = false;
    sat.append(kip, ...k, hexI);
    if (window.EyeDropper) {
      sat.append(dug('⊙', 'Ekrandan renk al', async () => {
        try { const r = await new window.EyeDropper().open(); ayarlaHex(r.sRGBHex, true); } catch (e) { /* vazgeçildi */ }
      }));
    }
    const suAnki = () => rgbHex(...hsvRgb(h, s, v));
    function kutulariYaz() {
      const rgb = hsvRgb(h, s, v);
      let d;
      if (depo.renkKip === 'RGB') d = rgb.map(Math.round);
      else if (depo.renkKip === 'HSV') d = [Math.round(h), Math.round(s * 100), Math.round(v * 100)];
      else { const l = rgbHsl(...rgb); d = [Math.round(l[0]), Math.round(l[1] * 100), Math.round(l[2] * 100)]; }
      const ust = depo.renkKip === 'RGB' ? [255, 255, 255] : [360, 100, 100];
      k.forEach((i, j) => { i.min = 0; i.max = ust[j]; i.value = d[j]; });
    }
    function boya(kaynak) {
      sv.style.background = `linear-gradient(transparent, #000), linear-gradient(90deg, #fff, hsl(${h}, 100%, 50%))`;
      svI.style.left = (s * 100) + '%'; svI.style.top = ((1 - v) * 100) + '%';
      tonI.style.left = (h / 360 * 100) + '%';
      if (kaynak !== 'kutu') kutulariYaz();
      if (kaynak !== 'hex') hexI.value = suAnki();
    }
    function ayarlaHex(x, bitti) {
      const r = hexRgb(x); if (!r) return;
      const y = rgbHsv(...r); h = y[0]; s = y[1]; v = y[2];
      boya('hex'); hexI.value = rgbHex(...r);
      degisti(rgbHex(...r), bitti);
    }
    function surukle(alan, fn) {
      alan.addEventListener('pointerdown', e => {
        e.preventDefault();
        alan.setPointerCapture(e.pointerId);
        const git = ev => { const r = alan.getBoundingClientRect(); fn(sinirla((ev.clientX - r.left) / r.width, 0, 1), sinirla((ev.clientY - r.top) / r.height, 0, 1)); boya(); degisti(suAnki(), false); };
        git(e);
        const hareket = ev => git(ev);
        const birak = () => { alan.removeEventListener('pointermove', hareket); alan.removeEventListener('pointerup', birak); alan.removeEventListener('pointercancel', birak); degisti(suAnki(), true); };
        alan.addEventListener('pointermove', hareket);
        alan.addEventListener('pointerup', birak);
        alan.addEventListener('pointercancel', birak);
      });
    }
    surukle(sv, (x, y) => { s = x; v = 1 - y; });
    surukle(ton, x => { h = x * 359.9; });
    kip.addEventListener('change', () => { depo.renkKip = kip.value; yaz('renkKip', kip.value); kutulariYaz(); });
    for (const i of k) i.addEventListener('change', () => {
      const d = k.map(x => +x.value || 0);
      let rgb;
      if (depo.renkKip === 'RGB') rgb = d;
      else if (depo.renkKip === 'HSV') rgb = hsvRgb(d[0] % 360, d[1] / 100, d[2] / 100);
      else rgb = hslRgb(d[0] % 360, sinirla(d[1] / 100, 0, 1), sinirla(d[2] / 100, 0, 1));
      const y = rgbHsv(...rgb); h = y[0]; s = y[1]; v = y[2];
      boya('kutu'); degisti(suAnki(), true);
    });
    hexI.addEventListener('input', () => { if (hexRgb(hexI.value)) ayarlaHex(hexI.value, false); });
    hexI.addEventListener('change', () => { if (hexRgb(hexI.value)) ayarlaHex(hexI.value, true); else hexI.value = suAnki(); });
    kap2.append(sv, ton, sat);
    boya();
    return kap2;
  }

  // Yazı, Kutu ve Görünürlük satırı: seçili nesnelerin hepsine yazar (0020)
  function satirEl(ozId, sec) {
    const oz = OZ[ozId];
    const ilgili = sec.filter(n => destekOz(n, ozId));
    const r = el('div', 'satir' + (ilgili.length ? '' : ' kilit'));
    const degerler = ilgili.map(n => ozDeger(n, ozId));
    const v = degerler[0];
    const farkli = new Set(degerler.map(x => JSON.stringify(x === undefined ? null : x))).size > 1;
    const degismis = ilgili.some(n => kullaniciDegeriVar(n, ozId));
    const etiket = el('span', 'e' + (degismis ? ' degisti' : ''), oz.ad);
    etiket.title = oz.ad + (farkli ? ' — seçili nesnelerde farklı; değiştirince hepsi aynı olur' : '');
    if (farkli) { etiket.textContent = ''; etiket.append(document.createTextNode(oz.ad + ' '), el('span', 'farkli', '≠')); }
    const alan = el('span', 'alan');
    const yazHepsi = (yeni, bitti) => {
      for (const n of ilgili) ayarla(n, ozId, yeni);
      if (bitti) { anlik(`${oz.ad}${yeni === null ? ' sıfırlandı' : ': ' + yeni}: ${adlar(ilgili)}`); ayarCiz(); }
    };
    if (oz.tur === 'sayi') {
      const hes = ilgili[0] ? hesaplanan(ilgili[0], ozId) : null;
      let hesSayi = hes == null ? NaN : parseFloat(hes);
      if (oz.oran && ilgili[0] && !isNaN(hesSayi)) { const b = parseFloat(hesaplanan(ilgili[0], 'boyut')); hesSayi = b ? Math.round(hesSayi / b * 100) / 100 : NaN; }
      const kaydirici = el('input'); kaydirici.type = 'range';
      Object.assign(kaydirici, { min: oz.min, max: oz.max, step: oz.adim });
      kaydirici.value = v != null ? v : (!isNaN(hesSayi) ? hesSayi : oz.min);
      const sayi = el('input'); sayi.type = 'number';
      Object.assign(sayi, { min: oz.min, max: oz.max, step: oz.adim });
      sayi.value = v != null ? v : '';
      sayi.placeholder = !isNaN(hesSayi) ? String(Math.round(hesSayi * 100) / 100) : '';
      kaydirici.addEventListener('input', () => { sayi.value = kaydirici.value; yazHepsi(+kaydirici.value, false); });
      kaydirici.addEventListener('change', () => yazHepsi(+kaydirici.value, true));
      sayi.addEventListener('change', () => {
        if (sayi.value === '') { yazHepsi(null, true); return; }
        const x = sinirla(+sayi.value, oz.min, oz.max);
        kaydirici.value = x; yazHepsi(x, true);
      });
      alan.append(kaydirici, sayi);
    } else if (oz.tur === 'secim') {
      const s = el('select');
      s.append(new Option('— temadan —', ''));
      for (const [d, a] of oz.secenek) s.append(new Option(a, d, false, v === d));
      s.addEventListener('change', () => yazHepsi(s.value || null, true));
      alan.append(s);
    } else if (oz.tur === 'dugmeler') {
      const d = el('span', 'dugmeler');
      for (const [deger, a] of oz.secenek) d.append(dug(a, '', () => yazHepsi(v === deger ? null : deger, true), v === deger ? 's' : ''));
      alan.append(d);
    } else if (oz.tur === 'anahtar') {
      alan.append(dug(v ? 'Gizli' : 'Görünür', 'Gizle / göster', () => yazHepsi(v ? null : true, true), 'anahtar' + (v ? ' s' : '')));
    } else if (oz.tur === 'font') {
      const b = dug(v || '— temadan —', 'Yazı tipi seç', () => fontAc(v, ad => yazHepsi(ad, true)), 'font-dugme');
      if (v) b.style.fontFamily = aileYigini(v);
      alan.append(b);
    }
    const sifir = dug('↺', 'Temadaki hâline döndür', () => yazHepsi(null, true), 'sifirla' + (degismis ? ' var' : ''));
    r.append(etiket, alan, sifir);
    return r;
  }

  /* ---------------- açılır kutu: Geçmiş, ☰ menü, yazı tipi ---------------- */
  function acilirAcKapa(tur) {
    if (durum.acilir === tur) { acilirKapat(); return; }
    durum.acilir = tur;
    acilirEl.classList.add('acik');
    if (tur === 'gecmis') gecmisCiz(); else if (tur === 'menu') menuCiz();
    cubukBoya();
  }
  function acilirKapat() {
    durum.acilir = null;
    if (acilirEl) { acilirEl.classList.remove('acik'); acilirEl.replaceChildren(); }
    if (kok) cubukBoya();
  }
  function gecmisCiz() {
    const saat = z => { const d = new Date(z); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    const ogeler = [el('div', 'bas', `GEÇMİŞ · ${gecmis.liste.length} adım (son 50 saklanır)`)];
    gecmis.liste.forEach((g, i) => {
      const b = dug(`${saat(g.z)}  ${g.etiket}`, g.etiket, () => gecmiseGit(i), 'oge' + (i === gecmis.konum ? ' konum' : '') + (i > gecmis.konum ? ' ileri' : ''));
      ogeler.push(b);
    });
    acilirEl.replaceChildren(...ogeler);
    const k = acilirEl.querySelector('.konum');
    if (k) k.scrollIntoView({ block: 'nearest' });
  }
  function menuCiz() {
    const o = [];
    const bas = m => o.push(el('div', 'bas', m));
    const oge = (m, is, sinif, baslik) => { const b = dug(m, baslik || '', () => { is(); }, 'oge' + (sinif ? ' ' + sinif : '')); o.push(b); return b; };
    bas('SAYFA TEMASI · ' + depo.tema);
    oge('Yeni tema (bu temanın kopyası)…', temaKopyala);
    if (!hazirMi(depo.tema)) oge('Temanın adını değiştir…', temaAdDegistir);
    const n = islenmemis(depo.tema);
    if (n && hazirMi(depo.tema)) oge(`Bu temayı sıfırla (${n} değişiklik)`, temaSifirla);
    if (depo.tema !== 'Orijinal') oge('Temayı listeden kaldır', temaSil);
    if (depo.kul.silinen.length) oge('Kaldırılan hazır temaları geri getir', () => { depo.kul.silinen = []; kulKaydet(); hepsiniCiz(); anlik('Hazır temalar geri geldi'); });
    bas('PANEL TEMASI');
    for (const ad of Object.keys(PANEL_TEMALARI)) {
      const b = oge(ad, () => { depo.panelTema = ad; panelKaydet(); panelRenkUygula(); anlik('Panel teması: ' + ad); menuCiz(); hepsiniCiz(); }, ad === depo.panelTema ? 'secili' : '');
      const sw = el('span', 'ornek'); sw.style.background = panelTemaDegerleri(ad)['--p-zemin']; b.prepend(sw);
    }
    o.push(el('div', 'bilgi', 'Panelin her rengi "Site Tema paneli" bölgesinde ayrıca ayarlanır.'));
    bas('TARAMA (0021)');
    const tr = taramaOku();
    oge(`Sayfayı tara (şimdi: ${Object.keys(tr.ogeler).length} öğe, ${tr.sayfalar.length} sayfa)`, () => { tara(); menuCiz(); });
    if (tr.sayfalar.length) {
      oge('Tarama dosyasını kaydet', taramaKaydet);
      oge('Taramayı panoya kopyala', () => { panoya(JSON.stringify(taramaPaketi(), null, 1)); bildir('Tarama panoya kopyalandı'); });
      oge('Taramayı temizle', () => { yaz(SK('tarama'), null); menuCiz(); bildir('Tarama temizlendi'); });
    }
    bas('AYAR DOSYASI');
    oge('Dosyaya kaydet', dosyayaKaydet);
    oge('Dosyadan yükle (eski Claude Tema dosyası da olur)', () => dosyaGirdi.click());
    oge('Panoya kopyala', () => { panoya(JSON.stringify(disaAktar(false), null, 1)); bildir('Ayarlar panoya kopyalandı'); });
    bas('PANEL');
    const boy = el('div', 'sira');
    boy.append(el('span', '', 'Yazı boyu'));
    for (const p of [9, 10, 11, 12, 13, 14, 15]) boy.append(dug(p + '', '', () => { depo.panelYazi = p; yaz('panelYazi', p); panelRenkUygula(); menuCiz(); }, p === depo.panelYazi ? 'anahtar s' : 'anahtar'));
    o.push(boy);
    oge(`Ctrl+sağ tık ile seçme: ${depo.sagTik ? 'açık' : 'kapalı'}`, () => { depo.sagTik = !depo.sagTik; yaz('sagTik', depo.sagTik); menuCiz(); });
    oge(`Seçili nesneyi sayfada işaretle: ${depo.isaret ? 'açık' : 'kapalı'}`, () => { depo.isaret = !depo.isaret; yaz('isaret', depo.isaret); isaretCiz(); menuCiz(); });
    bas('TANI');
    for (const s of [`Sürüm ${SURUM} · site ${SITE} · profil ${PROFIL.ad}`, `Stil yolu: ${stil.yol}${stil.hata ? ' (' + stil.hata + ')' : ''}`,
      `CSP ihlali: ${cspIhlal.length}${cspIhlal.length ? ' — ' + cspIhlal.slice(-3).map(x => x.yonerge).join(', ') : ''}`,
      `${KISAYOL}: panel · Ctrl+Z / Ctrl+Shift+Z: geri / ileri`, 'Ctrl+sağ tık: nesne seç · aynı yere tekrar: dıştaki · düz sağ tık: tarayıcının menüsü',
      'Telefonda: uzun basma = seç · Çoklu düğmesi = birden çok seçim']) o.push(el('div', 'bilgi', s));
    acilirEl.replaceChildren(...o);
  }

  let fontSuzgecMetni = '';
  function fontAc(secili, sec) {
    durum.acilir = 'font';
    acilirEl.classList.add('acik');
    cubukBoya();
    const ciz = () => {
      const o = [el('div', 'bas', 'YAZI TİPİ')];
      const ara = el('input'); ara.type = 'search'; ara.placeholder = 'Ara…'; ara.value = fontSuzgecMetni;
      ara.addEventListener('input', () => { fontSuzgecMetni = ara.value; listeCiz(); });
      const s1 = el('div', 'sira'); s1.append(ara); o.push(s1);
      const s2 = el('div', 'sira');
      for (const [k, a] of [['hepsi', 'Hepsi'], ['astigmat', 'Astigmat'], ['sans', 'Sans'], ['serif', 'Serif'], ['mono', 'Eş aralıklı'], ['el', 'El yazısı']]) {
        s2.append(dug(a, '', () => { depo.fontSuzgec = k; yaz('fontSuzgec', k); ciz(); }, 'anahtar' + (depo.fontSuzgec === k ? ' s' : '')));
      }
      o.push(s2);
      const liste = el('div', 'font-liste');
      o.push(liste);
      const s3 = el('div', 'sira');
      const ekle = el('input'); ekle.type = 'text'; ekle.placeholder = 'Google adı ya da .woff2/.css bağlantısı';
      s3.append(ekle, dug('Ekle', '', () => {
        const x = ekle.value.trim(); if (!x) return;
        const f = /^https?:/i.test(x) ? { ad: decodeURIComponent(x.split('/').pop().split(/[.?]/)[0]).replace(/[-_+]/g, ' ') || 'Bağlantı yazı tipi', kaynak: 'baglanti', url: x } : { ad: x, kaynak: 'google' };
        if (!depo.kul.fontlar.some(k => k.ad === f.ad)) depo.kul.fontlar.push(Object.assign({ tur: 'sans', astigmat: false }, f));
        kulKaydet();
        fontHazirla(f.ad).then(() => { sec(f.ad); acilirKapat(); });
      }));
      const dosya = el('input'); dosya.type = 'file'; dosya.accept = '.woff2,.woff,.ttf,.otf'; dosya.style.display = 'none';
      dosya.addEventListener('change', () => {
        const f = dosya.files[0]; if (!f) return;
        const ad = f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        f.arrayBuffer().then(buf => {
          depo.fontVeri[ad] = [{ style: 'normal', weight: '100 900', range: '', b64: bufB64(buf) }];
          yaz('fontVeri', depo.fontVeri);
          if (!depo.kul.fontlar.some(k => k.ad === ad)) depo.kul.fontlar.push({ ad, kaynak: 'yuklenen', tur: 'sans', astigmat: false });
          kulKaydet();
          return fontHazirla(ad);
        }).then(() => { sec(ad); acilirKapat(); });
      });
      s3.append(dug('Dosyadan', 'Bilgisayardan yazı tipi dosyası', () => dosya.click()), dosya);
      o.push(s3);
      acilirEl.replaceChildren(...o);
      const gozcu = 'IntersectionObserver' in window ? new IntersectionObserver(g => {
        for (const x of g) if (x.isIntersecting) { const f = fontBilgi(x.target.dataset.ad); if (f) onizlemeYukle(f); gozcu.unobserve(x.target); }
      }, { root: acilirEl }) : null;
      function listeCiz() {
        const a = fontSuzgecMetni.toLocaleLowerCase('tr');
        const fl = tumFontlar().filter(f => (depo.fontSuzgec === 'hepsi' || (depo.fontSuzgec === 'astigmat' ? f.astigmat : f.tur === depo.fontSuzgec))
          && (!a || f.ad.toLocaleLowerCase('tr').includes(a)) && (f.kaynak !== 'sistem' || sistemdeVar(f.ad)));
        const ogeler = [dug('— temadan —', '', () => { sec(null); acilirKapat(); }, 'oge' + (!secili ? ' secili' : ''))];
        for (const f of fl.slice(0, 260)) {
          const b = dug('', f.ad, () => { sec(f.ad); acilirKapat(); }, 'oge' + (f.ad === secili ? ' secili' : ''));
          b.append(document.createTextNode(f.ad), el('small', '', (f.astigmat ? 'astigmat · ' : '') + (f.kaynak === 'sistem' ? 'cihazda' : f.kaynak)));
          b.style.fontFamily = `"stOn ${f.ad}", "${f.ad}", ${YEDEK_AILE[f.tur] || 'sans-serif'}`;
          b.dataset.ad = f.ad;
          if (gozcu) gozcu.observe(b);
          ogeler.push(b);
        }
        liste.replaceChildren(...ogeler);
      }
      listeCiz();
    };
    ciz();
  }

  /* ---------------- tema işleri ---------------- */
  function benzersizAd(ad) {
    let a = ad, i = 2;
    while (temaAdlari().includes(a) || depo.kul.temalar[a]) a = `${ad} ${i++}`;
    return a;
  }
  function temaKopyala() {
    const t = aktif();
    const ad = prompt('Yeni temanın adı:', benzersizAd(t.ad + ' kopya'));
    if (!ad || !ad.trim()) return;
    const yeni = benzersizAd(ad.trim());
    depo.kul.temalar[yeni] = { temel: t.temel, degerler: kopya(t.temel === 'goz' ? t.degerler : {}), nesneler: kopya(t.nesneler) };
    kulKaydet(); acilirKapat(); temaDegistir(yeni);
  }
  function temaAdDegistir() {
    const eski = depo.tema;
    const ad = prompt('Temanın yeni adı:', eski);
    if (!ad || !ad.trim() || ad.trim() === eski) return;
    const yeni = benzersizAd(ad.trim());
    depo.kul.temalar[yeni] = depo.kul.temalar[eski]; delete depo.kul.temalar[eski];
    kulKaydet(); acilirKapat(); temaDegistir(yeni);
  }
  function temaSifirla() {
    delete depo.kul.temalar[depo.tema];
    kulKaydet(); uygula(true); acilirKapat(); hepsiniCiz(); anlik('Tema sıfırlandı: ' + depo.tema);
  }
  function temaSil() {
    const ad = depo.tema;
    if (!confirm(`"${ad}" teması listeden kaldırılsın mı? (Geçmişten geri alınabilir.)`)) return;
    if (hazirMi(ad)) { if (!depo.kul.silinen.includes(ad)) depo.kul.silinen.push(ad); }
    delete depo.kul.temalar[ad];
    kulKaydet(); acilirKapat();
    temaDegistir(temaAdlari()[0]);
  }

  /* ---------------- dosya ve pano (0005) ---------------- */
  function panoya(metin) {
    try { GM_setClipboard(metin, 'text'); } catch (e) { navigator.clipboard && navigator.clipboard.writeText(metin).catch(() => {}); }
  }
  function dosyaIndir(ad, metin) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([metin], { type: 'application/json' }));
    a.download = ad;
    (document.body || document.documentElement).append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  const damga = () => { const d = new Date(), p = x => String(x).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`; };
  function disaAktar(fontVeriDahil) {
    const d = {
      tur: 'site-tema-ayar', surum: 2, betik: SURUM, tarih: new Date().toISOString(), site: SITE, aktifTema: depo.tema,
      kalici: { temalar: kopya(depo.kul.temalar), ozelNesneler: kopya(depo.kul.ozelNesneler), fontlar: kopya(depo.kul.fontlar) },
      panel: { tema: depo.panelTema, ozel: kopya(depo.panelOzel) },
    };
    if (fontVeriDahil) d.fontVeri = depo.fontVeri;
    return d;
  }
  function dosyayaKaydet() {
    dosyaIndir(`site-tema-ayar_${SITE}_${damga()}.json`, JSON.stringify(disaAktar(true), null, 1));
    bildir('Ayar dosyası indirildi');
  }
  // Eski Claude Tema (0.5.x) dosyası: yer → nesne, "sekme.ozellik" → özellik
  function v1Cevir(d) {
    const ESLE = { 'renkler.zemin': 'zemin', 'renkler.yazi': 'yazi', 'renkler.cerceve': 'cerceve', 'yazi.aile': 'aile', 'yazi.boyut': 'boyut',
      'yazi.satir': 'satir', 'yazi.harf': 'harf', 'yazi.kalinlik': 'kalinlik', 'yazi.hiza': 'hiza', 'yazi.egik': 'bicem', 'bosluk.ic': 'ic',
      'bosluk.dikey': 'dis', 'cizgi.kalinlik': 'cizgi', 'cizgi.stil': 'cizgiTur', 'cizgi.kose': 'kose', 'gizle.gizle': 'gizle', 'gizle.saydam': 'saydam' };
    const k = d.kalici || {}, temalar = {};
    for (const [ad, t] of Object.entries(k.temalar || {})) {
      const nesneler = {};
      for (const [y, o] of Object.entries(t.yerler || {})) {
        const n = {};
        for (const [p, v] of Object.entries(o || {})) if (ESLE[p] && v !== null) n[ESLE[p]] = v;
        if (Object.keys(n).length) nesneler[y] = n;
      }
      temalar[ad] = { temel: t.temel || 'goz', degerler: t.degerler || {}, nesneler };
    }
    return {
      tur: 'site-tema-ayar', surum: 2, site: 'claude.ai', aktifTema: d.aktifTema,
      kalici: { temalar, ozelNesneler: (k.ozelYerler || []).map(y => ({ id: y.id, ad: y.ad, secici: y.secici, bolge: 'sayfa', tur: 'oge' })), fontlar: k.fontlar || [] },
      fontVeri: d.fontVeri,
    };
  }
  function dosyadanYukle(metin) {
    let d;
    try { d = JSON.parse(metin); } catch (e) { bildir('Dosya okunamadı: JSON değil'); return; }
    if (d && d.tur === 'claude-tema-ayar') d = v1Cevir(d);
    if (!d || d.tur !== 'site-tema-ayar') { bildir('Bu bir Site Tema ayar dosyası değil'); return; }
    if (d.panel) { depo.panelTema = PANEL_TEMALARI[d.panel.tema] ? d.panel.tema : depo.panelTema; depo.panelOzel = Object.assign({}, depo.panelOzel, d.panel.ozel || {}); panelKaydet(); panelRenkUygula(); }
    if (d.site && d.site !== SITE) { bildir(`Dosya ${d.site} için; yalnız panel ayarları alındı`); anlik('Dosyadan panel ayarı'); hepsiniCiz(); return; }
    const k = d.kalici || {};
    Object.assign(depo.kul.temalar, k.temalar || {});
    for (const n of k.ozelNesneler || []) if (!depo.kul.ozelNesneler.some(o => o.id === n.id)) depo.kul.ozelNesneler.push(n);
    for (const f of k.fontlar || []) if (!depo.kul.fontlar.some(o => o.ad === f.ad)) depo.kul.fontlar.push(f);
    if (d.fontVeri) { Object.assign(depo.fontVeri, d.fontVeri); yaz('fontVeri', depo.fontVeri); }
    yaz(SK('kullanici'), depo.kul);
    if (d.aktifTema && temaAdlari().includes(d.aktifTema)) { depo.tema = d.aktifTema; yaz(SK('tema'), depo.tema); }
    uygula(true); fontlariHazirla(); hepsiniCiz(); anlik('Dosyadan yüklendi');
    bildir('Ayarlar yüklendi');
  }

  /* ---------------- sayfa taraması (0021) ---------------- */
  function taramaOku() {
    const t = oku(SK('tarama'), null);
    return t && t.ogeler ? t : { sayfalar: [], ogeler: {} };
  }
  const uretilmis = s => /\d{4,}|[a-f0-9]{10,}|^:r|radix-|^_/i.test(s);
  function tara() {
    const t = taramaOku();
    const host = kok && kok.host;
    const SECICI = '[data-testid], [aria-label], [role], nav, header, main, aside, footer, form, fieldset, textarea, input, select, button, a[href], [contenteditable="true"], pre, code, h1, h2, h3, ul, ol, dialog, [id], [class*="font-"], [class*="message"], [class*="artifact"], [class*="file"]';
    const yol = e => {
      const p = [];
      for (let u = e.parentElement; u && u !== document.body && p.length < 4; u = u.parentElement) {
        const k = u.tagName.toLowerCase(), r = u.getAttribute('role'), tid = u.getAttribute('data-testid');
        if (tid || r || /^(nav|header|main|aside|footer|form|fieldset|dialog)$/.test(k)) p.unshift(k + (tid ? `[data-testid="${tid}"]` : r ? `[role="${r}"]` : ''));
      }
      return p.join(' > ');
    };
    let yeni = 0, n = 0;
    for (const e of document.querySelectorAll(SECICI)) {
      if (n > 2500) break;
      if (host && (e === host || host.contains(e))) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      n++;
      const s = seciciUret(e);
      const cs = getComputedStyle(e);
      const kayit = t.ogeler[s] || (yeni++, t.ogeler[s] = {
        secici: s, etiket: e.tagName.toLowerCase(), testid: e.getAttribute('data-testid') || '', aria: (e.getAttribute('aria-label') || '').slice(0, 60),
        role: e.getAttribute('role') || '', id: e.id && !uretilmis(e.id) ? e.id : '',
        siniflar: [...e.classList].slice(0, 6).join(' '), metin: (e.children.length < 4 ? (e.innerText || '').trim().replace(/\s+/g, ' ') : '').slice(0, 50),
        kutu: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], zemin: cssRenkHex(cs.backgroundColor) || '', yazi: cssRenkHex(cs.color) || '',
        boyut: cs.fontSize, yol: yol(e), bolgeTahmini: bolgeBul(e), sayi: 0, sayfalar: [],
      });
      try { kayit.sayi = Math.max(kayit.sayi, document.querySelectorAll(s).length); } catch (er) { /* bozuk seçici */ }
      if (!kayit.sayfalar.includes(location.pathname.replace(/[0-9a-f-]{20,}/g, '…'))) kayit.sayfalar.push(location.pathname.replace(/[0-9a-f-]{20,}/g, '…'));
    }
    t.sayfalar.push({ yol: location.pathname.replace(/[0-9a-f-]{20,}/g, '…'), baslik: document.title.slice(0, 60), tarih: new Date().toISOString(), gorunum: [innerWidth, innerHeight], oge: n });
    yaz(SK('tarama'), t);
    bildir(`Tarandı: ${n} öğe, ${yeni} yeni. Başka ekranları da açıp tekrar tara; sonra ☰ → Tarama dosyasını kaydet.`);
  }
  function taramaPaketi() {
    const t = taramaOku();
    return {
      tur: 'site-tema-tarama', betik: SURUM, site: SITE, tarih: new Date().toISOString(), tarayici: navigator.userAgent,
      stilYolu: stil.yol, stilHata: stil.hata, cspIhlal,
      profilEslesme: tumNesneler().filter(n => n.tur === 'oge').map(n => ({ id: n.id, ad: n.ad, secici: n.secici, sayi: eslesme(n) })),
      sayfalar: t.sayfalar, ogeler: Object.values(t.ogeler),
    };
  }
  function taramaKaydet() {
    dosyaIndir(`site-tema-tarama_${SITE}_${damga()}.json`, JSON.stringify(taramaPaketi(), null, 1));
    bildir('Tarama dosyası indirildi; bu dosyayı Claude\'a ver (0021)');
  }

  /* ---------------- seçici üretimi ---------------- */
  function seciciUret(e) {
    const t = v => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    const parca = n => {
      const et = n.tagName.toLowerCase();
      const tid = n.getAttribute('data-testid');
      if (tid) return `${et}[data-testid=${t(tid)}]`;
      const al = n.getAttribute('aria-label');
      if (al && al.length < 60) return `${et}[aria-label=${t(al)}]`;
      if (n.id && !uretilmis(n.id)) return `${et}#${CSS.escape(n.id)}`;
      const rol = n.getAttribute('role');
      const sin = [...n.classList].filter(c => !uretilmis(c) && !/[:[\]/!@%]/.test(c)).slice(0, 3).map(c => '.' + CSS.escape(c)).join('');
      return et + (rol ? `[role=${t(rol)}]` : '') + sin;
    };
    const say = x => { try { return document.querySelectorAll(x).length; } catch (er) { return 9999; } };
    let s = parca(e);
    if (say(s) > 12) {
      for (let u = e.parentElement, i = 0; u && u !== document.body && i < 5; u = u.parentElement, i++) {
        const aday = parca(u) + ' ' + s;
        if (say(aday) < say(s)) { s = aday; if (say(s) <= 12) break; }
      }
    }
    return s;
  }
  function bolgeBul(e) {
    for (const id of PROFIL.oncelik || []) {
      const b = PROFIL.bolgeler.find(x => x.id === id);
      try { if (b && b.kok && e.closest(b.kok)) return b.id; } catch (er) { /* bozuk kök */ }
    }
    return 'sayfa';
  }
  function htmlTarif(e) {
    const et = e.tagName.toLowerCase();
    const tid = e.getAttribute('data-testid'), rol = e.getAttribute('role');
    const sin = [...e.classList].filter(c => !uretilmis(c) && !/[:[\]/!@%]/.test(c))[0];
    return et + (tid ? `[${tid}]` : rol ? `[${rol}]` : sin ? '.' + sin : '');
  }
  function adOner(e) {
    const a = e.getAttribute('aria-label') || e.getAttribute('data-testid');
    if (a) return a.slice(0, 30);
    const ata = e.parentElement && e.parentElement !== document.body ? htmlTarif(e.parentElement) + ' › ' : '';
    return (ata + htmlTarif(e)).slice(0, 48);
  }

  function nesneEkle(e) {
    const bolge = bolgeBul(e);
    const bad = (BOLGELER.find(b => b.id === bolge) || {}).ad;
    const ad = prompt(`Yeni nesne · ${bad} bölgesine eklenir\nHTML: ${seciciUret(e).slice(0, 90)}\nAdı:`, adOner(e));
    if (!ad || !ad.trim()) return null;
    const n = { id: 'o' + Date.now().toString(36), ad: ad.trim(), secici: seciciUret(e), bolge, tur: 'oge' };
    depo.kul.ozelNesneler.push(n);
    kulKaydet();
    anlik('Nesne eklendi: ' + n.ad);
    return n.id;
  }
  function nesneAdDegistir() {
    const n = seciliNesneler()[0];
    if (!n || !n.ozel) { bildir('Önce eklediğin (turuncu) bir nesneyi seç'); return; }
    const ad = prompt('Nesnenin yeni adı:', n.ad);
    if (!ad || !ad.trim()) return;
    const k = depo.kul.ozelNesneler.find(o => o.id === n.id);
    if (k) k.ad = ad.trim(); else depo.kul.ozelNesneler.push(Object.assign({}, n, { ad: ad.trim() }));
    kulKaydet(); anlik('Nesne adı: ' + ad.trim()); hepsiniCiz();
  }
  function nesneSil() {
    const n = seciliNesneler()[0];
    if (!n || !n.ozel) { bildir('Yalnız eklenen (turuncu) nesne silinir'); return; }
    if (!confirm(`"${n.ad}" listeden silinsin mi? (Geçmişten geri alınabilir.)`)) return;
    depo.kul.ozelNesneler = depo.kul.ozelNesneler.filter(o => o.id !== n.id);
    for (const t of Object.values(depo.kul.temalar)) if (t.nesneler) delete t.nesneler[n.id];
    durum.secim = durum.secim.filter(s => s !== n.id);
    kulKaydet(); uygula(); anlik('Nesne silindi: ' + n.ad); secimDegisti();
  }

  /* ---------------- sayfada seçme: Ctrl+sağ tık (0019) ---------------- */
  let sonIsaretci = 'mouse';
  let sonSag = null;
  const bizdenMi = e => !!kok && e.composedPath().includes(kok.host);
  function adaylar(hedef) {
    const bilinen = tumNesneler().filter(n => n.tur === 'oge' && n.secici && n.id !== 'sayfa');
    const liste = [];
    let yakin = false;
    let derinlik = 0;
    for (let n = hedef; n && n !== document.documentElement; n = n.parentElement, derinlik++) {
      for (const y of bilinen) {
        if (liste.some(a => a.n === y)) continue;
        try { if (n.matches(y.secici)) { liste.push({ n: y }); if (derinlik < 2) yakin = true; } } catch (e) { /* bozuk seçici */ }
      }
    }
    // Tıklanan öğe bilinen bir nesne değilse "yeni nesne" adayı: yakında bilinen yoksa önce, varsa en sonda
    if (yakin) liste.push({ yeni: hedef }); else liste.unshift({ yeni: hedef });
    return liste;
  }
  function noktadanSec(hedef, ekle) {
    const ayni = sonSag && sonSag.el === hedef && Date.now() - sonSag.z < 60000;
    const liste = ayni ? sonSag.liste : adaylar(hedef);
    let i = ayni ? (sonSag.i + 1) % liste.length : 0;
    for (let deneme = 0; deneme < liste.length; deneme++, i = (i + 1) % liste.length) {
      const a = liste[i];
      let id = a.n ? a.n.id : null;
      if (a.yeni) { id = nesneEkle(a.yeni); if (!id) continue; liste[i] = { n: nesneBul(id) }; }
      sonSag = { el: hedef, i, liste, z: Date.now() };
      if (!depo.acik) paneliAc(true);
      sec(id, ekle);
      const sonraki = liste[(i + 1) % liste.length];
      if (liste.length > 1) bildir(`Seçildi: ${nesneBul(id).ad} (${i + 1}/${liste.length}) · aynı yere tekrar Ctrl+sağ tık: ${sonraki.yeni ? 'yeni nesne' : sonraki.n.ad}`);
      else bildir('Seçildi: ' + nesneBul(id).ad);
      const satir = nesneLb && nesneLb.querySelector('.o.ana');
      if (satir) satir.scrollIntoView({ block: 'nearest' });
      return;
    }
  }
  function sagTik(e) {
    const dokunma = sonIsaretci === 'touch';
    if (!depo.sagTik || !(e.ctrlKey || e.metaKey || dokunma) || e.shiftKey || secimModuAcik || !kok || bizdenMi(e)) return;
    const hedef = e.target instanceof Element ? e.target : null;
    if (!hedef) return;
    e.preventDefault(); e.stopPropagation();
    noktadanSec(hedef, durum.coklu);
  }
  // "+" düğmesi: sonraki tıklama sayfadan nesne seçer (telefonda da çalışır)
  let secimModuAcik = false;
  function secimModu(ac) {
    secimModuAcik = ac;
    document.documentElement.classList.toggle('st-secim', ac);
    if (ac) bildir('Sayfada bir yere tıkla (Esc: vazgeç)');
  }
  function secimTik(e) {
    if (!secimModuAcik || bizdenMi(e)) return;
    e.preventDefault(); e.stopPropagation();
    secimModu(false);
    const hedef = e.target instanceof Element ? e.target : null;
    if (hedef) noktadanSec(hedef, durum.coklu);
  }

  /* ---------------- seçili nesneyi sayfada işaretleme ---------------- */
  let isaretGecici = null;
  function isaretCiz() {
    if (!isaretKat) return;
    const ids = isaretGecici ? [isaretGecici] : (depo.acik && depo.isaret ? durum.secim : []);
    const kutular = [];
    for (const id of ids) {
      const n = nesneBul(id);
      if (!n || n.tur !== 'oge' || !n.secici || n.id === 'sayfa') continue;
      let els;
      try { els = [...document.querySelectorAll(n.secici)].slice(0, 30); } catch (e) { continue; }
      let ilk = true;
      for (const e of els) {
        const r = e.getBoundingClientRect();
        if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight) continue;
        const k = el('div', 'kutu-isaret');
        Object.assign(k.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
        kutular.push(k);
        if (ilk) {
          const a = el('div', 'isaret-ad', n.ad);
          a.style.left = Math.max(0, r.left) + 'px'; a.style.top = (r.top > 18 ? r.top - 17 : r.top + 2) + 'px';
          kutular.push(a); ilk = false;
        }
      }
    }
    isaretKat.replaceChildren(...kutular);
  }
  let isaretSaat = 0;
  function isaretDongusu(ac) {
    clearInterval(isaretSaat);
    if (ac) isaretSaat = setInterval(isaretCiz, 300);
    isaretCiz();
  }

  /* ---------------- panel boyutu, düğme, açma ---------------- */
  // ◐ düğmesi sürüklenir; bırakınca en yakın ekran kenarına yapışır (0.5.3'ten)
  let dugmeK = null, dugmeSuruklendi = false;
  function dugmeYerlestir() {
    if (!dugmeK) return;
    const b = 34, m = 14, k = depo.dugmeKonum || { k: 'sag', o: 1 };
    const o = Math.min(1, Math.max(0, +k.o || 0));
    let W = innerWidth, H = innerHeight;
    if (depo.acik) {
      if (darMi()) H = Math.round(innerHeight * 0.4);
      else W = innerWidth - (parseFloat(kap.style.getPropertyValue('--genislik')) || depo.genislik);
    }
    let x, y;
    if (k.k === 'sag' || k.k === 'sol') { x = k.k === 'sag' ? W - b - m : m; y = m + o * (innerHeight - b - 2 * m); }
    else { y = k.k === 'alt' ? innerHeight - b - m : m; x = m + o * (innerWidth - b - 2 * m); }
    dugmeK.style.left = Math.max(m, Math.min(W - b - m, x)) + 'px';
    dugmeK.style.top = Math.max(m, Math.min(H - b - 10, y)) + 'px';
  }
  function dugmeSurukleKur(d) {
    let bas = null;
    d.addEventListener('pointerdown', e => {
      if (e.button) return;
      const r = d.getBoundingClientRect();
      bas = { x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, oldu: false };
      d.setPointerCapture(e.pointerId);
    });
    d.addEventListener('pointermove', e => {
      if (!bas) return;
      if (!bas.oldu && Math.abs(e.clientX - bas.x) + Math.abs(e.clientY - bas.y) < 8) return;
      bas.oldu = true; d.classList.add('surukle');
      d.style.left = Math.max(0, Math.min(innerWidth - 34, e.clientX - bas.dx)) + 'px';
      d.style.top = Math.max(0, Math.min(innerHeight - 34, e.clientY - bas.dy)) + 'px';
    });
    const birak = () => {
      if (!bas) return;
      const oldu = bas.oldu; bas = null; d.classList.remove('surukle');
      if (!oldu) return;
      dugmeSuruklendi = true;
      const x = parseFloat(d.style.left), y = parseFloat(d.style.top);
      const W = innerWidth - 34, H = innerHeight - 34;
      const u = { sol: x, sag: W - x, ust: y, alt: H - y };
      let k = 'sag'; for (const a in u) if (u[a] < u[k]) k = a;
      const yatay = k === 'sag' || k === 'sol';
      depo.dugmeKonum = { k, o: yatay ? (y - 14) / Math.max(1, H - 28) : (x - 14) / Math.max(1, W - 28) };
      yaz('dugmeKonum', depo.dugmeKonum);
      dugmeYerlestir();
    };
    d.addEventListener('pointerup', birak);
    d.addEventListener('pointercancel', birak);
  }
  function genislikUygula(px) {
    const enFazla = Math.max(300, Math.floor(innerWidth * 0.7));
    const g = Math.min(enFazla, Math.max(300, Math.round(px)));
    document.documentElement.style.setProperty('--st-genislik', g + 'px');
    if (kap) kap.style.setProperty('--genislik', g + 'px');
    dugmeYerlestir();
    return g;
  }
  function tutamakKur(t) {
    t.addEventListener('pointerdown', e => {
      e.preventDefault();
      t.setPointerCapture(e.pointerId);
      const hareket = ev => { depo.genislik = genislikUygula(innerWidth - ev.clientX); };
      const birak = () => { t.removeEventListener('pointermove', hareket); t.removeEventListener('pointerup', birak); yaz('panelGenislik', depo.genislik); };
      t.addEventListener('pointermove', hareket);
      t.addEventListener('pointerup', birak);
    });
  }
  // Dikey telefonda panel alttan açılır, sayfa daralmaz (0012); yan çevrilince sağdan (0015)
  const DAR_EKRAN = matchMedia('(max-width: 600px), (pointer: coarse) and (orientation: portrait)');
  const darMi = () => DAR_EKRAN.matches;
  function darUygula() {
    document.documentElement.classList.toggle('st-dar', darMi());
    if (kap) kap.classList.toggle('dar', darMi());
    dugmeYerlestir();
  }
  function paneliAc(acik, ilk) {
    if (!ilk || depo.acik !== acik) { depo.acik = acik; yaz('panelAcik', acik); }
    document.documentElement.classList.toggle('st-acik', acik);
    if (kap) kap.classList.toggle('acik', acik);
    if (acik && kok && !ilk) hepsiniCiz();
    if (!acik) { acilirKapat(); secimModu(false); }
    isaretDongusu(acik);
    dugmeYerlestir();
  }

  /* ================================================================
     BAŞLAT
     ================================================================ */
  function baslat() {
    paneliKur();
    darUygula();
    DAR_EKRAN.addEventListener('change', darUygula);
    paneliAc(depo.acik, true);
    fontlariHazirla();
    const s = durumMetni();
    if (!gecmis.liste.length || gecmis.liste[gecmis.konum] === undefined || gecmis.liste[gecmis.konum].s !== s) anlik('Açılış');
    cubukBoya();
  }
  if (document.body) baslat(); else document.addEventListener('DOMContentLoaded', baslat, { once: true });

  const yaziAlaniMi = n => n && (n.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName));
  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && !e.altKey && e.code === 'KeyY') {
      e.preventDefault(); e.stopPropagation();
      paneliAc(!depo.acik);
      return;
    }
    if (e.key === 'Escape') { if (secimModuAcik) secimModu(false); if (durum.acilir) acilirKapat(); }
    ctrlAltHazir = (e.key === 'Control' || e.key === 'Alt') && e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey;
    if (!depo.acik || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    const z = e.code === 'KeyZ', y = e.code === 'KeyY' && !e.shiftKey;
    if (!z && !y) return;
    // Yazı kutusundaki Ctrl+Z sayfanın kendi geri alması kalır
    const ic = e.composedPath()[0];
    if (bizdenMi(e) ? yaziAlaniMi(ic) && ic.type !== 'range' : yaziAlaniMi(document.activeElement)) return;
    e.preventDefault(); e.stopPropagation();
    if (y || e.shiftKey) ileriAl(); else geriAl();
  }, true);
  // Ctrl+Alt bırakılınca seçim boşalır; arada başka tuş (AltGr ile @ gibi) basılırsa olmaz
  let ctrlAltHazir = false;
  window.addEventListener('keyup', e => {
    if (ctrlAltHazir && (e.key === 'Control' || e.key === 'Alt')) {
      ctrlAltHazir = false;
      if (durum.secim.length || secimModuAcik) { secimTemizle(); bildir('Seçim boşaltıldı'); }
    }
  }, true);
  document.addEventListener('contextmenu', sagTik, true);
  document.addEventListener('click', secimTik, true);
  document.addEventListener('pointerdown', e => { sonIsaretci = e.pointerType || 'mouse'; }, true);
  window.addEventListener('resize', () => { if (kap) genislikUygula(depo.genislik); });

  // Tampermonkey menüsü
  GM_registerMenuCommand('Site Tema paneli (' + KISAYOL + ')', () => paneliAc(!depo.acik));
  GM_registerMenuCommand('Sayfayı tara', () => tara());
  for (const ad of temaAdlari()) GM_registerMenuCommand('Tema: ' + ad, () => temaDegistir(ad));
})();
