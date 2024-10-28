import { extractFileName } from "../utilities/index.js"

console.log(extractFileName("../utilities/index.js"));

console.log(extractFileName("/path/to/file.txt"));

console.log(extractFileName(""));