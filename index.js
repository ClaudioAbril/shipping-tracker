require('dotenv').config();
const nodemailer = require('nodemailer');

// Configuración de los números de envío proporcionados por Claudio
const TRACKING_NUMBERS = ['260519RXYMB7XA', '260519RXYMB7XB'];
const EMAIL_RECIPIENT = process.env.EMAIL_TO || 'galluccio@gmail.com';

// Códigos de estado legibles de 17TRACK
const STATUS_MAP = {
  0: { label: 'No encontrado', color: '#6B7280', bg: '#F3F4F6' },
  10: { label: 'En tránsito', color: '#D97706', bg: '#FEF3C7' },
  20: { label: 'En recogida', color: '#2563EB', bg: '#DBEAFE' },
  30: { label: 'No entregado (Intento fallido)', color: '#DC2626', bg: '#FEE2E2' },
  35: { label: 'En aduana', color: '#7C3AED', bg: '#F3E8FF' },
  40: { label: 'Entregado', color: '#059669', bg: '#D1FAE5' },
  50: { label: 'Devuelto al remitente', color: '#E11D48', bg: '#FFE4E6' }
};

// Función para mapear el código numérico de estado a un objeto con etiqueta y colores
function getStatusDetails(status) {
  return STATUS_MAP[status] || { label: 'Desconocido', color: '#4B5563', bg: '#F3F4F6' };
}

async function run() {
  const token = process.env.TRACK_17_TOKEN;
  if (!token) {
    console.error('Error: La variable de entorno TRACK_17_TOKEN no está configurada.');
    process.exit(1);
  }

  console.log(`Iniciando rastreo de los envíos: ${TRACKING_NUMBERS.join(', ')}`);

  try {
    // 1. Registrar los tracking numbers en la API (requerido por 17TRACK antes de consultar)
    const registerUrl = 'https://api.17track.net/track/v2.4/register';
    const registerBody = TRACKING_NUMBERS.map(num => ({ number: num }));
    
    console.log('Registrando envíos en la API de 17TRACK...');
    const registerResponse = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        '17token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registerBody)
    });

    if (!registerResponse.ok) {
      const errorText = await registerResponse.text();
      throw new Error(`Error en el registro de la API: ${registerResponse.status} - ${errorText}`);
    }

    const registerResult = await registerResponse.json();
    console.log('Registro finalizado. Respuesta:', JSON.stringify(registerResult));

    // 2. Obtener la información del tracking
    const trackInfoUrl = 'https://api.17track.net/track/v2.4/gettrackinfo';
    console.log('Consultando información de seguimiento...');
    const trackResponse = await fetch(trackInfoUrl, {
      method: 'POST',
      headers: {
        '17token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registerBody)
    });

    if (!trackResponse.ok) {
      const errorText = await trackResponse.text();
      throw new Error(`Error en la consulta de la API: ${trackResponse.status} - ${errorText}`);
    }

    const trackResult = await trackResponse.json();
    if (trackResult.code !== 0) {
      throw new Error(`La API de 17TRACK retornó un código de error: ${trackResult.code}. Detalles: ${JSON.stringify(trackResult.data)}`);
    }

    const packages = trackResult.data.accepted || [];
    const rejected = trackResult.data.rejected || [];

    if (rejected.length > 0) {
      console.warn('Algunos números de envío fueron rechazados por la API:', JSON.stringify(rejected));
    }

    // 3. Generar el reporte HTML y texto
    console.log('Generando reporte...');
    const htmlContent = generateHtmlReport(packages, rejected);
    const textContent = generateTextReport(packages, rejected);

    // 4. Enviar el correo electrónico
    console.log('Enviando correo electrónico a:', EMAIL_RECIPIENT);
    await sendEmail(htmlContent, textContent);
    
    console.log('Proceso completado exitosamente.');
  } catch (error) {
    console.error('Ocurrió un error crítico durante la ejecución:', error);
    process.exit(1);
  }
}

function generateHtmlReport(packages, rejected) {
  let packageCardsHtml = '';

  packages.forEach(pkg => {
    const trackingNumber = pkg.number;
    const trackInfo = pkg.track || {};
    const statusDetails = getStatusDetails(trackInfo.status);
    const origin = trackInfo.origin_country || 'N/A';
    const dest = trackInfo.destination_country || 'N/A';
    
    // Obtener los eventos
    const provider = trackInfo.providers ? trackInfo.providers[0] : null;
    const events = provider ? provider.events : [];
    
    let eventsHtml = '';
    if (events && events.length > 0) {
      eventsHtml = '<div style="margin-top: 15px; border-top: 1px solid #E5E7EB; padding-top: 15px;">' +
        '<h4 style="margin: 0 0 10px 0; color: #374151; font-size: 14px;">Historial de eventos:</h4>' +
        '<div style="display: flex; flex-direction: column; gap: 12px;">';
      
      events.slice(0, 5).forEach((evt, idx) => {
        const isFirst = idx === 0;
        const fontColor = isFirst ? '#111827' : '#6B7280';
        const fontWeight = isFirst ? 'bold' : 'normal';
        const bulletColor = isFirst ? '#2563EB' : '#9CA3AF';
        
        eventsHtml += `
          <div style="display: flex; gap: 10px; font-size: 13px; color: ${fontColor}; font-weight: ${fontWeight};">
            <span style="color: ${bulletColor}; font-size: 16px; line-height: 1;">${isFirst ? '●' : '○'}</span>
            <div style="flex: 1;">
              <div style="margin-bottom: 2px;">${evt.description}</div>
              <div style="font-size: 11px; color: #9CA3AF;">${evt.time} ${evt.location ? `| ${evt.location}` : ''}</div>
            </div>
          </div>`;
      });
      eventsHtml += '</div></div>';
    } else {
      eventsHtml = '<p style="color: #6B7280; font-size: 13px; font-style: italic; margin-top: 15px; border-top: 1px solid #E5E7EB; padding-top: 15px;">No hay eventos registrados aún.</p>';
    }

    packageCardsHtml += `
      <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02); border: 1px solid #E5E7EB; padding: 24px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
          <div>
            <span style="font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Código de Envío</span>
            <h3 style="margin: 2px 0 0 0; color: #1F2937; font-size: 18px; font-family: monospace; letter-spacing: 0.5px;">${trackingNumber}</h3>
          </div>
          <span style="background-color: ${statusDetails.bg}; color: ${statusDetails.color}; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;">
            ${statusDetails.label}
          </span>
        </div>
        <div style="display: flex; gap: 20px; font-size: 13px; color: #4B5563; margin-bottom: 10px;">
          <div><strong>Origen:</strong> ${origin}</div>
          <div><strong>Destino:</strong> ${dest}</div>
        </div>
        ${eventsHtml}
      </div>
    `;
  });

  let rejectedHtml = '';
  if (rejected.length > 0) {
    rejectedHtml = `
      <div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 12px; padding: 15px; margin-bottom: 20px; color: #991B1B;">
        <h4 style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">Envíos no procesados:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
          ${rejected.map(r => `<li><strong>${r.number}</strong>: Error ${r.error.code} - ${r.error.message}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Estética premium con gradientes, fuentes elegantes e interfaz responsiva
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Estado de Seguimiento de Envíos</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #F8FAFC;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
      </style>
    </head>
    <body>
      <div style="max-width: 600px; margin: 0 auto; background-color: #F8FAFC; padding: 20px 10px;">
        <!-- Cabecera Premium con gradiente -->
        <div style="background: linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%); border-radius: 16px 16px 0 0; padding: 30px; text-align: center; color: #ffffff; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 500; color: #93C5FD; display: block; margin-bottom: 8px;">Servicio de Rastreo Automático</span>
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Estado de tus Envíos</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #93C5FD; opacity: 0.85;">Actualización diaria de 17TRACK</p>
        </div>
        
        <!-- Contenido principal -->
        <div style="padding: 20px 0;">
          ${rejectedHtml}
          ${packageCardsHtml}
        </div>
        
        <!-- Pie de página -->
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #E2E8F0; margin-top: 20px;">
          <p style="margin: 0; font-size: 12px; color: #94A3B8;">Este es un reporte automático configurado en GitHub Actions para <strong>Claudio</strong>.</p>
          <p style="margin: 5px 0 0 0; font-size: 11px; color: #CBD5E1;">Ejecutado diariamente a las 9:00 AM (UTC-3).</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateTextReport(packages, rejected) {
  let report = `REPORTE DIARIO DE SEGUIMIENTO DE ENVÍOS\n`;
  report += `==========================================\n\n`;

  packages.forEach(pkg => {
    const trackingNumber = pkg.number;
    const trackInfo = pkg.track || {};
    const statusDetails = getStatusDetails(trackInfo.status);
    const origin = trackInfo.origin_country || 'N/A';
    const dest = trackInfo.destination_country || 'N/A';

    report += `Código: ${trackingNumber}\n`;
    report += `Estado: ${statusDetails.label.toUpperCase()}\n`;
    report += `Ruta: ${origin} -> ${dest}\n`;

    const provider = trackInfo.providers ? trackInfo.providers[0] : null;
    const events = provider ? provider.events : [];
    if (events && events.length > 0) {
      report += `Último Evento: ${events[0].description} (${events[0].time} | ${events[0].location || 'Sin Ubicación'})\n`;
    } else {
      report += `Último Evento: Sin eventos registrados.\n`;
    }
    report += `------------------------------------------\n\n`;
  });

  if (rejected.length > 0) {
    report += `Envíos Rechazados por la API:\n`;
    rejected.forEach(r => {
      report += `- ${r.number}: Error ${r.error.code} - ${r.error.message}\n`;
    });
  }

  return report;
}

async function sendEmail(htmlContent, textContent) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('Aviso: Faltan variables de configuración SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS). El correo no se enviará, pero la información fue obtenida con éxito.');
    console.log('\n--- CONTENIDO DEL REPORTE (TEXTO) ---');
    console.log(textContent);
    console.log('-------------------------------------\n');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465 || process.env.SMTP_SECURE === 'true',
    auth: {
      user: user,
      pass: pass
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Rastreo de Envíos" <${user}>`,
    to: EMAIL_RECIPIENT,
    subject: `📦 Reporte de Envíos - ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
    text: textContent,
    html: htmlContent
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Mensaje de correo enviado correctamente. ID:', info.messageId);
}

run();
