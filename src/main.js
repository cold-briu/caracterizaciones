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

    // Get or create the results folder for today's execution
    const resultsFolder = getOrCreateResultsFolder(CONFIG.masterResultsDirName, CONFIG.dailyResultsDirName);

    if (CONFIG.useGoogleDocTemplate) {
        // Save each record as a PDF using the Google Doc template
        for (const record of mergedRecords) {
            saveDocTemplateAsPdf(CONFIG.docTemplateId, record, CONFIG.foreignKey, resultsFolder);
        }
    } else {
        const htmlTemplates = mergedRecords.map(record => createHtmlTemplateFromSchema(CONFIG.sheets, record));
        // Save each template as a PDF in the results folder using HTML
        htmlTemplates.forEach((htmlContent, index) => {
            const record = mergedRecords[index];
            saveHtmlAsPdf(htmlContent, record, CONFIG.foreignKey, resultsFolder);
        });
    }
}