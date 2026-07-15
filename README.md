# Caracterizaciones
Esta aplicación automatiza la consolidación de información proveniente de múltiples hojas de cálculo (demográfica y física) dentro de Google Sheets, vinculando los registros mediante un campo común (e.g. documento). A partir de la información combinada, genera reportes individuales con formato clínico/médico utilizando una plantilla HTML ligera y los guarda automáticamente en formato PDF dentro de carpetas organizadas por fecha de ejecución en Google Drive.

## Manual Updates Upon Schema Changes

If the Google Sheets schemas or column headers change, the following elements in the application are **not dynamic** and must be updated manually:

1. **`src/config.js`**:
   - Update the column mappings (`columns`) for each sheet schema with their new indices.
   - Update the `foreignKey` property if the key used to merge rows (e.g. `documento`) changes.

2. **`src/template.html`**:
   - The HTML report structure is statically designed to match a clinical format. If fields are added, renamed, or removed, you must manually edit the HTML placeholders (`{{placeholderName}}`) and labels (e.g. updating `{{Edad}}`, `{{umbral}}`, `{{Nombre}}`, `{{marcaTemporal}}`).

3. **`src/utils.js` (`saveHtmlAsPdf`)**:
   - The PDF naming logic specifically references `mergedEntry.Nombre`. If the patient name column header/key is renamed, update this reference in `saveHtmlAsPdf` accordingly to ensure filenames are generated correctly.

## Google Drive Setup & Behavior

The application automatically manages the results directory structure in Google Drive as follows:

1. **Spreadsheet Context**: The active Google Spreadsheet must be located inside a Google Drive folder (it uses the spreadsheet's parent folder as the base directory).
2. **Master Folder**: The script creates or retrieves a master folder named after `CONFIG.masterResultsDirName` (default: `Resultados`) as a sibling to the spreadsheet.
3. **Daily Folders**: Inside the master folder, the script creates/retrieves a daily subdirectory named using `CONFIG.dailyResultsDirName` and the current date (formatted as `Resultados_YYYY-MM-DD`).
4. **PDF Storage**: All generated PDF files (`PatientName_DocumentID.pdf`) are saved directly inside this daily directory.

