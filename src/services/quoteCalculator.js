const num = (value, fallback = 0) => {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const normalized = raw.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ceilSafe = value => Math.max(1, Math.ceil(value - 1e-9));

function rectLayout(printWidth, itemW, itemH, qty, gap = 0) {
  const option = (w, h) => {
    if (w <= 0 || h <= 0 || printWidth < w) return null;
    const across = Math.max(1, Math.floor((printWidth + gap) / (w + gap)));
    const rows = ceilSafe(qty / across);
    const length = rows * h + Math.max(0, rows - 1) * gap;
    return { across, rows, length, itemW: w, itemH: h, rotated: w !== itemW || h !== itemH };
  };
  const normal = option(itemW, itemH);
  const rotated = option(itemH, itemW);
  if (!normal) return rotated;
  if (!rotated) return normal;
  if (normal.length !== rotated.length) return normal.length < rotated.length ? normal : rotated;
  return normal.across >= rotated.across ? normal : rotated;
}

function circleLayout(printWidth, diameter, qty, gap = 0) {
  if (diameter <= 0 || printWidth < diameter) return null;
  const step = diameter + gap;
  const normal = Math.max(1, Math.floor((printWidth + gap) / step));
  const shifted = Math.max(1, Math.floor((printWidth - step / 2 + gap) / step));
  const pitchY = Math.sqrt(3) / 2 * step;
  let remaining = qty;
  let rows = 0;
  while (remaining > 0) {
    remaining -= rows % 2 === 0 ? normal : shifted;
    rows += 1;
  }
  const length = diameter + Math.max(0, rows - 1) * pitchY;
  return { across: normal, shiftedAcross: shifted, rows, length, itemW: diameter, itemH: diameter };
}

function triangleLayout(printWidth, base, height, qty, gap = 0) {
  const option = (b, h) => {
    if (b <= 0 || h <= 0 || printWidth < b) return null;
    const pitchX = b / 2 + gap;
    const across = Math.max(1, 1 + Math.floor((printWidth - b) / pitchX));
    const rows = ceilSafe(qty / across);
    const length = rows * h + Math.max(0, rows - 1) * gap;
    return { across, rows, length, itemW: b, itemH: h, rotated: b !== base || h !== height };
  };
  const normal = option(base, height);
  const rotated = option(height, base);
  if (!normal) return rotated;
  if (!rotated) return normal;
  return normal.length <= rotated.length ? normal : rotated;
}

function customLayout(printWidth, itemW, itemH, qty, gap = 0) {
  const layout = rectLayout(printWidth, itemW, itemH, qty, gap);
  if (!layout) return null;
  return { ...layout, conservative: true };
}

function buildLayout({ shape, width, height, maxPrintWidth, spacing, quantity }) {
  const printWidth = Math.max(0.01, num(maxPrintWidth, 48));
  const w = Math.max(0.01, num(width));
  const h = Math.max(0.01, num(height, w));
  const gap = Math.max(0, num(spacing));
  const qty = Math.max(1, Math.ceil(num(quantity, 1)));

  if (shape === 'circle') return circleLayout(printWidth, w, qty, gap);
  if (shape === 'triangle') return triangleLayout(printWidth, w, h, qty, gap);
  if (shape === 'custom') return customLayout(printWidth, w, h, qty, gap);
  return rectLayout(printWidth, w, h, qty, gap);
}

function calibratedSquareCapacity(width, height, shape) {
  const w = num(width);
  const h = num(height, w);
  if (!['rectangle', 'square'].includes(shape) || Math.abs(w - h) > 0.001) return null;
  const rounded = Math.round(w * 10) / 10;
  const known = {
    2: 247,
    3: 117,
    4: 63,
    5: 35,
    6: 24,
    7: 15,
    8: 12,
    9: 12,
    10: 6
  };
  return Object.prototype.hasOwnProperty.call(known, rounded) ? known[rounded] : null;
}

function calculateA3Capacity({ shape, width, height, sheetWidth, sheetHeight, spacing }) {
  const calibrated = calibratedSquareCapacity(width, height, shape);
  if (calibrated) return calibrated;

  const W = Math.max(0.01, num(sheetWidth, 29.7));
  const H = Math.max(0.01, num(sheetHeight, 42));
  const w = Math.max(0.01, num(width));
  const h = Math.max(0.01, num(height, w));
  const gap = Math.max(0, num(spacing));

  const countRect = (iw, ih) => {
    const across = Math.max(0, Math.floor((W + gap) / (iw + gap)));
    const rows = Math.max(0, Math.floor((H + gap) / (ih + gap)));
    return across * rows;
  };

  if (shape === 'circle') {
    const d = w + gap;
    const pitchY = Math.sqrt(3) / 2 * d;
    const rows = H >= w ? 1 + Math.floor((H - w) / pitchY) : 0;
    let total = 0;
    for (let r = 0; r < rows; r += 1) {
      const offset = r % 2 ? d / 2 : 0;
      if (W - offset >= w) total += 1 + Math.floor((W - offset - w) / d);
    }
    return Math.max(1, total);
  }

  if (shape === 'triangle') {
    const one = (b, th) => {
      if (W < b || H < th) return 0;
      const across = 1 + Math.floor((W - b) / (b / 2 + gap));
      const rows = 1 + Math.floor((H - th) / (th + gap));
      return across * rows;
    };
    return Math.max(1, one(w, h), one(h, w));
  }

  return Math.max(1, countRect(w, h), countRect(h, w));
}

function priceBySheets(sheetCount, withCut, cfg) {
  const unit = withCut ? cfg.cutSheetPrice : cfg.noCutSheetPrice;
  const three = withCut ? cfg.cutThreeSheetPrice : cfg.noCutThreeSheetPrice;
  if (sheetCount <= 1) return unit;
  if (sheetCount === 2) return unit * 2;
  if (sheetCount === 3) return three;
  return three + (sheetCount - 3) * unit;
}

function calculateQuote(input, config) {
  const quantity = Math.max(1, Math.ceil(num(input.quantity, 1)));
  const shape = input.shape || 'rectangle';
  const withCut = input.withCut === true || ['1', 'true', 'on', 'yes'].includes(String(input.withCut || '').toLowerCase());
  const cfg = {
    sheetWidth: num(config.sheetWidth, 29.7),
    sheetHeight: num(config.sheetHeight, 42),
    maxPrintWidth: num(config.maxPrintWidth, 48),
    spacing: num(config.spacing, 0),
    cutSheetPrice: num(config.cutSheetPrice, 40),
    noCutSheetPrice: num(config.noCutSheetPrice, 36),
    cutThreeSheetPrice: num(config.cutThreeSheetPrice, 140),
    noCutThreeSheetPrice: num(config.noCutThreeSheetPrice, 120)
  };

  const layout = buildLayout({
    shape,
    width: input.width,
    height: input.height,
    maxPrintWidth: cfg.maxPrintWidth,
    spacing: cfg.spacing,
    quantity
  });

  if (!layout) {
    throw new Error('A medida informada é maior que a largura útil disponível para impressão.');
  }

  const capacityA3 = calculateA3Capacity({
    shape,
    width: input.width,
    height: input.height,
    sheetWidth: cfg.sheetWidth,
    sheetHeight: cfg.sheetHeight,
    spacing: cfg.spacing
  });

  const sheets = Math.max(1, Math.ceil(quantity / capacityA3));
  const total = priceBySheets(sheets, withCut, cfg);
  const unitPrice = total / quantity;

  const method = shape === 'circle'
    ? 'Encaixe intercalado (hexagonal)'
    : shape === 'triangle'
      ? 'Triângulos alternados (em pé / invertido)'
      : shape === 'custom'
        ? 'Caixa delimitadora conservadora'
        : (calibratedSquareCapacity(input.width, input.height, shape) ? 'Capacidade A3 calibrada pela produção real' : (layout.rotated ? 'Grade otimizada com rotação automática' : 'Grade otimizada'));

  const sheetPrice = withCut ? cfg.cutSheetPrice : cfg.noCutSheetPrice;
  const threePrice = withCut ? cfg.cutThreeSheetPrice : cfg.noCutThreeSheetPrice;
  const pricingRule = sheets === 3
    ? `${capacityA3} por A3 · ${sheets} A3 necessárias · pacote de 3 A3 = ${threePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
    : `${capacityA3} por A3 · ${sheets} A3 necessária${sheets > 1 ? 's' : ''} · ${sheetPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por A3${sheets > 3 ? `, com pacote-base de 3 A3` : ''}.`;

  return {
    quantity,
    shape,
    withCut,
    total,
    unitPrice,
    across: layout.across,
    rows: layout.rows,
    usedLengthCm: layout.length,
    producedCapacity: capacityA3 * sheets,
    wasteUnits: Math.max(0, capacityA3 * sheets - quantity),
    equivalentA3: sheets,
    capacityA3,
    method,
    pricingRule,
    layout,
    config: cfg
  };
}

module.exports = { calculateQuote, buildLayout, calculateA3Capacity, calibratedSquareCapacity };
