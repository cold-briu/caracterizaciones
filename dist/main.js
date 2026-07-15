// Version: 1.0.6
function generateResultsPDF() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const interviewSheet = ss.getSheetByName(CONFIG.sheets.demografica.name);
    const physicalSheet = ss.getSheetByName(CONFIG.sheets.fisica.name);

    // Skip headers (row 0) and get data
    const interviewData = interviewSheet.getDataRange().getValues().slice(1);
    const physicalData = physicalSheet.getDataRange().getValues().slice(1);

    const interviewRecords = mapRowsToObjects(interviewData, CONFIG.sheets.demografica.columns);
    const physicalRecords = mapRowsToObjects(physicalData, CONFIG.sheets.fisica.columns);
}