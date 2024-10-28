import { FieldMap } from "../fieldMap.js";

//const filePaths = ["./testgbk.csv"];
//const filePaths = ["./2022TB.xls"];
//const filePaths = ["./testutf8.csv", "./test.xls"];
const fieldMapPath = "test_resources/field_map_202311.json";

const fieldMap = new FieldMap(fieldMapPath);
await fieldMap.initializeAsync();
//await fieldMap.determineFieldMap('中信流水.xlsx');
//await fieldMap.determineFieldMap('流水.xlsx');

//console.log('end');
console.log(fieldMap);