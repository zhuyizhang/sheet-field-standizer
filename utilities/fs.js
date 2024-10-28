// Import fs module using ES module syntax
import fs from 'fs';
import path from "path";

/**
 * Reads a file and returns its content as a Buffer or a string.
 *
 * @param {string} filePath - The path to the file to be read.
 * @param {string|null} [encoding=null] - The encoding to use. If provided, the content will be returned as a string. If null, a Buffer will be returned.
 * @returns {Promise<Buffer|string>} - A promise that resolves to the file content, either as a Buffer (default) or a string (if encoding is specified).
 * @throws {Error} Will throw an error if the file cannot be read.
 */
export async function readFile(filePath, encoding = null) {
  try {
    const data = await fs.promises.readFile(filePath, encoding ? { encoding } : null);
    return data;
  } catch (err) {
    console.error('Error reading file:', err);
    throw err;
  }
}

/**
 * Checks if the input parameter is a string and a valid file path.
 *
 * @param {string} filePath - The input parameter to check.
 * @returns {boolean} Returns true if it's a string and a valid file path, false otherwise.
 */
export function isValidFilePath(filePath) {
  // Check if the input is a string
  if (typeof filePath !== 'string') {
    return false;
  }

  // Resolve the path to get the absolute path
  const resolvedPath = path.resolve(filePath);

  // Check if the file exists and is a file
  return fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile();
}

