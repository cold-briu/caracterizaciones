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
  let template = `__TEMPLATE_HTML_CONTENT__`;

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

/**
 * Copies a Google Doc template, replaces placeholders with record values, 
 * converts the doc to PDF, saves it to the target folder, and deletes the temporary copy.
 * 
 * @param {string} templateId - The Google Doc template ID.
 * @param {Object} mergedEntry - The merged record data.
 * @param {string} fileNameKey - The key name from the merged entry to use as the file name.
 * @param {GoogleAppsScript.Drive.Folder} folder - The destination Drive folder.
 * @returns {GoogleAppsScript.Drive.File} The created PDF file.
 */
function saveDocTemplateAsPdf(templateId, mergedEntry, fileNameKey, folder) {
  const name = String(mergedEntry.nombre || '').trim();
  const docVal = String(mergedEntry[fileNameKey] || '').trim();
  const fileName = name && docVal ? `${name}_${docVal}` : (name || docVal || 'document');
  const pdfName = `${fileName}.pdf`;

  // 1. Copy the Template: locate Google Doc template and create a temporary copy
  const templateFile = DriveApp.getFileById(templateId);
  const tempFile = templateFile.makeCopy(`temp_${fileName}`, folder);

  try {
    // 2. Replace Placeholders: open copied document, read body, and replaceText()
    const doc = DocumentApp.openById(tempFile.getId());
    const body = doc.getBody();

    for (const [key, val] of Object.entries(mergedEntry)) {
      const placeholder = `\\{\\{${key}\\}\\}`;
      let finalVal = val;
      if (key === 'marcaTemporal') {
        finalVal = parseMarcaTemporal(finalVal);
      }
      const replacement = finalVal !== undefined && finalVal !== null ? String(finalVal) : "";
      body.replaceText(placeholder, replacement);
    }

    // Clean unresolved double curly brace placeholders
    body.replaceText('\\{\\{\\w+\\}\\}', '');

    // 3. Save and Convert: call saveAndClose() to apply changes
    doc.saveAndClose();

    // Generate the PDF blob
    const pdfBlob = tempFile.getAs('application/pdf').setName(pdfName);

    // Overwrite existing PDF with the same name in the target folder
    const existingFiles = folder.getFilesByName(pdfName);
    while (existingFiles.hasNext()) {
      existingFiles.next().setTrashed(true);
    }

    // 4. Save the PDF: createFile() in desired folder
    const pdfFile = folder.createFile(pdfBlob);
    return pdfFile;
  } finally {
    // 5. Cleanup: Delete or trash the temporary Google Doc copy
    tempFile.setTrashed(true);
  }
}
