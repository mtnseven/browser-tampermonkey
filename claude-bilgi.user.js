// ==UserScript==
// @name         Claude Bilgi
// @namespace    metin-claude-bilgi
// @version      0.1.0
// @description  claude.ai ve claude.ai/code: gönderilen mesajın sonuna o anki model ve efor eklenir; Claude cevabının sonundaki başlık, proje ve zaman satırları tek bilgi şeridine toplanır, şeride token, süre ve hız sayaçları eklenir
// @match        https://claude.ai/*
// @run-at       document-idle
// @noframes
// @updateURL    https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/claude-bilgi.user.js
// @downloadURL  https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/claude-bilgi.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  /* ================================================================
     B1 · AYAR
     Takip TTVY. Metin'in sözü: "benim sohbetimin sonunda işte gönderirken
     işte mesajın sonuna model ve efor seviyesinde monte edip gönderebilir."
     24.11.2026: "code veya web tarafında olsun ... ikisinde de olsun. sohbet
     sonu tüm bilgilendirmelere çeki düzen ver ... 🪙 35460 token ⏱️ 13.6 sn
     ⚡ 2599.1 t/sn gibi sayaçları da ekle."
     Seçiciler Site Tema ve Mesaj Katla kayıtlarından; gerçek sayfada
     doğrulanmadı. Sayfa değişirse yalnız bu blok güncellenir.
     ================================================================ */
  const MODEL_DUGME = 'button[data-testid="model-selector-dropdown"], button[data-testid*="model-selector"]';
  const YAZMA = '.ProseMirror[contenteditable="true"], textarea';
  const MESAJ = '[data-testid="assistant-message"], .font-claude-response';
  const KARAKTER_TOKEN = 3;   // Türkçe metinde yaklaşık karakter / token; sayaç tahmindir (≈)
  const SESSIZ_MS = 2000;     // cevap bu kadar süre değişmezse bitti sayılır
  const ETIKET = '⚙';         // mesaja eklenen satırın başı; ikinci kez eklenmez

  const ayar = (ad, v) => GM_getValue(ad, v);
  let ekle = ayar('ekle', true);     // mesaja model ve efor
  let serit = ayar('serit', true);   // cevap sonu bilgi şeridi

  /* ================================================================
     B2 · MODEL VE EFOR
     Model düğmesinin yazısı okunur. Efor düğmede yazmıyorsa model menüsü
     açıldığında seçili (aria-checked) satırlar kaydedilir; son kayıt
     kullanılır.
     ================================================================ */
  const temiz = (s) => (s || '').replace(/\s+/g, ' ').trim();

  function menuOku() {
    const menu = document.querySelector('[role="menu"]');
    if (!menu) return;
    const secili = [...menu.querySelectorAll('[aria-checked="true"], [data-state="checked"]')]
      .map(e => temiz(e.textContent).split(' ').slice(0, 4).join(' ')).filter(Boolean);
    if (secili.length) GM_setValue('secili', secili);
  }

  function modelEfor() {
    const d = document.querySelector(MODEL_DUGME);
    const dugme = d ? temiz(d.innerText || d.textContent) : '';
    const secili = ayar('secili', []);
    const parca = dugme ? [dugme] : [];
    for (const s of secili) if (!parca.some(p => p.toLowerCase().includes(s.toLowerCase()))) parca.push(s);
    return parca.join(' · ');
  }

  /* ================================================================
     B3 · GÖNDERİRKEN EKLE
     Enter (Shift'siz) yazma kutusunda yakalanır: satır eklenir, sonra
     aynı Enter yeniden gönderilir. Gönder düğmesi tıklanınca da satır
     eklenir, tıklama kısa gecikmeyle yinelenir. Satır zaten varsa,
     mesaj boşsa veya model okunamazsa hiçbir şey yapılmaz.
     ================================================================ */
  let yineleniyor = false;

  function satirEkle(kutu) {
    const bilgi = modelEfor();
    if (!bilgi) return false;
    const metin = kutu.tagName === 'TEXTAREA' ? kutu.value : kutu.innerText;
    if (!temiz(metin) || metin.includes(ETIKET + ' ')) return false;
    const satir = `${ETIKET} ${bilgi}`;
    if (kutu.tagName === 'TEXTAREA') {
      const yaz = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      yaz.call(kutu, kutu.value.replace(/\s+$/, '') + '\n\n' + satir);
      kutu.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    kutu.focus();
    const r = document.createRange();
    r.selectNodeContents(kutu); r.collapse(false);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    document.execCommand('insertParagraph');
    document.execCommand('insertText', false, satir);
    return true;
  }

  document.addEventListener('keydown', (e) => {
    if (!ekle || yineleniyor || e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const kutu = e.target.closest && e.target.closest(YAZMA);
    if (!kutu) return;
    if (!satirEkle(kutu)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    setTimeout(() => {
      yineleniyor = true;
      kutu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
      yineleniyor = false;
    }, 80);
  }, true);

  document.addEventListener('click', (e) => {
    if (yineleniyor) return;
    const b = e.target.closest && e.target.closest('button[aria-label*="Send" i], button[aria-label*="Gönder" i]');
    if (b) {
      if (!ekle) return;
      const kutu = document.querySelector(YAZMA);
      if (!kutu || !satirEkle(kutu)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      setTimeout(() => { yineleniyor = true; b.click(); yineleniyor = false; }, 80);
      return;
    }
    if (e.target.closest && e.target.closest(MODEL_DUGME + ', [role="menu"]')) setTimeout(menuOku, 150);
  }, true);

  /* ================================================================
     B4 · BİLGİ ŞERİDİ
     Cevabın sonundaki üç bilgi bulunur:
       başlık bloğu   `🐧 261124 |Etiket |Etiket` (tek satırlık kod bloğu)
       proje satırı   Proje 🐧 · [VPS-Ana-Yönetim]
       zaman damgası  24.11.2026 17:17
     Özgün satırlar gizlenir, silinmez (kopyalama ve Mesaj Katla bozulmaz).
     Yerine tek şerit: proje · zaman · 🪙 token · ⏱️ süre · ⚡ hız, başlık
     dokununca kopyalanır. Gönderilen mesajdaki ⚙ satırı soluk yazılır.
     Süre yalnız bu sayfa açıkken akan cevapta ölçülür: ilk yazıdan son
     değişikliğe. Token sayısı karakterden tahmindir.
     ================================================================ */
  const DAMGA = /(\d{2}\.\d{2}\.\d{4} \d{2}:\d{2})\s*$/;
  const PROJE = /(?:^|\n)\s*Proje\s+(\S+)\s*·\s*\[([^\]]+)\]\s*/;
  const BASLIK = /^\s*(\S+\s+)?\d{6}\s+\|/;

  const CSS = `
.cb-gizli { display: none !important; }
.cb-serit { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: center; margin-top: 10px; padding: 6px 10px;
  border-top: 1px solid rgba(127,127,127,.25); font: 12px/1.5 ui-monospace, "Courier New", monospace; opacity: .75; }
.cb-serit .cb-baslik { cursor: pointer; border: 1px solid rgba(127,127,127,.35); border-radius: 4px; padding: 0 6px; }
.cb-serit .cb-baslik:hover { opacity: 1; }
.cb-soluk { opacity: .55; font-size: .85em; }
`;
  const olcum = new WeakMap(); // mesaj → { ilk, son, bitti }
  const sayfaAcilis = Date.now();

  function stilKur() {
    if (document.getElementById('cb-stil')) return;
    const s = document.createElement('style'); s.id = 'cb-stil'; s.textContent = CSS;
    document.head.append(s);
  }

  function sureYaz(ms) { return (ms / 1000).toFixed(1) + ' sn'; }

  function seritKur(mesaj) {
    if (mesaj.querySelector('.cb-serit')) { sayacYaz(mesaj); return; }
    // Son blok öğeleri: zaman damgası en sondaki paragrafta durur
    const bloklar = [...mesaj.querySelectorAll('p, pre')].filter(b => !b.closest('.cb-serit'));
    const son = bloklar[bloklar.length - 1];
    if (!son || son.tagName !== 'P') return;
    const m = DAMGA.exec(son.innerText || '');
    if (!m) return;
    const yazi = son.innerText;
    // Yalnız saf bilgi paragrafına dokunulur: proje + damga, başka yazı yok
    if (yazi.replace(DAMGA, '').replace(PROJE, '').trim()) return;
    const gizle = [son];
    let proje = PROJE.exec(yazi);
    let p = son.previousElementSibling, baslik = '';
    if (!proje && p && p.tagName === 'P') {
      const pp = PROJE.exec(p.innerText || '');
      if (pp && !p.innerText.replace(PROJE, '').trim()) { proje = pp; gizle.push(p); p = p.previousElementSibling; }
    }
    // Başlık bloğu: tek satırlık kod bloğu (claude.ai pre'yi kutulara sarar)
    const pre = !p ? null : p.tagName === 'PRE' ? p : (p.tagName !== 'P' && p.querySelectorAll('pre').length === 1 ? p.querySelector('pre') : null);
    const bt = pre ? (pre.innerText || '').trim() : '';
    if (pre && BASLIK.test(bt) && !bt.includes('\n')) { baslik = bt; gizle.push(p); }
    gizle.forEach(g => g.classList.add('cb-gizli'));
    const s = document.createElement('div');
    s.className = 'cb-serit';
    if (proje) s.append(span(`${proje[1]} ${proje[2]}`));
    s.append(span(m[1]));
    s.append(span('', 'cb-token'), span('', 'cb-sure'), span('', 'cb-hiz'));
    if (baslik) {
      const b = span('📋 ' + baslik, 'cb-baslik');
      b.title = 'Sohbet başlığını kopyala';
      b.addEventListener('click', () => navigator.clipboard.writeText(baslik).then(() => { b.textContent = '✓ kopyalandı'; setTimeout(() => { b.textContent = '📋 ' + baslik; }, 1500); }));
      s.append(b);
    }
    // Şerit gizlenen paragraftan hemen sonra
    son.after(s);
    sayacYaz(mesaj);
  }

  function span(t, sinif) { const e = document.createElement('span'); e.textContent = t; if (sinif) e.className = sinif; return e; }

  function sayacYaz(mesaj) {
    const s = mesaj.querySelector('.cb-serit');
    if (!s) return;
    const metin = [...mesaj.querySelectorAll('p, li, pre, h1, h2, h3, h4, td, th')]
      .filter(e => !e.closest('.cb-serit') && !e.parentElement.closest('p, li, pre, td, th'))
      .map(e => e.innerText).join('\n');
    const token = Math.round(metin.length / KARAKTER_TOKEN);
    s.querySelector('.cb-token').textContent = `🪙 ≈${token} token`;
    const o = olcum.get(mesaj);
    if (o && o.bitti && o.son > o.ilk) {
      const sn = (o.son - o.ilk) / 1000;
      s.querySelector('.cb-sure').textContent = `⏱️ ${sureYaz(o.son - o.ilk)}`;
      s.querySelector('.cb-hiz').textContent = `⚡ ${(token / sn).toFixed(1)} t/sn`;
    }
  }

  function gonderileniSolgunla() {
    document.querySelectorAll('[data-testid="user-message"] p:not(.cb-soluk)').forEach(p => {
      if ((p.innerText || '').trim().startsWith(ETIKET + ' ')) p.classList.add('cb-soluk');
    });
  }

  // Akan cevabın ölçümü: sayfa açıldıktan sonra beliren mesaj izlenir
  let zamanlayici = null;
  function tara() {
    if (!serit) return;
    stilKur();
    const simdi = Date.now();
    const hepsi = [...document.querySelectorAll(MESAJ)].filter(e => !e.parentElement.closest(MESAJ));
    hepsi.forEach((m, n) => {
      let o = olcum.get(m);
      // Şeridin kendi yazısı sayılmaz; yoksa şerit kurulunca cevap "değişti" sanılır
      const sr = m.querySelector('.cb-serit');
      const uzunluk = (m.innerText || '').length - (sr ? (sr.innerText || '').length : 0);
      if (!o) {
        // Sayfa açılışında var olan mesajın süresi bilinmez
        o = { ilk: simdi, son: simdi, uzunluk, bitti: simdi - sayfaAcilis < 3000, olculur: simdi - sayfaAcilis >= 3000 };
        if (!o.olculur) o.son = o.ilk;
        olcum.set(m, o);
      } else if (o.olculur && uzunluk !== o.uzunluk) {
        o.uzunluk = uzunluk; o.son = simdi; o.bitti = false;
      } else if (!o.bitti && simdi - o.son >= SESSIZ_MS) {
        o.bitti = true;
      }
      if (o.bitti) seritKur(m);
    });
    // claude.ai/code ve seçicinin tutmadığı sayfa: zaman damgalı son paragraflar
    if (!hepsi.length) document.querySelectorAll('p').forEach(p => {
      if (!DAMGA.test(p.innerText || '') || p.dataset.cbBakildi) return;
      const kap = p.parentElement; if (!kap || p !== kap.lastElementChild) return;
      p.dataset.cbBakildi = '1'; seritKur(kap);
    });
    gonderileniSolgunla();
  }

  new MutationObserver(() => {
    if (zamanlayici) return;
    zamanlayici = setTimeout(() => { zamanlayici = null; tara(); }, 400);
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  setInterval(tara, 1000); // sessizlik süresi dolunca şerit kurulsun
  tara();

  /* ================================================================
     B5 · MENÜ
     ================================================================ */
  GM_registerMenuCommand('Claude Bilgi: mesaja model ve efor ekle (aç/kapat)', () => {
    ekle = !ekle; GM_setValue('ekle', ekle); alert('Model ve efor ekleme: ' + (ekle ? 'açık' : 'kapalı'));
  });
  GM_registerMenuCommand('Claude Bilgi: cevap sonu şeridi (aç/kapat)', () => {
    serit = !serit; GM_setValue('serit', serit); location.reload();
  });
})();
