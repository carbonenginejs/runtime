// Not Carbon: `dynamic:/mesh` is ours (operator, 2026-10-25). Carbon's dynamic
// constructors (SolidColorTexture.cpp, GradientTexture.cpp) rasterize from the
// query, and a Tr2Mesh picks a mesh by `meshIndex` after the whole file loads;
// a path that names one mesh is what lets a consumer that always draws mesh 0,
// such as an EveSOF hull (EveSOF.cpp:722-738), draw another.
import { IBlueDynamicResourceConstructor } from "#blue";
import { CjsSchema, meta } from "#schema";
import { TriGeometryRes } from "./TriGeometryRes.js";

/** The prefix a mesh path starts with. */
export const MeshPrefix = "dynamic:/mesh/";

/**
 * `dynamic:/mesh/<meshIndex>/<source>` - one mesh of a `.gr2` or `.cmf` file
 * as a geometry resource of its own, such as
 * `dynamic:/mesh/1/res:/graphics/interior/caldari/modular_walkway/walkway_04_cal_01.gr2`.
 *
 * The index counts the meshes the source's geometry resource holds: a `.gr2`
 * file's meshes, each LOD sibling counted on its own, or a `.cmf` file's. The
 * resource holds that mesh alone, so it is mesh 0.
 *
 * Kept in the cache after release: rebuilding means downloading and decoding
 * the source again.
 */

export class CjsMeshConstructor extends IBlueDynamicResourceConstructor
{


  /**
   * A built mesh costs a download and a decode to rebuild, so it is kept.
   *
   * @implemented
   * @returns {boolean} Always true.
   */

  IsCacheable()
  {
    return true;
  }

  /**
   * Create the resource; its native asynchronous load owns the selected mesh read.
   *
   * @adapted
   * @param {string} query Mesh index and source path after the dynamic mesh prefix.
   * @returns {TriGeometryRes} Initialized mesh resource.
   */

  GetResource(query)
  {
    const geometry = new TriGeometryRes();
    geometry.Initialize(MeshPrefix + query, "");
    return geometry;
  }


  /**
   * The mesh index and source path of a mesh query, or null when it is
   * malformed or the source is neither a `.gr2` nor a `.cmf` file.
   *
   * @implemented
   * @param {string} query `<meshIndex>/<source path>`.
   * @returns {{meshIndex: number, path: string}|null} The request.
   */

  static parseQuery(query)
  {
    const match = /^(\d+)\/(.+)$/u.exec(String(query).trim());
    if (!match) return null;
    const path = match[2].trim();
    const lower = path.toLowerCase();
    if (!lower.endsWith(".gr2") && !lower.endsWith(".cmf")) return null;
    return { meshIndex: Number(match[1]), path };
  }

  /**
   * The `dynamic:/mesh/` path for one mesh of a source file.
   *
   * @implemented
   * @param {number} meshIndex Mesh to keep.
   * @param {string} sourcePath The `.gr2` or `.cmf` resource path.
   * @returns {string} The mesh path.
   */

  static meshPath(meshIndex, sourcePath)
  {
    return `${MeshPrefix}${meshIndex}/${sourcePath}`;
  }

}

/**
 * Registers `dynamic:/mesh` on a manager.
 *
 * @param {object} resourceManager Manager to register on.
 * @returns {object} The same manager, for chaining.
 */
export function RegisterMeshConstructor(resourceManager)
{
  resourceManager.RegisterResourceConstructor("mesh", new CjsMeshConstructor());
  return resourceManager;
}

// Imperative metadata keeps native resource source imports valid ESM.
meta.define("CjsMeshConstructor")(CjsMeshConstructor);
