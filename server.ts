import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Google Sheets Sync Endpoint
  app.post("/api/sync-pae", async (req, res) => {
    const record = req.body;
    console.log(`[Sync] Received request to sync PAE record: ${record.id} (${record.status})`);
    
    try {
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      let key = process.env.GOOGLE_PRIVATE_KEY;
      const sheetId = process.env.GOOGLE_SHEET_ID;

      if (!email || !key || !sheetId) {
        const missing = [];
        if (!email) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
        if (!key) missing.push("GOOGLE_PRIVATE_KEY");
        if (!sheetId) missing.push("GOOGLE_SHEET_ID");
        
        console.error(`[Sync Error] Missing configuration: ${missing.join(", ")}`);
        return res.status(500).json({ error: `Google Sheets configuration missing: ${missing.join(", ")}` });
      }

      // Robust key parsing
      // 1. Remove surrounding quotes if the user pasted them into the secret
      if (key.startsWith('"') && key.endsWith('"')) {
        key = key.substring(1, key.length - 1);
      }
      // 2. Replace literal \n strings with actual newline characters
      key = key.replace(/\\n/g, '\n');
      
      console.log(`[Sync] Authenticating with Google Service Account: ${email}`);
      console.log(`[Sync] Key prefix: ${key.substring(0, 25)}...`);
      const serviceAccountAuth = new JWT({
        email: email,
        key: key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      console.log(`[Sync] Connecting to Google Sheet ID: ${sheetId}`);
      const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
      await doc.loadInfo();
      console.log(`[Sync] Connected to spreadsheet: "${doc.title}"`);
      
      const sheet = doc.sheetsByIndex[0];
      console.log(`[Sync] Using sheet: "${sheet.title}"`);
      
      const rows = await sheet.getRows();
      console.log(`[Sync] Searching for existing record with ID: ${record.id} among ${rows.length} rows`);
      const existingRow = rows.find(row => row.get('ID') === record.id);

      // Create summaries for NOC ratings
      const nocInitialSummary = record.nandas.flatMap((nanda: any) => 
        nanda.selectedNOCs.map((noc: any) => `[${noc.code}] ${noc.initialRating}`)
      ).join('; ');

      const nocFinalSummary = record.nandas.flatMap((nanda: any) => 
        nanda.selectedNOCs.map((noc: any) => `[${noc.code}] ${noc.finalRating || 'N/A'}`)
      ).join('; ');

      const rowData = {
        ID: record.id,
        Fecha: record.date,
        Paciente: record.patient.name,
        PacienteID: record.patient.id,
        Evaluador: record.evaluator,
        Estado: record.status,
        Necesidades: record.needs.join(', '),
        NOC_Inicial: nocInitialSummary,
        NOC_Final: nocFinalSummary,
        Diagnosticos: JSON.stringify(record.nandas),
        Observaciones: record.observations || '',
        UltimaSincronizacion: new Date().toISOString()
      };

      // Ensure headers match our new structure
      const headers = ['ID', 'Fecha', 'Paciente', 'PacienteID', 'Evaluador', 'Estado', 'Necesidades', 'NOC_Inicial', 'NOC_Final', 'Diagnosticos', 'Observaciones', 'UltimaSincronizacion'];
      
      try {
        await sheet.loadHeaderRow();
        // Check if we need to update headers (if they changed)
        const currentHeaders = sheet.headerValues;
        if (headers.some(h => !currentHeaders.includes(h))) {
          console.log(`[Sync] Updating headers to include new columns...`);
          await sheet.setHeaderRow(headers);
        }
      } catch (e) {
        console.log(`[Sync] Sheet appears empty or missing headers. Initializing headers...`);
        await sheet.setHeaderRow(headers);
      }

      if (existingRow) {
        console.log(`[Sync] Found existing row. Updating status from ${existingRow.get('Estado')} to ${record.status}`);
        // Update existing row
        existingRow.assign(rowData);
        await existingRow.save();
        console.log(`[Sync Success] Updated record ${record.id} in Google Sheets`);
      } else {
        console.log(`[Sync] Record not found. Adding as new row...`);
        await sheet.addRow(rowData);
        console.log(`[Sync Success] Added new record ${record.id} to Google Sheets`);
      }

      res.json({ success: true, action: existingRow ? 'updated' : 'created' });
    } catch (error: any) {
      console.error(`[Sync Critical Error] ${error.message}`);
      if (error.message.includes('403')) {
        console.error("[Sync Tip] Make sure you shared the Google Sheet with the Service Account email as 'Editor'.");
      }
      res.status(500).json({ error: error.message });
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
