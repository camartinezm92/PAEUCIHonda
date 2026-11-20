# PAE Clínico - UCI Honda

Aplicación web para la gestión integral del Proceso de Atención de Enfermería (PAE) con taxonomía NANDA / NOC / NIC, catálogo CIE-10 de diagnósticos médicos con búsqueda activa y selección múltiple, comparativa clínica Antes vs. Después, persistencia en Firebase Firestore, sincronización con Google Sheets y generación automática de PDFs en Google Drive.

## Características principales

- **Autenticación y roles (RBAC):** Acceso con Google vía Firebase Authentication y control de permisos (`admin`, `nurse`, `viewer`).
- **Inicio y cierre de PAE (Antes vs. Después):** Registro separado de fecha/hora, evaluador y observaciones iniciales y finales, además de cálculo automático del cambio en puntuación NOC.
- **Diagnóstico Médico CIE-10:** Selector múltiple con búsqueda activa por código o descripción sobre el catálogo clínico.
- **Respaldo en la nube:** Sincronización automática con Google Sheets y almacenamiento de PDFs de PAEs finalizados (`CERRADA`) en carpetas por paciente dentro de Google Drive.

## Ejecución local

**Prerrequisitos:** Node.js

1. Instalar dependencias:
   `npm install`
2. Configurar las variables de entorno en `.env` tomando como base `.env.example` (`GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_DRIVE_FOLDER_ID`).
3. Iniciar la aplicación:
   `npm run dev`
