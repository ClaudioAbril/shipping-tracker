const MAILAMERICAS_CARRIER = 13134;

const STATUS_MAP = {
  0: 'No encontrado',
  10: 'En tránsito',
  20: 'En recogida',
  30: 'No entregado',
  35: 'En aduana',
  40: 'Entregado',
  50: 'Devuelto al remitente'
};

const ETAPAS = ['Almacén', 'En Tránsito', 'Llegada', 'Aduana', 'Distribución', 'Última Milla', 'Entregado'];

const STAGE_KEYWORDS = [
  [/almac[eé]n|warehouse|received|recibido|origen/i],
  [/tr[aá]nsito|transit|aeropuerto|airport|departed|salida/i],
  [/llegada|arrival|arrived|ingreso/i],
  [/aduana|customs|clearance|despacho/i],
  [/distribuci[oó]n|distribution|centro de clasificaci[oó]n/i],
  [/última milla|last mile|out for delivery|reparto|entrega en curso/i],
  [/entregado|delivered|delivery successful/i]
];

function getStatusLabel(status) {
  return STATUS_MAP[status] || 'Desconocido';
}

function stageIndexFromText(text) {
  if (!text) return -1;
  for (let i = STAGE_KEYWORDS.length - 1; i >= 0; i--) {
    if (STAGE_KEYWORDS[i].some((re) => re.test(text))) return i;
  }
  return -1;
}

function stageIndexFromStatus(status) {
  const map = { 10: 1, 20: 5, 30: 5, 35: 3, 40: 6, 50: 0 };
  return map[status] ?? 0;
}

function computeActiveStageIndex(status, events) {
  let maxIdx = stageIndexFromStatus(status);
  for (const evt of events) {
    const idx = stageIndexFromText(`${evt.description || ''} ${evt.location || ''}`);
    if (idx > maxIdx) maxIdx = idx;
  }
  return maxIdx;
}

function normalizePackage(pkg) {
  const trackInfo = pkg.track || {};
  const provider = trackInfo.providers ? trackInfo.providers[0] : null;
  const rawEvents = provider && provider.events ? provider.events : [];
  const events = rawEvents.map((evt) => ({
    time: evt.time || '',
    description: evt.description || '',
    location: evt.location || ''
  }));

  const activeStageIndex = computeActiveStageIndex(trackInfo.status, events);

  return {
    number: pkg.number,
    statusLabel: getStatusLabel(trackInfo.status),
    activeStageIndex,
    etapas: ETAPAS,
    events,
    trackingUrl: `https://mailamericas.com/tracking?number_id=${encodeURIComponent(pkg.number)}`
  };
}

async function fetch17Track(token, numbers) {
  const body = numbers.map((number) => ({ number, carrier: MAILAMERICAS_CARRIER }));
  const headers = {
    '17token': token,
    'Content-Type': 'application/json'
  };

  await fetch('https://api.17track.net/track/v2.4/register', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const trackResponse = await fetch('https://api.17track.net/track/v2.4/gettrackinfo', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!trackResponse.ok) {
    const errorText = await trackResponse.text();
    throw new Error(`17TRACK HTTP ${trackResponse.status}: ${errorText}`);
  }

  const trackResult = await trackResponse.json();
  if (trackResult.code !== 0) {
    throw new Error(`17TRACK código ${trackResult.code}: ${JSON.stringify(trackResult.data)}`);
  }

  return trackResult.data;
}

async function trackPackages(numbers, token = process.env.TRACK_17_TOKEN) {
  if (!token) {
    throw new Error('TRACK_17_TOKEN no configurado');
  }

  const unique = [...new Set(numbers.map((n) => String(n).trim().toUpperCase()).filter(Boolean))];
  if (unique.length === 0) {
    return { packages: [], rejected: [] };
  }

  const data = await fetch17Track(token, unique);
  const accepted = (data.accepted || []).map(normalizePackage);
  const rejected = (data.rejected || []).map((r) => ({
    number: r.number,
    message: r.error ? `${r.error.code}: ${r.error.message}` : 'Rechazado'
  }));

  const found = new Set(accepted.map((p) => p.number));
  for (const num of unique) {
    if (!found.has(num) && !rejected.some((r) => r.number === num)) {
      rejected.push({ number: num, message: 'Sin datos de seguimiento' });
    }
  }

  return { packages: accepted, rejected };
}

module.exports = {
  ETAPAS,
  trackPackages,
  normalizePackage
};
