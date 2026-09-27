// REGISTERS THE OBJECT ROUTE: `.black` and `.red` -> the hydrated object graph,
// what Carbon's BeResMan->LoadObject returns for a red/black file
// (EveChildRef::LoadChild, EveChildRef.cpp:342-360, is one caller). Beside the
// texture, shader and geometry registrations, and for the same reason: the
// manager knows no object format until composition registers one.
//
// A `.red` path reads BLACK bytes. The client ships only the compiled form, and
// Carbon's file system swaps the extension (SubstituteBlackForRedInFilename,
// blue/src/BlueFileUtil.cpp:374-387; ours in BlueResFileSystemRemote). A source
// standing in for that file system must do the same swap. YAML .red (authoring
// source) is not read here, which keeps the YAML reader out of this route.
import { CjsBlackFormat } from "../formats/black/index.js";

/** The object file extensions Carbon's LoadObject reads. */
export const ObjectResourceExtensions = Object.freeze([ "black", "red" ]);

/** Reads one compiled object file into its runtime root object. */
function ReadBlackObject(bytes, context)
{
  if (!CjsBlackFormat.probeSupport(bytes))
  {
    throw new Error(`${context?.path ?? "object"}: not a compiled (black) object file; YAML red is not read by this route.`);
  }
  const result = CjsBlackFormat.read(bytes, { emit: "runtime" });
  return result?.root ?? result;
}

/**
 * Routes red and black object files to the black runtime reader on a
 * resource manager, so `LoadObject(path)` resolves to the file's root object.
 *
 * @param {object} resourceManager A CjsResMan.
 * @returns {object} The same manager, for chaining.
 */
export function RegisterObjectResources(resourceManager)
{
  if (typeof resourceManager?.RegisterObjectLoader !== "function")
  {
    throw new TypeError("RegisterObjectResources requires a CjsResMan.");
  }

  for (const extension of ObjectResourceExtensions)
  {
    resourceManager.RegisterObjectLoader(extension, ReadBlackObject);
  }

  return resourceManager;
}
