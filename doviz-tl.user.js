// ==UserScript==
// @name         Döviz TL
// @namespace    local
// @version      3.4
// @description  Sayfadaki Euro ve dolar (USD, CAD, AUD, HKD, NZD) fiyatlarının yanına güncel kurla TL karşılığını yazar
// @match        *://*/*
// @run-at       document-end
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      open.er-api.com
// @connect      api.frankfurter.app
// @connect      api.frankfurter.dev
// @updateURL    https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/doviz-tl.user.js
// @downloadURL  https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/doviz-tl.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ===================== AYAR =====================
  var AYAR = {
    onbellek: 3 * 60 * 60 * 1000, // kur önbellek süresi: 3 saat
    satirIci: true,               // cümle içindeki fiyatlara da etiket koy
    gecikme: 600                  // değişiklik sonrası tarama gecikmesi (ms)
  };

  var EURO = '\u20AC', LIRA = '\u20BA', YAKLASIK = '\u2248', NOKTA = '\u00B7';
  var SITE = location.hostname;

  // ===================== MENU =====================
  var kapali = GM_getValue('kapali', []);
  var siteKapali = kapali.indexOf(SITE) > -1;

  GM_registerMenuCommand(siteKapali ? 'Bu sitede aç' : 'Bu sitede kapat', function () {
    var l = GM_getValue('kapali', []);
    var i = l.indexOf(SITE);
    if (i > -1) l.splice(i, 1); else l.push(SITE);
    GM_setValue('kapali', l);
    location.reload();
  });
  // Çıplak $ işaretinin hangi dolar olduğu: önce elle seçim, sonra alan adı, sonra sayfa dili
  var DOLARLAR = ['USD', 'CAD', 'AUD', 'HKD', 'NZD'];
  var dolarSecim = GM_getValue('dolar', {});
  function dolarTahmin() {
    var h = SITE.toLowerCase();
    if (/\.ca$/.test(h)) return 'CAD';
    if (/\.au$/.test(h)) return 'AUD';
    if (/\.hk$/.test(h)) return 'HKD';
    if (/\.nz$/.test(h)) return 'NZD';
    var l = (document.documentElement.lang || '').toUpperCase();
    if (/-CA$/.test(l)) return 'CAD';
    if (/-AU$/.test(l)) return 'AUD';
    if (/-HK$/.test(l)) return 'HKD';
    if (/-NZ$/.test(l)) return 'NZD';
    return 'USD';
  }
  var DOLAR = dolarSecim[SITE] || dolarTahmin();

  GM_registerMenuCommand('Bu sitede $ = ' + DOLAR + (dolarSecim[SITE] ? '' : ' (otomatik)') + ' \u2192 değiştir', function () {
    var s = GM_getValue('dolar', {});
    s[SITE] = DOLARLAR[(DOLARLAR.indexOf(DOLAR) + 1) % DOLARLAR.length];
    GM_setValue('dolar', s);
    location.reload();
  });
  GM_registerMenuCommand('Kuru yenile', function () {
    GM_setValue('kurlar', null);
    location.reload();
  });

  if (siteKapali) return;

  // ===================== KUR =====================
  function istek(url) {
    return new Promise(function (ok, hata) {
      GM_xmlhttpRequest({
        method: 'GET', url: url, timeout: 8000,
        onload: function (r) {
          try {
            var j = JSON.parse(r.responseText);
            ok(j && j.rates && j.rates.TRY ? j.rates : null);
          } catch (e) { hata(e); }
        },
        onerror: hata, ontimeout: hata
      });
    });
  }

  function kurAl() {
    var c = GM_getValue('kurlar', null);
    if (c && Date.now() - c.t < AYAR.onbellek) return Promise.resolve(c.r);
    return istek('https://open.er-api.com/v6/latest/EUR')
      .catch(function () { return null; })
      .then(function (r) {
        return r || istek('https://api.frankfurter.app/latest?from=EUR')
          .catch(function () { return null; });
      })
      .then(function (r) {
        if (r) { GM_setValue('kurlar', { r: r, t: Date.now() }); return r; }
        return c ? c.r : null; // ağ yoksa eski kur
      });
  }

  // ===================== AYRISTIRMA =====================
  // Tutar: 1.499,00 | 1,499.99 | 1 499 | 1499 | 12,5 | 49,-
  var SAYI = '(\\d{1,3}(?:[.,\\u00a0\\u202f\' ]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)(?:[.,][-\\u2013\\u2014]{1,2})?';
  // Para işareti: €, US$ CA$ C$ A$ AU$ HK$ NZ$ $, ya da üç harfli kod
  var KOD = '(?<![A-Za-z])(?:EUR|USD|CAD|AUD|HKD|NZD)(?![A-Za-z])';
  var ON = '(?:\\u20AC|(?<![A-Za-z])(?:US|CA|AU|HK|NZ|C|A)?\\$|' + KOD + ')';
  var ARKA = '(?:\\u20AC|(?<![A-Za-z])(?:US|CA|AU|HK|NZ|C|A)?\\$|' + KOD + '|(?<![A-Za-z])euros?(?![A-Za-z]))';

  // Öğenin tüm metni yalnızca bir fiyatsa
  var TUM = new RegExp('^(' + ON + ')?\\s*' + SAYI + '\\s*(' + ARKA + ')?$', 'i');
  // Cümle içindeki fiyatlar
  var SATIR = new RegExp(
    '(?:(' + ON + ')\\s*(?<![A-Za-z0-9.,])' + SAYI + '(?!\\d))|(?:(?<![A-Za-z0-9.,])' + SAYI + '\\s*(' + ARKA + '))', 'gi');
  var IPUCU = /\u20AC|EUR|euro|\$|USD|CAD|AUD|HKD|NZD/i;

  // İşaret metnini para birimi koduna çevir
  function birim(t) {
    t = (t || '').toUpperCase().replace(/\s/g, '');
    if (t === '\u20AC' || /^EURO?S?$/.test(t)) return 'EUR';
    if (t === '$') return DOLAR;
    if (t === 'US$' || t === 'USD') return 'USD';
    if (t === 'CA$' || t === 'C$' || t === 'CAD') return 'CAD';
    if (t === 'A$' || t === 'AU$' || t === 'AUD') return 'AUD';
    if (t === 'HK$' || t === 'HKD') return 'HKD';
    if (t === 'NZ$' || t === 'NZD') return 'NZD';
    return null;
  }

  function temizle(s) {
    return s.replace(/[\s\u00a0\u202f]+/g, ' ').trim();
  }

  function sayiCoz(s) {
    s = s.replace(/[.,][-\u2013\u2014]+$/, '');
    var tam = s, ond = '';
    var m = s.match(/^(.*?)[.,](\d{1,2})$/);
    if (m) { tam = m[1]; ond = m[2]; }
    tam = tam.replace(/\D/g, '');
    if (!tam) return null;
    var v = parseFloat(tam + (ond ? '.' + ond : ''));
    return v > 0 && v < 1e9 ? v : null;
  }

  // Betiğin değiştirdiği metin düğümleri: düğüm -> { asil, yeni }
  var yazilan = new Map();
  // Betiğin kendi eklediği ayrı metin düğümleri (küçük kuruşlu fiyatlar için)
  var bizim = new Set(), ayri = new Map();

  // Düğümün sitenin yazdığı asıl metni (betiğin eki hariç)
  function nMetin(n) {
    var k = yazilan.get(n);
    if (k) {
      if (n.nodeValue === k.yeni) return k.asil;
      yazilan.delete(n); // site metni kendisi değiştirdi
    }
    return n.nodeValue;
  }

  function metinDugumleri(el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), l = [], n;
    while ((n = w.nextNode())) if (!bizim.has(n)) l.push(n);
    return l;
  }

  function oMetin(el) {
    return metinDugumleri(el).map(nMetin).join('');
  }

  // Bölünmüş fiyat: "1.499" + <sup>,00€</sup> gibi
  function ogeDeger(el) {
    var metin = '', ek = null, sonSup = null;
    metinDugumleri(el).forEach(function (n) {
      var s = n.parentElement.closest('sup');
      if (s && !el.contains(s)) s = null;
      if (s && s !== sonSup) metin += '\u0001';
      sonSup = s;
      metin += nMetin(n);
    });
    metin = metin.replace(/(\d)\u0001\s*[.,]?\s*(\d{1,2})(?!\d)/, function (x, a, b) { ek = b; return a; });
    metin = metin.replace(/\u0001/g, '');
    var m = temizle(metin).match(TUM);
    if (!m || (!m[1] && !m[3])) return null;
    var v = sayiCoz(m[2]);
    if (v === null) return null;
    if (ek) v = Math.floor(v) + parseInt(ek, 10) / Math.pow(10, ek.length);
    var b = birim(m[1] || m[3]);
    return b ? { v: v, b: b } : null;
  }

  // ===================== TESPIT =====================
  var ATLA = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|SELECT|OPTION|CODE|PRE|SVG)$/i;

  function atla(el) {
    return ATLA.test(el.tagName) || el.isContentEditable;
  }

  // Ekran okuyucu için gizlenmiş kopya (sr-only): 1px kutu, clip veya display:none
  function gizli(el) {
    for (var i = 0; el && el !== document.body && i < 4; i++, el = el.parentElement) {
      var s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return true;
      if (/^(absolute|fixed)$/.test(s.position)) {
        var r = el.getBoundingClientRect();
        if (r.width <= 2 || r.height <= 2) return true;
        if ((s.clip && s.clip !== 'auto') || /inset\(50%/.test(s.clipPath)) return true;
      }
    }
    return false;
  }

  // Fiyatın tamamını kapsayan en üst öğeyi bul, sonra gereksiz sarmalayıcıları soy
  function adayBul(n) {
    var el = n.parentElement, en = null;
    for (var i = 0; el && el !== document.body && i < 5; i++, el = el.parentElement) {
      if (atla(el)) return null;
      if (oMetin(el).length > 40) break;
      if (/^(SUP|SUB)$/.test(el.tagName)) continue; // kuruş parçası tek başına fiyat değildir
      if (ogeDeger(el) !== null) en = el;
    }
    while (en && en.children.length === 1 &&
           temizle(oMetin(en.children[0])) === temizle(oMetin(en))) {
      en = en.children[0];
    }
    return en;
  }

  function satirIciDegerler(n) {
    var p = n.parentElement;
    if (!p || /^(SUP|SUB)$/.test(p.tagName)) return null;
    for (var el = p; el && el !== document.body; el = el.parentElement) if (atla(el)) return null;
    if (gizli(p)) return null;
    var t = nMetin(n), m, d = [];
    SATIR.lastIndex = 0;
    while ((m = SATIR.exec(t))) {
      var v = sayiCoz(m[2] || m[3]);
      var b = birim(m[1] || m[4]);
      if (v && b) d.push({ v: v, b: b, son: m.index + m[0].length });
    }
    return d.length ? d : null;
  }

  // ===================== EK =====================
  // Rozet yok: fiyat metninin kendisine " / 6.180 TL" eklenir,
  // böylece sitenin yazı tipi, boyutu ve rengi aynen kullanılır
  var kur = null, kurIstendi = false;
  var bic0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
  var bic2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function bicim(v) { return (v >= 100 ? bic0.format(v) : bic2.format(v)) + ' TL'; }

  // 1 birim kaç TL: kur tablosu EUR tabanlı, diğerleri çapraz hesaplanır
  function oran(b) {
    if (b === 'EUR') return kur.TRY;
    return kur[b] ? kur.TRY / kur[b] : null;
  }

  function ekYazi(d) {
    var o = oran(d.b);
    return o ? ' / ' + bicim(d.v * o) : '';
  }

  function yaz(n, asil, yeni, gorulen) {
    if (yeni === asil) return;
    if (n.nodeValue !== yeni) n.nodeValue = yeni;
    yazilan.set(n, { asil: asil, yeni: yeni });
    gorulen.add(n);
  }

  // Öğe fiyatı: ek, öğedeki son dolu ve GÖRÜNÜR metin düğümünün sonuna
  // (gizli kardeş öğe, örn. <span class="hidden">€</span>, eki yutmasın)
  function ogeyeEkle(el, d, gorulen) {
    var l = metinDugumleri(el).filter(function (n) {
      return nMetin(n).trim() && !gizli(n.parentElement);
    });
    if (!l.length) return;
    var n = l[l.length - 1], ek = ekYazi(d);
    if (!ek) return;
    // Kuruş <sup>/<sub> ile küçük yazılmışsa ek onun içine değil arkasına,
    // ayrı bir düğüm olarak girer; böylece ana fiyatın boyutunu alır
    var kucuk = n.parentElement.closest('sup,sub');
    if (kucuk && kucuk !== el && el.contains(kucuk)) {
      var t = ayri.get(el);
      if (!t || !t.isConnected || t.previousSibling !== kucuk) {
        if (t && t.parentNode) t.parentNode.removeChild(t);
        t = document.createTextNode('');
        bizim.add(t);
        kucuk.parentNode.insertBefore(t, kucuk.nextSibling);
        ayri.set(el, t);
      }
      if (t.nodeValue !== ek) t.nodeValue = ek;
      gorulen.add(t);
      return;
    }
    var asil = nMetin(n);
    yaz(n, asil, asil.replace(/\s+$/, '') + ek, gorulen);
  }

  // Cümle içi: her fiyatın hemen arkasına
  function satiraEkle(n, dl, gorulen) {
    var asil = nMetin(n), yeni = '', i = 0;
    dl.forEach(function (d) { yeni += asil.slice(i, d.son) + ekYazi(d); i = d.son; });
    yaz(n, asil, yeni + asil.slice(i), gorulen);
  }

  // ===================== TARAMA =====================
  function tara() {
    if (!document.body) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return IPUCU.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var hedefler = new Map(), satirlar = [], n;
    while ((n = w.nextNode())) {
      var p = n.parentElement;
      if (!p) continue;
      var a = adayBul(n);
      if (a) {
        if (gizli(a)) continue;
        if (!hedefler.has(a)) hedefler.set(a, ogeDeger(a));
      } else if (AYAR.satirIci) {
        var d = satirIciDegerler(n);
        if (d) satirlar.push([n, d]);
      }
    }
    if (!hedefler.size && !satirlar.length) return;

    // Kur ancak sayfada fiyat bulununca istenir
    if (kur === null) {
      if (!kurIstendi) {
        kurIstendi = true;
        kurAl().then(function (r) {
          if (!r) { console.warn('[Döviz TL] Kur alınamadı'); return; }
          kur = r;
          tara();
        });
      }
      return;
    }

    // İç içe hedeflerden yalnız dıştakini tut
    var liste = Array.from(hedefler.keys());
    var gorulen = new Set();
    liste.forEach(function (el) {
      for (var i = 0; i < liste.length; i++) if (liste[i] !== el && liste[i].contains(el)) return;
      ogeyeEkle(el, hedefler.get(el), gorulen);
    });
    satirlar.forEach(function (x) { satiraEkle(x[0], x[1], gorulen); });

    // Fiyatı kaybolan düğümlerin ekini geri al
    yazilan.forEach(function (k, n) {
      if (gorulen.has(n)) return;
      if (n.isConnected && n.nodeValue === k.yeni) n.nodeValue = k.asil;
      yazilan.delete(n);
    });
    ayri.forEach(function (t, el) {
      if (gorulen.has(t)) return;
      if (t.parentNode) t.parentNode.removeChild(t);
      bizim.delete(t);
      ayri.delete(el);
    });
  }

  // ===================== GOZCU =====================
  var zaman = null;
  function planla() {
    clearTimeout(zaman);
    zaman = setTimeout(tara, AYAR.gecikme);
  }

  var gozcu = new MutationObserver(function (liste) {
    for (var i = 0; i < liste.length; i++) {
      var r = liste[i];
      if (r.type === 'characterData') {
        if (bizim.has(r.target)) continue;
        var k = yazilan.get(r.target);
        if (k && r.target.nodeValue === k.yeni) continue; // betiğin kendi yazdığı
      }
      if (r.type === 'childList') {
        var hepsi = true, j;
        for (j = 0; j < r.addedNodes.length && hepsi; j++) hepsi = bizim.has(r.addedNodes[j]);
        for (j = 0; j < r.removedNodes.length && hepsi; j++) hepsi = bizim.has(r.removedNodes[j]);
        if (hepsi) continue;
      }
      planla();
      return;
    }
  });

  tara();
  gozcu.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
