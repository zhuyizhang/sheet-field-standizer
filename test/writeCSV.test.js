import { writeCSV } from "../utilities/index.js";

// Example array of arrays
const data = [
  ["name", "age", "city"],
  ["John", "30", "New York"],
  ["Jane", "25", "San Francisco"],
  ["Mike", "35", "Chicago"]
];

// Example usage:
//To overwrite the file
writeCSV(data, 'data.csv', false);

// To append to the file
// writeCSV(data, 'data.csv', true);
