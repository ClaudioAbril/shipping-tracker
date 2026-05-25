const TRACKING_API = 'https://mailamericas.com/api/tracking';

const ETAPAS = ['Almacén', 'En Tránsito', 'Llegada', 'Aduana', 'Distribución', 'Última Milla', 'Entregado'];

const MONTHS_ES = {
  '01': 'ene', '02': 'feb', '03': 'mar', '04': 'abr', '05': 'may', '06': 'jun',
  '07': 'jul', '08': 'ago', '09': 'sep', '10': 'oct', '11': 'nov', '12': 'dic'
};

function formatEventTime(date, time) {
  if (!date) return time || '';
  const parts = date.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const mon = MONTHS_ES[parts[1]] || parts[1];
    const label = `${day} ${mon}`;
    return time ? `${label}, ${time}` : label;
  }
  return time ? `${date} ${time}` : date;
}

function normalizeFromApi(payload, fallbackNumber) {
  const d = payload && payload.data ? payload.data : null;
  if (!d) {
    throw new Error('Respuesta vacía de MailAmericas');
  }

  const number = (d.trackingNumber || fallbackNumber || '').toUpperCase();
  const events = (d.events || []).map((evt) => ({
    time: formatEventTime(evt.date, evt.time),
    description: evt.description || evt.status || 'Evento',
    location: [evt.status, evt.location].filter(Boolean).join(' — ')
  }));

  const step = typeof d.statusStep === 'number' ? d.statusStep : 1;
  const activeStageIndex = Math.min(ETAPAS.length - 1, Math.max(0, step - 1));

  return {
    number,
    statusLabel: d.statusStepName || d.status || 'Desconocido',
    activeStageIndex,
    etapas: ETAPAS,
    events,
    trackingUrl: `https://mailamericas.com/tracking?number_id=${encodeURIComponent(number)}`
  };
}

async function fetchOneTracking(number) {
  const trackingNumber = String(number).trim().toUpperCase();
  const response = await fetch(TRACKING_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; shipping-tracker-envios/1.0)',
      'Accept-Language': 'es-AR,es;q=0.9',
      Origin: 'https://mailamericas.com',
      Referer: `https://mailamericas.com/tracking?number_id=${encodeURIComponent(trackingNumber)}`
    },
    body: JSON.stringify({ trackingNumber, language: 'es' })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MailAmericas HTTP ${response.status}: ${text.slice(0, 120)}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.message || 'MailAmericas rechazó la consulta');
  }

  return normalizeFromApi(payload, trackingNumber);
}

async function trackPackages(numbers) {
  const unique = [...new Set(numbers.map((n) => String(n).trim().toUpperCase()).filter(Boolean))];
  if (unique.length === 0) {
    return { packages: [], rejected: [] };
  }

  const packages = [];
  const rejected = [];

  for (const number of unique) {
    try {
      packages.push(await fetchOneTracking(number));
    } catch (error) {
      rejected.push({ number, message: error.message });
    }
  }

  return { packages, rejected };
}

module.exports = {
  ETAPAS,
  trackPackages,
  normalizeFromApi,
  fetchOneTracking
};
