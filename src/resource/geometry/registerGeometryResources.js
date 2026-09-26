// REGISTERS THE GEOMETRY RESOURCE ROUTE: `.gr2` -> TriGeometryRes, the resource
// a Tr2Mesh asks the manager for (`Tr2Mesh.Initialize`, requirement GEOMETRY).
// Beside RegisterTextureResources and RegisterShaderResources, and for the same
// reason: the manager knows no resource type until composition registers one,
// and without this a SOF-built ship's mesh stayed a failed resource.
//
// The payload is the CMF projection of the granny file: `CjsGr2Format.read`
// gives shared geometry and `CjsCmfFormat.loadShared` projects it to the
// meshes/areas/declaration graph TriGeometryRes and the mesh draw path read.
// Both are the formats' public one-shot readers; nothing format-internal is
// reached from here.
import { CjsGr2Format } from "../formats/gr2/index.js";
import { CjsCmfFormat } from "../formats/cmf/index.js";
import { TriGeometryRes } from "./TriGeometryRes.js";

/** The extensions Carbon loads as geometry resources. */
export const GeometryResourceExtensions = Object.freeze([ "gr2" ]);

/**
 * Routes granny geometry files to TriGeometryRes on a resource manager.
 *
 * @param {object} resourceManager A CjsResMan.
 * @returns {object} The same manager, for chaining.
 */
export function RegisterGeometryResources(resourceManager)
{
  if (typeof resourceManager?.RegisterExtension !== "function"
    || typeof resourceManager?.RegisterObjectLoader !== "function")
  {
    throw new TypeError("RegisterGeometryResources requires a CjsResMan.");
  }

  const loader = bytes => CjsCmfFormat.loadShared(CjsGr2Format.read(bytes));

  for (const extension of GeometryResourceExtensions)
  {
    resourceManager.RegisterObjectLoader(extension, loader);
    resourceManager.RegisterExtension(extension, TriGeometryRes);
  }

  return resourceManager;
}
