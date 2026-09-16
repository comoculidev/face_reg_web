# Tələbə foto qeydiyyatı

Tək səhifəli sayt: brauzerin içində canlı şəkil çəkir, arxa planda üz tanıma işləyir, üz tapılmayanda "Şəkli çək" düyməsi işləmir. Şəkil və məlumatlar `faces/` qovluğunda toplanır.

## İşə salmaq

Node.js 18+ lazımdır.

```bash
npm install
npm start
```

Sonra brauzerdə açın: **http://localhost:3000**

## Necə işləyir

1. Sayt açılanda 4 addımlıq qaydalar pop-upı çıxır (eynək/papaq yox, təmiz arxa plan, yaxşı işıq, düz kameraya baxmaq). Pop-up bağlananda kamera açılır — istifadəçi fayl seçmir. Model pop-up oxunarkən arxa planda yüklənir.
2. Hər ~0.2 saniyədə kadr yoxlanılır. Düymə yalnız bu şərtlərin hamısı ödənəndə aktivləşir:
   - kadrda tam bir üz var,
   - üz kifayət qədər böyükdür (nə çox uzaq, nə çox yaxın),
   - üz çərçivənin mərkəzindədir.
3. "Şəkli çək" basılanda **yenidən** yoxlama gedir. Üz yoxdursa şəkil ümumiyyətlə çəkilmir.
4. Şəkil çəkiləndən sonra **Addım 3 — tələbə bileti təsdiqi** açılır. Burada kartın necə göründüyünə dair nümunə şəkil var (`reference/telebe-bileti-numune.jpg`) və istifadəçi tələbə biletinin ön üzünün şəklini yükləyir.
5. Yüklənən kart şəkli brauzerdə OCR ilə oxunur. Kartdakı ad-soyad Addım 2-də yazılmış Ad + Soyad ilə uyğun gəlməli və adın altında “AzTU” yazısı tapılmalıdır.
6. Hər iki şərt ödənəndə **Göndər** düyməsi aktivləşir. Kart şəkli serverdə saxlanılmır.

## Fayllar harada saxlanılır

Hamısı `faces/` qovluğunda:

- `Ad_Soyad_AtaAdi_Ixtisas_Qrup.jpeg` — şəkillər
- `melumatlar.csv` — Excel-də açılan cədvəl (UTF-8 BOM ilə, Azərbaycan hərfləri düzgün görünür)
- `melumatlar.json` — eyni məlumatların JSON variantı

Fayl adında Azərbaycan hərfləri latın qarşılığına çevrilir (ə→e, ş→s, ç→c, ğ→g, ö→o, ü→u, ı→i), boşluqlar `-` olur. Eyni adlı fayl varsa sona `-2`, `-3` əlavə olunur.

Qrup xanası həm rəqəm, həm hərf qəbul edir (məs. `642a`, `MI-21`).

Nümunə: `Elvin_Hesenov_Rasim_Komputer-muhendisliyi_642a.jpeg`

## Tələbə bileti təsdiqi haqqında

- Tələbə bileti şəkli brauzerdə Tesseract.js ilə OCR olunur; ayrıca API açarı tələb olunmur.
- OCR nəticəsində Addım 2-dəki Ad + Soyad və “AzTU” yazısı yoxlanılır.
- Uyğunluq olmadıqda **Göndər** düyməsi aktivləşmir.
- Kart şəkli yalnız yoxlama üçün brauzerdə istifadə olunur və serverdə saxlanılmır.

## Vacib qeydlər

- **Kamera yalnız `localhost`-da və ya HTTPS-də işləyir.** Saytı serverə qoyanda mütləq SSL sertifikatı olsun, yoxsa brauzer kameranı açmayacaq.
- Üz tanıma modeli jsDelivr CDN-dən yüklənir, yəni ilk açılışda internet lazımdır. Model brauzerdə keşlənir.
- Üz tanıma və tələbə bileti OCR yoxlaması istifadəçinin brauzerində gedir; tələbə bileti şəkli xarici AI xidmətinə göndərilmir.

## Nəyi asanlıqla dəyişmək olar

`public/app.js` faylında `evaluate()` funksiyası — üzün minimum ölçüsü və mərkəzə nə qədər yaxın olmalı olduğu rəqəmləri oradadır.

Eyni faylda `RULES` massivi — pop-updakı qaydaların mətni. Addım əlavə etmək üçün sadəcə massivə yeni element yazın, sayğac özü uyğunlaşır.

`server.js` faylında `FACES_DIR` — qovluğun yerini dəyişmək üçün.
