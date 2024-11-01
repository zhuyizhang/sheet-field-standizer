import { SheetParser } from "./sheetParser.js";
import { FieldMap } from "./fieldMap.js";
import _ from "lodash";
import papaparse from "papaparse";

export class SheetFieldStdizer extends SheetParser {
  fieldMap;
  fieldMapConfig;


  /**
   * @param {string|File} file - The input can be a file path as a string or an HTML5 File object for the input spreadsheet.
   * @param {string|File|FieldMap} fieldMapFile - The input can be a file path as a string or an HTML5 File object for the field-map JSON file, or a FieldMap instance.
   */
  constructor(file, fieldMapFile = undefined) {
    super(file);
    if (fieldMapFile === undefined) { return; }
    if (fieldMapFile instanceof FieldMap) {
      this.fieldMap = fieldMapFile;
    } else if (typeof fieldMapFile === "string" || fieldMapFile instanceof File) {
      this.fieldMap = new FieldMap(fieldMapFile);
    } else {
      throw new Error("fieldMapFile must be a FieldMap instance or a file path.");
    }
  }

  /**
   * Sets the field map for the SheetFieldStdizer instance.
   * @param {FieldMap} fieldMap - The FieldMap instance to be set.
   * @throws {Error} If the input is not a FieldMap instance.
   */
  async setFieldMap(fieldMap) {
    if (!(fieldMap instanceof FieldMap)) {
      throw new Error("Input must be a FieldMap instance.");
    }
    this.fieldMap = fieldMap;
    await this.determineFieldMapConfig();
    return this;
  }

  /**
   * Do such initializations:
   * 1. Get file informations (name, extension, encoding, codepage...)
   * 2. Open workbook and worksheet using XLSX toolkit.
   * 3. Copy the lines as array-of-array to self.lines.
   * 4. Initialize self.fieldMap, determine the applied field-map.
   * @returns {Promise<this>}
   */
  async initializeAsync() {
    await super.initializeAsync();
    if (this.fieldMap) {
      await this.fieldMap.initializeAsync();
      //await this.fieldMap.determineFieldMap(this.fileName); //3个属性：abbreviation, fullName, fieldMap 之后迁移到此类里。
      await this.determineFieldMapConfig();
    }
    return this;
  }
  async determineFieldMapConfig() {
    this.fieldMapConfig = await this.fieldMap.determineFieldMap(this.fileName);
  }

  async determineFieldMap(sheetNames = undefined) {
    if (!this.fieldMapConfig) {
      await this.determineFieldMapConfig();
    }

    const sheetsToProcess = sheetNames
      ? (Array.isArray(sheetNames) ? sheetNames : [sheetNames])
      : this.sheetsNames;

    for (const sheetName of sheetsToProcess) {
      const sheet = this.sheets[sheetName];

      if (!sheet || sheet.invalid) {
        console.warn(`Sheet "${sheetName}" is invalid or does not exist.`);
        continue;
      }

      if (!sheet.bodyAsObj) {
        sheet.parseOfDataBodyAndFields();
      }

      if (!sheet.fieldMap) {
        sheet.determineFieldMap(this.fieldMapConfig.fieldMapApplicable);
      }
    }
    return this;
  }
  /**
   * Standardizes fields for one or more sheets in the workbook.
   * @param {string|string[]|undefined} sheetNames - The name(s) of the sheet(s) to standardize. If undefined, all sheets will be processed.
   * @returns {this} The current instance of SheetFieldStdizer.
   */
  doFieldStandardize(sheetNames = undefined) {

    const sheetsToProcess = sheetNames
      ? (Array.isArray(sheetNames) ? sheetNames : [sheetNames])
      : this.sheetsNames;

    for (const sheetName of sheetsToProcess) {
      const sheet = this.sheets[sheetName];

      if (!sheet || sheet.invalid) {
        console.warn(`Sheet "${sheetName}" is invalid or does not exist.`);
        continue;
      }

      if (!sheet.bodyAsObj) {
        sheet.parseOfDataBodyAndFields();
      }
      if (!sheet.fieldMap) {
        sheet.determineFieldMap(this.fieldMapConfig.fieldMapApplicable);
      }
      if (!sheet.standardFieldsDataAsObj) {
        sheet.standardFieldsDataAsObj = sheet.getStandardFieldsDataAsObj();
      }
      if (!sheet.standardFieldsLines) {
        sheet.standardFieldsLines = sheet.getStandardFieldsLines();
      }
    }

    return this;
  }

  exportStandardLinesAsWorkbook(path = undefined, sheetName) {
    this.exportAsWorkbook(this.sheets[sheetName].standardFieldsLines, path);
  }

  async exportStandardLinesAsCsvAsync(path = undefined, append = false, sheetName) {
    const skipFirstLine = append;
    await this.exportAsCsvAsync(this.sheets[sheetName].standardFieldsLines, path, append, skipFirstLine);
  }

  exportAsBlobCsv_browser(dataAOA, fileName) {
    const csvString = papaparse.unparse(dataAOA);
    const file = new File([csvString], `${fileName}.csv`, { type: 'text/csv' });
    return file;
  }
  exportStandardLinesAsBlobCsv_browser(sheetName = undefined) {
    if (!sheetName) {
      sheetName = this.sheetsNames[0];
    }
    const dataAOA = this.sheets[sheetName].standardFieldsLines;
    const fileName = `${this.fileNameWithoutExtension}_standardized`;
    const csvString = papaparse.unparse(dataAOA);
    const file = new File([csvString], `${fileName}.csv`, { type: 'text/csv' });
    return file;
  }
  getStandardLinesAsCsvString(sheetName = undefined, skipFirstLine = false) {
    if (!sheetName) {
      sheetName = this.sheetsNames[0];
    }
    let dataAOA = this.sheets[sheetName].standardFieldsLines;
    if (skipFirstLine) {
      dataAOA.shift();
    }
    return papaparse.unparse(dataAOA);
  }
}
