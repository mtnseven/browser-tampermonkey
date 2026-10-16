// ==UserScript==
// @name         Claude Tema
// @namespace    metin-claude-tema
// @version      0.5.1
// @description  claude.ai göz teması ve canlı ayar paneli
// @match        https://claude.ai/*
// @run-at       document-start
// @noframes
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

  const SURUM = '0.5.1';
  const KISAYOL = 'Ctrl+Shift+Y';

  /* ================================================================
     KALICI AYAR — Metin'in onayladığı varsayılanlar (0004).
     Paneldeki "Panoya kopyala" / "Dosyaya kaydet" çıktısının "kalici"
     kısmı buraya yazılır, @version artırılır; bütün cihazlara geçer.
     ================================================================ */
  const KALICI = {
    temalar: {
      'Göz': { temel: 'goz', degerler: {}, yerler: {} },
    },
    ozelYerler: [],
    fontlar: [],
  };

  /* ================================================================
     TEMA VERİSİ — Stylus temasından derlendi (Tema/stylus_goz_tema.css)
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
  const DEGISKEN = Object.fromEntries(DEGISKENLER.map(d => [d.ad, d]));
  const RENK_DEGISKENLERI = DEGISKENLER.filter(d => /^#/.test(d.deger));

  /* ================================================================
     YERLER — claude.ai ekranında ayrı ayarlanabilen parçalar.
     renkler: bu yeri boyayan tema renkleri (başka yerlerle ortak olabilir)
     ================================================================ */
  const YERLER = [
    { id: 'sayfa', ad: 'Sayfa geneli', secici: 'body', gizlenemez: true, renkler: ['--zemin-ana', '--metin-ana'] },
    { id: 'solmenu', ad: 'Sol menü', secici: 'nav.h-screen', renkler: ['--zemin-koyu', '--cerceve', '--metin-ana'] },
    { id: 'sohbetler', ad: 'Sohbet listesi satırları', secici: 'ul.flex.flex-col.gap-px li a', renkler: ['--metin-soluk', '--metin-parlak', '--zemin-kutu', '--hover-cizgi', '--secili-zemin', '--vurgu-yesil'] },
    { id: 'ust', ad: 'Üst çubuk', secici: 'header', renkler: ['--zemin-koyu', '--cerceve'] },
    { id: 'baslik', ad: 'Sohbet başlığı', secici: '.font-copernicus', renkler: ['--metin-ana'] },
    { id: 'mesaj', ad: 'Senin mesajın', secici: '.font-user-message', renkler: ['--metin-ana', '--metin-parlak'] },
    { id: 'balon', ad: 'Mesaj balonu', secici: '.group.relative.inline-flex.gap-2.bg-bg-300', renkler: ['--zemin-kutu', '--cerceve'] },
    { id: 'yanit', ad: 'Claude yanıtı', secici: '.font-claude-response, .font-claude-response-body', renkler: ['--metin-claude', '--metin-parlak', '--link', '--link-hover'] },
    { id: 'satirkod', ad: 'Satır içi kod', secici: '.font-claude-response code, .font-claude-response-body code', renkler: ['--kod-satirici', '--zemin-kutu'] },
    { id: 'kodblok', ad: 'Kod bloğu', secici: 'pre, .code-block__code', renkler: ['--kod-zemin', '--kod-duz', '--tk-string', '--tk-attribute', '--tk-selector', '--tk-keyword', '--tk-comment', '--tk-number', '--tk-punctuation', '--tk-function'] },
    { id: 'yazma', ad: 'Yazma kutusu', secici: '.ProseMirror', renkler: ['--zemin-koyu', '--metin-ana', '--metin-placeholder', '--cerceve'] },
    { id: 'model', ad: 'Model seçici', secici: 'button[data-testid="model-selector-dropdown"]', renkler: ['--model-hover-bg', '--model-hover-metin', '--cerceve'] },
    { id: 'dugmeler', ad: 'Düğmeler (genel)', secici: 'button', renkler: ['--metin-ana', '--metin-parlak', '--zemin-kutu'] },
    { id: 'linkler', ad: 'Bağlantılar', secici: 'a', renkler: ['--link', '--link-hover'] },
    { id: 'rozet', ad: 'Vurgu rozetleri', secici: '.bg-accent-main-000, .bg-accent-secondary-100, .bg-accent-pro-100', renkler: ['--vurgu-yesil'] },
    { id: 'dosya', ad: 'Dosya ekleri', secici: 'div[class*="attachment"], div[class*="file-upload"]', renkler: ['--cerceve'] },
    { id: 'kaydirma', ad: 'Kaydırma çubukları', secici: null, renkler: ['--kaydirma', '--kaydirma-ustunde', '--zemin-koyu'] },
  ];

  /* ================================================================
     ÖZELLİKLER — her sekmenin bir yerde ayarladığı şeyler
     ================================================================ */
  const OZELLIKLER = {
    renkler: [
      { k: 'zemin', ad: 'Zemin', tur: 'renk', css: 'background-color' },
      { k: 'yazi', ad: 'Yazı rengi', tur: 'renk', css: 'color' },
      { k: 'cerceve', ad: 'Çerçeve rengi', tur: 'renk', css: 'border-color' },
    ],
    yazi: [
      { k: 'aile', ad: 'Yazı tipi', tur: 'font', css: 'font-family' },
      { k: 'boyut', ad: 'Boyut', tur: 'sayi', min: 8, max: 32, adim: 0.5, birim: 'px', css: 'font-size' },
      { k: 'satir', ad: 'Satır aralığı', tur: 'sayi', min: 0.9, max: 2.6, adim: 0.05, birim: '', css: 'line-height' },
      { k: 'harf', ad: 'Harf aralığı', tur: 'sayi', min: -0.05, max: 0.3, adim: 0.005, birim: 'em', css: 'letter-spacing' },
      { k: 'kalinlik', ad: 'Kalınlık', tur: 'secim', css: 'font-weight', secenek: [['300', 'İnce 300'], ['400', 'Normal 400'], ['500', 'Orta 500'], ['600', 'Yarı kalın 600'], ['700', 'Kalın 700']] },
      { k: 'hiza', ad: 'Hizalama', tur: 'dugmeler', css: 'text-align', secenek: [['left', 'Sol'], ['center', 'Orta'], ['right', 'Sağ'], ['justify', 'İki yana']] },
      { k: 'egik', ad: 'Biçem', tur: 'dugmeler', css: 'font-style', secenek: [['normal', 'Düz'], ['italic', 'Eğik']] },
    ],
    bosluk: [
      { k: 'ic', ad: 'İç boşluk', tur: 'sayi', min: 0, max: 48, adim: 1, birim: 'px', css: 'padding' },
      { k: 'dikey', ad: 'Dış boşluk (dikey)', tur: 'sayi', min: 0, max: 48, adim: 1, birim: 'px', css: 'margin-block' },
      { k: 'aralik', ad: 'Öğe aralığı', tur: 'sayi', min: 0, max: 40, adim: 1, birim: 'px', css: 'gap' },
      { k: 'genislik', ad: 'En fazla genişlik', tur: 'sayi', min: 280, max: 2400, adim: 10, birim: 'px', css: 'max-width' },
    ],
    cizgi: [
      { k: 'kalinlik', ad: 'Çizgi kalınlığı', tur: 'sayi', min: 0, max: 8, adim: 0.5, birim: 'px', css: 'border-width' },
      { k: 'stil', ad: 'Çizgi türü', tur: 'dugmeler', css: 'border-style', secenek: [['solid', 'Düz'], ['dashed', 'Kesik'], ['dotted', 'Nokta'], ['none', 'Yok']] },
      { k: 'kose', ad: 'Köşe yuvarlığı', tur: 'sayi', min: 0, max: 24, adim: 1, birim: 'px', css: 'border-radius' },
    ],
    gizle: [
      { k: 'gizle', ad: 'Gizle', tur: 'anahtar', css: 'display' },
      { k: 'saydam', ad: 'Saydamlık', tur: 'sayi', min: 0.1, max: 1, adim: 0.05, birim: '', css: 'opacity' },
    ],
  };
  // Saklanan anahtar "sekme.ozellik": yazi.kalinlik ile cizgi.kalinlik karışmaz
  const OZ = {};
  for (const [sekme, liste] of Object.entries(OZELLIKLER)) for (const o of liste) { o.id = sekme + '.' + o.k; o.sekme = sekme; OZ[o.id] = o; }

  /* ================================================================
     YAZI TİPLERİ — Google'dakiler Türkçe karakter (latin-ext) için
     15.10.2026'da tek tek doğrulandı; sistemdekiler cihazda varsa çıkar.
     ================================================================ */
  const FONTLAR_GOOGLE = [{"ad":"Atkinson Hyperlegible","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Atkinson Hyperlegible Next","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Atkinson Hyperlegible Mono","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"Lexend","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Lexend Deca","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Lexend Exa","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Lexend Giga","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Andika","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Readex Pro","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Inter","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Noto Sans","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Open Sans","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Source Sans 3","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Figtree","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Public Sans","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Red Hat Text","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Red Hat Display","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"IBM Plex Sans","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Fira Sans","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Nunito","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Nunito Sans","tur":"sans","astigmat":true,"kaynak":"google"},{"ad":"Lato","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Roboto","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Roboto Flex","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Montserrat","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Poppins","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Work Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Karla","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Rubik","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Manrope","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"DM Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Mulish","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Raleway","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"PT Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Ubuntu","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Cabin","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Quicksand","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Comfortaa","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Varela Round","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Exo 2","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Titillium Web","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Oxygen","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Asap","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Barlow","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Archivo","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Libre Franklin","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Sora","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Outfit","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Plus Jakarta Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Urbanist","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Albert Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Onest","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Golos Text","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Commissioner","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Epilogue","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Be Vietnam Pro","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Kumbh Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Hanken Grotesk","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Schibsted Grotesk","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Instrument Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Bricolage Grotesque","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Space Grotesk","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Overpass","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Hind","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Mukta","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Josefin Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Chivo","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Spline Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Alegreya Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Encode Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Mada","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Heebo","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Assistant","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Signika","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Catamaran","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"M PLUS Rounded 1c","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Gothic A1","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Noto Sans Display","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Merriweather Sans","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Merriweather","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Lora","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Libre Baskerville","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Crimson Pro","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"EB Garamond","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Playfair Display","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Source Serif 4","tur":"serif","astigmat":true,"kaynak":"google"},{"ad":"Noto Serif","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Roboto Slab","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Zilla Slab","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Bitter","tur":"serif","astigmat":true,"kaynak":"google"},{"ad":"PT Serif","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Gelasio","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Literata","tur":"serif","astigmat":true,"kaynak":"google"},{"ad":"Newsreader","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Fraunces","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Alegreya","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Cormorant Garamond","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Spectral","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Vollkorn","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Cardo","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Old Standard TT","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"IBM Plex Serif","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Domine","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Faustina","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Petrona","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Brygada 1918","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Roboto Serif","tur":"serif","astigmat":false,"kaynak":"google"},{"ad":"Roboto Mono","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"JetBrains Mono","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"IBM Plex Mono","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"Fira Code","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"Fira Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Red Hat Mono","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"Source Code Pro","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"Inconsolata","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Space Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Ubuntu Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Cousine","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Anonymous Pro","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Overpass Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"DM Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Sometype Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Martian Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Fragment Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Victor Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Noto Sans Mono","tur":"mono","astigmat":true,"kaynak":"google"},{"ad":"Azeret Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Chivo Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Spline Sans Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Geist Mono","tur":"mono","astigmat":false,"kaynak":"google"},{"ad":"Geist","tur":"sans","astigmat":false,"kaynak":"google"},{"ad":"Oswald","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Bebas Neue","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Anton","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Archivo Black","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Righteous","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Alfa Slab One","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Abril Fatface","tur":"gosterim","astigmat":false,"kaynak":"google"},{"ad":"Caveat","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Patrick Hand","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Kalam","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Indie Flower","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Shadows Into Light","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Dancing Script","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Pacifico","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Lobster","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Architects Daughter","tur":"el","astigmat":false,"kaynak":"google"},{"ad":"Sniglet","tur":"el","astigmat":false,"kaynak":"google"}];
  const FONTLAR_SISTEM = [
    ['system-ui', 'sans', false], ['Segoe UI', 'sans', true], ['Verdana', 'sans', true], ['Tahoma', 'sans', true],
    ['Arial', 'sans', false], ['Calibri', 'sans', false], ['Candara', 'sans', false], ['Corbel', 'sans', false],
    ['Trebuchet MS', 'sans', false], ['Century Gothic', 'sans', false], ['Franklin Gothic Medium', 'sans', false],
    ['Gill Sans MT', 'sans', false], ['Helvetica', 'sans', false], ['Roboto', 'sans', false],
    ['Georgia', 'serif', false], ['Times New Roman', 'serif', false], ['Cambria', 'serif', false],
    ['Constantia', 'serif', false], ['Palatino Linotype', 'serif', false], ['Book Antiqua', 'serif', false],
    ['Garamond', 'serif', false], ['Consolas', 'mono', true], ['Cascadia Mono', 'mono', true],
    ['Courier New', 'mono', false], ['Lucida Console', 'mono', false], ['Comic Sans MS', 'el', true],
    ['Segoe Print', 'el', false], ['sans-serif', 'sans', false], ['serif', 'serif', false], ['monospace', 'mono', false],
  ].map(([ad, tur, astigmat]) => ({ ad, tur, astigmat, kaynak: 'sistem' }));
  const YEDEK_AILE = { sans: 'sans-serif', serif: 'serif', mono: 'monospace', el: 'cursive', gosterim: 'sans-serif' };
  const GENEL_AILE = new Set(['system-ui', 'sans-serif', 'serif', 'monospace', 'cursive']);

  /* ================================================================
     KALICI DEPO (bu cihaz)
     ================================================================ */
  const oku = (k, v) => { try { const d = GM_getValue(k); return d === undefined ? v : d; } catch (e) { return v; } };
  const yaz = (k, v) => { try { GM_setValue(k, v); } catch (e) { bildir('Kaydedilemedi: ' + e.message); } };
  const kopya = o => JSON.parse(JSON.stringify(o));

  const depo = {
    kul: oku('kullanici', null),
    tema: oku('tema', 'Göz'),
    acik: oku('panelAcik', false),
    genislik: oku('panelGenislik', 360),
    sekme: oku('sekme', 'renkler'),
    yer: oku('yer', ''),
    katlama: oku('katlama', {}),
    sagTik: oku('sagTik', true),
    panelYazi: oku('panelYazi', 12),
    isaret: oku('isaret', true),
    sonRenkler: oku('sonRenkler', []),
    fontOnbellek: oku('fontOnbellek', {}),
    fontVeri: oku('fontVeri', {}),
  };
  function kulDuzelt(k) {
    k = k && typeof k === 'object' ? k : {};
    k.temalar = k.temalar && typeof k.temalar === 'object' ? k.temalar : {};
    k.ozelYerler = Array.isArray(k.ozelYerler) ? k.ozelYerler : [];
    k.fontlar = Array.isArray(k.fontlar) ? k.fontlar : [];
    k.silinen = Array.isArray(k.silinen) ? k.silinen : [];
    return k;
  }
  depo.kul = kulDuzelt(depo.kul);
  const kulKaydet = () => yaz('kullanici', depo.kul);
  const ayarKaydet = (k) => yaz({ acik: 'panelAcik', genislik: 'panelGenislik' }[k] || k, depo[k]);

  /* ================================================================
     TEMA HESABI: betikteki (KALICI) + cihazdaki (kul) birleşir
     ================================================================ */
  function temaAdlari() {
    const ad = [];
    for (const a of Object.keys(KALICI.temalar)) if (!depo.kul.silinen.includes(a)) ad.push(a);
    for (const a of Object.keys(depo.kul.temalar)) if (!ad.includes(a) && a !== 'Orijinal') ad.push(a);
    ad.push('Orijinal');
    return ad;
  }

  function tema(ad) {
    if (ad === 'Orijinal' || !temaAdlari().includes(ad)) {
      return { ad: 'Orijinal', temel: 'orijinal', kilitli: true, degerler: {}, yerler: {}, kalicida: true };
    }
    const k = KALICI.temalar[ad] || {}, u = depo.kul.temalar[ad] || {};
    const temel = u.temel || k.temel || 'goz';
    const degerler = Object.assign({}, VARSAYILAN_DEGER, k.degerler || {}, u.degerler || {});
    const yerler = {};
    for (const kaynak of [k.yerler || {}, u.yerler || {}]) {
      for (const [y, o] of Object.entries(kaynak)) yerler[y] = Object.assign({}, yerler[y], o);
    }
    // cihazda null = betikteki değeri kaldır
    for (const o of Object.values(yerler)) for (const [p, v] of Object.entries(o)) if (v === null || v === '') delete o[p];
    return { ad, temel, kilitli: false, degerler, yerler, kalicida: !!KALICI.temalar[ad] && !depo.kul.silinen.includes(ad) };
  }
  const aktif = () => tema(depo.tema);

  function kulTema(ad) {
    if (!depo.kul.temalar[ad]) depo.kul.temalar[ad] = { temel: (KALICI.temalar[ad] || {}).temel || 'goz', degerler: {}, yerler: {} };
    const u = depo.kul.temalar[ad];
    u.degerler = u.degerler || {}; u.yerler = u.yerler || {};
    return u;
  }

  // Betiğe işlenmemiş değişiklik sayısı (0004: cihazdaki değişiklik denemedir)
  function islenmemis(ad) {
    if (ad === 'Orijinal') return 0;
    const u = depo.kul.temalar[ad];
    if (!u) return 0;
    const k = KALICI.temalar[ad];
    if (!k) return 1 + Object.keys(u.degerler || {}).length + Object.values(u.yerler || {}).reduce((t, o) => t + Object.keys(o).length, 0);
    let n = 0;
    const kd = Object.assign({}, VARSAYILAN_DEGER, k.degerler || {});
    for (const [d, v] of Object.entries(u.degerler || {})) if (kd[d] !== v) n++;
    for (const [y, o] of Object.entries(u.yerler || {})) for (const [p, v] of Object.entries(o)) if (((k.yerler || {})[y] || {})[p] !== (v === null ? undefined : v)) n++;
    if (u.temel && u.temel !== (k.temel || 'goz')) n++;
    return n;
  }

  function tumYerler() {
    return YERLER.concat(depo.kul.ozelYerler.map(y => Object.assign({ ozel: true, renkler: [] }, y)))
      .concat((KALICI.ozelYerler || []).filter(y => !depo.kul.ozelYerler.some(o => o.id === y.id)).map(y => Object.assign({ ozel: true, kalici: true, renkler: [] }, y)));
  }
  const yerBul = id => tumYerler().find(y => y.id === id);

  function eslesme(y) {
    if (!y.secici) return -1;
    try { return document.querySelectorAll(y.secici).length; } catch (e) { return 0; }
  }

  /* ================================================================
     CSS ÜRETİMİ
     ================================================================ */
  const fontBilgi = ad => tumFontlar().find(f => f.ad === ad);
  function aileYigini(ad) {
    if (GENEL_AILE.has(ad)) return ad;
    const f = fontBilgi(ad);
    return `"${ad.replace(/"/g, '')}", ${YEDEK_AILE[(f && f.tur) || 'sans']}`;
  }

  function bildirimler(o) {
    const d = [];
    for (const [id, v] of Object.entries(o)) {
      const oz = OZ[id];
      if (!oz || v === null || v === undefined || v === '') continue;
      if (oz.tur === 'renk') d.push(`${oz.css}: ${v} !important`);
      else if (oz.tur === 'font') d.push(`font-family: ${aileYigini(v)} !important`);
      else if (oz.tur === 'sayi') d.push(`${oz.css}: ${v}${oz.birim} !important`);
      else if (oz.tur === 'anahtar') { if (v) d.push('display: none !important'); }
      else d.push(`${oz.css}: ${v} !important`);
    }
    if (o['cizgi.kalinlik'] != null && !o['cizgi.stil']) d.push('border-style: solid !important');
    return d;
  }

  function cssUret() {
    const t = aktif();
    let css = '';
    if (t.temel === 'goz') {
      const kok = Object.entries(t.degerler).map(([ad, deger]) => `  ${ad}: ${deger};`).join('\n');
      css += `:root {\n${kok}\n}\n${KURALLAR}\n`;
    }
    for (const y of tumYerler()) {
      const o = t.yerler[y.id];
      if (!o || !y.secici) continue;
      const d = bildirimler(o);
      // :root öneki, temanın eşit güçteki kurallarını yener
      if (d.length) css += `:root :is(${y.secici}) { ${d.join('; ')}; }\n`;
    }
    return css;
  }

  /* ================================================================
     TEMAYI SAYFAYA BAS
     ================================================================ */
  const temaStil = document.createElement('style');
  temaStil.id = 'ct-tema';
  const yerlesimStil = document.createElement('style');
  yerlesimStil.id = 'ct-yerlesim';
  yerlesimStil.textContent = `
html.ct-acik:not(.ct-dar) body {
  width: calc(100vw - var(--ct-genislik, 360px)) !important;
  min-width: 0 !important;
  transform: translateZ(0) !important;
  overflow-x: hidden !important;
}
html.ct-secim, html.ct-secim * { cursor: crosshair !important; }`;

  let uygulaBekliyor = false;
  function temaUygula(hemen) {
    if (hemen) { temaStil.textContent = cssUret(); return; }
    if (uygulaBekliyor) return;
    uygulaBekliyor = true;
    requestAnimationFrame(() => { uygulaBekliyor = false; temaStil.textContent = cssUret(); });
  }

  // claude.ai'nin stillerinden sonra gelsin: eşit güçteki kuralda son yazan kazanır
  function stilleriYerlestir() {
    const hedef = document.head || document.documentElement;
    if (hedef.lastElementChild !== yerlesimStil || yerlesimStil.previousElementSibling !== temaStil) {
      hedef.append(temaStil, yerlesimStil);
    }
  }

  // document-start bazen <html> oluşmadan çalışır
  function kokHazir(fn) {
    if (document.documentElement) return fn();
    const g = new MutationObserver(() => { if (document.documentElement) { g.disconnect(); fn(); } });
    g.observe(document, { childList: true });
  }

  temaUygula(true);
  kokHazir(() => {
    stilleriYerlestir();
    const stilGozcu = new MutationObserver(stilleriYerlestir);
    stilGozcu.observe(document.documentElement, { childList: true });
    const headGozle = () => {
      if (!document.head) return;
      stilGozcu.observe(document.head, { childList: true });
      stilleriYerlestir();
    };
    if (document.head) headGozle(); else document.addEventListener('DOMContentLoaded', headGozle, { once: true });
  });

  /* ================================================================
     GEÇMİŞ (Photoshop History gibi; yalnız bu oturumda)
     ================================================================ */
  const gecmis = { liste: [], konum: -1 };
  function anlik(etiket) {
    const s = JSON.stringify({ kul: depo.kul, tema: depo.tema });
    const simdiki = gecmis.liste[gecmis.konum];
    if (simdiki && simdiki.s === s) return;
    gecmis.liste = gecmis.liste.slice(0, gecmis.konum + 1);
    gecmis.liste.push({ etiket, s, zaman: new Date() });
    if (gecmis.liste.length > 150) gecmis.liste.shift();
    gecmis.konum = gecmis.liste.length - 1;
    if (kok && depo.sekme === 'gecmis') icerikCiz();
    geriIleriBoya();
  }
  function gecmiseGit(i) {
    if (i < 0 || i >= gecmis.liste.length) return;
    gecmis.konum = i;
    const d = JSON.parse(gecmis.liste[i].s);
    depo.kul = kulDuzelt(d.kul);
    depo.tema = d.tema;
    kulKaydet(); ayarKaydet('tema');
    temaUygula(true);
    fontlariHazirla();
    if (kok) { temaSecDoldur(); yerSecDoldur(); icerikCiz(); geriIleriBoya(); }
  }
  const geriAl = () => gecmiseGit(gecmis.konum - 1);
  const ileriAl = () => gecmiseGit(gecmis.konum + 1);

  /* ================================================================
     DEĞER YAZMA
     ================================================================ */
  // canli: sürüklerken (geçmişe girmez); bitti: bırakınca (geçmişe girer)
  function degiskenAyarla(ad, deger, bitti) {
    const t = aktif(); if (t.kilitli) return;
    const u = kulTema(t.ad);
    const kd = Object.assign({}, VARSAYILAN_DEGER, (KALICI.temalar[t.ad] || {}).degerler || {});
    if (deger === null || deger === kd[ad]) delete u.degerler[ad]; else u.degerler[ad] = deger;
    temaUygula();
    if (bitti) { kulKaydet(); anlik(`${yerAdiDegisken(ad)} ${deger === null ? 'sıfırlandı' : '→ ' + deger}`); }
  }

  function yerAyarla(yerId, ozId, deger, bitti) {
    const t = aktif(); if (t.kilitli) return;
    const u = kulTema(t.ad);
    const kalici = (((KALICI.temalar[t.ad] || {}).yerler || {})[yerId] || {})[ozId];
    const o = u.yerler[yerId] = u.yerler[yerId] || {};
    if (deger === null || deger === undefined) { if (kalici !== undefined) o[ozId] = null; else delete o[ozId]; }
    else if (deger === kalici) delete o[ozId];
    else o[ozId] = deger;
    if (!Object.keys(o).length) delete u.yerler[yerId];
    temaUygula();
    if (OZ[ozId].tur === 'font' && deger) fontHazirla(deger).catch(() => {});
    if (bitti) {
      kulKaydet();
      const y = yerBul(yerId);
      anlik(`${y ? y.ad : yerId} · ${OZ[ozId].ad} ${deger === null ? 'sıfırlandı' : '→ ' + deger}`);
    }
  }

  /* ================================================================
     RENK DÖNÜŞÜMLERİ
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
    const m = c.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?/);
    if (!m) return null;
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
    return rgbHex(+m[1], +m[2], +m[3]);
  }
  function parlaklik(hex) {
    const c = hexRgb(hex); if (!c) return 0;
    const [r, g, b] = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function kontrast(a, b) {
    const x = parlaklik(a), y = parlaklik(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  /* ================================================================
     YAZI TİPİ YÜKLEME — GM_xmlhttpRequest + FontFace(ArrayBuffer):
     claude.ai'nin dış yazı tipi kısıtı (CSP) bu yolu etkilemez.
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
    // Değişken yazı tipinde aynı dosya birden çok kalınlıkta gelir: tek parçada birleşir
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
      try { return await gmIstek(`https://fonts.googleapis.com/css2?family=${aile}${ek}&display=swap`); } catch (e) { /* sıradaki dene */ }
    }
    throw new Error('Google Fonts\'ta bulunamadı');
  }

  async function fontIndir(f) {
    let parcalar;
    if (f.kaynak === 'google') parcalar = cssFontParcalari(await googleCss(f.ad));
    else if (f.kaynak === 'baglanti') {
      if (/\.(woff2?|ttf|otf)(\?|$)/i.test(f.url)) parcalar = [{ url: f.url, style: 'normal', weight: '100 900', range: '' }];
      else {
        const css = await gmIstek(f.url);
        parcalar = cssFontParcalari(css).map(p => Object.assign(p, { url: new URL(p.url, f.url).href }));
      }
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
      for (const o of Object.values(t.yerler)) if (o['yazi.aile']) s.add(o['yazi.aile']);
      for (const d of ['--f-govde', '--f-kod']) {
        const ilk = String(t.degerler[d] || '').split(',')[0].replace(/["']/g, '').trim();
        if (ilk) s.add(ilk);
      }
    }
    return s;
  }
  // Önbellekte yalnız kullanılan yazı tipleri kalır (depo şişmesin)
  function onbellekBuda() {
    const kul = kullanilanFontlar();
    for (const ad of Object.keys(depo.fontOnbellek)) if (!kul.has(ad)) delete depo.fontOnbellek[ad];
    yaz('fontOnbellek', depo.fontOnbellek);
  }
  function fontlariHazirla() { for (const ad of kullanilanFontlar()) fontHazirla(ad).catch(() => {}); }

  // Listede adı kendi yazı tipiyle görünsün: yalnız adın harfleri indirilir
  const onizlenen = new Set();
  function onizlemeYukle(f) {
    if (f.kaynak !== 'google' || onizlenen.has(f.ad)) return;
    onizlenen.add(f.ad);
    const aile = encodeURIComponent(f.ad).replace(/%20/g, '+');
    gmIstek(`https://fonts.googleapis.com/css2?family=${aile}&text=${encodeURIComponent(f.ad + 'Ağıİşöüç')}`)
      .then(css => { const p = cssFontParcalari(css, true)[0]; if (!p) throw 0; return gmIstek(p.url, 'ikili'); })
      .then(buf => { const ff = new FontFace('ctOn ' + f.ad, buf); return ff.load().then(() => document.fonts.add(ff)); })
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
    const ek = depo.kul.fontlar.concat((KALICI.fontlar || []).filter(f => !depo.kul.fontlar.some(k => k.ad === f.ad)));
    return ek.map(f => Object.assign({ tur: 'sans', astigmat: false }, f)).concat(FONTLAR_GOOGLE, FONTLAR_SISTEM);
  }

  /* ================================================================
     PANEL (Shadow DOM: temanın genel kuralları panele sızmaz)
     ================================================================ */
  const PANEL_CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-weight: 400 !important; }
.kok {
  --zemin: #0b0d0f; --zemin-koyu: #020a12; --zemin-ust: #152232; --zemin-alan: #080a0d;
  --cizgi: #28464d; --cizgi-acik: #394b60; --ustunde: #51529a;
  --yazi: #6d8da2; --yazi-parlak: #70a1c7; --etiket: #71747f;
  --secili: #b09ad6; --vurgu: #6b8669; --uyari: #c8673a; --kaydirma: #2a365a;
  font: var(--panel-yazi, 12px)/1.45 ui-monospace, "Atkinson Hyperlegible Mono", "Roboto Mono", Consolas, monospace;
  color: var(--yazi); letter-spacing: .02em;
}
button, select, input { font: inherit; color: inherit; letter-spacing: inherit; }
button { cursor: pointer; }
button:disabled, input:disabled, select:disabled { opacity: .45; cursor: default; }
.dugme {
  position: fixed; right: 14px; bottom: 14px; width: 34px; height: 34px;
  border-radius: 6px; border: 1px solid var(--cizgi-acik); background: var(--zemin-koyu);
  color: var(--yazi-parlak); font-size: 16px; display: grid; place-items: center; transition: right .15s;
}
.dugme:hover { border-color: var(--ustunde); background: var(--zemin-ust); }
.acik .dugme { right: calc(var(--genislik) + 14px); }
.panel {
  position: fixed; top: 0; right: 0; bottom: 0; width: var(--genislik);
  background: var(--zemin); border-left: 1px solid var(--cizgi);
  display: none; flex-direction: column; min-width: 0;
}
.acik .panel { display: flex; }
.dar .panel { top: auto; left: 0; width: auto; height: 60vh; border-left: 0; border-top: 1px solid var(--cizgi); }
.dar .tutamak { display: none; }
.dar.acik .dugme { right: 14px; bottom: calc(60vh + 10px); }
.dar .sekme { padding: 8px 8px; }
.dar .grup-bas { padding: 8px; }
.dar .kucuk-dugme { padding: 4px 9px; }
.dar input[type=range] { height: 22px; }
.tutamak { position: absolute; left: -3px; top: 0; bottom: 0; width: 6px; cursor: ew-resize; z-index: 2; }
.tutamak:hover, .tutamak.surukle { background: var(--ustunde); opacity: .6; }
/* Dokunmatikte tutamak parmakla tutulacak kadar geniş */
@media (pointer: coarse) { .tutamak { left: -10px; width: 20px; touch-action: none; } .tutamak::after { content: ''; position: absolute; left: 8px; top: 50%; width: 4px; height: 40px; margin-top: -20px; border-radius: 2px; background: var(--cizgi-acik); } }
.ust { display: flex; align-items: center; gap: 4px; padding: 5px 6px; background: var(--zemin-koyu); border-bottom: 1px solid var(--cizgi); }
.ust .baslik { color: var(--yazi-parlak); margin-right: auto; padding-left: 2px; }
.ust select { max-width: 45%; }
.kucuk-dugme { background: none; border: 1px solid transparent; border-radius: 4px; padding: 1px 6px; color: var(--etiket); white-space: nowrap; }
.kucuk-dugme:hover:not(:disabled) { border-color: var(--cizgi-acik); color: var(--yazi-parlak); background: var(--zemin-ust); }
.kucuk-dugme.cerceveli { border-color: var(--cizgi-acik); }
.kucuk-dugme.etkin { color: var(--secili); border-color: var(--secili); }
select, input[type=text], input[type=number] {
  background: var(--zemin-alan); border: 1px solid var(--cizgi-acik); border-radius: 4px;
  padding: 2px 4px; color: var(--yazi); outline: none; min-width: 0;
}
select:hover, select:focus, input[type=text]:focus, input[type=number]:focus { border-color: var(--ustunde); }
input[type=number] { width: 64px; text-align: right; -moz-appearance: textfield; }
input[type=number]::-webkit-inner-spin-button { display: none; }
option { background: var(--zemin-koyu); color: var(--yazi); }
.satir-yer { display: flex; align-items: center; gap: 4px; padding: 4px 6px; border-bottom: 1px solid var(--cizgi); }
.satir-yer label { color: var(--etiket); padding: 0 2px; }
.satir-yer select { flex: 1; }
.sekmeler { display: flex; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid var(--cizgi); background: var(--zemin-koyu); }
.sekme { flex: 1 0 auto; padding: 5px 6px; white-space: nowrap; background: none; border: 0; border-bottom: 2px solid transparent; color: var(--etiket); }
.sekme:hover { color: var(--yazi-parlak); background: var(--zemin-ust); }
.sekme.secili { color: var(--secili); border-bottom-color: var(--secili); background: var(--zemin); }
.icerik { flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--kaydirma) transparent; padding-bottom: 24px; }
.serit { margin: 6px; padding: 6px 8px; border: 1px solid var(--cizgi-acik); border-radius: 4px; color: var(--etiket); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.serit.uyari { border-color: var(--uyari); color: var(--uyari); }
.grup { border-bottom: 1px solid var(--cizgi); }
.grup-bas {
  width: 100%; display: flex; align-items: center; gap: 6px; padding: 5px 8px;
  background: var(--zemin-koyu); border: 0; text-align: left; color: var(--yazi);
}
.grup-bas:hover { color: var(--yazi-parlak); background: var(--zemin-ust); }
.grup-bas .ok { width: 10px; color: var(--etiket); flex: none; }
.grup-bas .sag { margin-left: auto; color: var(--etiket); display: flex; gap: 6px; align-items: center; }
.grup.kapali .grup-ic { display: none; }
.nokta { width: 6px; height: 6px; border-radius: 50%; background: var(--secili); display: inline-block; }
.uyari-isaret { color: var(--uyari); }
.not { padding: 4px 8px 6px 24px; color: var(--etiket); }
.oge { display: grid; grid-template-columns: 18px 1fr auto auto; align-items: center; gap: 6px; padding: 3px 6px 3px 22px; }
.oge:hover { background: var(--zemin-ust); }
.oge.acik { background: var(--zemin-ust); }
.oge .ad { color: var(--yazi); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.oge .deger { color: var(--etiket); cursor: pointer; }
.oge.degisti .ad, .ayar.degisti .etiket { color: var(--secili); }
.renk-kutu { width: 16px; height: 16px; border-radius: 3px; border: 1px solid var(--cizgi-acik); cursor: pointer; padding: 0; }
.renk-kutu.temadan { background: repeating-linear-gradient(45deg, #1a1f24 0 3px, #0b0d0f 3px 6px); }
.sifirla { visibility: hidden; }
.degisti > .sifirla { visibility: visible; }
.ayar { display: grid; grid-template-columns: minmax(84px, 34%) 1fr auto; align-items: center; gap: 6px; padding: 3px 6px 3px 22px; }
.ayar .etiket { color: var(--yazi); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ayar .alan { display: flex; align-items: center; gap: 6px; min-width: 0; }
.ayar .alan > select, .ayar .alan > input[type=text] { flex: 1; }
.ayar.temadan .alan input[type=number] { color: var(--etiket); }
input[type=range] { flex: 1; min-width: 40px; accent-color: var(--secili); height: 16px; background: transparent; }
.parcali { display: flex; flex-wrap: wrap; border: 1px solid var(--cizgi-acik); border-radius: 4px; overflow: hidden; }
.parcali button { flex: 1 0 auto; background: var(--zemin-alan); border: 0; border-right: 1px solid var(--cizgi); padding: 2px 6px; color: var(--etiket); }
.parcali button:last-child { border-right: 0; }
.parcali button:hover:not(:disabled) { color: var(--yazi-parlak); background: var(--zemin-ust); }
.parcali button.secili { color: var(--secili); background: var(--zemin-ust); }
.anahtar { width: 30px; height: 16px; border-radius: 8px; border: 1px solid var(--cizgi-acik); background: var(--zemin-alan); position: relative; padding: 0; }
.anahtar::after { content: ''; position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border-radius: 50%; background: var(--etiket); transition: left .12s; }
.anahtar.acik { border-color: var(--secili); }
.anahtar.acik::after { left: 16px; background: var(--secili); }
/* Renk seçici */
.secici { padding: 6px 8px 10px 22px; border-bottom: 1px dashed var(--cizgi); background: var(--zemin-alan); }
.sv { position: relative; height: 128px; border-radius: 4px; cursor: crosshair; touch-action: none; border: 1px solid var(--cizgi-acik); }
.sv .b { position: absolute; inset: 0; border-radius: 3px; background: linear-gradient(to right, #fff, rgba(255,255,255,0)); }
.sv .s { position: absolute; inset: 0; border-radius: 3px; background: linear-gradient(to top, #000, rgba(0,0,0,0)); }
.sv .tut { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; border: 2px solid #b8b4c4; box-shadow: 0 0 0 1px #000; pointer-events: none; }
.ton { position: relative; height: 12px; margin-top: 8px; border-radius: 6px; cursor: ew-resize; touch-action: none; border: 1px solid var(--cizgi-acik);
  background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); }
.ton .tut { position: absolute; top: -3px; width: 8px; height: 16px; margin-left: -4px; border-radius: 3px; background: var(--zemin-koyu); border: 2px solid #b8b4c4; pointer-events: none; }
.degerler { display: flex; gap: 4px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
.degerler input[type=number] { width: 46px; }
.degerler input[type=text] { width: 76px; }
.degerler select { width: 56px; }
.ornekler { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 6px; align-items: center; }
.ornekler .renk-kutu { width: 14px; height: 14px; }
.ornekler .etiket { color: var(--etiket); margin-right: 4px; }
.kont { margin-left: auto; color: var(--etiket); }
.kont.uyari { color: var(--uyari); }
/* Yazı tipi listesi */
.font-sec { flex: 1; text-align: left; background: var(--zemin-alan); border: 1px solid var(--cizgi-acik); border-radius: 4px; padding: 2px 6px; color: var(--yazi); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.font-pano { padding: 6px 8px 8px 22px; background: var(--zemin-alan); border-bottom: 1px dashed var(--cizgi); }
.font-pano .ara { width: 100%; }
.suzgec { display: flex; flex-wrap: wrap; gap: 3px; margin: 6px 0; }
.suzgec button { background: none; border: 1px solid var(--cizgi); border-radius: 10px; padding: 0 7px; color: var(--etiket); }
.suzgec button.secili { color: var(--secili); border-color: var(--secili); }
.font-liste { max-height: 260px; overflow-y: auto; border: 1px solid var(--cizgi); border-radius: 4px; scrollbar-width: thin; scrollbar-color: var(--kaydirma) transparent; }
.font-oge { display: flex; align-items: baseline; gap: 6px; padding: 3px 6px; cursor: pointer; }
.font-oge:hover { background: var(--zemin-ust); }
.font-oge.secili { color: var(--secili); }
.font-oge .fad { flex: 1; font-size: 14px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; letter-spacing: 0; }
.font-oge .etk { color: var(--etiket); font-size: 10px; }
.font-oge .etk.a { color: var(--vurgu); }
.font-oge.yok { opacity: .4; }
.font-ekle { display: flex; gap: 4px; margin-top: 6px; }
.font-ekle input { flex: 1; }
/* Temalar */
.tema-oge { display: flex; align-items: center; gap: 6px; padding: 5px 8px; border-bottom: 1px solid var(--cizgi); cursor: pointer; }
.tema-oge:hover { background: var(--zemin-ust); }
.tema-oge.secili { background: var(--zemin-ust); color: var(--secili); }
.tema-oge .rozet { color: var(--etiket); border: 1px solid var(--cizgi); border-radius: 8px; padding: 0 6px; font-size: 10px; }
.tema-oge .rozet.uyari { color: var(--uyari); border-color: var(--uyari); }
.tema-oge .tad { margin-right: auto; }
.dugme-sira { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 8px; }
.bolum-bas { padding: 8px 8px 4px; color: var(--etiket); border-top: 1px solid var(--cizgi); }
.bilgi { padding: 2px 8px; color: var(--etiket); }
/* Geçmiş */
.gecmis-oge { display: flex; gap: 8px; padding: 4px 8px; cursor: pointer; border-bottom: 1px solid #12181d; }
.gecmis-oge:hover { background: var(--zemin-ust); }
.gecmis-oge.simdi { color: var(--secili); background: var(--zemin-ust); }
.gecmis-oge.sonra { opacity: .45; }
.gecmis-oge .saat { color: var(--etiket); flex: none; }
.bos { padding: 16px 12px; color: var(--etiket); }
.alt { padding: 4px 8px; border-top: 1px solid var(--cizgi); color: var(--etiket); background: var(--zemin-koyu); display: flex; gap: 8px; justify-content: space-between; min-height: 24px; }
.alt .mesaj { color: var(--secili); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* Sayfa üstü: işaret kutuları, sağ tık menüsü, seçme şeridi */
.isaret-kat { position: fixed; inset: 0; pointer-events: none; }
.isaret { position: fixed; border: 2px dashed #b09ad6; border-radius: 3px; background: rgba(176,154,214,.08); }
.isaret-ad { position: fixed; background: #16122b; color: #b09ad6; border: 1px solid #b09ad6; border-radius: 3px; padding: 0 5px; font-size: 11px; white-space: nowrap; }
.menu { position: fixed; min-width: 200px; max-width: 320px; background: var(--zemin-koyu); border: 1px solid var(--cizgi-acik); border-radius: 6px; padding: 4px 0; pointer-events: auto; }
.menu button { display: block; width: 100%; text-align: left; background: none; border: 0; padding: 5px 12px; color: var(--yazi); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu button:hover { background: var(--zemin-ust); color: var(--yazi-parlak); }
.menu .ipucu { padding: 4px 12px; color: var(--etiket); font-size: 11px; border-top: 1px solid var(--cizgi); margin-top: 4px; }
.secim-serit { position: fixed; left: 50%; top: 10px; transform: translateX(-50%); background: #16122b; color: #b09ad6; border: 1px solid #b09ad6; border-radius: 6px; padding: 6px 12px; pointer-events: auto; display: flex; gap: 10px; align-items: center; }
`;

  const SEKMELER = [
    ['renkler', 'Renkler'], ['yazi', 'Yazı'], ['bosluk', 'Boşluk'], ['cizgi', 'Çizgi'],
    ['gizle', 'Gizle'], ['temalar', 'Temalar'], ['gecmis', 'Geçmiş'],
  ];

  let kok, kap, isaretKat, mesajZamani;

  function el(etiket, sinif, metin) {
    const e = document.createElement(etiket);
    if (sinif) e.className = sinif;
    if (metin != null) e.textContent = metin;
    return e;
  }
  function dugmeEl(metin, baslik, is, sinif) {
    const b = el('button', 'kucuk-dugme' + (sinif ? ' ' + sinif : ''), metin);
    if (baslik) b.title = baslik;
    b.addEventListener('click', e => { e.stopPropagation(); is(e); });
    return b;
  }

  function bildir(metin) {
    if (!kok) return;
    const m = kok.querySelector('.alt .mesaj');
    m.textContent = metin; m.title = metin;
    clearTimeout(mesajZamani);
    mesajZamani = setTimeout(() => { m.textContent = ''; }, 5000);
  }

  // Değişken notundaki ilk ifade yerin adı olur: "tüm sayfanın ana arka planı"
  const yerAdiDegisken = ad => { const d = DEGISKEN[ad]; return d ? (d.not || d.ad).split(/[,(]/)[0].trim() : ad; };

  function katli(anahtar, varsayilan) {
    return anahtar in depo.katlama ? depo.katlama[anahtar] : varsayilan;
  }
  function grupEl(anahtar, baslik, varsayilanKapali, sagIcerik, yerId) {
    const kapali = katli(anahtar, varsayilanKapali);
    const g = el('div', 'grup' + (kapali ? ' kapali' : ''));
    const bas = el('button', 'grup-bas');
    const ok = el('span', 'ok', kapali ? '▸' : '▾');
    const sag = el('span', 'sag');
    for (const s of sagIcerik || []) sag.append(s);
    bas.append(ok, el('span', '', baslik), sag);
    bas.addEventListener('click', () => {
      const simdi = !g.classList.contains('kapali');
      g.classList.toggle('kapali', simdi);
      ok.textContent = simdi ? '▸' : '▾';
      depo.katlama[anahtar] = simdi; ayarKaydet('katlama');
    });
    if (yerId) {
      bas.addEventListener('mouseenter', () => isaretle(yerId, true));
      bas.addEventListener('mouseleave', () => isaretle(null, true));
    }
    const ic = el('div', 'grup-ic');
    g.append(bas, ic);
    return { g, ic };
  }

  /* ---------------- panel iskeleti ---------------- */
  function paneliKur() {
    const host = document.createElement('ct-kok');
    host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;';
    kok = host.attachShadow({ mode: 'open' });
    const stil = el('style'); stil.textContent = PANEL_CSS;
    kap = el('div', 'kok');
    kap.style.setProperty('--panel-yazi', depo.panelYazi + 'px');

    const dugme = el('button', 'dugme', '◐');
    dugme.title = `Tema paneli (${KISAYOL})`;
    dugme.addEventListener('click', () => paneliAc(!depo.acik));

    const panel = el('aside', 'panel');
    const tutamak = el('div', 'tutamak');
    tutamakKur(tutamak);

    const ust = el('div', 'ust');
    ust.append(el('span', 'baslik', 'Tema'));
    const temaSec = el('select', 'tema-sec');
    temaSec.title = 'Etkin tema';
    temaSec.addEventListener('change', () => temaDegistir(temaSec.value));
    const geri = dugmeEl('↶', 'Geri al (Ctrl+Z)', geriAl, 'geri');
    const ileri = dugmeEl('↷', 'Yinele (Ctrl+Shift+Z)', ileriAl, 'ileri');
    const kapat = dugmeEl('×', `Kapat (${KISAYOL})`, () => paneliAc(false));
    ust.append(temaSec, geri, ileri, kapat);

    const satirYer = el('div', 'satir-yer');
    satirYer.append(el('label', '', 'Yer'));
    const yerSec = el('select', 'yer-sec');
    yerSec.title = 'Bir yer seçince sayfada işaretlenir ve sekmeler o yere daralır';
    yerSec.addEventListener('change', () => yerSecildi(yerSec.value));
    satirYer.append(yerSec,
      dugmeEl('◎', 'Seçili yeri sayfada işaretle / işareti kapat', () => { depo.isaret = !depo.isaret; ayarKaydet('isaret'); yerDugmeleriBoya(); isaretle(depo.yer); }, 'isaret-d'),
      dugmeEl('+', 'Sayfadan yeni yer seç', () => secimBaslat(null)),
      dugmeEl('✎', 'Özel yerin adını değiştir', yerAdDegistir, 'yer-ad'),
      dugmeEl('↻', 'Özel yeri sayfada yeniden bağla', () => secimBaslat(depo.yer), 'yer-bagla'),
      dugmeEl('✕', 'Özel yeri sil', yerSil, 'yer-sil'));

    const sekmeler = el('div', 'sekmeler');
    for (const [kod, ad] of SEKMELER) {
      const s = el('button', 'sekme', ad);
      s.dataset.kod = kod;
      s.addEventListener('click', () => { depo.sekme = kod; ayarKaydet('sekme'); sekmeleriBoya(); icerikCiz(); });
      sekmeler.append(s);
    }

    const icerik = el('div', 'icerik');
    const alt = el('div', 'alt');
    alt.append(el('span', 'mesaj', ''), el('span', 'surum', 'v' + SURUM));

    isaretKat = el('div', 'isaret-kat');

    panel.append(tutamak, ust, satirYer, sekmeler, icerik, alt);
    kap.append(isaretKat, dugme, panel);
    kok.append(stil, kap);
    document.documentElement.appendChild(host);

    // claude.ai html içeriğini değiştirirse host geri eklenir
    new MutationObserver(() => { if (!host.isConnected) document.documentElement.appendChild(host); })
      .observe(document.documentElement, { childList: true });

    genislikUygula(depo.genislik);
    temaSecDoldur();
    yerSecDoldur();
    sekmeleriBoya();
    paneliAc(depo.acik, true);
    icerikCiz();
    geriIleriBoya();
    // claude.ai sayfa değiştirdikçe yer eşleşmeleri yenilenir
    setInterval(() => { if (depo.acik) { yerSecDoldur(); if (depo.yer && depo.isaret) isaretle(depo.yer); } }, 3000);
  }

  function geriIleriBoya() {
    if (!kok) return;
    kok.querySelector('.geri').disabled = gecmis.konum <= 0;
    kok.querySelector('.ileri').disabled = gecmis.konum >= gecmis.liste.length - 1;
  }

  function temaSecDoldur() {
    const s = kok.querySelector('.tema-sec');
    s.replaceChildren();
    for (const ad of temaAdlari()) {
      const n = islenmemis(ad);
      s.append(new Option(ad + (n ? ' •' : ''), ad, false, ad === aktif().ad));
    }
  }

  function yerSecDoldur() {
    const s = kok.querySelector('.yer-sec');
    const once = s.value;
    s.replaceChildren(new Option('Tümü', ''));
    const og1 = el('optgroup'); og1.label = 'claude.ai yerleri';
    const og2 = el('optgroup'); og2.label = 'Senin eklediğin yerler';
    for (const y of tumYerler()) {
      const n = eslesme(y);
      const o = new Option((n === 0 ? '⚠ ' : '') + y.ad + (n > 0 ? `  (${n})` : ''), y.id);
      (y.ozel ? og2 : og1).append(o);
    }
    s.append(og1);
    if (og2.children.length) s.append(og2);
    if (depo.yer && !yerBul(depo.yer)) { depo.yer = ''; ayarKaydet('yer'); }
    s.value = depo.yer;
    if (s.value !== once && document.activeElement !== kok.host) { /* sessiz */ }
    yerDugmeleriBoya();
  }

  function yerDugmeleriBoya() {
    const y = yerBul(depo.yer);
    const ozel = !!(y && y.ozel && !y.kalici);
    kok.querySelector('.yer-ad').disabled = !ozel;
    kok.querySelector('.yer-bagla').disabled = !(y && y.ozel);
    kok.querySelector('.yer-sil').disabled = !ozel;
    kok.querySelector('.isaret-d').classList.toggle('etkin', depo.isaret);
  }

  function sekmeleriBoya() {
    for (const s of kok.querySelectorAll('.sekme')) s.classList.toggle('secili', s.dataset.kod === depo.sekme);
  }

  function yerSecildi(id) {
    depo.yer = id; ayarKaydet('yer');
    yerDugmeleriBoya();
    isaretle(id);
    if (['temalar', 'gecmis'].includes(depo.sekme)) { depo.sekme = 'renkler'; ayarKaydet('sekme'); sekmeleriBoya(); }
    icerikCiz();
  }

  function temaDegistir(ad) {
    if (!temaAdlari().includes(ad)) return;
    depo.tema = ad; ayarKaydet('tema');
    temaUygula(true);
    fontlariHazirla();
    anlik('Tema: ' + ad);
    if (kok) { temaSecDoldur(); icerikCiz(); }
  }

  /* ---------------- içerik ---------------- */
  let acikSecici = null;   // açık renk seçicinin anahtarı
  let acikFont = null;     // açık yazı tipi listesinin anahtarı

  function icerikCiz() {
    if (!kok) return;
    const icerik = kok.querySelector('.icerik');
    const kaydirma = icerik.scrollTop;
    icerik.replaceChildren();
    const t = aktif();
    if (t.kilitli && !['temalar', 'gecmis'].includes(depo.sekme)) {
      const s = el('div', 'serit');
      s.append(el('span', '', 'Orijinal tema claude.ai\'nin kendi görünümüdür, değiştirilmez.'),
        dugmeEl('Kopyasını oluştur', 'Orijinal temeline dayanan düzenlenebilir yeni tema', () => temaKopyala('Orijinal'), 'cerceveli'));
      icerik.append(s);
    }
    const ciz = { renkler: renklerCiz, yazi: ozellikSekmesi, bosluk: ozellikSekmesi, cizgi: ozellikSekmesi, gizle: ozellikSekmesi, temalar: temalarCiz, gecmis: gecmisCiz }[depo.sekme];
    ciz(icerik, t);
    icerik.scrollTop = kaydirma;
  }

  /* Renkler sekmesi */
  function renklerCiz(icerik, t) {
    const y = yerBul(depo.yer);
    if (y) {
      yerUyarisi(icerik, y);
      if (y.secici) {
        const { ic } = grupEl('renk-yer-' + y.id, 'Bu yerin renkleri', false);
        ic.append(el('div', 'not', 'Yalnız bu yeri boyar; boş olan tema renginden gelir.'));
        for (const oz of OZELLIKLER.renkler) ic.append(yerRenkOgesi(t, y, oz));
        icerik.append(ic.parentNode);
      }
      if (t.temel === 'goz' && y.renkler.length) {
        const { ic } = grupEl('renk-bagli-' + y.id, 'Bağlı tema renkleri', false);
        ic.append(el('div', 'not', 'Bunlar tema genelidir; değişince aynı rengi kullanan başka yerler de değişir.'));
        for (const ad of y.renkler) {
          const ortak = YERLER.filter(x => x !== y && x.renkler.includes(ad)).map(x => x.ad);
          ic.append(degiskenOgesi(t, ad, ortak));
        }
        icerik.append(ic.parentNode);
      }
      return;
    }
    if (t.temel === 'goz') {
      const gruplar = new Map();
      for (const d of RENK_DEGISKENLERI) {
        if (!gruplar.has(d.grup)) gruplar.set(d.grup, []);
        gruplar.get(d.grup).push(d);
      }
      icerik.append(el('div', 'bolum-bas', 'Tema renkleri'));
      for (const [grup, liste] of gruplar) {
        const degisen = liste.some(d => t.degerler[d.ad] !== VARSAYILAN_DEGER[d.ad]);
        const { g, ic } = grupEl('tema-' + grup, grup, false, [degisen ? el('span', 'nokta') : '', el('span', '', String(liste.length))].filter(Boolean));
        for (const d of liste) ic.append(degiskenOgesi(t, d.ad));
        icerik.append(g);
      }
    } else if (!t.kilitli) {
      icerik.append(el('div', 'serit', 'Bu tema Orijinal temeline dayanır: tema renkleri yok, yalnız yerlere özel renkler var.'));
    }
    icerik.append(el('div', 'bolum-bas', 'Yerlere özel renkler'));
    for (const y2 of tumYerler()) {
      if (!y2.secici) continue;
      icerik.append(yerGrubu(t, y2, 'renkler'));
    }
  }

  function yerUyarisi(icerik, y) {
    const n = eslesme(y);
    if (n === 0) {
      const s = el('div', 'serit uyari');
      s.append(el('span', '', `⚠ "${y.ad}" bu sayfada bulunamadı. Başka sayfada olabilir; claude.ai değiştiyse yeniden bağla.`));
      if (y.ozel) s.append(dugmeEl('Yeniden bağla', 'Sayfada yeni yerini seç', () => secimBaslat(y.id), 'cerceveli'));
      icerik.append(s);
    }
  }

  function yerGrubu(t, y, sekme) {
    const o = t.yerler[y.id] || {};
    const degisen = OZELLIKLER[sekme].some(oz => o[oz.id] !== undefined);
    const n = eslesme(y);
    const sag = [];
    if (degisen) sag.push(el('span', 'nokta'));
    sag.push(el('span', n === 0 ? 'uyari-isaret' : '', n === 0 ? '⚠ 0' : String(n)));
    const { g, ic } = grupEl(sekme + '-yer-' + y.id, y.ad, true, sag, y.id);
    for (const oz of OZELLIKLER[sekme]) {
      if (sekme === 'gizle' && oz.k === 'gizle' && y.gizlenemez) continue;
      ic.append(oz.tur === 'renk' ? yerRenkOgesi(t, y, oz) : ayarSatiri(t, y, oz));
    }
    return g;
  }

  function ozellikSekmesi(icerik, t) {
    const sekme = depo.sekme;
    const y = yerBul(depo.yer);
    if (y) {
      yerUyarisi(icerik, y);
      if (!y.secici) { icerik.append(el('div', 'bos', `"${y.ad}" yalnız renkle ayarlanır.`)); return; }
      for (const oz of OZELLIKLER[sekme]) {
        if (sekme === 'gizle' && oz.k === 'gizle' && y.gizlenemez) continue;
        icerik.append(ayarSatiri(t, y, oz));
      }
      if (sekme === 'yazi' && t.temel === 'goz') temaFontlari(icerik, t);
      return;
    }
    if (sekme === 'yazi' && t.temel === 'goz') temaFontlari(icerik, t);
    icerik.append(el('div', 'bolum-bas', 'Yerler'));
    for (const y2 of tumYerler()) {
      if (!y2.secici) continue;
      icerik.append(yerGrubu(t, y2, sekme));
    }
  }

  // Temanın genel yazı tipleri (--f-govde, --f-kod)
  function temaFontlari(icerik, t) {
    const { g, ic } = grupEl('tema-fontlar', 'Tema yazı tipleri (genel)', false);
    for (const [ad, baslik] of [['--f-govde', 'Gövde yazısı'], ['--f-kod', 'Kod yazısı']]) {
      const ilk = String(t.degerler[ad] || '').split(',')[0].replace(/["']/g, '').trim();
      const degisti = t.degerler[ad] !== VARSAYILAN_DEGER[ad];
      const satir = el('div', 'ayar' + (degisti ? ' degisti' : ''));
      satir.append(el('span', 'etiket', baslik));
      const alan = el('div', 'alan');
      const anahtar = 'tf' + ad;
      const b = el('button', 'font-sec', ilk || '—');
      b.style.fontFamily = aileYigini(ilk);
      b.disabled = t.kilitli;
      b.addEventListener('click', () => { acikFont = acikFont === anahtar ? null : anahtar; icerikCiz(); });
      alan.append(b);
      const sif = dugmeEl('↺', 'Varsayılana döndür', () => { degiskenAyarla(ad, null, true); icerikCiz(); }, 'sifirla');
      satir.append(alan, sif);
      ic.append(satir);
      if (acikFont === anahtar) {
        ic.append(fontPanosu(ilk, sec => {
          const f = fontBilgi(sec);
          degiskenAyarla(ad, aileYigini(sec) + (f && f.tur === 'mono' ? ', ui-monospace' : ''), true);
          fontHazirla(sec).catch(() => {});
          acikFont = null; icerikCiz();
        }));
      }
    }
    icerik.append(g);
  }

  /* Renk öğeleri */
  function degiskenOgesi(t, ad, ortak) {
    const deger = t.degerler[ad];
    const degisti = deger !== VARSAYILAN_DEGER[ad];
    const anahtar = 'd' + ad;
    const oge = el('div', 'oge' + (degisti ? ' degisti' : '') + (acikSecici === anahtar ? ' acik' : ''));
    oge.title = `${ad}\n${(DEGISKEN[ad] || {}).not || ''}` + (ortak && ortak.length ? `\nOrtak: ${ortak.join(', ')}` : '');
    const kutu = el('button', 'renk-kutu'); kutu.style.background = deger;
    const ac = () => { if (t.kilitli) return; acikSecici = acikSecici === anahtar ? null : anahtar; icerikCiz(); };
    kutu.addEventListener('click', ac);
    const adEl = el('span', 'ad', yerAdiDegisken(ad)); adEl.addEventListener('click', ac);
    const degEl = el('span', 'deger', deger); degEl.addEventListener('click', ac);
    oge.append(kutu, adEl, degEl, dugmeEl('↺', 'Varsayılana döndür', () => { degiskenAyarla(ad, null, true); icerikCiz(); }, 'sifirla'));
    const parca = document.createDocumentFragment();
    parca.append(oge);
    if (acikSecici === anahtar) {
      parca.append(renkSecici(deger, (hex, bitti) => {
        degiskenAyarla(ad, hex, bitti);
        kutu.style.background = hex; degEl.textContent = hex;
        if (bitti) sonRenkEkle(hex);
      }, metinRengiMi(ad)));
    }
    return parca;
  }

  function yerRenkOgesi(t, y, oz) {
    const o = t.yerler[y.id] || {};
    const deger = o[oz.id];
    const anahtar = 'y' + y.id + oz.id;
    const oge = el('div', 'oge' + (deger ? ' degisti' : '') + (acikSecici === anahtar ? ' acik' : ''));
    const kutu = el('button', 'renk-kutu' + (deger ? '' : ' temadan'));
    if (deger) kutu.style.background = deger;
    const ac = () => { if (t.kilitli) return; acikSecici = acikSecici === anahtar ? null : anahtar; icerikCiz(); };
    kutu.addEventListener('click', ac);
    const adEl = el('span', 'ad', oz.ad); adEl.addEventListener('click', ac);
    const degEl = el('span', 'deger', deger || 'temadan'); degEl.addEventListener('click', ac);
    oge.append(kutu, adEl, degEl, dugmeEl('↺', 'Temaya bırak', () => { yerAyarla(y.id, oz.id, null, true); icerikCiz(); }, 'sifirla'));
    const parca = document.createDocumentFragment();
    parca.append(oge);
    if (acikSecici === anahtar) {
      const baslangic = deger || hesaplananRenk(y, oz.css) || '#6d8da2';
      parca.append(renkSecici(baslangic, (hex, bitti) => {
        yerAyarla(y.id, oz.id, hex, bitti);
        kutu.classList.remove('temadan'); kutu.style.background = hex; degEl.textContent = hex;
        oge.classList.add('degisti');
        if (bitti) sonRenkEkle(hex);
      }, oz.k === 'yazi'));
    }
    return parca;
  }

  const metinRengiMi = ad => /metin|kod-|tk-|link|yazi/.test(ad) && !/zemin|-bg/.test(ad);

  function hesaplananRenk(y, ozellik) {
    try {
      const e = document.querySelector(y.secici);
      if (!e) return null;
      return cssRenkHex(getComputedStyle(e)[ozellik.replace(/-(\w)/g, (_, c) => c.toUpperCase())]);
    } catch (e) { return null; }
  }

  function sonRenkEkle(hex) {
    depo.sonRenkler = [hex].concat(depo.sonRenkler.filter(h => h !== hex)).slice(0, 14);
    ayarKaydet('sonRenkler');
  }

  /* Photoshop tipi renk seçici */
  function renkSecici(baslangic, degisti, metinMi) {
    const rgb0 = hexRgb(baslangic) || [109, 141, 162];
    let [h, s, v] = rgbHsv(...rgb0);
    let mod = oku('renkModu', 'HSL');
    const kutu = el('div', 'secici');
    const sv = el('div', 'sv'); sv.append(el('div', 'b'), el('div', 's'));
    const svTut = el('div', 'tut'); sv.append(svTut);
    const ton = el('div', 'ton'); const tonTut = el('div', 'tut'); ton.append(tonTut);
    const degerler = el('div', 'degerler');
    const modSec = el('select'); for (const m of ['HSL', 'RGB', 'HSB']) modSec.append(new Option(m, m, false, m === mod));
    const g1 = el('input'), g2 = el('input'), g3 = el('input');
    for (const g of [g1, g2, g3]) { g.type = 'number'; }
    const hex = el('input'); hex.type = 'text'; hex.spellcheck = false; hex.title = 'Hex';
    degerler.append(modSec, g1, g2, g3, hex);
    if (window.EyeDropper) {
      degerler.append(dugmeEl('⊙', 'Damlalık: ekrandan renk al', async () => {
        try { const r = await new window.EyeDropper().open(); const c = hexRgb(r.sRGBHex); if (c) { [h, s, v] = rgbHsv(...c); guncelle(true); } } catch (e) { /* iptal */ }
      }, 'cerceveli'));
    }
    const kont = el('span', 'kont');
    const ornek1 = el('div', 'ornekler'), ornek2 = el('div', 'ornekler');
    kutu.append(sv, ton, degerler, ornek1, ornek2);

    const simdikiHex = () => rgbHex(...hsvRgb(h, s, v));
    function alanlariYaz() {
      const rgb = hsvRgb(h, s, v).map(Math.round);
      let d;
      if (mod === 'RGB') d = rgb;
      else if (mod === 'HSB') d = [h, s * 100, v * 100].map(Math.round);
      else { const l = rgbHsl(...rgb); d = [l[0], l[1] * 100, l[2] * 100].map(Math.round); }
      const sinir = mod === 'RGB' ? [255, 255, 255] : [360, 100, 100];
      [g1, g2, g3].forEach((g, i) => { if (kok.activeElement !== g) g.value = d[i]; g.min = 0; g.max = sinir[i]; });
      if (kok.activeElement !== hex) hex.value = simdikiHex();
    }
    function boya() {
      sv.style.background = `hsl(${h}, 100%, 50%)`;
      svTut.style.left = (s * 100) + '%'; svTut.style.top = ((1 - v) * 100) + '%';
      tonTut.style.left = (h / 360 * 100) + '%';
      const k = kontrast(simdikiHex(), aktif().degerler['--zemin-ana'] || '#000000');
      kont.textContent = 'K ' + k.toFixed(1);
      kont.title = 'Sayfa zeminine kontrast. Göz profili: yazıda ~4,5–7 (7 üstü parlar).';
      kont.classList.toggle('uyari', metinMi && (k > 7.2 || k < 3));
    }
    function guncelle(bitti) { boya(); alanlariYaz(); degisti(simdikiHex(), bitti); if (bitti) ornekleriCiz(); }

    function surukle(alan, is) {
      alan.addEventListener('pointerdown', e => {
        e.preventDefault(); alan.setPointerCapture(e.pointerId);
        const hareket = ev => { is(ev, alan.getBoundingClientRect()); guncelle(false); };
        const birak = () => { alan.removeEventListener('pointermove', hareket); alan.removeEventListener('pointerup', birak); alan.removeEventListener('pointercancel', birak); guncelle(true); };
        alan.addEventListener('pointermove', hareket); alan.addEventListener('pointerup', birak); alan.addEventListener('pointercancel', birak);
        hareket(e);
      });
    }
    surukle(sv, (e, r) => { s = sinirla((e.clientX - r.left) / r.width, 0, 1); v = 1 - sinirla((e.clientY - r.top) / r.height, 0, 1); });
    surukle(ton, (e, r) => { h = sinirla((e.clientX - r.left) / r.width, 0, 1) * 359.9; });

    const alandan = () => {
      const d = [g1, g2, g3].map(g => parseFloat(g.value) || 0);
      let rgb;
      if (mod === 'RGB') rgb = d;
      else if (mod === 'HSB') rgb = hsvRgb(sinirla(d[0], 0, 360), sinirla(d[1], 0, 100) / 100, sinirla(d[2], 0, 100) / 100);
      else rgb = hslRgb(sinirla(d[0], 0, 360), sinirla(d[1], 0, 100) / 100, sinirla(d[2], 0, 100) / 100);
      const yeni = rgbHsv(...rgb.map(x => sinirla(x, 0, 255)));
      if (yeni[1] === 0 || yeni[2] === 0) yeni[0] = h;
      [h, s, v] = yeni;
    };
    for (const g of [g1, g2, g3]) {
      g.addEventListener('input', () => { alandan(); boya(); hex.value = simdikiHex(); degisti(simdikiHex(), false); });
      g.addEventListener('change', () => { alandan(); guncelle(true); });
    }
    hex.addEventListener('change', () => { const c = hexRgb(hex.value); if (c) { [h, s, v] = rgbHsv(...c); guncelle(true); } else hex.value = simdikiHex(); });
    modSec.addEventListener('change', () => { mod = modSec.value; yaz('renkModu', mod); alanlariYaz(); });

    function ornekleriCiz() {
      ornek1.replaceChildren(el('span', 'etiket', 'Son'));
      for (const c of depo.sonRenkler) ornek1.append(ornekKutu(c));
      ornek1.append(kont);
      ornek2.replaceChildren(el('span', 'etiket', 'Tema'));
      const tr = [...new Set(RENK_DEGISKENLERI.map(d => aktif().degerler[d.ad]).filter(c => /^#/.test(c)))];
      for (const c of tr) ornek2.append(ornekKutu(c));
    }
    function ornekKutu(c) {
      const b = el('button', 'renk-kutu'); b.style.background = c; b.title = c;
      b.addEventListener('click', () => { const x = hexRgb(c); if (x) { [h, s, v] = rgbHsv(...x); guncelle(true); } });
      return b;
    }
    boya(); alanlariYaz(); ornekleriCiz();
    return kutu;
  }

  /* Ayar satırları (sayı, seçim, düğmeler, anahtar, yazı tipi) */
  function hesaplanan(y, oz) {
    try {
      const e = document.querySelector(y.secici);
      if (!e) return null;
      const cs = getComputedStyle(e);
      if (oz.css === 'line-height') { const lh = parseFloat(cs.lineHeight), fs = parseFloat(cs.fontSize); return lh && fs ? +(lh / fs).toFixed(2) : 1.4; }
      if (oz.css === 'letter-spacing') { const ls = parseFloat(cs.letterSpacing), fs = parseFloat(cs.fontSize); return ls && fs ? +(ls / fs).toFixed(3) : 0; }
      if (oz.css === 'padding') return parseFloat(cs.paddingTop);
      if (oz.css === 'margin-block') return parseFloat(cs.marginTop);
      if (oz.css === 'border-width') return parseFloat(cs.borderTopWidth);
      if (oz.css === 'border-radius') return parseFloat(cs.borderTopLeftRadius);
      if (oz.css === 'border-style') return cs.borderTopStyle;
      if (oz.css === 'font-family') return cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      const v = cs.getPropertyValue(oz.css);
      return oz.tur === 'sayi' ? parseFloat(v) : v;
    } catch (e) { return null; }
  }

  function ayarSatiri(t, y, oz) {
    const o = t.yerler[y.id] || {};
    const deger = o[oz.id];
    const var_ = deger !== undefined;
    const satir = el('div', 'ayar' + (var_ ? ' degisti' : ' temadan'));
    satir.append(el('span', 'etiket', oz.ad));
    const alan = el('div', 'alan');
    const kilit = t.kilitli;
    const sifirla = dugmeEl('↺', 'Temaya bırak', () => { yerAyarla(y.id, oz.id, null, true); icerikCiz(); }, 'sifirla');
    const isaretDegisti = () => { satir.classList.add('degisti'); satir.classList.remove('temadan'); };
    const parca = document.createDocumentFragment();
    parca.append(satir);

    if (oz.tur === 'sayi') {
      const bas = var_ ? deger : hesaplanan(y, oz);
      const kaydir = el('input'); kaydir.type = 'range';
      const sayi = el('input'); sayi.type = 'number';
      for (const g of [kaydir, sayi]) { g.min = oz.min; g.max = oz.max; g.step = oz.adim; g.disabled = kilit; }
      const ondalik = (String(oz.adim).split('.')[1] || '').length;
      const bicim = x => (x == null || isNaN(x)) ? '' : (+x).toFixed(ondalik);
      kaydir.value = bas == null || isNaN(bas) ? oz.min : bas;
      sayi.value = bicim(bas);
      sayi.title = oz.birim || '';
      kaydir.addEventListener('input', () => { sayi.value = bicim(kaydir.value); isaretDegisti(); yerAyarla(y.id, oz.id, +kaydir.value, false); });
      kaydir.addEventListener('change', () => yerAyarla(y.id, oz.id, +kaydir.value, true));
      sayi.addEventListener('change', () => {
        const x = parseFloat(sayi.value);
        if (isNaN(x)) return;
        kaydir.value = x; isaretDegisti(); yerAyarla(y.id, oz.id, x, true);
      });
      alan.append(kaydir, sayi);
    } else if (oz.tur === 'secim') {
      const sec = el('select'); sec.disabled = kilit;
      sec.append(new Option('— temadan —', ''));
      for (const [d, ad] of oz.secenek) sec.append(new Option(ad, d, false, String(deger) === d));
      sec.addEventListener('change', () => { yerAyarla(y.id, oz.id, sec.value || null, true); icerikCiz(); });
      alan.append(sec);
    } else if (oz.tur === 'dugmeler') {
      const p = el('div', 'parcali');
      for (const [d, ad] of oz.secenek) {
        const b = el('button', deger === d ? 'secili' : '', ad); b.disabled = kilit;
        b.addEventListener('click', () => { yerAyarla(y.id, oz.id, deger === d ? null : d, true); icerikCiz(); });
        p.append(b);
      }
      alan.append(p);
    } else if (oz.tur === 'anahtar') {
      const b = el('button', 'anahtar' + (deger ? ' acik' : '')); b.disabled = kilit;
      b.title = deger ? 'Gizli — göstermek için tıkla' : 'Görünür — gizlemek için tıkla';
      b.addEventListener('click', () => { yerAyarla(y.id, oz.id, deger ? null : true, true); icerikCiz(); });
      alan.append(b);
    } else if (oz.tur === 'font') {
      const simdi = var_ ? deger : hesaplanan(y, oz);
      const anahtar = 'f' + y.id;
      const b = el('button', 'font-sec', simdi || '—');
      b.style.fontFamily = aileYigini(simdi || 'system-ui');
      b.disabled = kilit;
      b.addEventListener('click', () => { acikFont = acikFont === anahtar ? null : anahtar; icerikCiz(); });
      alan.append(b);
      if (acikFont === anahtar) {
        parca.append(fontPanosu(simdi, sec => { yerAyarla(y.id, oz.id, sec, true); acikFont = null; icerikCiz(); }));
      }
    }
    satir.append(alan, sifirla);
    return parca;
  }

  /* Yazı tipi panosu: arama, süzgeç, liste, dosyadan / bağlantıdan ekleme */
  let fontSuzgec = oku('fontSuzgec', 'hepsi');
  let fontAra = '';
  function fontPanosu(secili, sec) {
    const pano = el('div', 'font-pano');
    const ara = el('input', 'ara'); ara.type = 'text'; ara.placeholder = 'Yazı tipi ara…'; ara.value = fontAra;
    const suz = el('div', 'suzgec');
    const SUZ = [['hepsi', 'Tümü'], ['astigmat', 'Göz dostu'], ['sans', 'Sans'], ['serif', 'Serif'], ['mono', 'Mono'], ['el', 'El yazısı'], ['gosterim', 'Başlık'], ['sistem', 'Sistemde'], ['eklenen', 'Eklediğim']];
    const liste = el('div', 'font-liste');
    const gozcu = new IntersectionObserver(girdiler => {
      for (const g of girdiler) if (g.isIntersecting) { const f = g.target._font; onizlemeYukle(f); gozcu.unobserve(g.target); }
    }, { root: liste });
    function listeCiz() {
      liste.replaceChildren();
      const q = fontAra.toLocaleLowerCase('tr');
      const fl = tumFontlar().filter(f => {
        if (q && !f.ad.toLocaleLowerCase('tr').includes(q)) return false;
        if (fontSuzgec === 'astigmat') return f.astigmat;
        if (fontSuzgec === 'sistem') return f.kaynak === 'sistem';
        if (fontSuzgec === 'eklenen') return ['yuklenen', 'baglanti'].includes(f.kaynak);
        if (fontSuzgec !== 'hepsi') return f.tur === fontSuzgec;
        return true;
      });
      for (const f of fl) {
        const yok = f.kaynak === 'sistem' && !sistemdeVar(f.ad);
        const o = el('div', 'font-oge' + (f.ad === secili ? ' secili' : '') + (yok ? ' yok' : ''));
        const ad = el('span', 'fad', f.ad);
        ad.style.fontFamily = f.kaynak === 'google' ? `"ctOn ${f.ad}", "${f.ad}", ${YEDEK_AILE[f.tur]}` : aileYigini(f.ad);
        o.append(ad);
        if (f.astigmat) o.append(el('span', 'etk a', 'göz'));
        o.append(el('span', 'etk', yok ? 'cihazda yok' : { google: 'G', sistem: 'sistem', yuklenen: 'dosya', baglanti: 'bağlantı' }[f.kaynak] || ''));
        o.title = `${f.ad} · ${f.tur}${f.astigmat ? ' · göz dostu' : ''}`;
        o.addEventListener('click', () => { fontHazirla(f.ad).catch(() => {}); sec(f.ad); });
        o._font = f;
        if (f.kaynak === 'google') gozcu.observe(o);
        liste.append(o);
      }
      if (!fl.length) liste.append(el('div', 'bos', 'Eşleşen yazı tipi yok.'));
    }
    for (const [k, ad] of SUZ) {
      const b = el('button', k === fontSuzgec ? 'secili' : '', ad);
      b.addEventListener('click', () => { fontSuzgec = k; yaz('fontSuzgec', k); for (const x of suz.children) x.classList.toggle('secili', x === b); listeCiz(); });
      suz.append(b);
    }
    ara.addEventListener('input', () => { fontAra = ara.value; listeCiz(); });

    const ekle = el('div', 'font-ekle');
    const baglanti = el('input'); baglanti.type = 'text'; baglanti.placeholder = 'Google adı veya .css / .woff2 bağlantısı';
    const dosya = el('input'); dosya.type = 'file'; dosya.accept = '.ttf,.otf,.woff,.woff2'; dosya.style.display = 'none';
    ekle.append(baglanti,
      dugmeEl('Ekle', 'Adı ya da bağlantıyı ekle', async () => {
        const v = baglanti.value.trim(); if (!v) return;
        try { const ad = await fontEkleBaglanti(v); bildir('Eklendi: ' + ad); sec(ad); } catch (e) { bildir('Eklenemedi: ' + e.message); }
      }, 'cerceveli'),
      dugmeEl('Dosya…', 'Bilgisayardan / telefondan yazı tipi dosyası yükle', () => dosya.click(), 'cerceveli'),
      dosya);
    dosya.addEventListener('change', async () => {
      const f = dosya.files[0]; if (!f) return;
      try { const ad = await fontEkleDosya(f); bildir('Yüklendi: ' + ad); sec(ad); } catch (e) { bildir('Yüklenemedi: ' + e.message); }
    });
    pano.append(ara, suz, liste, ekle);
    listeCiz();
    // Telefonda klavye kendiliğinden açılmasın
    if (!darMi()) setTimeout(() => ara.focus({ preventScroll: true }), 0);
    return pano;
  }

  async function fontEkleBaglanti(v) {
    let f;
    if (/^https?:\/\//i.test(v)) {
      const u = new URL(v);
      let ad = u.searchParams.get('family');
      ad = ad ? ad.split(':')[0].replace(/\+/g, ' ') : decodeURIComponent(u.pathname.split('/').pop()).replace(/\.(woff2?|ttf|otf|css)$/i, '').replace(/[-_]+/g, ' ');
      f = { ad, kaynak: 'baglanti', url: v, tur: 'sans' };
    } else {
      const g = FONTLAR_GOOGLE.find(x => x.ad.toLocaleLowerCase('tr') === v.toLocaleLowerCase('tr'));
      if (g) return g.ad;
      f = { ad: v, kaynak: 'google', tur: 'sans' };
    }
    const parcalar = await fontIndir(f);
    if (!parcalar.length) throw new Error('yazı tipi bulunamadı');
    depo.kul.fontlar = depo.kul.fontlar.filter(x => x.ad !== f.ad).concat([f]);
    depo.fontOnbellek[f.ad] = parcalar; yaz('fontOnbellek', depo.fontOnbellek);
    kulKaydet(); anlik('Yazı tipi eklendi: ' + f.ad);
    fontSozu.delete(f.ad);
    await fontHazirla(f.ad);
    return f.ad;
  }

  async function fontEkleDosya(dosya) {
    const buf = await dosya.arrayBuffer();
    const ad = dosya.name.replace(/\.(woff2?|ttf|otf)$/i, '').replace(/[-_]+/g, ' ').trim();
    const ff = new FontFace(ad, buf); await ff.load(); document.fonts.add(ff);
    depo.fontVeri[ad] = [{ style: 'normal', weight: '100 900', range: '', b64: bufB64(buf) }];
    yaz('fontVeri', depo.fontVeri);
    depo.kul.fontlar = depo.kul.fontlar.filter(x => x.ad !== ad).concat([{ ad, kaynak: 'yuklenen', tur: 'sans' }]);
    kulKaydet(); anlik('Yazı tipi yüklendi: ' + ad);
    fontSozu.set(ad, Promise.resolve());
    return ad;
  }

  /* Temalar sekmesi */
  function temalarCiz(icerik) {
    icerik.append(el('div', 'bolum-bas', 'Temalar'));
    for (const ad of temaAdlari()) {
      const t = tema(ad);
      const n = islenmemis(ad);
      const o = el('div', 'tema-oge' + (ad === aktif().ad ? ' secili' : ''));
      o.append(el('span', 'tad', (ad === aktif().ad ? '● ' : '○ ') + ad));
      if (ad !== 'Orijinal') o.append(el('span', 'rozet', t.temel === 'goz' ? 'Göz temeli' : 'Orijinal temeli'));
      o.append(el('span', 'rozet', ad === 'Orijinal' ? 'sabit' : t.kalicida ? 'betikte' : 'cihazda'));
      if (n) { const r = el('span', 'rozet uyari', n + ' işlenmemiş'); r.title = 'Betiğe işlenmemiş değişiklik: Dosyaya kaydet / Panoya kopyala ile Claude\'a ver.'; o.append(r); }
      o.addEventListener('click', () => temaDegistir(ad));
      icerik.append(o);
    }
    const a = aktif();
    const sira = el('div', 'dugme-sira');
    sira.append(
      dugmeEl('Yeni boş', 'claude.ai orijinali üstüne boş yeni tema', () => temaYeni('orijinal'), 'cerceveli'),
      dugmeEl('Yeni Göz', 'Göz temasının başlangıç hâlinden yeni tema', () => temaYeni('goz'), 'cerceveli'),
      dugmeEl('Kopyala', 'Etkin temanın kopyasını oluştur', () => temaKopyala(a.ad), 'cerceveli'),
    );
    const ad2 = dugmeEl('Ad değiştir', '', () => temaAdDegistir(a.ad), 'cerceveli');
    const sif = dugmeEl('Cihazdakini sıfırla', 'Bu cihazdaki değişiklikleri silip betikteki hâline döndür', () => temaSifirla(a.ad), 'cerceveli');
    const sil = dugmeEl('Sil', '', () => temaSil(a.ad), 'cerceveli');
    ad2.disabled = sil.disabled = a.kilitli;
    sif.disabled = a.kilitli || !depo.kul.temalar[a.ad];
    sira.append(ad2, sif, sil);
    icerik.append(sira);

    icerik.append(el('div', 'bolum-bas', 'Dosya ve taşıma'));
    icerik.append(el('div', 'bilgi', 'Ayarları dosyaya kaydedip başka cihazda yükleyebilirsin. Kalıcı olması için dosyayı ya da panodaki metni Claude\'a ver; betiğe işlenir.'));
    const dsira = el('div', 'dugme-sira');
    const yukle = el('input'); yukle.type = 'file'; yukle.accept = '.json,application/json'; yukle.style.display = 'none';
    yukle.addEventListener('change', async () => { const f = yukle.files[0]; if (f) dosyadanYukle(await f.text()); });
    dsira.append(
      dugmeEl('Dosyaya kaydet', 'Tüm temalar, özel yerler ve yüklenen yazı tipleri', dosyayaKaydet, 'cerceveli'),
      dugmeEl('Dosyadan yükle', 'Kaydedilmiş ayar dosyasını yükle', () => yukle.click(), 'cerceveli'),
      dugmeEl('Panoya kopyala', 'Claude\'a vermek için (yüklenen yazı tipi dosyaları hariç)', panoyaKopyala, 'cerceveli'),
      yukle);
    icerik.append(dsira);

    icerik.append(el('div', 'bolum-bas', 'Panel'));
    const sag = el('div', 'ayar' + (depo.sagTik ? ' degisti' : ''));
    const sagB = el('button', 'anahtar' + (depo.sagTik ? ' acik' : ''));
    sagB.addEventListener('click', () => { depo.sagTik = !depo.sagTik; ayarKaydet('sagTik'); icerikCiz(); });
    sag.append(el('span', 'etiket', 'Sağ tık menüsü'), sagB, el('span', ''));
    const boy = el('div', 'ayar');
    const boyS = el('select');
    for (const p of [11, 12, 13, 14, 15]) boyS.append(new Option(p + ' px', p, false, p === depo.panelYazi));
    boyS.addEventListener('change', () => { depo.panelYazi = +boyS.value; ayarKaydet('panelYazi'); kap.style.setProperty('--panel-yazi', depo.panelYazi + 'px'); });
    const boyA = el('div', 'alan'); boyA.append(boyS);
    boy.append(el('span', 'etiket', 'Panel yazı boyu'), boyA, el('span', ''));
    icerik.append(sag, boy);
    for (const s of [
      `${KISAYOL}: paneli aç/kapat`, 'Ctrl+Z / Ctrl+Shift+Z: geri al / yinele (panel açıkken)',
      'Sağ tık: o yeri düzenle · Shift+sağ tık: tarayıcının menüsü',
      'Telefonda: ◐ düğmesi, uzun basma = sağ tık', `Sürüm ${SURUM}`]) icerik.append(el('div', 'bilgi', s));
  }

  function benzersizAd(ad) {
    let a = ad, i = 2;
    while (temaAdlari().includes(a)) a = `${ad} ${i++}`;
    return a;
  }
  function adSor(soru, oneri) {
    const a = (window.prompt(soru, oneri) || '').trim();
    return a || null;
  }
  function temaYeni(temel) {
    const ad = adSor('Yeni temanın adı', benzersizAd(temel === 'goz' ? 'Göz yeni' : 'Yeni tema'));
    if (!ad) return;
    if (temaAdlari().includes(ad)) return bildir('Bu adda tema var.');
    depo.kul.temalar[ad] = { temel, degerler: {}, yerler: {} };
    depo.kul.silinen = depo.kul.silinen.filter(x => x !== ad);
    kulKaydet(); temaDegistir(ad);
  }
  function temaKopyala(kaynak) {
    const t = tema(kaynak);
    const ad = adSor('Kopyanın adı', benzersizAd(kaynak + ' kopya'));
    if (!ad) return;
    if (temaAdlari().includes(ad)) return bildir('Bu adda tema var.');
    const degerler = {};
    for (const [d, v] of Object.entries(t.degerler)) if (v !== VARSAYILAN_DEGER[d]) degerler[d] = v;
    depo.kul.temalar[ad] = { temel: t.temel, degerler, yerler: kopya(t.yerler) };
    depo.kul.silinen = depo.kul.silinen.filter(x => x !== ad);
    kulKaydet(); temaDegistir(ad);
  }
  function temaAdDegistir(eski) {
    const ad = adSor('Yeni ad', eski);
    if (!ad || ad === eski) return;
    if (temaAdlari().includes(ad) || ad === 'Orijinal') return bildir('Bu adda tema var.');
    const t = tema(eski);
    const degerler = {};
    for (const [d, v] of Object.entries(t.degerler)) if (v !== VARSAYILAN_DEGER[d]) degerler[d] = v;
    depo.kul.temalar[ad] = { temel: t.temel, degerler, yerler: kopya(t.yerler) };
    delete depo.kul.temalar[eski];
    if (KALICI.temalar[eski] && !depo.kul.silinen.includes(eski)) depo.kul.silinen.push(eski);
    depo.tema = ad; ayarKaydet('tema');
    kulKaydet(); temaUygula(true); anlik(`Tema adı: ${eski} → ${ad}`);
    temaSecDoldur(); icerikCiz();
  }
  function temaSifirla(ad) {
    if (!window.confirm(`"${ad}" temasının bu cihazdaki değişiklikleri silinsin mi?`)) return;
    delete depo.kul.temalar[ad];
    kulKaydet(); temaUygula(true); anlik('Sıfırlandı: ' + ad);
    temaSecDoldur(); icerikCiz();
  }
  function temaSil(ad) {
    if (ad === 'Orijinal') return;
    if (!window.confirm(`"${ad}" teması silinsin mi? (Geçmişten geri alınabilir)`)) return;
    delete depo.kul.temalar[ad];
    if (KALICI.temalar[ad] && !depo.kul.silinen.includes(ad)) depo.kul.silinen.push(ad);
    kulKaydet();
    temaDegistir(temaAdlari()[0]);
    anlik('Silindi: ' + ad);
  }

  /* Dosya / pano */
  function disaAktar(fontVeriDahil) {
    const temalar = {};
    for (const ad of temaAdlari()) {
      if (ad === 'Orijinal') continue;
      const t = tema(ad);
      const degerler = {};
      for (const [d, v] of Object.entries(t.degerler)) if (v !== VARSAYILAN_DEGER[d]) degerler[d] = v;
      temalar[ad] = { temel: t.temel, degerler, yerler: t.yerler };
    }
    const ozelYerler = tumYerler().filter(y => y.ozel).map(y => ({ id: y.id, ad: y.ad, secici: y.secici }));
    const fontlar = tumFontlar().filter(f => ['yuklenen', 'baglanti'].includes(f.kaynak) || (f.kaynak === 'google' && !FONTLAR_GOOGLE.includes(f)))
      .map(f => { const x = { ad: f.ad, kaynak: f.kaynak, tur: f.tur }; if (f.url) x.url = f.url; return x; });
    const veri = { tur: 'claude-tema-ayar', surum: 1, betik: SURUM, tarih: new Date().toISOString(), aktifTema: aktif().ad, kalici: { temalar, ozelYerler, fontlar } };
    if (fontVeriDahil) {
      veri.fontVeri = {};
      for (const f of fontlar) if (f.kaynak === 'yuklenen' && depo.fontVeri[f.ad]) veri.fontVeri[f.ad] = depo.fontVeri[f.ad];
    }
    return veri;
  }
  function dosyayaKaydet() {
    const metin = JSON.stringify(disaAktar(true), null, 2);
    const a = document.createElement('a');
    const tarih = new Date(); const p = n => String(n).padStart(2, '0');
    a.download = `claude-tema-ayar_${tarih.getFullYear()}${p(tarih.getMonth() + 1)}${p(tarih.getDate())}_${p(tarih.getHours())}${p(tarih.getMinutes())}.json`;
    a.href = URL.createObjectURL(new Blob([metin], { type: 'application/json' }));
    document.documentElement.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    bildir('Dosya indirildi. Olmazsa "Panoya kopyala"yı kullan.');
  }
  function panoyaKopyala() {
    const metin = JSON.stringify(disaAktar(false), null, 2);
    try { GM_setClipboard(metin, 'text'); bildir('Panoya kopyalandı.'); }
    catch (e) { navigator.clipboard.writeText(metin).then(() => bildir('Panoya kopyalandı.'), () => bildir('Kopyalanamadı.')); }
  }
  function dosyadanYukle(metin) {
    let v;
    try { v = JSON.parse(metin); } catch (e) { return bildir('Dosya okunamadı: JSON değil.'); }
    if (!v || v.tur !== 'claude-tema-ayar' || !v.kalici || typeof v.kalici.temalar !== 'object') return bildir('Bu bir Claude Tema ayar dosyası değil.');
    const k = v.kalici;
    const yeni = kulDuzelt({ temalar: {}, ozelYerler: Array.isArray(k.ozelYerler) ? k.ozelYerler.filter(y => y && y.id && y.secici) : [], fontlar: Array.isArray(k.fontlar) ? k.fontlar : [], silinen: [] });
    for (const [ad, t] of Object.entries(k.temalar)) {
      if (ad === 'Orijinal' || !t) continue;
      yeni.temalar[ad] = { temel: t.temel === 'orijinal' ? 'orijinal' : 'goz', degerler: t.degerler || {}, yerler: t.yerler || {} };
    }
    for (const ad of Object.keys(KALICI.temalar)) if (!yeni.temalar[ad]) yeni.silinen.push(ad);
    depo.kul = yeni;
    if (v.fontVeri) { Object.assign(depo.fontVeri, v.fontVeri); yaz('fontVeri', depo.fontVeri); }
    if (v.aktifTema && temaAdlari().includes(v.aktifTema)) { depo.tema = v.aktifTema; ayarKaydet('tema'); }
    kulKaydet(); temaUygula(true); fontlariHazirla();
    anlik('Dosyadan yüklendi');
    temaSecDoldur(); yerSecDoldur(); icerikCiz();
    bildir(`Yüklendi: ${Object.keys(yeni.temalar).length} tema.`);
  }

  /* Geçmiş sekmesi */
  function gecmisCiz(icerik) {
    const sira = el('div', 'dugme-sira');
    const g = dugmeEl('↶ Geri al', 'Ctrl+Z', geriAl, 'cerceveli'); g.disabled = gecmis.konum <= 0;
    const i = dugmeEl('↷ Yinele', 'Ctrl+Shift+Z', ileriAl, 'cerceveli'); i.disabled = gecmis.konum >= gecmis.liste.length - 1;
    const tem = dugmeEl('Geçmişi temizle', 'Yalnız listeyi temizler, ayarlar kalır', () => {
      gecmis.liste = [gecmis.liste[gecmis.konum]]; gecmis.konum = 0; icerikCiz(); geriIleriBoya();
    }, 'cerceveli');
    sira.append(g, i, tem);
    icerik.append(sira);
    icerik.append(el('div', 'bilgi', 'Bir satıra tıklayınca o ana dönülür. Liste sayfa yenilenince sıfırlanır.'));
    const p = n => String(n).padStart(2, '0');
    gecmis.liste.forEach((k, n) => {
      const o = el('div', 'gecmis-oge' + (n === gecmis.konum ? ' simdi' : n > gecmis.konum ? ' sonra' : ''));
      o.append(el('span', 'saat', `${p(k.zaman.getHours())}:${p(k.zaman.getMinutes())}:${p(k.zaman.getSeconds())}`), el('span', '', k.etiket));
      o.addEventListener('click', () => gecmiseGit(n));
      icerik.append(o);
    });
  }

  /* ---------------- yer işaretleme ---------------- */
  let isaretYer = null, isaretGecici = false, isaretDongu = 0;
  function isaretle(yerId, gecici) {
    if (gecici) { isaretGecici = !!yerId; if (!yerId) yerId = depo.isaret ? depo.yer : null; }
    else if (!depo.isaret) yerId = null;
    isaretYer = yerId || null;
    if (isaretYer && !isaretDongu) isaretDongu = requestAnimationFrame(isaretCiz);
    if (!isaretYer) isaretKat.replaceChildren();
  }
  function isaretCiz() {
    isaretDongu = 0;
    const y = isaretYer && yerBul(isaretYer);
    if (!y || !y.secici || !depo.acik) { isaretKat.replaceChildren(); return; }
    let ogeler = [];
    try { ogeler = [...document.querySelectorAll(y.secici)].slice(0, 60); } catch (e) { /* bozuk seçici */ }
    const kutular = [];
    let ilk = null;
    for (const e of ogeler) {
      const r = e.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const k = el('div', 'isaret');
      Object.assign(k.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      kutular.push(k);
      if (!ilk) ilk = r;
    }
    if (ilk) {
      const a = el('div', 'isaret-ad', `${y.ad} · ${ogeler.length}`);
      Object.assign(a.style, { left: Math.max(0, ilk.left) + 'px', top: Math.max(0, ilk.top - 18) + 'px' });
      kutular.push(a);
    }
    isaretKat.replaceChildren(...kutular);
    isaretDongu = requestAnimationFrame(isaretCiz);
  }

  /* ---------------- sağ tık "Düzenle" ---------------- */
  let menuEl = null;
  function menuKapat() { if (menuEl) { menuEl.remove(); menuEl = null; } }
  function bizdenMi(e) { return e.composedPath().includes(kok && kok.host); }

  function sagTik(e) {
    if (!depo.sagTik || e.shiftKey || secimDurumu || !kok || bizdenMi(e)) return;
    const hedef = e.target instanceof Element ? e.target : null;
    if (!hedef) return;
    e.preventDefault(); e.stopPropagation();
    menuKapat();
    const bulunan = [];
    for (let n = hedef; n && n !== document.documentElement && bulunan.length < 5; n = n.parentElement) {
      for (const y of tumYerler()) {
        if (!y.secici || bulunan.includes(y)) continue;
        try { if (n.matches(y.secici)) bulunan.push(y); } catch (er) { /* bozuk seçici */ }
      }
    }
    menuEl = el('div', 'menu');
    for (const y of bulunan.slice(0, 5)) {
      const b = el('button', '', 'Düzenle: ' + y.ad);
      b.addEventListener('mouseenter', () => isaretle(y.id, true));
      b.addEventListener('mouseleave', () => isaretle(null, true));
      b.addEventListener('click', () => { menuKapat(); paneliAc(true); yerSecildi(y.id); yerSecDoldur(); });
      menuEl.append(b);
    }
    const yeni = el('button', '', '+ Yeni yer: ' + kisaTarif(hedef));
    yeni.addEventListener('click', () => { menuKapat(); yerOlustur(hedef); });
    menuEl.append(yeni);
    menuEl.append(el('div', 'ipucu', 'Tarayıcının kendi menüsü: Shift + sağ tık'));
    isaretKat.append(menuEl);
    const r = menuEl.getBoundingClientRect();
    menuEl.style.left = Math.min(e.clientX, innerWidth - r.width - 6) + 'px';
    menuEl.style.top = Math.min(e.clientY, innerHeight - r.height - 6) + 'px';
  }

  function kisaTarif(e) {
    const s = [...e.classList].slice(0, 2).map(c => '.' + c).join('');
    return (e.tagName.toLowerCase() + s).slice(0, 40);
  }

  // Seçici üretimi: data-testid > aria-label > sınıflar; çok genelse bir üst atadan önek
  function seciciUret(e) {
    const tirnak = v => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    const parca = n => {
      const etiket = n.tagName.toLowerCase();
      if (n.getAttribute('data-testid')) return `${etiket}[data-testid=${tirnak(n.getAttribute('data-testid'))}]`;
      if (n.getAttribute('aria-label')) return `${etiket}[aria-label=${tirnak(n.getAttribute('aria-label'))}]`;
      const sinif = [...n.classList].filter(c => c.length < 40 && !/^(hover|focus|active|group-hover|data-\[|aria-)/.test(c)).slice(0, 6);
      return etiket + sinif.map(c => '.' + CSS.escape(c)).join('');
    };
    let secici = parca(e);
    let n = e.parentElement, adim = 0;
    const say = s => { try { return document.querySelectorAll(s).length; } catch (er) { return 1e9; } };
    while (n && n !== document.body && say(secici) > 25 && adim < 3) {
      secici = parca(n) + ' ' + secici;
      n = n.parentElement; adim++;
    }
    return secici;
  }

  function yerOlustur(hedef) {
    const secici = seciciUret(hedef);
    const ad = adSor('Bu yerin adı', kisaTarif(hedef));
    if (!ad) return;
    const y = { id: 'o' + Date.now().toString(36), ad, secici };
    depo.kul.ozelYerler.push(y);
    kulKaydet(); anlik('Yer eklendi: ' + ad);
    paneliAc(true);
    yerSecDoldur(); yerSecildi(y.id); yerSecDoldur();
    bildir(`"${ad}" eklendi · ${eslesme(y)} eşleşme`);
  }

  function yerAdDegistir() {
    const y = yerBul(depo.yer); if (!y || !y.ozel) return;
    const ad = adSor('Yerin yeni adı', y.ad); if (!ad) return;
    const k = depo.kul.ozelYerler.find(x => x.id === y.id); if (!k) return;
    k.ad = ad; kulKaydet(); anlik('Yer adı: ' + ad);
    yerSecDoldur(); icerikCiz();
  }

  function yerSil() {
    const y = yerBul(depo.yer); if (!y || !y.ozel) return;
    if (!window.confirm(`"${y.ad}" yeri ve bütün temalardaki ayarları silinsin mi?`)) return;
    depo.kul.ozelYerler = depo.kul.ozelYerler.filter(x => x.id !== y.id);
    for (const t of Object.values(depo.kul.temalar)) if (t.yerler) delete t.yerler[y.id];
    kulKaydet(); anlik('Yer silindi: ' + y.ad);
    depo.yer = ''; ayarKaydet('yer');
    yerSecDoldur(); isaretle(null); icerikCiz();
  }

  /* ---------------- sayfadan seçme modu ---------------- */
  let secimDurumu = null;   // { yerId (yeniden bağlanacak) | null }
  function secimBaslat(yerId) {
    if (secimDurumu) return;
    secimDurumu = { yerId };
    document.documentElement.classList.add('ct-secim');
    const serit = el('div', 'secim-serit');
    serit.append(el('span', '', yerId ? 'Bu yerin yeni hâlini seç' : 'Yeni yer: sayfada bir yere tıkla / dokun'),
      dugmeEl('İptal (Esc)', '', secimBitir, 'cerceveli'));
    secimDurumu.serit = serit;
    isaretKat.append(serit);
    document.addEventListener('pointermove', secimUstunde, true);
    document.addEventListener('click', secimTik, true);
    document.addEventListener('keydown', secimTus, true);
  }
  function secimUstunde(e) {
    if (bizdenMi(e)) return;
    const r = e.target.getBoundingClientRect();
    let k = secimDurumu.kutu;
    if (!k) { k = secimDurumu.kutu = el('div', 'isaret'); isaretKat.append(k); }
    Object.assign(k.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  }
  function secimTik(e) {
    if (bizdenMi(e)) return;
    e.preventDefault(); e.stopPropagation();
    const hedef = e.target, yerId = secimDurumu.yerId;
    secimBitir();
    if (!yerId) return yerOlustur(hedef);
    const secici = seciciUret(hedef);
    let k = depo.kul.ozelYerler.find(x => x.id === yerId);
    if (!k) { const y = yerBul(yerId); if (!y) return; k = { id: y.id, ad: y.ad, secici: y.secici }; depo.kul.ozelYerler.push(k); }
    k.secici = secici;
    kulKaydet(); anlik('Yer yeniden bağlandı: ' + k.ad);
    temaUygula(true); yerSecDoldur(); isaretle(yerId); icerikCiz();
    bildir(`"${k.ad}" bağlandı · ${eslesme(k)} eşleşme`);
  }
  function secimTus(e) { if (e.key === 'Escape') { e.preventDefault(); secimBitir(); } }
  function secimBitir() {
    if (!secimDurumu) return;
    document.removeEventListener('pointermove', secimUstunde, true);
    document.removeEventListener('click', secimTik, true);
    document.removeEventListener('keydown', secimTus, true);
    if (secimDurumu.kutu) secimDurumu.kutu.remove();
    secimDurumu.serit.remove();
    secimDurumu = null;
    document.documentElement.classList.remove('ct-secim');
  }

  /* ---------------- genişlik, açma/kapama ---------------- */
  function genislikUygula(px) {
    const enFazla = Math.max(280, Math.floor(innerWidth * 0.7));
    const g = Math.min(enFazla, Math.max(260, Math.round(px)));
    document.documentElement.style.setProperty('--ct-genislik', g + 'px');
    if (kap) kap.style.setProperty('--genislik', g + 'px');
    return g;
  }

  function tutamakKur(t) {
    t.addEventListener('pointerdown', e => {
      e.preventDefault();
      t.setPointerCapture(e.pointerId);
      t.classList.add('surukle');
      const hareket = ev => { depo.genislik = genislikUygula(innerWidth - ev.clientX); };
      const birak = () => {
        t.classList.remove('surukle');
        t.removeEventListener('pointermove', hareket);
        t.removeEventListener('pointerup', birak);
        ayarKaydet('genislik');
      };
      t.addEventListener('pointermove', hareket);
      t.addEventListener('pointerup', birak);
    });
  }

  // Dikey telefonda panel alttan açılır, sayfa daralmaz (0012);
  // yan çevrilince bilgisayardaki gibi sağdan açılır (0015)
  const DAR_EKRAN = matchMedia('(max-width: 600px), (pointer: coarse) and (orientation: portrait)');
  const darMi = () => DAR_EKRAN.matches;
  function darUygula() {
    document.documentElement.classList.toggle('ct-dar', darMi());
    if (kap) kap.classList.toggle('dar', darMi());
  }

  function paneliAc(acik, ilk) {
    if (!ilk || depo.acik !== acik) { depo.acik = acik; ayarKaydet('acik'); }
    document.documentElement.classList.toggle('ct-acik', acik);
    if (kap) kap.classList.toggle('acik', acik);
    if (acik && kok && !ilk) { yerSecDoldur(); icerikCiz(); }
    if (kok) isaretle(acik ? depo.yer : null);
    if (!acik) menuKapat();
  }

  /* ================================================================
     BAŞLAT
     ================================================================ */
  function baslat() {
    paneliKur();
    darUygula();
    DAR_EKRAN.addEventListener('change', darUygula);
    fontlariHazirla();
  }
  anlik('Açılış');
  if (document.body) baslat(); else document.addEventListener('DOMContentLoaded', baslat, { once: true });

  const yaziAlaniMi = n => n && (n.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName));
  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && !e.altKey && e.code === 'KeyY') {
      e.preventDefault(); e.stopPropagation();
      paneliAc(!depo.acik);
      return;
    }
    if (!depo.acik || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    const z = e.code === 'KeyZ', y = e.code === 'KeyY' && !e.shiftKey;
    if (!z && !y) return;
    // claude.ai yazma kutusundaki Ctrl+Z'ye dokunma; panelin metin alanında da tarayıcınınki çalışsın
    const ic = e.composedPath()[0];
    if (bizdenMi(e) ? yaziAlaniMi(ic) && ic.type !== 'range' : yaziAlaniMi(document.activeElement)) return;
    e.preventDefault(); e.stopPropagation();
    if (y || e.shiftKey) ileriAl(); else geriAl();
  }, true);
  document.addEventListener('contextmenu', sagTik, true);
  document.addEventListener('pointerdown', e => { if (menuEl && !e.composedPath().includes(menuEl)) menuKapat(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') menuKapat(); }, true);
  window.addEventListener('resize', () => { if (kap) genislikUygula(depo.genislik); });

  // Tema ve panel Tampermonkey menüsünden de açılır
  for (const ad of temaAdlari()) GM_registerMenuCommand('Tema: ' + ad, () => temaDegistir(ad));
  GM_registerMenuCommand(`Paneli aç/kapat (${KISAYOL})`, () => paneliAc(!depo.acik));
})();
