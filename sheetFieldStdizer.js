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
  setFieldMap(fieldMap) {
    if (!(fieldMap instanceof FieldMap)) {
      throw new Error("Input must be a FieldMap instance.");
    }
    this.fieldMap = fieldMap;
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
    return new Promise(async (resolve, reject) => {
      await super.initializeAsync();
      if (this.fieldMap) {
        await this.fieldMap.initializeAsync();
        //await this.fieldMap.determineFieldMap(this.fileName); //3个属性：abbreviation, fullName, fieldMap 之后迁移到此类里。
        await this.determineFieldMapConfig();
      }
      resolve(this);
    });
  }
  async determineFieldMapConfig() {
    this.fieldMapConfig = await this.fieldMap.determineFieldMap(this.fileName);
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
        this.parseOfDataBodyAndFields(sheetName);
      }
      if (!sheet.standardFieldsDataAsObj) {
        sheet.standardFieldsDataAsObj = this.#getStandardFieldsDataAsObj(sheet);
      }
      if (!sheet.standardFieldsLines) {
        sheet.standardFieldsLines = this.#getStandardFieldsLines(sheet);
      }
    }

    return this;
  }
  /**
   * Extract wanted columns from head and body, according to the map.
   * @param {Sheet} sheet - A Sheet instance from sheet.js
   * @return {Object} field_std_dict - An object containing standardized field data
   */
  #getStandardFieldsDataAsObj(sheet) {
    let field_std_dict = {};
    const fieldMap = this.fieldMapConfig.fieldMapApplicable;

    // 表头
    if (fieldMap["head"]) {
      for (let [k, v] of Object.entries(fieldMap["head"])) {
        if (v in sheet.headAndTailAsObj) {
          field_std_dict[k] = Array(sheet.bodyDataLength).fill(
            sheet.headAndTailAsObj[v]
          );
        } else if (v.includes("None") || v === "") {
          field_std_dict[k] = Array(sheet.bodyDataLength).fill(null);
        } else {
          throw new Error(
            `发生了错误！标准字段名'${k}'对应的原表字段名'${v}'未找到。请更新字段映射表。`
          );
        }
      }
    }
    // 表体
    for (let [k, v] of Object.entries(fieldMap["body"])) {
      if (Array.isArray(v)) {
        let arrays = v.map((_v) => sheet.bodyAsObj[_v]);
        field_std_dict[k] = arrays[0].map((_, i) =>
          arrays.map((array) => array[i]).join("|")
        );
      } else if (v in sheet.bodyAsObj) {
        field_std_dict[k] = sheet.bodyAsObj[v];
      } else if (v[0] === "$") {
        const fieldName = v.slice(1);
        field_std_dict[k] = Array(sheet.bodyDataLength).fill(
          this.hasOwnProperty(fieldName) ? this[fieldName] : null
        );
      } else if (v.slice(0, 3) === "=~~") {
        let patterns = v.slice(3).split("|");
        let arrays = Object.keys(sheet.bodyAsObj)
          .filter((field_name) =>
            patterns.some((pattern) => field_name.includes(pattern))
          )
          .map((field_name) => sheet.bodyAsObj[field_name]);
        field_std_dict[k] = arrays[0].map((_, i) =>
          arrays.map((array) => array[i]).join("|")
        );
      } else if (v.includes("None") || v === "") {
        field_std_dict[k] = Array(sheet.bodyDataLength).fill(null);
      } else {
        throw new Error(
          `发生了错误！账单文件{${this.fileName}}\n字段映射规则${this.fieldMapConfig.abbreviation} \n${this.fieldMapConfig.fullName}\n${this.fieldMapConfig.fieldMapApplicable}\n标准字段名'${k}'对应的原表字段名'${v}'未找到。请更新字段映射表。`
        );
      }
    }
    // console.log('STD_DICT', field_std_dict);
    sheet.logFieldObjDataSummary(field_std_dict, "已构建标准字段数据：");
    return field_std_dict;
  }

  #getStandardFieldsLines(sheet) {
    /**
     * Convert this.field_std_dict (dictionaries) to this.field_std_lines (list of lines).
     * @return {Array} field_std_lines
     */

    // Initialize field_std_lines with keys from field_std_dict
    let field_std_lines = [Object.keys(sheet.standardFieldsDataAsObj)];

    // Transpose the values of field_std_dict using zip_longest
    let values = Array.from(
      _.zip(...Object.values(sheet.standardFieldsDataAsObj), { fillvalue: null })
    ).map((arr) => arr.filter((item) => item !== undefined));

    // Append transposed values to field_std_lines
    field_std_lines.push(...values);

    console.log(
      "已生成<字段标准化的文本行列表>，存于self.field_std_lines，待写入csv文件。"
    );
    console.log("STD_LINES 前5行", field_std_lines.slice(0, 5));
    return field_std_lines;
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
