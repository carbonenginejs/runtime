import { CjsBlackFormat } from "./CjsBlackFormat.js";

/**
 * The builder for one compiled object file: Carbon keeps a BlackReader per file
 * and builds a new object from it on every LoadObject (BlueResMan.cpp:722-773).
 * Both black and red routes expect compiled Black bytes; YAML Red is not read here.
 * @meta.adapted JavaScript builder callback configured by CjsLibrary.
 * @param {Uint8Array|ArrayBuffer} bytes Compiled object bytes.
 * @param {object} context Loading context used for the diagnostic path.
 * @returns {object} A builder that creates a fresh object for each caller.
 */
export function CreateBlackObjectBuilder(bytes, context)
{
  if (!CjsBlackFormat.probeSupport(bytes))
  {
    throw new Error(`${context?.path ?? "object"}: not a compiled (black) object file; YAML red is not read by this route.`);
  }
  return CjsBlackFormat.createObjectBuilder(bytes, { emit: "runtime" });
}
