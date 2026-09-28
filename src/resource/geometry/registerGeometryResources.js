// REGISTERS THE GEOMETRY RESOURCE ROUTE: `.gr2` -> TriGeometryRes, the resource
// a Tr2Mesh asks the manager for (`Tr2Mesh.Initialize`, requirement GEOMETRY).
// Beside RegisterTextureResources and RegisterShaderResources, and for the same
// reason: the manager knows no resource type until composition registers one,
// and without this a SOF-built ship's mesh stayed a failed resource.
//
// The resource reads its own file, as Carbon's TriGeometryRes::DoLoad does
// (cpp:548-582): `ReadGrannyFile` keeps the granny read for the animation path
// and returns its CMF projection, the meshes/areas/declaration graph the mesh
// draw path reads.
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
  // The context's resource is the TriGeometryRes this route registers, and
  // the payload returned here is published to that same resource.
  const loader = (bytes, context) => context.resource.ReadGrannyFile(bytes);

  for (const extension of GeometryResourceExtensions)
  {
    resourceManager.RegisterObjectLoader(extension, loader);
    resourceManager.RegisterExtension(extension, TriGeometryRes);
  }

  return resourceManager;
}
