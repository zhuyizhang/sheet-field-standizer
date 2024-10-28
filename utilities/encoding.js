export const encodingToCodePage = {
    "utf-8": 65001,
    gbk: 936,
};

/**
 * Detects the BOM (Byte Order Mark) of a given file.
 * Supports detection of UTF-8, UTF-16 (BE/LE), and UTF-32 (BE/LE) BOMs.
 * 
 * @param {File} file - The HTML5 File object to check for a BOM.
 * @returns {Promise<string|null>} - A promise that resolves to a string indicating the BOM type ('UTF-8', 'UTF-16 BE', 'UTF-16 LE', 'UTF-32 BE', 'UTF-32 LE') or `null` if no BOM is detected.
 * 
 * @throws {Error} - If there is an issue reading the file.
 */
export function detectBOM(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (event) {
            const buffer = new Uint8Array(event.target.result);

            // Check for UTF-8 BOM
            if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                resolve('UTF-8');
            }
            // Check for UTF-16 BE BOM
            else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
                resolve('UTF-16 BE');
            }
            // Check for UTF-16 LE BOM
            else if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
                resolve('UTF-16 LE');
            }
            // Check for UTF-32 BE BOM
            else if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0xFE && buffer[3] === 0xFF) {
                resolve('UTF-32 BE');
            }
            // Check for UTF-32 LE BOM
            else if (buffer[0] === 0xFF && buffer[1] === 0xFE && buffer[2] === 0x00 && buffer[3] === 0x00) {
                resolve('UTF-32 LE');
            }
            else {
                resolve(null); // No BOM detected
            }
        };

        reader.onerror = function () {
            reject(new Error('Error reading file'));
        };

        // Read the first 4 bytes of the file
        const blob = file.slice(0, 4);
        reader.readAsArrayBuffer(blob);
    });
}



/**
 * Checks whether a text file is in the given encoding by scanning the first 10 lines.
 * Detects encoding issues by searching for the Unicode replacement character (�).
 * 
 * Reads only a portion of the file (e.g., the first few kilobytes).
 *
 * @param {File} file - The HTML5 File object to check.
 * @param {string} fileEncoding - The encoding to test against (e.g., 'utf-8', 'utf-16', etc.).
 * @returns {Promise<boolean>} - Resolves to true if the file matches the encoding, false otherwise.
 */
function checkTextFileEncoding(file, fileEncoding) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (event) {
            const text = event.target.result;

            // Split text into lines and take the first 10 lines
            const lines = text.split('\n').slice(0, 10).join('\n');

            // Check for the presence of the Unicode replacement character (�)
            const unicodeReplacement = /\uFFFD/;
            const result = lines.search(unicodeReplacement) >= 0 ? false : true;
            resolve(result);
        };

        reader.onerror = function (err) {
            reject(new Error("Error reading the file: " + err.message));
        };

        // Read a reasonable slice of the file (first 64KB for example)
        const blob = file.slice(0, 64 * 1024); // Read first 64KB of the file
        reader.readAsText(blob, fileEncoding);
    });
}


export async function determineTextFileEncoding(
    file,
    candidateEncodings = null
) {
    return new Promise((resolve, reject) => {
        candidateEncodings = !candidateEncodings
            ? ["utf-8", "gbk"]
            : candidateEncodings;
        candidateEncodings.forEach(async (encoding) => {
            const booleanResult = await checkTextFileEncoding(file, encoding);
            if (booleanResult) {
                resolve(encoding);
            }
        });
    });
}