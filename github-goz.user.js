// ==UserScript==
// @name         GitHub Göz
// @namespace    metin-github-goz
// @version      0.1.0
// @description  GitHub koyu temalarında yazıyı yumuşatır, mavi bağlantıyı açar, kalın yazıyı inceltir (Soft dark için ayarlı)
// @match        https://github.com/*
// @match        https://gist.github.com/*
// @run-at       document-start
// @noframes
// @updateURL    https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/github-goz.user.js
// @downloadURL  https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/github-goz.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
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
})();
