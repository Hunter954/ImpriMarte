const num = (value, fallback = 0) => {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};

function packRect(sheetW, sheetH, itemW, itemH, gap = 0) {
  const count = (W, H, w, h) => {
    if (w <= 0 || h <= 0 || W < w || H < h) return 0;
    const cols = Math.floor((W + gap) / (w + gap));
    const rows = Math.floor((H + gap) / (h + gap));
    return Math.max(0, cols * rows);
  };
  return Math.max(count(sheetW, sheetH, itemW, itemH), count(sheetW, sheetH, itemH, itemW));
}

function packCircle(sheetW, sheetH, diameter, gap = 0) {
  if (diameter <= 0) return 0;
  const d = diameter + gap;
  const oneOrientation = (W, H) => {
    if (W < diameter || H < diameter) return 0;
    const pitchY = Math.sqrt(3) / 2 * d;
    let rows = 1;
    if (H > diameter) rows += Math.floor((H - diameter) / pitchY);
    let total = 0;
    for (let r = 0; r < rows; r += 1) {
      const offset = r % 2 ? d / 2 : 0;
      const usable = W - offset;
      if (usable < diameter) continue;
      total += 1 + Math.floor((usable - diameter) / d);
    }
    return total;
  };
  return Math.max(oneOrientation(sheetW, sheetH), oneOrientation(sheetH, sheetW));
}

function packTriangle(sheetW, sheetH, base, height, gap = 0) {
  if (base <= 0 || height <= 0) return 0;
  // Triângulos isósceles alternados (em pé / invertido). Dois triângulos compartilham
  // praticamente a mesma caixa de um retângulo base x altura; o passo horizontal é base/2.
  const oneOrientation = (W, H, b, h) => {
    if (W < b || H < h) return 0;
    const horizontalPitch = b / 2 + gap;
    const rowPitch = h + gap;
    const rows = 1 + Math.floor((H - h) / rowPitch);
    const perRow = 1 + Math.floor((W - b) / horizontalPitch);
    return Math.max(0, rows * perRow);
  };
  return Math.max(oneOrientation(sheetW, sheetH, base, height), oneOrientation(sheetW, sheetH, height, base));
}

function calculateCapacity({ shape, width, height, sheetWidth, sheetHeight, maxPrintWidth, spacing }) {
  const effectiveW = Math.min(sheetWidth, maxPrintWidth || sheetWidth);
  const effectiveH = sheetHeight;
  const w = Math.max(0.01, num(width));
  const h = Math.max(0.01, num(height, w));
  const gap = Math.max(0, num(spacing));

  switch (shape) {
    case 'circle':
      return Math.max(1, packCircle(effectiveW, effectiveH, w, gap));
    case 'triangle':
      return Math.max(1, packTriangle(effectiveW, effectiveH, w, h, gap));
    case 'square':
    case 'rectangle':
      return Math.max(1, packRect(effectiveW, effectiveH, w, h, gap));
    case 'custom':
    default:
      // Conservador: formato irregular ocupa sua caixa delimitadora.
      return Math.max(1, packRect(effectiveW, effectiveH, w, h, gap));
  }
}

function priceForSheets(sheets, withCut, config) {
  const unit = withCut ? num(config.cutSheetPrice, 40) : num(config.noCutSheetPrice, 36);
  const thirdTier = withCut ? num(config.cutThreeSheetPrice, 140) : num(config.noCutThreeSheetPrice, 120);
  if (sheets <= 0) return 0;
  if (sheets <= 2) return sheets * unit;
  return thirdTier + Math.max(0, sheets - 3) * unit;
}

function calculateQuote(input, config) {
  const quantity = Math.max(1, Math.ceil(num(input.quantity, 1)));
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
  const capacity = calculateCapacity({
    shape: input.shape || 'rectangle', width: input.width, height: input.height,
    sheetWidth: cfg.sheetWidth, sheetHeight: cfg.sheetHeight,
    maxPrintWidth: cfg.maxPrintWidth, spacing: cfg.spacing
  });
  const sheets = Math.max(1, Math.ceil(quantity / capacity));
  const total = priceForSheets(sheets, withCut, cfg);
  const unitPrice = total / quantity;
  const producedCapacity = sheets * capacity;
  const wasteUnits = Math.max(0, producedCapacity - quantity);
  const method = input.shape === 'circle' ? 'Encaixe intercalado (hexagonal)'
    : input.shape === 'triangle' ? 'Triângulos alternados (em pé / invertido)'
      : input.shape === 'custom' ? 'Caixa delimitadora conservadora'
        : 'Grade otimizada com rotação';
  return { quantity, withCut, capacity, sheets, total, unitPrice, producedCapacity, wasteUnits, method, config: cfg };
}

module.exports = { calculateQuote, calculateCapacity, priceForSheets };
