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
  let template = `__TEMPLATE_HTML_CONTENT__`;

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
