  /* ================================================================
     OTOMATİK SİTE HARİTASI (0026 3b) — el yapımı haritası olmayan
     sitede sayfanın kendi zemin, yazı ve çerçeve renkleri ölçülür,
     palet rollerine eşlenir ve öğeye işaret olarak yazılır:
       data-st-z  zemin : ana | koyu | kutu | vurgu
       data-st-y  yazı  : ana | soluk | link | vurgu
       data-st-c  çerçeve (değer 1)
     Ölçüm temanın stil sayfası kapalıyken yapılır; böylece sayfanın
     asıl renkleri okunur. Yeni öğeler MutationObserver ile işaretlenir.
     Bu blok kendi başına çalışır (gerçek sayfaya ayrıca enjekte edilip
     denenebilir); dış bağımlılığı yalnız aldığı seçeneklerdir:
       atla(el)      : true dönerse öğe işlenmez (panelin kökü)
       stilKapat(b)  : temanın stil sayfasını kapatır / açar
       etkin()       : false ise ölçüm yapılmaz (tema Orijinal)
     ================================================================ */
  function otoHaritaKur(o) {
    const ISARETLER = ['data-st-z', 'data-st-y', 'data-st-c'];
    const islendi = new WeakSet(), zeminBilgi = new WeakMap();
    const kuyruk = new Set();
    let L0 = null, zaman = 0, sonTur = 0, gozcu = null, sayac = { tur: 0, oge: 0, sure: 0 };
    // Renk metni (rgb, oklch, color()) tuvalle sRGB'ye çevrilir
    const tuval = document.createElement('canvas'); tuval.width = tuval.height = 1;
    const cz = tuval.getContext('2d', { willReadFrequently: true });
    const renkOnbellek = new Map();
    function renk(s) {
      if (!s || s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return null;
      if (renkOnbellek.has(s)) return renkOnbellek.get(s);
      let r = null;
      const m = /^rgba?\(([^)]+)\)$/.exec(s);
      if (m) {
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
        r = [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
      } else {
        cz.clearRect(0, 0, 1, 1); cz.fillStyle = '#000'; cz.fillStyle = s; cz.fillRect(0, 0, 1, 1);
        const d = cz.getImageData(0, 0, 1, 1).data;
        r = [d[0], d[1], d[2], d[3] / 255];
      }
      if (r[3] === 0) r = null;
      if (renkOnbellek.size > 500) renkOnbellek.clear();
      renkOnbellek.set(s, r);
      return r;
    }
    const kanal = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const isik = r => 0.2126 * kanal(r[0]) + 0.7152 * kanal(r[1]) + 0.0722 * kanal(r[2]);
    const karsitlik = (a, b) => { const x = isik(a), y = isik(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const doygunluk = r => { const mx = Math.max(r[0], r[1], r[2]) / 255, mn = Math.min(r[0], r[1], r[2]) / 255, l = (mx + mn) / 2; return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)); };
    const karistir = (on, arka) => on[3] >= 1 ? on : [0, 1, 2].map(i => on[i] * on[3] + arka[i] * (1 - on[3])).concat(1);
    const YAZILI = /^(INPUT|TEXTAREA|SELECT|BUTTON)$/;
    const ATLA = /^(SCRIPT|STYLE|LINK|META|NOSCRIPT|TEMPLATE|BR|HEAD|TITLE|SOURCE|TRACK|IMG|VIDEO|CANVAS|IFRAME|PICTURE|OBJECT|EMBED|AUDIO)$/;
    function yaziTasir(el) {
      if (el.tagName === 'svg' || YAZILI.test(el.tagName)) return true;
      for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && /\S/.test(n.data)) return true;
      return false;
    }
    // Satır içi bağlantı: metin akışındaki <a>; menüdeki ya da düğme gibi bağlantı değil
    function satirIciBag(el) {
      const p = el.parentElement;
      if (!p || /^(NAV|ASIDE|HEADER|FOOTER|BUTTON)$/.test(p.tagName)) return false;
      if (/^(P|LI|TD|DD|BLOCKQUOTE|SPAN|EM|STRONG)$/.test(p.tagName)) return true;
      for (let n = p.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && /\S/.test(n.data)) return true;
      return false;
    }
    // Öğenin altındaki ilk dolu zemin (kendisi dahil); sonuç önbellekte kalır
    function altZemin(el) {
      for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
        if (zeminBilgi.has(e)) { const b = zeminBilgi.get(e); if (b) return b; continue; }
        const r = renk(getComputedStyle(e).backgroundColor);
        const b = r && r[3] >= 0.5 ? { renk: r, rol: null } : null;
        zeminBilgi.set(e, b);
        if (b) return b;
      }
      return { renk: L0 > 0.5 ? [255, 255, 255, 1] : [0, 0, 0, 1], rol: 'ana' };
    }
    function zeminRolu(el, cs, r) {
      const L = isik(r), s = doygunluk(r);
      const k = el.getBoundingClientRect(), alan = k.width * k.height, ekran = innerWidth * innerHeight;
      if (s >= 0.4 && L > 0.03 && L < 0.8 && alan < 0.05 * ekran) return 'vurgu';
      if (Math.abs(L - L0) < 0.02) return 'ana';
      if (alan >= 0.1 * ekran || k.height >= 0.6 * innerHeight || k.width >= 0.6 * innerWidth) return 'koyu';
      return 'kutu';
    }
    function sayfaIsigi() {
      for (const e of [document.body, document.documentElement]) {
        const r = e && renk(getComputedStyle(e).backgroundColor);
        if (r && r[3] >= 0.5) return isik(r);
      }
      return 1;
    }
    function isle(liste) {
      const t0 = performance.now(), yazilacak = [];
      o.stilKapat(true);
      try {
        if (L0 === null) L0 = sayfaIsigi();
        for (const el of liste) {
          // Kod bloğu ve içi işaretlenmez: zemini genel kural verir, sözdizimi renkleri sitenin kalır
          if (!el.isConnected || o.atla(el) || ATLA.test(el.tagName) || el.ownerSVGElement || el.closest('pre')) continue;
          islendi.add(el);
          const cs = getComputedStyle(el);
          // zemin
          const r = renk(cs.backgroundColor);
          let z = null;
          if (r && r[3] >= 0.5 && cs.backgroundImage.indexOf('url(') < 0) z = el === document.body || el === document.documentElement ? 'ana' : zeminRolu(el, cs, r);
          zeminBilgi.set(el, r && r[3] >= 0.5 ? { renk: r, rol: z } : null);
          if (z) yazilacak.push([el, 'data-st-z', z]);
          // yazı
          if (yaziTasir(el)) {
            const y = renk(cs.color), alt = altZemin(el);
            let rol = null;
            if (alt.rol === 'vurgu') rol = 'vurgu';
            else if (el.tagName === 'A' && satirIciBag(el)) rol = 'link';
            else if (y) rol = karsitlik(karistir(y, alt.renk), alt.renk) >= 5.5 ? 'ana' : 'soluk';
            if (rol) yazilacak.push([el, 'data-st-y', rol]);
          }
          // çerçeve
          if (cs.borderTopStyle !== 'none' || cs.borderRightStyle !== 'none' || cs.borderBottomStyle !== 'none' || cs.borderLeftStyle !== 'none') {
            const kalin = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderRightWidth) + parseFloat(cs.borderBottomWidth) + parseFloat(cs.borderLeftWidth);
            const c = renk(cs.borderTopColor) || renk(cs.borderBottomColor) || renk(cs.borderLeftColor);
            if (kalin > 0 && c) yazilacak.push([el, 'data-st-c', '1']);
          }
        }
      } finally { o.stilKapat(false); }
      for (const [el, a, v] of yazilacak) if (el.getAttribute(a) !== v) el.setAttribute(a, v);
      sayac.tur++; sayac.oge += liste.length; sayac.sure = Math.round(performance.now() - t0);
    }
    function topla() {
      const liste = [];
      for (const k of kuyruk) {
        if (!k.isConnected) continue;
        if (!islendi.has(k)) liste.push(k);
        for (const e of k.querySelectorAll('*')) if (!islendi.has(e)) liste.push(e);
        if (liste.length > 6000) break;
      }
      kuyruk.clear();
      return liste;
    }
    function tur() {
      zaman = 0; sonTur = Date.now();
      if (!o.etkin() || !document.body) { kuyruk.clear(); return; }
      const liste = topla();
      if (liste.length) isle(liste);
    }
    // Sık değişen sayfada (akan yanıt) en çok yarım saniyede bir tur
    function planla() {
      if (zaman) return;
      zaman = setTimeout(tur, Math.max(80, 500 - (Date.now() - sonTur)));
    }
    function baslat() {
      if (gozcu || !document.documentElement) return;
      gozcu = new MutationObserver(kayitlar => {
        for (const k of kayitlar) {
          for (const n of k.addedNodes) {
            if (n.nodeType === 1) kuyruk.add(n);
            // Sonradan metin alan öğe yazı rengi için yeniden bakılır
            else if (n.nodeType === 3 && k.target.nodeType === 1 && !k.target.hasAttribute('data-st-y')) { islendi.delete(k.target); kuyruk.add(k.target); }
          }
        }
        if (kuyruk.size) planla();
      });
      gozcu.observe(document.documentElement, { childList: true, subtree: true });
      hepsi();
    }
    function hepsi() { if (document.body) { kuyruk.add(document.documentElement); planla(); } }
    // Bütün işaretleri silip baştan ölçer (sayfanın kendi teması değiştiyse)
    function yenile() {
      for (const a of ISARETLER) for (const e of document.querySelectorAll(`[${a}]`)) e.removeAttribute(a);
      L0 = null;
      kuyruk.clear();
      for (const e of document.querySelectorAll('*')) islendi.delete(e);
      islendi.delete(document.documentElement);
      zeminBilgiSil();
      hepsi();
    }
    function zeminBilgiSil() { for (const e of document.querySelectorAll('*')) zeminBilgi.delete(e); }
    function durdur() { if (gozcu) gozcu.disconnect(); gozcu = null; clearTimeout(zaman); zaman = 0; }
    function ozet() {
      const s = {};
      for (const a of ISARETLER) for (const e of document.querySelectorAll(`[${a}]`)) { const k = a.slice(8) + ':' + e.getAttribute(a); s[k] = (s[k] || 0) + 1; }
      return { roller: s, tur: sayac.tur, oge: sayac.oge, sonSure: sayac.sure, sayfaIsigi: L0 === null ? null : Math.round(L0 * 1000) / 1000 };
    }
    return { baslat, hepsi, yenile, durdur, ozet, simdi: tur };
  }

  // Otomatik haritanın kuralları: renkler palet rollerinden (0026 3b). Önce genel
  // (anlamsal etiket) kurallar, sonra işaretler; :root öneki işareti öne geçirir.
  const GENEL_KURALLAR = String.raw`
html, body { background-color: var(--zemin-ana) !important; color: var(--metin-ana) !important; }
:is(header, nav, aside, footer, [role="banner"], [role="navigation"], [role="complementary"]) { background-color: var(--zemin-koyu) !important; }
:is(input, textarea, select, [contenteditable="true"]) { background-color: var(--zemin-koyu) !important; color: var(--metin-ana) !important; caret-color: var(--metin-parlak) !important; }
::placeholder { color: var(--metin-placeholder) !important; opacity: 1 !important; }
:is([data-placeholder], .placeholder)::before { color: var(--metin-placeholder) !important; }
:is(dialog, [role="dialog"], [role="menu"], [role="listbox"]) { background-color: var(--zemin-kutu) !important; }
pre { background-color: var(--kod-zemin) !important; color: var(--kod-duz) !important; }
pre * { background-color: transparent !important; }
:not(pre) > code { background-color: var(--zemin-kutu) !important; color: var(--kod-satirici) !important; }
:is(p, li, td, dd, blockquote) > a { color: var(--link) !important; }
* { scrollbar-color: var(--kaydirma) transparent; }
:root [data-st-z="ana"] { background-color: var(--zemin-ana) !important; }
:root [data-st-z="koyu"] { background-color: var(--zemin-koyu) !important; }
:root [data-st-z="kutu"] { background-color: var(--zemin-kutu) !important; }
:root [data-st-z="vurgu"] { background-color: var(--vurgu-yesil) !important; }
:root [data-st-y="ana"] { color: var(--metin-ana) !important; }
:root [data-st-y="soluk"] { color: var(--metin-soluk) !important; }
:root [data-st-y="link"] { color: var(--link) !important; }
:root [data-st-y="link"]:hover { color: var(--link-hover) !important; }
:root [data-st-y="vurgu"] { color: var(--zemin-ana) !important; }
:root [data-st-c] { border-color: var(--cerceve) !important; }
`;
