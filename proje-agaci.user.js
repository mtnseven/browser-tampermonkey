// ==UserScript==
// @name         Proje Ağacı
// @namespace    metin-proje-agaci
// @version      0.1.1
// @description  claude.ai/code sohbet listesini proje emojisine göre klasörlere ayırır
// @match        https://claude.ai/code*
// @run-at       document-idle
// @noframes
// @updateURL    https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/proje-agaci.user.js
// @downloadURL  https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/proje-agaci.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  const SURUM = '0.1.1';

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
     ---------------------------------------------------------------- */
  function tarihOku(ad) {
    const eslesme = ad.match(/(?:^|\s)(\d{6})(?=\s|\||$)/);
    return eslesme ? eslesme[1] : '';
  }

  /* ----------------------------------------------------------------
     SOHBETLERİ TOPLA
     ---------------------------------------------------------------- */
  function sohbetleriTopla() {
    const cipa = cipaBul();
    if (!cipa) return [];
    const baglantilar = [...cipa.querySelectorAll(S.baglanti)];
    return baglantilar.map((baglanti) => {
      const ad = sohbetAdi(baglanti);
      const bilgi = projeBul(ad);
      return {
        ad,
        yol: baglanti.getAttribute('href') || '',
        klasor: bilgi.klasor,
        emoji: bilgi.emoji,
        tarih: tarihOku(ad),
        aktif: baglanti.getAttribute('aria-current') === 'page'
      };
    });
  }

  /* ----------------------------------------------------------------
     P1 + P2 + P3 · KLASÖRLERİ KUR
     ---------------------------------------------------------------- */
  function klasorleriKur(sohbetler) {
    const kutu = new Map();
    for (const s of sohbetler) {
      if (!kutu.has(s.klasor)) kutu.set(s.klasor, []);
      kutu.get(s.klasor).push(s);
    }
    for (const liste of kutu.values()) {
      liste.sort((a, b) => {
        if (a.tarih && b.tarih) return b.tarih.localeCompare(a.tarih);
        if (a.tarih) return -1;
        if (b.tarih) return 1;
        return 0;
      });
    }
    const sira = PROJELER
      .map(([emoji, proje]) => emoji + ' ' + proje)
      .filter((ad) => kutu.has(ad));
    if (kutu.has(PROJESIZ)) sira.push(PROJESIZ);
    return sira.map((ad) => ({ ad, sohbetler: kutu.get(ad) }));
  }

  /* ----------------------------------------------------------------
     BİÇİM
     ---------------------------------------------------------------- */
  const BICIM = `
.pa-panel { margin: 4px 0 8px; font-size: var(--df-row-font, 13px); }
.pa-baslik { display: flex; align-items: center; gap: 6px;
  padding: 4px var(--df-row-px, 10px); font-weight: 600; font-size: 11px;
  letter-spacing: .06em; text-transform: uppercase; opacity: .62; }
.pa-baslik-ad { flex: 1; }
.pa-dugme { all: unset; cursor: pointer; padding: 1px 5px;
  border-radius: 5px; line-height: 1.2; opacity: .75; }
.pa-dugme:hover { background: var(--df-hover, rgba(127,127,127,.18)); opacity: 1; }
.pa-klasor { margin-bottom: 1px; }
.pa-klasor-satir { display: flex; align-items: center; gap: 6px;
  width: 100%; cursor: pointer; padding: 4px var(--df-row-px, 10px);
  border-radius: var(--df-radius-pill, 8px); }
.pa-klasor-satir:hover { background: var(--df-hover, rgba(127,127,127,.12)); }
.pa-ok { width: 11px; flex: 0 0 11px; text-align: center; opacity: .6; font-size: 10px; }
.pa-klasor-ad { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pa-sayi { opacity: .5; font-variant-numeric: tabular-nums; }
.pa-sohbetler { display: none; }
.pa-klasor[data-acik="1"] > .pa-sohbetler { display: block; }
.pa-sohbet { display: flex; align-items: center; gap: 6px;
  padding: 4px var(--df-row-px, 10px) 4px calc(var(--df-row-px, 10px) + 18px);
  border-radius: var(--df-radius-pill, 8px); text-decoration: none;
  color: inherit; overflow: hidden; }
.pa-sohbet:hover { background: var(--df-hover, rgba(127,127,127,.12)); }
.pa-sohbet-ad { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pa-nokta { flex: 0 0 auto; opacity: .85; font-size: 9px; }
.pa-sohbet[data-aktif="1"] { background: var(--df-hover, rgba(127,127,127,.18)); font-weight: 600; }
`;

  function bicimKur() {
    if (document.getElementById('pa-bicim')) return;
    const stil = document.createElement('style');
    stil.id = 'pa-bicim';
    stil.textContent = BICIM;
    document.head.appendChild(stil);
  }

  /* ----------------------------------------------------------------
     P4 + P5 + P6 · PANELİ ÇİZ
     Sohbet adı değiştirilmeden yazılır (P4). Ad değiştirme ve
     arşivleme düğmesi yoktur (P6, Tanimlar.md TEK AD, ARŞİVLE).
     ---------------------------------------------------------------- */
  function panelCiz(klasorler) {
    const panel = document.createElement('div');
    panel.className = 'pa-panel';
    panel.id = 'pa-panel';

    const baslik = document.createElement('div');
    baslik.className = 'pa-baslik';
    const basAd = document.createElement('span');
    basAd.className = 'pa-baslik-ad';
    basAd.textContent = 'Proje Ağacı';
    const kapat = document.createElement('button');
    kapat.className = 'pa-dugme';
    kapat.type = 'button';
    kapat.textContent = '⊟';
    kapat.title = 'Bütün klasörleri kapat';
    const yenile = document.createElement('button');
    yenile.className = 'pa-dugme';
    yenile.type = 'button';
    yenile.textContent = '↻';
    yenile.title = 'Listeyi yeniden oku';
    baslik.append(basAd, kapat, yenile);
    panel.appendChild(baslik);

    for (const klasor of klasorler) {
      const aktifVar = klasor.sohbetler.some((s) => s.aktif);
      const acik = acikKlasorler.has(klasor.ad) || aktifVar;

      const kutu = document.createElement('div');
      kutu.className = 'pa-klasor';
      kutu.dataset.acik = acik ? '1' : '0';
      kutu.dataset.ad = klasor.ad;

      const satir = document.createElement('div');
      satir.className = 'pa-klasor-satir';
      satir.setAttribute('role', 'button');
      satir.tabIndex = 0;

      const ok = document.createElement('span');
      ok.className = 'pa-ok';
      ok.textContent = acik ? '▼' : '▶';

      const ad = document.createElement('span');
      ad.className = 'pa-klasor-ad';
      ad.textContent = klasor.ad;

      const sayi = document.createElement('span');
      sayi.className = 'pa-sayi';
      sayi.textContent = '(' + klasor.sohbetler.length + ')';

      satir.append(ok, ad, sayi);
      kutu.appendChild(satir);

      const liste = document.createElement('div');
      liste.className = 'pa-sohbetler';
      for (const s of klasor.sohbetler) {
        const baglanti = document.createElement('a');
        baglanti.className = 'pa-sohbet';
        baglanti.href = s.yol;
        baglanti.dataset.aktif = s.aktif ? '1' : '0';
        const sAd = document.createElement('span');
        sAd.className = 'pa-sohbet-ad';
        sAd.textContent = s.ad;
        baglanti.appendChild(sAd);
        if (s.aktif) {
          const nokta = document.createElement('span');
          nokta.className = 'pa-nokta';
          nokta.textContent = '●';
          baglanti.appendChild(nokta);
        }
        liste.appendChild(baglanti);
      }
      kutu.appendChild(liste);
      panel.appendChild(kutu);

      const cevir = () => {
        const simdiAcik = kutu.dataset.acik === '1';
        kutu.dataset.acik = simdiAcik ? '0' : '1';
        ok.textContent = simdiAcik ? '▶' : '▼';
        if (simdiAcik) acikKlasorler.delete(klasor.ad);
        else acikKlasorler.add(klasor.ad);
        acikYaz(acikKlasorler);
      };
      satir.addEventListener('click', cevir);
      satir.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cevir();
        }
      });
    }

    kapat.addEventListener('click', () => {
      acikKlasorler = new Set();
      acikYaz(acikKlasorler);
      panel.querySelectorAll('.pa-klasor').forEach((k) => {
        k.dataset.acik = '0';
        const o = k.querySelector('.pa-ok');
        if (o) o.textContent = '▶';
      });
    });
    yenile.addEventListener('click', () => kur(true));

    return panel;
  }

  /* ----------------------------------------------------------------
     KUR · özgün listeyi gizle, panelin yerine koy
     ---------------------------------------------------------------- */
  function kur(zorla) {
    const cipa = cipaBul();
    if (!cipa) return false;
    const sohbetler = sohbetleriTopla();
    if (!sohbetler.length) return false;

    const eski = document.getElementById('pa-panel');
    if (eski && !zorla) return true;
    if (eski) eski.remove();

    bicimKur();
    const panel = panelCiz(klasorleriKur(sohbetler));
    cipa.parentElement.insertBefore(panel, cipa);
    cipa.style.display = 'none';
    sonYol = location.pathname;
    return true;
  }

  /* ----------------------------------------------------------------
     YENİDEN ÇİZME GEREKİYOR MU
     claude.ai tek sayfa uygulamasıdır: başka sohbete geçilince sol
     menü yeniden kurulur. Panel React'in sildiği düğümle gidebilir,
     gizlenen çıpanın yerine görünür yeni bir çıpa gelebilir, ya da
     panel durur ama açık sohbet işareti (●) eskimiş kalır. Üçü de
     ayrı ayrı sınanır (03.11.2026 denemesi).
     ---------------------------------------------------------------- */
  function yenidenGerekli() {
    const panel = document.getElementById('pa-panel');
    if (!panel) return true;
    const cipa = cipaBul();
    if (!cipa) return false;
    if (cipa.style.display !== 'none') return true;
    if (location.pathname !== sonYol) return true;
    const sayfadaAktif = document.querySelector(S.baglanti + '[aria-current="page"]');
    const paneldeAktif = panel.querySelector('.pa-sohbet[data-aktif="1"]');
    const sayfaYol = sayfadaAktif ? sayfadaAktif.getAttribute('href') : '';
    const panelYol = paneldeAktif ? paneldeAktif.getAttribute('href') : '';
    if (sayfaYol !== panelYol) return true;
    return false;
  }

  /* ----------------------------------------------------------------
     SAYFA GEÇ YÜKLENİYOR · kenar çubuğu değişince yeniden kur
     ---------------------------------------------------------------- */
  function izle() {
    const kenar = document.querySelector(S.kenar) || document.body;
    let bekleyen = null;
    const gozcu = new MutationObserver(() => {
      if (bekleyen) return;
      bekleyen = setTimeout(() => {
        bekleyen = null;
        if (yenidenGerekli()) kur(true);
      }, 300);
    });
    gozcu.observe(kenar, { childList: true, subtree: true });
  }

  kur(true);
  izle();
  console.log('[Proje Ağacı] ' + SURUM + ' yüklendi');
})();
