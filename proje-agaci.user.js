// ==UserScript==
// @name         Proje Ağacı
// @namespace    metin-proje-agaci
// @version      0.2.2
// @description  claude.ai/code sohbet listesini proje emojisine göre klasörlere ayırır; arşivli sohbetler, arama, filtreler, açık sohbete yeşil nokta
// @match        https://claude.ai/code*
// @run-at       document-idle
// @noframes
// @updateURL    https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/proje-agaci.user.js
// @downloadURL  https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/proje-agaci.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  const SURUM = '0.2.2';

  /* ================================================================
     P1 · EMOJİ TABLOSU
     Kaynak: proje haritasının emoji tablosu (private; betik onu
     okuyamaz). Tablo burada durur, emoji değişince bu blok
     güncellenir.
     ================================================================ */
  const PROJELER = [
    ['🏭', 'Fabrika'],
    ['🐧', 'VPS-Ana-Yönetim'],
    ['🐒', 'Tampermonkey'],
    ['🏃', 'Spor-Sağlık'],
    ['🔌', 'Elektronik'],
    ['🛒', 'Alışveriş'],
    ['🤖', 'Bağımsız-AI-Asistanı'],
    ['🚗', 'Araç-Bakım-Tamir'],
    ['💬', 'WhatsApp'],
    ['🔧', 'Konsol'],
    ['📚', 'Claude-Arşiv'],
    ['🧠', 'Memory-Bank-Tezgâhı'],
    ['📱', 'MacroDroid-Atölyesi'],
    ['🏠', 'Tapu-Resmi-İşler'],
    ['💎', 'Obsidian-Not-Fabrikası'],
    ['📝', 'Resmi-Yazı-İşleri'],
    ['💰', 'İlk-Kazanç']
  ];
  const PROJESIZ = '📂 Projesiz';

  /* ================================================================
     SAYFA SEÇİCİLERİ
     03.11.2026'da claude.ai/code gerçek sayfasında okundu
     (04_BETIK_proje-agaci.md D).
     ================================================================ */
  const S = {
    kenar: '[data-testid="sidebar"]',
    kaydirma: '.dframe-nav-scroll',
    liste: '.df-session-list',
    cipa: '.df-recents-anchor',
    satir: '.hit-row',
    baglanti: 'a[href*="/code/session"]',
    etiket: '.dframe-fade-label'
  };

  /* ================================================================
     P14 · ARŞİV VERİSİ
     Arşivli sohbetler sol listede yoktur. claude.ai kendi oturum
     listesini aynı kökendeki bu uçtan çeker; betik de kullanıcının
     oturumuyla aynı isteği atar (04.11.2026 gerçek sayfada sınandı).
     Uç anthropic-version başlığı ister; limit en çok 200'dür.
     Oturum kimliği cse_X, sol listedeki yol /code/session_X'tir.
     claude.ai'nın kendi arşiv görünümü: /code/sessions, "Arşivlenmiş"
     sekmesi (okunamazsa bağlantı oraya gider).
     ================================================================ */
  const ARSIV = {
    uc: '/v1/code/sessions?statuses=archived&limit=200',
    surum: '2023-06-01',
    gorunum: '/code/sessions'
  };
  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  /* ----------------------------------------------------------------
     ÇIPAYI BUL
     Sayfada birden çok .df-recents-anchor bulunur: biri
     sidebar-recents içinde boştur, sohbet satırlarını taşıyan olan
     .df-session-list içindedir. Çıpa, içinde sohbet bağlantısı olan
     düğümdür (03.11.2026 denemesi).
     ---------------------------------------------------------------- */
  function cipaBul() {
    const adaylar = [...document.querySelectorAll(S.cipa)];
    return adaylar.find((c) => c.querySelector(S.baglanti)) || null;
  }

  const ACIK_ANAHTAR = 'proje-agaci-acik-klasorler';

  /* ----------------------------------------------------------------
     P5 · AÇIK KLASÖR HAFIZASI
     ---------------------------------------------------------------- */
  function acikOku() {
    try {
      const ham = GM_getValue(ACIK_ANAHTAR, '[]');
      const dizi = JSON.parse(ham);
      return Array.isArray(dizi) ? new Set(dizi) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  function acikYaz(kume) {
    try {
      GM_setValue(ACIK_ANAHTAR, JSON.stringify([...kume]));
    } catch (e) {
      /* kalıcı ayar yazılamadıysa oturum içinde çalışmaya devam eder */
    }
  }

  let acikKlasorler = acikOku();
  let sonYol = '';

  /* ----------------------------------------------------------------
     P12 · FİLTRE HAFIZASI
     tumu: arşivsiz bütün sohbetler · bugun, hafta: başlık tarihine
     göre · arsiv: yalnız arşivliler
     ---------------------------------------------------------------- */
  const FILTRE_ANAHTAR = 'proje-agaci-filtre';
  const FILTRELER = ['tumu', 'bugun', 'hafta', 'arsiv'];
  let filtre = (() => {
    try {
      const f = GM_getValue(FILTRE_ANAHTAR, 'tumu');
      return FILTRELER.includes(f) ? f : 'tumu';
    } catch (e) {
      return 'tumu';
    }
  })();

  function filtreYaz(f) {
    filtre = f;
    try {
      GM_setValue(FILTRE_ANAHTAR, f);
    } catch (e) {
      /* oturum içinde sürer */
    }
  }

  let arama = '';
  let odak = -1;
  const arsiv = { durum: 'bekliyor', liste: [] };

  /* ----------------------------------------------------------------
     BAŞLIK OKUMA
     Sohbet adı .dframe-fade-label içindedir; içindeki .sr-only
     düğümleri ekran okuyucu metnidir ve ada girmez.
     ---------------------------------------------------------------- */
  function sohbetAdi(baglanti) {
    const etiket = baglanti.querySelector(S.etiket);
    const kaynak = etiket || baglanti;
    const kopya = kaynak.cloneNode(true);
    kopya.querySelectorAll('.sr-only').forEach((x) => x.remove());
    return kopya.textContent.trim();
  }

  /* ----------------------------------------------------------------
     P1 · EMOJİ AYIKLAMA
     Başlığın başındaki ilk emoji okunur, tabloda aranır.
     ---------------------------------------------------------------- */
  function projeBul(ad) {
    for (const [emoji, proje] of PROJELER) {
      if (ad.startsWith(emoji)) return { emoji, proje, klasor: emoji + ' ' + proje };
    }
    return { emoji: '', proje: '', klasor: PROJESIZ };
  }

  /* ----------------------------------------------------------------
     P2 · TARİH OKUMA
     Başlıktaki YYAAGG sayısı sıralama anahtarıdır. Son etkinlik
     sırayı değiştirmez (P2). Tarihsiz sohbet klasörün altında kalır.
     Tarih yalnız başlığın başında (emojiden sonra) aranır ve ay/gün
     sınanır: "Sohbet adı 123456" gibi başlıklardaki sayı tarih
     sayılmaz (04.11.2026 denemesi).
     ---------------------------------------------------------------- */
  function tarihOku(ad) {
    const eslesme = ad.match(/^(?:\S+\s+)?(\d{2})(\d{2})(\d{2})(?=\s|\||$)/);
    if (!eslesme) return '';
    const ay = Number(eslesme[2]);
    const gun = Number(eslesme[3]);
    if (ay < 1 || ay > 12 || gun < 1 || gun > 31) return '';
    return eslesme[1] + eslesme[2] + eslesme[3];
  }

  /* ----------------------------------------------------------------
     P11 · ETİKET OKUMA
     Başlıktaki "|" işaretinden sonraki parçalar etikettir.
     ---------------------------------------------------------------- */
  function etiketOku(ad) {
    return ad.split('|').slice(1).map((x) => x.trim()).filter(Boolean);
  }

  function kucuk(metin) {
    return String(metin || '').toLocaleLowerCase('tr');
  }

  function kayitYap(ad, yol, arsivli) {
    const bilgi = projeBul(ad);
    return {
      ad,
      yol,
      klasor: bilgi.klasor,
      emoji: bilgi.emoji,
      tarih: tarihOku(ad),
      etiketler: etiketOku(ad).map(kucuk),
      aranan: kucuk(ad),
      arsivli
    };
  }

  /* ----------------------------------------------------------------
     SOHBETLERİ TOPLA · sol listedeki açık (arşivsiz) sohbetler
     ---------------------------------------------------------------- */
  function sohbetleriTopla() {
    const cipa = cipaBul();
    if (!cipa) return [];
    const baglantilar = [...cipa.querySelectorAll(S.baglanti)];
    return baglantilar.map((b) => kayitYap(sohbetAdi(b), b.getAttribute('href') || '', false));
  }

  /* ----------------------------------------------------------------
     P9 · AÇIK SOHBET
     Ekranda açık sohbet adres çubuğundaki yoldur. Arşivli sohbet açık
     olduğunda da bulunur (sol listede aria-current olmayabilir).
     ---------------------------------------------------------------- */
  function aktifMi(k) {
    return k.yol === location.pathname;
  }

  /* ----------------------------------------------------------------
     P14 · ARŞİVİ YÜKLE
     ---------------------------------------------------------------- */
  let arsivSozu = null;
  function arsivYukle() {
    if (arsivSozu) return arsivSozu;
    arsiv.durum = 'yukleniyor';
    const cagri = (W.fetch || fetch).call(W, ARSIV.uc, {
      credentials: 'include',
      headers: { 'anthropic-version': ARSIV.surum }
    });
    arsivSozu = cagri
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((j) => {
        const veri = Array.isArray(j && j.data) ? j.data : [];
        arsiv.liste = veri
          .filter((s) => s && typeof s.id === 'string')
          .map((s) => kayitYap(
            String(s.title || '(adsız oturum)'),
            '/code/' + s.id.replace(/^cse_/, 'session_'),
            true
          ));
        arsiv.durum = 'hazir';
      })
      .catch((e) => {
        arsiv.durum = 'hata';
        console.warn('[Proje Ağacı] arşiv okunamadı: ' + e.message);
      })
      .then(() => {
        arsivSozu = null;
        listeCiz();
      });
    return arsivSozu;
  }

  /* ----------------------------------------------------------------
     P12 · TARİH SINIRI · bugünden geri sayılan YYAAGG
     ---------------------------------------------------------------- */
  function gunKodu(geri) {
    const g = new Date();
    g.setDate(g.getDate() - geri);
    const iki = (n) => String(n).padStart(2, '0');
    return iki(g.getFullYear() % 100) + iki(g.getMonth() + 1) + iki(g.getDate());
  }

  /* ----------------------------------------------------------------
     P11 · ARAMA
     Sözcüklerin hepsi eşleşmelidir. "#Etiket" yalnız başlık
     etiketlerinde aranır; öteki sözcükler bütün başlıkta.
     ---------------------------------------------------------------- */
  function aramaEslesir(k, sozcukler) {
    for (const s of sozcukler) {
      if (s.startsWith('#')) {
        const e = s.slice(1);
        if (!e) continue;
        if (!k.etiketler.some((x) => x.includes(e))) return false;
      } else if (!k.aranan.includes(s)) {
        return false;
      }
    }
    return true;
  }

  function sozcukler() {
    return kucuk(arama).split(/\s+/).filter(Boolean);
  }

  /* ----------------------------------------------------------------
     P12 + P13 · GÖRÜNÜR KAYITLAR
     Dönüş: { acik: [...], arsivli: [...] } süzülmüş hâlde.
     ---------------------------------------------------------------- */
  function gorunur(acikKayitlar) {
    const yollar = new Set(acikKayitlar.map((k) => k.yol));
    const arsivliler = arsiv.liste.filter((k) => !yollar.has(k.yol));
    const sz = sozcukler();
    const uyar = (k) => aramaEslesir(k, sz);
    if (filtre === 'arsiv') {
      return { acik: [], arsivli: arsivliler.filter(uyar) };
    }
    if (filtre === 'bugun' || filtre === 'hafta') {
      const sinir = filtre === 'bugun' ? gunKodu(0) : gunKodu(6);
      const bugun = gunKodu(0);
      return { acik: acikKayitlar.filter((k) => k.tarih >= sinir && k.tarih <= bugun && uyar(k)), arsivli: [] };
    }
    return { acik: acikKayitlar.filter(uyar), arsivli: arsivliler.filter(uyar) };
  }

  /* ----------------------------------------------------------------
     P1 + P2 + P3 · KLASÖRLERİ KUR
     Her klasör açık ve arşivli sohbetlerini ayrı taşır.
     ---------------------------------------------------------------- */
  function siraFn(a, b) {
    if (a.tarih && b.tarih) return b.tarih.localeCompare(a.tarih);
    if (a.tarih) return -1;
    if (b.tarih) return 1;
    return 0;
  }

  function klasorleriKur(acikKayitlar, arsivKayitlar) {
    const kutu = new Map();
    const al = (ad) => {
      if (!kutu.has(ad)) kutu.set(ad, { ad, acik: [], arsivli: [] });
      return kutu.get(ad);
    };
    for (const k of acikKayitlar) al(k.klasor).acik.push(k);
    for (const k of arsivKayitlar) al(k.klasor).arsivli.push(k);
    for (const k of kutu.values()) {
      k.acik.sort(siraFn);
      k.arsivli.sort(siraFn);
    }
    const sira = PROJELER
      .map(([emoji, proje]) => emoji + ' ' + proje)
      .filter((ad) => kutu.has(ad));
    if (kutu.has(PROJESIZ)) sira.push(PROJESIZ);
    return sira.map((ad) => kutu.get(ad));
  }

  /* ----------------------------------------------------------------
     BİÇİM
     P9 yeşil nokta: emoji değil, CSS ile çizilmiş 6 px daire ve
     ince yarı saydam halka.
     ---------------------------------------------------------------- */
  const BICIM = `
.pa-panel { margin: 4px 0 8px; font-size: var(--df-row-font, 13px); }
.pa-baslik { display: flex; align-items: center; gap: 2px;
  padding: 4px var(--df-row-px, 10px); font-weight: 600; font-size: 11px;
  letter-spacing: .06em; text-transform: uppercase; }
.pa-baslik-ad { flex: 1; opacity: .62; }
.pa-dugme { all: unset; cursor: pointer; padding: 1px 5px; font-size: 12px;
  border-radius: 5px; line-height: 1.2; opacity: .6; }
.pa-dugme:hover, .pa-dugme:focus-visible { background: var(--df-hover, rgba(127,127,127,.18)); opacity: 1; }
.pa-ara { display: flex; align-items: center; gap: 6px; margin: 2px var(--df-row-px, 10px) 6px;
  padding: 4px 8px; border-radius: 8px; border: 1px solid rgba(127,127,127,.25);
  background: rgba(127,127,127,.06); }
.pa-ara:focus-within { border-color: rgba(127,127,127,.55); }
.pa-ara-simge { opacity: .5; font-size: 11px; }
.pa-ara input { all: unset; flex: 1; min-width: 0; font-size: 12px; color: inherit; }
.pa-ara input::placeholder { color: inherit; opacity: .45; }
.pa-kisayol { font-size: 10px; opacity: .45; border: 1px solid rgba(127,127,127,.35);
  border-radius: 4px; padding: 0 4px; line-height: 14px; }
.pa-filtreler { display: flex; flex-wrap: wrap; gap: 4px; margin: 0 var(--df-row-px, 10px) 6px; }
.pa-filtre { all: unset; cursor: pointer; font-size: 11px; padding: 2px 7px; border-radius: 999px;
  border: 1px solid rgba(127,127,127,.25); opacity: .7; white-space: nowrap; }
.pa-filtre:hover { opacity: 1; }
.pa-filtre[data-secili="1"] { opacity: 1; background: rgba(127,127,127,.2); border-color: rgba(127,127,127,.45); }
.pa-filtre-sayi { opacity: .6; font-variant-numeric: tabular-nums; margin-left: 3px; }
.pa-klasor { margin-bottom: 1px; }
.pa-klasor-satir { display: flex; align-items: center; gap: 6px;
  width: 100%; cursor: pointer; padding: 4px var(--df-row-px, 10px);
  border-radius: var(--df-radius-pill, 8px); box-sizing: border-box; }
.pa-klasor-satir:hover { background: var(--df-hover, rgba(127,127,127,.12)); }
.pa-ok { width: 11px; flex: 0 0 11px; text-align: center; opacity: .6; font-size: 10px; }
.pa-klasor-ad { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pa-bosluk { flex: 1; }
.pa-sayi { opacity: .5; font-variant-numeric: tabular-nums; white-space: nowrap; font-size: 12px; }
.pa-sohbetler { display: none; }
.pa-klasor[data-acik="1"] > .pa-sohbetler { display: block; }
.pa-alt > .pa-klasor-satir { padding-left: calc(var(--df-row-px, 10px) + 18px); opacity: .75; font-size: 12px; }
.pa-sohbet { display: flex; align-items: center; gap: 7px;
  padding: 4px var(--df-row-px, 10px) 4px calc(var(--df-row-px, 10px) + 12px);
  border-radius: var(--df-radius-pill, 8px); text-decoration: none;
  color: inherit; overflow: hidden; outline: none; }
.pa-alt .pa-sohbet { padding-left: calc(var(--df-row-px, 10px) + 30px); }
.pa-sohbet:hover { background: var(--df-hover, rgba(127,127,127,.12)); }
.pa-sohbet[data-arsiv="1"] { opacity: .55; }
.pa-sohbet[data-arsiv="1"]:hover { opacity: .85; }
.pa-sohbet[data-aktif="1"] { background: var(--df-hover, rgba(127,127,127,.18)); font-weight: 600; opacity: 1; }
.pa-sohbet.pa-odak { box-shadow: inset 0 0 0 1px rgba(127,127,127,.6); }
.pa-sohbet-ad { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pa-dugme[data-secili="1"] { opacity: 1; background: var(--df-hover, rgba(127,127,127,.18)); }
.pa-panel[data-sar="1"] .pa-sohbet { align-items: flex-start; }
.pa-panel[data-sar="1"] .pa-sohbet-ad { display: flex; white-space: normal; text-overflow: clip; line-height: 1.35; }
.pa-panel[data-sar="1"] .pa-on { flex: 0 0 auto; white-space: pre; }
.pa-panel[data-sar="1"] .pa-geri { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.pa-panel[data-sar="1"] .pa-yuva { margin-top: .5em; }
.pa-yuva { flex: 0 0 6px; width: 6px; height: 6px; display: inline-flex; }
.pa-nokta { display: inline-block; flex: 0 0 6px; width: 6px; height: 6px; border-radius: 50%;
  background: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,.22); }
.pa-not { padding: 4px var(--df-row-px, 10px) 4px calc(var(--df-row-px, 10px) + 18px);
  font-size: 12px; opacity: .55; }
.pa-not a { color: inherit; }
`;

  function bicimKur() {
    if (document.getElementById('pa-bicim')) return;
    const stil = document.createElement('style');
    stil.id = 'pa-bicim';
    stil.textContent = BICIM;
    document.head.appendChild(stil);
  }

  function ogeYap(etiket, sinif, metin) {
    const e = document.createElement(etiket);
    if (sinif) e.className = sinif;
    if (metin !== undefined) e.textContent = metin;
    return e;
  }

  function noktaYap() {
    const n = ogeYap('span', 'pa-nokta');
    n.title = 'Ekranda açık sohbet';
    return n;
  }

  /* ----------------------------------------------------------------
     AÇIK KLASÖR YARDIMCILARI
     Ana klasör anahtarı klasör adıdır; arşivli alt klasörün anahtarı
     "<klasör> 🗄" biçimindedir.
     ---------------------------------------------------------------- */
  const ALT = ' 🗄';

  function acikMi(anahtar) {
    return acikKlasorler.has(anahtar);
  }

  function acikAyarla(anahtar, deger) {
    if (deger) acikKlasorler.add(anahtar);
    else acikKlasorler.delete(anahtar);
    acikYaz(acikKlasorler);
  }

  /* ----------------------------------------------------------------
     SPA GEÇİŞİ
     Sol listede aynı yolu taşıyan özgün bağlantı varsa o tıklanır
     (sayfa yeniden yüklenmez). Arşivli sohbet sol listede yoktur:
     yol geçmişe yazılır ve popstate gönderilir; uygulama yolu
     değiştirmezse tam yüklemeye düşülür.
     ---------------------------------------------------------------- */
  function sohbeteGit(yol) {
    const cipa = cipaBul();
    const ozgun = cipa && [...cipa.querySelectorAll(S.baglanti)].find((b) => b.getAttribute('href') === yol);
    if (ozgun) {
      ozgun.click();
      return;
    }
    try {
      W.history.pushState(W.history.state, '', yol);
      W.dispatchEvent(new W.PopStateEvent('popstate', { state: W.history.state }));
    } catch (e) {
      location.assign(yol);
    }
  }

  /* ----------------------------------------------------------------
     SATIR ÇİZ
     Sohbet adı değiştirilmeden yazılır (P4). Ad değiştirme ve
     arşivleme düğmesi yoktur (P6, P13; Tanimlar.md TEK AD, ARŞİVLE).
     ---------------------------------------------------------------- */
  function satirCiz(k) {
    const a = ogeYap('a', 'pa-sohbet');
    a.href = k.yol;
    a.title = k.ad;
    a.tabIndex = -1;
    a.dataset.aktif = aktifMi(k) ? '1' : '0';
    a.dataset.arsiv = k.arsivli ? '1' : '0';
    const yuva = ogeYap('span', 'pa-yuva');
    if (aktifMi(k)) yuva.appendChild(noktaYap());
    // Ad iki parça yazılır, birleşimi uygulamadaki adın aynısıdır (P4).
    // Sarılıyken alt satırlar emoji ve tarihin değil etiketlerin
    // hizasından başlar (P15, 0.2.2).
    const adKutu = ogeYap('span', 'pa-sohbet-ad');
    const on = k.tarih ? (k.ad.match(/^(?:\S+\s+)?\d{6}\s*/) || [''])[0] : '';
    if (on) adKutu.append(ogeYap('span', 'pa-on', on), ogeYap('span', 'pa-geri', k.ad.slice(on.length)));
    else adKutu.appendChild(ogeYap('span', 'pa-geri', k.ad));
    a.append(yuva, adKutu);
    a.addEventListener('click', (e) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      sohbeteGit(k.yol);
    });
    return a;
  }

  /* ----------------------------------------------------------------
     KLASÖR ÇİZ
     acik: klasör açık mı · dolu: içindeki satır dizisi · sayac: metin
     ---------------------------------------------------------------- */
  function klasorCiz(ad, anahtar, acik, nokta, sayac, satirlar, sinif) {
    const kutu = ogeYap('div', 'pa-klasor' + (sinif ? ' ' + sinif : ''));
    kutu.dataset.acik = acik ? '1' : '0';
    kutu.dataset.anahtar = anahtar;
    const satir = ogeYap('div', 'pa-klasor-satir');
    satir.setAttribute('role', 'button');
    satir.tabIndex = 0;
    const ok = ogeYap('span', 'pa-ok', acik ? '▼' : '▶');
    satir.append(ok, ogeYap('span', 'pa-klasor-ad', ad));
    if (nokta) satir.appendChild(noktaYap());
    satir.append(ogeYap('span', 'pa-bosluk'), ogeYap('span', 'pa-sayi', sayac));
    const liste = ogeYap('div', 'pa-sohbetler');
    for (const s of satirlar) liste.appendChild(s);
    kutu.append(satir, liste);
    const cevir = () => {
      const simdi = kutu.dataset.acik === '1';
      kutu.dataset.acik = simdi ? '0' : '1';
      ok.textContent = simdi ? '▶' : '▼';
      if (!arama) acikAyarla(anahtar, !simdi);
    };
    satir.addEventListener('click', cevir);
    satir.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cevir();
      }
    });
    return kutu;
  }

  /* ----------------------------------------------------------------
     PANEL KABUĞU · başlık, düğmeler, arama, filtreler, liste kabı
     Kabuk bir kez kurulur; liste her değişiklikte yeniden çizilir,
     böylece arama kutusu odağını kaybetmez.
     ---------------------------------------------------------------- */
  let acikKayitlar = [];

  /* ----------------------------------------------------------------
     P15 · UZUN ADLARI SAR
     Açıkken sohbet adı tek satıra kesilmez, tamamı görünecek kadar
     alt satıra sarılır (Metin 04.11.2026). Durum hatırlanır.
     ---------------------------------------------------------------- */
  const SAR_ANAHTAR = 'proje-agaci-sar';
  let sar = (() => {
    try {
      return GM_getValue(SAR_ANAHTAR, false) === true;
    } catch (e) {
      return false;
    }
  })();

  function panelCiz() {
    const panel = ogeYap('div', 'pa-panel');
    panel.id = 'pa-panel';
    panel.dataset.sar = sar ? '1' : '0';

    const baslik = ogeYap('div', 'pa-baslik');
    baslik.appendChild(ogeYap('span', 'pa-baslik-ad', 'Proje Ağacı'));
    const dugme = (metin, ipucu, is) => {
      const d = ogeYap('button', 'pa-dugme', metin);
      d.type = 'button';
      d.title = ipucu;
      d.addEventListener('click', is);
      baslik.appendChild(d);
      return d;
    };
    dugme('⊞', 'Bütün klasörleri aç', () => tumunuCevir(true));
    dugme('⊟', 'Bütün klasörleri kapat', () => tumunuCevir(false));
    dugme('◎', 'Açık sohbete git', aktifeGit);
    const sarDugme = dugme('↵', 'Uzun adları alt satıra sar / tek satır', () => {
      sar = !sar;
      try {
        GM_setValue(SAR_ANAHTAR, sar);
      } catch (e) {
        /* oturum içinde sürer */
      }
      panel.dataset.sar = sar ? '1' : '0';
      sarDugme.dataset.secili = sar ? '1' : '0';
    });
    sarDugme.dataset.secili = sar ? '1' : '0';
    dugme('↻', 'Listeyi ve arşivi yeniden oku', () => {
      arsiv.durum = 'bekliyor';
      kur(true);
      arsivYukle();
    });

    const ara = ogeYap('label', 'pa-ara');
    const girdi = ogeYap('input');
    girdi.type = 'search';
    girdi.id = 'pa-ara-girdi';
    girdi.placeholder = 'Ara: başlık, #etiket, tarih';
    girdi.value = arama;
    girdi.autocomplete = 'off';
    girdi.spellcheck = false;
    ara.append(ogeYap('span', 'pa-ara-simge', '🔍'), girdi, ogeYap('span', 'pa-kisayol', '/'));
    girdi.addEventListener('input', () => {
      arama = girdi.value;
      odak = -1;
      listeCiz();
    });
    girdi.addEventListener('keydown', aramaTusu);

    const filtreler = ogeYap('div', 'pa-filtreler');
    filtreler.id = 'pa-filtreler';
    const liste = ogeYap('div', 'pa-liste');
    liste.id = 'pa-liste';

    panel.append(baslik, ara, filtreler, liste);
    return panel;
  }

  /* ----------------------------------------------------------------
     P12 · FİLTRE DÜĞMELERİ
     Sayılar aramadan bağımsızdır: filtrenin bütün içeriği.
     ---------------------------------------------------------------- */
  function filtreleriCiz() {
    const kap = document.getElementById('pa-filtreler');
    if (!kap) return;
    kap.textContent = '';
    const yollar = new Set(acikKayitlar.map((k) => k.yol));
    const bugun = gunKodu(0);
    const hafta = gunKodu(6);
    let arsivSayi = String(arsiv.liste.filter((k) => !yollar.has(k.yol)).length);
    if (arsiv.durum === 'yukleniyor' || arsiv.durum === 'bekliyor') arsivSayi = '…';
    if (arsiv.durum === 'hata') arsivSayi = '!';
    const ogeler = [
      ['tumu', 'Tümü', acikKayitlar.length],
      ['bugun', 'Bugün', acikKayitlar.filter((k) => k.tarih === bugun).length],
      ['hafta', '7 gün', acikKayitlar.filter((k) => k.tarih >= hafta && k.tarih <= bugun).length],
      ['arsiv', '🗄 Arşiv', arsivSayi]
    ];
    for (const [kod, ad, sayi] of ogeler) {
      const d = ogeYap('button', 'pa-filtre', ad);
      d.type = 'button';
      d.dataset.secili = filtre === kod ? '1' : '0';
      d.appendChild(ogeYap('span', 'pa-filtre-sayi', String(sayi)));
      d.addEventListener('click', () => {
        filtreYaz(kod);
        odak = -1;
        listeCiz();
      });
      kap.appendChild(d);
    }
  }

  /* ----------------------------------------------------------------
     LİSTE ÇİZ
     Arama varken eşleşen klasör ve arşivli alt klasör kendiliğinden
     açılır; bu açılış hafızaya yazılmaz (P11).
     ---------------------------------------------------------------- */
  function listeCiz() {
    const kap = document.getElementById('pa-liste');
    if (!kap) return;
    filtreleriCiz();
    kap.textContent = '';
    const g = gorunur(acikKayitlar);
    const klasorler = klasorleriKur(g.acik, g.arsivli);
    const aramaVar = sozcukler().length > 0;

    for (const k of klasorler) {
      const satirlar = k.acik.map(satirCiz);
      const noktaVar = k.acik.some(aktifMi) || k.arsivli.some(aktifMi);
      let sayac;
      if (filtre === 'arsiv') {
        sayac = '(' + k.arsivli.length + ')';
        satirlar.push(...k.arsivli.map(satirCiz));
      } else {
        sayac = '(' + k.acik.length + (k.arsivli.length ? ' · 🗄 ' + k.arsivli.length : '') + ')';
        if (k.arsivli.length) {
          const altAnahtar = k.ad + ALT;
          const altAcik = aramaVar || acikMi(altAnahtar);
          satirlar.push(klasorCiz(
            '🗄 Arşivli', altAnahtar, altAcik, k.arsivli.some(aktifMi),
            '(' + k.arsivli.length + ')', k.arsivli.map(satirCiz), 'pa-alt'
          ));
        }
      }
      const acik = aramaVar || acikMi(k.ad);
      kap.appendChild(klasorCiz(k.ad, k.ad, acik, noktaVar, sayac, satirlar));
    }

    if (!klasorler.length) {
      kap.appendChild(ogeYap('div', 'pa-not', aramaVar ? 'Eşleşme yok' : 'Bu filtrede sohbet yok'));
    }
    if (filtre !== 'bugun' && filtre !== 'hafta') {
      if (arsiv.durum === 'yukleniyor') kap.appendChild(ogeYap('div', 'pa-not', '🗄 Arşiv okunuyor…'));
      if (arsiv.durum === 'hata') {
        const not = ogeYap('div', 'pa-not', '🗄 Arşiv okunamadı · ');
        const bag = ogeYap('a', '', 'claude.ai arşiv görünümü');
        bag.href = ARSIV.gorunum;
        not.appendChild(bag);
        kap.appendChild(not);
      }
    }
    odakGoster();
  }

  /* ----------------------------------------------------------------
     P10 · DÜĞME İŞLERİ
     ⊞ ana klasörleri açar; ⊟ ana ve arşivli alt klasörlerin hepsini
     kapatır.
     ---------------------------------------------------------------- */
  function tumunuCevir(ac) {
    if (ac) {
      for (const k of klasorleriKur(acikKayitlar, arsiv.liste)) acikKlasorler.add(k.ad);
    } else {
      acikKlasorler = new Set();
    }
    acikYaz(acikKlasorler);
    listeCiz();
  }

  function aktifeGit() {
    const hepsi = acikKayitlar.concat(arsiv.liste);
    const k = hepsi.find(aktifMi);
    if (!k) return;
    arama = '';
    const girdi = document.getElementById('pa-ara-girdi');
    if (girdi) girdi.value = '';
    if (k.arsivli && !acikKayitlar.some(aktifMi)) {
      if (filtre !== 'arsiv') {
        filtreYaz('tumu');
        acikKlasorler.add(k.klasor + ALT);
      }
    } else {
      filtreYaz('tumu');
    }
    acikKlasorler.add(k.klasor);
    acikYaz(acikKlasorler);
    listeCiz();
    const satir = document.querySelector('#pa-liste .pa-sohbet[data-aktif="1"]');
    if (satir) satir.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ----------------------------------------------------------------
     P11 · KLAVYE
     "/" arama kutusuna geçer. Kutudayken ↑ ↓ görünür satırlarda
     gezer, Enter sohbeti açar, Esc aramayı siler.
     ---------------------------------------------------------------- */
  function gorunurSatirlar() {
    return [...document.querySelectorAll('#pa-liste .pa-sohbet')].filter((s) => s.offsetParent !== null);
  }

  function odakGoster() {
    const satirlar = gorunurSatirlar();
    satirlar.forEach((s, i) => s.classList.toggle('pa-odak', i === odak));
    if (odak >= 0 && satirlar[odak]) satirlar[odak].scrollIntoView({ block: 'nearest' });
  }

  function aramaTusu(e) {
    const satirlar = gorunurSatirlar();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!satirlar.length) return;
      const adim = e.key === 'ArrowDown' ? 1 : -1;
      odak = odak < 0 ? (adim > 0 ? 0 : satirlar.length - 1)
        : (odak + adim + satirlar.length) % satirlar.length;
      odakGoster();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const s = satirlar[odak >= 0 ? odak : 0];
      if (s) sohbeteGit(s.getAttribute('href'));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (arama) {
        arama = '';
        e.target.value = '';
        odak = -1;
        listeCiz();
      } else {
        e.target.blur();
      }
    }
  }

  function yaziAlaniMi(el) {
    if (!el) return false;
    const t = el.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (yaziAlaniMi(document.activeElement)) return;
    const girdi = document.getElementById('pa-ara-girdi');
    if (!girdi || girdi.offsetParent === null) return;
    e.preventDefault();
    girdi.focus();
    girdi.select();
  }, true);

  /* ----------------------------------------------------------------
     KUR · özgün listeyi gizle, panelin yerine koy
     Sol listeden kaybolan bir sohbet arşivlenmiş olabilir; o zaman
     arşiv yeniden okunur.
     ---------------------------------------------------------------- */
  function kur(zorla) {
    const cipa = cipaBul();
    if (!cipa) return false;
    const yeni = sohbetleriTopla();
    if (!yeni.length) return false;

    const eski = document.getElementById('pa-panel');
    if (eski && !zorla) return true;

    const onceki = new Set(acikKayitlar.map((k) => k.yol));
    const simdiki = new Set(yeni.map((k) => k.yol));
    const kaybolan = [...onceki].some((y) => !simdiki.has(y));
    acikKayitlar = yeni;

    const girdiOdakta = document.activeElement && document.activeElement.id === 'pa-ara-girdi';
    if (eski) eski.remove();

    bicimKur();
    const panel = panelCiz();
    cipa.parentElement.insertBefore(panel, cipa);
    cipa.style.display = 'none';
    sonYol = location.pathname;
    listeCiz();
    if (girdiOdakta) {
      const g = document.getElementById('pa-ara-girdi');
      g.focus();
      g.setSelectionRange(g.value.length, g.value.length);
    }
    if (arsiv.durum === 'bekliyor' || (kaybolan && arsiv.durum !== 'yukleniyor')) arsivYukle();
    return true;
  }

  /* ----------------------------------------------------------------
     YENİDEN ÇİZME GEREKİYOR MU
     claude.ai tek sayfa uygulamasıdır: başka sohbete geçilince sol
     menü yeniden kurulur. Panel React'in sildiği düğümle gidebilir,
     gizlenen çıpanın yerine görünür yeni bir çıpa gelebilir, yol
     değişebilir ya da sol listedeki sohbetler değişebilir (yeni,
     silinen, arşivlenen, adı değişen). Hepsi ayrı ayrı sınanır.
     ---------------------------------------------------------------- */
  function listeImzasi(kayitlar) {
    return kayitlar.map((k) => k.yol + '\u0001' + k.ad).join('\u0002');
  }

  function yenidenGerekli() {
    const panel = document.getElementById('pa-panel');
    if (!panel) return true;
    const cipa = cipaBul();
    if (!cipa) return false;
    if (cipa.style.display !== 'none') return true;
    if (location.pathname !== sonYol) return true;
    if (listeImzasi(sohbetleriTopla()) !== listeImzasi(acikKayitlar)) return true;
    return false;
  }

  /* ----------------------------------------------------------------
     SAYFA GEÇ YÜKLENİYOR · kenar çubuğu değişince yeniden kur
     Gözcü belgenin gövdesini izler, çünkü React kenar çubuğunu baştan
     kurarsa eski düğüme bağlı gözcü sağır kalır. Yalnız kenar
     çubuğunun içindeki veya kenar çubuğunu getiren değişiklik sayılır;
     sohbet akışı sayılmaz. Yol değişimi ayrıca saniyede bir sınanır.
     ---------------------------------------------------------------- */
  function kenarDegisti(r) {
    const h = r.target;
    if (h.closest && h.closest('#pa-panel')) return false;
    const kenar = document.querySelector(S.kenar);
    if (kenar && kenar.contains(h)) return true;
    const dugumler = [...r.addedNodes, ...r.removedNodes];
    return dugumler.some((n) => n.nodeType === 1 && (n.matches(S.kenar) || n.querySelector(S.kenar)));
  }

  function izle() {
    let bekleyen = null;
    const sina = () => {
      bekleyen = null;
      if (yenidenGerekli()) kur(true);
    };
    const gozcu = new MutationObserver((kayitlar) => {
      if (bekleyen || !kayitlar.some(kenarDegisti)) return;
      bekleyen = setTimeout(sina, 300);
    });
    gozcu.observe(document.body, { childList: true, subtree: true });
    setInterval(() => {
      if (!bekleyen && location.pathname !== sonYol) sina();
    }, 1000);
  }

  kur(true);
  izle();
  console.log('[Proje Ağacı] ' + SURUM + ' yüklendi');
})();
