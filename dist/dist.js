// Version: 1.0.43

// --- File: config.js ---
const CONFIG = {
  foreignKey: "documento",
  masterResultsDirName: "Resultados",
  dailyResultsDirName: "Resultados_",
  sheets: {
    demografica: {
      name: "sociodemografica",
      columns: {
        marcaTemporal: 0,
        nombre: 7,
        edad: 9,
        documento: 8,
        genero: 10,
        colegio: 21,
        grado: 22,
        acudiente: 1,
        telefono: 2,
        investigacion: 18
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
 * Parses a date string like "2022-07-11T13:31:21.547Z" to "11 de Julio de 2022".
 * 
 * @param {string} dateStr - The ISO date string.
 * @returns {string} The formatted Spanish date string.
 */
function parseMarcaTemporal(dateStr) {
  if (!dateStr) return dateStr;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${date.getUTCDate()} de ${months[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
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
  <title>Factores asociados a la hipoacusia</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      background-color: #ffffff;
      color: #1a202c;
      margin: 20px;
      line-height: 1.4;
      font-size: 13px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .header-container {
      text-align: center;
      margin-bottom: 20px;
      width: 700px;
    }

    .header-title {
      font-size: 15px;
      font-weight: bold;
      color: #0d1b2a;
      line-height: 1.5;
      margin: 0;
    }

    .section-container {
      margin-bottom: 18px;
      width: 700px;
    }

    .section-title {
      font-size: 13px;
      font-weight: bold;
      color: #1d4ed8;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 3px;
      margin-bottom: 8px;
      width: 700px;
    }

    /* Personal Data Grid Table */
    .personal-data-table {
      width: 700px;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      margin-bottom: 10px;
    }

    .personal-data-table td {
      border: 1px solid #cbd5e1;
      padding: 8px;
      vertical-align: middle;
      font-size: 12.5px;
    }

    .field-label {
      font-weight: bold;
      color: #1a202c;
    }

    .field-value {
      font-family: monospace;
      font-size: 13px;
      color: #1e3a8a;
      padding-left: 4px;
    }

    .fill-line {
      border-bottom: 1px solid #cbd5e1;
      display: inline-block;
      height: 15px;
    }

    /* Evaluation Data Tables */
    .evaluation-table {
      width: 700px;
      border-collapse: collapse;
      margin-top: 5px;
      margin-bottom: 5px;
      border: 1px solid #cbd5e1;
    }

    .evaluation-table th,
    .evaluation-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      font-size: 12.5px;
      height: 24px;
      vertical-align: middle;
    }

    .evaluation-table th {
      font-weight: bold;
      text-align: center;
      color: #1a202c;
    }

    .col-evaluado {
      background-color: #f1f5f9;
      font-weight: bold;
      width: 350px;
    }

    .col-normal {
      background-color: #ecfdf5;
      text-align: center;
      width: 175px;
    }

    .col-normal-header {
      background-color: #d1fae5;
      color: #065f46;
      width: 175px;
    }

    .col-anormal {
      background-color: #fef2f2;
      text-align: center;
      width: 175px;
    }

    .col-anormal-header {
      background-color: #fee2e2;
      color: #991b1b;
      width: 175px;
    }

    /* Small check box inside evaluation table cells */
    .checkbox-box {
      display: block;
      width: 16px;
      height: 16px;
      border: 1.5px solid #4a5568;
      background-color: #ffffff;
      margin: 0 auto;
    }

    /* Ruled lines for observations */
    .observations-container {
      margin-top: 5px;
      width: 700px;
    }

    .observations-label {
      font-weight: bold;
      font-size: 12px;
      color: #1a202c;
      margin-bottom: 4px;
    }

    .ruled-table {
      width: 700px;
      border-collapse: collapse;
      border: none;
      margin-top: 5px;
    }

    .ruled-table td {
      border: none;
      border-bottom: 1px solid #cbd5e1;
      height: 24px;
      font-size: 13px;
      color: #1e3a8a;
      vertical-align: bottom;
      padding: 0 5px;
    }

    /* Suggested conduct checkboxes */
    .conducta-container {
      margin-top: 10px;
      font-size: 12.5px;
      width: 700px;
    }

    .conducta-title {
      font-weight: bold;
      margin-bottom: 6px;
    }

    .conducta-option {
      margin-bottom: 4px;
    }

    .checkbox-placeholder {
      font-family: monospace;
      font-weight: bold;
      color: #1e3a8a;
    }
  </style>
</head>

<body>

  <!-- Header Title -->
  <div class="header-container">
    <h1 class="header-title">
      Factores asociados a la hipoacusia en estudiantes de una Institución Educativa del municipio de El Retiro,<br>
      Antioquia para el año 2026
    </h1>
  </div>

  <!-- 1. Datos Personales del Estudiante -->
  <div class="section-container">
    <div class="section-title">1. Datos Personales del Estudiante</div>
    <table class="personal-data-table">
      <tr>
        <td colspan="8" style="width: 466px;">
          <span class="field-label">Nombre completo:</span>
          <span class="field-value">{{nombre}}</span>
        </td>
        <td colspan="4" style="width: 234px;">
          <span class="field-label">Fecha:</span>
          <span class="field-value">{{marcaTemporal}}</span>
        </td>
      </tr>
      <tr>
        <td colspan="5" style="width: 290px;">
          <span class="field-label">Documento de identidad:</span>
          <span class="field-value">{{documento}}</span>
        </td>
        <td colspan="3" style="width: 176px;">
          <span class="field-label">Edad:</span>
          <span class="field-value">{{edad}}</span> <span class="field-label">años</span>
        </td>
        <td colspan="4" style="width: 234px;">
          <span class="field-label">Género:</span>
          <span class="field-value">{{genero}}</span>
        </td>
      </tr>
      <tr>
        <td colspan="8" style="width: 466px;">
          <span class="field-label">Colegio:</span>
          <span class="field-value">{{colegio}}</span>
        </td>
        <td colspan="4" style="width: 234px;">
          <span class="field-label">Grado/Grp:</span>
          <span class="field-value">{{grado}}</span>
        </td>
      </tr>
      <tr>
        <td colspan="8" style="width: 466px;">
          <span class="field-label">Nombre y contacto acudiente del estudiante:</span>
          <span class="field-value">{{acudiente}}</span>
          <div style="margin-top: 6px;">
            <span class="field-label">Teléfono de contacto:</span>
            <span class="field-value">{{telefono}}</span>
          </div>
        </td>
        <td colspan="4" style="width: 234px; vertical-align: top;">
          <span class="field-label">Investigación:</span><br>
          <span class="field-value">{{investigacion}}</span>
        </td>
      </tr>
    </table>
  </div>

  <!-- 2. Evaluación de Otoscopia (Hallazgos y Anormalidades) -->
  <div class="section-container">
    <div class="section-title">2. Evaluación de Otoscopia (Hallazgos y Anormalidades)</div>
    <table class="evaluation-table">
      <thead>
        <tr>
          <th class="col-evaluado">OÍDO EVALUADO</th>
          <th class="col-normal-header">Normal</th>
          <th class="col-anormal-header">Anormal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="col-evaluado">Oído Derecho (OD)</td>
          <td class="col-normal"><span class="checkbox-box"></span></td>
          <td class="col-anormal"><span class="checkbox-box"></span></td>
        </tr>
        <tr>
          <td class="col-evaluado">Oído Izquierdo (OI)</td>
          <td class="col-normal"><span class="checkbox-box"></span></td>
          <td class="col-anormal"><span class="checkbox-box"></span></td>
        </tr>
      </tbody>
    </table>

    <!-- Observaciones de Otoscopia -->
    <div class="observations-container">
      <div class="section-title" style="border: none; padding: 0; margin-top: 10px; margin-bottom: 4px;">Observaciones
        de Otoscopia (Hallazgos y Anormalidades)</div>
      <div class="observations-label">Observaciones Clínicas / De Investigación:</div>
      <table class="ruled-table">
        <tr>
          <td style="font-family: monospace;">&nbsp;</td>
        </tr>
        <tr>
          <td>&nbsp;</td>
        </tr>
        <tr>
          <td>&nbsp;</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- 3. Registro de Resultados del Tamizaje Auditivo -->
  <div class="section-container">
    <div class="section-title">3. Registro de Resultados del Tamizaje Auditivo</div>
    <table class="evaluation-table">
      <thead>
        <tr>
          <th class="col-evaluado">OÍDO EVALUADO</th>
          <th class="col-normal-header">PASA (Audición Adecuada)</th>
          <th class="col-anormal-header">NO PASA (Sospecha / Remisión)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="col-evaluado">Oído Derecho (OD)</td>
          <td class="col-normal"><span class="checkbox-box"></span></td>
          <td class="col-anormal"><span class="checkbox-box"></span></td>
        </tr>
        <tr>
          <td class="col-evaluado">Oído Izquierdo (OI)</td>
          <td class="col-normal"><span class="checkbox-box"></span></td>
          <td class="col-anormal"><span class="checkbox-box"></span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 4. Observaciones y Plan de Acción -->
  <div class="section-container">
    <div class="section-title">4. Observaciones y Plan de Acción</div>
    <div class="observations-label">Observaciones Clínicas / De Investigación:</div>
    <table class="ruled-table">
      <tr>
        <td style="font-family: monospace; color: #1e3a8a;">{{umbral}}</td>
      </tr>
      <tr>
        <td>&nbsp;</td>
      </tr>
      <tr>
        <td>&nbsp;</td>
      </tr>
    </table>

    <!-- Conducta Sugerida -->
    <div class="conducta-container">
      <div class="conducta-title">Conducta Sugerida:</div>
      <div class="conducta-option">
        <span class="checkbox-placeholder">[ &nbsp; ]</span> Sin hallazgos de alerta. Seguimiento escolar regular.
      </div>
      <div class="conducta-option">
        <span class="checkbox-placeholder">[ &nbsp; ]</span> Remisión médica prioritaria (Oído obstruido, dolor,
        inflamación, supuración).
      </div>
      <div class="conducta-option">
        <span class="checkbox-placeholder">[ &nbsp; ]</span> Remisión formal a valoración audiológica integral (Criterio
        "No Pasa" en tamizaje).
      </div>
    </div>
  </div>

</body>

</html>`;

  // Replace placeholders dynamically for every key in the merged record
  for (const [key, val] of Object.entries(mergedEntry)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    let finalVal = val;
    if (key === 'marcaTemporal') {
      finalVal = parseMarcaTemporal(finalVal);
    }
    template = template.replace(placeholder, finalVal !== undefined ? finalVal : "");
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
  const name = String(mergedEntry.nombre || '').trim();
  const doc = String(mergedEntry[fileNameKey] || '').trim();
  const fileName = name && doc ? `${name}_${doc}` : (name || doc || 'document');
  const pdfName = `${fileName}.pdf`;

  // Overwrite if file exists
  const existingFiles = folder.getFilesByName(pdfName);
  while (existingFiles.hasNext()) {
    existingFiles.next().setTrashed(true);
  }

  const htmlBlob = Utilities.newBlob(htmlContent, 'text/html', `${fileName}.html`);
  const pdfBlob = htmlBlob.getAs('application/pdf').setName(pdfName);
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
