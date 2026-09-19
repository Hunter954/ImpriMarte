const num = (value, fallback = 0) => {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
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
  const a = option(itemW, itemH);
  const b = option(itemH, itemW);
  if (!a) return b;
  if (!b) return a;
  if (a.length !== b.length) return a.length < b.length ? a : b;
  return a.across >= b.across ? a : b;
}

function circleLayout(printWidth, diameter, qty, gap = 0) {
  if (diameter <= 0 || printWidth < diameter) return null;
  const d = diameter + gap;
  const normal = Math.max(1, Math.floor((printWidth + gap) / d));
  const shifted = Math.max(0, Math.floor((printWidth - d / 2 + gap) / d));
  const pitchY = Math.sqrt(3) / 2 * d;
  let remaining = qty;
  let rows = 0;
  while (remaining > 0) {
    const inRow = rows % 2 === 0 ? normal : Math.max(1, shifted);
    remaining -= inRow;
    rows += 1;
  }
  const length = diameter + Math.max(0, rows - 1) * pitchY;
  return { across: normal, shiftedAcross: shifted, rows, length, itemW: diameter, itemH: diameter };
}

function triangleLayout(printWidth, base, height, qty, gap = 0) {
  if (base <= 0 || height <= 0 || printWidth < Math.min(base, height)) return null;
  const option = (b, h) => {
    if (printWidth < b) return null;
    // Alterna em pé/invertido. Depois do primeiro triângulo, cada novo ocupa aprox. meia base.
    const pitchX = b / 2 + gap;
    const across = Math.max(1, 1 + Math.floor((printWidth - b) / pitchX));
    const rows = ceilSafe(qty / across);
    const length = rows * h + Math.max(0, rows - 1) * gap;
    return { across, rows, length, itemW: b, itemH: h, rotated: b !== base || h !== height };
  };
  const a = option(base, height);
  const b = option(height, base);
  if (!a) return b;
  if (!b) return a;
  return a.length <= b.length ? a : b;
}

function buildLayout({ shape, width, height, maxPrintWidth, spacing, quantity }) {
  const printWidth = Math.max(0.01, num(maxPrintWidth, 48));
  const w = Math.max(0.01, num(width));
  const h = Math.max(0.01, num(height, w));
  const gap = Math.max(0, num(spacing));
  const qty = Math.max(1, Math.ceil(num(quantity, 1)));
  if (shape === 'circle') return circleLayout(printWidth, w, qty, gap);
  if (shape === 'triangle') return triangleLayout(printWidth, w, h, qty, gap);
  return rectLayout(printWidth, w, h, qty, gap);
}

function calculateCapacity({ shape, width, height, sheetWidth, sheetHeight, maxPrintWidth, spacing }) {
  // Mantido para histórico e exibição de capacidade aproximada por A3.
  const W = Math.min(num(sheetWidth, 29.7), num(maxPrintWidth, 48));
  const H = num(sheetHeight, 42);
  const w = Math.max(0.01, num(width));
  const h = Math.max(0.01, num(height, w));
  const gap = Math.max(0, num(spacing));
  const countRect = (iw, ih) => Math.max(0, Math.floor((W + gap) / (iw + gap)) * Math.floor((H + gap) / (ih + gap)));
  if (shape === 'circle') {
    const d = w + gap;
    const pitchY = Math.sqrt(3) / 2 * d;
    const rows = H >= w ? 1 + Math.floor((H - w) / pitchY) : 0;
    let total = 0;
    for (let r = 0; r < rows; r += 1) {
      const off = r % 2 ? d / 2 : 0;
      if (W - off >= w) total += 1 + Math.floor((W - off - w) / d);
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

function isFiveByFive(input) {
  const w = num(input.width);
  const h = num(input.height, w);
  const shape = input.shape || 'rectangle';
  return ['rectangle', 'square'].includes(shape) && Math.abs(w - 5) < 0.001 && Math.abs(h - 5) < 0.001;
}

function priceFiveByFive(quantity, withCut, config) {
  const unitSheet = withCut ? num(config.cutSheetPrice, 40) : num(config.noCutSheetPrice, 36);
  const threeTier = withCut ? num(config.cutThreeSheetPrice, 140) : num(config.noCutThreeSheetPrice, 120);
  if (quantity <= 40) return { total: unitSheet, rule: `Tabela 5×5: até 40 unidades = R$ ${unitSheet.toFixed(2)}` };
  if (quantity <= 80) return { total: unitSheet * 2, rule: `Tabela 5×5: 41–80 unidades = R$ ${(unitSheet * 2).toFixed(2)}` };
  const blocksAfterThree = Math.max(0, Math.ceil((quantity - 120) / 40));
  return {
    total: threeTier + blocksAfterThree * unitSheet,
    rule: `Tabela 5×5: 81–120 unidades = R$ ${threeTier.toFixed(2)}${blocksAfterThree ? ` + ${blocksAfterThree} lote(s) extra(s)` : ''}`
  };
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
    noCutThreeSheetPrice: num(config.noCutThreeSheetPrice, 120),
    cutLinearMeterPrice: num(config.cutLinearMeterPrice, 120),
    noCutLinearMeterPrice: num(config.noCutLinearMeterPrice, 108),
    minimumCutPrice: num(config.minimumCutPrice, 40),
    minimumNoCutPrice: num(config.minimumNoCutPrice, 36)
  };

  const layout = buildLayout({
    shape: input.shape || 'rectangle', width: input.width, height: input.height,
    maxPrintWidth: cfg.maxPrintWidth, spacing: cfg.spacing, quantity
  });
  if (!layout) throw new Error('A medida informada é maior que a largura útil da impressora.');

  const capacity = calculateCapacity({
    shape: input.shape || 'rectangle', width: input.width, height: input.height,
    sheetWidth: cfg.sheetWidth, sheetHeight: cfg.sheetHeight,
    maxPrintWidth: cfg.maxPrintWidth, spacing: cfg.spacing
  });
  const specialFive = isFiveByFive(input);
  const sheets = specialFive ? Math.max(1, Math.ceil(quantity / 40)) : Math.max(1, Math.ceil(layout.length / cfg.sheetHeight));

  let total;
  let pricingRule;
  if (specialFive) {
    const special = priceFiveByFive(quantity, withCut, cfg);
    total = special.total;
    pricingRule = special.rule;
  } else {
    const meterPrice = withCut ? cfg.cutLinearMeterPrice : cfg.noCutLinearMeterPrice;
    const minimum = withCut ? cfg.minimumCutPrice : cfg.minimumNoCutPrice;
    const raw = (layout.length / 100) * meterPrice;
    total = Math.max(minimum, raw);
    // Valores comerciais arredondados para centavos; não arredonda comprimento para blocos inteiros.
    total = Math.round((total + Number.EPSILON) * 100) / 100;
    pricingRule = `Cálculo por comprimento: ${layout.length.toFixed(1)} cm × R$ ${meterPrice.toFixed(2)}/m${raw < minimum ? ` (mínimo R$ ${minimum.toFixed(2)})` : ''}`;
  }

  const unitPrice = total / quantity;
  const method = input.shape === 'circle' ? 'Encaixe intercalado (hexagonal)'
    : input.shape === 'triangle' ? 'Triângulos alternados (em pé / invertido)'
      : input.shape === 'custom' ? 'Caixa delimitadora conservadora'
        : 'Grade otimizada na largura de 48 cm';

  return {
    quantity, withCut, capacity, sheets, total, unitPrice,
    producedCapacity: capacity * sheets,
    wasteUnits: Math.max(0, capacity * sheets - quantity),
    method, config: cfg,
    across: layout.across,
    rows: layout.rows,
    usedLengthCm: layout.length,
    pricingRule
  };
}

module.exports = { calculateQuote, calculateCapacity, buildLayout };
