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

  // BOUNDS FROM THE VERTICES. A granny file carries no mesh-level box, and
  // Carbon's TriGeometryRes::SetupModels starts each mesh's box empty and
  // accumulates it from the vertices (TriGeometryRes.cpp:1016-1017). Without
  // the rebuild every mesh read as a zero box, a zero-radius sphere and zero
  // pixels on screen, so EveTransform culled it: the lens-flare occluder
  // sprites (zsprite.gr2) never drew, and the flare shone through hulls.
  const loader = bytes => CjsCmfFormat.loadShared(CjsGr2Format.read(bytes, { rebuildMissingBounds: true }));

  for (const extension of GeometryResourceExtensions)
  {
    resourceManager.RegisterObjectLoader(extension, loader);
    resourceManager.RegisterExtension(extension, TriGeometryRes);
  }

  return resourceManager;
}
