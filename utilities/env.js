/**
 * Detects the current environment (Node.js or browser).
 *
 * @returns {string} Returns 'browser' if running in a browser,
 *                   'node' if running in Node.js, or
 *                   'unknown' if the environment cannot be determined.
 */
export function detectEnvironment() {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Running in a browser
    return 'browser';
  } else if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    // Running in Node.js
    return 'node';
  }
  return 'unknown';
}