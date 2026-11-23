// ==UserScript==
// @name         Mesaj Katla
// @namespace    metin-mesaj-katla
// @version      0.1.0
// @description  claude.ai sohbet mesajlarını açılır-kapanır karta çevirir; tümünü aç/kapat; son 3 mesajdan öncekiler kendiliğinden kapanır
// @match        https://claude.ai/*
// @run-at       document-idle
// @noframes
// @updateURL    https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/mesaj-katla.user.js
// @downloadURL  https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/mesaj-katla.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const SURUM = '0.1.0';

  /* ================================================================
     M1 · AYAR
     Mesaj seçicileri claude.ai sayfasından (Site Tema ve Web Ajanı
     kayıtları). Sayfa değişirse yalnız bu blok güncellenir.
     ================================================================ */
  const SECICI = '[data-testid="user-message"], .font-claude-response, [data-testid="assistant-message"]';
  const ACIK_KALAN = 3;                 // K3: son kaç mesaj açık kalır
  const BASLIK_UZUNLUK = 90;            // kart başlığında ilk satırın en çok karakteri
  const AYAR_ANAHTAR = 'mesaj-katla.oto';

  let oto = localStorage.getItem(AYAR_ANAHTAR) !== '0';   // K3 varsayılan açık
  let elle = new WeakMap();             // Metin'in tek tek açtığı/kapattığı mesaj → true/false (açık mı)

  /* ================================================================
     M2 · STİL
     ================================================================ */
  const stil = document.createElement('style');
  stil.textContent = `
    .mk-baslik { display:flex; gap:.5em; align-items:baseline; cursor:pointer; user-select:none;
      font: 12px/1.5 system-ui, sans-serif; opacity:.75; padding:2px 6px; margin:2px 0;
      border-left:3px solid currentColor; border-radius:3px; }
    .mk-baslik:hover { opacity:1; background:rgba(127,127,127,.12); }
    .mk-baslik .mk-ok { width:1em; flex:none; }
    .mk-baslik .mk-no { font-weight:600; flex:none; }
    .mk-baslik .mk-metin { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .mk-kapali { display:none !important; }
    #mk-panel { position:fixed; right:6px; top:45%; z-index:2147483000; display:flex; flex-direction:column; gap:4px; }
    #mk-panel button { font: 12px system-ui, sans-serif; padding:3px 6px; border-radius:6px; cursor:pointer;
      border:1px solid rgba(127,127,127,.5); background:rgba(30,30,30,.85); color:#eee; }
    #mk-panel button[aria-pressed="false"] { opacity:.5; }
  `;
  document.head.appendChild(stil);

  /* ================================================================
     M3 · KART (K1)
     Her mesajın önüne başlık konur: sıra no, kim, ilk satır.
     Kapatma yalnız mesaj gövdesini gizler; sayfanın kendi düğümleri
     yerinden oynatılmaz.
     ================================================================ */
  function mesajlar() {
    const hepsi = Array.from(document.querySelectorAll(SECICI));
    // iç içe eşleşmede (assistant-message içinde font-claude-response) dıştaki kalır
    return hepsi.filter(el => !hepsi.some(d => d !== el && d.contains(el)));
  }
  function kim(el) { return el.matches('[data-testid="user-message"]') ? 'Sen' : 'Claude'; }
  function ilkSatir(el) {
    const t = (el.innerText || el.textContent || '').split('\n').map(s => s.trim()).find(s => s);
    if (!t) return '…';
    return t.length > BASLIK_UZUNLUK ? t.slice(0, BASLIK_UZUNLUK - 1) + '…' : t;
  }
  function acikMi(el) { return !el.classList.contains('mk-kapali'); }
  function ayarla(el, acik) {
    el.classList.toggle('mk-kapali', !acik);
    const b = el.__mkBaslik;
    if (b) { b.querySelector('.mk-ok').textContent = acik ? '▾' : '▸'; b.setAttribute('aria-expanded', String(acik)); }
  }
  function baslikKur(el) {
    let b = el.__mkBaslik;
    if (b && b.isConnected && b.nextElementSibling === el) return b;
    b = document.createElement('div');
    b.className = 'mk-baslik';
    b.setAttribute('role', 'button');
    b.innerHTML = '<span class="mk-ok">▾</span><span class="mk-no"></span><span class="mk-metin"></span>';
    b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const yeni = !acikMi(el); elle.set(el, yeni); ayarla(el, yeni);
    });
    el.parentNode.insertBefore(b, el);
    el.__mkBaslik = b;
    return b;
  }

  /* ================================================================
     M4 · TARAMA (K1 + K3)
     Sayfa değişince başlıklar yenilenir. K3: yeni mesaj gelince son
     ACIK_KALAN mesajdan öncekiler kapanır; Metin'in elle seçtiği
     mesaja dokunulmaz.
     ================================================================ */
  let sonSayi = 0;
  function tara() {
    const m = mesajlar();
    m.forEach((el, i) => {
      const b = baslikKur(el);
      b.querySelector('.mk-no').textContent = '#' + (i + 1) + ' · ' + kim(el);
      b.querySelector('.mk-metin').textContent = ilkSatir(el);
      b.title = 'Mesaj ' + (i + 1) + '/' + m.length + ' · aç/kapat';
    });
    if (oto && m.length !== sonSayi) {
      m.forEach((el, i) => {
        if (elle.has(el)) return;
        ayarla(el, i >= m.length - ACIK_KALAN);
      });
    }
    m.forEach(el => { if (el.__mkBaslik) ayarla(el, acikMi(el)); });
    sonSayi = m.length;
  }
  let bekleyen = 0;
  function zamanla() { if (!bekleyen) bekleyen = setTimeout(() => { bekleyen = 0; tara(); }, 250); }
  new MutationObserver(kayitlar => {
    // yalnız kendi başlıklarımızdan gelen değişiklik tarama tetiklemez
    if (kayitlar.every(k => k.target.closest && k.target.closest('.mk-baslik, #mk-panel'))) return;
    zamanla();
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  /* ================================================================
     M5 · PANEL (K2 + K3 düğmesi)
     ================================================================ */
  // Tümü düğmesi tek tek seçimleri sıfırlar; sonraki yeni mesajda K3 yine çalışır.
  function tumu(acik) { elle = new WeakMap(); mesajlar().forEach(el => ayarla(el, acik)); }
  const panel = document.createElement('div');
  panel.id = 'mk-panel';
  panel.innerHTML = '<button data-is="ac" title="Tümünü aç">▾ Tümü</button>' +
                    '<button data-is="kapat" title="Tümünü kapat">▸ Tümü</button>' +
                    '<button data-is="oto" title="Son ' + ACIK_KALAN + ' mesajdan öncekileri kendiliğinden kapat">Oto ' + ACIK_KALAN + '</button>';
  panel.title = 'Mesaj Katla ' + SURUM;
  panel.addEventListener('click', e => {
    const d = e.target.closest('button'); if (!d) return;
    if (d.dataset.is === 'ac') tumu(true);
    if (d.dataset.is === 'kapat') tumu(false);
    if (d.dataset.is === 'oto') {
      oto = !oto; localStorage.setItem(AYAR_ANAHTAR, oto ? '1' : '0');
      d.setAttribute('aria-pressed', String(oto));
      if (oto) { sonSayi = -1; tara(); }
    }
  });
  panel.querySelector('[data-is="oto"]').setAttribute('aria-pressed', String(oto));
  document.body.appendChild(panel);

  tara();
})();
