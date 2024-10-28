import { detectEnvironment } from "./env.js";

async function loadUtilities() {
    const commonUtils = {};

    // Common utilities that are safe to load in both Node.js and browser
    const utilities = await import("./utilities.js");
    const encoding = await import("./encoding.js");
    const env = await import("./env.js");

    Object.assign(commonUtils, utilities, encoding, env);

    const nodeSpecificUtils = {};
    // Node-specific utilities (conditionally loaded)
    if (detectEnvironment()=="node") {
        const fs = await import("./fs.js");
        const csv = await import("./csv-node.js");
        const encoding = await import("./encoding-node.js");
        Object.assign(nodeSpecificUtils, fs, csv, encoding);
    }

    return {commonUtils, nodeSpecificUtils};
}

// Export the modules dynamically
export const {commonUtils, nodeSpecificUtils} = await loadUtilities();