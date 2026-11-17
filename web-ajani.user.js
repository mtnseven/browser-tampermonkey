// ==UserScript==
// @name         Web Ajanı
// @namespace    mtnseven/browser-tampermonkey
// @version      0.3.0
// @description  Makro kaydı gibi: Kaydı başlat, sitede istediğin her yere tıkla, Durdur ve indir. Sayfa haritası, tıklamadan sonra ne değiştiği, ağ istekleri ve hatalar tek dosyaya iner; sayaç neyin kaydedildiğini gösterir. Diğer araçlar: otomatik gez, öğe işaretle, tasarımı oku, fotokopi, toplayıcı. Yalnız izin verilen sitede çalışır (Alt+Shift+W).
// @author       mtnseven
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/web-ajani.user.js
// @downloadURL  https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/web-ajani.user.js
// ==/UserScript==

(function () {
  'use strict';
  const SURUM = '0.3.0';
  const T0 = performance.now();
  const CERCEVE = window.top !== window;
  // Sayfa yüklemesi kimliği: tık numarası her yüklemede 1'den başlar; özet ikisini birlikte kullanır
  const YUKLEME = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  // ------------------------------------------------ izin: yalnız listedeki veya elle açılan sitede çalışır
  // Listede olmayan sitede yalnız Alt+Shift+W dinlenir; başka hiçbir şey kurulmaz.
  const VARSAYILAN_SITELER = ['enabiz.gov.tr', 'claude.ai', 'chatgpt.com'];
  const host = location.hostname.replace(/^www\./, '');
  const IZIN = 'webAjani:izin';
  let izinDeger = null;
  try { izinDeger = localStorage.getItem(IZIN); } catch (e) {}
  const listede = VARSAYILAN_SITELER.some(s => host === s || host.endsWith('.' + s));
  const acik = izinDeger === '1' || (izinDeger !== '0' && listede);
  addEventListener('keydown', e => {
    if (!(e.altKey && e.shiftKey && (e.code === 'KeyW'))) return;
    e.preventDefault();
    try { localStorage.setItem(IZIN, acik ? '0' : '1'); } catch (er) {}
    location.reload();
  }, true);
  if (!acik) return;

  // ------------------------------------------------ KAYIT: makro kaydı gibi; Kaydı başlat ile açılır, Durdur ile kapanır ve dosya iner
  // Kayıt kapalıyken hiçbir şey kaydedilmez. Durum localStorage'da durur: sayfa değişse, yenilense de kayıt sürer.
  // Sayaç başka sekmeyle çakışmasın diye her sekme yalnız kendi farkını ekler.
  const KAYIT = 'webAjani:kayit';
  function kayitOku() { try { const k = JSON.parse(localStorage.getItem(KAYIT)); return k && k.id ? k : null; } catch (e) { return null; } }
  let kayit = kayitOku(), fark = {};
  // Panel durumu (olay() sayacı günceller; panel kodu dosyanın sonunda)
  let kok = null, el$ = {}, araclar = null, sonIs = '', cizBekliyor = false, zamanlayici = null, toplaAdresler = [];
  // Site profili: toplayıcı yalnız profildeki sitede görünür.
  const PROFILLER = { 'enabiz.gov.tr': { toplayici: true } };
  const profil = Object.entries(PROFILLER).find(([s]) => host === s || host.endsWith('.' + s));

  // ------------------------------------------------ kayıt deposu: IndexedDB, toplu yazım
  const DB_AD = 'webAjani', DEPO = 'olay';
  let dbSoz = null;
  function db() {
    if (dbSoz) return dbSoz;
    dbSoz = new Promise((coz, red) => {
      const r = indexedDB.open(DB_AD, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(DEPO, { keyPath: 'no', autoIncrement: true }); };
      r.onsuccess = () => coz(r.result);
      r.onerror = () => red(r.error);
    });
    return dbSoz;
  }
  const kuyruk = [];
  let yazZamani = null;
  const SAYAC_TUR = { tik: 'tik', degisim: 'tik', acilis: 'sayfa', adres: 'sayfa', istek: 'istek', hata: 'hata' };
  function olay(tur, veri) {
    if (!kayit) return null;
    const o = Object.assign({}, veri, { tur, zaman: new Date().toISOString(), sayfa: location.pathname + location.search, yk: YUKLEME });
    if (CERCEVE) o.cerceve = true;
    for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    kuyruk.push(o);
    fark.toplam = (fark.toplam || 0) + 1;
    if (SAYAC_TUR[tur]) fark[SAYAC_TUR[tur]] = (fark[SAYAC_TUR[tur]] || 0) + 1;
    if (!yazZamani) yazZamani = setTimeout(bosalt, 800);
    cizIste();
    return o;
  }
  const say = a => kayit ? (kayit.sayac[a] || 0) + (fark[a] || 0) : 0;
  function sayacYaz() {
    if (!kayit || !Object.keys(fark).length) return;
    const k = kayitOku();
    if (!k || k.id !== kayit.id) { kayit = k; fark = {}; zamanlayiciKur(); cizIste(); return; }
    for (const [a, n] of Object.entries(fark)) k.sayac[a] = (k.sayac[a] || 0) + n;
    try { localStorage.setItem(KAYIT, JSON.stringify(k)); } catch (e) {}
    kayit = k; fark = {};
  }
  // Başka sekmede (veya çerçevede) kayıt başladı, bitti ya da sayaç arttı
  addEventListener('storage', e => {
    if (e.key !== KAYIT) return;
    const k = kayitOku();
    if (!k || !kayit || k.id !== kayit.id) fark = {};
    kayit = k;
    zamanlayiciKur(); cizIste();
  });
  function bosalt() {
    yazZamani = null;
    sayacYaz();
    if (!kuyruk.length) return Promise.resolve();
    const parti = kuyruk.splice(0);
    return db().then(d => new Promise(coz => {
      const tx = d.transaction(DEPO, 'readwrite');
      const st = tx.objectStore(DEPO);
      for (const o of parti) st.add(o);
      tx.oncomplete = coz; tx.onerror = coz; tx.onabort = coz;
    })).catch(() => {});
  }
  addEventListener('pagehide', bosalt);
  function hepsiniOku() {
    return bosalt().then(db).then(d => new Promise(coz => {
      const r = d.transaction(DEPO).objectStore(DEPO).getAll();
      r.onsuccess = () => coz(r.result || []); r.onerror = () => coz([]);
    }));
  }
  function temizle() {
    kuyruk.length = 0;
    return db().then(d => new Promise(coz => {
      const tx = d.transaction(DEPO, 'readwrite'); tx.objectStore(DEPO).clear(); tx.oncomplete = coz; tx.onerror = coz;
    }));
  }

  // ------------------------------------------------ yardımcılar
  const KOK_ID = 'web-ajani-kok';
  const bizim = el => !!(el && el.closest && el.closest('#' + KOK_ID));
  const kirp = (t, n) => { t = (t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; };
  function gorunur(el) {
    if (!el.getClientRects().length) return false;
    const c = getComputedStyle(el);
    return c.visibility !== 'hidden' && c.display !== 'none';
  }
  // Güvenlik freni: veri değiştiren düğme. Araç bunlara kendiliğinden basmaz; haritada işaretlenir.
  // \b Türkçe harfte çalışmaz; sözcük sınırı harf sınıfıyla kurulur.
  const FREN = /(^|[^\p{L}])(sil|silin|delete|remove|kaldır|gönder|send|submit|paylaş|share|değerlendir|evaluate|kaydet|save|onayla|confirm|öde|pay|satın al|buy|çıkış|logout|sign out|do not show on my profile|hide in share|profilimde gösterme)(?=$|[^\p{L}])/iu;
  const frenli = el => FREN.test(((el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title'))) || '') + ' ' + (el.textContent || '') + ' ' + (el.value || ''));
  // Gizli alan: parola, kart, tek kullanımlık kod. Değeri hiçbir yerde kaydedilmez.
  const GIZLI_AD = /pass|parola|şifre|sifre|token|otp|captcha|cvv|cvc|kart|card|secret|pin\b|tckn|kimlik/i;
  function gizliAlan(el) {
    if (!el || !el.tagName) return false;
    const t = (el.getAttribute('type') || '').toLowerCase();
    return t === 'password' || t === 'hidden' || /cc-|one-time-code|password/.test(el.getAttribute('autocomplete') || '') || GIZLI_AD.test((el.name || '') + ' ' + (el.id || ''));
  }

  // Sağlam seçici: kimlik, test etiketi, aria-label, ad; olmazsa kararlı sınıflar ve sıra numarasıyla yol.
  const OYNAK = /(^|[-_])[a-z0-9]*\d[a-z0-9]{4,}$|^css-|^sc-|^jsx-|^_|__[a-z0-9]{5,}$|^[a-zA-Z0-9]{6,}$(?<=\d.*)/;
  const kacis = s => (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/[^\w-]/g, '\\$&');
  function tekMi(sec, el) { try { const l = document.querySelectorAll(sec); return l.length === 1 && l[0] === el; } catch (e) { return false; } }
  function parca(el) {
    const tag = el.tagName.toLowerCase();
    for (const a of ['data-testid', 'data-test', 'data-qa', 'aria-label', 'name', 'role']) {
      const v = el.getAttribute(a);
      if (v && v.length < 60) return tag + '[' + a + '="' + v.replace(/"/g, '\\"') + '"]';
    }
    const sinif = [...el.classList].filter(c => !OYNAK.test(c) && c.length < 30).slice(0, 2);
    return tag + sinif.map(c => '.' + kacis(c)).join('');
  }
  function secici(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id && !/\d{3,}|:/.test(el.id) && tekMi('#' + kacis(el.id), el)) return '#' + kacis(el.id);
    const yol = [];
    let e = el;
    while (e && e.nodeType === 1 && e !== document.documentElement) {
      let p = parca(e);
      if (e.id && !/\d{3,}|:/.test(e.id)) p = '#' + kacis(e.id);
      const ana = e.parentElement;
      if (ana && !p.startsWith('#')) {
        const ayni = [...ana.children].filter(k => { try { return k.matches(p); } catch (x) { return false; } });
        if (ayni.length > 1) p += ':nth-of-type(' + ([...ana.children].filter(k => k.tagName === e.tagName).indexOf(e) + 1) + ')';
      }
      yol.unshift(p);
      const s = yol.join(' > ');
      if (tekMi(s, el)) return s;
      if (p.startsWith('#')) break;
      e = ana;
    }
    return yol.join(' > ');
  }
  function oge(el) {
    const o = { etiket: el.tagName.toLowerCase(), metin: kirp(el.getAttribute('aria-label') || el.textContent || el.value || el.getAttribute('title') || el.getAttribute('placeholder') || '', 60), secici: secici(el) };
    const rol = el.getAttribute('role'); if (rol) o.rol = rol;
    if (el.getAttribute('href')) { try { o.adres = new URL(el.getAttribute('href'), location.href).href.replace(location.origin, ''); } catch (e) {} }
    if (el.hasAttribute('aria-expanded')) o.acik = el.getAttribute('aria-expanded');
    if (el.hasAttribute('aria-haspopup')) o.acilir = el.getAttribute('aria-haspopup') || true;
    if (el.getAttribute('onclick')) o.onclick = kirp(el.getAttribute('onclick'), 120);
    if (el.target === '_blank') o.yeniSekme = true;
    if (frenli(el)) o.frenli = true;
    return o;
  }
  function ozet(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

  // ------------------------------------------------ HARİTA: bir kökün (sayfa veya açılan pencere) yapısı
  const TIK = 'a[href], button, input[type=button], input[type=submit], input[type=reset], summary, [role=button], [role=tab], [role=menuitem], [role=link], [role=option], [role=checkbox], [role=radio], [role=switch], [onclick], [aria-haspopup], [aria-expanded]';
  function harita(kok) {
    kok = kok || document.body;
    const sinir = 400;
    const tiklanabilir = [];
    for (const el of kok.querySelectorAll(TIK)) {
      if (bizim(el) || !gorunur(el)) continue;
      tiklanabilir.push(oge(el));
      if (tiklanabilir.length >= sinir) break;
    }
    const secimler = [...kok.querySelectorAll('select')].filter(e => !bizim(e)).map(s => ({
      secici: secici(s), ad: s.name || s.id || '', etiket: etiketBul(s),
      secenekler: [...s.options].map(o => kirp(o.textContent, 50)).slice(0, 200),
      secili: s.selectedIndex >= 0 ? kirp(s.options[s.selectedIndex].textContent, 50) : null
    }));
    const alanlar = [...kok.querySelectorAll('input:not([type=button]):not([type=submit]):not([type=hidden]), textarea, [contenteditable=""], [contenteditable=true]')]
      .filter(e => !bizim(e) && gorunur(e)).slice(0, 80).map(e => ({
        secici: secici(e), tur: e.getAttribute('type') || e.tagName.toLowerCase(), ad: e.name || '', etiket: etiketBul(e),
        yerTutucu: kirp(e.getAttribute('placeholder') || '', 50), arama: /search|ara/i.test((e.type || '') + ' ' + (e.name || '') + ' ' + (e.placeholder || '') + ' ' + (e.getAttribute('role') || '')), gizli: gizliAlan(e) || undefined
      }));
    const sekmeler = [...kok.querySelectorAll('[role=tab], .nav-tabs a, .nav-tabs button, .nav-link, .tab-link')].filter(e => !bizim(e) && gorunur(e))
      .map(e => ({ metin: kirp(e.textContent, 40), secici: secici(e), secili: e.getAttribute('aria-selected') === 'true' || e.classList.contains('active') }));
    const sayfalama = [...kok.querySelectorAll('.pagination, .pager, nav[aria-label*="age" i], nav[aria-label*="sayfa" i], [class*="paginat" i]')].filter(e => !bizim(e) && gorunur(e)).slice(0, 5).map(p => {
      const sayilar = [...p.querySelectorAll('a, button, li, span')].map(e => (e.textContent || '').trim()).filter(t => /^\d+$/.test(t)).map(Number);
      return { secici: secici(p), sayfalar: [...new Set(sayilar)].slice(0, 50), enBuyuk: sayilar.length ? Math.max(...sayilar) : null, metin: kirp(p.textContent, 80) };
    });
    const tablolar = [...kok.querySelectorAll('table, [role=table], [role=grid]')].filter(e => !bizim(e) && gorunur(e)).slice(0, 20).map(t => ({
      secici: secici(t),
      sutunlar: [...t.querySelectorAll('th, [role=columnheader]')].map(e => kirp(e.textContent, 40)).filter(Boolean).slice(0, 40),
      satir: t.querySelectorAll('tbody tr, [role=row]').length
    }));
    const iframeler = [...kok.querySelectorAll('iframe, embed, object')].filter(e => !bizim(e)).map(f => ({ secici: secici(f), adres: kirp(f.getAttribute('src') || f.getAttribute('data') || '', 160) }));
    return { tiklanabilir, secimler, alanlar, sekmeler, sayfalama, tablolar, kaliplar: kaliplar(kok), iframeler };
  }
  function etiketBul(el) {
    if (el.id) { const l = document.querySelector('label[for="' + kacis(el.id) + '"]'); if (l) return kirp(l.textContent, 50); }
    const l = el.closest('label'); if (l) return kirp(l.textContent, 50);
    return kirp(el.getAttribute('aria-label') || '', 50);
  }
  // Tekrarlanan kart kalıbı: aynı ebeveynde aynı etiket+sınıf imzasını taşıyan en az 3 kardeş.
  function kaliplar(kok) {
    const bulunan = [];
    const ebeveynler = new Set();
    for (const el of kok.querySelectorAll('div, li, article, section, tr')) {
      if (el.parentElement && el.parentElement.children.length >= 3) ebeveynler.add(el.parentElement);
      if (ebeveynler.size > 1500) break;
    }
    for (const p of ebeveynler) {
      if (bizim(p)) continue;
      const grup = {};
      for (const k of p.children) {
        if (k.tagName === 'TR' || k.tagName === 'OPTION' || k.tagName === 'SCRIPT') continue;
        const imza = k.tagName + '.' + [...k.classList].filter(c => !OYNAK.test(c)).sort().join('.');
        (grup[imza] = grup[imza] || []).push(k);
      }
      for (const [imza, l] of Object.entries(grup)) {
        if (l.length < 3 || l[0].children.length < 2 || (l[0].textContent || '').trim().length < 20) continue;
        bulunan.push({ kapsayici: secici(p), imza, sayi: l.length, ornekAlanlar: [...l[0].querySelectorAll('*')].filter(e => !e.children.length).map(e => kirp(e.textContent, 30)).filter(Boolean).slice(0, 12) });
      }
      if (bulunan.length >= 20) break;
    }
    return bulunan;
  }
  const haritaImzalari = new Set();
  function haritaKaydet(neden, kok, ad) {
    if (!kayit) return null;
    const h = harita(kok);
    const imza = ozet(location.pathname + (ad || '') + JSON.stringify(h));
    if (haritaImzalari.has(imza)) return null;
    haritaImzalari.add(imza);
    return olay('harita', { neden, kok: ad || 'sayfa', baslik: document.title, imza, harita: h });
  }

  // ------------------------------------------------ DURUM KAYDI: tıklamadan sonra ne değişti
  let sonTik = null, tikNo = 0;
  let gozlemci = null, durumZamani = null, degisim = null, sonHaritaTik = 0;
  const PENCERE = '[role=dialog], [role=alertdialog], dialog[open], .modal.show, .modal.in, .modal[style*="block"], .swal2-popup, .ui-dialog, .popover, [role=menu], [role=listbox], [role=tabpanel]';
  function tikla(e) {
    if (!kayit || bizim(e.target)) return;
    if (isaretlemede) return;
    const el = e.target.closest ? (e.target.closest(TIK) || e.target) : null;
    if (!el) return;
    tikNo++;
    sonTik = { no: tikNo, zaman: Date.now(), oge: oge(el) };
    olay('tik', { tikNo, oge: sonTik.oge, kesif: kesifte || undefined });
    if (!kesifte) bildir('Kaydedildi · tık "' + (sonTik.oge.metin || sonTik.oge.etiket) + '"');
    durumIzle();
  }
  function durumIzle() {
    if (gozlemci) { gozlemci.disconnect(); clearTimeout(durumZamani); durumBitir(); }
    degisim = { tikNo, adres: location.href, eklenen: new Set(), oznitelik: new Set(), metinDegisti: 0 };
    gozlemci = new MutationObserver(kayitlar => {
      for (const k of kayitlar) {
        if (bizim(k.target)) continue;
        if (k.type === 'childList') { for (const n of k.addedNodes) if (n.nodeType === 1 && !bizim(n)) degisim.eklenen.add(n); }
        else if (k.type === 'attributes') degisim.oznitelik.add(k.target);
        else degisim.metinDegisti++;
      }
    });
    gozlemci.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-expanded', 'aria-selected', 'aria-hidden'], characterData: true });
    durumZamani = setTimeout(durumBitir, 1500);
  }
  function durumBitir() {
    if (!gozlemci || !degisim) return;
    gozlemci.disconnect(); gozlemci = null;
    const d = degisim; degisim = null;
    const sonuc = { tikNo: d.tikNo, adresDegisti: location.href !== d.adres ? location.href.replace(location.origin, '') : undefined, acilanlar: [] };
    const adaylar = new Set();
    for (const n of [...d.eklenen, ...d.oznitelik]) {
      if (!n.isConnected) continue;
      const p = n.matches && n.matches(PENCERE) ? n : (n.closest && n.closest(PENCERE)) || (n.querySelector && n.querySelector(PENCERE));
      if (p && gorunur(p)) adaylar.add(p);
      else if (n.tagName === 'IFRAME' || n.tagName === 'EMBED' || n.tagName === 'OBJECT') adaylar.add(n);
    }
    // İçteki pencere dıştakinin içindeyse yalnız dıştaki kalır.
    const liste = [...adaylar].filter(p => ![...adaylar].some(q => q !== p && q.contains(p)));
    for (const p of liste.slice(0, 5)) {
      const b = p.querySelector && p.querySelector('.modal-title, h1, h2, h3, h4, h5, [role=heading]');
      const a = { tur: p.getAttribute('role') || p.tagName.toLowerCase(), secici: secici(p), baslik: kirp(b ? b.textContent : (p.getAttribute('aria-label') || ''), 60) };
      if (p.tagName === 'IFRAME' || p.tagName === 'EMBED' || p.tagName === 'OBJECT') a.adres = p.getAttribute('src') || p.getAttribute('data');
      else {
        a.icerik = (p.innerText || '').slice(0, 30000);
        a.harita = harita(p);
      }
      sonuc.acilanlar.push(a);
    }
    sonuc.eklenenOge = d.eklenen.size; sonuc.degisenOge = d.oznitelik.size;
    if (!sonuc.acilanlar.length && !sonuc.adresDegisti && !d.eklenen.size && !d.oznitelik.size && !d.metinDegisti) sonuc.degisimYok = true;
    olay('durum', sonuc);
    // Sayfa büyük ölçüde değiştiyse (sekme içeriği, sayfa numarası) sayfa haritası yenilenir; aynıysa yazılmaz.
    // Sayfa büyük ölçüde değiştiyse (sayfa numarası, liste yenilendi) sayfa haritası yenilenir; en çok 10 sn'de bir.
    if ((sonuc.adresDegisti || (d.eklenen.size >= 10 && !sonuc.acilanlar.length)) && Date.now() - sonHaritaTik > 10000) {
      sonHaritaTik = Date.now();
      (window.requestIdleCallback || (f => setTimeout(f, 200)))(() => haritaKaydet('tik ' + d.tikNo), { timeout: 2000 });
    }
  }
  // Seçim değişikliği: açılır listede seçilen seçenek; metin kutusunda yalnız uzunluk.
  function degisti(e) {
    const el = e.target;
    if (!kayit || bizim(el) || !el.tagName) return;
    const o = { tikNo, oge: { etiket: el.tagName.toLowerCase(), secici: secici(el), ad: el.name || '' } };
    if (el.tagName === 'SELECT') o.secilen = kirp(el.options[el.selectedIndex] ? el.options[el.selectedIndex].textContent : '', 60);
    else if (el.type === 'checkbox' || el.type === 'radio') o.isaretli = el.checked;
    else if (gizliAlan(el)) o.gizli = true;
    else o.uzunluk = (el.value || '').length;
    olay('degisim', o);
    if (!kesifte) bildir('Kaydedildi · ' + (o.secilen != null ? 'seçim "' + o.secilen + '"' : 'alan ' + (o.oge.ad || o.oge.etiket)));
  }

  // Adres değişikliği (tek sayfa uygulamaları) ve açılan yeni pencereler
  function adresDegisti(neden) { if (!kayit) return; olay('adres', { neden, adres: location.href.replace(location.origin, '') }); setTimeout(() => haritaKaydet('adres'), 1200); }
  for (const f of ['pushState', 'replaceState']) {
    const asil = history[f];
    history[f] = function () { const r = asil.apply(this, arguments); adresDegisti(f); return r; };
  }
  addEventListener('popstate', () => adresDegisti('popstate'));
  const asilOpen = window.open;
  window.open = function (url, hedef) {
    olay('pencere', { tikNo: sonTik ? sonTik.no : null, adres: String(url || ''), hedef: hedef || '' });
    return asilOpen.apply(this, arguments);
  };

  // ------------------------------------------------ AĞ KAYDI: fetch ve XHR, değerleriyle
  const YANIT_SINIRI = 256 * 1024;
  const IKILI = /image|video|audio|font|octet-stream|zip|pdf/i;
  function govdeTemizle(g) {
    if (g == null) return null;
    let t;
    if (typeof g === 'string') t = g;
    else if (g instanceof URLSearchParams) t = g.toString();
    else if (typeof FormData !== 'undefined' && g instanceof FormData) { const o = {}; for (const [k, v] of g.entries()) o[k] = typeof v === 'string' ? v : '<dosya>'; t = JSON.stringify(o); }
    else return '<' + (g.constructor ? g.constructor.name : typeof g) + '>';
    // Parola ve benzeri anahtarların değeri gizlenir (JSON ve form gövdesi).
    try {
      const j = JSON.parse(t);
      const gez = v => { if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (GIZLI_AD.test(k)) v[k] = '<gizli>'; else gez(v[k]); } };
      gez(j); return JSON.stringify(j).slice(0, YANIT_SINIRI);
    } catch (e) {}
    if (/=/.test(t) && !/\s/.test(t.slice(0, 200))) {
      const p = new URLSearchParams(t);
      for (const k of [...p.keys()]) if (GIZLI_AD.test(k)) p.set(k, '<gizli>');
      return p.toString().slice(0, YANIT_SINIRI);
    }
    return t.slice(0, YANIT_SINIRI);
  }
  function adresTemizle(u) {
    try {
      const x = new URL(u, location.href);
      for (const k of [...x.searchParams.keys()]) if (GIZLI_AD.test(k)) x.searchParams.set(k, '<gizli>');
      return x.origin === location.origin ? x.pathname + x.search : x.href;
    } catch (e) { return String(u); }
  }
  // İstek başlıkları: toplayıcının isteği aynen yeniden kurabilmesi için. Gizli başlığın değeri tutulmaz.
  const GIZLI_BASLIK = /authorization|cookie|token|secret|key|verification|csrf|xsrf/i;
  function basliklarTemizle(b) {
    const o = {};
    try {
      const l = b instanceof Headers ? [...b.entries()] : Array.isArray(b) ? b : Object.entries(b || {});
      for (const [k, v] of l) o[k.toLowerCase()] = GIZLI_BASLIK.test(k) ? '<gizli>' : String(v).slice(0, 200);
    } catch (e) {}
    return Object.keys(o).length ? o : undefined;
  }
  function istekKaydet(o) {
    if (!kayit || /\.(js|mjs|css|png|jpe?g|gif|webp|svg|woff2?|ttf|ico|map)(\?|$)/i.test(o.adres)) return;
    const tik = sonTik && Date.now() - sonTik.zaman < 4000 ? sonTik.no : null;
    const ist = { yontem: (o.yontem || 'GET').toUpperCase(), adres: adresTemizle(o.adres), durum: o.durum, icerikTuru: o.tur || '', sure: o.sure, tikNo: tik, istek: govdeTemizle(o.govde), basliklar: basliklarTemizle(o.basliklar) };
    if (o.metin != null) { ist.yanit = o.metin.slice(0, YANIT_SINIRI); if (o.metin.length > YANIT_SINIRI) ist.kesildi = o.metin.length; }
    if (o.hata) ist.hata = o.hata;
    if (o.yonlendi) ist.yonlendi = o.yonlendi;
    olay('istek', ist);
    if (o.hata || o.durum >= 400) olay('hata', { kaynak: 'istek', mesaj: ist.yontem + ' ' + ist.adres + ' → ' + (o.hata || o.durum), tikNo: tik });
  }
  // Süren istek sayısı: keşif ve toplayıcı sayfanın sakinleşmesini bununla bekler.
  // Kanca izinli sitede hep kurulur (kayıt sayfa ortasında başlayabilir); kayıt kapalıyken isteğe dokunmadan geçer.
  let bekleyen = 0;
  const ASIL_FETCH = window.fetch;
  {
    if (ASIL_FETCH) window.fetch = function (girdi, secenek) {
      const adres = typeof girdi === 'string' ? girdi : (girdi && girdi.url) || String(girdi);
      const yontem = (secenek && secenek.method) || (girdi && girdi.method) || 'GET';
      const govde = secenek && secenek.body;
      const basliklar = (secenek && secenek.headers) || (girdi && girdi.headers);
      const t = performance.now();
      bekleyen++;
      return ASIL_FETCH.apply(this, arguments).then(r => {
        bekleyen--;
        const tur = r.headers.get('content-type') || '';
        const k = { yontem, adres, govde, basliklar, durum: r.status, tur, sure: Math.round(performance.now() - t), yonlendi: r.redirected ? r.url : undefined };
        if (!kayit || IKILI.test(tur) || tur.includes('event-stream')) istekKaydet(k);
        else r.clone().text().then(m => { k.metin = m; istekKaydet(k); }).catch(() => istekKaydet(k));
        return r;
      }, err => { bekleyen--; istekKaydet({ yontem, adres, govde, basliklar, durum: 0, hata: String(err && err.message || err), sure: Math.round(performance.now() - t) }); throw err; });
    };
    const xOpen = XMLHttpRequest.prototype.open, xSend = XMLHttpRequest.prototype.send, xBaslik = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.open = function (m, u) { this.__wa = { yontem: m, adres: u, basliklar: [] }; return xOpen.apply(this, arguments); };
    XMLHttpRequest.prototype.setRequestHeader = function (k, v) { if (this.__wa) this.__wa.basliklar.push([k, v]); return xBaslik.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function (govde) {
      const x = this, k = x.__wa;
      if (k) {
        const t = performance.now();
        bekleyen++;
        x.addEventListener('loadend', () => {
          bekleyen--;
          const tur = x.getResponseHeader('content-type') || '';
          let metin = null;
          try { if (!kayit) metin = null; else if (!IKILI.test(tur) && (x.responseType === '' || x.responseType === 'text')) metin = x.responseText; else if (x.responseType === 'json') metin = JSON.stringify(x.response); } catch (e) {}
          istekKaydet({ yontem: k.yontem, adres: k.adres, govde, basliklar: k.basliklar, durum: x.status, tur, metin, sure: Math.round(performance.now() - t), hata: x.status === 0 ? 'ağ hatası' : undefined, yonlendi: x.responseURL && x.responseURL !== new URL(k.adres, location.href).href ? x.responseURL : undefined });
        });
      }
      return xSend.apply(this, arguments);
    };
  }

  // ------------------------------------------------ HATA GÜNLÜĞÜ (kayıt kapalıyken olay() hiçbir şey yazmaz)
  {
    addEventListener('error', e => {
      if (e.target && e.target !== window && e.target.tagName) {
        if (bizim(e.target)) return;
        olay('hata', { kaynak: 'dosya', mesaj: 'yüklenemedi: ' + e.target.tagName.toLowerCase() + ' ' + kirp(e.target.src || e.target.href || '', 200) });
      } else olay('hata', { kaynak: 'betik', mesaj: kirp(e.message, 400), dosya: e.filename, satir: e.lineno, sutun: e.colno, yigin: e.error && e.error.stack ? String(e.error.stack).slice(0, 2000) : undefined });
    }, true);
    addEventListener('unhandledrejection', e => {
      const r = e.reason;
      olay('hata', { kaynak: 'söz', mesaj: kirp(r && r.message || String(r), 400), yigin: r && r.stack ? String(r.stack).slice(0, 2000) : undefined });
    });
    const asilHata = console.error;
    console.error = function () {
      if (kayit) try { olay('hata', { kaynak: 'konsol', mesaj: kirp([...arguments].map(a => a && a.stack ? a.stack : (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '), 2000) }); } catch (e) {}
      return asilHata.apply(this, arguments);
    };
  }

  // ------------------------------------------------ TASARIM OKUYUCU
  const STIL_OZ = ['color', 'background-color', 'background-image', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'border', 'border-radius', 'box-shadow', 'padding', 'margin', 'display', 'position', 'width', 'height', 'opacity', 'z-index', 'gap'];
  function stilOku(el) {
    const c = getComputedStyle(el), o = {};
    for (const k of STIL_OZ) { const v = c.getPropertyValue(k); if (v && v !== 'none' && v !== 'normal' && v !== 'auto' && v !== '0px') o[k] = v; }
    return o;
  }
  // Öğenin görünen zemini: saydam zeminde ebeveyne çıkılır.
  function gercekZemin(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const z = getComputedStyle(e).backgroundColor;
      if (z && z !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(z)) return { renk: z, kimden: e === el ? 'kendisi' : secici(e) };
    }
    return { renk: 'tarayıcı varsayılanı' };
  }
  // Öğeye uyan CSS kurallarında geçen değişkenler (var(--x)); farklı kökenli stil dosyaları okunamaz.
  function kullanilanDegiskenler(el) {
    const bulunan = new Set();
    for (const s of document.styleSheets) {
      let kurallar; try { kurallar = s.cssRules; } catch (e) { continue; }
      const gez = l => { for (const r of l) {
        if (r.cssRules && !r.selectorText) { gez(r.cssRules); continue; }
        if (!r.selectorText || !r.style) continue;
        let uyar = false; try { uyar = el.matches(r.selectorText); } catch (e) {}
        if (!uyar) continue;
        for (const m of r.style.cssText.matchAll(/var\((--[\w-]+)/g)) bulunan.add(m[1]);
      } };
      gez(kurallar);
      if (bulunan.size > 80) break;
    }
    const c = getComputedStyle(el);
    return [...bulunan].map(d => ({ ad: d, deger: c.getPropertyValue(d).trim() }));
  }
  function sayfaTasarimi() {
    const kok = getComputedStyle(document.documentElement);
    const degiskenler = {};
    for (const s of document.styleSheets) {
      let kurallar; try { kurallar = s.cssRules; } catch (e) { continue; }
      const gez = l => { for (const r of l) {
        if (r.cssRules && !r.selectorText) { gez(r.cssRules); continue; }
        if (!r.style || !r.selectorText || !/(:root|^html|^body|\[data-theme|\.dark|\.light)/.test(r.selectorText)) continue;
        for (let i = 0; i < r.style.length; i++) { const ad = r.style[i]; if (ad.startsWith('--') && Object.keys(degiskenler).length < 600) degiskenler[ad] = (kok.getPropertyValue(ad) || r.style.getPropertyValue(ad)).trim(); }
      } };
      gez(kurallar);
    }
    const renk = {}, zemin = {}, font = {}, boyut = {};
    let n = 0;
    for (const el of document.body.querySelectorAll('*')) {
      if (n > 4000) break;
      if (bizim(el) || !el.getClientRects().length) continue;
      n++;
      const c = getComputedStyle(el);
      if ((el.childNodes[0] && el.childNodes[0].nodeType === 3 && el.childNodes[0].textContent.trim())) {
        renk[c.color] = (renk[c.color] || 0) + 1;
        font[c.fontFamily] = (font[c.fontFamily] || 0) + 1;
        boyut[c.fontSize] = (boyut[c.fontSize] || 0) + 1;
      }
      if (c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.backgroundColor !== 'transparent') zemin[c.backgroundColor] = (zemin[c.backgroundColor] || 0) + 1;
    }
    const sirala = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([d, s]) => ({ deger: d, sayi: s }));
    return olay('tasarim', { baslik: document.title, renkSemasi: kok.colorScheme || '', degiskenler, yaziRenkleri: sirala(renk), zeminler: sirala(zemin), yaziTipleri: sirala(font), boyutlar: sirala(boyut), bakilanOge: n });
  }

  // ------------------------------------------------ ÖĞE İŞARETÇİ
  let isaretlemede = false, vurgu = null, uzerindeki = null;
  function isaretciAc() {
    isaretlemede = true;
    vurgu = vurgu || Object.assign(document.createElement('div'), { id: KOK_ID + '-vurgu' });
    vurgu.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;border:2px solid #f59e0b;background:#f59e0b22;border-radius:3px;transition:all 60ms';
    (document.body || document.documentElement).appendChild(vurgu);
    bildir('İşaretle: öğeye tıkla · Esc vazgeç');
  }
  function isaretciKapat() {
    isaretlemede = false; uzerindeki = null;
    if (vurgu) vurgu.remove();
    bildir('');
  }
  addEventListener('mousemove', e => {
    if (!isaretlemede) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || bizim(el) || el === uzerindeki || (vurgu && el === vurgu)) return;
    uzerindeki = el;
    const r = el.getBoundingClientRect();
    Object.assign(vurgu.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  }, true);
  function isaretle(el) {
    const cevre = [];
    for (let e = el.parentElement, i = 0; e && e !== document.documentElement && i < 6; e = e.parentElement, i++) cevre.push({ etiket: e.tagName.toLowerCase(), secici: secici(e), sinif: kirp(e.className && e.className.baseVal === undefined ? e.className : '', 120), rol: e.getAttribute('role') || undefined });
    const is = {
      oge: oge(el), sinif: kirp(typeof el.className === 'string' ? el.className : '', 200),
      oznitelikler: Object.fromEntries([...el.attributes].filter(a => a.name !== 'value' && a.name !== 'class' && a.name !== 'style').slice(0, 20).map(a => [a.name, kirp(a.value, 120)])),
      cevre, kardes: el.parentElement ? el.parentElement.children.length : 0,
      eslesme: (() => { try { return document.querySelectorAll(secici(el)).length; } catch (e) { return 0; } })(),
      html: el.outerHTML.slice(0, 1500)
    };
    is.stil = stilOku(el); is.zemin = gercekZemin(el); is.degiskenler = kullanilanDegiskenler(el);
    if (gizliAlan(el)) delete is.html;
    olay('isaret', is);
    bildir('İşaretlendi: ' + is.oge.secici);
  }
  // İşaretleme sırasında sayfanın kendi tıklaması çalışmaz.
  for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) addEventListener(t, e => {
    if (!isaretlemede || bizim(e.target)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (t === 'click') { const el = document.elementFromPoint(e.clientX, e.clientY) || e.target; isaretciKapat(); isaretle(el); }
  }, true);
  addEventListener('keydown', e => { if (isaretlemede && e.key === 'Escape') isaretciKapat(); }, true);

  // ------------------------------------------------ SAKİNLİK: istek bitti, sayfa bir süre değişmedi
  // Gezmeyi durdur süren bekleyişi hemen bitirir (uyandir).
  let uyandir = null;
  function sakinBekle(enCok, sessiz) {
    enCok = enCok || 5000; sessiz = sessiz || 600;
    return new Promise(coz => {
      const t0 = Date.now(); let son = Date.now(), z = null;
      const g = new MutationObserver(() => { son = Date.now(); });
      g.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
      const bitir = () => { g.disconnect(); clearTimeout(z); if (uyandir === bitir) uyandir = null; coz(); };
      uyandir = bitir;
      const bak = () => {
        const simdi = Date.now();
        if ((bekleyen <= 0 && simdi - son >= sessiz && simdi - t0 >= 300) || simdi - t0 >= enCok) bitir();
        else z = setTimeout(bak, 100);
      };
      z = setTimeout(bak, 150);
    });
  }
  const bekle = ms => new Promise(c => setTimeout(c, ms));

  // ------------------------------------------------ OTOMATİK GEZ (keşif)
  // Metin'in elle gezdiğini tamamlar: pencere ve sayfa sekmeleri, açılır listelerin seçenekleri, kapalı bölümler,
  // ikinci sayfa, her kart kalıbının ilk kartı, en son aynı sitedeki başka sayfalara giden bağlantılar.
  // Başka sayfaya geçilirse o sayfa kaydedilir, başlangıç sayfasına dönülür ve kalan yerlerden devam edilir;
  // denenenler sessionStorage'da durur, aynı öğeye iki kez basılmaz. Frenli düğmeye, çıkış ve dosya bağlantısına,
  // yeni sekme açan bağlantıya ve form gönderen düğmeye basmaz. Gez sürerken confirm/alert/prompt engellenir (hayır).
  const GEZ = 'webAjani:gez';
  const KESIF_SINIR = 150, SAYFA_SINIR = 40;
  let kesifte = false, kesifDur = false;
  function gezOku() { try { return JSON.parse(sessionStorage.getItem(GEZ)); } catch (e) { return null; } }
  function gezYaz(g) { try { if (g) sessionStorage.setItem(GEZ, JSON.stringify(g)); else sessionStorage.removeItem(GEZ); } catch (e) {} }
  const adresYok = () => location.href.split('#')[0];
  const SEKME = '[role=tab], .nav-tabs a, .nav-tabs button, .nav-pills a, .nav-pills button, .tab-link, [data-toggle=tab], [data-bs-toggle=tab]';
  const CIKIS = /log-?out|sign-?out|cikis|çıkış|oturumu?kapat|exit/i;
  const DOSYA = /\.(pdf|zip|rar|7z|docx?|xlsx?|pptx?|csv|jpe?g|png|gif|mp4|mp3|exe|apk)$/i;
  function acikPencere() {
    const l = [...document.querySelectorAll(PENCERE)].filter(p => !bizim(p) && gorunur(p) && !p.matches('[role=tabpanel], [role=listbox], [role=menu]'));
    return l.length ? l[l.length - 1] : null;
  }
  // baskaSayfa: aynı sitedeki başka sayfaya giden bağlantıya izin (gezin son adımı)
  function guvenliMi(el, baskaSayfa) {
    if (!el || !el.isConnected || bizim(el) || frenli(el) || !gorunur(el)) return false;
    if (el.closest('[disabled], [aria-disabled=true]')) return false;
    const a = el.closest('a[href]');
    if (a) {
      const h = (a.getAttribute('href') || '').trim();
      if (a.target === '_blank' || a.hasAttribute('download')) return false;
      if (h && !/^(#|javascript:)/i.test(h)) {
        let u; try { u = new URL(h, location.href); } catch (e) { return false; }
        if (u.origin !== location.origin || CIKIS.test(u.pathname + u.search) || DOSYA.test(u.pathname)) return false;
        if (u.pathname + u.search !== location.pathname + location.search && !baskaSayfa) return false;
      }
    }
    const f = el.closest('form');
    if (f && (el.type === 'submit' || (el.tagName === 'BUTTON' && !el.getAttribute('type')))) return false;
    return true;
  }
  function pencereKapat(p) {
    const kapat = [...p.querySelectorAll('[data-dismiss], [data-bs-dismiss], .close, .btn-close, [aria-label], button')]
      .find(b => gorunur(b) && (b.matches('[data-dismiss], [data-bs-dismiss], .close, .btn-close') || /^(kapat|close|×|x|tamam|ok|vazgeç|iptal|cancel)$/i.test((b.getAttribute('aria-label') || b.textContent || '').trim())));
    if (kapat && !frenli(kapat)) { kapat.click(); return true; }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    return false;
  }
  // Durdur hemen etkilidir: bekleyiş kesilir, durum silinir; süren tık bitince başka tık yapılmaz.
  function gezDurdur() {
    const vardi = kesifte || !!gezOku();
    kesifDur = true; gezYaz(null);
    if (uyandir) uyandir();
    if (vardi && !kesifte) bildir('Gez durduruldu');
    cizIste();
  }
  // Sayfa açılışında: gez sürüyorsa başlangıç sayfasında kaldığı yerden devam eder; başka sayfadaysa
  // o sayfa kaydedildikten sonra başlangıca döner.
  function gezSurdur() {
    const g = gezOku();
    if (!g || CERCEVE) return;
    if (!kayit) { gezYaz(null); return; }
    if (adresYok() === g.baslangic) { sakinBekle(8000, 800).then(() => { if (gezOku()) kesfet(); }); return; }
    g.geri = (g.geri || 0) + 1; gezYaz(g);
    if (g.geri > 3) {
      gezYaz(null);
      olay('kesif', { bitti: true, adim: g.adim, atlanan: g.atlanan, gezilenSayfa: g.gidilen.length, neden: 'başlangıç sayfasına dönülemedi' });
      bildir('Gez bitti: başlangıç sayfasına dönülemedi'); cizIste();
      return;
    }
    bildir('Gez: bu sayfa kaydedildi, başlangıç sayfasına dönülüyor');
    sakinBekle(8000, 800).then(() => {
      if (!gezOku()) return;
      olay('kesif', { ziyaret: location.pathname + location.search, baslik: document.title });
      bosalt().then(() => { if (gezOku()) location.assign(g.baslangic); });
    });
  }
  async function kesfet() {
    if (kesifte || CERCEVE) return;
    if (!kayit) await kayitBaslat();
    let g = gezOku();
    const yeni = !g || g.baslangic !== adresYok();
    if (yeni) g = { baslangic: adresYok(), denenen: [], gidilen: [], adim: 0, atlanan: 0 };
    g.geri = 0; gezYaz(g);
    kesifte = true; kesifDur = false; cizIste();
    const denenen = new Set(g.denenen);
    const kaydet = () => { if (kesifDur) return; g.denenen = [...denenen]; gezYaz(g); };
    // Tık tam sayfa geçişi başlattıysa bu sayfa biter, yeni sayfada gezSurdur devralır. Sayfa gitmezse
    // (indirme gibi) 8 sn sonra devam edilir; gez hiçbir yerde takılı kalmaz.
    let ayriliyor = false;
    const ayril = () => { ayriliyor = true; };
    addEventListener('beforeunload', ayril);
    const bekleDur = async ms => { const t = Date.now(); while (Date.now() - t < ms && !kesifDur) await bekle(100); };
    const cikisBekle = async () => { if (ayriliyor) { await bekleDur(8000); ayriliyor = false; } };
    const asil = { confirm: window.confirm, alert: window.alert, prompt: window.prompt, open: window.open };
    window.open = u => { olay('kesif', { uyari: 'yeni pencere engellendi', mesaj: kirp(String(u || ''), 200) }); return null; };
    window.confirm = m => { olay('kesif', { uyari: 'confirm engellendi (hayır)', mesaj: kirp(String(m), 200) }); return false; };
    window.alert = m => { olay('kesif', { uyari: 'alert', mesaj: kirp(String(m), 200) }); };
    window.prompt = m => { olay('kesif', { uyari: 'prompt engellendi', mesaj: kirp(String(m), 200) }); return null; };
    const devam = () => !kesifDur && g.adim < KESIF_SINIR;
    const tikla = async (el, neden, baskaSayfa) => {
      if (!devam()) return false;
      const anahtar = secici(el) + '|' + kirp(el.textContent, 40);
      if (denenen.has(anahtar)) return false;
      // Görünmeyen öğe sonra görünebilir (kapalı penceredeki sekme); denenmiş sayılmaz
      if (!guvenliMi(el, baskaSayfa)) { if (el.isConnected && gorunur(el)) { denenen.add(anahtar); g.atlanan++; kaydet(); } return false; }
      denenen.add(anahtar); g.adim++; kaydet();
      bildir('Gez ' + g.adim + '. ' + neden + ': ' + kirp(el.textContent || el.getAttribute('aria-label') || '', 30));
      try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
      el.click();
      await sakinBekle();
      await cikisBekle();
      // Tek sayfa uygulamasında adres değiştiyse geri dönülür; dönülemezse başlangıç sayfası yeniden açılır
      if (!kesifDur && adresYok() !== g.baslangic) {
        history.back(); await sakinBekle();
        if (!kesifDur && adresYok() !== g.baslangic) { kaydet(); location.assign(g.baslangic); await bekleDur(8000); }
      }
      return true;
    };
    const sekmeler = async (kok, yer) => {
      for (const el of [...kok.querySelectorAll(SEKME)].filter(e => !bizim(e))) {
        if (!devam()) return;
        const secili = el.getAttribute('aria-selected') === 'true' || el.classList.contains('active');
        if (!secili) await tikla(el, yer + ' sekme');
      }
    };
    const listeler = async kok => {
      for (const sel of [...kok.querySelectorAll('select')].filter(e => !bizim(e) && gorunur(e) && !gizliAlan(e))) {
        const ilk = sel.selectedIndex, ss = secici(sel);
        for (let i = 0; i < Math.min(sel.options.length, 40) && devam(); i++) {
          const anahtar = 'seçenek|' + ss + '|' + i;
          if (i === ilk || sel.options[i].disabled || denenen.has(anahtar)) continue;
          denenen.add(anahtar); g.adim++; kaydet();
          bildir('Gez ' + g.adim + '. seçenek: ' + kirp(sel.options[i].textContent, 30));
          sel.selectedIndex = i;
          sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true }));
          olay('degisim', { tikNo, kesif: true, oge: { etiket: 'select', secici: ss, ad: sel.name || '' }, secilen: kirp(sel.options[i].textContent, 60) });
          durumIzle();
          await sakinBekle();
          await cikisBekle();
        }
        if (!kesifDur && sel.isConnected && sel.selectedIndex !== ilk) { sel.selectedIndex = ilk; sel.dispatchEvent(new Event('change', { bubbles: true })); await sakinBekle(); }
      }
    };
    const bolumler = async kok => {
      const l = [...kok.querySelectorAll('[aria-expanded=false], details:not([open]) > summary')].filter(e => !bizim(e) && !e.matches(SEKME) && e.getAttribute('aria-haspopup') !== 'menu');
      for (const el of l.slice(0, 20)) await tikla(el, 'kapalı bölüm');
    };
    // Aynı sitedeki başka sayfalar (sol menü, kısayol kartları): her adres bir kez
    const baglantilar = async () => {
      for (const a of [...document.querySelectorAll('a[href]')].filter(e => !bizim(e) && gorunur(e)).slice(0, 400)) {
        if (!devam() || g.gidilen.length >= SAYFA_SINIR) return;
        const h = (a.getAttribute('href') || '').trim();
        if (!h || /^(#|javascript:)/i.test(h)) continue;
        let u; try { u = new URL(h, location.href); } catch (e) { continue; }
        const hedef = u.origin + u.pathname + u.search;
        if (u.origin !== location.origin || hedef === g.baslangic || g.gidilen.includes(hedef) || !guvenliMi(a, true)) continue;
        g.gidilen.push(hedef); kaydet();
        await tikla(a, 'sayfa', true);
      }
    };
    olay('kesif', yeni ? { basladi: true, baslik: document.title } : { devam: true, adim: g.adim });
    try {
      // 1 açık pencere varsa önce onun sekmeleri
      const p0 = acikPencere();
      if (p0) await sekmeler(p0, 'pencere');
      // 2 sayfa sekmeleri, filtre listeleri, kapalı bölümler
      await sekmeler(document.body, 'sayfa');
      await listeler(document.body);
      await bolumler(document.body);
      // 3 sayfalama: ikinci sayfa
      for (const p of [...document.querySelectorAll('.pagination, .pager, nav[aria-label*="age" i], nav[aria-label*="sayfa" i], [class*="paginat" i]')].filter(e => !bizim(e) && gorunur(e)).slice(0, 2)) {
        const iki = [...p.querySelectorAll('a, button')].find(e => (e.textContent || '').trim() === '2') || [...p.querySelectorAll('a, button')].find(e => /^(›|»|>|sonraki|next|ileri)$/i.test((e.textContent || e.getAttribute('aria-label') || '').trim()));
        if (iki) await tikla(iki, 'ikinci sayfa');
      }
      // 4 tekrarlanan kartlar: her kalıbın ilk kartında ilk güvenli düğme; pencere açılırsa sekmeleri, sonra kapat
      // Sınıfsız genel kalıp (DIV.) atlanır: rastgele düğmeye basılmasın
      for (const k of kaliplar(document.body).filter(x => !/\.$/.test(x.imza)).slice(0, 5)) {
        if (!devam()) break;
        let kap; try { kap = document.querySelector(k.kapsayici); } catch (e) { kap = null; }
        if (!kap) continue;
        const kart = [...kap.children].find(c => c.tagName + '.' + [...c.classList].filter(x => !OYNAK.test(x)).sort().join('.') === k.imza);
        if (!kart) continue;
        const dugme = [...kart.querySelectorAll(TIK)].find(e => guvenliMi(e, false));
        if (!dugme || !(await tikla(dugme, 'kart'))) continue;
        const p = acikPencere();
        if (p) { await sekmeler(p, 'pencere'); if (devam()) { pencereKapat(p); await sakinBekle(); } }
      }
      // 5 aynı sitedeki başka sayfalar: git, kaydet, dön (sayfa yenilenir, gez kaldığı yerden sürer)
      await baglantilar();
    } catch (e) {
      olay('hata', { kaynak: 'gez', mesaj: kirp(String(e && e.message || e), 300) });
    } finally {
      Object.assign(window, asil);
      removeEventListener('beforeunload', ayril);
      kesifte = false;
      const neden = kesifDur ? 'durduruldu' : g.adim >= KESIF_SINIR ? 'adım sınırı' : 'bitti';
      gezYaz(null);
      olay('kesif', { bitti: true, adim: g.adim, atlanan: g.atlanan, gezilenSayfa: g.gidilen.length, neden });
      bildir('Gez ' + neden + ': ' + g.adim + ' adım, ' + g.gidilen.length + ' sayfa; ' + g.atlanan + ' frenli düğmeye basılmadı');
      haritaImzalari.clear(); haritaKaydet('gez sonu');
      cizIste();
    }
  }

  // ------------------------------------------------ TOPLAYICI
  // Kaydedilmiş bir isteği değişken listesiyle yeniden çağırır: "yil=2015-2026; sayfa=1-45" ya da "yil=2024,2025".
  // İlk değişken dış döngüdür. İlerleme localStorage'da tutulur; oturum düşerse Sürdür kaldığı yerden devam eder.
  const TOPLA = 'webAjani:toplama';
  let toplamada = false, toplamaDur = false;
  function degiskenCoz(metin) {
    const l = [];
    for (const parca of String(metin || '').split(/[;\n]/)) {
      const m = parca.match(/^\s*([^=\s]+)\s*=\s*(.+?)\s*$/);
      if (!m) continue;
      const degerler = [];
      for (const d of m[2].split(',')) {
        const a = d.trim().match(/^(-?\d+)\s*-\s*(-?\d+)$/);
        if (a) { const x = +a[1], y = +a[2], ad = x <= y ? 1 : -1; for (let i = x; ad > 0 ? i <= y : i >= y; i += ad) { degerler.push(String(i)); if (degerler.length > 5000) break; } }
        else if (d.trim()) degerler.push(d.trim());
      }
      if (degerler.length) l.push({ ad: m[1], degerler });
    }
    return l;
  }
  function kombinasyonlar(l) {
    let k = [{}];
    for (const { ad, degerler } of l) { const y = []; for (const o of k) for (const d of degerler) y.push(Object.assign({}, o, { [ad]: d })); k = y; if (k.length > 20000) break; }
    return k.slice(0, 20000);
  }
  // Gizlenmiş değer ("<gizli>") sayfadaki aynı adlı gizli alandan ya da csrf meta etiketinden alınır.
  function gizliDoldur(ad) {
    const i = document.querySelector('input[name="' + ad.replace(/"/g, '') + '"]');
    if (i && i.value) return i.value;
    if (/verification|csrf|xsrf|token/i.test(ad)) {
      const v = document.querySelector('input[name=__RequestVerificationToken], input[name*=csrf i], input[name*=token i]');
      if (v && v.value) return v.value;
      const m = document.querySelector('meta[name*=csrf i], meta[name*=token i]');
      if (m && m.content) return m.content;
    }
    return null;
  }
  function istekKur(ornek, degerler) {
    const u = new URL(ornek.adres, location.href);
    let govde = ornek.istek || null, json = false;
    const bilinmeyen = [];
    let govdeNesne = null, govdeForm = null;
    if (govde) {
      try { govdeNesne = JSON.parse(govde); json = true; } catch (e) { if (/=/.test(govde)) govdeForm = new URLSearchParams(govde); }
    }
    for (const [k, v] of Object.entries(degerler)) {
      if (govdeNesne && typeof govdeNesne === 'object' && k in govdeNesne) govdeNesne[k] = isNaN(v) || typeof govdeNesne[k] === 'string' ? v : +v;
      else if (govdeForm && govdeForm.has(k)) govdeForm.set(k, v);
      else u.searchParams.set(k, v);
    }
    for (const [k, v] of [...u.searchParams]) if (v === '<gizli>') { const g = gizliDoldur(k); if (g == null) bilinmeyen.push(k); else u.searchParams.set(k, g); }
    if (govdeForm) for (const [k, v] of [...govdeForm]) if (v === '<gizli>') { const g = gizliDoldur(k); if (g == null) bilinmeyen.push(k); else govdeForm.set(k, g); }
    if (govdeNesne && typeof govdeNesne === 'object') for (const k of Object.keys(govdeNesne)) if (govdeNesne[k] === '<gizli>') { const g = gizliDoldur(k); if (g == null) bilinmeyen.push(k); else govdeNesne[k] = g; }
    const basliklar = {};
    for (const [k, v] of Object.entries(ornek.basliklar || {})) {
      if (v === '<gizli>') { const g = gizliDoldur(k); if (g == null) bilinmeyen.push(k + ' (başlık)'); else basliklar[k] = g; }
      else if (!/^(content-length|host|origin|referer|cookie)$/i.test(k)) basliklar[k] = v;
    }
    govde = govdeNesne ? JSON.stringify(govdeNesne) : govdeForm ? govdeForm.toString() : (ornek.yontem === 'GET' ? null : govde);
    if (govdeForm && !Object.keys(basliklar).some(k => k === 'content-type')) basliklar['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    if (json && !Object.keys(basliklar).some(k => k === 'content-type')) basliklar['content-type'] = 'application/json';
    return { adres: u.href, yontem: ornek.yontem, govde, basliklar, bilinmeyen };
  }
  function oturumDustuMu(r, metin, ornek) {
    if (r.status === 401 || r.status === 403 || r.status === 419 || r.status === 440) return 'durum ' + r.status;
    if (r.redirected && /login|giris|giriş|oturum|account|signin|auth/i.test(r.url)) return 'giriş sayfasına yönlendi';
    const tur = r.headers.get('content-type') || '';
    if (/json/i.test(ornek.icerikTuru || '') && /html/i.test(tur)) return 'JSON yerine HTML geldi';
    if (/html/i.test(tur) && /type=["']?password/i.test(metin || '') && !/type=["']?password/i.test(ornek.yanit || '')) return 'yanıtta giriş formu var';
    return null;
  }
  async function toplayiciBaslat(ornek, degiskenMetni, aralik, surdur) {
    if (toplamada) return;
    if (!kayit) await kayitBaslat();
    let d = null;
    try { d = JSON.parse(localStorage.getItem(TOPLA)); } catch (e) {}
    if (!surdur || !d || !d.ornek) {
      const l = degiskenCoz(degiskenMetni);
      if (!l.length) { toplamaBildir('Değişken yok: örnek "yil=2015-2026; sayfa=1-45"'); return; }
      d = { ornek, degiskenMetni, aralik: Math.max(300, +aralik || 1500), sira: 0, toplam: kombinasyonlar(l).length, basladi: new Date().toISOString(), hataArka: 0 };
    }
    const liste = kombinasyonlar(degiskenCoz(d.degiskenMetni));
    toplamada = true; toplamaDur = false;
    olay('toplama', { basladi: true, istek: d.ornek.yontem + ' ' + d.ornek.adres.split('?')[0], degiskenler: d.degiskenMetni, toplam: liste.length, sira: d.sira, surdur: !!surdur });
    let neden = 'bitti';
    try {
      while (d.sira < liste.length) {
        if (toplamaDur) { neden = 'durduruldu'; break; }
        const degerler = liste[d.sira];
        const k = istekKur(d.ornek, degerler);
        if (k.bilinmeyen.length) { neden = 'gizli değer bulunamadı: ' + k.bilinmeyen.join(', '); break; }
        toplamaBildir((d.sira + 1) + ' / ' + liste.length + ' · ' + Object.entries(degerler).map(([a, b]) => a + '=' + b).join(' '));
        let r, metin = null, hata = null;
        const t = performance.now();
        try {
          r = await ASIL_FETCH.call(window, k.adres, { method: k.yontem, headers: k.basliklar, body: k.govde, credentials: 'same-origin' });
          metin = await r.text();
        } catch (e) { hata = String(e && e.message || e); }
        const dusme = r ? oturumDustuMu(r, metin, d.ornek) : null;
        olay('toplama', { degerler, durum: r ? r.status : 0, icerikTuru: r ? r.headers.get('content-type') || '' : '', sure: Math.round(performance.now() - t), boyut: metin ? metin.length : 0, yanit: dusme ? undefined : (metin || '').slice(0, 2 * 1024 * 1024), hata: hata || dusme || undefined });
        if (dusme) { neden = 'oturum düştü (' + dusme + '); giriş yap, sonra Sürdür'; break; }
        if (hata || r.status >= 400) { d.hataArka++; if (d.hataArka >= 3) { neden = 'arka arkaya 3 hata (' + (hata || r.status) + ')'; d.sira++; break; } }
        else d.hataArka = 0;
        d.sira++;
        try { localStorage.setItem(TOPLA, JSON.stringify(d)); } catch (e) {}
        await bekle(d.aralik);
      }
    } finally {
      toplamada = false;
      try { localStorage.setItem(TOPLA, JSON.stringify(d)); } catch (e) {}
      olay('toplama', { bitti: true, neden, sira: d.sira, toplam: liste.length });
      await bosalt();
      toplamaBildir('Toplama ' + neden + ' · ' + d.sira + ' / ' + liste.length);
    }
  }
  function adresleriListele() {
    return hepsiniOku().then(l => {
      const o = new Map();
      for (const x of l) if (x.tur === 'istek' && x.durum >= 200 && x.durum < 300) o.set(x.yontem + ' ' + x.adres.split('?')[0], x);
      return [...o.entries()];
    });
  }

  // ------------------------------------------------ SAYFA FOTOKOPİSİ: sade metin (Markdown benzeri)
  function fotokopi(kok) {
    kok = kok || acikPencere() || document.body;
    const satirlar = [];
    const yaz = t => { t = t.replace(/[ \t]+/g, ' ').trim(); if (t) satirlar.push(t); };
    const satirIci = el => {
      let t = '';
      for (const n of el.childNodes) {
        if (n.nodeType === 3) t += n.textContent;
        else if (n.nodeType === 1) {
          if (bizim(n) || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SVG)$/i.test(n.tagName) || !n.getClientRects().length) continue;
          if (n.tagName === 'A' && n.getAttribute('href')) t += '[' + kirp(n.textContent, 80) + '](' + kirp(n.getAttribute('href'), 120) + ')';
          else if (n.tagName === 'BUTTON' || n.getAttribute('role') === 'button') t += ' [düğme: ' + kirp(n.textContent || n.getAttribute('aria-label') || '', 40) + '] ';
          else if (n.tagName === 'INPUT' || n.tagName === 'SELECT' || n.tagName === 'TEXTAREA') t += ' [alan: ' + kirp(etiketBul(n) || n.getAttribute('placeholder') || n.name || '', 40) + '] ';
          else if (n.tagName === 'BR') t += ' ';
          else t += satirIci(n);
        }
      }
      return t;
    };
    const BLOK = /^(P|DIV|SECTION|ARTICLE|MAIN|ASIDE|HEADER|FOOTER|NAV|LI|UL|OL|DL|DT|DD|FORM|FIELDSET|TABLE|H[1-6]|BLOCKQUOTE|PRE|FIGURE|DETAILS|SUMMARY)$/;
    const gez = el => {
      for (const n of el.children) {
        if (bizim(n) || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SVG|IFRAME)$/i.test(n.tagName) || !n.getClientRects().length) continue;
        const t = n.tagName;
        if (/^H[1-6]$/.test(t)) { yaz('#'.repeat(+t[1]) + ' ' + satirIci(n)); continue; }
        if (t === 'TABLE') {
          const sat = [...n.querySelectorAll('tr')].slice(0, 300).map(tr => '| ' + [...tr.children].map(c => kirp(c.innerText, 80).replace(/\|/g, '/')).join(' | ') + ' |');
          if (sat.length) { satirlar.push(sat[0]); satirlar.push('|' + ' --- |'.repeat(sat[0].split(' | ').length)); satirlar.push(...sat.slice(1)); }
          continue;
        }
        if (t === 'LI') { yaz('- ' + satirIci(n)); continue; }
        if (t === 'PRE') { satirlar.push('```', n.innerText.slice(0, 4000), '```'); continue; }
        if ([...n.children].some(c => BLOK.test(c.tagName))) gez(n);
        else yaz(satirIci(n));
        if (satirlar.join('\n').length > 200000) return;
      }
    };
    gez(kok);
    return satirlar.join('\n').replace(/\n{3,}/g, '\n\n').slice(0, 200000);
  }

  // ------------------------------------------------ DIŞA AKTARMA
  function indir() {
    return hepsiniOku().then(olaylar => {
      const veri = { arac: 'Web Ajanı', surum: SURUM, site: location.host, indirildi: new Date().toISOString(), olaySayisi: olaylar.length, olaylar };
      const z = new Date(), p = n => String(n).padStart(2, '0');
      const ad = 'web-ajani-' + host.replace(/[^\w.-]/g, '_') + '-' + z.getFullYear() + p(z.getMonth() + 1) + p(z.getDate()) + '-' + p(z.getHours()) + p(z.getMinutes()) + '.json';
      const a = document.createElement('a');
      a.download = ad; a.href = URL.createObjectURL(new Blob([JSON.stringify(veri)], { type: 'application/json' }));
      a.id = KOK_ID + '-indir';
      document.documentElement.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      bildir('İndirildi: ' + ad + ' (' + olaylar.length + ' kayıt) · İndirilenler klasöründe');
      return ad;
    });
  }

  // ------------------------------------------------ KAYDI BAŞLAT / DURDUR VE İNDİR
  // Başlat önceki kaydı siler (Durdur onu zaten indirdi); Durdur kaydı kapatır ve dosyayı indirir.
  function kayitBaslat() {
    if (kayit) return Promise.resolve();
    return temizle().then(() => {
      kayit = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), basladi: Date.now(), sayac: {} };
      fark = {}; haritaImzalari.clear();
      try { localStorage.setItem(KAYIT, JSON.stringify(kayit)); } catch (e) {}
      olay('acilis', { baslik: document.title, kurulumMs: Math.round(kurulumMs * 10) / 10, surum: SURUM, kayitBasi: true });
      haritaKaydet('kayıt başı');
      zamanlayiciKur();
      bildir('Kayıt başladı · sitede istediğin her yere tıkla, bitince Durdur ve indir');
    });
  }
  function kayitDurdur() {
    if (!kayit) return Promise.resolve(null);
    if (kesifte || gezOku()) gezDurdur();
    if (toplamada) toplamaDur = true;
    olay('kayit', { bitti: true, saniye: Math.round((Date.now() - kayit.basladi) / 1000) });
    return bosalt().then(() => {
      kayit = null; fark = {};
      try { localStorage.removeItem(KAYIT); } catch (e) {}
      zamanlayiciKur(); cizIste();
      return indir();
    });
  }
  const kayitGerekli = () => kayit ? Promise.resolve() : kayitBaslat();

  // ------------------------------------------------ PANEL: tek düğme, canlı sayaç, son kaydedilen, Diğer araçlar
  const CSS_PANEL = `
    :host{all:initial}
    [hidden]{display:none!important}
    .c{position:fixed;left:12px;bottom:12px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-start;gap:6px;font:13px/1.35 system-ui,sans-serif;color:#e2e8f0;max-width:calc(100vw - 24px)}
    .bar{display:flex;align-items:center;gap:8px;background:#0f172a;border:1px solid #334155;border-radius:22px;padding:5px 6px 5px 12px;box-shadow:0 2px 10px #0008;flex-wrap:wrap}
    .bar.r{border-color:#ef4444}
    .nok{width:10px;height:10px;border-radius:50%;background:#64748b;flex:none}
    .r .nok{background:#ef4444;animation:y 1.2s infinite}
    @keyframes y{50%{opacity:.25}}
    .say{white-space:nowrap;font-variant-numeric:tabular-nums;color:#cbd5e1}
    .say b{color:#f8fafc}
    button{border:0;border-radius:16px;padding:6px 12px;font:600 12px system-ui,sans-serif;cursor:pointer;color:#fff;background:#16a34a;white-space:nowrap}
    button:disabled{opacity:.45;cursor:default}
    button.kir{background:#dc2626} button.sar{background:#b45309} button.mav{background:#1d4ed8} button.gri{background:#334155;font-weight:500}
    button.ik{padding:6px 10px;font-size:14px;line-height:1}
    .son{background:#0f172aee;border:1px solid #334155;border-radius:8px;padding:4px 10px;font-size:12px;color:#fde68a;max-width:min(420px,calc(100vw - 24px));box-sizing:border-box;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ar{background:#0f172a;border:1px solid #334155;border-radius:12px;padding:10px 12px;width:320px;max-width:calc(100vw - 24px);box-sizing:border-box;box-shadow:0 4px 18px #000a;max-height:70vh;overflow:auto}
    .ar h4{margin:0 0 4px;font-size:13px;color:#f8fafc}.ar h4 small{color:#64748b;font-weight:400}
    .ar p{margin:0 0 6px;font-size:11px;color:#94a3b8}
    .sat{display:flex;gap:8px;align-items:center;margin:7px 0}.sat button{flex:none;min-width:104px}.sat small{color:#94a3b8;font-size:11px}
    details{margin:8px 0;border-top:1px solid #334155;padding-top:6px}summary{cursor:pointer;color:#cbd5e1;font-size:12px}
    select,input{width:100%;box-sizing:border-box;margin-top:5px;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:5px;font:12px system-ui,sans-serif}
    label.bk{display:flex;align-items:center;gap:6px;font-size:11px;color:#94a3b8;margin-top:4px}label.bk input{width:90px;margin:0}
    .tn{color:#fbbf24;font-size:11px;min-height:14px;word-break:break-all}`;
  function panelKur() {
    if (kok || !document.body || CERCEVE) return;
    kok = document.createElement('div'); kok.id = KOK_ID;
    const g = kok.attachShadow({ mode: 'open' });
    g.innerHTML = '<style>' + CSS_PANEL + '</style><div class="c"><div class="son" hidden></div><div class="bar"><span class="nok"></span><span class="say"></span>' +
      '<button data-e="baslat">● Kaydı başlat</button><button class="kir" data-e="durdur">■ Durdur ve indir</button>' +
      '<button class="sar" data-e="gezdur">■ Gezmeyi durdur</button><button class="gri ik" data-e="araclar" title="Diğer araçlar">≡</button></div></div>';
    el$ = { c: g.querySelector('.c'), bar: g.querySelector('.bar'), say: g.querySelector('.say'), son: g.querySelector('.son'),
      baslat: g.querySelector('[data-e=baslat]'), durdur: g.querySelector('[data-e=durdur]'), gezdur: g.querySelector('[data-e=gezdur]') };
    g.addEventListener('click', eylem);
    document.body.appendChild(kok);
    zamanlayiciKur(); ciz();
  }
  function sureYaz(ms) { const s = Math.max(0, Math.floor(ms / 1000)), p = n => String(n).padStart(2, '0'); return (s >= 3600 ? Math.floor(s / 3600) + ':' : '') + p(Math.floor(s / 60) % 60) + ':' + p(s % 60); }
  // Düğmeler yeniden yaratılmaz, yalnız gizlenir/gösterilir: saniyelik yenileme tıklamayı kaçırmasın
  function ciz() {
    if (!kok) return;
    const gez = kesifte || !!gezOku();
    el$.bar.classList.toggle('r', !!kayit);
    el$.say.innerHTML = kayit ? '<b>KAYIT ' + sureYaz(Date.now() - kayit.basladi) + '</b> · <b>' + say('tik') + '</b> tık · <b>' + say('sayfa') + '</b> sayfa · <b>' + say('istek') + '</b> istek' : 'Web Ajanı · kayıt kapalı';
    el$.baslat.hidden = !!kayit; el$.durdur.hidden = !kayit; el$.gezdur.hidden = !gez;
    el$.son.textContent = sonIs; el$.son.hidden = !sonIs;
    if (araclar) { const b = araclar.querySelector('[data-e=gez]'); if (b) b.disabled = gez; }
  }
  function cizIste() {
    if (cizBekliyor || !kok) return;
    cizBekliyor = true;
    requestAnimationFrame(() => { cizBekliyor = false; ciz(); });
  }
  function zamanlayiciKur() {
    if (kayit && kok && !zamanlayici) zamanlayici = setInterval(ciz, 1000);
    else if (!(kayit && kok) && zamanlayici) { clearInterval(zamanlayici); zamanlayici = null; }
  }
  function bildir(t) { sonIs = t || ''; cizIste(); }
  function toplamaBildir(t) { const n = araclar && araclar.querySelector('.tn'); if (n) n.textContent = t; bildir('Toplayıcı: ' + t); }
  function araclarAcKapa() {
    if (araclar) { araclar.remove(); araclar = null; return; }
    let td = null; try { td = JSON.parse(localStorage.getItem(TOPLA)); } catch (e) {}
    araclar = document.createElement('div'); araclar.className = 'ar';
    araclar.innerHTML = '<h4>Diğer araçlar <small>' + SURUM + ' · ' + host + '</small></h4><p>Kayıt kapalıysa araç kaydı kendisi başlatır.</p>' +
      '<div class="sat"><button class="mav" data-e="gez">Otomatik gez</button><small>Sekme, liste, kapalı bölüm, kart ve menü sayfalarını kendisi tıklar; silme, gönderme gibi düğmelere basmaz</small></div>' +
      '<div class="sat"><button class="mav" data-e="isaret">Öğe işaretle</button><small>Sonra tıkladığın öğenin adını ve stilini kaydeder</small></div>' +
      '<div class="sat"><button class="mav" data-e="tasarim">Tasarımı oku</button><small>Sayfanın renkleri ve yazı tipleri</small></div>' +
      '<div class="sat"><button class="mav" data-e="fotokopi">Fotokopi</button><small>Sayfanın sade metni panoya ve kayda</small></div>' +
      '<div class="sat"><button class="gri" data-e="indir">Son kaydı indir</button><small>Durdur\'da inen dosyayı yeniden indirir</small></div>' +
      (profil ? '<details><summary>Toplayıcı · kaydedilen veri adresini yıl ve sayfa için çağırır</summary><select class="ta"><option value="">Veri adresi seç (önce kayıtla gez)</option></select>' +
        '<input class="tv" placeholder="yil=2015-2026; sayfa=1-45"><label class="bk">Bekleme ms <input class="tb" type="number" value="1500" min="300" step="100"></label>' +
        '<div class="sat"><button class="mav" data-e="topla">Başlat</button><button class="gri" data-e="topladur">Durdur</button>' + (td && td.ornek && td.sira < td.toplam ? '<button class="mav" data-e="toplasurdur">Sürdür (' + td.sira + '/' + td.toplam + ')</button>' : '') + '</div><div class="tn"></div></details>' : '') +
      '<div class="sat"><button class="gri" data-e="kapat">Bu sitede kapat</button><small>Yeniden açmak: Alt+Shift+W</small></div>';
    el$.c.insertBefore(araclar, el$.c.firstChild);
    const sec = araclar.querySelector('.ta');
    if (sec) adresleriListele().then(l => {
      toplaAdresler = l;
      for (const [ad] of l) { const o = document.createElement('option'); o.value = ad; o.textContent = ad; sec.appendChild(o); }
      if (td && td.ornek) { sec.value = td.ornek.yontem + ' ' + td.ornek.adres.split('?')[0]; araclar.querySelector('.tv').value = td.degiskenMetni || ''; }
    });
    ciz();
  }
  function eylem(e) {
    const b = e.target.closest && e.target.closest('[data-e]');
    if (!b || b.disabled) return;
    const a = b.getAttribute('data-e');
    // Başlat ve Durdur araçlar panelini de kapatır: panel sayfanın üstünde açık kalmasın
    if ((a === 'baslat' || a === 'durdur') && araclar) araclarAcKapa();
    if (a === 'baslat') kayitBaslat();
    else if (a === 'durdur') kayitDurdur();
    else if (a === 'gezdur') gezDurdur();
    else if (a === 'araclar') araclarAcKapa();
    else if (a === 'gez') { araclarAcKapa(); kesfet(); }
    else if (a === 'isaret') { araclarAcKapa(); kayitGerekli().then(isaretciAc); }
    else if (a === 'tasarim') kayitGerekli().then(() => { sayfaTasarimi(); bildir('Sayfa tasarımı kaydedildi'); });
    else if (a === 'fotokopi') kayitGerekli().then(() => {
      const m = fotokopi();
      olay('fotokopi', { baslik: document.title, metin: m });
      try { navigator.clipboard.writeText(m).then(() => bildir('Fotokopi kaydedildi ve panoya kopyalandı (' + m.length + ' karakter)'), () => bildir('Fotokopi kaydedildi (' + m.length + ' karakter)')); } catch (x) { bildir('Fotokopi kaydedildi'); }
    });
    else if (a === 'indir') indir();
    else if (a === 'topla') {
      const sec = araclar.querySelector('.ta'), x = toplaAdresler.find(([ad]) => ad === sec.value);
      if (!x) return toplamaBildir('Önce listeden bir veri adresi seç');
      toplayiciBaslat(x[1], araclar.querySelector('.tv').value, araclar.querySelector('.tb').value, false);
    }
    else if (a === 'toplasurdur') toplayiciBaslat(null, '', 0, true);
    else if (a === 'topladur') { if (toplamada) { toplamaDur = true; toplamaBildir('Duruyor: süren istek bitince durur'); } }
    else if (a === 'kapat') { try { localStorage.setItem(IZIN, '0'); } catch (x) {} location.reload(); }
  }

  // ------------------------------------------------ başlangıç
  addEventListener('click', tikla, true);
  addEventListener('change', degisti, true);
  function hazir() {
    panelKur();
    // Kayıt sürüyorsa her sayfa açılışı kaydedilir (sayfa haritası); gez sürüyorsa kaldığı yerden devam eder
    const ilk = () => {
      if (kayit) { olay('acilis', { baslik: document.title, kurulumMs: Math.round(kurulumMs * 10) / 10, surum: SURUM }); haritaKaydet('yükleme'); }
      gezSurdur();
    };
    (window.requestIdleCallback || (f => setTimeout(f, 300)))(ilk, { timeout: 3000 });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hazir); else hazir();
  const kurulumMs = performance.now() - T0;
  // Sınama ve konsol için: sayfadan erişilen tek ad.
  window.__webAjani = { surum: SURUM, kurulumMs: () => kurulumMs, kayitBaslat, kayitDurdur, kayittaMi: () => !!kayit, sayac: () => ({ tik: say('tik'), sayfa: say('sayfa'), istek: say('istek'), hata: say('hata'), toplam: say('toplam') }),
    indir, isaretciAc, sayfaTasarimi, haritaKaydet, hepsiniOku, bosalt, temizle,
    kesfet, kesifteMi: () => kesifte, gezDurdur, toplayiciBaslat, toplamadaMi: () => toplamada, adresleriListele, fotokopi, degiskenCoz, istekKur };
})();
