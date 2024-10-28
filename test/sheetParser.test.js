import { SheetParser } from "../sheetParser.js";

const filePaths = ["test_resources/兴业厦门收钱吧7月手续费结算反馈表.xlsx"];
//const filePaths = ["./test_resources/收钱吧&海口浦发2024年4-6月核算单9.20.xlsx"];
//const filePaths = ["./2022TB.xls"];
//const filePaths = ["./testutf8.csv", "./test.xls"];
//const filePaths = ["./testgbk.csv", "./testutf8.csv", "./test.xls","./2022TB.xls"];
//const filePaths = ["./业务协作费-行业政策-蜻蜓自购政策2_202101.csv"];

for (const filePath of filePaths) {
  const sheetParser = new SheetParser(filePath);
  await sheetParser.initializeAsync();
  //console.log(sheetParser);
  sheetParser.parseOfDataBodyAndFields();
  console.log(sheetParser);
  // console.log(sheetParser.sheetName);
}
