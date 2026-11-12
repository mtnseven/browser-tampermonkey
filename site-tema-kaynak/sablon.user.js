// ==UserScript==
// @name         Site Tema
// @namespace    metin-site-tema
// @version      2.6.0
// @description  Bütün sitelere göz teması ve canlı ayar paneli (claude.ai el yapımı harita, öteki siteler otomatik harita); claude.ai model seçicisi tek pencerede
// @match        *://*/*
// @run-at       document-start
// @noframes
// @updateURL    https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/site-tema.user.js
// @downloadURL  https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/site-tema.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_addValueChangeListener
// @grant        GM_listValues
// @connect      fonts.googleapis.com
// @connect      fonts.gstatic.com
// @connect      *
// ==/UserScript==

(function () {
  'use strict';

  const SURUM = '2.6.0';
  const KISAYOL = 'Ctrl+Shift+Y';
  // Test sayfası site adını window.__ST_SITE ile verir; gerçek sitede tanımsızdır
  const SITE = String(window.__ST_SITE || location.hostname).replace(/^www\./, '');

  /* ================================================================
     KALICI AYAR — Metin'in onayladığı varsayılanlar, site başına (0004).
     Paneldeki ☰ → "Tümünü dosyaya kaydet" yedeğinden "paletler"
     (renkler, bütün siteler) ve "<site>:kullanici" (nesne ayarı) buraya
     temalar[ad].degerler / .nesneler olarak yazılır, @version artırılır.
     ================================================================ */
  const KALICI = {
    'claude.ai': {
      temalar: {
        // Metin'in favori teması (yedek 11.11.2026 14:30, 2.6.0)
        'Göz 3': {
          nesneler: {
            yazma: { yazi: '#9ee2f0', aile: 'Karla', boyut: 12.5, satir: 1.45, ic: 0, saydam: 1, cizgi: 0, kose: 0, dis: 0 },
            model: { aile: 'IBM Plex Mono', boyut: 12, harf: -0.05, ic: 4, dis: 0, satir: 1.55, kose: 4, cizgi: 0.5, cizgiTur: 'dotted' },
            sayfa: { yazi: '#58a8c9', ic: 0, dis: 0, kose: 0, cizgi: 0, saydam: 1 },
            dugmeler: { kose: 4, dis: 0, ic: 0, cizgi: 0, zemin: '#000000', yazi: '#58c9a0', aile: 'Cousine' },
            linkler: { yazi: '#69d4f0', boyut: 11.5, aile: 'Noto Sans Mono', satir: 1.65 },
            solmenu: { zemin: '#06030f', yazi: '#d07bb5' },
          },
        },
      },
      ozelNesneler: [], fontlar: [],
    },
  };

  /* ================================================================
     claude.ai GÖZ TEMASI — Stylus temasından derlendi (stylus_goz_tema.css)
     ================================================================ */
  const DEGISKENLER = /*@DEGISKENLER@*/[];

  const KURALLAR = String.raw`
/*@KURALLAR@*/
`;

  const VARSAYILAN_DEGER = Object.fromEntries(DEGISKENLER.map(d => [d.ad, d.deger]));

/*@OTO_HARITA@*/

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
    // Metin'in favorisi; varsayılan tema (yedek 11.11.2026 14:30, 2.6.0)
    'Göz 3': { temel: 'goz', degerler: Object.assign(renkDizisi(`
      #000000 #020a12 #0b0d0f #4691a0 #6d8da2 #4e8240 #71747f #70a1c7 #28464d #2a365a #51529a #6b8669
      #70a1c7 #51529a #6b8669 #152232 #080a0d #8a7a6a #71747f #8a7a6a #8a7a6a #4aa02c #8a9f5a #5a6a5a
      #6f8f6a #707070 #7a9f5a #1d1128 #b09ad6`), { '--f-govde': 'system-ui, sans-serif', '--f-kod': '"Roboto Mono", ui-monospace, monospace' }) },
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
  const hazirPanelDegerleri = ad => Object.fromEntries((PANEL_TEMALARI[ad] || PANEL_TEMALARI.Gece).split(' ').map((r, i) => [PANEL_DEGISKENLER[i][0], r]));
  // Panel temaları site temaları gibi çoğalır: kopyala, adını değiştir, kaldır (2.6.0)
  const panelTemaDegerleri = ad => depo.panelTemalar[ad] && !PANEL_TEMALARI[ad] ? Object.assign(hazirPanelDegerleri('Gece'), depo.panelTemalar[ad]) : hazirPanelDegerleri(ad);
  const panelTemaAdlari = () => Object.keys(PANEL_TEMALARI).filter(a => !depo.panelSilinen.includes(a))
    .concat(Object.keys(depo.panelTemalar).filter(a => !PANEL_TEMALARI[a]));

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
      { id: 'solmenu', ad: 'Sol menü', kok: 'aside.dframe-sidebar, nav' },
      { id: 'ust', ad: 'Üst çubuk', kok: '[data-testid="chat-header"], header' },
      { id: 'sohbet', ad: 'Sohbet', kok: 'main, [data-testid="assistant-message"], [data-testid="user-message"], .font-claude-response, .font-user-message' },
      { id: 'yazma', ad: 'Yazma kutusu', kok: 'fieldset, .ProseMirror, [contenteditable="true"]' },
      { id: 'dosya', ad: 'Dosya paneli', kok: null },
      { id: 'acilir', ad: 'Açılır pencereler', kok: '[role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]' },
    ],
    oncelik: ['acilir', 'yazma', 'ust', 'solmenu', 'sohbet'],
    nesneler: [
      { id: 'sayfa', bolge: 'sayfa', ad: 'Sayfa (gövde)', secici: 'body', gizlenemez: true },
      { id: 'dugmeler', bolge: 'sayfa', ad: 'Düğmeler (tümü)', secici: 'button' },
      { id: 'linkler', bolge: 'sayfa', ad: 'Bağlantılar (tümü)', secici: 'a' },
      // 09.11.2026 gerçek sayfa: [class*="bg-accent"] 58 düğmenin basılı-durum katmanını tutuyordu; rozet yalnız Badge (2.5.0)
      { id: 'rozet', bolge: 'sayfa', ad: 'Vurgu rozetleri', secici: '[data-cds="Badge"]' },
      { id: 'solmenu', bolge: 'solmenu', ad: 'Sol menü', secici: 'aside.dframe-sidebar, nav.h-screen' },
      { id: 'sohbetler', bolge: 'solmenu', ad: 'Sohbet listesi satırları', secici: '.dframe-sidebar .hit-row, ul.flex.flex-col.gap-px li a' },
      { id: 'ust', bolge: 'ust', ad: 'Üst çubuk', secici: '[data-testid="chat-header"], header' },
      { id: 'baslik', bolge: 'ust', ad: 'Sohbet başlığı', secici: '[data-testid="chat-header"] h2, h2[aria-label], .font-copernicus' },
      { id: 'mesaj', bolge: 'sohbet', ad: 'Senin mesajın', secici: '[data-testid="user-message"], .font-user-message' },
      { id: 'balon', bolge: 'sohbet', ad: 'Mesaj balonu', secici: '.cds-user-message-body, .group.relative.inline-flex.gap-2.bg-bg-300' },
      { id: 'yanit', bolge: 'sohbet', ad: 'Claude yanıtı', secici: '[data-testid="assistant-message"] .prose, .font-claude-response, .font-claude-response-body, .font-claude-message' },
      { id: 'satirkod', bolge: 'sohbet', ad: 'Satır içi kod', secici: ':is(.prose, .standard-markdown) code:not(pre code), .font-claude-response code, .font-claude-response-body code' },
      { id: 'kodblok', bolge: 'sohbet', ad: 'Kod bloğu', secici: '.epitaxy-codeblock, div:has(> pre.code-block__code), pre, .code-block__code' },
      // 09.11.2026 gerçek sayfa: eski sınıf seçicisi 0 öğe; ek kartı MessageAttachmentsFile / MessageAttachmentsImage (2.5.0)
      { id: 'dosya', bolge: 'sohbet', ad: 'Dosya ekleri', secici: '[data-testid="file-thumbnail"], [data-cds="MessageAttachmentsFile"], [data-cds="MessageAttachmentsImage"]' },
      { id: 'yazma', bolge: 'yazma', ad: 'Yazma alanı', secici: '.ProseMirror' },
      { id: 'model', bolge: 'yazma', ad: 'Model seçici', secici: 'button[data-testid="model-selector-dropdown"], button[data-testid*="model-selector"]' },
      { id: 'pencere', bolge: 'acilir', ad: 'Açılır pencere', secici: '[role="dialog"]' },
      { id: 'menu', bolge: 'acilir', ad: 'Açılır menü', secici: '[role="menu"]' },
    ],
  }];
  // El yapımı haritası olmayan site: otomatik harita (renk ölçümü) + genel harita (anlamsal etiket) (0026 3b)
  const GENEL_PROFIL = {
    ad: SITE, eslesir: () => true, gozTemasi: true, otoHarita: true,
    bolgeler: [
      { id: 'sayfa', ad: 'Sayfa geneli', kok: null },
      { id: 'oto', ad: 'Otomatik harita', kok: null },
      { id: 'yapi', ad: 'Sayfa yapısı', kok: 'header, nav, aside, footer, main' },
      { id: 'acilir', ad: 'Açılır pencereler', kok: '[role="dialog"], [role="menu"]' },
    ],
    oncelik: ['acilir', 'yapi'],
    nesneler: [
      { id: 'sayfa', bolge: 'sayfa', ad: 'Sayfa (gövde)', secici: 'body', gizlenemez: true },
      { id: 'dugmeler', bolge: 'sayfa', ad: 'Düğmeler (tümü)', secici: 'button' },
      { id: 'linkler', bolge: 'sayfa', ad: 'Bağlantılar (tümü)', secici: 'a' },
      { id: 'oto-ana', bolge: 'oto', ad: 'Sayfa rengindeki zeminler', secici: '[data-st-z="ana"]' },
      { id: 'oto-koyu', bolge: 'oto', ad: 'Geniş paneller', secici: '[data-st-z="koyu"]' },
      { id: 'oto-kutu', bolge: 'oto', ad: 'Kutular', secici: '[data-st-z="kutu"]' },
      { id: 'oto-vurgu', bolge: 'oto', ad: 'Renkli vurgular', secici: '[data-st-z="vurgu"]' },
      { id: 'oto-yazi', bolge: 'oto', ad: 'Ana yazı', secici: '[data-st-y="ana"]' },
      { id: 'oto-soluk', bolge: 'oto', ad: 'Soluk yazı', secici: '[data-st-y="soluk"]' },
      { id: 'oto-link', bolge: 'oto', ad: 'Metin içi bağlantılar', secici: '[data-st-y="link"]' },
      { id: 'oto-cerceve', bolge: 'oto', ad: 'Çerçeveli öğeler', secici: '[data-st-c]' },
      { id: 'ust', bolge: 'yapi', ad: 'Üst çubuk', secici: 'header, [role="banner"]' },
      { id: 'kenar', bolge: 'yapi', ad: 'Kenar menüsü', secici: 'nav, aside, [role="navigation"]' },
      { id: 'ana', bolge: 'yapi', ad: 'Ana içerik', secici: 'main, [role="main"]' },
      { id: 'yazma', bolge: 'yapi', ad: 'Yazma alanları', secici: 'input, textarea, [contenteditable="true"]' },
      { id: 'kodblok', bolge: 'yapi', ad: 'Kod bloğu', secici: 'pre' },
      { id: 'pencere', bolge: 'acilir', ad: 'Açılır pencere', secici: '[role="dialog"], dialog' },
      { id: 'menu', bolge: 'acilir', ad: 'Açılır menü', secici: '[role="menu"], [role="listbox"]' },
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
     ÖZELLİKLER — ayar alanının üç bölümü: Yazı, Zemin, Çerçeve; her
     bölümün kendi renk seçicisi ve yalnız kendi ayarları var (2.6.0)
     ================================================================ */
  const BOLUMLER = [['yazi', 'YAZI'], ['zemin', 'ZEMİN'], ['cerceve', 'ÇERÇEVE']];
  const OZ = {
    yazi: { grup: 'yazi', ad: 'Yazı', tur: 'renk', css: 'color', hesap: 'color' },
    zemin: { grup: 'zemin', ad: 'Zemin', tur: 'renk', css: 'background-color', hesap: 'backgroundColor' },
    cerceve: { grup: 'cerceve', ad: 'Çerçeve', tur: 'renk', css: 'border-color', hesap: 'borderTopColor' },
    aile: { grup: 'yazi', ad: 'Yazı tipi', tur: 'font' },
    boyut: { grup: 'yazi', ad: 'Boyut', tur: 'sayi', min: 8, max: 32, adim: 0.5, birim: 'px', css: 'font-size', hesap: 'fontSize' },
    satir: { grup: 'yazi', ad: 'Satır aralığı', tur: 'sayi', min: 0.9, max: 2.6, adim: 0.05, birim: '', css: 'line-height', hesap: 'lineHeight', oran: true },
    harf: { grup: 'yazi', ad: 'Harf aralığı', tur: 'sayi', min: -0.05, max: 0.3, adim: 0.005, birim: 'em', css: 'letter-spacing' },
    kalinlik: { grup: 'yazi', ad: 'Kalınlık', tur: 'secim', css: 'font-weight', secenek: [['300', 'İnce 300'], ['400', 'Normal 400'], ['500', 'Orta 500'], ['600', 'Yarı kalın 600'], ['700', 'Kalın 700']] },
    hiza: { grup: 'yazi', ad: 'Hizalama', tur: 'dugmeler', css: 'text-align', secenek: [['left', 'Sol'], ['center', 'Orta'], ['right', 'Sağ'], ['justify', 'İki yana']] },
    bicem: { grup: 'yazi', ad: 'Biçem', tur: 'dugmeler', css: 'font-style', secenek: [['normal', 'Düz'], ['italic', 'Eğik']] },
    ic: { grup: 'zemin', ad: 'İç boşluk', tur: 'sayi', min: 0, max: 48, adim: 1, birim: 'px', css: 'padding', hesap: 'paddingTop' },
    dis: { grup: 'zemin', ad: 'Dış boşluk', tur: 'sayi', min: 0, max: 48, adim: 1, birim: 'px', css: 'margin-block', hesap: 'marginTop' },
    kose: { grup: 'zemin', ad: 'Köşe', tur: 'sayi', min: 0, max: 32, adim: 1, birim: 'px', css: 'border-radius', hesap: 'borderTopLeftRadius' },
    cizgi: { grup: 'cerceve', ad: 'Çizgi kalınlığı', tur: 'sayi', min: 0, max: 8, adim: 0.5, birim: 'px', css: 'border-width', hesap: 'borderTopWidth' },
    cizgiTur: { grup: 'cerceve', ad: 'Çizgi türü', tur: 'dugmeler', css: 'border-style', secenek: [['solid', 'Düz'], ['dashed', 'Kesik'], ['dotted', 'Nokta'], ['none', 'Yok']] },
    gizle: { grup: 'zemin', ad: 'Gizle', tur: 'anahtar' },
    saydam: { grup: 'zemin', ad: 'Saydamlık', tur: 'sayi', min: 0.1, max: 1, adim: 0.05, birim: '', css: 'opacity', hesap: 'opacity' },
  };

  /* ================================================================
     YAZI TİPLERİ — Google'dakiler Türkçe karakter için 15.10.2026'da
     tek tek doğrulandı; sistemdekiler cihazda varsa listede çıkar.
     ================================================================ */
  const FONTLAR_GOOGLE = /*@FONTLAR@*/[];
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
    tema: null,
    // Palet bütün sitelerde ortak (paletSecili); siteTema yalnız bu sitede başka palet (2.4.0)
    siteTema: oku(SK('siteTema'), null),
    pal: oku('paletler', null),
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
    modelPencere: oku('modelPencere', true),
    // Bu sitede tema kapalı: panel ve ◐ kalır, sayfa kendi görünümündedir; son durum sitede saklanır (2.6.0)
    kapali: !!oku(SK('kapali'), false),
    favFontlar: oku('favFontlar', []),
    // Kullanıcının panel temaları ve kaldırılan hazır panel temaları (2.6.0)
    panelTemalar: oku('panelTemalar', {}),
    panelSilinen: oku('panelSilinen', []),
  };
  function kulDuzelt(k) {
    k = k && typeof k === 'object' ? k : {};
    k.temalar = k.temalar && typeof k.temalar === 'object' ? k.temalar : {};
    k.ozelNesneler = Array.isArray(k.ozelNesneler) ? k.ozelNesneler : [];
    k.fontlar = Array.isArray(k.fontlar) ? k.fontlar : [];
    k.silinen = Array.isArray(k.silinen) ? k.silinen : [];
    // Kaydedilmemiş değişiklikler tema başına; null = kayıtlı değeri kaldır (2.2.0)
    k.taslaklar = k.taslaklar && typeof k.taslaklar === 'object' ? k.taslaklar : {};
    return k;
  }
  depo.kul = kulDuzelt(depo.kul);
  // Palet: siteden bağımsız renk değerleri ve yazı tipleri (2.4.0). Nesne ayarı sitede kalır.
  function palDuzelt(p) {
    p = p && typeof p === 'object' ? p : {};
    p.temalar = p.temalar && typeof p.temalar === 'object' ? p.temalar : {};
    p.taslaklar = p.taslaklar && typeof p.taslaklar === 'object' ? p.taslaklar : {};
    p.silinen = Array.isArray(p.silinen) ? p.silinen : [];
    p.fontlar = Array.isArray(p.fontlar) ? p.fontlar : [];
    return p;
  }
  const tumAnahtarlar = () => { try { return typeof GM_listValues === 'function' ? GM_listValues() : []; } catch (e) { return []; } };
  // Göç (2.4.0 öncesi): her sitenin temasındaki renk değerleri ortak palete taşınır, nesne ayarı sitede kalır
  if (depo.pal === null) {
    const p = palDuzelt(null);
    const anahtarlar = tumAnahtarlar().filter(a => /:kullanici$/.test(a));
    if (!anahtarlar.includes(SK('kullanici'))) anahtarlar.push(SK('kullanici'));
    for (const a of anahtarlar) {
      const k = a === SK('kullanici') ? depo.kul : kulDuzelt(oku(a, null));
      for (const [kaynak, hedef] of [[k.temalar, p.temalar], [k.taslaklar, p.taslaklar]]) {
        for (const [ad, t] of Object.entries(kaynak)) {
          if (ad === 'Orijinal' || !t) continue;
          const dolu = t.degerler && Object.keys(t.degerler).length;
          if (dolu || t.temel || (kaynak === k.temalar && !HAZIR_TEMALAR[ad])) {
            const h = hedef[ad] || (hedef[ad] = { degerler: {} });
            Object.assign(h.degerler, t.degerler || {}); if (t.temel) h.temel = t.temel;
          }
          delete t.degerler; delete t.temel;
        }
      }
      for (const x of k.silinen) if (!p.silinen.includes(x)) p.silinen.push(x);
      for (const f of k.fontlar) if (!p.fontlar.some(o => o.ad === f.ad)) p.fontlar.push(f);
      k.silinen = []; k.fontlar = [];
      yaz(a, k);
    }
    const eski = oku(SK('tema'), null);
    if (eski && oku('paletSecili', null) === null) yaz('paletSecili', eski);
    depo.pal = p; yaz('paletler', p);
  }
  depo.pal = palDuzelt(depo.pal);
  depo.tema = depo.siteTema || oku('paletSecili', null) || (PROFIL.gozTemasi ? 'Göz 3' : 'Orijinal');
  const durum = {
    secim: oku(SK('secim'), []),
    bolge: oku(SK('bolge'), 'sayfa'),
    coklu: false,
    acilir: null,
    bilgiAcik: false,
  };

  const gecikmeli = {};
  function sonraYaz(k, f, ms) { clearTimeout(gecikmeli[k]); gecikmeli[k] = setTimeout(f, ms || 300); }
  const kulKaydet = () => sonraYaz('kul', () => yaz(SK('kullanici'), depo.kul));
  const palKaydet = () => sonraYaz('pal', () => yaz('paletler', depo.pal));
  const panelKaydet = () => sonraYaz('panel', () => { yaz('panelTema', depo.panelTema); yaz('panelOzel', depo.panelOzel); yaz('panelTemalar', depo.panelTemalar); yaz('panelSilinen', depo.panelSilinen); });
  const secimKaydet = () => { yaz(SK('secim'), durum.secim); yaz(SK('bolge'), durum.bolge); };
  // Başka sekmede (sohbet, /code) yapılan değişiklik bu sekmeye yenilemeden gelir (2.2.2)
  if (typeof GM_addValueChangeListener === 'function') {
    const uzaktan = f => (k, eski, yeni, uzak) => { if (uzak && yeni !== undefined) f(yeni); };
    const yenile = () => { uygula(true); fontlariHazirla(); hepsiniCiz(); };
    GM_addValueChangeListener(SK('kullanici'), uzaktan(v => { depo.kul = kulDuzelt(v); yenile(); }));
    GM_addValueChangeListener('paletler', uzaktan(v => { depo.pal = palDuzelt(v); yenile(); }));
    GM_addValueChangeListener('paletSecili', uzaktan(v => { if (!depo.siteTema) { depo.tema = v; yenile(); } }));
    GM_addValueChangeListener(SK('kapali'), uzaktan(v => { depo.kapali = !!v; yenile(); dugmeBoya(); }));
    GM_addValueChangeListener(SK('siteTema'), uzaktan(v => { depo.siteTema = v; depo.tema = v || oku('paletSecili', depo.tema); yenile(); }));
  }

  /* ================================================================
     TEMA HESABI: hazır + betikteki (KALICI) + cihazdaki (kul)
     ================================================================ */
  function temaAdlari() {
    const ad = [];
    if (PROFIL.gozTemasi) {
      for (const a of Object.keys(HAZIR_TEMALAR).concat(Object.keys(KS.temalar || {}))) {
        if (!ad.includes(a) && !depo.pal.silinen.includes(a)) ad.push(a);
      }
    }
    for (const a of Object.keys(depo.pal.temalar)) if (!ad.includes(a) && a !== 'Orijinal' && !depo.pal.silinen.includes(a)) ad.push(a);
    ad.push('Orijinal');
    return ad;
  }
  const hazirMi = ad => ad === 'Orijinal' || !!HAZIR_TEMALAR[ad] || !!(KS.temalar || {})[ad];

  function tema(ad) {
    if (!temaAdlari().includes(ad)) ad = 'Orijinal';
    const h = ad === 'Orijinal' ? { temel: 'orijinal' } : (HAZIR_TEMALAR[ad] || {});
    const k = (KS.temalar || {})[ad] || {}, u = depo.kul.temalar[ad] || {}, ts = depo.kul.taslaklar[ad] || {};
    const pk = depo.pal.temalar[ad] || {}, pt = depo.pal.taslaklar[ad] || {};
    let temel = ad === 'Orijinal' ? 'orijinal' : (pt.temel || pk.temel || k.temel || h.temel || 'goz');
    if (!PROFIL.gozTemasi) temel = 'orijinal';
    const taban = Object.assign({}, VARSAYILAN_DEGER, h.degerler || {}, k.degerler || {});
    const degerler = Object.assign({}, taban, pk.degerler || {});
    for (const [p, v] of Object.entries(pt.degerler || {})) {
      if (v !== null) degerler[p] = v; else if (p in taban) degerler[p] = taban[p]; else delete degerler[p];
    }
    const nesneTaban = {}, nesneler = {};
    for (const kaynak of [h.nesneler || {}, k.nesneler || {}]) {
      for (const [id, o] of Object.entries(kaynak)) nesneTaban[id] = Object.assign({}, nesneTaban[id], o);
    }
    for (const kaynak of [nesneTaban, u.nesneler || {}]) {
      for (const [id, o] of Object.entries(kaynak)) nesneler[id] = Object.assign({}, nesneler[id], o);
    }
    for (const [id, o] of Object.entries(ts.nesneler || {})) {
      const n = nesneler[id] = Object.assign({}, nesneler[id]);
      for (const [p, v] of Object.entries(o)) {
        if (v !== null) n[p] = v; else if ((nesneTaban[id] || {})[p] !== undefined) n[p] = nesneTaban[id][p]; else delete n[p];
      }
    }
    for (const o of Object.values(nesneler)) for (const [p, v] of Object.entries(o)) if (v === null || v === '') delete o[p];
    return { ad, temel, degerler, nesneler };
  }
  const aktif = () => tema(depo.tema);

  // Taslak iki yerde: renk değerleri ortak palette, nesne ayarı bu sitede (2.4.0)
  function taslak(ad) {
    const t = depo.kul.taslaklar[ad] || (depo.kul.taslaklar[ad] = {});
    t.nesneler = t.nesneler || {};
    return t;
  }
  function palTaslak(ad) {
    const t = depo.pal.taslaklar[ad] || (depo.pal.taslaklar[ad] = {});
    t.degerler = t.degerler || {};
    return t;
  }
  // Kaydedilmemiş değişiklik sayısı (2.2.0)
  function taslakSayisi(ad) {
    const t = depo.kul.taslaklar[ad] || {}, pt = depo.pal.taslaklar[ad] || {};
    return Object.keys(pt.degerler || {}).length + (pt.temel ? 1 : 0) + Object.values(t.nesneler || {}).reduce((x, o) => x + Object.keys(o).length, 0);
  }
  function taslakTemizle(ad) {
    const t = depo.kul.taslaklar[ad], pt = depo.pal.taslaklar[ad];
    if (t && !Object.keys(t.nesneler || {}).length) delete depo.kul.taslaklar[ad];
    if (pt && !Object.keys(pt.degerler || {}).length && !pt.temel) delete depo.pal.taslaklar[ad];
  }
  function kulTema(ad) {
    const u = depo.kul.temalar[ad] || (depo.kul.temalar[ad] = {});
    u.nesneler = u.nesneler || {};
    return u;
  }
  function palTema(ad) {
    const p = depo.pal.temalar[ad] || (depo.pal.temalar[ad] = {});
    p.degerler = p.degerler || {};
    return p;
  }
  // Betiğe işlenmemiş (yalnız bu cihazdaki) değişiklik sayısı (0013)
  // Betikteki değerle aynı olan cihaz kaydı sayılmaz (Göz 3 betiğe gömülünce 2.6.0)
  function islenmemis(ad) {
    const u = depo.kul.temalar[ad] || {}, pk = depo.pal.temalar[ad];
    const h = HAZIR_TEMALAR[ad] || {}, k = (KS.temalar || {})[ad] || {};
    const tabanD = Object.assign({}, VARSAYILAN_DEGER, h.degerler || {}, k.degerler || {});
    const tabanN = id => Object.assign({}, (h.nesneler || {})[id], (k.nesneler || {})[id]);
    const d = Object.entries((pk || {}).degerler || {}).filter(([x, v]) => tabanD[x] !== v).length;
    const n = Object.entries(u.nesneler || {}).reduce((t, [id, o]) => t + Object.entries(o).filter(([x, v]) => tabanN(id)[x] !== v).length, 0);
    return d + n + (hazirMi(ad) || !pk ? 0 : 1);
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
    if (n.tur === 'panel') return oz === 'zemin';
    if (aktif().temel !== 'goz') return false;          // tema rengi Orijinal'de yok
    if (n.tur === 'degisken') return oz === 'zemin';
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
    const pk = depo.pal.temalar[depo.tema] || {}, pt = depo.pal.taslaklar[depo.tema] || {};
    if (n.tur === 'degisken' || n.tur === 'font') {
      const d = (pt.degerler || {})[n.degisken];
      return d !== undefined ? d !== null : (pk.degerler || {})[n.degisken] !== undefined;
    }
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
    // Değişiklik taslağa gider; kayıtlı tema Kaydet'e kadar değişmez (2.2.0)
    const u = depo.kul.temalar[depo.tema] || {};
    if (n.tur === 'degisken' || n.tur === 'font') {
      const pt = palTaslak(depo.tema);
      const kayitli = ((depo.pal.temalar[depo.tema] || {}).degerler || {})[n.degisken] !== undefined;
      if (bos) { if (kayitli) pt.degerler[n.degisken] = null; else delete pt.degerler[n.degisken]; }
      else pt.degerler[n.degisken] = n.tur === 'font' ? aileYigini(v) : v;
    } else {
      const ts = taslak(depo.tema);
      const o = ts.nesneler[n.id] || (ts.nesneler[n.id] = {});
      const kayitli = ((u.nesneler || {})[n.id] || {})[oz] !== undefined;
      if (bos) { if (kayitli) o[oz] = null; else delete o[oz]; } else o[oz] = v;
      if (!Object.keys(o).length) delete ts.nesneler[n.id];
    }
    taslakTemizle(depo.tema);
    if (oz === 'aile' && !bos) fontHazirla(v);
    kulKaydet(); palKaydet(); uygula(); taslakCiz();
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
    if (depo.kapali) return css;
    if (t.temel === 'goz' && PROFIL.gozTemasi) {
      const kok = Object.entries(t.degerler).map(([ad, deger]) => `  ${ad}: ${deger};`).join('\n');
      // Otomatik haritalı sitede genel kurallar; sayfa denetimleri zemin açıklığına göre koyu/açık çizilir
      const sema = PROFIL.otoHarita ? `  color-scheme: ${renkIsigi(t.degerler['--zemin-ana']) < 0.4 ? 'dark' : 'light'} !important;\n` : '';
      css += `:root {\n${kok}\n${sema}}\n${PROFIL.otoHarita ? GENEL_KURALLAR : KURALLAR}\n`;
    }
    for (const n of tumNesneler()) {
      if (n.tur !== 'oge' || !n.secici) continue;
      const o = t.nesneler[n.id];
      if (!o) continue;
      const d = bildirimler(o);
      // Üç :root öneki nesne ayarını temanın ve otomatik haritanın işaret kurallarından
      // (:root [data-st-y], 0,2,0) güçlü kılar; Google'da Yazı rengi ezilmiyordu (2.6.0)
      if (d.length) css += `:root:root:root :is(${n.secici}) { ${d.join('; ')}; }\n`;
      const a = bildirimler(o, true);
      if (a.length) css += `:root:root:root :is(${n.secici}) :not(h1, h2, h3, h4, svg, svg *) { ${a.join('; ')}; }\n`;
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
    if (hemen) { cssYaz(cssUret()); haritaDurt(); return; }
    if (uygulaBekliyor) return;
    uygulaBekliyor = true;
    requestAnimationFrame(() => { uygulaBekliyor = false; cssYaz(cssUret()); haritaDurt(); });
  }
  // Tema Orijinal'den göze dönünce ölçülmemiş öğeler ölçülür
  let harita = null, haritaEtkindi = false;
  const haritaEtkin = () => !depo.kapali && aktif().temel === 'goz';
  function haritaDurt() {
    if (!harita) return;
    const e = haritaEtkin();
    if (e && !haritaEtkindi) harita.hepsi();
    haritaEtkindi = e;
  }
  function renkIsigi(h) {
    const m = /^#?([0-9a-f]{6})/i.exec(String(h || ''));
    if (!m) return 0;
    const k = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const n = parseInt(m[1], 16);
    return 0.2126 * k(n >> 16) + 0.7152 * k((n >> 8) & 255) + 0.0722 * k(n & 255);
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

  if (PROFIL.otoHarita) {
    harita = otoHaritaKur({
      atla: e => e.tagName === 'ST-KOK',
      stilKapat: b => { if (stil.sayfa) stil.sayfa.disabled = b; else if (stil.el && stil.el.sheet) stil.el.sheet.disabled = b; },
      etkin: haritaEtkin,
    });
    haritaEtkindi = haritaEtkin();
    kokHazir(() => harita.baslat());
  }

  /* ================================================================
     GEÇMİŞ — son 50 adım, sayfa yenilense de kalır (0016)
     ================================================================ */
  const gecmis = (() => { const g = oku(SK('gecmis'), null); return g && Array.isArray(g.liste) ? g : { liste: [], konum: -1 }; })();
  const durumMetni = () => JSON.stringify({ kul: depo.kul, pal: depo.pal, tema: depo.tema, siteTema: depo.siteTema, panelTema: depo.panelTema, panelOzel: depo.panelOzel,
    panelTemalar: depo.panelTemalar, panelSilinen: depo.panelSilinen });
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
    depo.panelTemalar = d.panelTemalar || {}; depo.panelSilinen = d.panelSilinen || [];
    if (d.pal) depo.pal = palDuzelt(d.pal);
    depo.siteTema = d.siteTema || null;
    gecmis.konum = i;
    yaz(SK('kullanici'), depo.kul); yaz('paletler', depo.pal); yaz(SK('siteTema'), depo.siteTema); if (!depo.siteTema) yaz('paletSecili', depo.tema); yaz('panelTema', depo.panelTema); yaz('panelOzel', depo.panelOzel);
    yaz('panelTemalar', depo.panelTemalar); yaz('panelSilinen', depo.panelSilinen);
    yaz(SK('gecmis'), gecmis);
    uygula(true); panelRenkUygula(); hepsiniCiz();
  }
  // "Geçmişi Temizle": adımlar silinir, şimdiki durum tek adım olarak kalır (2.6.0)
  function gecmisTemizle() {
    if (!confirm(`${SITE} geçmişindeki ${gecmis.liste.length} adım silinsin mi? Ayarlar değişmez; yalnız geri alma listesi boşalır.`)) return;
    gecmis.liste = [{ etiket: 'Geçmiş temizlendi', s: durumMetni(), z: Date.now() }];
    gecmis.konum = 0;
    yaz(SK('gecmis'), gecmis);
    if (kok) { cubukBoya(); if (durum.acilir === 'gecmis') gecmisCiz(); }
    bildir('Geçmiş temizlendi');
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
    const ek = depo.pal.fontlar.concat((KS.fontlar || []).filter(f => !depo.pal.fontlar.some(k => k.ad === f.ad)));
    return ek.map(f => Object.assign({ tur: 'sans', astigmat: false }, f)).concat(FONTLAR_GOOGLE, FONTLAR_SISTEM);
  }

  /* ================================================================
     PANEL (Shadow DOM: sayfanın kuralları panele sızmaz)
     Düzen (0016): üst çubuk → seçim kutusu → ayar alanı → bölge + nesne listesi
     ================================================================ */
  // Panelin bütün görünümü panel.css'te; derle.py buraya gömer (tasarım dosyası, 2.6.0)
  const PANEL_CSS = String.raw`
/*@PANEL_CSS@*/
`;

  let kok, kap, panelEl, acilirEl, taslakEl, secimEl, ayarEl, bolgeLb, nesneLb, isaretKat, temaSec, geriB, ileriB, gecmisB, menuB, cokluB, dosyaGirdi;

  function el(etiket, sinif, metin) {
    const e = document.createElement(etiket);
    if (sinif) e.className = sinif;
    if (metin !== undefined) e.textContent = metin;
    return e;
  }
  // Paneldeki tuş işleyicisi: pencerenin yakalama aşamasında sayfadan önce çalışır (2.4.0)
  function tus(elm, tur, fn) { (elm.__stTus || (elm.__stTus = {}))[tur] = fn; }
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

    // Tek tık paneli açar / kapatır; çift tık bu sitede temayı açar / kapatır (2.6.0)
    let tikSaat = 0, sonTik = 0;
    const dugme = dug('◐', '', () => {
      if (dugmeSuruklendi) { dugmeSuruklendi = false; return; }
      const simdi = Date.now();
      if (simdi - sonTik < 300) { clearTimeout(tikSaat); sonTik = 0; temaAcKapa(); return; }
      sonTik = simdi;
      tikSaat = setTimeout(() => paneliAc(!depo.acik), 300);
    }, 'dugme');
    dugmeK = dugme; dugmeSurukleKur(dugme); dugmeBoya();

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
    // Kaydedilmemiş değişiklik satırı (2.2.0)
    taslakEl = el('div', 'taslak');

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
    // Listeye tıklayınca ↑ ↓ ile önceki / sonraki bölge ya da nesne seçilir (2.3.0)
    for (const [lb, isaretli] of [[bolgeLb, '.o.a'], [nesneLb, '.o.ana, .o.s']]) {
      lb.tabIndex = 0;
      tus(lb, 'keydown', e => {
        const y = { ArrowDown: 1, ArrowUp: -1 }[e.key];
        if (!y) return;
        e.preventDefault(); e.stopPropagation();
        const ogeler = [...lb.querySelectorAll('.o')];
        const i = ogeler.indexOf(lb.querySelector(isaretli));
        const yeni = ogeler[sinirla(i < 0 ? 0 : i + y, 0, ogeler.length - 1)];
        if (yeni) { yeni.click(); (lb.querySelector(isaretli) || yeni).scrollIntoView({ block: 'nearest' }); }
      });
    }
    lk2.append(b2, nesneLb);
    listeler.append(lk1, lk2);

    dosyaGirdi = el('input'); dosyaGirdi.type = 'file'; dosyaGirdi.accept = '.json,application/json'; dosyaGirdi.style.display = 'none';
    dosyaGirdi.addEventListener('change', () => {
      const f = dosyaGirdi.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = () => dosyadanYukle(String(r.result)); r.readAsText(f);
      dosyaGirdi.value = '';
    });

    panelEl.append(tutamak, cubuk, taslakEl, acilirEl, ayarEl, listeler, secimEl, dosyaGirdi);
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
      return new Option(a + (taslakSayisi(a) ? ' ●' : ''), a, false, a === depo.tema);
    }));
    taslakCiz();
    temaSec.title = 'Sayfa teması' + (islenmemis(depo.tema) ? ` · ${islenmemis(depo.tema)} değişiklik yalnız bu cihazda (betiğe işlenmemiş)` : '');
    geriB.disabled = gecmis.konum <= 0;
    ileriB.disabled = gecmis.konum >= gecmis.liste.length - 1;
    gecmisB.classList.toggle('acik', durum.acilir === 'gecmis');
    menuB.classList.toggle('acik', durum.acilir === 'menu');
  }
  function temaDegistir(ad) {
    if (!temaAdlari().includes(ad)) return;
    depo.tema = ad;
    if (depo.siteTema) { depo.siteTema = ad; yaz(SK('siteTema'), ad); } else yaz('paletSecili', ad);
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

  /* ---------------- ayar alanı (2.6.0): Yazı, Zemin, Çerçeve bölümleri ---------------- */
  function ayarCiz() {
    if (!ayarEl) return;
    const kaydirma = ayarEl.scrollTop;
    // Yeniden çizimde klavye odağı aynı denetimde kalır (ok tuşlarıyla art arda ayar, 2.3.0)
    const odak = kok && kok.activeElement && kok.activeElement.dataset ? kok.activeElement.dataset.odak : null;
    const sec = seciliNesneler();
    ayarEl.replaceChildren();
    if (depo.kapali) {
      const u = el('div', 'kapali-not', `Tema ${SITE} için kapalı; ayarlar kaydedilir ama sayfada görünmez. `);
      u.append(dug('Temayı aç', '◐ düğmesine çift tık da açar', () => temaAcKapa(true)));
      ayarEl.append(u);
    }
    if (!sec.length) {
      ayarEl.append(el('div', 'bos', 'Nesne seçilmedi. Alttaki listeden bir nesne seç (Ctrl+tık ile birden çok) ya da sayfada bir yere Ctrl+sağ tıkla.'));
      return;
    }
    // Sayfa öğesi: Yazı, Zemin, Çerçeve bölümleri; tema ve panel rengi: tek RENK bölümü;
    // yazı tipi değişkeni: YAZI TİPİ bölümü. Nesnede olmayan bölüm çizilmez (2.6.0)
    const ogeler = sec.filter(n => n.tur === 'oge');
    const renkler = sec.filter(n => n.tur !== 'oge' && n.tur !== 'font' && destekOz(n, 'zemin'));
    const aileler = sec.filter(n => n.tur === 'font' && destekOz(n, 'aile'));
    if (ogeler.length) {
      for (const [b, baslik] of BOLUMLER) {
        const ozler = Object.keys(OZ).filter(k => OZ[k].grup === b && OZ[k].tur !== 'renk');
        renkBolumu(baslik, b, ogeler, ozler);
      }
    }
    if (renkler.length) renkBolumu(ogeler.length ? 'TEMA RENGİ' : 'RENK', 'zemin', renkler, []);
    if (aileler.length) grupEl('YAZI TİPİ', true).icerik.append(satirEl('aile', aileler));
    if (!ogeler.length && !renkler.length && !aileler.length) grupEl('RENK', false);
    ayarEl.scrollTop = kaydirma;
    if (odak) { const e = ayarEl.querySelector(`[data-odak="${CSS.escape(odak)}"]`); if (e) e.focus({ preventScroll: true }); }
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

  // Bölüm: başlık, kendi renk seçicisi (Son / Tema örnekleriyle), altında bölümün ayarları (2.6.0)
  function renkBolumu(baslik, oz, ilgili, ozler) {
    const ozAd = ilgili.some(n => n.tur === 'oge') ? OZ[oz].ad : 'Renk';
    const degerler = ilgili.map(n => renkDegeri(n, oz));
    const farkli = new Set(degerler).size > 1;
    const sag = el('span');
    if (farkli) sag.append(el('span', 'farkli', 'farklı'), document.createTextNode(' '));
    if (ilgili.some(n => kullaniciDegeriVar(n, oz))) sag.append(dug('↺ temadan', `Seçili nesnelerde ${ozAd.toLocaleLowerCase('tr')} rengini temadaki hâline döndür`, () => {
      for (const n of ilgili) ayarla(n, oz, null);
      anlik(`${ozAd} sıfırlandı: ${adlar(ilgili)}`);
      ayarCiz(); listeleriCiz();
    }));
    const kutu = grupEl(baslik, true, sag);
    kutu.g.dataset.renk = oz;
    const uygulaRenk = (hex, bitti) => {
      for (const n of ilgili) ayarla(n, oz, hex);
      if (bitti) { sonRenkEkle(hex); anlik(`${ozAd} ${hex}: ${adlar(ilgili)}`); ayarCiz(); listeleriCiz(); }
    };
    kutu.icerik.append(renkSecici(degerler[0] || '#000000', uygulaRenk, oz));
    const t = aktif();
    const temaRenkleri = [...new Set(DEGISKENLER.filter(d => /^#/.test(d.deger)).map(d => cssRenkHex(t.degerler[d.ad])).filter(Boolean))];
    for (const [etiket, renkler] of [['Son', depo.sonRenkler], ['Tema', t.temel === 'goz' ? temaRenkleri : []]]) {
      if (!renkler.length) continue;
      const s = el('div', 'ornek-sat'), o = el('div', 'ornekler');
      s.append(el('span', 'e', etiket), o);
      for (const r of renkler) {
        const b = dug('', r, () => uygulaRenk(r, true));
        b.style.background = r;
        o.append(b);
      }
      kutu.icerik.append(s);
    }
    for (const o of ozler) kutu.icerik.append(satirEl(o, ilgili));
  }
  function sonRenkEkle(hex) {
    depo.sonRenkler = [hex].concat(depo.sonRenkler.filter(r => r !== hex)).slice(0, 16);
    yaz('sonRenkler', depo.sonRenkler);
  }

  // Tek renk seçici: ton/doygunluk alanı, ton şeridi, kip (HSL/RGB/HSV), hex, damlalık
  function renkSecici(hex, degisti, onEk) {
    const od = x => (onEk ? onEk + ':' : '') + x;
    let [h, s, v] = rgbHsv(...(hexRgb(hex) || [0, 0, 0]));
    const kap2 = el('div', 'renk-alan');
    const sv = el('div', 'sv'), svI = el('div', 'imlec'); sv.append(svI);
    const ton = el('div', 'ton'), tonI = el('div', 'imlec'); ton.append(tonI);
    // Noktanın iki ekseni ayrı kaydırıcı: yatay doygunluk, dikey parlaklık (2.3.0)
    const parlak = el('input', 'parlak'); Object.assign(parlak, { type: 'range', min: 0, max: 100, step: 1, title: 'Parlaklık (↑ ↓)' });
    const doygun = el('input'); Object.assign(doygun, { type: 'range', min: 0, max: 100, step: 1, title: 'Doygunluk (← →)' });
    const svSatir = el('div', 'sv-satir'); svSatir.append(sv, parlak);
    const dySatir = el('div', 'dy-satir'); dySatir.append(el('span', '', 'Doygunluk'), doygun);
    sv.dataset.odak = od('sv'); ton.dataset.odak = od('ton'); parlak.dataset.odak = od('parlak'); doygun.dataset.odak = od('doygun');
    sv.tabIndex = 0; sv.title = 'Ok tuşları: ← → doygunluk, ↑ ↓ parlaklık (Shift ile 10)';
    ton.tabIndex = 0; ton.title = 'Ton: ← → (Shift ile 10)';
    const sat = el('div', 'renk-sat');
    const kip = el('select');
    for (const k of ['HSL', 'RGB', 'HSV']) kip.append(new Option(k, k, false, k === depo.renkKip));
    const k = [0, 1, 2].map(() => { const i = el('input'); i.type = 'number'; return i; });
    const hexI = el('input', 'hex'); hexI.type = 'text'; hexI.spellcheck = false;
    sat.append(kip, ...k, hexI);
    hexI.dataset.odak = od('hex'); k.forEach((i, j) => { i.dataset.odak = od('k' + j); });
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
      parlak.value = Math.round(v * 100); doygun.value = Math.round(s * 100);
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
    for (const [kay, fn] of [[parlak, x => { v = x; }], [doygun, x => { s = x; }]]) {
      kay.addEventListener('input', () => { fn(+kay.value / 100); boya(); degisti(suAnki(), false); });
      kay.addEventListener('change', () => degisti(suAnki(), true));
    }
    // Ok tuşları canlı uygular; tuş bırakılınca geçmişe tek adım yazılır
    const okTusu = (alan, fn) => {
      tus(alan, 'keydown', e => {
        const y = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
        if (!y) return;
        e.preventDefault(); e.stopPropagation();
        fn(y[0] * (e.shiftKey ? 10 : 1), y[1] * (e.shiftKey ? 10 : 1));
        boya(); degisti(suAnki(), false);
      });
      tus(alan, 'keyup', e => { if (/^Arrow/.test(e.key)) degisti(suAnki(), true); });
    };
    okTusu(sv, (dx, dy) => { s = sinirla(s + dx / 100, 0, 1); v = sinirla(v + dy / 100, 0, 1); });
    okTusu(ton, (dx, dy) => { h = ((h + dx + dy) % 360 + 360) % 360; });
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
    // Kutulardaki ok tuşu da canlı uygular (2.3.0)
    for (const i of k) i.addEventListener('input', () => i.dispatchEvent(new Event('change')));
    hexI.addEventListener('input', () => { if (hexRgb(hexI.value)) ayarlaHex(hexI.value, false); });
    hexI.addEventListener('change', () => { if (hexRgb(hexI.value)) ayarlaHex(hexI.value, true); else hexI.value = suAnki(); });
    kap2.append(svSatir, dySatir, ton, sat);
    boya();
    return kap2;
  }

  // Bölümdeki ayar satırı: seçili nesnelerin hepsine yazar (0020)
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
      // Ok tuşu canlı uygular, Shift ile 10 adım (2.3.0)
      const onAdim = (alanEl, e) => {
        if (!e.shiftKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
        e.preventDefault();
        const yon = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : -1;
        const taban = alanEl.value === '' ? +kaydirici.value : +alanEl.value;
        const x = Math.round(sinirla(taban + yon * 10 * oz.adim, oz.min, oz.max) * 1000) / 1000;
        alanEl.value = x; kaydirici.value = x; sayi.value = x; yazHepsi(x, false);
      };
      tus(sayi, 'keydown', e => onAdim(sayi, e));
      tus(kaydirici, 'keydown', e => onAdim(kaydirici, e));
      sayi.addEventListener('input', () => { if (sayi.value !== '') { kaydirici.value = sinirla(+sayi.value, oz.min, oz.max); yazHepsi(+kaydirici.value, false); } });
      for (const a of [sayi, kaydirici]) tus(a, 'keyup', e => { if (/^Arrow/.test(e.key)) yazHepsi(+kaydirici.value, true); });
      sayi.addEventListener('change', () => {
        if (sayi.value === '') { yazHepsi(null, true); return; }
        const x = sinirla(+sayi.value, oz.min, oz.max);
        kaydirici.value = x; yazHepsi(x, true);
      });
      kaydirici.dataset.odak = ozId + ':k'; sayi.dataset.odak = ozId + ':s';
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
      // Listeden seçimde ayar alanı yeniden çizilir; odak yeni yazı tipi düğmesine döner (2.4.1)
      let gezilen = v || null;
      const listedenSec = ad => {
        yazHepsi(ad, true);
        const yeni = ayarEl.querySelector(`[data-odak="${CSS.escape(ozId + ':f')}"]`);
        if (yeni) yeni.focus({ preventScroll: true });
      };
      const b = dug(v || '— temadan —', 'Yazı tipi seç · ↑ ↓ sıradaki yazı tipi (liste açılmadan), PageUp/PageDown 10, Home/End', () => fontAc(gezilen, listedenSec), 'font-dugme');
      if (v) b.style.fontFamily = aileYigini(v);
      b.dataset.odak = ozId + ':f';
      // Liste kapalıyken ok tuşlarıyla yazı tiplerinde gezinme; tuş bırakılınca geçmişe tek adım (2.3.0)
      tus(b, 'keydown', e => {
        const adim = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10, Home: -1e6, End: 1e6 }[e.key];
        if (!adim) return;
        e.preventDefault(); e.stopPropagation();
        const liste = [null].concat(suzulmusFontlar().map(f => f.ad));
        const i = Math.max(0, liste.indexOf(gezilen));
        gezilen = liste[sinirla(i + adim, 0, liste.length - 1)];
        b.textContent = gezilen || '— temadan —';
        b.style.fontFamily = gezilen ? aileYigini(gezilen) : '';
        yazHepsi(gezilen, false);
        // Liste açıksa işaret gezilen yazı tipine yürür (2.4.1)
        fontIsaretle(gezilen);
      });
      tus(b, 'keyup', e => {
        if (!/^(Arrow|Page|Home|End)/.test(e.key)) return;
        sonraYaz('fontGez', () => anlik(`${oz.ad}: ${gezilen || 'temadan'}: ${adlar(ilgili)}`), 600);
      });
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
    const sira = el('div', 'sira');
    sira.append(dug('Geçmişi temizle', `${SITE} geçmişindeki bütün adımları sil; şimdiki durum ilk adım olur`, gecmisTemizle));
    ogeler.push(sira);
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
    bas('SAYFA TEMASI · ' + depo.tema + (depo.siteTema ? ' · yalnız bu site' : ' · bütün siteler'));
    oge('Yeni tema (bu temanın kopyası)…', temaKopyala);
    if (!depo.siteTema) oge(`Yalnız ${SITE} için başka tema seç`, () => { depo.siteTema = depo.tema; yaz(SK('siteTema'), depo.tema); menuCiz(); hepsiniCiz(); bildir(`Bundan sonra açılır listedeki seçim yalnız ${SITE} için`); });
    else oge(`${SITE} ortak temayı izlesin (şimdi: ${depo.tema})`, () => { depo.siteTema = null; yaz(SK('siteTema'), null); temaDegistir(oku('paletSecili', depo.tema)); menuCiz(); });
    if (!hazirMi(depo.tema)) oge('Temanın adını değiştir…', temaAdDegistir);
    const n = islenmemis(depo.tema);
    if ((n || taslakSayisi(depo.tema)) && hazirMi(depo.tema)) oge('Fabrika ayarına dön', temaSifirla);
    if (depo.tema !== 'Orijinal') oge('Temayı listeden kaldır', temaSil);
    if (depo.pal.silinen.length) oge('Kaldırılan hazır temaları geri getir', () => { depo.pal.silinen = []; palKaydet(); hepsiniCiz(); anlik('Hazır temalar geri geldi'); });
    oge(`${SITE} için tema: ${depo.kapali ? 'kapalı → aç' : 'açık → kapat'}`, () => { temaAcKapa(); menuCiz(); }, '', '◐ düğmesine çift tık da açar / kapatır; son durum bu sitede saklanır');
    if (harita) oge('Otomatik haritayı yeniden ölç (sayfanın kendi teması değiştiyse)', () => { harita.yenile(); setTimeout(menuCiz, 900); bildir('Harita yeniden ölçülüyor'); });
    bas('PANEL TEMASI · ' + depo.panelTema);
    for (const ad of panelTemaAdlari()) {
      const b = oge(ad + ((depo.panelOzel[ad] && Object.keys(depo.panelOzel[ad]).length) ? ' •' : ''), () => panelTemaSec(ad), ad === depo.panelTema ? 'secili' : '');
      const sw = el('span', 'ornek'); sw.style.background = Object.assign(panelTemaDegerleri(ad), depo.panelOzel[ad] || {})['--p-zemin']; b.prepend(sw);
    }
    oge('Yeni panel teması (bu temanın kopyası)…', panelTemaKopyala);
    if (!PANEL_TEMALARI[depo.panelTema]) oge('Panel temasının adını değiştir…', panelTemaAdDegistir);
    if (PANEL_TEMALARI[depo.panelTema] && depo.panelOzel[depo.panelTema] && Object.keys(depo.panelOzel[depo.panelTema]).length) oge('Panel temasını fabrika ayarına döndür', panelTemaSifirla);
    if (panelTemaAdlari().length > 1) oge('Panel temasını listeden kaldır', panelTemaSil);
    if (depo.panelSilinen.length) oge('Kaldırılan hazır panel temalarını geri getir', () => { depo.panelSilinen = []; panelKaydet(); anlik('Hazır panel temaları geri geldi'); menuCiz(); });
    bas('TARAMA (0021)');
    const tr = taramaOku();
    oge(`Sayfayı tara (şimdi: ${Object.keys(tr.ogeler).length} öğe, ${tr.sayfalar.length} sayfa)`, () => { tara(); menuCiz(); });
    if (tr.sayfalar.length) {
      oge('Tarama dosyasını kaydet', taramaKaydet);
      oge('Taramayı panoya kopyala', () => { panoya(JSON.stringify(taramaPaketi(), null, 1)); bildir('Tarama panoya kopyalandı'); });
      oge('Taramayı temizle', () => { yaz(SK('tarama'), null); menuCiz(); bildir('Tarama temizlendi'); });
    }
    bas('AYAR DOSYASI');
    oge('Tümünü dosyaya kaydet (bütün siteler, temalar, panel)', dosyayaKaydet);
    oge('Dosyadan yükle (yedek, eski site ayarı ya da Claude Tema dosyası)', () => dosyaGirdi.click());
    oge('Tümünü panoya kopyala', () => { panoya(JSON.stringify(yedekAl(), null, 1)); bildir('Bütün ayarlar panoya kopyalandı'); });
    bas('PANEL');
    const boy = el('div', 'sira');
    boy.append(el('span', '', 'Yazı boyu'));
    for (const p of [9, 10, 11, 12, 13, 14, 15]) boy.append(dug(p + '', '', () => { depo.panelYazi = p; yaz('panelYazi', p); panelRenkUygula(); menuCiz(); }, p === depo.panelYazi ? 'anahtar s' : 'anahtar'));
    o.push(boy);
    oge(`Ctrl+sağ tık ile seçme: ${depo.sagTik ? 'açık' : 'kapalı'}`, () => { depo.sagTik = !depo.sagTik; yaz('sagTik', depo.sagTik); menuCiz(); });
    oge(`Seçili nesneyi sayfada işaretle: ${depo.isaret ? 'açık' : 'kapalı'}`, () => { depo.isaret = !depo.isaret; yaz('isaret', depo.isaret); isaretCiz(); menuCiz(); });
    if (PROFIL.ad === 'claude.ai') oge(`Model penceresi (tek pencere, Uygula ile): ${depo.modelPencere ? 'açık' : 'kapalı'}`, () => { modelPencereAyarla(!depo.modelPencere); menuCiz(); });
    // "Bilgi Kartı": sürekli gerekmeyen bilgiler varsayılan kapalı çekmecede (2.6.0)
    o.push(dug(`${durum.bilgiAcik ? '▾' : '▸'} Bilgi Kartı`, 'Sürüm, otomatik harita, tarama, tanı ve kısayollar', () => {
      durum.bilgiAcik = !durum.bilgiAcik; menuCiz();
      if (durum.bilgiAcik) acilirEl.scrollTop = acilirEl.scrollHeight;
    }, 'oge bk-bas'));
    if (durum.bilgiAcik) {
      const kart = el('div', 'bilgi-kart');
      const sat = (e, m) => { const x = el('div', 'bk-sat'); x.append(el('span', 'bk-e', e), el('span', 'bk-d', m)); kart.append(x); };
      sat('Sürüm', `${SURUM} · site ${SITE} · profil ${PROFIL.ad}`);
      sat('Tema', `${depo.tema} · bu sitede ${depo.kapali ? 'kapalı' : 'açık'}${islenmemis(depo.tema) ? ` · ${islenmemis(depo.tema)} değişiklik yalnız bu cihazda` : ''}`);
      if (harita) {
        const oz = harita.ozet();
        sat('Oto harita', `${Object.entries(oz.roller).map(([k, v]) => k + ' ' + v).join(' · ') || 'işaret yok'} · ${oz.tur} tur, ${oz.oge} öğe, son tur ${oz.sonSure} ms (0026)`);
      }
      sat('Tarama', `${Object.keys(tr.ogeler).length} öğe, ${tr.sayfalar.length} sayfa`);
      sat('Stil yolu', stil.yol + (stil.hata ? ' (' + stil.hata + ')' : ''));
      sat('CSP ihlali', cspIhlal.length + (cspIhlal.length ? ' — ' + cspIhlal.slice(-3).map(x => x.yonerge).join(', ') : ''));
      sat('Geçmiş', `${gecmis.liste.length} adım`);
      sat('Panel', 'Panelin her rengi "Site Tema paneli" bölgesinde ayrıca ayarlanır.');
      for (const k of [`${KISAYOL}: panel · ◐ tık: panel · ◐ çift tık: bu sitede tema aç / kapat`,
        'Ctrl+Z / Ctrl+Shift+Z: geri / ileri · Ctrl+S: taslağı kaydet',
        'Yazı tipi düğmesi seçiliyken ↑ ↓: sıradaki yazı tipi (PageUp/PageDown 10) · sayı ve kaydırıcıda Shift+ok: 10 adım',
        'Renk kutusu seçiliyken ← →: doygunluk, ↑ ↓: parlaklık · ton çubuğunda ← →: ton · listede ↑ ↓: önceki / sonraki',
        'Ctrl+sağ tık: nesne seç · aynı yere tekrar: dıştaki · düz sağ tık: tarayıcının menüsü',
        'Telefonda: uzun basma = seç · Çoklu düğmesi = birden çok seçim']) sat('Kısayol', k);
      o.push(kart);
    }
    acilirEl.replaceChildren(...o);
  }

  let fontSuzgecMetni = '';
  // Yazı tipi listesi ve ok tuşuyla gezinme aynı süzgeci kullanır
  function suzulmusFontlar() {
    const a = fontSuzgecMetni.toLocaleLowerCase('tr');
    const fav = new Set(depo.favFontlar);
    const l = tumFontlar().filter(f => (depo.fontSuzgec === 'hepsi' || (depo.fontSuzgec === 'fav' ? fav.has(f.ad) : depo.fontSuzgec === 'astigmat' ? f.astigmat : f.tur === depo.fontSuzgec))
      && (!a || f.ad.toLocaleLowerCase('tr').includes(a)) && (f.kaynak !== 'sistem' || sistemdeVar(f.ad)));
    // Favoriler listenin başında (2.6.0)
    return l.filter(f => fav.has(f.ad)).concat(l.filter(f => !fav.has(f.ad)));
  }
  // Açık yazı tipi listesinde ✓ işaretli satır; ok tuşuyla gezinince yürür ve görünür kalır (2.4.1)
  let fontIsaretAd = null;
  function fontIsaretle(ad) {
    fontIsaretAd = ad || null;
    if (durum.acilir !== 'font' || !acilirEl) return;
    let hedef = null;
    for (const o of acilirEl.querySelectorAll('.font-liste .oge')) {
      const bu = (o.dataset.ad || null) === fontIsaretAd;
      o.classList.toggle('secili', bu);
      if (bu) hedef = o;
    }
    if (!hedef) return;
    // scrollIntoView sayfayı da kaydırabilir; yalnız açılır kutu kaydırılır
    const k = acilirEl.getBoundingClientRect(), h = hedef.getBoundingClientRect();
    if (h.top < k.top) acilirEl.scrollTop -= k.top - h.top + 4;
    else if (h.bottom > k.bottom) acilirEl.scrollTop += h.bottom - k.bottom + 4;
  }
  function fontAc(secili, sec) {
    durum.acilir = 'font';
    fontIsaretAd = secili || null;
    acilirEl.classList.add('acik');
    cubukBoya();
    const ciz = () => {
      const o = [el('div', 'bas', 'YAZI TİPİ')];
      const ara = el('input'); ara.type = 'search'; ara.placeholder = 'Ara…'; ara.value = fontSuzgecMetni;
      ara.addEventListener('input', () => { fontSuzgecMetni = ara.value; listeCiz(); });
      const s1 = el('div', 'sira'); s1.append(ara); o.push(s1);
      const s2 = el('div', 'sira');
      for (const [k, a] of [['hepsi', 'Hepsi'], ['fav', '★ Favori'], ['astigmat', 'Astigmat'], ['sans', 'Sans'], ['serif', 'Serif'], ['mono', 'Eş aralıklı'], ['el', 'El yazısı']]) {
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
        if (!depo.pal.fontlar.some(k => k.ad === f.ad)) depo.pal.fontlar.push(Object.assign({ tur: 'sans', astigmat: false }, f));
        palKaydet();
        fontHazirla(f.ad).then(() => { sec(f.ad); acilirKapat(); });
      }));
      const dosya = el('input'); dosya.type = 'file'; dosya.accept = '.woff2,.woff,.ttf,.otf'; dosya.style.display = 'none';
      dosya.addEventListener('change', () => {
        const f = dosya.files[0]; if (!f) return;
        const ad = f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        f.arrayBuffer().then(buf => {
          depo.fontVeri[ad] = [{ style: 'normal', weight: '100 900', range: '', b64: bufB64(buf) }];
          yaz('fontVeri', depo.fontVeri);
          if (!depo.pal.fontlar.some(k => k.ad === ad)) depo.pal.fontlar.push({ ad, kaynak: 'yuklenen', tur: 'sans', astigmat: false });
          palKaydet();
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
        const fl = suzulmusFontlar();
        const ogeler = [dug('— temadan —', '', () => { acilirKapat(); sec(null); }, 'oge' + (!fontIsaretAd ? ' secili' : ''))];
        for (const f of fl.slice(0, 260)) {
          const b = dug('', f.ad, () => { acilirKapat(); sec(f.ad); }, 'oge' + (f.ad === fontIsaretAd ? ' secili' : ''));
          b.append(document.createTextNode(f.ad), el('small', '', (f.astigmat ? 'astigmat · ' : '') + (f.kaynak === 'sistem' ? 'cihazda' : f.kaynak)));
          // "Fav-font": ☆ favoriye ekler, ★ çıkarır; sıra liste yeniden açılınca değişir (2.6.0)
          const y = el('span', 'yildiz');
          const yBoya = () => { const d = depo.favFontlar.includes(f.ad); y.textContent = d ? '★' : '☆'; y.classList.toggle('dolu', d); y.title = d ? 'Favorilerden çıkar' : 'Favorilere ekle'; };
          y.addEventListener('click', e => {
            e.stopPropagation(); e.preventDefault();
            depo.favFontlar = depo.favFontlar.includes(f.ad) ? depo.favFontlar.filter(x => x !== f.ad) : depo.favFontlar.concat(f.ad);
            yaz('favFontlar', depo.favFontlar); yBoya();
          });
          yBoya(); b.append(y);
          b.style.fontFamily = `"stOn ${f.ad}", "${f.ad}", ${YEDEK_AILE[f.tur] || 'sans-serif'}`;
          b.dataset.ad = f.ad;
          if (gozcu) gozcu.observe(b);
          ogeler.push(b);
        }
        liste.replaceChildren(...ogeler);
      }
      listeCiz();
      fontIsaretle(fontIsaretAd);
    };
    ciz();
  }

  // "tema on-off": bu sitede tema anında açılır / kapanır, sayfa yenilenmez; son durum sitede kalır (2.6.0)
  function temaAcKapa(acik) {
    depo.kapali = acik === undefined ? !depo.kapali : !acik;
    yaz(SK('kapali'), depo.kapali);
    uygula(true); hepsiniCiz(); dugmeBoya();
    bildir(`${SITE}: tema ${depo.kapali ? 'kapalı (◐ çift tık: aç)' : 'açık'}`);
  }

  /* ---------------- panel teması işleri (2.6.0) ---------------- */
  function panelBenzersiz(ad) {
    let a = ad, i = 2;
    while (PANEL_TEMALARI[a] || depo.panelTemalar[a]) a = `${ad} ${i++}`;
    return a;
  }
  function panelTemaSec(ad) {
    depo.panelTema = ad; panelKaydet(); panelRenkUygula(); anlik('Panel teması: ' + ad);
    if (durum.acilir === 'menu') menuCiz();
    hepsiniCiz();
  }
  // Kopya o anki renkleri (hazır tema + değiştirilen renkler) taşır
  function panelTemaKopyala() {
    const ad = prompt('Yeni panel temasının adı:', panelBenzersiz(depo.panelTema + ' kopya'));
    if (!ad || !ad.trim()) return;
    const yeni = panelBenzersiz(ad.trim());
    depo.panelTemalar[yeni] = panelDegerleri();
    panelTemaSec(yeni);
  }
  function panelTemaAdDegistir() {
    const eski = depo.panelTema;
    if (PANEL_TEMALARI[eski]) return;
    const ad = prompt('Panel temasının yeni adı:', eski);
    if (!ad || !ad.trim() || ad.trim() === eski) return;
    const yeni = panelBenzersiz(ad.trim());
    depo.panelTemalar[yeni] = depo.panelTemalar[eski]; delete depo.panelTemalar[eski];
    if (depo.panelOzel[eski]) { depo.panelOzel[yeni] = depo.panelOzel[eski]; delete depo.panelOzel[eski]; }
    panelTemaSec(yeni);
  }
  function panelTemaSifirla() {
    if (!confirm(`Panel teması "${depo.panelTema}" ilk hâline dönsün mü? (Geçmişten geri alınabilir.)`)) return;
    delete depo.panelOzel[depo.panelTema];
    panelTemaSec(depo.panelTema);
  }
  function panelTemaSil() {
    const ad = depo.panelTema;
    if (panelTemaAdlari().length <= 1) return;
    if (!confirm(`Panel teması "${ad}" listeden kaldırılsın mı? (Geçmişten geri alınabilir.)`)) return;
    if (PANEL_TEMALARI[ad]) { if (!depo.panelSilinen.includes(ad)) depo.panelSilinen.push(ad); } else delete depo.panelTemalar[ad];
    delete depo.panelOzel[ad];
    panelTemaSec(panelTemaAdlari()[0]);
  }

  /* ---------------- tema işleri ---------------- */
  function benzersizAd(ad) {
    let a = ad, i = 2;
    while (temaAdlari().includes(a) || depo.pal.temalar[a]) a = `${ad} ${i++}`;
    return a;
  }
  // Yeni tema: renkler ortak palete, nesne ayarı bu siteye kopyalanır (2.4.0)
  function yeniTema(t, yeni) {
    depo.pal.temalar[yeni] = { temel: t.temel, degerler: kopya(t.temel === 'goz' ? t.degerler : {}) };
    depo.kul.temalar[yeni] = { nesneler: kopya(t.nesneler) };
    kulKaydet(); palKaydet(); acilirKapat(); temaDegistir(yeni);
  }
  function temaKopyala() {
    const t = aktif();
    const ad = prompt('Yeni temanın adı:', benzersizAd(t.ad + ' kopya'));
    if (!ad || !ad.trim()) return;
    yeniTema(t, benzersizAd(ad.trim()));
  }
  // Başka sitelerin kayıtlarına da uygulanır (ad değişikliği, silme)
  function herSite(fn) {
    for (const a of tumAnahtarlar().filter(x => /:kullanici$/.test(x) && x !== SK('kullanici'))) { const k = kulDuzelt(oku(a, null)); fn(k); yaz(a, k); }
    fn(depo.kul);
  }
  function temaAdDegistir() {
    const eski = depo.tema;
    const ad = prompt('Temanın yeni adı (bütün sitelerde):', eski);
    if (!ad || !ad.trim() || ad.trim() === eski) return;
    const yeni = benzersizAd(ad.trim());
    const tasi = o => { if (o[eski]) { o[yeni] = o[eski]; delete o[eski]; } };
    tasi(depo.pal.temalar); tasi(depo.pal.taslaklar);
    herSite(k => { tasi(k.temalar); tasi(k.taslaklar); });
    for (const a of tumAnahtarlar().filter(x => /:siteTema$/.test(x))) if (oku(a, null) === eski) yaz(a, yeni);
    kulKaydet(); palKaydet(); acilirKapat(); temaDegistir(yeni);
  }
  function temaSifirla() {
    if (!confirm(`"${depo.tema}" ilk hâline dönsün mü? Renkleri bütün sitelerde, nesne ayarları bu sitede silinir; kaydedilmemiş değişiklikler de gider. (Geçmişten geri alınabilir.)`)) return;
    delete depo.pal.temalar[depo.tema]; delete depo.pal.taslaklar[depo.tema];
    delete depo.kul.temalar[depo.tema]; delete depo.kul.taslaklar[depo.tema];
    kulKaydet(); palKaydet(); uygula(true); acilirKapat(); hepsiniCiz(); anlik('Tema sıfırlandı: ' + depo.tema);
  }
  function temaSil() {
    const ad = depo.tema;
    if (!confirm(`"${ad}" teması bütün sitelerde listeden kaldırılsın mı? (Geçmişten geri alınabilir.)`)) return;
    if (hazirMi(ad)) { if (!depo.pal.silinen.includes(ad)) depo.pal.silinen.push(ad); }
    delete depo.pal.temalar[ad]; delete depo.pal.taslaklar[ad];
    delete depo.kul.temalar[ad]; delete depo.kul.taslaklar[ad];
    kulKaydet(); palKaydet(); acilirKapat();
    temaDegistir(temaAdlari()[0]);
  }
  // Taslak: Kaydet üzerine yazar, Farklı kaydet yeni tema açar, Vazgeç siler (2.2.0)
  function taslakCiz() {
    if (!taslakEl) return;
    const n = taslakSayisi(depo.tema);
    taslakEl.classList.toggle('acik', !!n);
    if (!n) { taslakEl.replaceChildren(); return; }
    taslakEl.replaceChildren(
      Object.assign(el('span', 'not', `● ${n} kaydedilmedi`), { title: `${n} değişiklik yalnız taslakta; "${depo.tema}" kaydı değişmedi` }),
      dug('Kaydet', `"${depo.tema}" temasının üzerine yaz`, taslakKaydet, 'kaydet'),
      dug('Farklı kaydet…', 'Yeni tema olarak kaydet; bu tema değişmez', taslakFarkliKaydet),
      dug('Vazgeç', 'Kaydedilmemiş değişiklikleri sil', taslakVazgec));
  }
  function taslakKaydet() {
    const ad = depo.tema, ts = depo.kul.taslaklar[ad] || {}, pt = depo.pal.taslaklar[ad] || {};
    if (!taslakSayisi(ad)) return;
    const renkVar = Object.keys(pt.degerler || {}).length || pt.temel;
    if (hazirMi(ad) && !confirm(`Hazır tema "${ad}" değiştirilsin mi?${renkVar ? ' Renkler bütün sitelerde değişir.' : ''} (Sonra ☰ → "Fabrika ayarına dön" ile ilk hâline döner.)`)) return;
    if (renkVar) {
      const p = palTema(ad);
      if (pt.temel) p.temel = pt.temel;
      for (const [k, v] of Object.entries(pt.degerler || {})) { if (v === null) delete p.degerler[k]; else p.degerler[k] = v; }
    }
    const u = kulTema(ad);
    for (const [id, o] of Object.entries(ts.nesneler || {})) {
      const h = u.nesneler[id] || (u.nesneler[id] = {});
      for (const [k, v] of Object.entries(o)) { if (v === null) delete h[k]; else h[k] = v; }
      if (!Object.keys(h).length) delete u.nesneler[id];
    }
    delete depo.kul.taslaklar[ad]; delete depo.pal.taslaklar[ad];
    kulKaydet(); palKaydet(); uygula(true); hepsiniCiz(); anlik('Kaydedildi: ' + ad);
  }
  function taslakFarkliKaydet() {
    const t = aktif();
    const ad = prompt('Yeni temanın adı:', benzersizAd(t.ad + ' 2'));
    if (!ad || !ad.trim()) return;
    delete depo.kul.taslaklar[t.ad]; delete depo.pal.taslaklar[t.ad];
    yeniTema(t, benzersizAd(ad.trim()));
  }
  function taslakVazgec() {
    delete depo.kul.taslaklar[depo.tema]; delete depo.pal.taslaklar[depo.tema];
    kulKaydet(); palKaydet(); uygula(true); hepsiniCiz(); anlik('Vazgeçildi: ' + depo.tema);
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
  // Yedek: Site Tema'nın bütün kayıtları (bütün siteler, temalar, panel, yazı tipi dosyaları);
  // geçmiş, tarama ve yazı tipi önbelleği dışarıda kalır (2.4.0)
  const YEDEK_DISI = /(:gecmis|:tarama)$|^fontOnbellek$/;
  function yedekAl() {
    yaz(SK('kullanici'), depo.kul); yaz('paletler', depo.pal); yaz('panelTema', depo.panelTema); yaz('panelOzel', depo.panelOzel);
    yaz('panelTemalar', depo.panelTemalar); yaz('panelSilinen', depo.panelSilinen);
    const d = { tur: 'site-tema-yedek', surum: 3, betik: SURUM, tarih: new Date().toISOString(), kayitlar: {} };
    for (const a of tumAnahtarlar()) if (!YEDEK_DISI.test(a)) { const v = oku(a, undefined); if (v !== undefined) d.kayitlar[a] = v; }
    return d;
  }
  function dosyayaKaydet() {
    dosyaIndir(`site-tema-yedek_${damga()}.json`, JSON.stringify(yedekAl(), null, 1));
    bildir('Bütün ayarlar dosyaya kaydedildi');
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
    if (d && d.tur === 'site-tema-yedek' && d.kayitlar) {
      const n = Object.keys(d.kayitlar).length;
      if (!confirm(`Yedekteki ${n} kayıt yüklensin mi? Aynı adlı kayıtlar dosyadakiyle değişir, sayfa yenilenir.`)) return;
      for (const [a, v] of Object.entries(d.kayitlar)) if (!YEDEK_DISI.test(a)) yaz(a, v);
      bildir('Yedek yüklendi; sayfa yenileniyor');
      setTimeout(() => location.reload(), 400);
      return;
    }
    if (!d || d.tur !== 'site-tema-ayar') { bildir('Bu bir Site Tema dosyası değil'); return; }
    if (d.panel) { depo.panelTema = panelTemaAdlari().includes(d.panel.tema) ? d.panel.tema : depo.panelTema; depo.panelOzel = Object.assign({}, depo.panelOzel, d.panel.ozel || {}); panelKaydet(); panelRenkUygula(); }
    if (d.site && d.site !== SITE) { bildir(`Dosya ${d.site} için; yalnız panel ayarları alındı`); anlik('Dosyadan panel ayarı'); hepsiniCiz(); return; }
    const k = d.kalici || {};
    // Eski site dosyası: renkler ortak palete, nesne ayarı bu siteye (2.4.0)
    for (const [ad, t] of Object.entries(k.temalar || {})) {
      if (!t) continue;
      if ((t.degerler && Object.keys(t.degerler).length) || t.temel || !hazirMi(ad)) { const p = palTema(ad); Object.assign(p.degerler, t.degerler || {}); if (t.temel) p.temel = t.temel; }
      if (t.nesneler) { const u = kulTema(ad); for (const [id, o] of Object.entries(t.nesneler)) u.nesneler[id] = Object.assign({}, u.nesneler[id], o); }
    }
    yaz('paletler', depo.pal);
    for (const n of k.ozelNesneler || []) if (!depo.kul.ozelNesneler.some(o => o.id === n.id)) depo.kul.ozelNesneler.push(n);
    for (const f of k.fontlar || []) if (!depo.pal.fontlar.some(o => o.ad === f.ad)) depo.pal.fontlar.push(f);
    if (d.fontVeri) { Object.assign(depo.fontVeri, d.fontVeri); yaz('fontVeri', depo.fontVeri); }
    yaz(SK('kullanici'), depo.kul);
    if (d.aktifTema && temaAdlari().includes(d.aktifTema)) temaDegistir(d.aktifTema);
    uygula(true); fontlariHazirla(); hepsiniCiz(); anlik('Dosyadan yüklendi');
    bildir('Ayarlar yüklendi');
  }

  /* ---------------- sayfa taraması (0021) ---------------- */
  function taramaOku() {
    const t = oku(SK('tarama'), null);
    return t && t.ogeler ? t : { sayfalar: [], ogeler: {} };
  }
  // Göz teması kurallarının bu sayfada kaç öğe eşlediği ve sitenin kendi CSS değişkenleri (2.2.0)
  function kuralTara(t) {
    t.kurallar = t.kurallar || {}; t.siteDegiskenleri = t.siteDegiskenleri || {};
    const yol = location.pathname.replace(/[0-9a-f-]{20,}/g, '…');
    const sade = x => x.replace(/::?[\w-]+(\([^)]*\))?/g, m => /^:(not|is|where|has)\(/.test(m) ? m : '').trim() || '*';
    const gez = kurallar => {
      for (const k of kurallar) {
        if (k.cssRules && !k.selectorText) { gez(k.cssRules); continue; }
        if (!k.selectorText) continue;
        for (const parca of k.selectorText.split(/,(?![^(]*\))/)) {
          const sec = parca.trim();
          if (!sec || sec === ':root') continue;
          let sayi;
          try { sayi = document.querySelectorAll(sade(sec)).length; } catch (e) { sayi = -1; }
          const kayit = t.kurallar[sec] || (t.kurallar[sec] = { sayi: 0, sayfalar: {} });
          kayit.sayi = Math.max(kayit.sayi, sayi); kayit.sayfalar[yol] = sayi;
        }
      }
    };
    try { const ss = new CSSStyleSheet(); ss.replaceSync(KURALLAR); gez(ss.cssRules); } catch (e) { t.kuralHata = String(e); }
    for (const ss of document.styleSheets) {
      if (kok && ss.ownerNode && kok.contains && kok.contains(ss.ownerNode)) continue;
      let kurallar;
      try { kurallar = ss.cssRules; } catch (e) { continue; }
      const gezD = ks => {
        for (const k of ks) {
          if (k.cssRules && !k.style) { gezD(k.cssRules); continue; }
          if (!k.style || !k.selectorText || !/:root|html|\.dark|data-theme|data-mode/.test(k.selectorText)) continue;
          for (const ad of k.style) {
            if (!ad.startsWith('--') || Object.keys(t.siteDegiskenleri).length > 600) continue;
            const anahtar = k.selectorText.slice(0, 40) + ' ' + ad;
            t.siteDegiskenleri[anahtar] = k.style.getPropertyValue(ad).trim().slice(0, 60);
          }
        }
      };
      gezD(kurallar);
    }
  }
  const uretilmis = s => /\d{4,}|[a-f0-9]{10,}|^:r|radix-|^_/i.test(s);
  function tara() {
    const t = taramaOku();
    const host = kok && kok.host;
    const SECICI = '[data-testid], [aria-label], [role], nav, header, main, aside, footer, form, fieldset, textarea, input, select, button, a[href], [contenteditable="true"], pre, code, h1, h2, h3, ul, ol, dialog, [id], [class*="font-"], [class*="message"], [class*="artifact"], [class*="file"], [class*="prose"], [class*="markdown"], [data-is-streaming], [data-test-render-count]';
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
    kuralTara(t);
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
      kurallar: t.kurallar || {}, kuralHata: t.kuralHata || '', siteDegiskenleri: t.siteDegiskenleri || {},
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
    for (const t of Object.values(depo.kul.temalar).concat(Object.values(depo.kul.taslaklar))) if (t.nesneler) delete t.nesneler[n.id];
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
    // Dokunmatikte uzun basma da contextmenu üretir; seçim yapılmaz,
    // sayfanın kendi uzun basma işlevi kalır. Telefonda seçim "+" düğmesiyle.
    if (sonIsaretci === 'touch') return;
    if (!depo.sagTik || !(e.ctrlKey || e.metaKey) || e.shiftKey || secimModuAcik || !kok || bizdenMi(e)) return;
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
  function dugmeBoya() {
    if (!dugmeK) return;
    dugmeK.classList.toggle('kapali', depo.kapali);
    dugmeK.title = `Site Tema · tık: panel (${KISAYOL}) · çift tık: ${SITE} için temayı ${depo.kapali ? 'aç' : 'kapat'}`;
  }
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
     MODEL PENCERESİ — claude.ai model seçicisi tek pencerede
     (Metin 04.11.2026). Modeller, Çaba ve Daha fazla model aynı
     pencerede alt alta durur. Seçim pencereyi kapatmaz; üstteki
     "Uygula" ya da pencere dışına tık uygular ve kapatır, Esc vazgeçer.
     İçerik her açılışta claude.ai'nin kendi menüsünden okunur: yeni
     model, yeni çaba düzeyi, yeni alt menü kendiliğinden gelir.
     Uygulama özgün menüde aynı ada sahip öğeye tıklanarak yapılır.
     Okuma ve uygulama sırasında özgün menü görünmez (st-mp-gizli).
     Açılıp kapanır: ☰ → PANEL ve Tampermonkey menüsü.
     ================================================================ */
  const MP = {
    // Sohbet: model-selector-dropdown · Code oturumu: epitaxy-cds-model-selector ·
    // Code yeni oturum: environment-row-model (04.11.2026 gerçek sayfada okundu)
    tetik: 'button[data-testid*="model-selector"], button[data-testid*="model"][aria-haspopup="menu"]',
    menu: '[role="menu"]',
    oge: '[role="menuitemradio"], [role="menuitemcheckbox"], [role="menuitem"], [role="separator"], [role="presentation"]',
  };
  const MP_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.mp { position: fixed; z-index: 2147483646; width: 312px; overflow-y: auto; overscroll-behavior: contain;
  font: 13px/1.3 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--mp-yazi);
  background: var(--mp-zemin); border: 1px solid var(--mp-cizgi); border-radius: var(--mp-kose, 12px);
  box-shadow: 0 10px 30px rgba(0,0,0,.35); padding: 4px 6px 6px; scrollbar-width: thin; }
.ust { position: sticky; top: -4px; z-index: 1; display: flex; align-items: center; gap: 6px;
  margin: -4px -6px 4px; padding: 6px 8px 6px 12px; background: var(--mp-zemin); border-bottom: 1px solid var(--mp-cizgi); }
.ozet { flex: 1; min-width: 0; font-size: 11px; color: var(--mp-soluk); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uygula { all: unset; cursor: pointer; font-size: 11px; line-height: 1; padding: 4px 8px; border-radius: 6px;
  border: 1px solid var(--mp-cizgi); color: var(--mp-soluk); }
.uygula:hover, .uygula:focus-visible { color: var(--mp-yazi); border-color: var(--mp-soluk); }
.uygula.degisti { background: var(--mp-vurgu); border-color: var(--mp-vurgu); color: #fff; }
.bas { padding: 8px 8px 4px; font-size: 12px; color: var(--mp-soluk); }
.cizgi { height: 1px; margin: 4px 2px; background: var(--mp-cizgi); }
.oge { all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 6px 8px; border-radius: 8px; cursor: pointer; }
.oge:hover, .oge:focus-visible { background: var(--mp-uzerinde); }
.oge[aria-disabled="true"] { opacity: .45; cursor: default; }
.metin { flex: 1; min-width: 0; }
.ad { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rozet { font-size: 10.5px; line-height: 1; padding: 2px 6px; border-radius: 999px; border: 1px solid var(--mp-cizgi); color: var(--mp-soluk); }
.alt { font-size: 12px; color: var(--mp-soluk); margin-top: 2px; }
.isaret { flex: 0 0 16px; text-align: center; color: var(--mp-vurgu); font-weight: 700; }
.anahtar { flex: 0 0 28px; height: 16px; border-radius: 999px; background: var(--mp-cizgi); position: relative; }
.anahtar::after { content: ""; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--mp-soluk); transition: left .12s; }
.anahtar.acik { background: var(--mp-vurgu); }
.anahtar.acik::after { left: 14px; background: #fff; }
.eylem { font-size: 12px; color: var(--mp-soluk); }
.okunuyor { padding: 14px 10px; color: var(--mp-soluk); font-size: 12px; }
/* Dar ekran (telefon): pencere ve satırlar küçülür (2.1.1, Metin 04.11.2026) */
@media (max-width: 600px) {
  .mp { font-size: 12px; padding: 2px 4px 4px; border-radius: 10px; }
  .oge { padding: 4px 6px; gap: 6px; }
  .bas { padding: 6px 6px 2px; font-size: 11px; }
  .alt { font-size: 11px; margin-top: 1px; }
  .rozet { font-size: 9.5px; padding: 1px 5px; }
}
`;
  const MP_GIZLE_CSS = 'html.st-mp-gizli [role="menu"] { opacity: 0 !important; pointer-events: none !important; }';

  let mpHost = null, mpKok = null, mpKutu = null, mpDurum = null, mpMesgul = false, mpGizleSayfa = null;
  const mpBekle = ms => new Promise(r => setTimeout(r, ms));
  async function mpKosul(fn, ms) {
    const son = Date.now() + (ms || 1500);
    for (;;) {
      const v = fn();
      if (v) return v;
      if (Date.now() > son) return null;
      await mpBekle(40);
    }
  }
  function mpGizle(ac) {
    if (!mpGizleSayfa) {
      try {
        mpGizleSayfa = new CSSStyleSheet();
        mpGizleSayfa.replaceSync(MP_GIZLE_CSS);
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, mpGizleSayfa];
      } catch (e) {
        mpGizleSayfa = el('style', '', MP_GIZLE_CSS);
        (document.head || document.documentElement).append(mpGizleSayfa);
      }
    }
    document.documentElement.classList.toggle('st-mp-gizli', !!ac);
  }

  /* ---------- özgün menüyü sürme (yapay olaylar; yakalayıcı yalnız gerçek olayı tutar) ---------- */
  function mpTetikBul(eski) {
    if (eski && eski.isConnected) return eski;
    return document.querySelector(MP.tetik);
  }
  const mpKokMenu = () => [...document.querySelectorAll(MP.menu)].find(m => !m.parentElement.closest(MP.menu) && !mpAltMenuMu(m)) || null;
  // Alt menü, açtığı öğenin aria-controls'üyle bağlanır; bağ yoksa sıra belirler (ilk açılan kök)
  function mpAltMenuMu(m) {
    return !!(m.id && document.querySelector(`[role="menuitem"][aria-haspopup="menu"][aria-controls="${CSS.escape(m.id)}"]`));
  }
  function mpTikla(h) {
    const o = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1, pointerId: 1, pointerType: 'mouse', isPrimary: true };
    h.dispatchEvent(new PointerEvent('pointerdown', o));
    h.dispatchEvent(new MouseEvent('mousedown', o));
    h.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, o, { buttons: 0 })));
    h.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, o, { buttons: 0 })));
    h.dispatchEvent(new MouseEvent('click', Object.assign({}, o, { buttons: 0 })));
  }
  const mpTus = (h, key) => h.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true }));
  async function mpMenuAc(tetik) {
    const acik = mpKokMenu();
    if (acik) return acik;
    mpTikla(tetik);
    return mpKosul(mpKokMenu, 1500);
  }
  async function mpMenuKapat(tetik) {
    for (let i = 0; i < 3 && document.querySelector(MP.menu); i++) {
      const m = [...document.querySelectorAll(MP.menu)].pop();
      const h = m.querySelector('[role^="menuitem"]') || m;
      try { h.focus(); } catch (e) { /* odaklanamazsa tuş yine gönderilir */ }
      mpTus(h, 'Escape');
      await mpKosul(() => !document.querySelector(MP.menu) || document.querySelectorAll(MP.menu).length <= 0, 400);
    }
    if (document.querySelector(MP.menu) && tetik) { mpTikla(tetik); await mpKosul(() => !document.querySelector(MP.menu), 600); }
  }
  async function mpAltAc(kokMenu, tetikOge) {
    const once = new Set(document.querySelectorAll(MP.menu));
    try { tetikOge.focus(); } catch (e) { /* olmazsa da tuş denenir */ }
    mpTus(tetikOge, 'ArrowRight');
    let alt = await mpKosul(() => [...document.querySelectorAll(MP.menu)].find(m => !once.has(m)), 900);
    if (!alt) {
      mpTikla(tetikOge);
      alt = await mpKosul(() => [...document.querySelectorAll(MP.menu)].find(m => !once.has(m)), 900);
    }
    return alt;
  }
  async function mpAltKapat(alt) {
    const h = alt.querySelector('[role^="menuitem"]') || alt;
    try { h.focus(); } catch (e) { /* tuş yine gönderilir */ }
    mpTus(h, 'ArrowLeft');
    await mpKosul(() => !alt.isConnected || alt.getAttribute('data-closed') !== null || alt.hidden, 500);
  }

  /* ---------- öğe metni: ad, ad yanındaki rozet, alttaki açıklama ---------- */
  function mpYapraklar(kokEl) {
    const y = [];
    const yuru = n => {
      if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' ').trim(); if (t) y.push({ t, el: n.parentElement }); return; }
      if (n.nodeType !== 1) return;
      if (n.matches('.sr-only, [aria-hidden="true"], svg, [role="switch"], input')) return;
      for (const c of n.childNodes) yuru(c);
    };
    yuru(kokEl);
    return y;
  }
  function mpOgeMetni(oge) {
    const y = mpYapraklar(oge);
    if (!y.length) return { ad: '', rozet: [], alt: '' };
    const kap2 = y[0].el && y[0].el.parentElement;
    const rozet = [], alt = [];
    for (const x of y.slice(1)) {
      if (/^\d$/.test(x.t)) continue; // klavye kısayolu
      (kap2 && kap2.contains(x.el) && x.el !== kap2 ? rozet : alt).push(x.t);
    }
    return { ad: y[0].t, rozet, alt: alt.join(' ') };
  }
  function mpSecili(oge) {
    if (oge.getAttribute('aria-checked') === 'true') return true;
    const sw = oge.querySelector('[role="switch"], input[type="checkbox"]');
    return !!(sw && (sw.getAttribute('aria-checked') === 'true' || sw.checked));
  }
  function mpTur(oge) {
    const r = oge.getAttribute('role');
    if (r === 'menuitemradio') return 'radio';
    if (r === 'menuitemcheckbox' || oge.querySelector('[role="switch"], input[type="checkbox"]')) return 'check';
    return 'eylem';
  }

  /* ---------- menüyü oku → pencere modeli ---------- */
  function mpMenuOgeleri(menu) {
    return [...menu.querySelectorAll(MP.oge)].filter(x => x.closest(MP.menu) === menu && !x.parentElement.closest('[role^="menuitem"]'));
  }
  async function mpOku(tetik) {
    const kok = await mpMenuAc(tetik);
    if (!kok) return null;
    const bolumler = [];
    const ogeler = new Map();
    let bolum = { baslik: '', aciklama: '', ogeler: [] };
    const bolumBitir = () => { if (bolum.ogeler.length || bolum.baslik) bolumler.push(bolum); };
    const ekle = (h, b, grup, altAd) => {
      const tur = mpTur(h);
      const m = mpOgeMetni(h);
      if (!m.ad) return;
      const anahtar = (altAd || '') + '\u0001' + m.ad;
      const o = { anahtar, tur, ad: m.ad, rozet: m.rozet, alt: m.alt, secili: mpSecili(h), grup, altAd: altAd || '',
        devre: h.getAttribute('aria-disabled') === 'true' || h.hasAttribute('data-disabled'),
        href: h.tagName === 'A' ? h.href : '' };
      ogeler.set(anahtar, o);
      b.ogeler.push(o);
    };
    const kokOgeleri = mpMenuOgeleri(kok);
    let kesit = 0; // kök menüde çizgiyle ayrılan bölümün sırası; aday grup adı
    for (const h of kokOgeleri) {
      const r = h.getAttribute('role');
      if (r === 'separator') { kesit++; if (bolum.ogeler.length) { bolumBitir(); bolum = { baslik: '', aciklama: '', ogeler: [] }; } continue; }
      if (r === 'presentation') { const t = mpYapraklar(h).map(x => x.t).join(' '); if (t) bolum.aciklama = t; continue; }
      if (h.getAttribute('aria-haspopup') === 'menu') {
        const m = mpOgeMetni(h);
        const degerli = mpYapraklar(h).length > 1; // "Çaba · Yüksek" gibi değer gösteren alt menü kendi grubudur
        bolumBitir();
        const altB = { baslik: m.ad, aciklama: '', ogeler: [] };
        const alt = await mpAltAc(kok, h);
        if (alt) {
          for (const a of mpMenuOgeleri(alt)) {
            const ar = a.getAttribute('role');
            if (ar === 'separator' || a.getAttribute('aria-haspopup') === 'menu') continue;
            if (ar === 'presentation') { const t = mpYapraklar(a).map(x => x.t).join(' '); if (t) altB.aciklama = t; continue; }
            ekle(a, altB, degerli ? m.ad : 'alt\u0001' + m.ad, m.ad);
          }
          await mpAltKapat(alt);
        }
        bolumler.push(altB);
        bolum = { baslik: '', aciklama: '', ogeler: [] };
        continue;
      }
      ekle(h, bolum, 'kok\u0001' + kesit, '');
    }
    bolumBitir();
    const cs = getComputedStyle(kok);
    const gorunum = { zemin: cs.backgroundColor, yazi: cs.color, kose: cs.borderTopLeftRadius, cizgi: cs.borderTopColor };
    await mpMenuKapat(tetik);
    if (!ogeler.size) return null;
    // Aday gruplar birleşir: kök bölümler ve değer göstermeyen alt menüler
    // ilk kök radyo grubuna katılır; ikisinde de seçili radyo varsa ayrı
    // gruptur (bir radyo grubunda tek seçili olur). Telefonda claude.ai
    // Çaba'yı değersiz gösteriyor, model ile çaba birleşiyordu (2.1.2,
    // Metin 04.11.2026).
    const radyolar = [...ogeler.values()].filter(o => o.tur === 'radio');
    const adaylar = [...new Set(radyolar.map(o => o.grup))].filter(g => !radyolar.some(o => o.grup === g && o.altAd && g === o.altAd));
    const taban = adaylar.find(g => g.startsWith('kok\u0001')) || adaylar[0];
    const seciliVar = g => radyolar.some(o => o.grup === g && o.secili);
    for (const g of adaylar) {
      if (g === taban || (seciliVar(g) && seciliVar(taban))) continue;
      for (const o of radyolar) if (o.grup === g) o.grup = taban;
    }
    const secim = new Map(), isaret = new Map();
    for (const o of ogeler.values()) {
      if (o.tur === 'radio') { if (!secim.has(o.grup) || o.secili) secim.set(o.grup, o.secili ? o.anahtar : secim.get(o.grup) || null); }
      else if (o.tur === 'check') isaret.set(o.anahtar, o.secili);
    }
    return { tetik, bolumler, ogeler, gorunum, ilkSecim: new Map(secim), secim, ilkIsaret: new Map(isaret), isaret };
  }

  /* ---------- pencere ---------- */
  function mpRenk(c, yedek) { return c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c) ? c : yedek; }
  function mpKoyuMu(c) {
    const m = String(c).match(/\d+(\.\d+)?/g);
    if (!m) return true;
    return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 < 0.5;
  }
  function mpHostKur() {
    if (mpHost && mpHost.isConnected) return;
    mpHost = document.createElement('st-model');
    mpHost.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483646;';
    mpKok = mpHost.attachShadow({ mode: 'open' });
    try { const s = new CSSStyleSheet(); s.replaceSync(MP_CSS); mpKok.adoptedStyleSheets = [s]; } catch (e) { mpKok.append(el('style', '', MP_CSS)); }
    document.documentElement.append(mpHost);
  }
  function mpDegistiMi(d) {
    for (const [g, a] of d.secim) if (a !== d.ilkSecim.get(g)) return true;
    for (const [a, v] of d.isaret) if (v !== d.ilkIsaret.get(a)) return true;
    return false;
  }
  function mpOzet(d) {
    const p = [];
    for (const a of d.secim.values()) { const o = a && d.ogeler.get(a); if (o) p.push(o.ad); }
    for (const [a, v] of d.isaret) if (v) { const o = d.ogeler.get(a); if (o) p.push(o.ad); }
    return p.join(' · ');
  }
  function mpCiz() {
    const d = mpDurum;
    if (!d || !mpKutu) return;
    const ust = el('div', 'ust');
    const ozet = el('span', 'ozet', mpOzet(d));
    const uyg = el('button', 'uygula' + (mpDegistiMi(d) ? ' degisti' : ''), 'Uygula');
    uyg.type = 'button';
    uyg.title = 'Seçimi uygula ve kapat (pencere dışına tık da uygular, Esc vazgeçer)';
    uyg.addEventListener('click', () => mpUygula());
    ust.append(ozet, uyg);
    const parca = [ust];
    let ilk = true;
    for (const b of d.bolumler) {
      if (!b.ogeler.length) continue;
      if (!ilk) parca.push(el('div', 'cizgi'));
      ilk = false;
      if (b.baslik) { const h = el('div', 'bas', b.baslik); if (b.aciklama) h.title = b.aciklama; parca.push(h); }
      for (const o of b.ogeler) {
        const s = el('button', 'oge' + (o.tur === 'eylem' && !b.ogeler.some(x => x.tur === 'radio') ? ' eylem' : ''));
        s.type = 'button';
        if (o.devre) s.setAttribute('aria-disabled', 'true');
        const metin = el('span', 'metin');
        const ad = el('span', 'ad');
        ad.append(el('span', '', o.ad));
        for (const r of o.rozet) ad.append(el('span', 'rozet', r));
        metin.append(ad);
        if (o.alt) metin.append(el('div', 'alt', o.alt));
        s.append(metin);
        if (o.tur === 'radio') s.append(el('span', 'isaret', d.secim.get(o.grup) === o.anahtar ? '✓' : ''));
        if (o.tur === 'check') s.append(el('span', 'anahtar' + (d.isaret.get(o.anahtar) ? ' acik' : '')));
        s.addEventListener('click', () => mpOgeSec(o));
        parca.push(s);
      }
    }
    mpKutu.replaceChildren(...parca);
  }
  function mpYerlestir() {
    if (!mpKutu || !mpDurum) return;
    const t = mpTetikBul(mpDurum.tetik);
    const r = t ? t.getBoundingClientRect() : { top: innerHeight - 60, bottom: innerHeight - 20, left: innerWidth - 320, right: innerWidth - 8 };
    const gen = Math.min(innerWidth <= 600 ? 272 : 312, innerWidth - 16);
    mpKutu.style.width = gen + 'px';
    mpKutu.style.left = Math.max(8, Math.min(innerWidth - gen - 8, r.right - gen)) + 'px';
    const ust = r.top - 8, alt = innerHeight - r.bottom - 8;
    if (ust >= alt || ust > 320) {
      mpKutu.style.top = ''; mpKutu.style.bottom = (innerHeight - r.top + 6) + 'px'; mpKutu.style.maxHeight = (ust - 6) + 'px';
    } else {
      mpKutu.style.bottom = ''; mpKutu.style.top = (r.bottom + 6) + 'px'; mpKutu.style.maxHeight = (alt - 6) + 'px';
    }
  }
  function mpOgeSec(o) {
    const d = mpDurum;
    if (!d || o.devre) return;
    if (o.tur === 'radio') d.secim.set(o.grup, o.anahtar);
    else if (o.tur === 'check') d.isaret.set(o.anahtar, !d.isaret.get(o.anahtar));
    else { mpKapat(); mpEylem(d, o); return; }
    mpCiz();
  }
  async function mpAc(tetik) {
    if (mpMesgul) return;
    mpMesgul = true;
    mpHostKur();
    mpKutu = el('div', 'mp');
    mpKutu.setAttribute('role', 'dialog');
    mpKutu.setAttribute('aria-label', 'Model seçimi');
    mpKutu.append(el('div', 'okunuyor', 'Model listesi okunuyor…'));
    mpKok.replaceChildren(mpKutu);
    mpDurum = { tetik, bolumler: [], ogeler: new Map(), secim: new Map(), isaret: new Map(), ilkSecim: new Map(), ilkIsaret: new Map() };
    mpYerlestir();
    mpGizle(true);
    let d = null;
    try { d = await mpOku(tetik); } catch (e) { d = null; }
    mpGizle(false);
    mpMesgul = false;
    if (!mpKutu) return; // okunurken kapatıldı
    if (!d) {
      mpKapat();
      bildir('Model penceresi menüyü okuyamadı; özgün menü açılıyor');
      mpTikla(tetik);
      return;
    }
    const v = d.gorunum, koyu = mpKoyuMu(mpRenk(v.zemin, 'rgb(38,38,36)'));
    const k = mpKutu.style;
    k.setProperty('--mp-zemin', mpRenk(v.zemin, koyu ? '#2a2a28' : '#fff'));
    k.setProperty('--mp-yazi', mpRenk(v.yazi, koyu ? '#eee' : '#222'));
    k.setProperty('--mp-soluk', koyu ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.55)');
    k.setProperty('--mp-cizgi', koyu ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)');
    k.setProperty('--mp-uzerinde', koyu ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)');
    k.setProperty('--mp-vurgu', '#3b82f6');
    if (v.kose && v.kose !== '0px') k.setProperty('--mp-kose', v.kose);
    mpDurum = d;
    mpCiz();
    mpYerlestir();
  }
  function mpKapat() {
    if (mpKok) mpKok.replaceChildren();
    mpKutu = null;
    mpDurum = null;
  }
  async function mpEylem(d, o) {
    if (o.href) { window.open(o.href, '_blank', 'noopener'); return; }
    mpMesgul = true; mpGizle(true);
    try { await mpOgeTikla(mpTetikBul(d.tetik), o); } finally { mpGizle(false); mpMesgul = false; }
  }
  async function mpOgeTikla(tetik, o, hedef) {
    if (!tetik) return false;
    const kok = await mpMenuAc(tetik);
    if (!kok) return false;
    let menu = kok;
    if (o.altAd) {
      const t = await mpKosul(() => mpMenuOgeleri(kok).find(h => h.getAttribute('aria-haspopup') === 'menu' && mpOgeMetni(h).ad === o.altAd), 800);
      menu = t ? await mpAltAc(kok, t) : null;
      if (!menu) { await mpMenuKapat(tetik); return false; }
    }
    const h = await mpKosul(() => mpMenuOgeleri(menu).find(x => x.getAttribute('aria-haspopup') !== 'menu' && mpOgeMetni(x).ad === o.ad), 800);
    if (!h || h.getAttribute('aria-disabled') === 'true') { await mpMenuKapat(tetik); return false; }
    if (hedef !== undefined && o.tur !== 'eylem' && mpSecili(h) === hedef) { await mpMenuKapat(tetik); return true; }
    const once = mpSecili(h);
    mpTikla(h);
    await mpKosul(() => !document.querySelector(MP.menu) || (o.tur === 'check' && mpSecili(h) !== once), 900);
    await mpMenuKapat(tetik);
    return true;
  }
  function mpUygula() {
    const d = mpDurum;
    mpKapat();
    if (d && !mpMesgul) mpIsle(d);
  }
  // Dışarı tık: basılı tuş bırakılınca uygulanır; yoksa sayfanın kendi
  // "dışarı tık" algısı az önce açılan özgün menüyü kapatır (04.11.2026 denemesi)
  function mpDisariUygula() {
    const d = mpDurum;
    mpKapat();
    if (!d || mpMesgul) return;
    let oldu = false;
    const calis = () => { if (oldu) return; oldu = true; setTimeout(() => mpIsle(d), 80); };
    window.addEventListener('click', calis, { capture: true, once: true });
    setTimeout(calis, 700);
  }
  async function mpIsle(d) {
    if (!mpDegistiMi(d)) return;
    // Model değişince claude.ai çabayı o modelin varsayılanına döndürebilir
    // (04.11.2026 denemesi): bir şey değiştiyse penceredeki bütün seçimler
    // sırayla uygulanır; zaten seçili olan öğeye tıklanmaz.
    const isler = [];
    for (const a of d.secim.values()) if (a) isler.push([d.ogeler.get(a), true]);
    for (const [a, v] of d.isaret) isler.push([d.ogeler.get(a), v]);
    mpMesgul = true; mpGizle(true);
    const olmayan = [];
    try {
      for (const [o, hedef] of isler) if (!(await mpOgeTikla(mpTetikBul(d.tetik), o, hedef))) olmayan.push(o.ad);
    } finally { mpGizle(false); mpMesgul = false; }
    if (olmayan.length) bildir('Uygulanamadı (bu seçimde yok): ' + olmayan.join(', '));
  }

  /* ---------- yakalama: yalnız gerçek (isTrusted) olaylar ---------- */
  const mpAcikMi = () => !!(mpKutu && mpKutu.isConnected);
  const mpBizde = e => !!mpHost && e.composedPath().includes(mpHost);
  function mpTetikOlayi(e) {
    if (!e.isTrusted || !depo.modelPencere || PROFIL.ad !== 'claude.ai') return null;
    const h = e.target && e.target.closest ? e.target.closest(MP.tetik) : null;
    return h;
  }
  for (const tur of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'touchstart', 'touchend']) {
    window.addEventListener(tur, e => {
      const t = mpTetikOlayi(e);
      if (!t) {
        if (tur === 'pointerdown' && e.isTrusted && mpAcikMi() && !mpBizde(e)) mpDisariUygula(); // dışarı tık uygular
        return;
      }
      // Dokunma olayında preventDefault tarayıcının ardından ürettiği
      // click'i siler; telefonda dokunuş ölü kalıyordu (2.1.1, Firefox mobil)
      if (tur !== 'touchstart' && tur !== 'touchend') e.preventDefault();
      e.stopImmediatePropagation();
      if (tur !== 'click') return;
      if (mpAcikMi()) mpUygula(); else mpAc(t);
    }, { capture: true, passive: false });
  }
  window.addEventListener('keydown', e => {
    if (e.isTrusted && mpAcikMi() && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); mpKapat(); return; }
    const t = mpTetikOlayi(e);
    if (!t || !['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (mpAcikMi()) mpUygula(); else mpAc(t);
  }, true);
  window.addEventListener('resize', () => mpYerlestir());

  function modelPencereAyarla(acik) {
    depo.modelPencere = acik; yaz('modelPencere', acik);
    if (!acik) mpKapat();
    bildir('Model penceresi ' + (acik ? 'açık' : 'kapalı'));
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
  // Sayfa (claude.ai: mesajlar arasında ok tuşuyla gezinme) panelin tuşunu yakalamasın:
  // betik document-start'ta sayfadan önce dinler; paneldeki tuş önce panele gider, sonra sayfaya hiç inmez (2.4.0)
  for (const tur of ['keydown', 'keyup', 'keypress']) {
    window.addEventListener(tur, e => {
      if (!bizdenMi(e)) return;
      const h = e.composedPath()[0];
      const f = h && h.__stTus && h.__stTus[tur];
      if (f) f(e);
      const yalin = !e.ctrlKey && !e.metaKey && !e.altKey;
      if (e.defaultPrevented || (yalin && /^(Arrow|Page|Home|End)/.test(e.key)) || (yalin && e.key !== 'Escape' && yaziAlaniMi(h))) e.stopImmediatePropagation();
    }, true);
  }
  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && !e.altKey && e.code === 'KeyY') {
      e.preventDefault(); e.stopPropagation();
      paneliAc(!depo.acik);
      return;
    }
    if (e.key === 'Escape') { if (secimModuAcik) secimModu(false); if (durum.acilir) acilirKapat(); }
    ctrlAltHazir = (e.key === 'Control' || e.key === 'Alt') && e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey;
    if (!depo.acik || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    // Ctrl+S: panel açıkken taslağı kaydeder (2.3.0)
    if (e.code === 'KeyS' && !e.shiftKey && taslakSayisi(depo.tema)) { e.preventDefault(); e.stopPropagation(); taslakKaydet(); return; }
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
  GM_registerMenuCommand(`Site Tema: ${SITE} için temayı aç / kapat`, () => temaAcKapa());
  if (PROFIL.ad === 'claude.ai') GM_registerMenuCommand('Model penceresi aç/kapat', () => modelPencereAyarla(!depo.modelPencere));
  for (const ad of temaAdlari()) GM_registerMenuCommand('Tema: ' + ad, () => temaDegistir(ad));
})();
