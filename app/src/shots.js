// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos; ?shot=cover shows the
// cover alone. `photo` picks the hero sample (samples/<photo>.jpg), the other sample fills the rest;
// `caption`, `sub`, `grade` and `size` set the rest. window.__shotReady is set once painted.
//
// Face-safe framing: each sample photo has its person's face in the upper part of the frame, so a
// vignette zoomed in with a centred crop cuts the face off at the nose. facePan() shifts each panel
// (same ox/oy semantics as cover.js: -1..1 inside the crop slack) so the face centre lands at the
// panel centre, clamped to the panel edge when the zoom leaves no slack.
import { layoutPanels } from './cover.js';

// Normalised face centres, measured from the sample photos:
// pier — man in a bucket hat, face upper-middle; boulevard — woman in sunglasses, face upper-middle.
const FACES = {
  pier: { fx: 0.37, fy: 0.20 },
  boulevard: { fx: 0.47, fy: 0.17 },
};

/** ox/oy that put `face` at the centre of `rect` for `img` at `zoom` (clamped to -1..1). */
function facePan(img, rect, zoom, face) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const mx = Math.max(0, (dw - rect.w) / 2);
  const my = Math.max(0, (dh - rect.h) / 2);
  const ox = mx ? Math.max(-1, Math.min(1, (dw * (0.5 - face.fx)) / mx)) : 0;
  const oy = my ? Math.max(-1, Math.min(1, (dh * (0.5 - face.fy)) / my)) : 0;
  return [ox, oy];
}

export async function runShot(shot, query, api) {
  const photo = query.get('photo') ?? 'pier';
  const other = photo === 'pier' ? 'boulevard' : 'pier';
  api.setSize(query.get('size') ?? '1080x1080');
  api.setGrade(query.get('grade') ?? 'sunset');
  api.setTitle(
    query.get('caption') ?? 'Sunset Heist',
    query.get('sub') ?? 'One last ride through the neon streets',
  );
  const hero = await api.loadImage(`samples/${photo}.jpg`);
  const alt = await api.loadImage(`samples/${other}.jpg`);
  const [cw, ch] = (query.get('size') ?? '1080x1080').split('x').map(Number);
  const rects = layoutPanels(cw, ch);
  const zooms = [1.0, 1.45, 1.6, 1.25];
  const imgs = [hero, alt, hero, alt];
  const faces = [FACES[photo], FACES[other], FACES[photo], FACES[other]];
  for (let i = 0; i < 4; i++) {
    const [ox, oy] = facePan(imgs[i], rects[i], zooms[i], faces[i]);
    api.setPanelImage(i, imgs[i], zooms[i], ox, oy);
  }
  if (shot === 'cover') document.body.classList.add('shot-cover');
  api.redraw();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__shotReady = true;
}
