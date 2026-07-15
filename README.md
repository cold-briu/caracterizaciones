# Characterizations

This application handles generic data processing and document generation workflows:
- 📊 **Spreadsheet Consolidation**: Automates the consolidation of data from multiple source sheets within Google Sheets.
- 🔗 **Record Linking**: Merges rows across different sheets using a common unique identifier or key field.
- 📄 **Document Generation**: Generates individual document reports using a lightweight, customizable HTML template.
- 📁 **Automated Storage**: Saves the generated documents as PDFs inside structured folders in Google Drive, organized by execution date.

### Clinical Application
In this repository, the workflow is configured to generate clinical records:
- 🩺 **Clinical Data**: Merges separate demographic and physical/medical evaluation sheets.
- 🆔 **Patient Linking**: Matches patient records using their unique document identifier.
- 📋 **Medical Reports**: Formats the consolidated data into structured clinical evaluation reports.
- 📂 **Patient Archiving**: Stores the patient PDF reports in dated folders for medical record-keeping.


## Google Drive Setup & Behavior

The application automatically manages the results directory structure in Google Drive as follows:

1. **Spreadsheet Context**: The active Google Spreadsheet must be located inside a Google Drive folder (it uses the spreadsheet's parent folder as the base directory).
2. **Master Folder**: The script creates or retrieves a master folder named after `CONFIG.masterResultsDirName` (default: `Resultados`) as a sibling to the spreadsheet.
3. **Daily Folders**: Inside the master folder, the script creates/retrieves a daily subdirectory named using `CONFIG.dailyResultsDirName` and the current date (formatted as `Resultados_YYYY-MM-DD`).
4. **PDF Storage**: All generated PDF files (`PatientName_DocumentID.pdf`) are saved directly inside this daily directory.

## Development & Lifecycle

### 0. Initial Setup & Clasp Configuration
Before working on the project, link it to your Google Apps Script using clasp:
- Run `clasp clone <scriptId>` to clone the remote project, or place your own `.clasp.json` in the root.
- **Git Ignore**: The `.clasp.json` file is ignored in `.gitignore` to prevent script IDs and environment configuration from being committed.

### 1. Code Modifications
All active development happens in the `src/` directory:
- JavaScript logic resides in `src/*.js`.
- The HTML report template resides in `src/template.html`.

### 2. Build Process
Run the build script to bundle files and inject the HTML template:
```bash
npm run build
```
This generates the final bundled code inside `dist/dist.js` and copies `.clasp.json` to the `dist/` directory.

### 3. Deploying
To increment the package version, run the build, and push to Google Apps Script in one command:
```bash
npm run deploy
```
This increments the patch version in `package.json`, runs `npm run build`, and then calls `clasp push -f` from the `dist/` directory to deploy the code.

## Manual Updates Upon Schema Changes

If the Google Sheets schemas or column headers change, the following elements in the application are **not dynamic** and must be updated manually:

1. **`src/config.js`**:
   - Update the column mappings (`columns`) for each sheet schema with their new indices.
   - Update the `foreignKey` property if the key used to merge rows (e.g. `documento`) changes.

2. **`src/template.html`**:
   - The HTML report structure is statically designed to match a clinical format. If fields are added, renamed, or removed, you must manually edit the HTML placeholders (`{{placeholderName}}`) and labels (e.g. updating `{{Edad}}`, `{{umbral}}`, `{{Nombre}}`, `{{marcaTemporal}}`).

3. **`src/utils.js` (`saveHtmlAsPdf`)**:
   - The PDF naming logic specifically references `mergedEntry.Nombre`. If the patient name column header/key is renamed, update this reference in `saveHtmlAsPdf` accordingly to ensure filenames are generated correctly.

