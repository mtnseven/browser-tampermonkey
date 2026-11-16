// ==UserScript==
// @name         Web Ajanı
// @namespace    mtnseven/browser-tampermonkey
// @version      0.2.0
// @description  Siteyi senin gördüğün gibi kaydeder: sayfa haritası, tıklamadan sonra ne değiştiği, ağ istekleri, işaretlenen öğenin seçicisi ve stili, sayfa tasarımı, hatalar; otomatik keşif, toplayıcı, sayfa fotokopisi. Kayıt cihazda kalır, dosya olarak indirilir. Yalnız izin verilen sitede çalışır (Alt+Shift+W).
// @author       mtnseven
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/web-ajani.user.js
// @downloadURL  https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/web-ajani.user.js
// ==/UserScript==

(function () {
  'use strict';
  const SURUM = '0.2.0';
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

  // ------------------------------------------------ ayar (site başına)
  const AYAR = 'webAjani:ayar';
  const MODULLER = [
    ['harita', 'Harita', 'Sayfadaki düğme, bağlantı, sekme, filtre, sayfalama, tablo ve kart kalıpları'],
    ['durum', 'Durum kaydı', 'Her tıklamadan sonra ne değişti, açılanın içeriği'],
    ['ag', 'Ağ kaydı', 'İstek ve yanıtlar değerleriyle, tetikleyen tıklamaya bağlı'],
    ['hata', 'Hata günlüğü', 'Sayfadaki hatalar ve başarısız istekler'],
    ['isaretci', 'Öğe işaretçi', 'Tıklanan öğenin seçicisi, çevresi ve stili'],
    ['tasarim', 'Tasarım okuyucu', 'Renkler, yazı tipleri, CSS değişkenleri'],
    ['kesif', 'Otomatik keşif', 'Sekmeler, filtre seçenekleri, ikinci sayfa, kapalı bölümler, ilk kartın penceresi; frenli düğmeye basmaz'],
    ['toplayici', 'Toplayıcı', 'Kaydedilen bir veri adresini bütün yıl ve sayfalar için çağırır; oturum düşünce durur'],
    ['fotokopi', 'Sayfa fotokopisi', 'Sayfanın sade metin hâli (başlık, liste, tablo, bağlantı)']
  ];
  // Site profili: siteye özel varsayılan. Ağ kaydı yanıt gövdesini sakladığı için yalnız profilde açıktır.
  const PROFILLER = { 'enabiz.gov.tr': { moduller: { ag: true, toplayici: true } } };
  const profil = Object.entries(PROFILLER).find(([s]) => host === s || host.endsWith('.' + s));
  let ayar = { moduller: { harita: true, durum: true, ag: false, hata: true, isaretci: true, tasarim: true, kesif: true, toplayici: false, fotokopi: true } };
  if (profil) Object.assign(ayar.moduller, profil[1].moduller);
  try { const a = JSON.parse(localStorage.getItem(AYAR)); if (a && a.moduller) Object.assign(ayar.moduller, a.moduller); } catch (e) {}
  const acikMi = m => !!ayar.moduller[m];
  function ayarYaz() { try { localStorage.setItem(AYAR, JSON.stringify(ayar)); } catch (e) {} }

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
  const sayac = { toplam: 0 };
  function olay(tur, veri) {
    const o = Object.assign({}, veri, { tur, zaman: new Date().toISOString(), sayfa: location.pathname + location.search, yk: YUKLEME });
    if (CERCEVE) o.cerceve = true;
    for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    kuyruk.push(o);
    sayac.toplam++; sayac[tur] = (sayac[tur] || 0) + 1;
    if (!yazZamani) yazZamani = setTimeout(bosalt, 800);
    panelSay();
    return o;
  }
  function bosalt() {
    yazZamani = null;
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
    if (!acikMi('harita')) return null;
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
    if (bizim(e.target)) return;
    if (isaretlemede) return;
    const el = e.target.closest ? (e.target.closest(TIK) || e.target) : null;
    if (!el) return;
    tikNo++;
    sonTik = { no: tikNo, zaman: Date.now(), oge: oge(el) };
    olay('tik', { tikNo, oge: sonTik.oge, kesif: kesifte || undefined });
    if (acikMi('durum')) durumIzle();
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
        if (acikMi('harita')) a.harita = harita(p);
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
    if (bizim(el) || !el.tagName) return;
    const o = { tikNo, oge: { etiket: el.tagName.toLowerCase(), secici: secici(el), ad: el.name || '' } };
    if (el.tagName === 'SELECT') o.secilen = kirp(el.options[el.selectedIndex] ? el.options[el.selectedIndex].textContent : '', 60);
    else if (el.type === 'checkbox' || el.type === 'radio') o.isaretli = el.checked;
    else if (gizliAlan(el)) o.gizli = true;
    else o.uzunluk = (el.value || '').length;
    olay('degisim', o);
  }

  // Adres değişikliği (tek sayfa uygulamaları) ve açılan yeni pencereler
  function adresDegisti(neden) { olay('adres', { neden, adres: location.href.replace(location.origin, '') }); setTimeout(() => haritaKaydet('adres'), 1200); }
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
    if (/\.(js|mjs|css|png|jpe?g|gif|webp|svg|woff2?|ttf|ico|map)(\?|$)/i.test(o.adres)) return;
    const tik = sonTik && Date.now() - sonTik.zaman < 4000 ? sonTik.no : null;
    const kayit = { yontem: (o.yontem || 'GET').toUpperCase(), adres: adresTemizle(o.adres), durum: o.durum, icerikTuru: o.tur || '', sure: o.sure, tikNo: tik, istek: govdeTemizle(o.govde), basliklar: basliklarTemizle(o.basliklar) };
    if (o.metin != null) { kayit.yanit = o.metin.slice(0, YANIT_SINIRI); if (o.metin.length > YANIT_SINIRI) kayit.kesildi = o.metin.length; }
    if (o.hata) kayit.hata = o.hata;
    if (o.yonlendi) kayit.yonlendi = o.yonlendi;
    if (acikMi('ag')) olay('istek', kayit);
    if (acikMi('hata') && (o.hata || o.durum >= 400)) olay('hata', { kaynak: 'istek', mesaj: kayit.yontem + ' ' + kayit.adres + ' → ' + (o.hata || o.durum), tikNo: tik });
  }
  // Süren istek sayısı: keşif ve toplayıcı sayfanın sakinleşmesini bununla bekler.
  let bekleyen = 0;
  const ASIL_FETCH = window.fetch;
  if (acikMi('ag') || acikMi('hata')) {
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
        if (!acikMi('ag') || IKILI.test(tur) || tur.includes('event-stream')) istekKaydet(k);
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
          try { if (!acikMi('ag')) metin = null; else if (!IKILI.test(tur) && (x.responseType === '' || x.responseType === 'text')) metin = x.responseText; else if (x.responseType === 'json') metin = JSON.stringify(x.response); } catch (e) {}
          istekKaydet({ yontem: k.yontem, adres: k.adres, govde, basliklar: k.basliklar, durum: x.status, tur, metin, sure: Math.round(performance.now() - t), hata: x.status === 0 ? 'ağ hatası' : undefined, yonlendi: x.responseURL && x.responseURL !== new URL(k.adres, location.href).href ? x.responseURL : undefined });
        });
      }
      return xSend.apply(this, arguments);
    };
  }

  // ------------------------------------------------ HATA GÜNLÜĞÜ
  if (acikMi('hata')) {
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
      try { olay('hata', { kaynak: 'konsol', mesaj: kirp([...arguments].map(a => a && a.stack ? a.stack : (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '), 2000) }); } catch (e) {}
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
    if (!acikMi('isaretci')) return;
    isaretlemede = true;
    vurgu = vurgu || Object.assign(document.createElement('div'), { id: KOK_ID + '-vurgu' });
    vurgu.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;border:2px solid #f59e0b;background:#f59e0b22;border-radius:3px;transition:all 60ms';
    (document.body || document.documentElement).appendChild(vurgu);
    panelDurum('Öğeye tıkla · Esc vazgeç');
  }
  function isaretciKapat() {
    isaretlemede = false; uzerindeki = null;
    if (vurgu) vurgu.remove();
    panelDurum('');
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
    const kayit = {
      oge: oge(el), sinif: kirp(typeof el.className === 'string' ? el.className : '', 200),
      oznitelikler: Object.fromEntries([...el.attributes].filter(a => a.name !== 'value' && a.name !== 'class' && a.name !== 'style').slice(0, 20).map(a => [a.name, kirp(a.value, 120)])),
      cevre, kardes: el.parentElement ? el.parentElement.children.length : 0,
      eslesme: (() => { try { return document.querySelectorAll(secici(el)).length; } catch (e) { return 0; } })(),
      html: el.outerHTML.slice(0, 1500)
    };
    if (acikMi('tasarim')) { kayit.stil = stilOku(el); kayit.zemin = gercekZemin(el); kayit.degiskenler = kullanilanDegiskenler(el); }
    if (gizliAlan(el)) delete kayit.html;
    olay('isaret', kayit);
    panelBildir('İşaretlendi: ' + kayit.oge.secici);
  }
  // İşaretleme sırasında sayfanın kendi tıklaması çalışmaz.
  for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) addEventListener(t, e => {
    if (!isaretlemede || bizim(e.target)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (t === 'click') { const el = document.elementFromPoint(e.clientX, e.clientY) || e.target; isaretciKapat(); isaretle(el); }
  }, true);
  addEventListener('keydown', e => { if (isaretlemede && e.key === 'Escape') isaretciKapat(); }, true);

  // ------------------------------------------------ SAKİNLİK: istek bitti, sayfa bir süre değişmedi
  function sakinBekle(enCok, sessiz) {
    enCok = enCok || 5000; sessiz = sessiz || 600;
    return new Promise(coz => {
      const t0 = Date.now(); let son = Date.now();
      const g = new MutationObserver(() => { son = Date.now(); });
      g.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
      const bak = () => {
        const simdi = Date.now();
        if ((bekleyen <= 0 && simdi - son >= sessiz && simdi - t0 >= 300) || simdi - t0 >= enCok) { g.disconnect(); coz(); }
        else setTimeout(bak, 100);
      };
      setTimeout(bak, 150);
    });
  }
  const bekle = ms => new Promise(c => setTimeout(c, ms));

  // ------------------------------------------------ OTOMATİK KEŞİF
  // Metin'in elle gezdiğini tamamlar. Frenli düğmeye, başka sayfaya giden bağlantıya, yeni sekme açan
  // bağlantıya ve form gönderen düğmeye basmaz. Keşif sürerken confirm/alert/prompt engellenir (hayır).
  let kesifte = false, kesifDur = false;
  const KESIF_SINIR = 80;
  const SEKME = '[role=tab], .nav-tabs a, .nav-tabs button, .nav-pills a, .nav-pills button, .tab-link, [data-toggle=tab], [data-bs-toggle=tab]';
  function acikPencere() {
    const l = [...document.querySelectorAll(PENCERE)].filter(p => !bizim(p) && gorunur(p) && !p.matches('[role=tabpanel], [role=listbox], [role=menu]'));
    return l.length ? l[l.length - 1] : null;
  }
  function guvenliMi(el) {
    if (!el || !el.isConnected || bizim(el) || frenli(el) || !gorunur(el)) return false;
    if (el.closest('[disabled], [aria-disabled=true]')) return false;
    const a = el.closest('a[href]');
    if (a) {
      const h = (a.getAttribute('href') || '').trim();
      if (a.target === '_blank' || a.hasAttribute('download')) return false;
      if (h && !/^(#|javascript:)/i.test(h)) {
        try { const u = new URL(h, location.href); if (u.origin !== location.origin || u.pathname + u.search !== location.pathname + location.search) return false; } catch (e) { return false; }
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
  async function kesfet() {
    if (kesifte || !acikMi('kesif')) return;
    kesifte = true; kesifDur = false;
    const adresYok = () => location.href.split('#')[0];
    const adres0 = adresYok(), denenen = new Set();
    let adim = 0, atlanan = 0;
    const asil = { confirm: window.confirm, alert: window.alert, prompt: window.prompt, open: window.open };
    window.open = u => { olay('kesif', { uyari: 'yeni pencere engellendi', mesaj: kirp(String(u || ''), 200) }); return null; };
    window.confirm = m => { olay('kesif', { uyari: 'confirm engellendi (hayır)', mesaj: kirp(String(m), 200) }); return false; };
    window.alert = m => { olay('kesif', { uyari: 'alert', mesaj: kirp(String(m), 200) }); };
    window.prompt = m => { olay('kesif', { uyari: 'prompt engellendi', mesaj: kirp(String(m), 200) }); return null; };
    const devam = () => !kesifDur && adim < KESIF_SINIR && adresYok() === adres0;
    const tikla = async (el, neden) => {
      if (!devam()) return false;
      const anahtar = secici(el) + '|' + kirp(el.textContent, 40);
      if (denenen.has(anahtar)) return false;
      // Görünmeyen öğe sonra görünebilir (kapalı penceredeki sekme); denenmiş sayılmaz
      if (!guvenliMi(el)) { if (el.isConnected && gorunur(el)) { denenen.add(anahtar); atlanan++; } return false; }
      denenen.add(anahtar);
      adim++;
      kesifBildir(adim + '. ' + neden + ': ' + kirp(el.textContent || el.getAttribute('aria-label') || '', 30));
      try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
      el.click();
      await sakinBekle();
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
        const ilk = sel.selectedIndex;
        for (let i = 0; i < Math.min(sel.options.length, 40) && devam(); i++) {
          if (i === ilk || sel.options[i].disabled) continue;
          adim++;
          kesifBildir(adim + '. seçenek: ' + kirp(sel.options[i].textContent, 30));
          sel.selectedIndex = i;
          sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true }));
          olay('degisim', { tikNo, kesif: true, oge: { etiket: 'select', secici: secici(sel), ad: sel.name || '' }, secilen: kirp(sel.options[i].textContent, 60) });
          if (acikMi('durum')) durumIzle();
          await sakinBekle();
        }
        if (sel.selectedIndex !== ilk && sel.isConnected) { sel.selectedIndex = ilk; sel.dispatchEvent(new Event('change', { bubbles: true })); await sakinBekle(); }
      }
    };
    const bolumler = async kok => {
      const l = [...kok.querySelectorAll('[aria-expanded=false], details:not([open]) > summary')].filter(e => !bizim(e) && !e.matches(SEKME) && e.getAttribute('aria-haspopup') !== 'menu');
      for (const el of l.slice(0, 20)) await tikla(el, 'kapalı bölüm');
    };
    olay('kesif', { basladi: true, baslik: document.title });
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
        const dugme = [...kart.querySelectorAll(TIK)].find(guvenliMi);
        if (!dugme || !(await tikla(dugme, 'kart'))) continue;
        const p = acikPencere();
        if (p) { await sekmeler(p, 'pencere'); if (devam()) { pencereKapat(p); await sakinBekle(); } }
      }
    } catch (e) {
      olay('hata', { kaynak: 'keşif', mesaj: kirp(String(e && e.message || e), 300) });
    } finally {
      Object.assign(window, asil);
      kesifte = false;
      const neden = kesifDur ? 'durduruldu' : adresYok() !== adres0 ? 'adres değişti' : adim >= KESIF_SINIR ? 'adım sınırı' : 'bitti';
      olay('kesif', { bitti: true, adim, atlanan, neden });
      kesifBildir('Keşif ' + neden + ': ' + adim + ' adım, ' + atlanan + ' frenli/güvensiz atlandı');
      haritaImzalari.clear(); haritaKaydet('keşif sonu');
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
    if (toplamada || !acikMi('toplayici')) return;
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
      const veri = { arac: 'Web Ajanı', surum: SURUM, site: location.host, indirildi: new Date().toISOString(), ayar, olaySayisi: olaylar.length, olaylar };
      const z = new Date(), p = n => String(n).padStart(2, '0');
      const ad = 'web-ajani-' + host.replace(/[^\w.-]/g, '_') + '-' + z.getFullYear() + p(z.getMonth() + 1) + p(z.getDate()) + '-' + p(z.getHours()) + p(z.getMinutes()) + '.json';
      const a = document.createElement('a');
      a.download = ad; a.href = URL.createObjectURL(new Blob([JSON.stringify(veri)], { type: 'application/json' }));
      a.id = KOK_ID + '-indir';
      document.documentElement.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      panelBildir(olaylar.length + ' kayıt indirildi');
      return ad;
    });
  }

  // ------------------------------------------------ PANEL: küçük düğme, açılınca modüller ve eylemler
  let kok = null, govde = null, sayEl = null, durumEl = null;
  const CSS_PANEL = `
    :host{all:initial}
    .d{position:fixed;left:10px;bottom:10px;z-index:2147483647;width:30px;height:30px;border-radius:50%;background:#0f172a;color:#f8fafc;font:600 12px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 6px #0007;border:1px solid #334155;user-select:none}
    .d.k{outline:2px solid #f59e0b}
    .p{position:fixed;left:10px;bottom:46px;z-index:2147483647;width:270px;max-height:70vh;overflow:auto;background:#0f172a;color:#e2e8f0;font:13px/1.4 system-ui,sans-serif;border:1px solid #334155;border-radius:10px;padding:10px;box-shadow:0 4px 18px #000a}
    h4{margin:0 0 6px;font-size:13px;color:#f8fafc}
    label{display:flex;gap:6px;align-items:flex-start;margin:3px 0;cursor:pointer}
    label small{display:block;color:#94a3b8;font-size:11px}
    .b{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
    button{background:#1d4ed8;color:#fff;border:0;border-radius:6px;padding:5px 8px;font:12px system-ui,sans-serif;cursor:pointer}
    button.i{background:#334155}
    .s{color:#94a3b8;font-size:11px;margin-top:6px;word-break:break-all}
    .n{color:#fbbf24;font-size:11px;min-height:14px;margin-top:4px;word-break:break-all}
    details{margin:4px 0}summary{cursor:pointer;color:#cbd5e1}
    .k{border-top:1px solid #334155;margin-top:8px;padding-top:6px}
    .k b{font-size:12px;color:#f8fafc}
    select,input.tv,input.tb{width:100%;box-sizing:border-box;margin-top:4px;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:5px;padding:4px;font:12px system-ui,sans-serif}
    label.sat{display:flex;align-items:center;gap:6px;font-size:11px;color:#94a3b8}label.sat input{width:90px}`;
  function panelKur() {
    if (kok || !document.body || CERCEVE) return;
    kok = document.createElement('div'); kok.id = KOK_ID;
    const g = kok.attachShadow({ mode: 'open' });
    g.innerHTML = '<style>' + CSS_PANEL + '</style><div class="d" title="Web Ajanı">WA</div>';
    g.querySelector('.d').addEventListener('click', panelAcKapa);
    document.body.appendChild(kok);
  }
  function panelAcKapa() {
    const g = kok.shadowRoot;
    if (govde) { govde.remove(); govde = null; kesifEl = toplaEl = null; return; }
    govde = document.createElement('div'); govde.className = 'p';
    let td = null; try { td = JSON.parse(localStorage.getItem(TOPLA)); } catch (e) {}
    govde.innerHTML = '<h4>Web Ajanı ' + SURUM + ' · ' + host + '</h4>' +
      '<details><summary>Modüller</summary>' +
      MODULLER.map(([k, ad, not]) => '<label><input type="checkbox" data-m="' + k + '"' + (acikMi(k) ? ' checked' : '') + '><span>' + ad + '<small>' + not + '</small></span></label>').join('') + '</details>' +
      '<div class="b"><button data-e="isaret">İşaretle</button><button data-e="tasarim">Tasarımı oku</button><button data-e="harita">Sayfayı tara</button><button data-e="fotokopi">Fotokopi</button><button data-e="indir">İndir</button></div>' +
      (acikMi('kesif') ? '<div class="k"><b>Keşif</b><div class="b"><button data-e="kesfet">Keşfet</button><button class="i" data-e="kesifdur">Durdur</button></div><div class="n kn"></div></div>' : '') +
      (acikMi('toplayici') ? '<div class="k"><b>Toplayıcı</b><select class="ta"><option value="">Veri adresi seç (önce sayfada gez)</option></select>' +
        '<input class="tv" placeholder="yil=2015-2026; sayfa=1-45"><label class="sat">Bekleme ms <input class="tb" type="number" value="1500" min="300" step="100"></label>' +
        '<div class="b"><button data-e="topla">Başlat</button><button class="i" data-e="topladur">Durdur</button>' + (td && td.ornek && td.sira < td.toplam ? '<button data-e="toplasurdur">Sürdür (' + td.sira + '/' + td.toplam + ')</button>' : '') + '</div><div class="n tn"></div></div>' : '') +
      '<div class="b"><button class="i" data-e="sifirla">Kaydı sil</button><button class="i" data-e="kapat">Bu sitede kapat</button></div>' +
      '<div class="s"></div><div class="n"></div>';
    g.appendChild(govde);
    sayEl = govde.querySelector('.s'); durumEl = govde.querySelector('.n:last-child');
    kesifEl = govde.querySelector('.kn'); toplaEl = govde.querySelector('.tn');
    panelSay();
    const sec = govde.querySelector('.ta');
    let adresler = [];
    if (sec) adresleriListele().then(l => {
      adresler = l;
      for (const [ad] of l) { const o = document.createElement('option'); o.value = ad; o.textContent = ad; sec.appendChild(o); }
      if (td && td.ornek) { sec.value = td.ornek.yontem + ' ' + td.ornek.adres.split('?')[0]; govde.querySelector('.tv').value = td.degiskenMetni || ''; }
    });
    govde.addEventListener('change', e => {
      const m = e.target.getAttribute('data-m'); if (!m) return;
      ayar.moduller[m] = e.target.checked; ayarYaz();
      if (m === 'ag' || m === 'hata') panelBildir('Ağ ve hata kancası sayfa yenilenince değişir');
      if (m === 'kesif' || m === 'toplayici') { panelAcKapa(); panelAcKapa(); }
    });
    govde.addEventListener('click', e => {
      const a = e.target.getAttribute('data-e'); if (!a) return;
      if (a === 'isaret') { if (!acikMi('isaretci')) return panelBildir('Öğe işaretçi kapalı'); govde.remove(); govde = null; isaretciAc(); }
      else if (a === 'tasarim') { if (!acikMi('tasarim')) return panelBildir('Tasarım okuyucu kapalı'); sayfaTasarimi(); panelBildir('Sayfa tasarımı kaydedildi'); }
      else if (a === 'harita') { haritaImzalari.clear(); haritaKaydet('elle'); panelBildir('Sayfa tarandı'); }
      else if (a === 'fotokopi') {
        if (!acikMi('fotokopi')) return panelBildir('Sayfa fotokopisi kapalı');
        const m = fotokopi();
        olay('fotokopi', { baslik: document.title, metin: m });
        try { navigator.clipboard.writeText(m).then(() => panelBildir('Fotokopi kaydedildi ve panoya kopyalandı (' + m.length + ' karakter)'), () => panelBildir('Fotokopi kaydedildi (' + m.length + ' karakter)')); } catch (x) { panelBildir('Fotokopi kaydedildi'); }
      }
      else if (a === 'indir') indir();
      else if (a === 'kesfet') kesfet();
      else if (a === 'kesifdur') { kesifDur = true; kesifBildir('Durduruluyor…'); }
      else if (a === 'topla') {
        const x = adresler.find(([ad]) => ad === sec.value);
        if (!x) return toplamaBildir('Önce listeden bir veri adresi seç');
        toplayiciBaslat(x[1], govde.querySelector('.tv').value, govde.querySelector('.tb').value, false);
      }
      else if (a === 'toplasurdur') toplayiciBaslat(null, '', 0, true);
      else if (a === 'topladur') { toplamaDur = true; toplamaBildir('Durduruluyor…'); }
      else if (a === 'sifirla') { if (confirm('Bu sitedeki Web Ajanı kaydı silinsin mi?')) temizle().then(() => { for (const k of Object.keys(sayac)) sayac[k] = 0; haritaImzalari.clear(); try { localStorage.removeItem(TOPLA); } catch (x) {} panelSay(); panelBildir('Kayıt silindi'); }); }
      else if (a === 'kapat') { try { localStorage.setItem(IZIN, '0'); } catch (x) {} location.reload(); }
    });
  }
  let kesifEl = null, toplaEl = null;
  function kesifBildir(t) { if (kesifEl) kesifEl.textContent = t; panelDurum(kesifte ? 'Keşif: ' + t : ''); }
  function toplamaBildir(t) { if (toplaEl) toplaEl.textContent = t; panelDurum(toplamada ? 'Toplama: ' + t : ''); }
  function panelSay() {
    if (!sayEl) return;
    sayEl.textContent = 'Bu oturumda: ' + sayac.toplam + ' kayıt · ' + (sayac.tik || 0) + ' tık · ' + (sayac.istek || 0) + ' istek · ' + (sayac.harita || 0) + ' harita · ' + (sayac.hata || 0) + ' hata · ' + (sayac.isaret || 0) + ' işaret';
  }
  function panelDurum(t) {
    if (!kok) return;
    kok.shadowRoot.querySelector('.d').classList.toggle('k', !!t);
    kok.shadowRoot.querySelector('.d').title = t || 'Web Ajanı';
  }
  let bildirimZamani;
  function panelBildir(t) {
    if (durumEl) durumEl.textContent = t;
    panelDurum(t); clearTimeout(bildirimZamani); bildirimZamani = setTimeout(() => panelDurum(isaretlemede ? 'Öğeye tıkla · Esc vazgeç' : ''), 2500);
  }

  // ------------------------------------------------ başlangıç
  addEventListener('click', tikla, true);
  addEventListener('change', degisti, true);
  function hazir() {
    panelKur();
    const ilk = () => { haritaKaydet('yükleme'); olay('acilis', { baslik: document.title, kurulumMs: Math.round(kurulumMs * 10) / 10, surum: SURUM }); };
    (window.requestIdleCallback || (f => setTimeout(f, 300)))(ilk, { timeout: 3000 });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hazir); else hazir();
  const kurulumMs = performance.now() - T0;
  // Sınama ve konsol için: sayfadan erişilen tek ad.
  window.__webAjani = { surum: SURUM, kurulumMs: () => kurulumMs, indir, isaretciAc, sayfaTasarimi, haritaKaydet, hepsiniOku, bosalt, temizle,
    kesfet, kesifteMi: () => kesifte, toplayiciBaslat, toplamadaMi: () => toplamada, adresleriListele, fotokopi, degiskenCoz, istekKur };
})();
