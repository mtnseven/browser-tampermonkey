# browser-tampermonkey

Tampermonkey için kişisel userscript koleksiyonu. Her betik tek dosyadır, bu depodan kurulur ve güncellemesini yine bu depodan çeker.

## Betikler

| Betik | Sürüm | Ne yapar | Kurulum |
|---|---|---|---|
| Site Tema | 2.0.0 | Sitelere göz teması ve canlı ayar paneli (şimdilik claude.ai). Ayrıntı aşağıda | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/site-tema.user.js) |
| Makro Menü | 8.2 | Yüzen menü. "Kaynakları listele" sayfadaki video, ses ve resimleri tek panelde toplar (izle, indir, göster, kopyala); "Dışa aktar" sayfayı Markdown / metin / HTML olarak kopyalar veya indirir. Dişli düğme sürüklenir | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/makro-menu.user.js) |
| Döviz TL | 3.4 | Sayfadaki Euro ve dolar (USD, CAD, AUD, HKD, NZD) fiyatlarının arkasına güncel kurla TL karşılığını ekler | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/doviz-tl.user.js) |
| Medya İndir | 1.8 | Sayfadaki resim ve videoların köşesine indirme simgesi koyar; resmi en yüksek çözünürlükte, videoyu doğrudan dosya adresinden indirir. Akış videoları (YouTube vb.) ve Instagram kapsam dışıdır; tembel yüklenen videoda önce oynatma gerekir | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/medya-indir.user.js) |
| Claude Tema (eski) | 0.5.3 | Site Tema'nın önceki hâli. Yeni kurulumda kullanılmaz; kurulu olan, Site Tema kurulup ayarları taşındıktan sonra Tampermonkey'den silinir | — |

## Site Tema

Panel tek ayar yeridir. Altta iki liste vardır: solda bölge (Sol menü, Sohbet, Yazma kutusu…), sağda o bölgenin nesneleri. Seçili nesnenin bütün ayarları üstte tek alanda durur: Renk (Zemin / Yazı / Çerçeve için tek renk seçici), Yazı, Kutu, Görünürlük. Nesnede olmayan ayar soluk ve kilitli görünür. Her değişiklik sayfaya anında uygulanır.

| Ne | Nasıl |
|---|---|
| Paneli aç / kapat | `Ctrl+Shift+Y`, ◐ düğmesi ya da Tampermonkey menüsü |
| Nesne seç | Listeden tık; sayfada `Ctrl+sağ tık` (aynı yere tekrar: dıştaki nesne). Düz sağ tık tarayıcının menüsüdür |
| Birden çok nesne | Listede `Ctrl+tık`; telefonda **Çoklu** düğmesi. Seçilenler etiket olarak görünür, × seçimden çıkarır |
| Listede olmayan nesne | Sayfada `Ctrl+sağ tık` ya da Nesne başlığındaki **+**; ad verilir, kendi bölgesine eklenir |
| Geri / ileri | `Ctrl+Z` / `Ctrl+Shift+Z`; **Geçmiş** son 50 adımı listeler, yenilemede kalır |
| Temalar | Sayfa: Göz, Gece mavisi, Grafit, Kağıt (açık), Orijinal. Panel: Gece, Grafit, Lacivert, Orman, Kağıt (açık), Sis (açık) — ☰ menüsünde |
| Ayar taşıma | ☰ → Dosyaya kaydet / Dosyadan yükle (Claude Tema dosyası da okunur) |
| Sayfa taraması | ☰ → Sayfayı tara (birkaç ekranda) → Tarama dosyasını kaydet |

Telefonda dikey tutulunca panel alttan, yan çevrilince sağdan açılır; uzun basma `Ctrl+sağ tık` yerine geçer.

## Klasörler

`site-tema-kaynak/` Site Tema'nın kaynağıdır. `sablon.user.js` kod, `stylus_goz_tema.css` temanın renk ve kuralları, `fontlar_google.json` yazı tipi listesi; `derle.py` bunları kökteki `site-tema.user.js` dosyasına derler. `test/` sahte claude.ai sayfasında (CSP'li sürümü de var) otomatik testtir:

```
cd site-tema-kaynak && python3 derle.py stylus_goz_tema.css sablon.user.js ../site-tema.user.js fontlar_google.json
cd test && python3 -m http.server 8766 &
python3 dene.py ../../site-tema.user.js http://127.0.0.1:8766/ /tmp
```

`claude-tema-kaynak/` eski Claude Tema'nın kaynağıdır, değiştirilmez.

## Kurulum

1. Tarayıcıya [Tampermonkey](https://www.tampermonkey.net/) kurulur.
2. Chrome tabanlı tarayıcılarda eklentinin kullanıcı betiği izni açılır. Chrome 138 ve sonrasında bu, eklenti detay sayfasındaki **Allow user scripts** anahtarıdır; daha eski sürümlerde Geliştirici Modu açılır. Bu adım atlanırsa hiçbir betik çalışmaz.
3. Yukarıdaki tablodan betiğin **kur** bağlantısı açılır, Tampermonkey kurulum ekranı gelir.

Aynı betiğin elle yüklenmiş eski bir kopyası varsa önce silinir; iki kopya aynı anda açıkken hangisinin çalıştığı belirsizleşir.

## Güncelleme

Betikler `@updateURL` ve `@downloadURL` üzerinden bu depoyu izler. Tampermonkey yalnız `@version` artmışsa yeni sürümü indirir; sürüm aynıysa kod değişmiş olsa bile güncelleme gelmez.

raw.githubusercontent.com adreslerinin birkaç dakikalık önbelleği vardır. Commit'ten hemen sonra eski sürüm görünmesi normaldir.

## Sürüm kuralı

Küçük değişiklikte ondalık artar (`5.2 → 5.3`), yapısal değişiklikte tam sayı artar (`5.9 → 6.0`). Site Tema üç basamaklıdır (`2.0.0 → 2.0.1` düzeltme, `2.1.0` yeni özellik). Commit mesajına sürüm numarası yazılır.

## Güvenlik

Betiklerde API anahtarı, parola veya başka gizli değer bulunmaz. Depo herkese açıktır ve betik kodu çalıştığı sayfadaki diğer scriptler tarafından okunabilir. Gerekli gizli değerler cihaz üzerinde `GM_setValue` ile saklanır.
