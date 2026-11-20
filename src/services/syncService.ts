import { PAERecord } from "../types";

export interface SyncResult {
  success: boolean;
  action?: string;
  driveFileId?: string | null;
  driveFileUrl?: string | null;
  driveError?: string | null;
  error?: string;
}

export interface DriveUploadResult {
  success: boolean;
  driveFileId?: string;
  driveFileUrl?: string;
  fileName?: string;
  error?: string;
}

/**
 * Syncs a PAE record to Google Sheets (and uploads PDF to Google Drive if status is CERRADA).
 */
export async function syncPAEToSheets(record: PAERecord): Promise<SyncResult> {
  console.log(`[Client Sync] Starting sync for PAE: ${record.id}`);
  try {
    const response = await fetch('/api/sync-pae', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });

    const text = await response.text();
    let parsed: any = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = {};
    }

    if (!response.ok) {
      const errorMessage = parsed.error || `Server Error (${response.status}): ${text.substring(0, 100)}`;
      console.error(`[Client Sync Error] ${errorMessage}`);
      return { success: false, error: errorMessage };
    }

    console.log(`[Client Sync Success] PAE ${record.id} synced (${parsed.action})`);
    return {
      success: true,
      action: parsed.action,
      driveFileId: parsed.driveFileId || null,
      driveFileUrl: parsed.driveFileUrl || null,
      driveError: parsed.driveError || null,
    };
  } catch (error: any) {
    console.error(`[Client Sync Critical] Failed to connect to sync API:`, error);
    return { success: false, error: error?.message || 'Error de conexión al sincronizar' };
  }
}

/**
 * Manually uploads or updates the PDF of a closed PAE in Google Drive (and updates PDF_Drive in Sheets).
 */
export async function uploadPAEPdfToDrive(record: PAERecord): Promise<DriveUploadResult> {
  console.log(`[Client Drive] Requesting PDF upload for PAE: ${record.id}`);
  try {
    const response = await fetch('/api/upload-pae-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });

    const text = await response.text();
    let parsed: any = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = {};
    }

    if (!response.ok) {
      const errorMessage = parsed.error || `Error (${response.status}): ${text.substring(0, 100)}`;
      console.error(`[Client Drive Error] ${errorMessage}`);
      return { success: false, error: errorMessage };
    }

    console.log(`[Client Drive Success] PDF uploaded: ${parsed.driveFileUrl}`);
    return {
      success: true,
      driveFileId: parsed.driveFileId,
      driveFileUrl: parsed.driveFileUrl,
      fileName: parsed.fileName,
    };
  } catch (error: any) {
    console.error(`[Client Drive Critical]`, error);
    return { success: false, error: error?.message || 'No se pudo conectar con el servidor para subir el PDF' };
  }
}
