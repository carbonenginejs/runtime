/**
 * GR2 JSON output adapter.
 * @author cppctamber
 */

import { CLASS_KEYS, projectShared } from "./shared.js";

export { CLASS_KEYS };

/**
 * Convert a reflected `granny_file_info` graph into the stable GR2 JSON shape.
 *
 * @param {object} fileInfo Reflected `granny_file_info` object from `reader.js`.
 * @param {number} version Granny file format revision.
 * @param {object} [options] Emission options.
 * @returns {object} JSON-compatible GR2 output.
 */
export function emitJson(fileInfo, version, options = {})
{
    return projectShared(fileInfo, version, options);
}
