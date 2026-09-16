/* Tələbə foto qeydiyyatı — kamera + üz tanıma */

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

const video     = document.getElementById('video');
const overlay   = document.getElementById('overlay');
const preview   = document.getElementById('preview');
const guide     = document.getElementById('guide');
const shot      = document.getElementById('shot');

const veil      = document.getElementById('veil');
const veilText  = document.getElementById('veilText');
const startBtn  = document.getElementById('startBtn');

const readout    = document.getElementById('readout');
const statusText = document.getElementById('statusText');

const shootBtn  = document.getElementById('shootBtn');
const retakeBtn = document.getElementById('retakeBtn');
const sendBtn   = document.getElementById('sendBtn');
const form      = document.getElementById('form');
const msg       = document.getElementById('msg');
const fileHint  = document.getElementById('fileHint');

const fields = {
  ad:      document.getElementById('ad'),
  soyad:   document.getElementById('soyad'),
  ataAdi:  document.getElementById('ataAdi'),
  ixtisas: document.getElementById('ixtisas'),
  qrup:    document.getElementById('qrup'),
  kurs:    document.getElementById('kurs')
};

let detector   = null;   // 'faceapi' | 'native'
let nativeDet  = null;
let stream     = null;
let faceOk     = false;
let capturedDataUrl = null;
let loopId     = null;

/* ---------- vəziyyət göstəricisi ---------- */

function setStatus(state, text){
  readout.dataset.state = state;
  statusText.textContent = text;
  guide.dataset.ok = state === 'ok' ? '1' : '0';
}

function setMsg(text, kind){
  msg.textContent = text || '';
  if (kind) msg.dataset.kind = kind; else msg.removeAttribute('data-kind');
}

/* ---------- 1. model ---------- */

let detectorPromise = null;

function loadDetector(){
  if (!detectorPromise) detectorPromise = loadDetectorOnce();
  return detectorPromise;
}

async function loadDetectorOnce(){
  try {
    if (!window.faceapi) throw new Error('kitabxana yüklənmədi');
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    detector = 'faceapi';
    return true;
  } catch (e) {
    console.warn('face-api yüklənmədi:', e);
  }
  if ('FaceDetector' in window){
    try {
      nativeDet = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
      detector = 'native';
      return true;
    } catch (e) { console.warn(e); }
  }
  return false;
}

/* ---------- 2. kamera ---------- */

async function startCamera(){
  veilText.textContent = 'Kamera hazırlanır…';
  startBtn.hidden = true;
  veil.hidden = false;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    overlay.width  = video.videoWidth  || 640;
    overlay.height = video.videoHeight || 480;
    veil.hidden = true;
    startLoop();
  } catch (e) {
    veil.hidden = false;
    startBtn.hidden = false;
    startBtn.textContent = 'Yenidən cəhd et';
    veilText.textContent = 'Kameraya icazə verilmədi. Brauzerin ünvan sətrindəki kamera nişanından icazəni açın, sonra yenidən cəhd edin.';
    setStatus('no', 'Kamera bağlıdır');
  }
}

/* ---------- 3. üz tanıma ---------- */

async function detectFaces(){
  if (detector === 'faceapi'){
    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 });
    const res = await faceapi.detectAllFaces(video, opts);
    return res.map(r => ({
      x: r.box.x, y: r.box.y, w: r.box.width, h: r.box.height
    }));
  }
  if (detector === 'native'){
    const res = await nativeDet.detect(video);
    return res.map(r => ({
      x: r.boundingBox.x, y: r.boundingBox.y,
      w: r.boundingBox.width, h: r.boundingBox.height
    }));
  }
  return [];
}

function evaluate(faces){
  const W = video.videoWidth, H = video.videoHeight;
  if (!W || !H) return { ok:false, reason:'Kamera görüntüsü yoxdur' };
  if (faces.length === 0) return { ok:false, reason:'Üz tapılmadı' };
  if (faces.length > 1)  return { ok:false, reason:'Kadrda birdən çox üz var' };

  const f = faces[0];
  if (f.w / W < 0.16) return { ok:false, reason:'Kameraya bir az yaxınlaşın' };
  if (f.w / W > 0.75) return { ok:false, reason:'Kameradan bir az uzaqlaşın' };

  const cx = (f.x + f.w / 2) / W;
  const cy = (f.y + f.h / 2) / H;
  if (Math.abs(cx - 0.5) > 0.16) return { ok:false, reason:'Üzü üfüqi olaraq mərkəzə gətirin' };
  if (Math.abs(cy - 0.48) > 0.18) return { ok:false, reason:'Üzü şaquli olaraq mərkəzə gətirin' };

  return { ok:true, reason:'Üz mərkəzdədir — şəkil çəkə bilərsiniz', box:f };
}

function drawBox(box, ok){
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (!box) return;
  ctx.lineWidth = Math.max(2, overlay.width * 0.004);
  ctx.strokeStyle = ok ? 'rgba(120,230,160,.95)' : 'rgba(240,160,140,.9)';
  ctx.strokeRect(box.x, box.y, box.w, box.h);
}

function startLoop(){
  stopLoop();
  const tick = async () => {
    if (capturedDataUrl) return;              // şəkil çəkilib, axtarış dayanır
    try {
      const faces = await detectFaces();
      const r = evaluate(faces);
      faceOk = r.ok;
      drawBox(faces[0] || null, r.ok);
      setStatus(r.ok ? 'ok' : 'no', r.reason);
      shootBtn.disabled = !r.ok;
    } catch (e) {
      faceOk = false;
      shootBtn.disabled = true;
      setStatus('no', 'Tanıma xətası');
    }
    loopId = setTimeout(tick, 220);
  };
  tick();
}

function stopLoop(){
  if (loopId) clearTimeout(loopId);
  loopId = null;
}

/* ---------- 4. şəkli çək ---------- */

shootBtn.addEventListener('click', async () => {
  shootBtn.disabled = true;

  // Çəkilişdən dərhal əvvəl son yoxlama — üz yoxdursa şəkil çəkilmir
  let r;
  try {
    r = evaluate(await detectFaces());
  } catch (e) {
    r = { ok:false, reason:'Tanıma xətası' };
  }

  if (!r.ok){
    setStatus('no', r.reason);
    setMsg('Şəkil çəkilmədi: ' + r.reason.toLowerCase() + '.', 'err');
    shootBtn.disabled = true;
    return;
  }

  const W = video.videoWidth, H = video.videoHeight;
  shot.width = W; shot.height = H;
  const ctx = shot.getContext('2d');
  ctx.drawImage(video, 0, 0, W, H);          // güzgüsüz, real görüntü
  capturedDataUrl = shot.toDataURL('image/jpeg', 0.92);

  stopLoop();
  drawBox(null);
  preview.src = capturedDataUrl;
  preview.hidden = false;
  video.hidden = true;
  guide.hidden = true;

  shootBtn.hidden = true;
  retakeBtn.hidden = false;
  cardStep.hidden = false;
  setStatus('ok', 'Şəkil hazırdır');
  setMsg('');
  refreshForm();
});

retakeBtn.addEventListener('click', () => {
  capturedDataUrl = null;
  preview.hidden = true;
  preview.removeAttribute('src');
  video.hidden = false;
  guide.hidden = false;
  retakeBtn.hidden = true;
  shootBtn.hidden = false;
  shootBtn.disabled = true;
  cardStep.hidden = true;
  kartFile.value = '';
  cardFileHint.textContent = 'Fayl: —';
  cardVerified = false;
  cardAd = '';
  cardAztu = false;
  setCardMsg('');
  applyLock();
  setMsg('');
  refreshForm();
  startLoop();
});

/* ---------- 5. tələbə bileti təsdiqi (şəkil + OCR) ---------- */

const cardStep     = document.getElementById('cardStep');
const kartFile     = document.getElementById('kartFile');
const cardFileHint = document.getElementById('cardFileHint');
const cardMsg      = document.getElementById('cardMsg');
const formFields   = document.getElementById('formFields');
const lockNote     = document.getElementById('lockNote');

let cardVerified = false;
let cardAd = '';
let cardAztu = false;

function setCardMsg(text, kind){
  cardMsg.textContent = text || '';
  if (kind) cardMsg.dataset.kind = kind; else cardMsg.removeAttribute('data-kind');
}

const AZ_LOWER = { 'İ': 'i', 'I': 'ı' };
function normalizeName(text){
  return String(text || '')
    .trim()
    .replace(/[İI]/g, ch => AZ_LOWER[ch])
    .toLocaleLowerCase('az')
    .replace(/[^\p{L}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ');
}

function nameMatchesOCR(text){
  const target = normalizeName(fields.ad.value + ' ' + fields.soyad.value);
  const ocr = normalizeName(text);
  if (!target || !ocr) return false;

  // OCR bəzən sözləri sətirlərə bölür və ya əlavə boşluqlar yaradır.
  if (ocr.includes(target)) return true;

  const targetParts = target.split(' ').filter(Boolean);
  if (targetParts.length < 2) return false;
  return targetParts.every(part => ocr.includes(part));
}

async function verifyCardImage(file){
  if (!file) return;
  if (!fields.ad.value.trim() || !fields.soyad.value.trim()){
    cardVerified = false;
    cardAd = '';
    cardAztu = false;
    setCardMsg('Əvvəlcə Addım 2-də Ad və Soyad xanalarını doldurun.', 'err');
    refreshForm();
    return;
  }

  if (!window.Tesseract){
    cardVerified = false;
    setCardMsg('Şəkil oxuma modulu yüklənmədi. İnternet bağlantısını yoxlayın və səhifəni yeniləyin.', 'err');
    refreshForm();
    return;
  }

  cardVerified = false;
  cardAd = '';
  cardAztu = false;
  kartFile.disabled = true;
  setCardMsg('Tələbə bileti yoxlanılır…');
  refreshForm();

  try {
    const result = await Tesseract.recognize(file, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number'){
          setCardMsg('Tələbə bileti oxunur… ' + Math.round(m.progress * 100) + '%');
        }
      }
    });

    const text = result.data.text || '';
    const hasName = nameMatchesOCR(text);
    const hasAzTU = /\baz\s*tu\b/i.test(text) || /\baztu\b/i.test(text);

    cardAztu = hasAzTU;
    cardAd = hasName ? (fields.ad.value.trim() + ' ' + fields.soyad.value.trim()) : '';

    if (!hasName){
      setCardMsg('Kartdakı ad-soyad Addım 2-də yazdığınız ad və soyadla uyğun gəlmir.', 'err');
    } else if (!hasAzTU){
      setCardMsg('Ad-soyad uyğun gəldi, amma kartda “AzTU” yazısı tapılmadı.', 'err');
    } else {
      cardVerified = true;
      setCardMsg('Tələbə bileti təsdiqləndi.', 'ok');
    }
  } catch (e) {
    console.error(e);
    setCardMsg('Tələbə bileti oxunmadı. Şəkli daha aydın şəkildə yenidən yükləyin.', 'err');
  } finally {
    kartFile.disabled = false;
    refreshForm();
  }
}

kartFile.addEventListener('change', () => {
  const file = kartFile.files && kartFile.files[0];
  cardFileHint.textContent = 'Fayl: ' + (file ? file.name : '—');
  verifyCardImage(file);
});

fields.ad.addEventListener('input', () => {
  cardVerified = false;
  cardAd = '';
  cardAztu = false;
  setCardMsg('');
  if (kartFile.value) verifyCardImage(kartFile.files[0]);
  refreshForm();
});
fields.soyad.addEventListener('input', () => {
  cardVerified = false;
  cardAd = '';
  cardAztu = false;
  setCardMsg('');
  if (kartFile.value) verifyCardImage(kartFile.files[0]);
  refreshForm();
});

function applyLock(){
  lockNote.textContent = cardVerified
    ? 'Tələbə bileti təsdiqləndi. Göndərmək mümkündür.'
    : 'Tələbə bileti şəkli təsdiqləndikdən sonra göndərmək mümkün olacaq.';
  lockNote.className = cardVerified ? 'verified' : 'locked';
  refreshForm();
}

/* ---------- 6. form ---------- */

const MAP = {'ə':'e','Ə':'E','ı':'i','İ':'I','ö':'o','Ö':'O','ü':'u','Ü':'U','ğ':'g','Ğ':'G','ş':'s','Ş':'S','ç':'c','Ç':'C'};

function slug(t){
  return String(t || '').trim()
    .replace(/[əƏıİöÖüÜğĞşŞçÇ]/g, ch => MAP[ch] || ch)
    .replace(/\s+/g,'-')
    .replace(/[^A-Za-z0-9\-_]/g,'')
    .replace(/-+/g,'-')
    .replace(/^-|-$/g,'');
}

function values(){
  const v = {};
  for (const k in fields) v[k] = fields[k].value.trim();
  return v;
}

function formFilled(){
  const v = values();
  return Object.keys(v).every(k => v[k] !== '');
}

function refreshForm(){
  const v = values();
  const name = [v.ad, v.soyad, v.ataAdi, v.ixtisas, v.qrup].map(slug).filter(Boolean).join('_');
  fileHint.textContent = 'Fayl adı: ' + (name ? name + '.jpeg' : '—');
  sendBtn.disabled = !(capturedDataUrl && cardVerified && formFilled());
}

Object.values(fields).forEach(el => {
  el.addEventListener('input', refreshForm);
  el.addEventListener('change', refreshForm);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!capturedDataUrl){ setMsg('Əvvəlcə şəkil çəkin.', 'err'); return; }
  if (!cardVerified){ setMsg('Əvvəlcə tələbə biletini təsdiqləyin.', 'err'); return; }
  if (!formFilled()){ setMsg('Bütün xanaları doldurun.', 'err'); return; }

  sendBtn.disabled = true;
  sendBtn.textContent = 'Göndərilir…';
  setMsg('');

  try {
    const res = await fetch('/api/qeydiyyat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values(),
        sekil: capturedDataUrl,
        kartAd: cardAd,
        kartAztu: cardAztu
      })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Göndərilmədi');

    setMsg('Göndərildi. Fayl: ' + data.fayl, 'ok');
    form.reset();
    cardVerified = false;
    cardAd = '';
    cardAztu = false;
    kartFile.value = '';
    cardFileHint.textContent = 'Fayl: —';
    setCardMsg('');
    cardStep.hidden = true;
    applyLock();
    retakeBtn.click();
    fileHint.textContent = 'Fayl adı: —';
  } catch (err) {
    setMsg(err.message, 'err');
  } finally {
    sendBtn.textContent = 'Göndər';
    refreshForm();
  }
});

/* ---------- qaydalar pop-upı ---------- */

const RULES = [
  {
    title: 'Üzünüz tam görünsün',
    text: 'Eynək və papağı çıxarın. Maska, şarf, saç və ya əlinizlə üzün heç bir hissəsi örtülməməlidir.'
  },
  {
    title: 'Arxa plan təmiz olsun',
    text: 'Düz və boş divarın qarşısında dayanın. Arxanızda əşya və ya başqa adam görünməsin.'
  },
  {
    title: 'İşıq üzünüzə düşsün',
    text: 'İşıq mənbəyi qarşınızda olsun. Pəncərəyə arxa çevirməyin — üz qaranlıq düşəcək. Kölgə və parlaq ləkələr olmasın.'
  },
  {
    title: 'Düz kameraya baxın',
    text: 'Üzünüzü çərçivənin mərkəzinə tutun, başınızı əyməyin, təbii ifadə saxlayın. Kadrda yalnız siz olun.'
  },
  {
    title: 'Tələbə biletiniz yanınızda olsun',
    text: 'Şəkildən sonra biletin ön üzünün şəklini çəkəcəksiniz, bilet tam kadra düşsün və üzərindəki yazılar oxunsun, Ad Soyad bölməsini tələbə kartı ilə eyni olacaq şəkildə doldurun. Bu şəkil saxlanılmır, yalnız yoxlanılır.'
  }
];

const rulesBack  = document.getElementById('rules');
const ruleNo     = document.getElementById('ruleNo');
const ruleTitle  = document.getElementById('ruleTitle');
const ruleText   = document.getElementById('ruleText');
const ruleNext   = document.getElementById('ruleNext');
const ruleBack   = document.getElementById('ruleBack');

let ruleIndex = 0;

function renderRule(){
  const r = RULES[ruleIndex];
  ruleNo.textContent   = ruleIndex + 1;
  document.getElementById('ruleTotal').textContent = RULES.length;
  ruleTitle.textContent = r.title;
  ruleText.textContent  = r.text;
  ruleBack.disabled = ruleIndex === 0;
  ruleNext.textContent = ruleIndex === RULES.length - 1 ? 'Başlayaq' : 'Növbəti';
}

ruleBack.addEventListener('click', () => {
  if (ruleIndex > 0){ ruleIndex--; renderRule(); }
});

ruleNext.addEventListener('click', async () => {
  if (ruleIndex < RULES.length - 1){
    ruleIndex++;
    renderRule();
    return;
  }
  rulesBack.hidden = true;
  await begin();
});

/* ---------- başlanğıc ---------- */

startBtn.addEventListener('click', startCamera);

async function begin(){
  {
    setStatus('wait', 'Üz tanıma modeli yüklənir…');
    veilText.textContent = 'Üz tanıma modeli yüklənir…';
    const ok = await loadDetector();
    if (!ok){
      veil.hidden = false;
      startBtn.hidden = true;
      veilText.textContent = 'Üz tanıma modeli yüklənmədi. İnternet bağlantısını yoxlayın və səhifəni yeniləyin.';
      setStatus('no', 'Model yüklənmədi — şəkil çəkmək mümkün deyil');
      return;
    }
  }
  setStatus('wait', 'Kamera gözlənilir');
  await startCamera();
  refreshForm();
}

(function init(){
  renderRule();
  applyLock();
  rulesBack.hidden = false;
  ruleNext.focus();
  setStatus('wait', 'Qaydaları oxuyun');
  veilText.textContent = 'Qaydaları oxuyandan sonra kamera açılacaq.';
  refreshForm();
  loadDetector();   // pop-up oxunarkən model arxa planda yüklənir
})();
