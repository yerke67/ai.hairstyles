const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/agDbXArr5/';
const $ = id => document.getElementById(id);
let model, webcam, mode = 'photo', imageReady = false, cameraReady = false;
const status = message => $('status').textContent = message;

async function loadModel() {
  try {
    model = await tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');
    status('Модель готова! Выберите фотографию или включите камеру.');
    updateAnalyze();
  } catch (error) {
    console.error(error);
    status('Не удалось загрузить модель. Проверьте интернет и доступность ссылки.');
  }
}
function updateAnalyze() { $('analyze').disabled = !model || !(mode === 'photo' ? imageReady : cameraReady); }
function clearResults() { $('results').hidden = true; }
function setMode(next) {
  if (mode === 'camera' && next !== 'camera') stopCamera();
  mode = next;
  $('photoTab').classList.toggle('active', mode === 'photo');
  $('cameraTab').classList.toggle('active', mode === 'camera');
  $('uploadLabel').hidden = mode !== 'photo';
  $('startCamera').hidden = mode !== 'camera' || cameraReady;
  $('stopCamera').hidden = mode !== 'camera' || !cameraReady;
  $('photo').hidden = mode !== 'photo' || !imageReady;
  $('cameraBox').hidden = mode !== 'camera' || !cameraReady;
  $('placeholder').hidden = (mode === 'photo' && imageReady) || (mode === 'camera' && cameraReady);
  $('placeholder').querySelector('h2').textContent = mode === 'photo' ? 'Добавьте фотографию' : 'Включите камеру';
  $('placeholder').querySelector('p').textContent = mode === 'photo' ? 'JPG, PNG или WEBP' : 'Разрешите доступ к камере';
  clearResults(); updateAnalyze();
}
$('fileInput').addEventListener('change', event => {
  const file = event.target.files?.[0]; if (!file) return;
  if (!file.type.startsWith('image/')) { status('Выберите файл изображения.'); return; }
  const url = URL.createObjectURL(file);
  $('photo').onload = () => { URL.revokeObjectURL(url); imageReady = true; setMode('photo'); status('Фото готово к анализу.'); };
  $('photo').onerror = () => { URL.revokeObjectURL(url); status('Не удалось открыть изображение.'); };
  $('photo').src = url;
});
$('photoTab').onclick = () => setMode('photo');
$('cameraTab').onclick = () => setMode('camera');
$('startCamera').onclick = async () => {
  try {
    if (!model) { status('Подождите загрузки модели.'); return; }
    webcam = new tmImage.Webcam(420, 320, true);
    await webcam.setup(); await webcam.play();
    $('cameraBox').replaceChildren(webcam.canvas);
    cameraReady = true; setMode('camera'); status('Камера работает. Нажмите «Определить причёску».');
    const loop = () => { if (!cameraReady || !webcam) return; webcam.update(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  } catch (error) { console.error(error); status('Не удалось включить камеру. Разрешите доступ и используйте HTTPS или localhost.'); }
};
function stopCamera() {
  cameraReady = false;
  if (webcam) { webcam.stop(); webcam = null; }
  $('cameraBox').replaceChildren();
  $('stopCamera').hidden = true;
  updateAnalyze();
}
$('stopCamera').onclick = () => { stopCamera(); setMode('camera'); status('Камера выключена.'); };
$('analyze').onclick = async () => {
  if (!model) return;
  try {
    status('Анализируем причёску...');
    const source = mode === 'photo' ? $('photo') : webcam.canvas;
    const predictions = await model.predict(source);
    predictions.sort((a,b) => b.probability - a.probability);
    const best = predictions[0];
    $('winner').textContent = best.className;
    $('confidence').textContent = `Уверенность модели: ${(best.probability * 100).toFixed(1)}%`;
    $('probabilities').replaceChildren();
    for (const item of predictions) {
      const row = document.createElement('div'); row.className = 'prob';
      const head = document.createElement('div'); head.className = 'prob-head';
      const name = document.createElement('span'); name.textContent = item.className;
      const percent = document.createElement('span'); percent.textContent = `${(item.probability * 100).toFixed(1)}%`;
      head.append(name, percent);
      const track = document.createElement('div'); track.className = 'track';
      const fill = document.createElement('div'); fill.className = 'fill'; fill.style.width = `${item.probability * 100}%`;
      track.append(fill); row.append(head, track); $('probabilities').append(row);
    }
    $('results').hidden = false;
    status('Анализ завершён.');
    $('results').scrollIntoView({behavior:'smooth',block:'nearest'});
  } catch (error) { console.error(error); status('Ошибка анализа. Попробуйте другое изображение.'); }
};
window.addEventListener('pagehide', stopCamera);
loadModel();
