import fs from "fs";
import Papa from "papaparse";

/**
 * Writes a data of AOA(array of array) to a csv file, either appending to or overwriting the existing file.
 *
 * @param {Array<Array<string>>} data - The array of arrays to be converted to CSV.
 * @param {string} filename - The name of the file to write to.
 * @param {boolean} [append=false] - Whether to append to the existing file (true) or overwrite it (false).
 */
export function writeCSVAsync(data, filename, append = false) {
  return new Promise((resolve, reject) => {
    // Convert to CSV
    const csv = Papa.unparse(data);
    // Determine the write mode: 'a' for append, 'w' for write (overwrite)
    const mode = append ? "a" : "w";

    // Add a newline character before appending new data, if the file already exists and append mode is selected
    const finalCSV = append && fs.existsSync(filename) ? "\n" + csv : csv;

    fs.writeFile(filename, finalCSV, { flag: mode }, (err) => {
      if (err) {
        console.error("Error writing to CSV file", err);
        reject(err);
      } else {
        console.log(
          `CSV file ${append ? "appended to" : "written"} successfully!`
        );
        resolve();
      }
    });
  });
}
