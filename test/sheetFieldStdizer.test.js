import { commonUtils } from "../utilities/index.js";
import {SheetFieldStdizer} from "../sheetFieldStdizer.js"

const filePaths = [
  //"./test_resources/testgbk支.csv",
  "./test_resources/test光大.xls",
  //"./test_resources/test桄大.xls",
  //"./test_resources/testutf8财付通流水.csv",
];

// const filePaths = [
//   "./test_resources/收钱吧&海口浦发2024年4-6月核算单9.20.xlsx",
//   "./test_resources/兴业厦门收钱吧7月手续费结算反馈表.xlsx",
// ];



const fieldMapPath = "./test_resources/field_map_202311.json";
//const fieldMapPath = "./test_resources/fieldMap_bankCollaborate.json";
const exportFileName = `test_outputs/export_${commonUtils.getCurrentTimestamp()}.csv`;

// filePaths.map((filePath, index) => {
//   const sheetFieldStdizer = new SheetFieldStdizer(filePath, fieldMapPath);
//   const append = index == 0 ? true : false;

//   sheetFieldStdizer
//     .initializeAsync()
//     .then((i) => i.doFieldStandardize())
//     .then((i) => i.exportStandardLinesAsCsv(exportFileName, append));
// });

async function processFilesInOrder(filePaths) {
  for (let index = 0; index < filePaths.length; index++) {
    const filePath = filePaths[index];
    const sheetFieldStdizer = new SheetFieldStdizer(filePath, fieldMapPath);
    const append = index != 0;

    try {
      const initialized = await sheetFieldStdizer.initializeAsync();
      const standardized = initialized.doFieldStandardize();
      await standardized.exportStandardLinesAsCsvAsync(exportFileName, append, sheetFieldStdizer.sheetsNames[0]);
      console.log(`Processed file: ${filePath}`);
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }
}

processFilesInOrder(filePaths);