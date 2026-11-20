import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';

dotenv.config();

const DEFAULT_DRIVE_FOLDER_ID = '1i-WABTnnDnLSlNd9Jy1YgSTlhUll7hlO';

function getServiceAccountAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    const missing = [];
    if (!email) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    if (!key) missing.push("GOOGLE_PRIVATE_KEY");
    throw new Error(`Google configuration missing: ${missing.join(", ")}`);
  }

  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.substring(1, key.length - 1);
  }
  key = key.replace(/\\n/g, '\n');

  if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error("La llave privada de Google no tiene el formato correcto (PEM).");
  }

  return new JWT({
    email,
    key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ],
  });
}

function getColombiaDateTimeNow() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date()).replace(' ', 'T');
}

function formatColombiaPartsFromRecordDate(dateStr?: string): { datePart: string; timePart: string; readable: string } {
  if (dateStr) {
    const localIsoMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (localIsoMatch) {
      const datePart = localIsoMatch[1];
      const hour = localIsoMatch[2];
      const min = localIsoMatch[3];
      return {
        datePart,
        timePart: `${hour}-${min}`,
        readable: `${datePart} ${hour}:${min}`
      };
    }
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const formatted = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(parsed);
      const [datePart, hm] = formatted.split(' ');
      return {
        datePart,
        timePart: hm.replace(':', '-'),
        readable: `${datePart} ${hm}`
      };
    }
  }
  const now = getColombiaDateTimeNow();
  return {
    datePart: now.slice(0, 10),
    timePart: now.slice(11, 16).replace(':', '-'),
    readable: now.slice(0, 16).replace('T', ' ')
  };
}

function sanitizeDriveName(value: string): string {
  return (value || '')
    .replace(/[\/\\:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizePdfText(value: unknown): string {
  if (value === null || value === undefined) return '';
  // Helvetica supports WinAnsi (Latin-1); strip unsupported emoji/high-plane chars safely
  return String(value).replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

async function generatePAEPdfBuffer(record: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 42,
        bufferPages: true,
        info: {
          Title: `PAE - ${sanitizePdfText(record.patient?.name)}`,
          Author: sanitizePdfText(record.evaluator || 'Sistema PAE Clínico')
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const { readable: startReadable } = formatColombiaPartsFromRecordDate(record.date);
      const closedReadable = record.closedDate
        ? formatColombiaPartsFromRecordDate(record.closedDate).readable
        : null;

      const ensureSpace = (neededHeight: number) => {
        if (doc.y + neededHeight > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
        }
      };

      // Top Header Banner
      const headerTop = doc.y;
      doc.roundedRect(doc.page.margins.left, headerTop, pageWidth, 66, 6).fill('#1d4ed8');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16)
        .text('Proceso de Atención de Enfermería (PAE)', doc.page.margins.left + 14, headerTop + 11, {
          width: pageWidth - 130
        });
      doc.font('Helvetica').fontSize(8.5).fillColor('#dbeafe')
        .text(
          `Inicio (Antes): ${startReadable} (Col)  |  ID: ${sanitizePdfText(record.id)}`,
          doc.page.margins.left + 14,
          headerTop + 34,
          { width: pageWidth - 130 }
        );
      doc.font('Helvetica').fontSize(8.5).fillColor('#dbeafe')
        .text(
          closedReadable
            ? `Cierre (Después): ${closedReadable} (Col)`
            : `Cierre (Después): ${record.status === 'CERRADA' ? 'Registro histórico' : 'Pendiente'}`,
          doc.page.margins.left + 14,
          headerTop + 47,
          { width: pageWidth - 130 }
        );

      // Status pill in header
      const statusText = sanitizePdfText(record.status || 'CERRADA');
      doc.roundedRect(doc.page.margins.left + pageWidth - 102, headerTop + 21, 88, 24, 12)
        .fill(statusText === 'CERRADA' ? '#059669' : '#d97706');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
        .text(statusText, doc.page.margins.left + pageWidth - 102, headerTop + 29, {
          width: 88,
          align: 'center'
        });

      doc.y = headerTop + 80;

      // Patient Information Box
      const boxTop = doc.y;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b')
        .text('Datos del Paciente', doc.page.margins.left, boxTop);
      doc.moveDown(0.3);

      const infoStartY = doc.y;
      doc.roundedRect(doc.page.margins.left, infoStartY, pageWidth, 68, 5)
        .fillAndStroke('#f8fafc', '#cbd5e1');

      const colW = (pageWidth - 24) / 2;
      const leftX = doc.page.margins.left + 12;
      const rightX = leftX + colW;

      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8)
        .text('PACIENTE', leftX, infoStartY + 8)
        .text('IDENTIFICACIÓN', rightX, infoStartY + 8);
      doc.fillColor('#0f172a').font('Helvetica').fontSize(10)
        .text(sanitizePdfText(record.patient?.name), leftX, infoStartY + 18, { width: colW - 8 })
        .text(sanitizePdfText(record.patient?.id), rightX, infoStartY + 18, { width: colW - 8 });

      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8)
        .text('EDAD / SEXO', leftX, infoStartY + 36)
        .text('SERVICIO', rightX, infoStartY + 36);
      doc.fillColor('#0f172a').font('Helvetica').fontSize(10)
        .text(`${sanitizePdfText(record.patient?.age || 'N/E')} / ${sanitizePdfText(record.patient?.sex || 'N/E')}`, leftX, infoStartY + 46, { width: colW - 8 })
        .text(sanitizePdfText(record.patient?.service), rightX, infoStartY + 46, { width: colW - 8 });

      doc.y = infoStartY + 74;
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8)
        .text('DIAGNÓSTICO MÉDICO', doc.page.margins.left);
      doc.fillColor('#0f172a').font('Helvetica').fontSize(10)
        .text(sanitizePdfText(record.patient?.medicalDiagnosis), { width: pageWidth });
      doc.moveDown(0.8);

      // Needs Section
      ensureSpace(45);
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(11)
        .text('Necesidades Identificadas');
      doc.moveTo(doc.page.margins.left, doc.y + 2).lineTo(doc.page.margins.left + pageWidth, doc.y + 2).stroke('#e2e8f0');
      doc.moveDown(0.4);
      const needsList = Array.isArray(record.needs) ? [...record.needs] : [];
      if (record.otherNeed) needsList.push(`Otra: ${record.otherNeed}`);
      doc.fillColor('#334155').font('Helvetica').fontSize(9.5)
        .text(needsList.length > 0 ? sanitizePdfText(needsList.join('  •  ')) : 'No registradas', { width: pageWidth });
      doc.moveDown(0.9);

      // NANDAs Section
      ensureSpace(50);
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(11)
        .text('Diagnósticos y Plan de Cuidados (NANDA / NOC / NIC)');
      doc.moveTo(doc.page.margins.left, doc.y + 2).lineTo(doc.page.margins.left + pageWidth, doc.y + 2).stroke('#e2e8f0');
      doc.moveDown(0.5);

      const sortedNandas = [...(record.nandas || [])].sort(
        (a: any, b: any) => parseInt(a.code?.match(/\d+/)?.[0] || '0', 10) - parseInt(b.code?.match(/\d+/)?.[0] || '0', 10)
      );

      for (const nanda of sortedNandas) {
        ensureSpace(70);
        const nandaHeaderY = doc.y;
        doc.rect(doc.page.margins.left, nandaHeaderY, pageWidth, 22).fill('#e2e8f0');
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10)
          .text(`NANDA [${sanitizePdfText(nanda.code)}] - ${sanitizePdfText(nanda.name)}`, doc.page.margins.left + 8, nandaHeaderY + 6, {
            width: pageWidth - 16
          });
        doc.y = nandaHeaderY + 28;

        const chars = [...(nanda.selectedCharacteristics || [])].sort();
        const factors = [...(nanda.selectedFactors || [])].sort();

        if (chars.length > 0) {
          ensureSpace(25);
          doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9)
            .text('Características Definitorias (m/p):', doc.page.margins.left + 6);
          doc.font('Helvetica').fontSize(8.5).fillColor('#475569');
          for (const c of chars) {
            ensureSpace(14);
            doc.text(`• ${sanitizePdfText(c)}`, doc.page.margins.left + 14, doc.y, { width: pageWidth - 20 });
          }
          doc.moveDown(0.3);
        }

        if (factors.length > 0) {
          ensureSpace(25);
          doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9)
            .text('Factores Relacionados (r/c):', doc.page.margins.left + 6);
          doc.font('Helvetica').fontSize(8.5).fillColor('#475569');
          for (const f of factors) {
            ensureSpace(14);
            doc.text(`• ${sanitizePdfText(f)}`, doc.page.margins.left + 14, doc.y, { width: pageWidth - 20 });
          }
          doc.moveDown(0.3);
        }

        const sortedNocs = [...(nanda.selectedNOCs || [])].sort(
          (a: any, b: any) => parseInt(a.code?.match(/\d+/)?.[0] || '0', 10) - parseInt(b.code?.match(/\d+/)?.[0] || '0', 10)
        );

        for (const noc of sortedNocs) {
          const nocTitle = `NOC [${sanitizePdfText(noc.code)}] - ${sanitizePdfText(noc.name)}`;
          const hasInitial = typeof noc.initialRating === 'number';
          const hasFinal = typeof noc.finalRating === 'number';
          const diff = hasInitial && hasFinal ? noc.finalRating - noc.initialRating : null;
          const diffLabel = diff !== null ? (diff > 0 ? `+${diff}` : `${diff}`) : 'N/A';
          const ratingText = `Inicial (Antes): ${noc.initialRating ?? 'N/A'}  |  Final (Después): ${noc.finalRating ?? 'N/A'}${diff !== null ? `  |  Cambio: ${diffLabel}` : ''}`;

          doc.font('Helvetica-Bold').fontSize(9.5);
          const titleHeight = doc.heightOfString(nocTitle, { width: pageWidth - 28 });
          const nocHeaderHeight = Math.max(34, titleHeight + 22);

          ensureSpace(nocHeaderHeight + 18);
          const nocY = doc.y;
          doc.rect(doc.page.margins.left + 8, nocY, pageWidth - 16, nocHeaderHeight).fill('#ecfdf5');
          doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(9.5)
            .text(nocTitle, doc.page.margins.left + 14, nocY + 5, {
              width: pageWidth - 28
            });
          doc.fillColor('#047857').font('Helvetica-Bold').fontSize(8.5)
            .text(ratingText, doc.page.margins.left + 14, nocY + 5 + titleHeight + 3, {
              width: pageWidth - 28
            });
          doc.y = nocY + nocHeaderHeight + 5;

          const sortedNics = [...(noc.selectedNICs || [])].sort(
            (a: any, b: any) => parseInt(a.code?.match(/\d+/)?.[0] || '0', 10) - parseInt(b.code?.match(/\d+/)?.[0] || '0', 10)
          );

          for (const nic of sortedNics) {
            ensureSpace(24);
            doc.fillColor('#92400e').font('Helvetica-Bold').fontSize(9)
              .text(`NIC [${sanitizePdfText(nic.code)}] - ${sanitizePdfText(nic.name)}`, doc.page.margins.left + 18, doc.y, {
                width: pageWidth - 24
              });
            const acts = [...(nic.activities || [])].sort();
            doc.fillColor('#475569').font('Helvetica').fontSize(8.5);
            for (const act of acts) {
              ensureSpace(14);
              doc.text(`- ${sanitizePdfText(act)}`, doc.page.margins.left + 26, doc.y, { width: pageWidth - 34 });
            }
            doc.moveDown(0.25);
          }
          doc.moveDown(0.25);
        }
        doc.moveDown(0.5);
      }

      // Before vs. After Clinical Comparison Footer
      ensureSpace(60);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).stroke('#cbd5e1');
      doc.moveDown(0.6);
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(11)
        .text('Comparativa Clínica: Antes (Inicio) vs. Después (Cierre)', doc.page.margins.left);
      doc.moveDown(0.4);

      const innerWidth = pageWidth - 24;
      const initialEvalText = `Evaluador inicial: ${sanitizePdfText(record.evaluator || 'No registrado')}`;
      const initialDateText = `Fecha/Hora inicio: ${startReadable} (Colombia)`;
      const initialObsText = sanitizePdfText(record.observations || 'Ninguna');

      doc.font('Helvetica').fontSize(9.5);
      const initialObsHeight = doc.heightOfString(initialObsText, { width: innerWidth });
      const initialCardHeight = 56 + initialObsHeight + 12;

      ensureSpace(initialCardHeight + 10);
      const initialCardY = doc.y;
      doc.roundedRect(doc.page.margins.left, initialCardY, pageWidth, initialCardHeight, 5)
        .fillAndStroke('#eff6ff', '#bfdbfe');
      doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(9)
        .text('1. REGISTRO INICIAL (ANTES)', doc.page.margins.left + 12, initialCardY + 9, { width: innerWidth });
      doc.fillColor('#334155').font('Helvetica').fontSize(8.5)
        .text(`${initialDateText}  |  ${initialEvalText}`, doc.page.margins.left + 12, initialCardY + 23, { width: innerWidth });
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8)
        .text('OBSERVACIONES INICIALES (ANTES):', doc.page.margins.left + 12, initialCardY + 38, { width: innerWidth });
      doc.fillColor('#0f172a').font('Helvetica').fontSize(9.5)
        .text(initialObsText, doc.page.margins.left + 12, initialCardY + 50, { width: innerWidth });
      doc.y = initialCardY + initialCardHeight + 10;

      const closingDateLabel = closedReadable
        ? `${closedReadable} (Colombia)`
        : (record.status === 'CERRADA' ? 'No registrada (registro histórico)' : 'Pendiente de cierre');
      const closingEvaluatorLabel = sanitizePdfText(
        record.closingEvaluator || (record.status === 'CERRADA' ? record.evaluator : 'Pendiente')
      );
      const finalObsText = sanitizePdfText(
        record.status === 'CERRADA'
          ? (record.finalObservations ?? 'Ninguna')
          : 'Pendiente por evaluar y cerrar'
      );

      doc.font('Helvetica').fontSize(9.5);
      const finalObsHeight = doc.heightOfString(finalObsText, { width: innerWidth });
      const finalCardHeight = 56 + finalObsHeight + 12;

      ensureSpace(finalCardHeight + 18);
      const finalCardY = doc.y;
      doc.roundedRect(doc.page.margins.left, finalCardY, pageWidth, finalCardHeight, 5)
        .fillAndStroke('#ecfdf5', '#a7f3d0');
      doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(9)
        .text('2. EVALUACIÓN Y CIERRE (DESPUÉS)', doc.page.margins.left + 12, finalCardY + 9, { width: innerWidth });
      doc.fillColor('#334155').font('Helvetica').fontSize(8.5)
        .text(`Fecha/Hora cierre: ${closingDateLabel}  |  Evaluador de cierre: ${closingEvaluatorLabel}`, doc.page.margins.left + 12, finalCardY + 23, { width: innerWidth });
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8)
        .text('OBSERVACIONES FINALES (DESPUÉS):', doc.page.margins.left + 12, finalCardY + 38, { width: innerWidth });
      doc.fillColor('#0f172a').font('Helvetica').fontSize(9.5)
        .text(finalObsText, doc.page.margins.left + 12, finalCardY + 50, { width: innerWidth });
      doc.y = finalCardY + finalCardHeight + 12;

      doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
        .text(`Documento generado automáticamente el ${getColombiaDateTimeNow().replace('T', ' ')} (Hora Colombia)`, {
          align: 'right',
          width: pageWidth
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function driveFetchJson(url: string, accessToken: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const errMsg = data?.error?.message || text || `Drive API error (${res.status})`;
    throw new Error(errMsg);
  }
  return data;
}

async function findOrCreatePatientFolder(
  accessToken: string,
  rootFolderId: string,
  patientId: string,
  patientName: string
): Promise<{ id: string; name: string }> {
  const safeId = sanitizeDriveName(patientId) || 'SIN-ID';
  const safeName = sanitizeDriveName(patientName).toUpperCase() || 'PACIENTE';
  const targetFolderName = `${safeId} - ${safeName}`;
  const escapedIdForQuery = safeId.replace(/'/g, "\\'");

  // Search by patient ID prefix so minor name casing/accent differences reuse the same folder
  const q = `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false and name contains '${escapedIdForQuery}'`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const searchRes = await driveFetchJson(searchUrl, accessToken);

  const existingFolder = (searchRes.files || []).find((f: any) =>
    f.name === targetFolderName ||
    f.name.startsWith(`${safeId} -`) ||
    f.name === safeId
  );

  if (existingFolder) {
    console.log(`[Drive] Reusing existing patient folder: "${existingFolder.name}" (${existingFolder.id})`);
    return existingFolder;
  }

  console.log(`[Drive] Creating new patient folder: "${targetFolderName}" inside ${rootFolderId}`);
  const createUrl = `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name`;
  const created = await driveFetchJson(createUrl, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: targetFolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId]
    })
  });

  console.log(`[Drive] Created folder "${created.name}" (${created.id})`);
  return created;
}

async function uploadPAEPdfToDrive(record: any, auth: JWT): Promise<{ driveFileId: string; driveFileUrl: string; fileName: string }> {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID no configurado.");
  }

  const tokenResult = await auth.getAccessToken();
  const accessToken = tokenResult?.token;
  if (!accessToken) {
    throw new Error("No se pudo obtener el token de acceso para Google Drive.");
  }

  const patientFolder = await findOrCreatePatientFolder(
    accessToken,
    rootFolderId,
    record.patient?.id || '',
    record.patient?.name || ''
  );

  const { datePart, timePart } = formatColombiaPartsFromRecordDate(record.date);
  const shortId = sanitizeDriveName(String(record.id || '')).slice(0, 6) || '000000';
  const pdfFileName = `${datePart}_${timePart}_PAE-${shortId}.pdf`;

  const pdfBuffer = await generatePAEPdfBuffer(record);

  // Check if a PDF for this PAE already exists (e.g. closed PAE edited by admin or re-uploaded)
  let existingFileId: string | null = record.driveFileId || null;
  if (!existingFileId) {
    const q = `'${patientFolder.id}' in parents and trashed = false and name contains 'PAE-${shortId}'`;
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)&pageSize=10&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    const listRes = await driveFetchJson(listUrl, accessToken);
    if (listRes.files && listRes.files.length > 0) {
      existingFileId = listRes.files[0].id;
    }
  }

  const boundary = `pae_pdf_boundary_${Date.now()}`;
  const metadata = existingFileId
    ? { name: pdfFileName }
    : { name: pdfFileName, parents: [patientFolder.id] };

  const preamble = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/pdf\r\n\r\n`,
    'utf-8'
  );
  const epilogue = Buffer.from(`\r\n--${boundary}--`, 'utf-8');
  const multipartBody = Buffer.concat([preamble, pdfBuffer, epilogue]);

  let uploaded: any;
  if (existingFileId) {
    console.log(`[Drive] Updating existing PDF "${pdfFileName}" (${existingFileId})`);
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink`;
    try {
      uploaded = await driveFetchJson(updateUrl, accessToken, {
        method: 'PATCH',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: multipartBody
      });
    } catch (patchErr: any) {
      // If stored driveFileId was manually deleted in Drive, recreate it cleanly
      console.warn(`[Drive] Could not update file ${existingFileId} (${patchErr.message}), creating a new file...`);
      const createMetadata = { name: pdfFileName, parents: [patientFolder.id] };
      const createPreamble = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(createMetadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/pdf\r\n\r\n`,
        'utf-8'
      );
      const createBody = Buffer.concat([createPreamble, pdfBuffer, epilogue]);
      const createUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink`;
      uploaded = await driveFetchJson(createUrl, accessToken, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: createBody
      });
    }
  } else {
    console.log(`[Drive] Uploading new PDF "${pdfFileName}" to folder ${patientFolder.id}`);
    const createUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink`;
    uploaded = await driveFetchJson(createUrl, accessToken, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipartBody
    });
  }

  const driveFileUrl = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
  console.log(`[Drive Success] PDF saved: ${driveFileUrl}`);
  return {
    driveFileId: uploaded.id,
    driveFileUrl,
    fileName: uploaded.name || pdfFileName
  };
}

async function syncRowToGoogleSheets(record: any, auth: JWT, driveFileUrl?: string | null) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("Google Sheets configuration missing: GOOGLE_SHEET_ID");
  }

  console.log(`[Sync] Connecting to Google Sheet ID: ${sheetId}`);
  const doc = new GoogleSpreadsheet(sheetId, auth);
  await doc.loadInfo();
  console.log(`[Sync] Connected to spreadsheet: "${doc.title}"`);

  const sheet = doc.sheetsByIndex[0];
  console.log(`[Sync] Using sheet: "${sheet.title}"`);

  const headers = [
    'ID',
    'Fecha',
    'Paciente',
    'PacienteID',
    'Evaluador',
    'Estado',
    'Necesidades',
    'NOC_Inicial',
    'NOC_Final',
    'Diagnosticos',
    'Observaciones',
    'UltimaSincronizacion',
    'PDF_Drive',
    'Fecha_Cierre',
    'Evaluador_Cierre',
    'Observaciones_Finales'
  ];

  try {
    await sheet.loadHeaderRow();
    const currentHeaders = sheet.headerValues;
    const missingHeaders = headers.filter(h => !currentHeaders.includes(h));
    if (missingHeaders.length > 0) {
      console.log(`[Sync] Appending new columns to headers: ${missingHeaders.join(', ')}`);
      await sheet.setHeaderRow([...currentHeaders, ...missingHeaders]);
    }
  } catch (e) {
    console.log(`[Sync] Sheet appears empty or missing headers. Initializing headers...`);
    await sheet.setHeaderRow(headers);
  }

  const rows = await sheet.getRows();
  console.log(`[Sync] Searching for existing record with ID: ${record.id} among ${rows.length} rows`);
  const existingRow = rows.find(row => row.get('ID') === record.id);

  const nocInitialSummary = (record.nandas || []).flatMap((nanda: any) =>
    (nanda.selectedNOCs || []).map((noc: any) => `[${noc.code}] ${noc.initialRating}`)
  ).join('; ');

  const nocFinalSummary = (record.nandas || []).flatMap((nanda: any) =>
    (nanda.selectedNOCs || []).map((noc: any) => `[${noc.code}] ${noc.finalRating || 'N/A'}`)
  ).join('; ');

  const effectiveDriveUrl =
    driveFileUrl ??
    record.driveFileUrl ??
    (existingRow ? existingRow.get('PDF_Drive') : '') ??
    '';

  const rowData = {
    ID: record.id,
    Fecha: record.date,
    Paciente: record.patient.name,
    PacienteID: record.patient.id,
    Evaluador: record.evaluator,
    Estado: record.status,
    Necesidades: (record.needs || []).join(', '),
    NOC_Inicial: nocInitialSummary,
    NOC_Final: nocFinalSummary,
    Diagnosticos: JSON.stringify(record.nandas),
    Observaciones: record.observations || '',
    UltimaSincronizacion: getColombiaDateTimeNow(),
    PDF_Drive: record.status === 'CERRADA' ? effectiveDriveUrl : '',
    Fecha_Cierre: record.closedDate || '',
    Evaluador_Cierre: record.closingEvaluator || '',
    Observaciones_Finales: record.finalObservations || ''
  };

  if (existingRow) {
    console.log(`[Sync] Found existing row. Updating status from ${existingRow.get('Estado')} to ${record.status}`);
    existingRow.assign(rowData);
    await existingRow.save();
    console.log(`[Sync Success] Updated record ${record.id} in Google Sheets`);
  } else {
    console.log(`[Sync] Record not found. Adding as new row...`);
    await sheet.addRow(rowData);
    console.log(`[Sync Success] Added new record ${record.id} to Google Sheets`);
  }

  return { action: existingRow ? 'updated' : 'created' };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Google Sheets + Google Drive Sync Endpoint
  app.post("/api/sync-pae", async (req, res) => {
    const record = req.body;
    console.log(`[Sync] Received request to sync PAE record: ${record.id} (${record.status})`);

    try {
      const serviceAccountAuth = getServiceAccountAuth();

      let driveFileId: string | null = record.driveFileId || null;
      let driveFileUrl: string | null = record.driveFileUrl || null;
      let driveError: string | null = null;

      // Automatically generate & upload PDF to Google Drive ONLY when finalized (CERRADA)
      if (record.status === 'CERRADA') {
        try {
          const driveRes = await uploadPAEPdfToDrive(record, serviceAccountAuth);
          driveFileId = driveRes.driveFileId;
          driveFileUrl = driveRes.driveFileUrl;
        } catch (err: any) {
          driveError = err.message || 'Error al subir PDF a Google Drive';
          console.error(`[Drive Error] Failed to upload PDF for PAE ${record.id}:`, driveError);
        }
      }

      const sheetResult = await syncRowToGoogleSheets(record, serviceAccountAuth, driveFileUrl);

      res.json({
        success: true,
        action: sheetResult.action,
        driveFileId,
        driveFileUrl,
        driveError
      });
    } catch (error: any) {
      console.error(`[Sync Critical Error] ${error.message}`);
      if (error.message?.includes('403')) {
        console.error("[Sync Tip] Make sure you shared the Google Sheet and Shared Drive with the Service Account email.");
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Manual Drive Upload / Re-upload Endpoint for closed PAEs
  app.post("/api/upload-pae-pdf", async (req, res) => {
    const record = req.body;
    console.log(`[Drive] Manual PDF upload requested for PAE: ${record.id} (${record.status})`);

    if (!record || record.status !== 'CERRADA') {
      return res.status(400).json({ error: "Solo los PAE finalizados (CERRADA) se guardan en Google Drive." });
    }

    try {
      const serviceAccountAuth = getServiceAccountAuth();
      const driveRes = await uploadPAEPdfToDrive(record, serviceAccountAuth);

      // Best-effort update of PDF_Drive link in Google Sheets
      if (process.env.GOOGLE_SHEET_ID) {
        try {
          await syncRowToGoogleSheets(record, serviceAccountAuth, driveRes.driveFileUrl);
        } catch (sheetErr: any) {
          console.warn(`[Sync Warning] PDF uploaded to Drive, but Sheet update failed: ${sheetErr.message}`);
        }
      }

      res.json({
        success: true,
        driveFileId: driveRes.driveFileId,
        driveFileUrl: driveRes.driveFileUrl,
        fileName: driveRes.fileName
      });
    } catch (error: any) {
      console.error(`[Drive Critical Error] ${error.message}`);
      res.status(500).json({ error: error.message || "Error al subir el PDF a Google Drive" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
