import { commonUtils } from "../utilities/index.js";
import {SheetFieldStdizer} from "../sheetFieldStdizer.js"

const filePaths = [
  // "./test_resources/zfb账单-202408/丰收计划-间连三四方基础覆盖激励_3182_202408.csv",
  "./test_resources/zfb账单-202408/企业团餐-设备活跃激励2.1_1465_202408.csv",
  // "./test_resources/zfb账单-202408/线下协作费-基础政策-当面资金授权_1776_202408.csv",
  // "./test_resources/zfb账单-202408/线下协作费-小程序基础支付政策_1722_202408.csv",
  // "./test_resources/zfb账单-202408/CY24-企业团餐-设备启用激励_0407_202408.csv",
];



const fieldMapPath = "./test_resources/alibill_field_map_202408.json";
const exportFileName = `test_outputs/export_${commonUtils.getCurrentTimestamp()}.csv`;
//const exportFileName = `test_outputs/export_${commonUtils.getCurrentTimestamp()}.csv`;



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