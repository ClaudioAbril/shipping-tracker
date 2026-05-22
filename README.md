# 📦 Rastreador de Envíos Autónomo en la Nube

Este proyecto está diseñado para ejecutarse de forma **100% autónoma y gratuita** en la nube utilizando **GitHub Actions**. Realiza la consulta del estado de tus envíos en 17TRACK y envía un reporte por correo electrónico a `galluccio@gmail.com` todos los días a las **9:00 AM** (huso horario UTC-3).

---

## 🚀 Pasos para la puesta en marcha

Sigue estas sencillas instrucciones para desplegar el servicio en tu propia cuenta de GitHub:

### Paso 1: Obtener tu Token Gratuito de 17TRACK
1. Regístrate gratis en la consola de desarrollador de 17TRACK: [https://api.17track.net/](https://api.17track.net/)
2. Una vez registrado, ve a **Settings > Security > Access Key** (Configuración > Seguridad > Clave de acceso).
3. Copia la clave de acceso (`Access Key`), que utilizaremos como tu `TRACK_17_TOKEN`.
   *(Nota: La cuenta gratuita te otorga 100 consultas de registro mensuales de por vida, lo cual es más que suficiente para realizar el rastreo diario de tus envíos).*

### Paso 2: Crear el repositorio en GitHub
1. Entra a tu cuenta de [GitHub](https://github.com/).
2. Crea un **nuevo repositorio privado** (por privacidad de tus códigos de seguimiento y credenciales). Nómbralo como prefieras, por ejemplo: `shipping-tracker`.
3. Sube los archivos de este directorio (`index.js`, `package.json`, `.github/` y este `README.md`) a tu repositorio recién creado.

   *Si deseas subirlo mediante la terminal local:*
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
   git push -u origin main
   ```

### Paso 3: Configurar las Credenciales en GitHub (Secretos)
Para enviar correos electrónicos de forma segura, el flujo de trabajo necesita tus credenciales de SMTP. Las guardaremos en los secretos del repositorio en GitHub:

1. En tu repositorio de GitHub, ve a la pestaña **Settings** (Configuración).
2. En la barra lateral izquierda, selecciona **Secrets and variables > Actions** (Secretos y variables > Acciones).
3. Haz clic en **New repository secret** (Nuevo secreto del repositorio) y añade los siguientes secretos uno a uno:

| Nombre del Secreto | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `TRACK_17_TOKEN` | Tu clave de acceso de la API de 17TRACK | `a1b2c3d4e5...` |
| `SMTP_HOST` | El host de tu servidor SMTP | `smtp.gmail.com` (para Gmail) |
| `SMTP_PORT` | El puerto de tu servidor SMTP | `587` o `465` |
| `SMTP_SECURE` | Define si requiere conexión segura SSL/TLS | `false` para puerto 587, `true` para puerto 465 |
| `SMTP_USER` | Tu usuario de correo de envío | `tu-cuenta@gmail.com` |
| `SMTP_PASS` | Tu contraseña de correo o contraseña de aplicación | `xxxx xxxx xxxx xxxx` *(Para Gmail, usa una "Contraseña de aplicación")* |
| `EMAIL_TO` | Destinatario del correo (opcional, si no se pone irá a `galluccio@gmail.com`) | `galluccio@gmail.com` |
| `EMAIL_FROM` | Remitente visible en el correo (opcional) | `"Rastreador de Envíos" <tu-cuenta@gmail.com>` |

---

## 🛠️ Cómo Probar el Servicio de Inmediato

No necesitas esperar hasta las 9:00 AM del día siguiente para verificar que todo funcione. Puedes realizar un disparo de prueba manual:

1. Ve a la pestaña **Actions** (Acciones) en tu repositorio de GitHub.
2. En la barra lateral izquierda, haz clic en **Shipping Tracker Daily Report**.
3. Haz clic en el botón desplegable **Run workflow** (Ejecutar flujo de trabajo) y luego en el botón verde **Run workflow**.
4. ¡El servicio se ejecutará inmediatamente, consultará a 17TRACK y te enviará el correo electrónico! Podrás seguir los logs en tiempo real haciendo clic en la ejecución iniciada.

---

## 💡 Notas Adicionales
* **Modificación de envíos**: Si en el futuro deseas rastrear nuevos códigos o cambiar los existentes, simplemente edita la variable `TRACKING_NUMBERS` en la línea 5 del archivo `index.js` y sube los cambios a tu repositorio.
* **Precisión horaria**: Las tareas de tipo cron en GitHub Actions son gratuitas, por lo que a veces pueden iniciarse con una demora de entre 10 y 20 minutos respecto a la hora programada (9:00 AM), pero su ejecución diaria está garantizada de forma autónoma.
