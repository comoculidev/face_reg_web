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

1. Sayt açılanda 5 addımlıq qaydalar pop-upı çıxır. Pop-up bağlananda kamera açılır. Model pop-up oxunarkən arxa planda yüklənir.
2. Hər ~0.2 saniyədə kadr yoxlanılır. Düymə yalnız bir üz kadrda düzgün vəziyyətdə olanda aktivləşir.
3. "Şəkli çək" basılanda yenidən son üz yoxlaması aparılır və yalnız bundan sonra şəkil götürülür.
4. Şəkildən sonra **Addım 3 — tələbə bileti təsdiqi** açılır. İstifadəçi tələbə biletinin ön üzünün şəklini yükləyir.
5. Tələbə bileti OCR yoxlamasında kartın referansdakı strukturuna uyğun olaraq ad-soyadın olduğu sahə və onun altındakı `AzTU` sahəsi ayrıca oxunur. Şəkil əvvəlcə ölçüləndirilir, lazım olduqda portret istiqamətinə çevrilir və OCR üçün kontrastlaşdırılır.
6. OCR işçisi kart yüklənəndə yaradılır və eyni səhifədə təkrar istifadə olunur. **Ad və ya Soyad dəyişdiriləndə OCR yenidən işə düşmür** — əvvəl oxunmuş nəticə dərhal yenidən müqayisə olunur.
7. Kartdakı ad-soyad Addım 2-dəki Ad + Soyadla uyğun gəlməli və `AzTU` yazısı tapılmalıdır. Uyğunluqda **Göndər** aktivləşir.
8. Kart şəkli serverdə saxlanılmır.

## Fayllar harada saxlanılır

Hamısı `faces/` qovluğunda:

- `Ad_Soyad_AtaAdi_Ixtisas_Qrup.jpeg` — şəkillər
- `melumatlar.csv` — Excel-də açılan cədvəl
- `melumatlar.json` — eyni məlumatların JSON variantı

## Tələbə bileti OCR yoxlaması

- Tələbə bileti şəkli brauzerdə Tesseract.js ilə OCR olunur.
- OCR üçün bütün kartı kor-koranə oxumaq əvəzinə referansdakı ad-soyad və `AzTU` sahələri əvvəlcə ayrıca yoxlanılır.
- Crop OCR kifayət etməzsə, yalnız həmin yükləmə üçün ehtiyat olaraq bütün kart bir dəfə oxunur.
- Ad-soyad müqayisəsində Azərbaycan hərflərinin OCR-dan yaranan kiçik fərqləri normallaşdırılır və kiçik OCR səhvlərinə tolerant uyğunluq tətbiq olunur.
- Kart şəkli xarici AI xidmətinə göndərilmir və serverdə saxlanılmır.

## Vacib qeydlər

- **Kamera yalnız `localhost`-da və ya HTTPS-də işləyir.**
- Üz tanıma modeli və Tesseract.js CDN-dən yüklənir, ilk açılışda internet lazımdır.
- OCR worker kart addımına keçildikdə əvvəlcədən hazırlanır və sonrakı kart yoxlamalarında təkrar yaradılmır.
