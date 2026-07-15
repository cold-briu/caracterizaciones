// Version: 1.0.15

// --- File: config.js ---
const CONFIG = {
  foreignKey: "documento",
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

    console.log(JSON.stringify(mergedRecords, null, 2));
}
