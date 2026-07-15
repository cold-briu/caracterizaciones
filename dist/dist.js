// Version: 1.0.27

// --- File: config.js ---
const CONFIG = {
  foreignKey: "documento",
  masterResultsDirName: "Resultados",
  dailyResultsDirName: "Resultados_",
  sheets: {
    demografica: {
      name: "demografica",
      columns: {
        marcaTemporal: 0,
        Nombre: 1,
        Edad: 2,
        documento: 3
      }
    },
    fisica: {
      name: "fisica",
      columns: {
        marcaTemporal: 0,
        umbral: 1,
        documento: 2
      }
    }
  }
};






// --- File: utils.js ---
/**
 * Maps raw sheet row arrays to structured objects using a column mapping definition.
 * 
 * @param {Array<Array>} data - The raw row data from the sheet (without headers).
 * @param {Object} columnMapping - Key-value mapping of property name to column index (e.g. { name: 1, age: 2 }).
 * @returns {Array<Object>} Array of structured objects.
 */
function mapRowsToObjects(data, columnMapping) {
  return data.map(row => {
    const record = {};
    for (const [key, index] of Object.entries(columnMapping)) {
      record[key] = row[index];
    }
    return record;
  });
}

/**
 * Merges two objects if their values for the specified key are identical.
 * 
 * @param {Object} objA - First object.
 * @param {Object} objB - Second object.
 * @param {string} keyName - The key name used for matching.
 * @returns {Object|null} The merged object, or null if they don't match or key is missing.
 */
function mergeObjectsByKey(objA, objB, keyName) {
  if (!objA || !objB || !keyName) return null;

  const valA = objA[keyName];
  const valB = objB[keyName];

  if (valA === undefined || valB === undefined) return null;

  const strA = String(valA).trim();
  const strB = String(valB).trim();

  // Ensure we don't merge rows on empty values
  if (strA === "" || strB === "") return null;

  if (strA.toLowerCase() === strB.toLowerCase()) {
    return Object.assign({}, objA, objB);
  }
  return null;
}

/**
 * Gets or creates the nested results folder structure:
 * 1. Creates/gets the master results folder as a sibling of the spreadsheet.
 * 2. Creates/gets a daily results folder within that master folder, using the date string (YYYY-MM-DD).
 * 
 * @param {string} masterDirName - The name for the master results folder.
 * @param {string} dailyDirPrefix - The prefix for the daily folder.
 * @returns {GoogleAppsScript.Drive.Folder} The daily results folder.
 */
function getOrCreateResultsFolder(masterDirName, dailyDirPrefix) {
  // Find the spreadsheet's parent folders (the sibling level)
  const ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  const parents = ssFile.getParents();
  const siblingFolder = parents.hasNext() ? parents.next() : DriveApp;

  // 1. Get or create master results directory
  let masterFolder;
  const masterFolders = siblingFolder.getFoldersByName(masterDirName);
  if (masterFolders.hasNext()) {
    masterFolder = masterFolders.next();
  } else {
    masterFolder = siblingFolder.createFolder(masterDirName);
  }

  // 2. Format execution date
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  const targetFolderName = `${dailyDirPrefix}_${dateString}`;

  // 3. Get or create daily results directory inside the master folder
  const dailyFolders = masterFolder.getFoldersByName(targetFolderName);
  if (dailyFolders.hasNext()) {
    return dailyFolders.next();
  } else {
    return masterFolder.createFolder(targetFolderName);
  }
}

/**
 * Creates a single whole HTML document for one row of the merged data using the sheets schemas.
 * 
 * @param {Object} schemas - The config sheets object containing all sheet schemas (e.g., CONFIG.sheets).
 * @param {Object} mergedEntry - A single merged data entry.
 * @returns {string} A complete HTML document string.
 */
function createHtmlTemplateFromSchema(schemas, mergedEntry) {
  if (!mergedEntry) {
    return "";
  }

  // Load the template (injected at build time from src/template.html)
  let template = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reporte Clínico - {{Nombre}}</title>
  <style>
    body {
      font-family: 'Inter', 'Roboto', Helvetica, Arial, sans-serif;
      background-color: #ffffff;
      color: #1e293b;
      margin: 40px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .header-title {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #0f172a;
      text-transform: uppercase;
      margin: 0 0 5px 0;
    }
    .header-subtitle {
      font-size: 0.9rem;
      color: #64748b;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #0f172a;
      margin-top: 24px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .patient-info {
      display: table;
      width: 100%;
      margin-bottom: 20px;
    }
    .info-row {
      display: table-row;
    }
    .info-label {
      display: table-cell;
      font-weight: 600;
      color: #475569;
      padding: 6px 0;
      width: 25%;
    }
    .info-value {
      display: table-cell;
      color: #0f172a;
      padding: 6px 0;
    }
    .results-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .results-table th,
    .results-table td {
      padding: 10px 0;
      text-align: left;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.95rem;
    }
    .results-table th {
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #cbd5e1;
    }
    .results-table td {
      color: #0f172a;
    }
    .footer {
      margin-top: 80px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      font-size: 0.75rem;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="header-title">Informe de Resultados</h1>
    <h2 class="header-subtitle">Evaluación de Caracterización</h2>
  </div>

  <div class="section-title">Datos del Paciente</div>
  <div class="patient-info">
    <div class="info-row">
      <div class="info-label">Nombre completo:</div>
      <div class="info-value">{{Nombre}}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Documento:</div>
      <div class="info-value">{{documento}}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Edad:</div>
      <div class="info-value">{{Edad}} años</div>
    </div>
  </div>

  <div class="section-title">Resultados de la Evaluación</div>
  <table class="results-table">
    <thead>
      <tr>
        <th>Parámetro Evaluado</th>
        <th>Resultado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Umbral de respuesta</td>
        <td>{{umbral}}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Documento generado automáticamente • Marca temporal: {{marcaTemporal}}
  </div>
</body>
</html>
`;

  // Replace placeholders dynamically for every key in the merged record
  for (const [key, val] of Object.entries(mergedEntry)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    template = template.replace(placeholder, val !== undefined ? val : "");
  }

  // Clean any unresolved double curly brace placeholders
  template = template.replace(/\{\{\w+\}\}/g, "");

  return template;
}

/**
 * Converts an HTML template string into a PDF blob and saves it to the specified Drive folder.
 * The filename is determined by the value of a specific key in the merged record (defined in config).
 * 
 * @param {string} htmlContent - The full HTML document string.
 * @param {Object} mergedEntry - The merged data object.
 * @param {string} fileNameKey - The key name from the merged entry to use as the file name.
 * @param {GoogleAppsScript.Drive.Folder} folder - The destination Drive folder.
 * @returns {GoogleAppsScript.Drive.File} The created PDF file.
 */
function saveHtmlAsPdf(htmlContent, mergedEntry, fileNameKey, folder) {
  const name = String(mergedEntry.Nombre || '').trim();
  const doc = String(mergedEntry[fileNameKey] || '').trim();
  const fileName = name && doc ? `${name}_${doc}` : (name || doc || 'document');
  const htmlBlob = Utilities.newBlob(htmlContent, 'text/html', `${fileName}.html`);
  const pdfBlob = htmlBlob.getAs('application/pdf').setName(`${fileName}.pdf`);
  return folder.createFile(pdfBlob);
}


// --- File: main.js ---
function generateResultsPDF() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const interviewSheet = ss.getSheetByName(CONFIG.sheets.demografica.name);
    const physicalSheet = ss.getSheetByName(CONFIG.sheets.fisica.name);

    // Skip headers (row 0) and get data
    const interviewData = interviewSheet.getDataRange().getValues().slice(1);
    const physicalData = physicalSheet.getDataRange().getValues().slice(1);

    const interviewRecords = mapRowsToObjects(interviewData, CONFIG.sheets.demografica.columns);
    const physicalRecords = mapRowsToObjects(physicalData, CONFIG.sheets.fisica.columns);

    const mergedRecords = [];
    for (const interview of interviewRecords) {
        for (const physical of physicalRecords) {
            const merged = mergeObjectsByKey(interview, physical, CONFIG.foreignKey);
            if (merged) {
                mergedRecords.push(merged);
            }
        }
    }

    const htmlTemplates = mergedRecords.map(record => createHtmlTemplateFromSchema(CONFIG.sheets, record));

    // Get or create the results folder for today's execution
    const resultsFolder = getOrCreateResultsFolder(CONFIG.masterResultsDirName, CONFIG.dailyResultsDirName);

    // Save each template as a PDF in the results folder
    htmlTemplates.forEach((htmlContent, index) => {
        const record = mergedRecords[index];
        saveHtmlAsPdf(htmlContent, record, CONFIG.foreignKey, resultsFolder);
    });
}
