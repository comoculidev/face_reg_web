const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const FACES_DIR = path.join(__dirname, 'faces');
const CSV_PATH = path.join(FACES_DIR, 'melumatlar.csv');
const JSON_PATH = path.join(FACES_DIR, 'melumatlar.json');

if (!fs.existsSync(FACES_DIR)) fs.mkdirSync(FACES_DIR, { recursive: true });

app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Azerbaycan herflerini fayl adi ucun tehlukesiz formaya cevirir
const MAP = {
  'ə': 'e', 'Ə': 'E', 'ı': 'i', 'I': 'I', 'İ': 'I', 'i': 'i',
  'ö': 'o', 'Ö': 'O', 'ü': 'u', 'Ü': 'U', 'ğ': 'g', 'Ğ': 'G',
  'ş': 's', 'Ş': 'S', 'ç': 'c', 'Ç': 'C'
};

function slug(text) {
  return String(text || '')
    .trim()
    .replace(/[əƏıİIiöÖüÜğĞşŞçÇ]/g, (ch) => MAP[ch] || ch)
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9\-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function csvCell(value) {
  const v = String(value == null ? '' : value);
  return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function uniquePath(baseName, ext) {
  let candidate = path.join(FACES_DIR, baseName + ext);
  let i = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(FACES_DIR, baseName + '-' + i + ext);
    i++;
  }
  return candidate;
}

// istifadeci adlari ile kart ustunde yazilan adin serverde de uygunlugunu yoxlayir
// (brauzerdeki yoxlamani DevTools ile bypass etmeye qarsi son sedd)
function normalizeName(text) {
  const AZ_LOWER = { 'İ': 'i', 'I': 'ı' };
  return String(text || '')
    .trim()
    .replace(/[İI]/g, (ch) => AZ_LOWER[ch])
    .toLocaleLowerCase('az')
    .replace(/\s+/g, ' ');
}

app.post('/api/qeydiyyat', (req, res) => {
  try {
    const { ad, soyad, ataAdi, ixtisas, qrup, kurs, sekil, kartAd, kartAztu } = req.body || {};

    const required = { ad, soyad, ataAdi, ixtisas, qrup, kurs };
    for (const [key, value] of Object.entries(required)) {
      if (!value || !String(value).trim()) {
        return res.status(400).json({ ok: false, error: 'Bu xana boş qalıb: ' + key });
      }
    }
    if (!['1', '2', '3', '4'].includes(String(kurs))) {
      return res.status(400).json({ ok: false, error: 'Kurs 1, 2, 3 və ya 4 olmalıdır.' });
    }
    if (!sekil || !/^data:image\/(jpeg|png);base64,/.test(sekil)) {
      return res.status(400).json({ ok: false, error: 'Şəkil tapılmadı. Əvvəlcə şəkil çəkin.' });
    }

    // telebe bileti tesdiqi: yazilan ad kartdaki adla uygun gelmelidir
    if (!kartAd || !String(kartAd).trim()) {
      return res.status(400).json({ ok: false, error: 'Kartda yazılan ad-soyad daxil edilməyib.' });
    }
    if (kartAztu !== true) {
      return res.status(400).json({ ok: false, error: 'Kart təsdiqi tamamlanmayıb: "AzTU" yazısı təsdiqlənməyib.' });
    }
    const enteredFull = normalizeName(ad + ' ' + soyad);
    const cardFull = normalizeName(kartAd);
    if (enteredFull !== cardFull) {
      return res.status(400).json({ ok: false, error: 'Yazdığınız ad-soyad kartdakı adla uyğun gəlmir.' });
    }

    const ext = sekil.startsWith('data:image/png') ? '.png' : '.jpeg';
    const buffer = Buffer.from(sekil.split(',')[1], 'base64');

    // Fayl adi: Ad_Soyad_AtaAdi_Ixtisas_QrupNomresi.jpeg
    const baseName = [ad, soyad, ataAdi, ixtisas, qrup].map(slug).filter(Boolean).join('_');
    const filePath = uniquePath(baseName || 'telebe', ext);
    fs.writeFileSync(filePath, buffer);

    const record = {
      ad: String(ad).trim(),
      soyad: String(soyad).trim(),
      ataAdi: String(ataAdi).trim(),
      ixtisas: String(ixtisas).trim(),
      qrup: String(qrup).trim(),
      kurs: String(kurs),
      fayl: path.basename(filePath),
      tarix: new Date().toISOString()
    };

    // CSV
    if (!fs.existsSync(CSV_PATH)) {
      fs.writeFileSync(CSV_PATH, '\uFEFFAd,Soyad,Ata adı,İxtisas,Qrup,Kurs,Fayl,Tarix\n', 'utf8');
    }
    const row = [record.ad, record.soyad, record.ataAdi, record.ixtisas, record.qrup, record.kurs, record.fayl, record.tarix]
      .map(csvCell).join(',') + '\n';
    fs.appendFileSync(CSV_PATH, row, 'utf8');

    // JSON
    let all = [];
    if (fs.existsSync(JSON_PATH)) {
      try { all = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')) || []; } catch (e) { all = []; }
    }
    all.push(record);
    fs.writeFileSync(JSON_PATH, JSON.stringify(all, null, 2), 'utf8');

    res.json({ ok: true, fayl: record.fayl, say: all.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server xətası: ' + err.message });
  }
});

app.get('/api/say', (req, res) => {
  let all = [];
  if (fs.existsSync(JSON_PATH)) {
    try { all = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')) || []; } catch (e) { all = []; }
  }
  res.json({ say: all.length });
});

app.listen(PORT, () => {
  console.log('Server işləyir:  http://localhost:' + PORT);
  console.log('Şəkillər:        ' + FACES_DIR);
});
