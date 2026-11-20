// Draws the multi-panel poster cover: one hero panel plus three vignettes, a colour grade over every panel,
// and the title in big outlined poster lettering across a shaded foot band. System fonts only, no network.
//
// Panels (state.panels) are { img, zoom, ox, oy }: zoom 1..2.5, ox/oy -1..1 shift the photo inside its panel.
// state: { panels, title, subtitle, grade, titleScale }.

export const GRADES = {
  sunset: {
    label: 'Vice City Sunset',
    stops: ['rgba(255,122,26,0.30)', 'rgba(214,32,121,0.34)'],
    sat: 1.25,
  },
  neon: {
    label: 'Neon Night',
    stops: ['rgba(0,229,255,0.24)', 'rgba(255,0,128,0.30)'],
    sat: 1.35,
  },
  pastel: {
    label: 'Pastel Day',
    stops: ['rgba(255,183,213,0.22)', 'rgba(137,207,255,0.24)'],
    sat: 1.05,
  },
};

/** Panel rectangles for a cover of w x h: hero first, then three vignettes. */
export function layoutPanels(w, h) {
  const g = Math.max(6, Math.round(Math.min(w, h) * 0.014));
  if (w >= h) {
    // Landscape / square: hero left, three stacked vignettes right.
    const heroW = Math.round((w - 3 * g) * 0.62);
    const colX = g + heroW + g;
    const colW = w - g - colX;
    const ph = Math.round((h - 2 * g - 2 * g) / 3);
    return [
      { x: g, y: g, w: heroW, h: h - 2 * g },
      { x: colX, y: g, w: colW, h: ph },
      { x: colX, y: g + ph + g, w: colW, h: ph },
      { x: colX, y: g + 2 * (ph + g), w: colW, h: h - g - (g + 2 * (ph + g)) },
    ];
  }
  // Portrait: hero on top, three vignettes in a row below.
  const heroH = Math.round((h - 3 * g) * 0.62);
  const rowY = g + heroH + g;
  const rowH = h - g - rowY;
  const pw = Math.round((w - 2 * g - 2 * g) / 3);
  return [
    { x: g, y: g, w: w - 2 * g, h: heroH },
    { x: g, y: rowY, w: pw, h: rowH },
    { x: g + pw + g, y: rowY, w: pw, h: rowH },
    { x: g + 2 * (pw + g), y: rowY, w: w - g - (g + 2 * (pw + g)), h: rowH },
  ];
}

function drawPanel(ctx, rect, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#241a33';
  ctx.fillRect(x, y, w, h);
  const img = panel && panel.img;
  if (img && img.naturalWidth > 0) {
    const zoom = panel.zoom || 1;
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * base;
    const dh = img.naturalHeight * base;
    const mx = Math.max(0, (dw - w) / 2);
    const my = Math.max(0, (dh - h) / 2);
    const dx = x + (w - dw) / 2 + (panel.ox || 0) * mx;
    const dy = y + (h - dh) / 2 + (panel.oy || 0) * my;
    try { ctx.filter = `saturate(${grade.sat})`; } catch { /* older canvas: no filter */ }
    ctx.drawImage(img, dx, dy, dw, dh);
    try { ctx.filter = 'none'; } catch { /* ignore */ }
  }
  // Colour grade: diagonal wash + vignette so every panel shares one look.
  const wash = ctx.createLinearGradient(x, y, x + w, y + h);
  wash.addColorStop(0, grade.stops[0]);
  wash.addColorStop(1, grade.stops[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  const vig = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.35,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** Draws the whole cover onto the canvas's 2D context, at the canvas's own size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  // Warm white poster board; the gutters between panels stay white.
  ctx.fillStyle = '#f7f2ea';
  ctx.fillRect(0, 0, w, h);
  const rects = layoutPanels(w, h);
  for (let i = 0; i < 4; i++) drawPanel(ctx, rects[i], state.panels[i], grade);

  // Shaded foot band for the lettering.
  const bandH = Math.round(h * 0.22);
  const band = ctx.createLinearGradient(0, h - bandH, 0, h);
  band.addColorStop(0, 'rgba(12,4,28,0)');
  band.addColorStop(0.45, 'rgba(12,4,28,0.55)');
  band.addColorStop(1, 'rgba(12,4,28,0.82)');
  ctx.fillStyle = band;
  ctx.fillRect(0, h - bandH, w, bandH);

  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  if (title) {
    let size = h * 0.105 * (state.titleScale || 1);
    const setFont = () => { ctx.font = `900 ${size}px "Arial Black", Impact, "Helvetica Neue", sans-serif`; };
    setFont();
    try { ctx.letterSpacing = `${Math.max(1, size * 0.02)}px`; } catch { /* ignore */ }
    while (ctx.measureText(title).width > w * 0.92 && size > 14) {
      size -= 2;
      setFont();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const ty = h - h * 0.055 - (subtitle ? h * 0.028 : 0);
    // Thick dark outline, white-to-warm gradient fill, soft drop shadow.
    const fill = ctx.createLinearGradient(0, ty - size, 0, ty);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(1, '#ffe3a3');
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160a2e';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(title, w / 2, ty);
    ctx.fillStyle = fill;
    ctx.fillText(title, w / 2, ty);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }
  if (subtitle) {
    const ss = Math.max(13, h * 0.026);
    ctx.font = `600 ${ss}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(1, ss * 0.08)}px`; } catch { /* ignore */ }
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = ss * 0.3;
    ctx.fillText(subtitle.toUpperCase(), w / 2, h - h * 0.032);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }
}
