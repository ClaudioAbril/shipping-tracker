const MONTHS_ES = {
  '01': 'ene', '02': 'feb', '03': 'mar', '04': 'abr', '05': 'may', '06': 'jun',
  '07': 'jul', '08': 'ago', '09': 'sep', '10': 'oct', '11': 'nov', '12': 'dic'
};

/** Días típicos antes de la entrega estimada (por índice de etapa 0–6). */
const DAYS_BEFORE_DELIVERY = [null, null, 14, 10, 6, 3, 0];

function parseIsoDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatShortDate(date) {
  const mon = MONTHS_ES[String(date.getMonth() + 1).padStart(2, '0')] ||
    String(date.getMonth() + 1);
  return `${date.getDate()} ${mon}`;
}

function daysFromToday(target) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const t = new Date(target);
  t.setHours(12, 0, 0, 0);
  return Math.round((t - today) / 86400000);
}

function stageIndexFromEvent(evt) {
  const text = `${evt.status || ''} ${evt.description || ''}`.toLowerCase();
  if (/entregado|delivered/.test(text)) return 6;
  if (/última milla|ultima milla|last mile|reparto/.test(text)) return 5;
  if (/distribuci/.test(text)) return 4;
  if (/aduana|customs|despacho aduanero/.test(text)) return 3;
  if (/llegada|arrival|ingreso al pa[ií]s/.test(text)) return 2;
  if (/tr[aá]nsito|transit|aeropuerto|pa[ií]s destino/.test(text)) return 1;
  if (/almac[eé]n|warehouse|origen|procesado|despachado|recibido|tax id|orden/.test(text)) {
    return 0;
  }
  if (typeof evt.eventStep === 'number') {
    if (evt.eventStep <= 1) return 0;
    if (evt.eventStep === 2) return 1;
    return Math.min(6, evt.eventStep);
  }
  return 0;
}

/**
 * @param {Array<{date?: string, status?: string, description?: string, eventStep?: number}>} rawEvents
 * @param {number} activeStageIndex
 * @param {string|null} estimatedDelivery ISO date
 * @returns {string[]}
 */
function buildStageSubLabels(rawEvents, activeStageIndex, estimatedDelivery) {
  const sublabels = Array(7).fill('');
  const stageDates = Array(7).fill(null);

  for (const evt of rawEvents || []) {
    const idx = stageIndexFromEvent(evt);
    const d = parseIsoDate(evt.date);
    if (!d) continue;
    if (!stageDates[idx] || d > stageDates[idx]) {
      stageDates[idx] = d;
    }
  }

  const delivery = parseIsoDate(estimatedDelivery);
  const active = Math.max(0, Math.min(6, activeStageIndex));

  let lastKnown = null;
  for (let i = 0; i < 7; i++) {
    if (stageDates[i]) {
      lastKnown = stageDates[i];
    } else if (lastKnown && i <= active) {
      stageDates[i] = lastKnown;
    }
  }

  for (let i = 0; i < 7; i++) {
    if (stageDates[i] && i < active) {
      sublabels[i] = formatShortDate(stageDates[i]);
    } else if (stageDates[i] && i === active) {
      sublabels[i] = `${formatShortDate(stageDates[i])} · en curso`;
    } else if (i > active && delivery && DAYS_BEFORE_DELIVERY[i] != null) {
      const est = new Date(delivery);
      est.setDate(est.getDate() - DAYS_BEFORE_DELIVERY[i]);
      const days = daysFromToday(est);
      if (days <= 0) {
        sublabels[i] = formatShortDate(est);
      } else if (days === 1) {
        sublabels[i] = '~1 día';
      } else {
        sublabels[i] = `~${days} días`;
      }
    } else if (i > active && delivery && i === 6) {
      sublabels[i] = formatShortDate(delivery);
    } else if (i > active) {
      sublabels[i] = 'pendiente';
    } else if (i < active && !stageDates[i]) {
      sublabels[i] = '—';
    }
  }

  if (delivery) {
    sublabels[6] = formatShortDate(delivery);
    if (active === 6) {
      sublabels[6] += ' · en curso';
    }
  }

  return sublabels;
}

function formatEstimatedDelivery(estimatedDelivery) {
  const d = parseIsoDate(estimatedDelivery);
  return d ? formatShortDate(d) : null;
}

module.exports = {
  buildStageSubLabels,
  formatEstimatedDelivery,
  formatShortDate,
  parseIsoDate
};
