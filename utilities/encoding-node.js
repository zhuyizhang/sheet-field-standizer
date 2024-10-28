import { openSync, readSync, closeSync } from 'fs';
import fs from "fs";
import readline from "readline";
import iconv from "iconv-lite";

/**
 * Detects the BOM (Byte Order Mark) of a file at the given file path.
 * Supports detection of UTF-8, UTF-16 (BE/LE), and UTF-32 (BE/LE) BOMs.
 * 
 * @param {string} filePath - The local file path to check for a BOM.
 * @returns {string|null} - A string indicating the BOM type ('UTF-8', 'UTF-16 BE', 'UTF-16 LE', 'UTF-32 BE', 'UTF-32 LE') or `null` if no BOM is detected.
 * 
 * @throws {Error} - If there is an issue accessing or reading the file.
 */
export function detectBOM(filePath) {
    const buffer = Buffer.alloc(4);
    const fd = openSync(filePath, 'r');
    readSync(fd, buffer, 0, 4, 0);
    closeSync(fd);

    // Check for UTF-8 BOM
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        return 'UTF-8';
    }
    // Check for UTF-16 BE BOM
    else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return 'UTF-16 BE';
    }
    // Check for UTF-16 LE BOM
    else if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return 'UTF-16 LE';
    }
    // Check for UTF-32 BE BOM
    else if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0xFE && buffer[3] === 0xFF) {
        return 'UTF-32 BE';
    }
    // Check for UTF-32 LE BOM
    else if (buffer[0] === 0xFF && buffer[1] === 0xFE && buffer[2] === 0x00 && buffer[3] === 0x00) {
        return 'UTF-32 LE';
    }
    else {
        return null; // No BOM detected
    }
}



function checkTextFileEncoding(filePath, fileEncoding) {
    return new Promise((resolve, reject) => {
        const readStream =
            fileEncoding === "utf-8"
                ? fs.createReadStream(filePath)
                : fs.createReadStream(filePath).pipe(iconv.decodeStream(fileEncoding));

        // Create a readline interface
        const rl = readline.createInterface({
            input: readStream,
            output: process.stdout,
            terminal: false,
        });

        let combinedString = ""; // Initialize an empty string to combine lines

        let linesRead = 0; // Keep track of lines read

        // Event listener for reading lines
        rl.on("line", (line) => {
            // Increment linesRead
            linesRead++;

            // Combine lines into a single string
            combinedString += line + "\n";

            // If 10 lines have been read, close the readline interface
            if (linesRead === 10) {
                rl.close();
            }
        });

        // Event listener for the end of file or reaching 10 lines
        rl.on("close", () => {
            // console.log("Combined String:", combinedString);
            const unicodeReplacement = /\uFFFD/;
            const result =
                combinedString.search(unicodeReplacement) >= 0 ? false : true;
            resolve(result);
        });
        // Event listener for error
        rl.on("error", (err) => {
            reject(err);
        });
    });
}



export async function determineTextFileEncoding(
    filePath,
    candidateEncodings = null
) {
    return new Promise((resolve, reject) => {
        candidateEncodings = !candidateEncodings
            ? ["utf-8", "gbk"]
            : candidateEncodings;
        candidateEncodings.forEach(async (encoding) => {
            const booleanResult = await checkTextFileEncoding(filePath, encoding);
            if (booleanResult) {
                resolve(encoding);
            }
        });
    });
}
