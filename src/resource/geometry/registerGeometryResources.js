// REGISTERS THE GEOMETRY RESOURCE ROUTE: `.gr2` -> TriGeometryRes, the resource
// a Tr2Mesh asks the manager for (`Tr2Mesh.Initialize`, requirement GEOMETRY).
// Beside RegisterTextureResources and RegisterShaderResources, and for the same
// reason: the manager knows no resource type until composition registers one,
// and without this a SOF-built ship's mesh stayed a failed resource.
//
// The format route lets ResMan decode in its worker. Publication on the owning
// thread retains the Granny read for animation and projects the geometry into
// the CMF graph the mesh draw path consumes (TriGeometryRes::DoLoad, cpp:548-582).
import { TriGeometryRes } from "./TriGeometryRes.js";
import { CjsGr2Format } from "../formats/gr2/CjsGr2Format.js";

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
  for (const extension of GeometryResourceExtensions)
  {
    resourceManager.RegisterExtension(extension, TriGeometryRes, {
      Format: CjsGr2Format,
      defaults: { emit: "json", rebuildMissingBounds: true }
    });
  }

  return resourceManager;
}
