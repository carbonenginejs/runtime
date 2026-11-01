import { CjsBlackFormat } from "./CjsBlackFormat.js";
import { YamlReader } from "../../YamlReader.js";

/**
 * The builder for one object file: Carbon keeps a reader per file and builds a
 * new object from it on every LoadObject (BlueResMan.cpp:722-773). The reader
 * follows the bytes, not the extension: a valid Black header gets a BlackReader,
 * and anything else is read as YAML by a caching YamlReader
 * (BlueResMan.cpp:806-840). A .red path normally arrives as compiled Black
 * bytes, since the file system swaps .red for .black (BlueFileUtil.cpp:374-387).
 * @meta.adapted JavaScript builder callback configured by CjsLibrary; a reader
 * that fails to cache throws with its message, where Carbon logs it and loads nothing.
 * @param {Uint8Array|ArrayBuffer} bytes Object file bytes, Black or YAML.
 * @param {object} context Loading context used for the diagnostic path.
 * @returns {object} A builder that creates a fresh object for each caller.
 */
export function CreateBlackObjectBuilder(bytes, context)
{
  if (CjsBlackFormat.probeSupport(bytes)) return CjsBlackFormat.createObjectBuilder(bytes, { emit: "runtime" });
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let offset = 0;
  const reader = new YamlReader();
  reader.SetFileName(context?.path ?? "");
  const cached = reader.ReadForCachingFromStream({
    Read(buffer, size)
    {
      const count = Math.min(size, view.length - offset);
      buffer.set(view.subarray(offset, offset + count));
      offset += count;
      return count;
    }
  });
  if (!cached) throw new Error(`${context?.path ?? "object"}: ${reader.GetErrorMessage() || "not a Black or YAML object file"}`);
  return reader;
}
