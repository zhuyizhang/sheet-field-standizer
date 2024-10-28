export function getFileExtension(filePath) {
  // Find the last occurrence of dot ('.') character
  const lastDotIndex = filePath.lastIndexOf(".");

  // If a dot is found and it's not the last character of the string
  if (lastDotIndex !== -1 && lastDotIndex < filePath.length - 1) {
    // Extract and return the substring after the last dot
    return filePath.substring(lastDotIndex + 1);
  } else {
    // If no dot is found or it's the last character of the string, return an empty string
    return "";
  }
}



/**
 * Removes trailing whitespace from a line.
 * @param {Array<string>} line - The line to process.
 * @param {string} [blankstr=' '] - The string representing blank characters.
 * @returns {Array<string>} The line with trailing whitespace removed.
 */
export function removeLastBlankstrFromALine(line, blankstr = " \t") {
  if (!line.length) {
    return line;
  }
  if (blankstr.includes(line[line.length - 1])) {
    line.pop();
    removeLastBlankstrFromALine(line);
  }
  return line;
}

export function getMatrixFromTwoArray(array1, array2) {
  let result = Array();
  array1.forEach(function (one) {
    array2.forEach(function (two) {
      result.push(String(one) + String(two));
    });
  });
  return result;
}

export function range(start, end) {
  return Array(end - start + 1)
    .fill()
    .map((_, idx) => start + idx);
}

/**
 * Get the indices of blank items in a list.
 * @param {Array} list - The list to search.
 * @param {String} option - Possible values: "indicies", "items".
 * @returns {Array} - The indices (or items) of blank items.
 */
export function getBlankItems(list, option = "indices", reverse = false) {
  // Check if the provided option is one of the allowed values
  const allowedOptions = ["indices", "items"];
  if (!allowedOptions.includes(option)) {
    throw new Error(
      `Invalid option. Allowed values are ${JSON.stringify(allowedOptions)}.`
    );
  }
  const mappedArrOfBlank = [];
  const mappedArrOfNonBlank = [];
  const paddingValue = { blank: "_blank", nonBlank: "_nonBlank" };
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const pushedValue = option === "indices" ? i : item;
    if (list.hasOwnProperty(i)) {
      if (item === undefined || " \t".includes(item.toString())) {
        mappedArrOfBlank.push(pushedValue);
        mappedArrOfNonBlank.push(paddingValue.blank);
      }
      mappedArrOfBlank.push(paddingValue.nonBlank);
      mappedArrOfNonBlank.push(pushedValue);
    } else {
      mappedArrOfBlank.push(pushedValue);
      mappedArrOfNonBlank.push(paddingValue.blank);
    }
  }
  if (!reverse) {
    return mappedArrOfBlank.filter((value) => value !== paddingValue.nonBlank);
  }
  return mappedArrOfNonBlank.filter((value) => value !== paddingValue.blank);
}

/**
 * Check if the given string contains any numbers.
 * @param {string} string - The string to check.
 * @returns {boolean} - True if the string contains numbers, false otherwise.
 */
export function containsNumbers(string) {
  const pattern = /\d+/; // Regular expression pattern to match one or more digits
  return pattern.test(string);
}


class InvalidFilePathError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidFilePathError';
  }
}

/**
 * Extracts the file name from a given file path, including the file extension if present.
 *
 * @param {string} filePath - The full file path from which to extract the file name.
 * @returns {string|null} - Returns the file name (include extension) if found, or `null` if the file name cannot be extracted.
 *
 * @example
 * // Returns 'file.txt'
 * extractFileName('/path/to/file.txt');
 * 
 * @example
 * // Returns 'file' for file without an extension
 * extractFileName('/path/to/file');
 * 
 * @example
 * // Returns null for invalid file path
 * extractFileName(''); 
 */
export function extractFileName(filePath) {
  // Extract filename using regular expression
  const filenameRegex = /[^/\\]+(?=\.[^.]+$|$)/;
  const match = filePath.match(filenameRegex);
  
  // If match is found, return the filename; otherwise, return null
  return match ? match[0] : null;
}

export function getCurrentTimestamp() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

export const extensionToExtensionType = {
  xlsx: "excel",
  xls: "excel",
  csv: "text",
  tsv: "text",
  txt: "text",
};


export function removeFileExtension(filename) {
  // Use lastIndexOf to find the last dot in the filename
  const lastDotIndex = filename.lastIndexOf('.');
  
  // If there is no dot or it's the first character, return the filename as is
  if (lastDotIndex === -1 || lastDotIndex === 0) {
      return filename;
  }
  
  // Return the substring from the start to the last dot
  return filename.substring(0, lastDotIndex);
}

export function areSubArrayLengthsEqual(arrays) {
  if (arrays.length === 0) return true; // If the array is empty, return true

  const firstLength = arrays[0].length; // Length of the first sub-array

  for (let i = 1; i < arrays.length; i++) {
      if (arrays[i].length !== firstLength) {
          return false; // Break and return false if lengths differ
      }
  }

  return true; // If all lengths are equal, return true
}

export function padSubArrays(arrays) {
  if (arrays.length === 0) return arrays; // Return empty array if there are no sub-arrays

  const targetLength = arrays[0].length; // Length of the first sub-array

  for (let i = 1; i < arrays.length; i++) {
      while (arrays[i].length < targetLength) {
          arrays[i].push(null); // Pad with null if sub-array length is less than targetLength
      }
  }

  return arrays;
}
