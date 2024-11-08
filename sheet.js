import {
    commonUtils
} from "./utilities/index.js";
import _ from "lodash";
import { v4 as uuidv4 } from 'uuid';
import { MappedActualField } from "./fieldMap.js";
/**
 * Represents a sheet with its data and metadata.
 */
export class Sheet {

    /** @type {string} The unique identifier of the sheet */
    uid;

    /** @type {string} The name of the sheet */
    sheetName;
    /** @type {Array<Array<string>>} The original sheet data as an array of arrays of strings */
    lines;

    /** @type {number} The starting index of the data body (table content) */
    startLineIndex;

    /** @type {number} The ending index of the data body (table content) */
    endLineIndex;

    /** @type {Array<string>} The fields (column headers) of the data body */
    fields;

    /** @type {string} A field that should not be null, used for determine the end-line-index */
    notNullField;

    /** @type {boolean} Indicates if the next line of fields is still part of the fields (in case of merged cells */
    ifSubStartLine = false;

    /** @type {Object} Contains information from the header and footer of the sheet */
    headAndTailAsObj;

    /** @type {Object.<string, Array>} The main data of the sheet, organized by field */
    bodyAsObj;

    /** @type {number} The number of rows in the data body */
    bodyDataLength;

    /** @type {string} The file extension type */
    fileExtensionType;

    /** @type {boolean} Indicates if the sheet is invalid */
    invalid = false;

    /** @type {string|undefined} Reason for invalidity, if applicable */
    invalidReason;

    /** @type {Object} Applied field map for this sheet */
    fieldMap;

    /** @type {Object.<string, Array>} The standard fields data of the sheet, organized by field */
    standardFieldsDataAsObj;

    /** @type {Array<Array<string>>} The standard fields lines of the sheet */
    standardFieldsLines;
    /**
     * Creates a new Sheet instance.
     * @param {Array<Array<string>>} lines - The raw data of the sheet.
     * @param {string} sheetName - The name of the sheet.
     * @param {string} fileExtensionType - The file extension type.
     */
    constructor(lines, sheetName, fileExtensionType, sheetFieldStdizer = undefined) {
        this.lines = lines;
        this.sheetName = sheetName;
        this.fileExtensionType = fileExtensionType;
        this.uid = uuidv4();
        this.#validateSheet();
        this.sheetFieldStdizer = sheetFieldStdizer;
    }

    #validateSheet() {
        if (this.lines.length === 0) {
            this.invalid = true;
            this.invalidReason = "空表";
        }
    }


    /**
     * Return the index of the first line of the file body.
     * @returns {number} Index of the first line of the file body.
     */
    #getStartLineIndex() {
        // Create a shallow copy of the first 100 lines
        const lines = this.lines.slice(0, 100);

        // Create an array to store the lengths of lines after removing trailing whitespace
        const lensList = lines.map(
            (line) => commonUtils.removeLastBlankstrFromALine(line).length
        );

        // Find the index of the line with the maximum length
        const maxIndex = lensList.indexOf(Math.max(...lensList));

        // If there are differing lengths, the line with the maximum length is considered the start line
        if (Math.min(...lensList) < Math.max(...lensList)) {
            return maxIndex;
        } else {
            // If all lengths are equal, default to the first line as the start line
            return 0;
        }
    }
    /**
     * Parses the data body and fields of the sheet.
     */
    parseOfDataBodyAndFields() {
        if (this.invalid) {
            return this;
        }
        console.log(`sheet{${this.sheetName}}，开始解析【表体结构】和【字段】。`);

        this.startLineIndex = this.#getStartLineIndex();
        console.log(`已探测<表体首行>为第{${this.startLineIndex}}行`);

        this.fields = this.lines[this.startLineIndex].map((f) => f.trim());
        this.#fixCaseOfSubStartLine();
        console.log(`已解析首行的字段为:${JSON.stringify(this.fields)}`);

        this.endLineIndex = this.#getEndLineIndex();
        console.log(`已探测<表体尾行>为第{${this.endLineIndex}}行`);

        this.headAndTailAsObj = this.#getHeadTailObj();
        console.log(
            `已解析表头表尾信息为：${JSON.stringify(this.headAndTailAsObj)}`
        );

        this.bodyAsObj = this.#getBodyDict();
        this.logFieldObjDataSummary(this.bodyAsObj, "已解析表体明细数据：");

        return this;
    }

    /**
     * Logs a summary of the field object data.
     * @param {Object} fieldObjData - The field object data to summarize.
     * @param {string} words - The introductory words for the log.
     */
    logFieldObjDataSummary(fieldObjData, words) {
        console.log(words);
        Object.entries(fieldObjData).forEach(([field, arrayOfValues]) => {
            console.log(
                `\t字段名{${field}}, 值个数{${arrayOfValues.length}}, 首个值{${arrayOfValues[0]}}, 末尾值{${arrayOfValues[arrayOfValues.length - 1]}}`
            );
        });
    }


    /**
     * Process cases with subordinate start lines, usually when merging cells results in a field line occupying 2 lines.
     * @returns {void}
     */
    #fixCaseOfSubStartLine() {
        // 不可能为此情况的，直接返回
        // 1.如首行无空单元格
        let startLineBlankCellIndices = commonUtils.getBlankItems(this.fields);
        if (startLineBlankCellIndices.length === 0) {
            return;
        }
        // 2.首行即为末行的
        if (this.lines.length === this.startLineIndex) {
            return;
        }
        // 3. 次行包含数字的
        let secondLine = this.lines[this.startLineIndex + 1];
        let text = secondLine.join("");
        if (commonUtils.containsNumbers(text)) {
            return;
        }
        // 4.次行非空单元格，与首行空单元格，无交集的
        let secondLineNonBlankCellIndices = commonUtils.getBlankItems(
            secondLine,
            "indices",
            true
        );
        let intersection = startLineBlankCellIndices.filter((index) =>
            secondLineNonBlankCellIndices.includes(index)
        );
        if (intersection.length === 0) {
            return;
        }
        // Concatenate non-empty cells in the second line with corresponding empty cells in the first line
        const concatFields = Array();
        for (let i = 0; i < this.fields.length; i++) {
            if (secondLine[i] === undefined) {
                concatFields.push(this.fields[i]);
                continue;
            }
            if (this.fields[i] === undefined && i >= 1) {
                this.fields[i] = this.fields[i - 1];
            }
            const concatField = this.fields[i] + secondLine[i].trim();
            concatFields.push(concatField);
        }
        this.fields = concatFields;
        this.ifSubStartLine = true;
    }

    /**
     * Determines the end line index of the data body.
     * @returns {number} The index of the last line of the data body.
     */
    #getEndLineIndex() {
        let endLineIndex_way1;
        let endLineIndex_way2;
        // Get the lengths of lines starting from the start line index
        let lensList = this.lines
            .slice(this.startLineIndex)
            .map((line) => line.length);

        // Logic 1: Check for lines with fewer elements than the number of fields
        if (this.fileExtensionType == "excel") {
            lensList = lensList.map((len, i) =>
                len <= 10 && len < (this.fields.length - 1) ? 1 : 0
            );
        }
        else if (this.fileExtensionType == "text") {
            lensList = lensList.map((len, i) =>
                len <= 10 && len < (this.fields.length - 1) ? 1 : 0
            );
        }

        const lineIndexOfFewerElement = lensList.indexOf(1);
        if (lineIndexOfFewerElement !== -1) {
            endLineIndex_way1 = lineIndexOfFewerElement + this.startLineIndex;
        }

        // Logic 2: Locate the end line based on not null column
        let notNullColumn = this.#getNotNullColumn();
        notNullColumn = this.ifSubStartLine
            ? notNullColumn.slice(2)
            : notNullColumn;
        let blankCellIndex = notNullColumn.findIndex(
            (element) => element === "" || element === undefined || element === null
        );

        if (blankCellIndex !== -1) {
            if (!this.ifSubStartLine) {
                endLineIndex_way2 = this.startLineIndex + blankCellIndex;
            } else {
                endLineIndex_way2 = this.startLineIndex + 2 + blankCellIndex;
            }
        } else {
            endLineIndex_way2 = this.startLineIndex + notNullColumn.length;
        }

        if (endLineIndex_way2 > endLineIndex_way1) {
            return endLineIndex_way1;
        }
        return endLineIndex_way2;
    }

    /**
     * Returns the column with non-null values.
     * @returns {Array} The column with non-null values.
     */
    #getNotNullColumn() {
        let notNullField;
        if (this.notNullField === undefined) {
            notNullField = this.fields[0];
        } else {
            notNullField = this.notNullField;
        }

        let notNullColumn;
        for (let i = 0; i < this.fields.length; i++) {
            const fieldName = this.fields[i];
            if (fieldName.includes(notNullField)) {
                const bodyLines = this.lines.slice(this.startLineIndex);
                notNullColumn = bodyLines.map((line) => line[i]);
                return notNullColumn;
            }
        }
    }

    /**
     * Return a dictionary of 'head' and 'tail', with fields being keys and values being values.
     * @returns {Object} - A dictionary of 'head' and 'tail'.
     */
    #getHeadTailObj() {
        const linesTailored = this.lines
            .slice(0, this.startLineIndex)
            .concat(this.lines.slice(this.endLineIndex));
        if (linesTailored.length === 0) {
            return null;
        }
        const headTailObj = {};
        for (const line of linesTailored) {
            let lineTailored = commonUtils.getBlankItems(line, "items", true);
            lineTailored = lineTailored
                .map((i) => i.split(/:|：/))
                .flat()
                .filter((u) => u !== "");
            for (let i = 0; i < lineTailored.length / 2; i++) {
                const k = lineTailored[2 * i].trim();
                const v = lineTailored[2 * i + 1];
                headTailObj[k] =  typeof v === 'string' ? v.trim() : v;
            }
        }
        return headTailObj;
    }

    /**
     * Return a dictionary of file body, with fields being keys and lists of field values being values.
     * @returns {Object} - A dictionary of file body.
     */
    #getBodyDict() {
        let linesTailored;
        // get records (without field and sub-field line)
        linesTailored = this.lines.slice(
            this.startLineIndex + (this.ifSubStartLine ? 2 : 1),
            this.endLineIndex
        );
        // append field
        linesTailored.unshift(this.fields);

        // 测试lines不等长的可能性。
        // 如不处理，会导致 zip后被undefined填充，最终导致输出的csv列错位。
        const bodyLinesLengthAreEqual = commonUtils.areSubArrayLengthsEqual(linesTailored);
        if (!bodyLinesLengthAreEqual) {
            linesTailored = commonUtils.padSubArrays(linesTailored);
        }

        // Transpose matrix containing unequal-length vectors
        // let arrayOfColumns = _.zip(...linesTailored);
        // const chunkSize = 1000; // Adjust chunk size based on memory and performance needs
        // const transposedChunks = _.chunk(linesTailored, chunkSize).map(chunk => _.zip(...chunk));
        // const arrayOfColumns = _.flatten(transposedChunks);
        let arrayOfColumns = commonUtils.transpose(linesTailored);

        //trim clean 
        arrayOfColumns = arrayOfColumns.map(column =>
            column.map(value => typeof value === 'string' ? value.trim() : value)
        );


        const bodyDict = {};
        this.fields.forEach((field, i) => {
            bodyDict[field] = arrayOfColumns[i].slice(1);
        });

        this.bodyDataLength = arrayOfColumns[0].slice(1).length;

        return bodyDict;
    }

    determineFieldMap(fieldMapRuleApplied) {
        const determineEachField = (actualFieldRules, standardField) => {
            if (typeof actualFieldRules !== "string") {
                throw new Error(`发生了错误！字段映射规则'${actualFieldRules}'应为字符串。`);
            }
            const regex = /\$\{([^}]*)\}/
            const match = actualFieldRules.match(regex);

            const regex2 = /^=~~[^|]+(\|[^|]+)*$/;
            const match2 = actualFieldRules.match(regex2);
            if (match) {
                const fieldName = match[1];

                return new MappedActualField({
                    type: "metadata",
                    rules: actualFieldRules,
                    fieldIndices: [],
                    value: !!Object.getOwnPropertyDescriptor(
                        Object.getPrototypeOf(this),
                        fieldName
                    ) ? this[fieldName] : null,
                    standardFieldName: standardField,
                    sheetObjectFieldsNames: this.fields
                });

            }
            else if (match2) {
                const fieldPatterns = actualFieldRules.slice(3).split("|");
                const fieldIndices = this.fields.map((field, i) => fieldPatterns.some((pattern) => field.includes(pattern)) ? i : null).filter((i) => i !== null);
                return new MappedActualField({
                    type: "fields",
                    rules: actualFieldRules,
                    fieldIndices: fieldIndices,
                    value: null,
                    standardFieldName: standardField,
                    sheetObjectFieldsNames: this.fields
                });
            }
            else {
                const fieldIndices = this.fields.map((field, i) => (field === actualFieldRules) ? i : null).filter((i) => i !== null);
                return new MappedActualField({
                    type: "fields",
                    rules: actualFieldRules,
                    fieldIndices: fieldIndices,
                    value: null,
                    standardFieldName: standardField,
                    sheetObjectFieldsNames: this.fields
                });
            }

        }

        const determineEachHead = (actualFieldRules, standardField) => {
            if (typeof actualFieldRules !== "string") {
                throw new Error(`发生了错误！字段映射规则'${actualFieldRules}'应为字符串。`);
            }
            if (actualFieldRules.includes("None") || actualFieldRules === "") {
                return new MappedActualField({
                    type: "head",
                    rules: actualFieldRules,
                    fieldIndices: null,
                    value: null,
                    standardFieldName: standardField,
                    sheetObjectFieldsNames: this.fields
                });
            }
            if (actualFieldRules in this.headAndTailAsObj && this.headAndTailAsObj[actualFieldRules] !== undefined) {
                return new MappedActualField({
                    type: "head",
                    rules: actualFieldRules,
                    fieldIndices: null,
                    value: this.headAndTailAsObj[actualFieldRules],
                    standardFieldName: standardField,
                    sheetObjectFieldsNames: this.fields
                });
            }
            return new MappedActualField({
                type: "head",
                rules: actualFieldRules,
                fieldIndices: null,
                value: null,
                standardFieldName: standardField,
                sheetObjectFieldsNames: this.fields
            });
        }

        const fieldMapTemplate = structuredClone(fieldMapRuleApplied);
        for (const [standardField, actualFieldRules] of Object.entries(fieldMapTemplate["body"])) {
            fieldMapTemplate["body"][standardField] = determineEachField(actualFieldRules, standardField);
        }
        for (const [standardField, actualFieldRules] of Object.entries(fieldMapTemplate["head"])) {
            fieldMapTemplate["head"][standardField] = determineEachHead(actualFieldRules, standardField);
        }
        this.fieldMap = fieldMapTemplate;
    }

    getStandardFieldsDataAsObj() {
        let field_std_dict = {};

        for (const [standardField, actualField] of Object.entries(this.fieldMapAsFlat)) {
            if (actualField.type === "head") {
                field_std_dict[standardField] = Array(this.bodyDataLength).fill(actualField.value);
            }
            else if (actualField.type === "fields") {
                if (actualField.fieldIndices.length === 0) {
                    field_std_dict[standardField] = Array(this.bodyDataLength).fill(actualField.value); // 应该是null
                }
                else if (actualField.fieldIndices.length === 1) {
                    field_std_dict[standardField] = this.bodyAsObj[actualField.fieldNames[0]];
                }
                else {
                    //待完成 多字段用delimiter拼接
                    field_std_dict[standardField] = this.bodyAsObj[actualField.fieldNames[0]];
                }
            }
        }

        return field_std_dict;
    }


    getStandardFieldsLines() {
        // Initialize field_std_lines with keys from field_std_dict
        let field_std_lines = [Object.keys(this.standardFieldsDataAsObj)];

        // Transpose the values of field_std_dict using zip_longest
        let values = Array.from(
            _.zip(...Object.values(this.standardFieldsDataAsObj), { fillvalue: null })
        ).map((arr) => arr.filter((item) => item !== undefined));

        // Append transposed values to field_std_lines
        for (const value of values) {
            field_std_lines.push(value);
        }
        return field_std_lines;
    }

    // deprecated
    getFieldMapAsFlat() {
        if (!this.fieldMap) {
            throw new Error("fieldMap未确定，请先调用determineFieldMap方法。");
        }
        return Object.assign({}, ...Object.values(this.fieldMap));
    }

    get fieldMapAsFlat() {
        if (!this.fieldMap) {
            throw new Error("fieldMap未确定，请先调用determineFieldMap方法。");
        }
        return Object.assign({}, ...Object.values(this.fieldMap));
    }

    get fullName() {
        return this.sheetFieldStdizer.fieldMapConfig.fullName;
    }

    get fileName() {
        return this.sheetFieldStdizer.fileName;
    }

    setFieldIndices(standardFieldName, fieldIndices) {
        if (this.fieldMap.head[standardFieldName]) {
            this.fieldMap.head[standardFieldName].setFieldIndices(fieldIndices);
            return;
        }
        this.fieldMap.body[standardFieldName].setFieldIndices(fieldIndices);
        return this;
    }

    setHeadValue(standardFieldName, value) {
        if (this.fieldMap.head[standardFieldName]) {
            this.fieldMap.head[standardFieldName].setHeadValue(value);
            return this;
        }
        this.fieldMap.body[standardFieldName].setHeadValue(value);
        return this;
    }

    get standardFieldsLinesWithSheetName() {
        return this.standardFieldsLines.map((line, i) => [...line, i === 0 ? "sheetName" : this.sheetName]);
    }
}
