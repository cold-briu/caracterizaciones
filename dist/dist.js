// Version: 1.0.23

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
  if (!schemas || !mergedEntry) {
    return "";
  }

  // Iterate over all schemas to create card templates
  const cardsHtml = Object.values(schemas)
    .map(schema => {
      const sheetName = schema.name;
      const title = sheetName.charAt(0).toUpperCase() + sheetName.slice(1);
      
      const rowsHtml = Object.keys(schema.columns)
        .map(key => {
          const val = mergedEntry[key] !== undefined ? mergedEntry[key] : "";
          return `
            <tr>
              <td class="field-label">${key}</td>
              <td class="field-value">${val}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <div class="schema-card" id="card-${sheetName}">
          <h3 class="schema-title">${title}</h3>
          <table class="schema-table">
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    })
    .join('\n');

  const entryId = mergedEntry[typeof CONFIG !== 'undefined' ? CONFIG.foreignKey : 'documento'] || 'entry';

  // Load the template from the separate HTML file pushed to Google Apps Script
  let template = "";
  try {
    template = HtmlService.createHtmlOutputFromFile('template').getContent();
  } catch (e) {
    console.error("Failed to load template.html via HtmlService. Make sure template.html is pushed.", e);
    // Fallback in case template.html is missing
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Record Summary - ${entryId}</title>
  ${getHtmlStylesheet()}
</head>
<body>
  <div class="entry-container" id="entry-${entryId}">
    ${cardsHtml}
  </div>
</body>
</html>`;
  }

  // Replace placeholders in the loaded HTML template
  template = template.replace(/\{\{entryId\}\}/g, entryId);
  template = template.replace(/\{\{cardsHtml\}\}/g, cardsHtml);

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
  const fileName = String(mergedEntry[fileNameKey] || 'document').trim();
  const htmlBlob = Utilities.newBlob(htmlContent, 'text/html', `${fileName}.html`);
  const pdfBlob = htmlBlob.getAs('application/pdf').setName(`${fileName}.pdf`);
  return folder.createFile(pdfBlob);
}

/**
 * Returns a CSS stylesheet string to style the generated HTML templates.
 * 
 * @returns {string} The CSS style block.
 */
function getHtmlStylesheet() {
  return `
<style>
  body {
    font-family: 'Outfit', 'Inter', 'Roboto', sans-serif;
    background-color: #0f172a;
    color: #f8fafc;
    margin: 20px;
  }
  .entry-container {
    border: 1px dashed rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    padding: 16px;
    margin-bottom: 32px;
    background: rgba(15, 23, 42, 0.4);
  }
  .schema-card {
    background: rgba(30, 41, 59, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
  }
  .schema-title {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 1.25rem;
    font-weight: 600;
    color: #38bdf8;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 8px;
  }
  .schema-table {
    width: 100%;
    border-collapse: collapse;
  }
  .schema-table td {
    padding: 8px 12px;
    font-size: 0.95rem;
  }
  .field-label {
    font-weight: 500;
    color: #94a3b8;
    width: 40%;
    text-transform: capitalize;
  }
  .field-value {
    color: #e2e8f0;
    word-break: break-word;
  }
  .schema-table tr:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
</style>
`;
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
