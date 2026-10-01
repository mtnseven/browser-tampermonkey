# browser-tampermonkey

Tampermonkey için kişisel userscript koleksiyonu. Her betik tek dosyadır, bu depodan kurulur ve güncellemesini yine bu depodan çeker.

## Betikler

| Betik | Ne yapar | Kurulum |
|---|---|---|
| Makro Menü | Yüzen menü. "Kaynakları listele" sayfadaki video, ses ve resimleri tek panelde toplar (izle, indir, göster, kopyala); "Dışa aktar" sayfayı Markdown / metin / HTML olarak kopyalar veya indirir | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/makro-menu.user.js) |
| Döviz TL | Sayfadaki Euro ve dolar (USD, CAD, AUD, HKD, NZD) fiyatlarının arkasına güncel kurla TL karşılığını ekler | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/doviz-tl.user.js) |
| Medya İndir | Sayfadaki resim ve videoların köşesine indirme simgesi koyar; resmi en yüksek çözünürlükte, videoyu doğrudan dosya adresinden indirir. Akış videoları (YouTube vb.) ve Instagram kapsam dışıdır; tembel yüklenen videoda önce oynatma gerekir | [kur](https://raw.githubusercontent.com/mtnseven/browser-tampermonkey/main/indirme-test.user.js) |

## Kurulum

1. Tarayıcıya [Tampermonkey](https://www.tampermonkey.net/) kurulur.
2. Chrome tabanlı tarayıcılarda eklentinin kullanıcı betiği izni açılır. Chrome 138 ve sonrasında bu, eklenti detay sayfasındaki **Allow user scripts** anahtarıdır; daha eski sürümlerde Geliştirici Modu açılır. Bu adım atlanırsa hiçbir betik çalışmaz.
3. Yukarıdaki tablodan betiğin **kur** bağlantısı açılır, Tampermonkey kurulum ekranı gelir.

Aynı betiğin elle yüklenmiş eski bir kopyası varsa önce silinir; iki kopya aynı anda açıkken hangisinin çalıştığı belirsizleşir.

## Güncelleme

Betikler `@updateURL` ve `@downloadURL` üzerinden bu depoyu izler. Tampermonkey yalnız `@version` artmışsa yeni sürümü indirir; sürüm aynıysa kod değişmiş olsa bile güncelleme gelmez.

raw.githubusercontent.com adreslerinin birkaç dakikalık önbelleği vardır. Commit'ten hemen sonra eski sürüm görünmesi normaldir.

## Sürüm kuralı

Küçük değişiklikte ondalık artar (`5.2 → 5.3`), yapısal değişiklikte tam sayı artar (`5.9 → 6.0`). Commit mesajına sürüm numarası yazılır.

## Güvenlik

Betiklerde API anahtarı, parola veya başka gizli değer bulunmaz. Depo herkese açıktır ve betik kodu çalıştığı sayfadaki diğer scriptler tarafından okunabilir. Gerekli gizli değerler cihaz üzerinde `GM_setValue` ile saklanır.
