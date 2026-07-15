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
