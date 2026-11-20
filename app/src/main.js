// Wires the cover maker: photos into four panels, caption and grade, one-click PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, GRADES, layoutPanels } from './cover.js';
import { runShot } from './shots.js';

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const statusEl = document.getElementById('status');
const zoomInput = document.getElementById('zoom');
const zoomVal = document.getElementById('zoomVal');
const sizeSelect = document.getElementById('size');
const titleSizeInput = document.getElementById('titleSize');

const state = {
  size: '1080x1080',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'One last ride through the neon streets',
  titleScale: 1,
  selected: 0,
  panels: [
    { img: null, zoom: 1.0, ox: 0, oy: 0 },
    { img: null, zoom: 1.35, ox: -0.08, oy: 0.05 },
    { img: null, zoom: 1.5, ox: 0.1, oy: -0.06 },
    { img: null, zoom: 1.2, ox: 0, oy: 0.08 },
  ],
};

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  drawCover(canvas, state);
}

function applySize() {
  const [w, h] = SIZES[state.size];
  canvas.width = w;
  canvas.height = h;
  redraw();
}

function refreshPanelUI() {
  document.querySelectorAll('.panel-pick').forEach((b, i) => {
    b.classList.toggle('active', i === state.selected);
    b.classList.toggle('filled', !!state.panels[i].img);
  });
  const p = state.panels[state.selected];
  zoomInput.value = p.zoom;
  zoomVal.textContent = `${p.zoom.toFixed(2)}x`;
}

function selectPanel(i) {
  state.selected = i;
  refreshPanelUI();
  redraw();
}

async function loadSamples() {
  const pier = await loadImage('samples/pier.jpg');
  const boulevard = await loadImage('samples/boulevard.jpg');
  state.panels[0].img = pier;
  state.panels[1].img = boulevard;
  state.panels[2].img = pier;
  state.panels[3].img = boulevard;
  refreshPanelUI();
  redraw();
}

/** The API the shot scenes use: everything a screenshot needs, nothing else. */
export const shotApi = {
  loadImage,
  setSize(size) {
    if (SIZES[size]) {
      state.size = size;
      sizeSelect.value = size;
      applySize();
    }
  },
  setGrade(grade) {
    if (GRADES[grade]) {
      state.grade = grade;
      document.querySelectorAll('.grade').forEach((b) => b.classList.toggle('active', b.dataset.grade === grade));
    }
  },
  setTitle(title, subtitle) {
    state.title = title;
    state.subtitle = subtitle || '';
    titleInput.value = title;
    subtitleInput.value = state.subtitle;
  },
  setPanelImage(i, img, zoom, ox, oy) {
    state.panels[i] = { img, zoom: zoom ?? 1, ox: ox ?? 0, oy: oy ?? 0 };
  },
  redraw,
};

// --- Photo input: file picker (up to 4) and drag-drop onto the canvas. ---
async function assignFiles(files) {
  const imgs = [];
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    try { imgs.push(await loadImage(URL.createObjectURL(f))); } catch { /* skip unreadable */ }
  }
  if (!imgs.length) return;
  let at = state.selected;
  for (const img of imgs.slice(0, 4)) {
    state.panels[at] = { img, zoom: 1.15, ox: 0, oy: 0 };
    at = (at + 1) % 4;
  }
  refreshPanelUI();
  redraw();
  statusEl.textContent = `${imgs.length} photo${imgs.length > 1 ? 's' : ''} loaded. Drag a panel to move its photo.`;
}

document.getElementById('photos').addEventListener('change', (e) => {
  assignFiles([...e.target.files]);
  e.target.value = '';
});
canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  assignFiles([...e.dataTransfer.files]);
});

// --- Drag a panel to pan its photo; click to select it. ---
let drag = null;
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = (clientX - r.left) * (canvas.width / r.width);
  const y = (clientY - r.top) * (canvas.height / r.height);
  const rects = layoutPanels(canvas.width, canvas.height);
  const i = rects.findIndex((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
  return i === -1 ? null : { i, x, y, rect: rects[i] };
}
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit) return;
  canvas.setPointerCapture(e.pointerId);
  selectPanel(hit.i);
  drag = { x: hit.x, y: hit.y, moved: false };
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const hit = panelAt(e.clientX, e.clientY);
  if (!hit) return;
  const p = state.panels[state.selected];
  const rect = hit.rect;
  const dx = (hit.x - drag.x) / Math.max(1, rect.w);
  const dy = (hit.y - drag.y) / Math.max(1, rect.h);
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  p.ox = Math.max(-1, Math.min(1, p.ox + dx * 2));
  p.oy = Math.max(-1, Math.min(1, p.oy + dy * 2));
  drag.x = hit.x;
  drag.y = hit.y;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// --- Controls. ---
document.querySelectorAll('.panel-pick').forEach((b) => {
  b.addEventListener('click', () => selectPanel(Number(b.dataset.panel)));
});
zoomInput.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomInput.value);
  zoomVal.textContent = `${state.panels[state.selected].zoom.toFixed(2)}x`;
  redraw();
});
document.getElementById('samePhoto').addEventListener('click', () => {
  const src = state.panels[state.selected].img;
  if (!src) { statusEl.textContent = 'Load a photo first.'; return; }
  const crops = [
    { zoom: 1.0, ox: 0, oy: 0 },
    { zoom: 1.45, ox: -0.12, oy: 0.06 },
    { zoom: 1.6, ox: 0.12, oy: -0.08 },
    { zoom: 1.25, ox: 0, oy: 0.1 },
  ];
  state.panels = crops.map((c) => ({ img: src, ...c }));
  refreshPanelUI();
  redraw();
  statusEl.textContent = 'One photo, four different crops.';
});
document.getElementById('loadSamples').addEventListener('click', async () => {
  await loadSamples();
  statusEl.textContent = 'Sample photos loaded.';
});
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
titleSizeInput.addEventListener('input', () => {
  state.titleScale = Number(titleSizeInput.value);
  redraw();
});
document.querySelectorAll('.grade').forEach((b) => {
  b.addEventListener('click', () => {
    state.grade = b.dataset.grade;
    document.querySelectorAll('.grade').forEach((x) => x.classList.toggle('active', x === b));
    redraw();
  });
});
sizeSelect.addEventListener('change', () => {
  state.size = sizeSelect.value;
  applySize();
});

// --- Export: render the chosen size offscreen, download the PNG. ---
document.getElementById('export').addEventListener('click', () => {
  const [w, h] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  off.toBlob((blob) => {
    if (!blob) { statusEl.textContent = 'Export failed.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved cover-${w}x${h}.png`;
  }, 'image/png');
});

// --- Boot. ---
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), shotApi);
} else {
  applySize();
  refreshPanelUI();
  loadSamples();
}
