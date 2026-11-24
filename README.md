# browser-tampermonkey

Tampermonkey için kişisel userscript koleksiyonu. Her betik tek dosyadır, bu depodan kurulur ve güncellemesini yine bu depodan çeker.

## Betikler

| Betik | Sürüm | Ne yapar | Kurulum |
|---|---|---|---|
| Site Tema | 2.7.0 | Bütün sitelere göz teması ve canlı ayar paneli; claude.ai el yapımı haritayla, öteki siteler otomatik haritayla. Ayrıntı aşağıda | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/site-tema.user.js) |
| Proje Ağacı | 0.2.4 | claude.ai/code sohbet listesini başlıktaki proje emojisine göre klasörlere ayırır; klasör içinde en yeni üstte, emojisiz sohbetler Projesiz'de. Arşivli sohbetler, arama (#etiket), filtreler, açık sohbete yeşil nokta, klasör satırındaki ↵ ile o klasörde uzun adları alt satıra sarma. Yalnız bilgisayar | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/proje-agaci.user.js) |
| Mesaj Katla | 0.1.0 | claude.ai sohbetinde her mesajın önüne başlık koyar (sıra no, kim, ilk satır); başlığa tıklayınca mesaj açılır veya kapanır. Sağ kenarda tümünü aç, tümünü kapat ve **Oto 3** düğmesi: yeni mesaj gelince son 3 mesajdan öncekiler kendiliğinden kapanır. Deneme sürümü | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/mesaj-katla.user.js) |
| GitHub Göz | 0.1.0 | GitHub koyu temalarında (Soft dark için ayarlı) parlak beyaz yazıyı yumuşatır, koyu mavi bağlantıyı açar, kalın yazıyı inceltir. Tampermonkey menüsünde aç/kapat | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/github-goz.user.js) |
| Makro Menü | 8.2 | Yüzen menü. "Kaynakları listele" sayfadaki video, ses ve resimleri tek panelde toplar (izle, indir, göster, kopyala); "Dışa aktar" sayfayı Markdown / metin / HTML olarak kopyalar veya indirir. Dişli düğme sürüklenir | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/makro-menu.user.js) |
| Döviz TL | 3.4 | Sayfadaki Euro ve dolar (USD, CAD, AUD, HKD, NZD) fiyatlarının arkasına güncel kurla TL karşılığını ekler | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/doviz-tl.user.js) |
| Medya İndir | 1.8 | Sayfadaki resim ve videoların köşesine indirme simgesi koyar; resmi en yüksek çözünürlükte, videoyu doğrudan dosya adresinden indirir. Akış videoları (YouTube vb.) ve Instagram kapsam dışıdır; tembel yüklenen videoda önce oynatma gerekir | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/medya-indir.user.js) |
| Web Ajanı | 0.4.0 | Makro kaydı gibi: **Kaydı başlat**, sitede istediğin her yere tıkla, **Durdur ve indir**. Sayfa haritası, tıklamadan sonra ne değiştiği, ağ istekleri ve hatalar tek dosyaya iner; sayaç neyin kaydedildiğini gösterir. Diğer araçlar: otomatik gez, öğe işaretle, tasarımı oku, fotokopi, toplayıcı, e-Nabız sağlık dökümü. Ayrıntı aşağıda | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/web-ajani.user.js) |
| Claude Tema (eski) | 0.5.3 | Site Tema'nın önceki hâli. Yeni kurulumda kullanılmaz; kurulu olan, Site Tema kurulup ayarları taşındıktan sonra Tampermonkey'den silinir | — |

## Web Ajanı

Tarayıcıda açık sitenin yapısını makro kaydı gibi kaydeden araç. Kayıt sitenin kendi tarayıcı deposunda (IndexedDB) durur; dışarı hiçbir şey göndermez. **Durdur ve indir** JSON dosyası indirir; `web-ajani-kaynak/ozetle.py` bu dosyadan değer göstermeyen kısa bir yapı özeti çıkarır, `web-ajani-kaynak/cikar.py` toplanan yanıtları ham hâliyle JSON Lines dosyasına çıkarır, `web-ajani-kaynak/dokum.py KAYIT.json KLASOR` sağlık dökümünü Markdown ve JSON dosyasına çevirir (ekrana yalnız sayılar yazar).

| Ne | Nasıl |
|---|---|
| Hangi sitede çalışır | Varsayılan: enabiz.gov.tr, claude.ai, chatgpt.com. Başka sitede **Alt+Shift+W** o siteyi açar veya kapatır (sayfa yenilenir). Kapalı sitede yalnız bu tuş dinlenir |
| Kayıt | Sol altta tek çubuk. **● Kaydı başlat** → sitede istediğin her yere tıkla, sayfadan sayfaya geç → **■ Durdur ve indir**. Kayıt sürerken çubuk kırmızıdır ve canlı sayaç gösterir (süre, tık, sayfa, istek); üstündeki satır son kaydedileni yazar. Sayfa değişse, yenilense de kayıt sürer. Kayıt kapalıyken hiçbir şey kaydedilmez. Yeni kayıt öncekini siler (Durdur onu zaten indirdi) |
| Diğer araçlar | Çubuktaki **≡**. Araçlar kayıt kapalıysa kaydı kendisi başlatır |
| Harita | Düğme, bağlantı, sekme, açılır liste ve bütün seçenekleri, arama kutusu, sayfalama, tablo sütunları, tekrarlanan kart kalıbı |
| Durum kaydı | Her tıklamadan sonra 1,5 sn ne değiştiğine bakar: açılan pencere ve içeriği, adres değişikliği, yeni pencere |
| Ağ kaydı | fetch ve XHR istekleri yanıtlarıyla (yanıt başına en çok 4 MB), tetikleyen tıklamaya bağlı |
| Hata günlüğü | Sayfa hataları, konsol hataları, başarısız istekler |
| Öğe işaretçi | **İşaretle**, sonra öğeye tıkla: sağlam seçici, çevresi, hesaplanmış stili, görünen zemini, kullandığı CSS değişkenleri. Esc vazgeçer |
| Tasarım okuyucu | **Tasarımı oku**: CSS değişkenleri, en çok kullanılan yazı ve zemin renkleri, yazı tipleri, boyutlar |
| Otomatik gez | **≡ → Otomatik gez**: açık penceredeki ve sayfadaki sekmeler, açılır listelerin her seçeneği (sonra ilk değere döner), kapalı bölümler, ikinci sayfa, her kart kalıbının ilk kartı (pencere açılırsa sekmeleri, sonra kapatır), en son aynı sitedeki başka sayfalara giden bağlantılar: o sayfaya gider, kaydeder, başlangıç sayfasına döner ve kalan yerlerden sürer; aynı öğeye iki kez basmaz. Frenli düğmeye, çıkış ve dosya bağlantısına, yeni sekmeye giden bağlantıya, form gönderen düğmeye basmaz; gez sürerken sayfanın sorduğu onay "hayır" alır, yeni pencere açılmaz. En çok 150 adım ve 40 sayfa; çubuktaki **■ Gezmeyi durdur** anında keser |
| Toplayıcı | Sayfada gezip kaydedilen bir veri adresini seç, değişkenleri yaz (`yil=2015-2026; sayfa=1-45` ya da `yil=2024,2025`), **Başlat**. İstek kaydedildiği gibi yeniden kurulur; gizlenen jeton sayfadaki gizli alandan alınır. Oturum düşerse (401/403, giriş sayfası, JSON yerine HTML) durur; giriş yapıp **Sürdür** kaldığı yerden devam eder. Yalnız site profilinde görünür (enabiz.gov.tr) |
| Sağlık dökümü | Yalnız e-Nabız'da: **≡ → Sağlık dökümü**. Tahlil, reçete, optik ve tıbbi cihaz reçetesi, hastalık, ziyaret, rapor, radyoloji, patoloji ve epikriz listelerini 2010'dan bu yıla tek istekte çeker (sunucu reddederse sayfanın aralığıyla bir kez daha), sonra her reçetenin ve ziyaretin ayrıntısını. İstekler sayfanın kendi başlıkları ve jetonuyla, 0,7 sn arayla gider; birkaç dakika sürer, sayfadan ayrılma. Bitince kayıt durur ve dosya iner; **■ Dökümü durdur** keser, o ana kadarkini indirir. Oturum düşerse durur, kayıt sürer |
| Sayfa fotokopisi | **Fotokopi**: sayfanın (açık pencere varsa onun) başlık, liste, tablo ve bağlantılarıyla sade metni; kayda yazılır ve panoya kopyalanır |
| Güvenlik | Araç, gez dışında hiçbir düğmeye kendiliğinden basmaz; sil, gönder, paylaş, kaydet gibi düğmeler haritada FRENLİ diye işaretlenir. Parola ve gizli alanların değeri kaydedilmez, istek gövdesinde de gizlenir |
| Hafiflik | Kayıt kapalıyken kanca isteğe dokunmadan geçer. Sınamada kurulum 1-5 ms, tık başına ek gecikme 1 ms altı |

Sınama: `web-ajani-kaynak/test/dene.py web-ajani.user.js CIKTI` (sahte e-Nabız sayfası, ağsız).

## Site Tema

Panel tek ayar yeridir. Altta iki liste vardır: solda bölge (Sol menü, Sohbet, Yazma kutusu…), sağda o bölgenin nesneleri. Seçili nesnenin ayarları üstte üç bölümde durur, her bölümün kendi renk seçicisi vardır: **Yazı** (renk, yazı tipi, boyut, aralıklar, kalınlık, hizalama, biçem), **Zemin** (renk, iç ve dış boşluk, köşe, gizle, saydamlık), **Çerçeve** (renk, çizgi kalınlığı, çizgi türü). Tema ve panel renklerinde tek **Renk** bölümü vardır. Her değişiklik sayfaya anında uygulanır.

| Ne | Nasıl |
|---|---|
| Paneli aç / kapat | `Ctrl+Shift+Y`, ◐ düğmesine tık ya da Tampermonkey menüsü |
| Bu sitede tema aç / kapat | ◐ düğmesine çift tık, ☰ ya da Tampermonkey menüsü; sayfa yenilenmez, son durum o sitede kalır. Kapalı sitede ◐ ve panel durur |
| Yeni sitelerde tema | ☰ → **Yeni sitelerde tema: açık / kapalı**. Temayı hiç açıp kapatmadığın sitelerde başlangıç durumudur; açıp kapattığın site kendi durumunda kalır, ☰ → "… yeni site varsayılanını izlesin" onu varsayılana döndürür |
| Nesne seç | Listeden tık; sayfada `Ctrl+sağ tık` (aynı yere tekrar: dıştaki nesne). Düz sağ tık tarayıcının menüsüdür |
| Birden çok nesne | Listede `Ctrl+tık`; telefonda **Çoklu** düğmesi. Seçilenler etiket olarak görünür, × seçimden çıkarır |
| Listede olmayan nesne | Sayfada `Ctrl+sağ tık` ya da Nesne başlığındaki **+**; ad verilir, kendi bölgesine eklenir |
| Geri / ileri | `Ctrl+Z` / `Ctrl+Shift+Z`; **Geçmiş** son 50 adımı listeler, yenilemede kalır; **Geçmişi temizle** listeyi boşaltır |
| Kaydet | Değişiklik önce taslaktır, kayıtlı tema değişmez. Başlığın altındaki satır: **Kaydet** üzerine yazar, **Farklı kaydet** yeni tema açar, **Vazgeç** taslağı siler. Listede ● taslağı olan temadır; ☰ → Fabrika ayarına dön hazır temayı ilk hâline getirir |
| Yalnız bu site | Renk değişikliği ortak temadaysa satırda iki düğme çıkar: **Kaydet: bütün siteler** ortak temanın üzerine yazar, **Yalnız <site>** renkleri o siteye özel yeni temaya ("Göz 3 · chatgpt.com") kaydeder; öteki sitelerdeki tema değişmez |
| Temalar | Sayfa: Göz 3 (varsayılan), Göz, Gece mavisi, Grafit, Kağıt (açık), Orijinal. Panel: Gece, Grafit, Lacivert, Orman, Kağıt (açık), Sis (açık); ☰ menüsünde panel teması da kopyalanır, adı değişir, listeden kaldırılır |
| Temalar ve siteler | Temanın renkleri bütün sitelerde ortaktır; nesne ayarı (boyut, aralık…) yalnız o sitede kalır. ☰ → "Yalnız bu site için başka tema seç" |
| Ayar taşıma | ☰ → Tümünü dosyaya kaydet (bütün siteler, temalar, panel, yüklenen yazı tipleri) / Dosyadan yükle (yedek, eski site ayarı, Claude Tema dosyası) |
| Kısayollar | Yazı tipi düğmesi seçiliyken `↑ ↓` sıradaki yazı tipi (liste açılmadan; `PageUp/PageDown` 10); listeden seçimden sonra düğme seçili kalır, liste açıkken ✓ işareti gezilen yazı tipine yürür. Sayı ve kaydırıcıda `Shift+ok` 10 adım. Renk kutusunda `← →` doygunluk, `↑ ↓` parlaklık; ton çubuğunda `← →`. Bölge ve nesne listesinde `↑ ↓`. `Ctrl+S` taslağı kaydeder. Renk noktasının iki ekseni ayrıca kaydırıcıdır (sağda parlaklık, altta doygunluk) |
| Öteki siteler | Haritası olmayan sitede sayfanın kendi renkleri ölçülür, temanın rollerine eşlenir (geniş paneller, kutular, renkli vurgular, ana ve soluk yazı, metin içi bağlantılar, çerçeveler); yeni gelen öğeler de işaretlenir. Bu roller panelde "Otomatik harita" bölgesinde nesne olarak ayarlanır. Sayfanın kendi teması değişirse ☰ → Haritayı yeniden ölç |
| Sekmeler | Bir sekmedeki değişiklik (sohbet, Claude Code) açık öteki claude.ai sekmelerine yenilemeden gelir |
| Sayfa taraması | ☰ → Sayfayı tara (birkaç ekranda) → Tarama dosyasını kaydet |
| Favori yazı tipi | Yazı tipi listesinde ☆ favoriye ekler (★); favoriler listenin başındadır, **★ Favori** süzgeci yalnız onları gösterir |
| Bilgi Kartı | ☰ menüsünün altında kapalı çekmece: sürüm, otomatik harita özeti, tarama, tanı, kısayollar |

Telefonda dikey tutulunca panel alttan, yan çevrilince sağdan açılır; uzun basma `Ctrl+sağ tık` yerine geçer.

## Klasörler

`site-tema-kaynak/` Site Tema'nın kaynağıdır. `sablon.user.js` kod, `panel.css` panelin görünümü, `oto_harita.js` otomatik site haritası, `stylus_goz_tema.css` temanın renk ve kuralları, `fontlar_google.json` yazı tipi listesi; `derle.py` bunları kökteki `site-tema.user.js` dosyasına derler. `test/` sahte claude.ai sayfasında (CSP'li sürümü de var) otomatik testtir:

```
cd site-tema-kaynak && python3 derle.py stylus_goz_tema.css sablon.user.js ../site-tema.user.js fontlar_google.json
cd test && python3 -m http.server 8766 --bind 127.0.0.1 &
python3 dene.py ../../site-tema.user.js http://127.0.0.1:8766/ /tmp
```

### Panel tasarımı

Panelin bütün görünümü `site-tema-kaynak/panel.css` dosyasındadır. `site-tema-kaynak/onizleme.html` derlenmiş betiği sahte bir sayfada panel açık hâlde çalıştırır ve `panel.css`'i her saniye yeniden okur: dosya kaydedilince panel derleme beklemeden yeni görünümle çizilir. Sayfa yerel sunucudan açılır (VS Code Live Preview ya da depo kökünde `python3 -m http.server --bind 127.0.0.1`, sonra `http://127.0.0.1:8000/site-tema-kaynak/onizleme.html`). Önizlemenin kayıtları yalnız o sekmededir; **Sıfırla** baştan açar. `panel.css` içinde ters tırnak ve `${` kullanılmaz (derle.py reddeder).

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
