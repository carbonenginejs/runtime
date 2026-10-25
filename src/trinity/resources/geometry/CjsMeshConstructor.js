// Not Carbon: `dynamic:/mesh` is ours (operator, 2026-10-25). Carbon's dynamic
// constructors (SolidColorTexture.cpp, GradientTexture.cpp) rasterize from the
// query, and a Tr2Mesh picks a mesh by `meshIndex` after the whole file loads;
// a path that names one mesh is what lets a consumer that always draws mesh 0,
// such as an EveSOF hull (EveSOF.cpp:722-738), draw another.
import { IBlueDynamicResourceConstructor } from "#blue";
import { meta } from "#schema";
import { CjsGr2Format } from "../../../resource/formats/gr2/index.js";
import { CjsCmfFormat } from "../../../resource/formats/cmf/index.js";
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
@meta.define("CjsMeshConstructor")
export class CjsMeshConstructor extends IBlueDynamicResourceConstructor
{

  /** The `CjsBlueResMan` that reads the sources; set by the constructor. */
  _resourceManager = null;

  /**
   * @param {object} resourceManager The `CjsBlueResMan` that reads the sources.
   */
  constructor(resourceManager)
  {
    super();
    this._resourceManager = resourceManager ?? null;
  }

  /**
   * A built mesh costs a download and a decode to rebuild, so it is kept.
   *
   * @returns {boolean} Always true.
   */
  @meta.implemented
  IsCacheable()
  {
    return true;
  }

  /**
   * Build the geometry a mesh query describes. The source starts loading at
   * once; the geometry is prepared when it is read.
   *
   * @param {string} query Text after `dynamic:/mesh/`.
   * @returns {TriGeometryRes} The geometry resource.
   */
  @meta.implemented
  GetResource(query)
  {
    const geometry = new TriGeometryRes();
    geometry.Initialize(MeshPrefix + query, "");
    const request = CjsMeshConstructor.parseQuery(query);
    if (!request)
    {
      const error = new Error(`Failed to parse ${MeshPrefix}${query} mesh path`);
      error.code = "CJS_GEOMETRY_DYNAMIC_PATH_INVALID";
      geometry.SetError(error);
      return geometry;
    }
    this.Load(geometry, request.meshIndex, request.path);
    return geometry;
  }

  /**
   * Read a source file's mesh into a geometry resource.
   *
   * The geometry's whole payload is the one mesh, set once, so it shares no
   * mesh or LOD record - and so no GPU allocation - with the source's own
   * geometry resource. The file's bytes come from the resource manager's
   * source (`ReadResource`, BePaths by default, as BlueAsyncRes::DoOpenStream
   * reads) and are decoded on this thread: the format worker route belongs to
   * the manager's own requests.
   *
   * A `.gr2` source is projected to the CMF form its meshes draw from
   * (TriGeometryRes.ReadGrannyFile), with the bounds rebuilt as that reader
   * does; the granny file itself is not kept, so the mesh does not animate.
   *
   * @param {TriGeometryRes} geometry Resource to fill.
   * @param {number} meshIndex Mesh to keep.
   * @param {string} path Source resource path.
   * @returns {Promise<boolean>} Whether the geometry was filled.
   */
  @meta.implemented
  async Load(geometry, meshIndex, path)
  {
    geometry.MarkLoading();
    try
    {
      const bytes = await this._resourceManager.ReadResource(path);
      const payload = path.toLowerCase().endsWith(".cmf")
        ? CjsCmfFormat.read(bytes, { meshIndex })
        : CjsCmfFormat.loadShared(CjsGr2Format.read(bytes, { rebuildMissingBounds: true, meshIndex }));
      geometry.SetPayload(payload);
      geometry.MarkPrepared();
      return true;
    }
    catch (error)
    {
      geometry.SetError(error);
      return false;
    }
  }

  /**
   * The mesh index and source path of a mesh query, or null when it is
   * malformed or the source is neither a `.gr2` nor a `.cmf` file.
   *
   * @param {string} query `<meshIndex>/<source path>`.
   * @returns {{meshIndex: number, path: string}|null} The request.
   */
  @meta.implemented
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
   * @param {number} meshIndex Mesh to keep.
   * @param {string} sourcePath The `.gr2` or `.cmf` resource path.
   * @returns {string} The mesh path.
   */
  @meta.implemented
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
  resourceManager.RegisterResourceConstructor("mesh", new CjsMeshConstructor(resourceManager));
  return resourceManager;
}
