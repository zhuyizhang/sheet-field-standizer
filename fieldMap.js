import * as fs from "fs";
import readline from "readline";
import { commonUtils } from "./utilities/index.js";
export class FieldMap {
  // 以下为加载字段映射文件后得到。
  fileInput;
  env;
  fileName;
  filePath;
  html5File;
  fieldMaps;
  abbreviationSet;
  standardFields;
  // 以下为结合被解析文件确定，是被解析文件的属性
  abbreviation;
  fullName;
  fieldMap;
  /**
   * @param {string|File} file - The input can be a file path as a string or an HTML5 File object.
   */
  constructor(file, env = undefined) {
    this.fileInput = file;
    this.env = env || commonUtils.detectEnvironment();
  }

  async initializeAsync() {
    await this.#validateFile();

    return new Promise((resolve, reject) => {
      if (this.env === "node") {
        try {
          this.fieldMaps = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
          this.abbreviationSet = this.getAbbreviationSetFromFieldMaps(this.fieldMaps);
          this.standardFields = this.getStandardFieldsFromFieldMaps(this.fieldMaps);
          return resolve(this);
        } catch (error) {
          return reject(error);
        }
      }
      else if (this.env === "browser") {
        // Read the JSON file in browser environment
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            this.fieldMaps = JSON.parse(event.target.result);
            this.abbreviationSet = this.getAbbreviationSetFromFieldMaps(this.fieldMaps);
            this.standardFields = this.getStandardFieldsFromFieldMaps(this.fieldMaps);
            return resolve(this);
          } catch (error) {
            console.error('Error parsing JSON:', error);
            return reject(new Error('Invalid JSON file'));
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(this.html5File);
      }
      else {
        return reject(new Error('Unknown environment! Neither node nor browser.'));
      }
    });
  }

  async #validateFile() {
    const file = this.fileInput;
    if (this.env == "node") {
      const { nodeSpecificUtils } = await import("./utilities/index.js");
      if (!nodeSpecificUtils.isValidFilePath(file)) {
        throw new Error('Invalid input type. Expected a valid file path (string) under node environment.');
      }
      this.filePath = file;
      this.fileName = commonUtils.extractFileName(file);
    }
    else if (this.env == "browser") {
      if (!(file instanceof File)) {
        throw new Error('Invalid input type. Expected an HTML5 File object under browser environment.');
      }
      this.html5File = file;
      this.fileName = file.name;
    }
    else {
      throw new Error('Unknow environment! Neither node nor browser.')
    }
    // Check if the file extension is JSON
    const fileExtension = commonUtils.getFileExtension(this.fileName);
    if (fileExtension.toLowerCase() !== 'json') {
      throw new Error('Invalid file type. Expected a JSON file.');
    }
  }

  getStandardFieldsFromFieldMaps(fieldMaps) {
    return Object.values(fieldMaps[2]).flat();
  }

  getAbbreviationSetFromFieldMaps(fieldMaps) {
    return new Set(Object.keys(fieldMaps[0]));
  }

  /**
   * Determine the abbreviation and fullname of the applicable map for the instance.
   * @param {string} fileName - The name of the file to determine the field map for.
   * @returns {Promise<this>} A promise that resolves with [abbreviation, full_name, field_map].
   */
  determineFieldMap(fileName) {
    return new Promise(async (resolve, reject) => {
      try {
        // Determine which abbreviation is included in the file name as the abbreviation for this file.
        let abbreviation;
        if (this.env === "node") {
          abbreviation = await this.#determineAbbreviation_Node(fileName);
        }
        else if (this.env === "browser") {
          abbreviation = await this.#determineAbbreviation_Browser(fileName);
        }

        // Based on the abbreviation of this file, load the applicable field mapping rules.
        const fullName = this.fieldMaps[0][abbreviation];
        const fieldMapApplicable = this.fieldMaps[1][fullName];

        console.log(
          `已加载<字段映射表>\n已解析<本表对象的全名>为：'${fullName}'，\n已解析<本表对象的字段映射规则>：`,
          fieldMapApplicable
        );

        resolve({ abbreviation, fullName, fieldMapApplicable });
        // [this.abbreviation, this.fullName, this.fieldMap] = [
        //   abbreviation,
        //   fullName,
        //   fieldMapResult,
        // ];

        // // Resolve the promise with the results
        // resolve(this);
      } catch (error) {
        // Reject the promise if there is an error
        console.log()
        reject(error);
      }
    });
  }

  /**
   * Determine the abbreviation of the instance, for further selection of applicable map.
   * @param {Set} abbreviationSet - Set of abbreviation strings.
   * @returns {Promise<string>} - A Promise resolving to the determined abbreviation.
   */
  #determineAbbreviation_Node(fileName) {
    return new Promise((resolve, reject) => {
      let abbreviation = null;

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      for (const item of this.abbreviationSet) {
        if (fileName.includes(item)) {
          abbreviation = item;
          console.log(`已解析<本表对象的简称>为：'${abbreviation}'`);
          rl.close();
          resolve(abbreviation);
          return;
        }
      }

      rl.question(
        `未从文件名'${fileName}'中解析到<本表对象的简称>，请录入：`,
        (input) => {
          abbreviation = input;
          rl.close();
          resolve(abbreviation);
        }
      );
    });
  }

  #determineAbbreviation_Browser(fileName) {
    for (const item of this.abbreviationSet) {
      if (fileName.includes(item)) {
        const abbreviation = item;
        console.log(`已解析<本表对象的简称>为：'${abbreviation}'`);
        return abbreviation;
      }
    }
    throw new Error(`未从文件名'${fileName}'中解析到<本表对象的简称>，请修改文件名！`);
  }
}


export class MappedActualField {
  type;
  rules;
  fieldIndices;
  value;
  standardFieldName;
  sheetObjectFieldsNames;

  constructor({type, rules, fieldIndices, value, standardFieldName, sheetObjectFieldsNames}) {
    this.type = type;
    this.rules = rules;
    this.fieldIndices = fieldIndices;
    this.value = value;
    this.standardFieldName = standardFieldName;
    this.sheetObjectFieldsNames = sheetObjectFieldsNames;
  }

  get fieldNames() {
    return this.fieldIndices.map((index) => this.sheetObjectFieldsNames[index]);
  }

  setFieldIndices(fieldIndices) {
    this.fieldIndices = fieldIndices;
    this.type = "fields";
    this.value = null;
  }

  setHeadValue(value) {
    this.value = value;
    this.type = "head";
    this.fieldIndices = null;
  }
}