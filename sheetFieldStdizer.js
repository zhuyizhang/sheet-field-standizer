import { SheetParser } from "./sheetParser.js";
import { FieldMap } from "./fieldMap.js";
import _ from "lodash";
import papaparse from "papaparse";

export class SheetFieldStdizer extends SheetParser {
  fieldMap;
  /**
   * Configuration object for field mapping, containing the determined field map settings
   * based on the input file name. This is populated after calling determineFieldMapConfig().
   * @type {Object}
   * @property {string} abbreviation - The abbreviated name/code for the field map
   * @property {string} fullName - The complete name/description of the field map
   * @property {Object} fieldMapApplicable - The applicable field mapping rules and configurations
   */
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
   * @param {Object} [options={}] - Options for field standardization
   * @param {string|string[]} [options.sheetNames] - The name(s) of the sheet(s) to standardize. If undefined, all sheets will be processed.
   * @param {string[]} [options.skipSheetIds] - Array of sheet UIDs to skip during processing
   * @returns {this} The current instance of SheetFieldStdizer.
   */
  doFieldStandardize(options = {}) {
    const sheetNames = options.sheetNames;
    const skipSheetIds = options.skipSheetIds ?? [];

    const sheetsToProcess = (sheetNames
      ? (Array.isArray(sheetNames) ? sheetNames : [sheetNames])
      : this.sheetsNames).filter(sheetName => !skipSheetIds.includes(this.sheets[sheetName].uid));

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

  /**
   * Export standardized lines as a CSV blob file in browser environment.
   * @param {Object} options - The options for export.
   * @param {string} [options.sheetNames] - The name of the sheet to export. If not provided, will use the first sheet.
   * @param {Array<string>} [options.skipSheetIds] - Array of sheet UIDs to skip during export.
   * @param {boolean} [options.combineSheets=true] - Whether to combine all sheets into a single file. If false, each sheet will be exported as a separate file.
   * @returns {File[]} An array of File objects containing the CSV data. Returns multiple files if combineSheets is false.
   */
  exportStandardLinesAsBlobCsv_browser(options = {}) {
    let sheetNames = options.sheetNames;
    const skipSheetIds = options.skipSheetIds ?? [];
    const combineSheets = options.combineSheets ?? true;

    if (!sheetNames) {
      sheetNames = [this.sheetsNames[0]];
    }
    sheetNames = sheetNames.filter(sheetName => !skipSheetIds.includes(this.sheets[sheetName].uid));
    if (sheetNames.length === 0) {
      throw new Error(`At least one sheet must be provided.`);
    }


    // 每个sheet 1个文件导出
    if (combineSheets === false) {
      const files = sheetNames.map((sheetName, i) => {
        const dataAOA = this.sheets[sheetName].standardFieldsLines;
        const fileName = `${this.fileNameWithoutExtension}_${sheetName}_standardized`;
        const csvString = papaparse.unparse(dataAOA);
        const file = new File([csvString], `${fileName}.csv`, { type: 'text/csv' });
        return file;
      });
      return files;
    }
    // 所有sheet合并导出
    const dataAoaCombined = sheetNames.map((sheetName, i) => {
      if (i === 0) {
        return this.getStandardLinesAsCsvString(sheetName, false, true);
      } else {
        return this.getStandardLinesAsCsvString(sheetName, true, true);
      }
    }).flat();
    const csvString = papaparse.unparse(dataAoaCombined);
    const file = new File([csvString], `${this.fileNameWithoutExtension}_standardized.csv`, { type: 'text/csv' });
    return [file];
  }

  getStandardLinesAsCsvString(sheetName = undefined, skipFirstLine = false, sheetNameColumn = false) {
    if (!sheetName) {
      sheetName = this.sheetsNames[0];
    }
    let dataAOA = this.sheets[sheetName].standardFieldsLines;

    if (sheetNameColumn) {
      for (let i = 0; i < dataAOA.length; i++) {
        if (i === 0) {
          dataAOA[i].push("sheetName");
        } else {
          dataAOA[i].push(sheetName);
        }
      }
    }
    if (skipFirstLine) {
      dataAOA.shift();
    }

    return papaparse.unparse(dataAOA);
  }

  setFieldIndices(sheetName, standardFieldName, fieldIndices) {
    this.sheets[sheetName].setFieldIndices(standardFieldName, fieldIndices);
  }

  setHeadValue(sheetName, standardFieldName, value) {
    this.sheets[sheetName].setHeadValue(standardFieldName, value);
  }
}
