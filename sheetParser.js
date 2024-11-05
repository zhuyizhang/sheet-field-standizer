import XLSX from "xlsx";
//https://docs.sheetjs.com/docs/demos/frontend/bundler/webpack#commonjs-and-esm
import { set_cptable } from "xlsx";
import * as cptable from 'xlsx/dist/cpexcel.full.mjs';
set_cptable(cptable);

import { Sheet } from "./sheet.js";
import {
  commonUtils
} from "./utilities/index.js";

export class SheetParser {
  env; // "node" or "browser"
  fileInput;
  filePath;
  html5File;

  fileName;
  /**
   * @type {Object}
   * @description
   * @property {string} extension - file extension
   * @property {string} extensionType - file extension type
   * @property {string} bom - for excel extensions, it is null; for csv, try to detect bom ('UTF-8' or null)
   * @property {string} encoding - for csv and bom being null, try to detect encoding
   * @property {number} codepage - codepage of the encoding
   */
  fileInfo;
  /**
   * @type {external:XLSX.Workbook}
   */
  workbook;
  /**
   * @type {Array<Array<string>>}
   */
  /**
   * @type {Object.<string, Sheet>}
   * @description An object where keys are sheet names and values are instances of the Sheet class representing the parsed sheet data and metadata for each sheet.
   */
  sheets;
  sheetsNames;
  /**
   * @param {string|File} file - The input can be a file path as a string or an HTML5 File object.
   */
  constructor(file) {
    this.env = commonUtils.detectEnvironment();
    this.fileInput = file;
  }
  /**
   * Do such initializations:
   * 1. Get file informations (name, extension, encoding, codepage...)
   * 2. Open workbook and worksheet using XLSX toolkit.
   * 3. Copy the lines as array-of-array to self.lines.
   * 
   * @returns {Promise<this>} The current instance.
   */
  async initializeAsync() {
    await this.#validateFile();
    await this.#environmentSpecificImport();
    return new Promise(async (resolve, reject) => {
      try {
        this.fileInfo = await this.#getFileInfo();
        // 一般情况都用XLSX读取文件，获得data aoa。
        if (this.env == "node" || ["xlsx", "xls"].includes(this.fileInfo.extension)) {
          this.workbook = await this.#openWorkbook();
          this.sheets = {};
          for (const sheetName of this.workbook.SheetNames) {
            const worksheet = this.#openWorksheet(this.workbook, sheetName);
            const lines = this.#sheetToArrayOfArray(worksheet);
            this.sheets[sheetName] = new Sheet(lines, sheetName, this.fileInfo.extensionType, this);
            
          }
          this.sheetsNames = Object.keys(this.sheets);
          resolve(this);
        }
        // 只有在browser+text file情况下，XLSX库encoding有问题，改用papaparse库。
        else if (this.env == "browser" && ["csv", "tsv"].includes(this.fileInfo.extension)) {
          const Papa = await import("papaparse");
          const self = this;
          Papa.parse(this.html5File, {
            encoding: this.fileInfo.encoding || undefined,
            complete: function (results) {
              self.sheets = {};
              self.sheets["sheet1"] = new Sheet(results.data, "sheet1", self.fileInfo.extensionType, this);
              self.sheetsNames = Object.keys(self.sheets);
              resolve(self);
            },
            error: function(error) {
              reject(error);
            }
          });
        } else {
          reject(new Error("Unsupported file type or environment"));
        }
      } catch (error) {
        reject(error);
      }
    });
  }
  /**
   * 导入node环境下的module: fs。
   */
  async #environmentSpecificImport() {
    // https://docs.sheetjs.com/docs/getting-started/installation/nodejs#esm-import
    if (this.env == "node") {
      const fs = await import("fs");
      XLSX.set_fs(fs);
    }
  }
  /**
   * 校验文件
   * 1. 在node环境下，校验类的入参是否为string, 且filepath是否存在。
   * 2. 在browser环境下，校验类的入参是否是h5File。
   * 3. 并填充this.filePath/ fileName/ html5File。
   * 4. 否则报错。
   */
  async #validateFile() {
    const file = this.fileInput;
    if (this.env == "node") {
      const { nodeSpecificUtils } = await import("./utilities/index.js");
      if (!nodeSpecificUtils.isValidFilePath(file)) {
        throw new Error('Invalid input type. Expected a valid file path (string) under node environment.');
      }
      this.filePath = file;
      this.fileName = commonUtils.extractFileName(file);
      this.fileNameWithoutExtension = commonUtils.removeFileExtension(this.fileName);
    }
    else if (this.env == "browser") {
      if (!(file instanceof File)) {
        throw new Error('Invalid input type. Expected an HTML5 File object under browser environment.');
      }
      this.html5File = file;
      this.fileName = file.name;
      this.fileNameWithoutExtension = commonUtils.removeFileExtension(this.fileName);
    }
    else {
      throw new Error('Unknow environment! Neither node nor browser.')
    }
  }

  parseOfDataBodyAndFields(sheetNames) {
    if (typeof sheetNames === 'string') {
      // Single sheet name
      if (this.sheets[sheetNames]) {
        this.sheets[sheetNames].parseOfDataBodyAndFields();
      } else {
        throw new Error(`Sheet "${sheetNames}" not found`);
      }
    } else if (Array.isArray(sheetNames)) {
      // Array of sheet names
      sheetNames.forEach(name => {
        if (this.sheets[name]) {
          this.sheets[name].parseOfDataBodyAndFields();
        } else {
          console.warn(`Sheet "${name}" not found`);
        }
      });
    } else if (sheetNames === undefined) {
      // No input, process all sheets
      Object.values(this.sheets).forEach(sheet => {
        sheet.parseOfDataBodyAndFields();
      });
    } else {
      throw new Error('Invalid input. Expected a string, an array of strings, or undefined.');
    }

    return this; // Return the SheetParser instance
  }


  /**
   * Export data (aoa) to an excel workbook.
   * @returns {string} exported file path
   */
  exportAsWorkbook(dataAOA, path = "export.xlsx") {
    const worksheet = XLSX.utils.aoa_to_sheet(dataAOA);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    const writeFileOption = {
      compression: true,
    };

    XLSX.writeFile(workbook, path, writeFileOption);
  }

  async exportAsCsvAsync(dataAOA, path = "export.csv", append = false, skipFirstLine = false) {
    if (skipFirstLine) {
      dataAOA = dataAOA.slice(1);
    }
    if (this.env == "node") {
      const { nodeSpecificUtils } = await import("./utilities/index.js");
      await nodeSpecificUtils.writeCSVAsync(dataAOA, path, append);
    }
    else {
      console.log("待补充html的导出。")
    }
  }

  async #getFileInfo() {
    const extension = commonUtils.getFileExtension(this.fileName);
    const extensionType = commonUtils.extensionToExtensionType[extension];
    let bom = null;
    let encoding = null;
    let codepage = null;

    if (extensionType == "text") {
      if (this.env == "node") {
        const { nodeSpecificUtils } = await import("./utilities/index.js");
        bom = nodeSpecificUtils.detectBOM(this.filePath);
        if (bom === null) {
          encoding = await nodeSpecificUtils.determineTextFileEncoding(this.filePath);
          codepage = commonUtils.encodingToCodePage[encoding];
        }
      }
      else if (this.env == "browser") {
        bom = await commonUtils.detectBOM(this.html5File);
        if (bom === null) {
          encoding = await commonUtils.determineTextFileEncoding(this.html5File);
          codepage = commonUtils.encodingToCodePage[encoding];
        }
      }
    }
    return { extension, extensionType, bom, encoding, codepage };
  }

  async #openWorkbook() {
    // 用XLSX打开工作簿。
    let workbook = null;
    let buffer = null;
    let XLSXReadOptions = {};
    const codepage = this.fileInfo.codepage;

    if (this.env == "node") {
      // node API, need dynamic import
      const { nodeSpecificUtils } = await import("./utilities/index.js");
      // node_buffer
      buffer = await nodeSpecificUtils.readFile(this.filePath);
      // 配置XLSX读取文件的options
      XLSXReadOptions = { type: "buffer" };
    } else if (this.env == "browser") {
      // File.arraybuffer
      buffer = await this.html5File.arrayBuffer();
      // 配置XLSX读取文件的options
      XLSXReadOptions = { type: "array" };
    }
    if (codepage) {
      XLSXReadOptions.codepage = codepage;
    }
    // XLSX读取文件
    workbook = XLSX.read(buffer, XLSXReadOptions);
    return workbook;
  }

  #openWorksheet(workbook, sheetName) {
    if (!workbook.SheetNames.includes(sheetName)) {
      throw new Error(`Sheet "${sheetName}" not found in the workbook.`);
    }
    return workbook.Sheets[sheetName];
  }

  #sheetToArrayOfArray(worksheet) {
    // 合并单元格情况，XLSX会默认填充每一子格，干扰首尾行的判断。
    // 故凡合并单元格的，仅在左上角单元格保留其值，其余格删除。
    if (worksheet["!merges"] && worksheet["!merges"].length > 0) {
      this.#deleteRedundantMergeCells(worksheet);
    }
    //option doc见https://docs.sheetjs.com/docs/api/utilities/array
    const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
    return aoa;
  }



  /**
   * Delete redundant merge cells from a XLSX.Worksheet.
   * @param {external:XLSX.Worksheet} worksheet - The worksheet within which redundant merge cells will be deleted.
   * @returns {void}
   */
  #deleteRedundantMergeCells(worksheet) {
    worksheet["!merges"].forEach((merge) => {
      // example
      // merge:{s:{c:2, r:4}, e:{c:3, r:5}}
      const columnRange = commonUtils.range(merge.s.c, merge.e.c);
      // [C,D]
      const columnRangeEncoded = columnRange.map((i) =>
        XLSX.utils.encode_col(i)
      );
      const rowRange = commonUtils.range(merge.s.r, merge.e.r);
      // [4,5]
      const rowRangeEncoded = rowRange.map((i) => XLSX.utils.encode_row(i));
      // [C4, C5, D4, D5]
      const mergedCellsEncoded = commonUtils.getMatrixFromTwoArray(
        columnRangeEncoded,
        rowRangeEncoded
      );
      // delete value of C5, D4, D5
      mergedCellsEncoded.slice(1).forEach((i) => {
        delete worksheet[i];
      });
    });
  }

  

}
