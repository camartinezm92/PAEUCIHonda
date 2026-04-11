import { PAERecord } from "../types";

/**
 * Syncs a PAE record to the Google Sheets backend.
 * This calls our local Express API which handles the secure authentication.
 */
export async function syncPAEToSheets(record: PAERecord): Promise<void> {
  console.log(`[Client Sync] Starting sync for PAE: ${record.id}`);
  try {
    const response = await fetch('/api/sync-pae', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[Client Sync Error] Server responded with error: ${errorData.error}`);
      throw new Error(errorData.error || 'Failed to sync with Google Sheets');
    }

    const result = await response.json();
    console.log(`[Client Sync Success] PAE ${record.id} synced (${result.action})`);
  } catch (error) {
    console.error(`[Client Sync Critical] Failed to connect to sync API:`, error);
    // We don't throw the error here to avoid blocking the main app flow
  }
}
