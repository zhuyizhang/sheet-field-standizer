import { isValidFilePath } from "../utilities/index.js"

// Example usage
const inputPath = '/Users/brianzhu/Desktop/quick_code/js/sheet-field-standizer/utilities/csv.js';

if (isValidFilePath(inputPath)) {
    console.log("The input is a valid file path.");
} else {
    console.log("The input is not a valid file path.");
}