import papaparse from "papaparse";

const data = [[1,2,3,4,5,6],['a','b','c','d','e','f'],['g','h','i','j','k','l']];

const result = papaparse.unparse(data);
console.log(result);
console.log(typeof result);
console.log(1);

