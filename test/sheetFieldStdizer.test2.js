import { commonUtils } from "../utilities/index.js";
import {SheetFieldStdizer} from "../sheetFieldStdizer.js"

const filePaths = [
  "./test_resources/zfb账单-202409/【N项目】间连三四方笔数激励政策_3153_202409.csv",
  // "./test_resources/zfb账单-202409/谷雨计划激励_8401_202409.csv",
  // "./test_resources/zfb账单-202409/间连线上下蓝码服务商交易返佣_5729_202409.csv",
  // "./test_resources/zfb账单-202409/间连红包码覆盖6月激励政策_1008_202409.csv",
  //"./test_resources/zfb账单-202408/丰收计划-间连三四方基础覆盖激励_3182_202408.csv",
  //"./test_resources/收钱吧间连4～12月离线出账（花呗）_5370_202409.csv",
  // "./test_resources/zfb账单-202408/企业团餐-设备活跃激励2.1_1465_202408.csv",
  // "./test_resources/zfb账单-202408/线下协作费-基础政策-当面资金授权_1776_202408.csv",
  // "./test_resources/zfb账单-202408/线下协作费-小程序基础支付政策_1722_202408.csv",
  // "./test_resources/zfb账单-202408/CY24-企业团餐-设备启用激励_0407_202408.csv",
];



const fieldMapPath = "./test_resources/alibill_field_map_202409.json";
const exportFileName = `test_outputs/export_${commonUtils.getCurrentTimestamp()}.csv`;
//const exportFileName = `test_outputs/export_${commonUtils.getCurrentTimestamp()}.csv`;



async function processFilesInOrder(filePaths) {
  for (let index = 0; index < filePaths.length; index++) {
    const filePath = filePaths[index];
    const sheetFieldStdizer = new SheetFieldStdizer(filePath, fieldMapPath);
    const append = index != 0;

    try {
      const initialized = await sheetFieldStdizer.initializeAsync();
      // const determined = initialized.DETER;
      const standardized = initialized.doFieldStandardize();
      await standardized.exportStandardLinesAsCsvAsync(exportFileName, append, sheetFieldStdizer.sheetsNames[0]);
      console.log(`Processed file: ${filePath}`);
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }
}

processFilesInOrder(filePaths);