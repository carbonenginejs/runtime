import { buildCmfFromShared } from "../../cmf/core/shared.js";
import { projectShared } from "./shared.js";

export { CMF_CLASS_KEYS } from "../../cmf/core/constants.js";
export { buildCmfFromShared };

/** Build a plain CMF graph directly from a parsed GR2 result. */
export function buildCmfFromRaw(raw)
{
    return buildCmfFromShared(projectShared(raw.fileInfo, raw.version));
}
