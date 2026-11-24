// ==UserScript==
// @name         GitHub Göz
// @namespace    metin-github-goz
// @version      0.3.1
// @description  GitHub koyu temalarında yazıyı yumuşatır, mavi bağlantıyı açar, kalın yazıyı inceltir, bağlantı alt çizgisini kaldırır (Soft dark için ayarlı); archive-ortak Pano.md sayfasını kitap düzeninde okuyucuya çevirir
// @match        https://github.com/*
// @match        https://gist.github.com/*
// @run-at       document-start
// @noframes
// @updateURL    https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/github-goz.user.js
// @downloadURL  https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/github-goz.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      github.com
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function () {
  'use strict';

  /* ================================================================
     RENKLER — her renk tek işe bağlı. Kontrast Soft dark zemininde
     (#212830) ölçüldü; hedef 4,5-7 (archive-vps-ana-yonetim
     Harita/Profil_goz_gorunum.md A: parlama sınırı ~7).
     GitHub'ın kendi değeri yanda: yazı 10,3 (patlak), mavi 4,3 (koyu).
     ================================================================ */
  const RENK = {
    yazi:    '#a6afba', // ana yazı, 6,7 (GitHub #d1d7e0, 10,3)
    baslik:  '#acb5c0', // başlık ve dosya adı, 7,2
    sonuk:   '#8a94a2', // ikincil yazı: tarih, sayaç, açıklama, 4,9
    mavi:    '#76acdf', // bağlantı, 6,2 (GitHub #478be6, 4,3)
    ziyaret: '#a094d8', // açılmış bağlantı, 5,5
  };
  const KALIN = 500; // GitHub 600; Metin'de kalın yazı göz alıyor (profil A)

  const CSS = `
:root, [data-color-mode] {
  --fgColor-default: ${RENK.yazi} !important;
  --color-fg-default: ${RENK.yazi} !important;
  --fgColor-muted: ${RENK.sonuk} !important;
  --color-fg-muted: ${RENK.sonuk} !important;
  --fgColor-accent: ${RENK.mavi} !important;
  --color-accent-fg: ${RENK.mavi} !important;
  --fgColor-link: ${RENK.mavi} !important;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4,
.markdown-body h5, .markdown-body h6, h1, h2, h3, .h1, .h2, .h3, .h4 { color: ${RENK.baslik}; }
.markdown-body a:visited { color: ${RENK.ziyaret}; }
/* Alt çizgi yok (Metin 24.11.2026: "tüm altı çizgili yazılardan kurtul"); GitHub'ın
   erişilebilirlik ayarı "link underlines" açıkken de geçerli */
a, a:hover, a:focus, .markdown-body a, .markdown-body a:hover, [data-a11y-link-underlines] a,
[data-a11y-link-underlines="true"] .markdown-body a, .Link, .Link--primary, .Link--secondary {
  text-decoration: none !important;
}
b, strong, th, .text-bold, .text-semibold, .f1, .f2, .f3, .f4,
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4,
.markdown-body h5, .markdown-body h6, .markdown-body strong, .markdown-body th,
h1, h2, h3, h4, .h1, .h2, .h3, .h4 { font-weight: ${KALIN} !important; }
`;

  const ACIK_ANAHTAR = 'acik';
  let acik = GM_getValue(ACIK_ANAHTAR, true);
  const stil = document.createElement('style');
  stil.id = 'github-goz';
  stil.textContent = CSS;
  const koyu = window.matchMedia('(prefers-color-scheme: dark)');

  // Yalnız koyu tema etkinken: data-color-mode="dark" ya da "auto" + sistem koyu
  function koyuMu() {
    const mod = document.documentElement.getAttribute('data-color-mode');
    return mod === 'dark' || (mod === 'auto' && koyu.matches);
  }

  function uygula() {
    if (!document.documentElement) return;
    const gerek = acik && koyuMu();
    if (gerek && !stil.isConnected) document.documentElement.appendChild(stil);
    if (!gerek && stil.isConnected) stil.remove();
  }

  // document-start anında <html> henüz olmayabilir; oluşunca başlanır
  function baslat() {
    uygula();
    new MutationObserver(uygula).observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode'] });
  }
  if (document.documentElement) baslat();
  else new MutationObserver(function (_, g) {
    if (document.documentElement) { g.disconnect(); baslat(); }
  }).observe(document, { childList: true });
  koyu.addEventListener('change', uygula);
  // Sayfa geçişinde (Turbo) <head> yenilenir; stil <html> altında durduğu için kalır, yine de denetlenir
  document.addEventListener('turbo:load', uygula);

  GM_registerMenuCommand('GitHub Göz: aç / kapat', function () {
    acik = !acik;
    GM_setValue(ACIK_ANAHTAR, acik);
    uygula();
  });

  /* ================================================================
     PANO OKUYUCU (0.3.0) — archive-ortak Pano.md sayfası kitap düzeninde.
     Metin 24.11.2026: "tüm sınırlamaları tampermonkey ile üstesinden gel.
     çok çok daha gelişmiş olsun" ; "en iyisi kitap stilimiz".
     Düzen x-bicim-kitap'tan: tek sütun, dar sayfa, koyu zemin, İçindekiler,
     her bölümde "↑ İçindekiler". Aynı anda yalnız bir bölüm görünür; açık iş
     başlığıyla birlikte iki çift çizgi arasında durur.
     Veri: Pano.json (Betik_pano_uret.py üretir); sayfadaki Markdown okunmaz.
     ================================================================ */
  const PANO_YOL = '/imbat12/archive-ortak/blob/main/Pano.md';
  const PANO_VERI = 'https://github.com/imbat12/archive-ortak/raw/main/Pano.json';
  const KITAP = {
    zemin:   '#0b0d0f', // sayfa (kitap ve Word skill'i)
    yuzey:   '#080a0d', // açık iş kutusu
    ustune:  '#101418', // üstüne gelinen satır: zeminden çok az açık (Metin 24.11.2026: "çok minik bir arkaplan rengi değişimi olsun yeter"; önce #152232)
    cizgi:   '#28464d', // ayraç
    yazi:    '#6d8da2', // gövde
    baslik:  '#70a1c7', // BÖLÜM başlığı
    alt:     '#4691a0', // alt başlık, iş adı
    etiket:  '#6b8669', // Ne:, Neden:, not, "sende"
    uyari:   '#c8673a', // ağır iş, eşleşmeyen not
    sonuk:   '#71747f', // yük, kim, tarih
  };
  const YUK_AD = { hafif: 'hafif', orta: 'orta', agir: 'ağır', yok: 'tahmin yok' };

  const OKUYUCU_CSS = `
#pano-kitap{--z:${KITAP.zemin};--y:${KITAP.yuzey};--u:${KITAP.ustune};--c:${KITAP.cizgi};--t:${KITAP.yazi};--b:${KITAP.baslik};--a:${KITAP.alt};--e:${KITAP.etiket};--w:${KITAP.uyari};--s:${KITAP.sonuk};
  background:var(--z);color:var(--t);font:15px/1.6 "Courier New",Courier,ui-monospace,monospace;max-width:640px;margin:0 auto 40vh;padding:22px 22px 30px;border:1px solid var(--c);border-radius:4px}
#pano-kitap *{box-sizing:border-box;font-weight:400}
#pano-kitap a{color:var(--a);text-decoration:none;cursor:pointer}
#pano-kitap a:hover{color:var(--b)}
#pano-kitap .ust{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13px;color:var(--s);margin-bottom:14px}
#pano-kitap .dugme{font:13px "Courier New",monospace;color:var(--s);background:var(--y);border:1px solid var(--c);border-radius:3px;padding:3px 10px;cursor:pointer}
#pano-kitap .dugme:hover,#pano-kitap .dugme.secili{color:var(--b);border-color:var(--a)}
#pano-kitap h1{font:26px/1.2 Calibri,Carlito,"Segoe UI",system-ui,sans-serif;color:var(--b);margin:6px 0 2px;border:0;padding:0}
#pano-kitap h2{font:19px/1.3 Calibri,Carlito,"Segoe UI",system-ui,sans-serif;color:var(--b);letter-spacing:.04em;text-transform:uppercase;margin:4px 0 4px;border:0;padding:0}
#pano-kitap .altb{color:var(--a);margin:0 0 4px}
#pano-kitap .tarih{color:var(--s);font-size:13px;margin-bottom:14px}
#pano-kitap hr{border:0;border-top:1px solid var(--c);margin:14px 0;height:0;background:none}
#pano-kitap .not{color:var(--e)}
#pano-kitap .uyari{color:var(--w)}
#pano-kitap .ara{width:100%;background:var(--y);color:var(--b);border:1px solid var(--c);border-radius:3px;padding:8px 10px;font:15px "Courier New",monospace;outline:0;margin:6px 0 10px}
#pano-kitap .ara:focus{border-color:var(--a)}
#pano-kitap .ic{list-style:none;margin:0;padding:0}
#pano-kitap .ic li{display:flex;align-items:baseline;gap:8px;padding:5px 6px;cursor:pointer;border-radius:3px}
#pano-kitap .ic li:hover,#pano-kitap .ic li.imlec{background:var(--u)}
#pano-kitap .ic .no{color:var(--s);min-width:5.2em}
#pano-kitap .ic .ad{color:var(--a)}
#pano-kitap .ic .nokta{flex:1;border-bottom:1px dotted var(--c);transform:translateY(-4px);min-width:12px}
#pano-kitap .ic .say{color:var(--s);white-space:nowrap}
#pano-kitap .ic .say .not{margin-left:6px}
#pano-kitap .suzgec{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
#pano-kitap .isler{list-style:none;margin:6px 0 0;padding:0}
#pano-kitap .is{border-top:1px solid transparent;border-bottom:1px solid transparent;margin:0}
#pano-kitap .is>.bas{display:grid;grid-template-columns:3.6em 1fr auto;gap:2px 8px;padding:7px 6px;cursor:pointer;border-radius:3px}
#pano-kitap .is>.bas:hover,#pano-kitap .is.imlec>.bas{background:var(--u)}
#pano-kitap .is .no{color:var(--s)}
#pano-kitap .is .ad{color:var(--a)}
#pano-kitap .is .meta{color:var(--s);font-size:13px;white-space:nowrap;text-align:right}
#pano-kitap .is .meta .agir{color:var(--w)}
#pano-kitap .is .meta .sen{color:var(--e)}
#pano-kitap .is.acik{border-top:4px double var(--a);border-bottom:4px double var(--a);background:var(--y);margin:10px 0}
#pano-kitap .is.acik>.bas .ad{color:var(--b)}
#pano-kitap .govde{padding:4px 10px 12px 4.3em}
#pano-kitap .govde p{margin:0 0 6px}
#pano-kitap .govde .lbl{color:var(--e)}
#pano-kitap .govde .satir{color:var(--t);margin:0 0 3px}
#pano-kitap .govde .alt-bag{margin-top:10px;font-size:13px;color:var(--s)}
#pano-kitap .alt{margin-top:18px;padding-top:10px;border-top:1px solid var(--c);display:flex;justify-content:space-between;font-size:13px;color:var(--s)}
#pano-kitap .kisayol{font-size:12px;color:var(--s);margin-top:8px}
#pano-kitap .bos{color:var(--s);padding:8px 6px}
@media (max-width:560px){#pano-kitap{padding:14px 10px;font-size:14px}#pano-kitap .is>.bas{grid-template-columns:2.8em 1fr}#pano-kitap .is .meta{grid-column:2;text-align:left}#pano-kitap .govde{padding-left:10px}}
`;

  function el(ad, ozellik, ...cocuk) {
    const e = document.createElement(ad);
    for (const [k, v] of Object.entries(ozellik || {})) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of cocuk.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : String(c));
    return e;
  }

  // Durum: hangi sayfa (ic = İçindekiler, s = senden bekleyen, k = kapananlar, 0..n proje), açık iş, süzgeç
  const OK = { veri: null, gorunum: 'ic', acik: null, suz: 'hepsi', ara: '', imlec: -1, kok: null, makale: null };
  let okuyucuAcik = GM_getValue('okuyucu', true);

  function panoSayfasi() { return location.pathname === PANO_YOL; }

  function bolumListesi() {
    const v = OK.veri;
    const sende = [];
    v.projeler.forEach((p, pi) => p.isler.forEach(i => { if (i.kim === 'sen') sende.push({ ...i, _p: pi }); }));
    const liste = [{ id: 's', ad: 'Senden bekleyen', isler: sende, ozel: true }];
    v.projeler.forEach((p, pi) => liste.push({ id: String(pi), ad: p.ad, isler: p.isler.map(i => ({ ...i, _p: pi })), kaldigin: p.kaldigin }));
    liste.push({ id: 'k', ad: 'Kapananlar', kapanan: v.kapanan, ozel: true });
    return liste;
  }

  function git(gorunum, acik, gecmis = true) {
    OK.gorunum = gorunum; OK.acik = acik || null; OK.imlec = -1;
    OK.ara = '';
    if (gecmis) history.pushState({ pano: { gorunum, acik: OK.acik } }, '', location.pathname);
    GM_setValue('pano_son', { gorunum, acik: OK.acik });
    ciz();
    OK.kok.scrollIntoView({ block: 'start' });
  }

  function ust() {
    return el('div', { class: 'ust' },
      el('span', {}, OK.gorunum === 'ic' ? 'İş Panosu · kitap görünümü' : el('a', { onclick: () => git('ic') }, '↑ İçindekiler')),
      el('span', {},
        el('button', { class: 'dugme', title: 'GitHub\'ın kendi Pano.md görünümü', onclick: () => okuyucuDegistir(false) }, 'GitHub görünümü')));
  }

  function icindekiler() {
    const v = OK.veri, b = bolumListesi();
    const toplam = v.projeler.reduce((n, p) => n + p.isler.length, 0);
    const sende = b[0].isler.length;
    const kutu = el('div');
    kutu.append(ust(), el('h1', {}, 'İş Panosu'),
      el('p', { class: 'altb' }, `${toplam} açık iş · ${sende} tanesi senden bekliyor`),
      el('div', { class: 'tarih' }, `Son güncelleme: ${v.son || '—'}`));
    v.odak.forEach(o => kutu.append(el('p', { class: 'not' }, 'Odak: ' + o)));
    if (v.sahipsiz.length) kutu.append(el('p', { class: 'uyari' }, `Eşleşmeyen not: ${v.sahipsiz.length} (Notlar.md'de kimliği açık işle eşleşmiyor)`));
    // Arama İçindekiler'in yerinde sonuç listesi gösterir; kutu yeniden çizilmez, yazılan harf kaybolmaz
    const ara = el('input', { class: 'ara', type: 'search', placeholder: 'ara: iş, proje, kimlik  ( / )', spellcheck: 'false', value: OK.ara });
    const yer = el('div');
    const doldur = () => { OK.ara = ara.value; OK.imlec = -1; yer.replaceChildren(...(OK.ara.trim() ? aramaSonucu() : [el('h2', {}, 'İçindekiler'), ul])); };
    ara.addEventListener('input', doldur);
    kutu.append(ara, yer);
    const ul = el('ul', { class: 'ic' });
    b.forEach((bl, n) => {
      const sayi = bl.kapanan ? `son ${bl.kapanan.length}` : `${bl.isler.length} iş`;
      const sen = !bl.ozel && bl.isler.filter(i => i.kim === 'sen').length;
      ul.append(el('li', { 'data-i': n, onclick: () => git(bl.id) },
        el('span', { class: 'no' }, bl.ozel ? '' : `BÖLÜM ${n}`),
        el('span', { class: 'ad' }, bl.ad), el('span', { class: 'nokta' }),
        el('span', { class: 'say' }, sayi, sen ? el('span', { class: 'not' }, `${sen} sende`) : null)));
    });
    doldur();
    kutu.append(el('div', { class: 'kisayol' }, 'kısayol: ↑↓ seç · Enter aç · / ara · ←→ bölüm · Esc geri'));
    return kutu;
  }

  function isSatiri(i, no, proje) {
    const acik = OK.acik === i.kid;
    const meta = el('span', { class: 'meta' },
      el('span', { class: i.yuk === 'agir' ? 'agir' : '' }, YUK_AD[i.yuk] || i.yuk), ' · ',
      el('span', { class: i.kim === 'sen' ? 'sen' : '' }, i.kim === 'sen' ? 'Sen' : 'Claude'),
      i.notlar.some(n => !n.islendi) ? ' · 📌' : '');
    const ad = (i.yon ? `İstek → ${i.yon}: ` : '') + i.ad;
    const li = el('li', { class: 'is' + (acik ? ' acik' : ''), 'data-kid': i.kid },
      el('div', { class: 'bas', onclick: () => { OK.acik = acik ? null : i.kid; GM_setValue('pano_son', { gorunum: OK.gorunum, acik: OK.acik }); ciz(); if (OK.acik) li2().scrollIntoView({ block: 'nearest' }); } },
        el('span', { class: 'no' }, no), el('span', { class: 'ad' }, proje ? `${proje} — ${ad}` : ad), meta));
    const li2 = () => OK.kok.querySelector(`[data-kid="${i.kid}"]`) || li;
    if (acik) li.append(isGovde(i));
    return li;
  }

  function isGovde(i) {
    const g = el('div', { class: 'govde' });
    i.notlar.filter(n => !n.islendi).forEach(n => g.append(el('p', { class: 'not' }, `📌 Notun${n.tarih ? ' (' + n.tarih + ')' : ''}: ${n.metin}`)));
    if (i.ayrinti.length) i.ayrinti.forEach(([k, d]) => g.append(el('p', {}, el('span', { class: 'lbl' }, k + ': '), d)));
    else g.append(el('p', { class: 'satir' }, 'Ne, neden ve sonraki adım henüz yazılmadı.'));
    const tahmin = i.sure || i.token ? ` (⏱ ${i.sure || '—'} · 🪙 ${i.token || '—'})` : '';
    g.append(el('p', { class: 'satir' }, el('span', { class: 'lbl' }, 'Yük: '), (YUK_AD[i.yuk] || i.yuk) + tahmin));
    g.append(el('p', { class: 'satir' }, el('span', { class: 'lbl' }, 'Kim: '), i.kim === 'sen' ? 'Sen' : 'Claude'));
    if (i.kaynak) g.append(el('p', { class: 'satir' }, el('span', { class: 'lbl' }, 'Kaynak: '),
      i.kaynak_url ? el('a', { href: i.kaynak_url, target: '_blank', rel: 'noopener' }, i.kaynak) : i.kaynak));
    if (i.acilis) g.append(el('p', { class: 'satir' }, el('span', { class: 'lbl' }, 'Açılış: '), i.acilis));
    i.notlar.filter(n => n.islendi).forEach(n => g.append(el('p', { class: 'satir' }, `Eski not (işlendi ${n.islendi}): ${n.metin}`)));
    const kopya = el('button', { class: 'dugme', onclick: (e) => { e.stopPropagation(); navigator.clipboard.writeText(`- ${i.kid}: `).then(() => { kopya.textContent = 'kopyalandı'; }); } }, `"- ${i.kid}: " kopyala`);
    g.append(el('div', { class: 'alt-bag' }, `Kimlik ${i.kid} · `,
      el('a', { href: OK.veri.not_duzenle, target: '_blank', rel: 'noopener' }, 'Not yaz'), ' · ', kopya));
    return g;
  }

  function bolum(id) {
    const b = bolumListesi(), n = b.findIndex(x => x.id === id), bl = b[n];
    const kutu = el('div');
    const onceki = b[n - 1], sonraki = b[n + 1];
    kutu.append(ust(), el('h2', {}, bl.ozel ? bl.ad : `BÖLÜM ${n}: ${bl.ad}`));
    if (bl.kapanan) {
      kutu.append(el('p', { class: 'altb' }, `Son ${bl.kapanan.length} kapanan iş`));
      const ul = el('ul', { class: 'isler' });
      bl.kapanan.forEach(k => ul.append(el('li', { class: 'is' }, el('div', { class: 'bas' },
        el('span', { class: 'no' }, k.tarih.slice(0, 5)), el('span', { class: 'ad' }, `${k.proje} — ${k.ad}`), el('span', { class: 'meta' }, '')))));
      kutu.append(ul);
    } else {
      const sen = bl.isler.filter(i => i.kim === 'sen').length;
      kutu.append(el('p', { class: 'altb' }, `${bl.isler.length} iş` + (sen ? ` · ${sen} tanesi sende` : '')));
      if (bl.kaldigin) kutu.append(el('p', {}, el('span', { class: 'not' }, 'Kaldığın yer: '), bl.kaldigin));
      const suz = el('div', { class: 'suzgec' });
      [['hepsi', 'Hepsi', bl.isler.length], ['sen', 'Sende', sen], ['claude', 'Claude', bl.isler.length - sen]].forEach(([k, ad, s]) => {
        if (!bl.ozel || k === 'hepsi') suz.append(el('button', { class: 'dugme' + (OK.suz === k ? ' secili' : ''), onclick: () => { OK.suz = k; ciz(); } }, `${ad} ${s}`));
      });
      if (!bl.ozel) kutu.append(suz);
      const ul = el('ul', { class: 'isler' });
      const goster = bl.isler.filter(i => bl.ozel || OK.suz === 'hepsi' || i.kim === OK.suz);
      goster.forEach((i, k) => ul.append(isSatiri(i, bl.ozel ? `${k + 1}` : `${n}.${k + 1}`, bl.ozel ? OK.veri.projeler[i._p].ad : null)));
      if (!goster.length) ul.append(el('li', { class: 'bos' }, 'Bu süzgeçte iş yok.'));
      kutu.append(ul);
    }
    kutu.append(el('div', { class: 'alt' },
      onceki ? el('a', { onclick: () => git(onceki.id) }, '‹ ' + onceki.ad) : el('span'),
      el('a', { onclick: () => git('ic') }, `↑ İçindekiler · ${n} / ${b.length - 1}`),
      sonraki ? el('a', { onclick: () => git(sonraki.id) }, sonraki.ad + ' ›') : el('span')));
    return kutu;
  }

  function aramaSonucu() {
    const q = OK.ara.trim().toLocaleLowerCase('tr');
    const ul = el('ul', { class: 'isler' });
    let say = 0;
    OK.veri.projeler.forEach((p, pi) => p.isler.forEach(i => {
      const metin = `${p.ad} ${i.yon} ${i.ad} ${i.kid} ${i.ayrinti.map(a => a[1]).join(' ')}`.toLocaleLowerCase('tr');
      if (metin.includes(q)) { say++; ul.append(isSatiri({ ...i, _p: pi }, String(say), p.ad)); }
    }));
    if (!say) ul.append(el('li', { class: 'bos' }, 'Sonuç yok.'));
    return [el('h2', {}, 'Arama'), el('p', { class: 'altb' }, `${say} sonuç`), ul];
  }

  function ciz() {
    if (!OK.kok || !OK.veri) return;
    const g = OK.gorunum;
    let icerik;
    if (g === 'ic') icerik = icindekiler();
    else icerik = bolumListesi().some(b => b.id === g) ? bolum(g) : icindekiler();
    OK.kok.replaceChildren(icerik);
    imlecGoster();
  }

  function satirlar() { return [...OK.kok.querySelectorAll('.ic li, .is[data-kid]')]; }
  function imlecGoster() {
    satirlar().forEach((s, n) => s.classList.toggle('imlec', n === OK.imlec));
  }

  function tus(e) {
    if (!OK.kok || !OK.kok.isConnected || OK.kok.hidden) return;
    const yazi = e.target.closest && e.target.closest('input, textarea, [contenteditable]');
    if (e.key === 'Escape') {
      const a = OK.kok.querySelector('.ara');
      if (a && OK.ara) { a.value = ''; a.dispatchEvent(new Event('input')); a.blur(); return; }
      if (OK.acik) { OK.acik = null; ciz(); return; }
      if (OK.gorunum !== 'ic') { git('ic'); }
      return;
    }
    if (yazi || e.ctrlKey || e.metaKey || e.altKey) return;
    const b = bolumListesi(), n = b.findIndex(x => x.id === OK.gorunum);
    const s = satirlar();
    if (e.key === '/') { e.preventDefault(); const a = OK.kok.querySelector('.ara'); if (a) a.focus(); else git('ic'); return; }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && n >= 0) {
      e.preventDefault(); const h = b[n + (e.key === 'ArrowRight' ? 1 : -1)]; if (h) git(h.id); return;
    }
    if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'ArrowUp' || e.key === 'k') {
      if (!s.length) return;
      e.preventDefault();
      OK.imlec = Math.max(0, Math.min(s.length - 1, OK.imlec + (e.key === 'ArrowDown' || e.key === 'j' ? 1 : -1)));
      imlecGoster(); s[OK.imlec].scrollIntoView({ block: 'nearest' }); return;
    }
    if (e.key === 'Enter' && OK.imlec >= 0 && s[OK.imlec]) {
      e.preventDefault(); const im = OK.imlec;
      const hedef = s[im].querySelector('.bas') || s[im]; hedef.click();
      OK.imlec = im; imlecGoster();
    }
  }

  function okuyucuDegistir(acik) {
    okuyucuAcik = acik; GM_setValue('okuyucu', acik); kur();
  }

  function veriAl(geri) {
    GM_xmlhttpRequest({
      method: 'GET', url: PANO_VERI + '?t=' + Date.now(), timeout: 15000,
      onload: (y) => { try { if (y.status !== 200) throw new Error('durum ' + y.status); geri(null, JSON.parse(y.responseText)); } catch (h) { geri(h); } },
      onerror: () => geri(new Error('ağ hatası')), ontimeout: () => geri(new Error('zaman aşımı')),
    });
  }

  function dugmeGithub(makale) {
    // GitHub görünümündeyken okuyucuya dönüş düğmesi
    let d = document.getElementById('pano-kitap-don');
    if (!okuyucuAcik && makale) {
      if (!d) {
        d = el('button', { id: 'pano-kitap-don', onclick: () => okuyucuDegistir(true),
          style: `position:fixed;right:16px;bottom:16px;z-index:99;font:13px "Courier New",monospace;color:${KITAP.baslik};background:${KITAP.zemin};border:1px solid ${KITAP.alt};border-radius:4px;padding:8px 12px;cursor:pointer` }, 'Kitap görünümü');
        document.body.append(d);
      }
    } else if (d) d.remove();
  }

  function kur() {
    if (!panoSayfasi()) { const d = document.getElementById('pano-kitap-don'); if (d) d.remove(); return; }
    const makale = document.querySelector('article.markdown-body');
    if (!makale) return;
    if (!document.getElementById('pano-kitap-stil')) document.head.append(el('style', { id: 'pano-kitap-stil' }, OKUYUCU_CSS));
    dugmeGithub(makale);
    if (!okuyucuAcik) {
      makale.hidden = false; if (OK.kok) OK.kok.hidden = true; return;
    }
    if (!OK.kok || !OK.kok.isConnected) {
      OK.kok = el('div', { id: 'pano-kitap', lang: 'tr' }, el('div', { class: 'bos' }, 'Pano verisi okunuyor…'));
      makale.before(OK.kok);
    }
    OK.kok.hidden = false; makale.hidden = true; OK.makale = makale;
    if (OK.veri) { ciz(); return; }
    const onbellek = GM_getValue('pano_veri', null);
    const son = GM_getValue('pano_son', null);
    if (son && !history.state?.pano) { OK.gorunum = son.gorunum; OK.acik = son.acik; }
    if (onbellek) { OK.veri = onbellek; ciz(); }
    veriAl((h, v) => {
      if (h) {
        if (!OK.veri) OK.kok.replaceChildren(el('p', { class: 'uyari' }, 'Pano.json okunamadı: ' + h.message + '. GitHub görünümü gösteriliyor.'), ust());
        if (!OK.veri) { makale.hidden = false; }
        return;
      }
      OK.veri = v; GM_setValue('pano_veri', v); ciz();
    });
  }

  let kuruldu = false;
  function okuyucuBaslat() {
    if (kuruldu) return; kuruldu = true;
    document.addEventListener('keydown', tus);
    window.addEventListener('popstate', (e) => {
      const p = e.state && e.state.pano;
      if (p && OK.kok) { OK.gorunum = p.gorunum; OK.acik = p.acik; ciz(); }
    });
    ['turbo:load', 'turbo:render', 'pjax:end'].forEach(o => document.addEventListener(o, kur));
    // Turbo her sayfada makaleyi yeniden çizer; okuyucu kaybolursa yeniden takılır
    new MutationObserver(() => { if (panoSayfasi() && (!OK.kok || !OK.kok.isConnected) && document.querySelector('article.markdown-body')) kur(); })
      .observe(document.documentElement, { childList: true, subtree: true });
    kur();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', okuyucuBaslat);
  else okuyucuBaslat();

  GM_registerMenuCommand('Pano: kitap görünümü aç / kapat', () => okuyucuDegistir(!okuyucuAcik));
})();
