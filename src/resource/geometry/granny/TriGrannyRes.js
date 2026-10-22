import { exposure as be } from "#be";
// Source: trinity/trinity/Resources/TriGrannyRes.h
// Source: trinity/trinity/Resources/TriGrannyRes.cpp
// Source: trinity/trinity/Resources/TriGrannyRes_Blue.cpp
import { CjsSchema, meta, type, blue } from "#schema";
import { CjsResource, ICacheable, blue as blueService } from "#blue";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { CjsGr2Format } from "../../formats/gr2/CjsGr2Format.js";
import { assertResourcePayloadObject, resourcePayloadError } from "../../resourceBoundary.js";
import { ResourceRequirement } from "#blue";
import { Tr2GrannyIntersectionResult } from "./Tr2GrannyIntersectionResult.js";

// std::numeric_limits<float>::min()
const FLOAT_MIN = 1.1754943508222875e-38;

const f = Math.fround;

/**
 * Moller-Trumbore ray / triangle test.
 *
 * Carbon: IntersectTri (trinity/trinity/Utilities/GeometryUtils.cpp:298-338; GeometryUtils.h:83).
 * The runtime has no port of it (the geometry resource intersects with its own helper), and the Granny
 * ray query needs Carbon's exact accept rules. Adapted: arithmetic is rounded to float32 step by step as
 * C++ `float` arithmetic is, and `u`, `v` and `dist` are returned as an object, not written through
 * references.
 *
 * @param {ArrayLike<number>} v0 Triangle vertex 0.
 * @param {ArrayLike<number>} v1 Triangle vertex 1.
 * @param {ArrayLike<number>} v2 Triangle vertex 2.
 * @param {ArrayLike<number>} pos Ray origin.
 * @param {ArrayLike<number>} dir Ray direction.
 * @returns {{u: number, v: number, dist: number}|null} The hit, or null.
 */
function IntersectTri(v0, v1, v2, pos, dir)
{
  const e1 = [ f(v1[0] - v0[0]), f(v1[1] - v0[1]), f(v1[2] - v0[2]) ];
  const e2 = [ f(v2[0] - v0[0]), f(v2[1] - v0[1]), f(v2[2] - v0[2]) ];
  const a = [
    f(f(dir[1] * e2[2]) - f(dir[2] * e2[1])),
    f(f(dir[2] * e2[0]) - f(dir[0] * e2[2])),
    f(f(dir[0] * e2[1]) - f(dir[1] * e2[0]))
  ];

  const det = f(f(f(e1[0] * a[0]) + f(e1[1] * a[1])) + f(e1[2] * a[2]));
  if (Math.abs(det) < FLOAT_MIN) return null;
  const invDet = f(1 / det);

  const t0 = [ f(pos[0] - v0[0]), f(pos[1] - v0[1]), f(pos[2] - v0[2]) ];
  const uu = f(f(f(f(t0[0] * a[0]) + f(t0[1] * a[1])) + f(t0[2] * a[2])) * invDet);
  if (uu < 0 || uu > 1) return null;

  const b = [
    f(f(t0[1] * e1[2]) - f(t0[2] * e1[1])),
    f(f(t0[2] * e1[0]) - f(t0[0] * e1[2])),
    f(f(t0[0] * e1[1]) - f(t0[1] * e1[0]))
  ];
  const vv = f(f(f(f(dir[0] * b[0]) + f(dir[1] * b[1])) + f(dir[2] * b[2])) * invDet);
  if (vv < 0 || f(uu + vv) > 1) return null;

  const t = f(f(f(f(e2[0] * b[0]) + f(e2[1] * b[1])) + f(e2[2] * b[2])) * invDet);
  if (t < 0) return null;

  return { u: uu, v: vv, dist: t };
}

/**
 * Runtime-owned Granny resource.
 *
 * The attached plain payload carries decoded Granny data. This resource
 * owns lifecycle identity; reader and engine-specific behavior stays outside.
 *
 * Carbon's `TriGrannyRes` holds the Granny file (`m_grannyFile`) or, for a `.cmf`, a `Tr2CmfContents`,
 * and every query reads `granny_file_info` or the CMF data. Here the payload is the shared GR2
 * projection `CjsGr2Format` emits (`models`, `meshes`, `animations`) and plays the part of
 * `granny_file_info`; `ValidateFileInfo` answers it. That projection is lossy, so a query it cannot
 * answer is marked `notImplemented` or `notSupported` at its own site. `Tr2CmfContents` is not ported
 * (resource/dropped), so `m_cmfContents` is always empty: the CMF branch of each query is its
 * empty-contents outcome and a `.cmf` cannot be loaded.
 */
export class TriGrannyRes extends CjsResource
{
  /**
   * m_memoryUsage: the file's expanded section sizes (TriGrannyRes.cpp:253-258),
   * or the CMF stream's size (:213). Nothing loads this resource yet, so it
   * stays 0 and the cache does not keep it (MotherLode.cpp:381-387).
   */
  _memoryUsage = 0;

  /** m_useCMF - whether the file is a `.cmf` (TriGrannyRes.h:140). */
  _useCMF = false;

  /** Updates payload in the current resource payload lifecycle. */
  SetPayload(payload = null)
  {
    if (payload === null)
    {
      super.SetPayload(null);
      return this;
    }
    assertResourcePayloadObject("TriGrannyRes", payload);
    // Emptiness, not absence. The old guard asked whether the arrays EXISTED,
    // and `CjsGr2Format.read` always builds them - so reading a `.gsf` state
    // machine as geometry produced `{ meshes: [], models: [], animations: [] }`,
    // which sailed through and published a model with nothing in it.
    //
    // The Granny container is the same for both, and only content distinguishes
    // them, so this is where the expectation "I am geometry" has to be enforced:
    // the format cannot know what the caller wanted. Animations count, because
    // an animation-only `.gr2` is a real file - a GSF's referenced clips are
    // exactly that, and they carry no meshes by design.
    const empty = value => !Array.isArray(value) || value.length === 0;
    if (empty(payload.models) && empty(payload.meshes) && empty(payload.animations))
    {
      throw resourcePayloadError(
        "TriGrannyRes",
        "Expected models, meshes or animations, and found none. A Granny "
        + "container carrying none of them is usually a state machine read as "
        + "geometry - check whether this file is a GState.",
        "models"
      );
    }
    super.SetPayload(payload);
    return this;
  }


  /**
   * Carbon `IsMemoryUsageKnown` (TriGrannyRes.cpp:1727-1730): known once loaded.
   *
   * @returns {boolean}
   */
  IsMemoryUsageKnown()
  {
    return !this.IsLoading();
  }

  /**
   * Carbon `GetMemoryUsage` (TriGrannyRes.cpp:1732-1735): `m_memoryUsage`.
   *
   * @returns {number} Bytes.
   */
  GetMemoryUsage()
  {
    return this._memoryUsage;
  }

  /**
   * Loads the file at a path and prepares it, for tools.
   *
   * Carbon: TriGrannyRes::Load (trinity/trinity/Resources/TriGrannyRes.cpp:173-198; TriGrannyRes.h:67).
   * Exposed as "LoadForTools" (TriGrannyRes_Blue.cpp:166-172, MAP_METHOD_AND_WRAP). Carbon sets the
   * path and the extension "raw", opens a stream with `BePaths->GetStreamFromPathW` (a missing stream is
   * logged and answered with false, state untouched), runs `DoLoad` and `DoPrepare` and sets the flags.
   *
   * Forced divergences: a Promise, because a JavaScript file read is asynchronous where Carbon's
   * blocks the thread or tasklet. `DoLoad` is the `CjsGr2Format` decode of the bytes, since the
   * native Granny library is not available; a `.cmf` path fails because `Tr2CmfContents` is not ported
   * (resource/dropped), as `DoLoad` fails when its contents are empty (cpp:211). A failed decode, or
   * a payload `SetPayload` refuses, leaves the resource FAILED, where Carbon leaves the flags clear.
   * `m_memoryUsage` is left 0: the expanded section sizes (cpp:253-258) are not in the projection.
   * `HandleGrannyDeprecation` (cpp:220) is a deprecation log and is omitted.
   *
   * @param {string} path Res path of the resource.
   * @returns {Promise<boolean>} Whether the resource loaded and is good.
   */
  async Load(path)
  {
    this.Initialize(path, "raw");
    this._useCMF = false;

    let stream = null;
    try
    {
      stream = await blueService.paths.GetStreamFromPath(path, { accept: [ "bytes" ] });
    }
    catch
    {
      stream = null;
    }

    if (stream === null)
    {
      CcpLog.CCP_LOGERR("TriGrannyRes::Load: Failed to open stream for path %ls", path);
      return false;
    }

    this.MarkLoading();

    try
    {
      if (path.length >= 4 && path.endsWith(".cmf"))
      {
        this._useCMF = true;
        throw new Error("TriGrannyRes: .cmf contents (Tr2CmfContents) are not supported.");
      }

      this.SetPayload(await CjsGr2Format.readAsync(stream.data, { emit: "json" }));
    }
    catch (error)
    {
      this.SetError(error);
      return false;
    }

    this.MarkPrepared();

    return true;
  }

  /**
   * Whether the file was loaded as a `.cmf`.
   *
   * Carbon: TriGrannyRes::IsUsingCMF (trinity/trinity/Resources/TriGrannyRes.cpp:1800-1807;
   * TriGrannyRes.h:112). `WITH_GRANNY` is on (decorator-upgrade.md § 00), so it answers `m_useCMF`.
   *
   * @returns {boolean} Whether `Load` was given a `.cmf`.
   */
  IsUsingCMF()
  {
    return this._useCMF;
  }

  /**
   * The Granny file.
   *
   * Carbon: TriGrannyRes::GetGrannyFile (trinity/trinity/Resources/TriGrannyRes.h:50-53), `m_grannyFile`.
   * Not supported: it is a pointer into the native Granny library's memory, which does not exist here;
   * the payload is the projection `CjsGr2Format` emits.
   *
   * @throws {Error} Always.
   */
  GetGrannyFile()
  {
    throw new Error("TriGrannyRes.GetGrannyFile: a native granny_file pointer does not exist; read GetPayload().");
  }

  /**
   * One skeleton of the file.
   *
   * Carbon: TriGrannyRes::GetGrannySkeleton (trinity/trinity/Resources/TriGrannyRes.cpp:351-380;
   * TriGrannyRes.h:55). Not implemented: it indexes `granny_file_info::Skeletons`, the file's skeleton
   * list, which the projection does not keep (a model carries its own skeleton record).
   *
   * @throws {Error} Always.
   */
  GetGrannySkeleton(_skeletonIx)
  {
    throw new Error("TriGrannyRes.GetGrannySkeleton is not implemented in CarbonEngineJS.");
  }

  /**
   * One mesh of the file.
   *
   * Carbon: TriGrannyRes::GetGrannyMesh (trinity/trinity/Resources/TriGrannyRes.cpp:277-302;
   * TriGrannyRes.h:57). It logs and answers null with no file, no file info or an index that is too
   * high (a negative index is not checked).
   *
   * Adapted: the file is the payload and the mesh is its projected mesh record, not a `granny_mesh`.
   *
   * @param {number} meshIx Mesh index.
   * @returns {object|null} The projected mesh, or null.
   */
  GetGrannyMesh(meshIx)
  {
    const payload = this.GetPayload();

    if (!payload)
    {
      CcpLog.CCP_LOGERR("TriGrannyRes::GetGrannyMesh: Object has no Granny file");
      return null;
    }

    if (payload.meshes.length <= meshIx)
    {
      CcpLog.CCP_LOGERR("TriGrannyRes::GetGrannyMesh: meshindex too high");
      return null;
    }

    return payload.meshes[meshIx] ?? null;
  }

  /**
   * The vertex type definition of a mesh's primary vertex data.
   *
   * Carbon: TriGrannyRes::GetGrannyVertexType (trinity/trinity/Resources/TriGrannyRes.cpp:304-315;
   * TriGrannyRes.h:60). Not implemented: it returns the `granny_data_type_definition` array, which the
   * projection replaces with deinterleaved channels.
   *
   * @throws {Error} Always.
   */
  GetGrannyVertexType(_meshIx)
  {
    throw new Error("TriGrannyRes.GetGrannyVertexType is not implemented in CarbonEngineJS.");
  }

  /**
   * The size in bytes of one vertex of a mesh.
   *
   * Carbon: TriGrannyRes::GetVertexSize (trinity/trinity/Resources/TriGrannyRes.cpp:317-349;
   * TriGrannyRes.h:63). Not implemented: it is the total size of the vertex type definition (or the
   * CMF stride), neither of which the projection keeps.
   *
   * @throws {Error} Always.
   */
  GetVertexSize(_meshIx)
  {
    throw new Error("TriGrannyRes.GetVertexSize is not implemented in CarbonEngineJS.");
  }

  /**
   * The byte offset of a named vertex member.
   *
   * Carbon: TriGrannyRes::GetVertexComponentOffset (trinity/trinity/Resources/TriGrannyRes.cpp:382-410;
   * TriGrannyRes.h:67). Not implemented: it scans the vertex type definition, which the projection does not keep.
   *
   * @throws {Error} Always.
   */
  GetVertexComponentOffset(_meshIx, _componentName)
  {
    throw new Error("TriGrannyRes.GetVertexComponentOffset is not implemented in CarbonEngineJS.");
  }

  /**
   * The file info, reporting the reason when there is none.
   *
   * Carbon: TriGrannyRes::ValidateFileInfo (trinity/trinity/Resources/TriGrannyRes.cpp:1667-1684;
   * TriGrannyRes.h:80). Logs "No Granny file loaded" without a file and "Invalid Granny file" without
   * file info, and answers null.
   *
   * Adapted: `granny_file_info*` is the payload, the projection `CjsGr2Format` emits. It has no
   * separate "invalid file info" state, so only the first message applies.
   *
   * @returns {object|null} The payload, or null.
   */
  ValidateFileInfo()
  {
    const payload = this.GetPayload();

    if (!payload)
    {
      CcpLog.CCP_LOGERR("No Granny file loaded");
      return null;
    }

    return payload;
  }

  /**
   * The file info when an animation index is in range.
   *
   * Carbon: TriGrannyRes::ValidateAnimationIx (trinity/trinity/Resources/TriGrannyRes.cpp:1648-1665;
   * TriGrannyRes.h:158), protected. Logs "Animation index out of bounds" and answers null for an index
   * outside the file's animations.
   *
   * @param {number} ix Animation index.
   * @returns {object|null} The payload, or null.
   */
  _ValidateAnimationIx(ix)
  {
    const fi = this.ValidateFileInfo();

    if (!fi) return null;

    if (ix < 0 || ix >= fi.animations.length)
    {
      CcpLog.CCP_LOGERR("Animation index out of bounds");
      return null;
    }

    return fi;
  }

  /**
   * Checks a mesh index against the CMF contents.
   *
   * Carbon: TriGrannyRes::ValidateMeshIndex (trinity/trinity/Resources/TriGrannyRes.cpp:1009-1022;
   * TriGrannyRes.h:161), protected. It only ever looks at `m_cmfContents`.
   *
   * Adapted: `Be::Result<std::string>` success is undefined and the failure message is thrown. Since
   * `Tr2CmfContents` is not ported the contents are always empty, so the first check always fails.
   *
   * @param {number} _meshIx Mesh index.
   * @returns {void}
   * @throws {Error} "Tried to use an invalid CMF file".
   */
  _ValidateMeshIndex(_meshIx)
  {
    throw new Error("Tried to use an invalid CMF file");
  }

  /**
   * The number of models, as Carbon counts them.
   *
   * Carbon: TriGrannyRes::GetModelCount (trinity/trinity/Resources/TriGrannyRes.cpp:959-982;
   * TriGrannyRes.h:76). Exposed as the read-only property "modelCount" (TriGrannyRes_Blue.cpp:50-53).
   *
   * bug: the Granny branch returns `fi->AnimationCount`, not `fi->ModelCount` (cpp:974), so a Granny
   * file's model count is its animation count (the CMF branch counts skeletons). Reproduced.
   *
   * @returns {number} The number of animations of a loaded file; 0 for the CMF branch or without a file.
   */
  GetModelCount()
  {
    if (this.IsUsingCMF()) return 0;

    const fi = this.ValidateFileInfo();

    if (!fi) return 0;

    return fi.animations.length;
  }

  /** Carbon property "modelCount" (TriGrannyRes_Blue.cpp:50-53, MAP_PROPERTY_READONLY): `GetModelCount`. */
  get modelCount()
  {
    return this.GetModelCount();
  }

  /**
   * The name of a model.
   *
   * Carbon: TriGrannyRes::GetModelName (trinity/trinity/Resources/TriGrannyRes.cpp:1686-1725;
   * TriGrannyRes.h:77). Exposed (TriGrannyRes_Blue.cpp:54-59, MAP_METHOD_AND_WRAP). An index past the
   * models logs "Model index out of bounds" and answers "".
   *
   * @param {number} ix Model index.
   * @returns {string} The name, or "".
   */
  GetModelName(ix)
  {
    if (this.IsUsingCMF()) return "";

    const fi = this.ValidateFileInfo();

    if (!fi) return "";

    if (ix >>> 0 >= fi.models.length)
    {
      CcpLog.CCP_LOGERR("Model index out of bounds");
      return "";
    }

    return fi.models[ix].name;
  }

  /**
   * The number of meshes.
   *
   * Carbon: TriGrannyRes::GetMeshCount (trinity/trinity/Resources/TriGrannyRes.cpp:984-1007;
   * TriGrannyRes.h:84). Exposed as the method "GetMeshCount" and the read-only property "meshCount"
   * (TriGrannyRes_Blue.cpp:60-67).
   *
   * @returns {number} The mesh count; 0 for the CMF branch or without a file.
   */
  GetMeshCount()
  {
    if (this.IsUsingCMF()) return 0;

    const fi = this.ValidateFileInfo();

    if (!fi) return 0;

    return fi.meshes.length;
  }

  /** Carbon property "meshCount" (TriGrannyRes_Blue.cpp:60-63, MAP_PROPERTY_READONLY): `GetMeshCount`. */
  get meshCount()
  {
    return this.GetMeshCount();
  }

  /**
   * The mesh a query is about, or the reason there is none.
   *
   * The checks the Granny branch of each mesh query opens with (TriGrannyRes.cpp:1038-1046,
   * repeated in every query). Adapted: the failure message is thrown.
   *
   * @param {number} meshIx Mesh index.
   * @returns {object} The projected mesh.
   * @throws {Error} "Tried to get file info on an invalid Granny file" or "Mesh index out of range".
   */
  _GetValidMesh(meshIx)
  {
    const fi = this.ValidateFileInfo();

    if (!fi) throw new Error("Tried to get file info on an invalid Granny file");

    if (meshIx >>> 0 >= fi.meshes.length) throw new Error("Mesh index out of range");

    return fi.meshes[meshIx];
  }

  /**
   * The number of areas of a mesh.
   *
   * Carbon: TriGrannyRes::GetMeshAreaCount (trinity/trinity/Resources/TriGrannyRes.cpp:1024-1062;
   * TriGrannyRes.h:87). Exposed (TriGrannyRes_Blue.cpp:68-72, MAP_METHOD_AND_WRAP). Carbon answers the
   * topology's group count, or `MaterialBindingCount` for a mesh with no topology.
   *
   * Adapted: `Be::Result<std::string>` with the output `count` is the count returned and a failed
   * result is a thrown `Error` with Carbon's message. The projection keeps the topology's index groups
   * and not the material bindings, so a mesh with no topology answers 0.
   *
   * @param {number} meshIx Mesh index.
   * @returns {number} The area count.
   * @throws {Error} "Tried to use an invalid CMF file", "Tried to get file info on an invalid Granny file" or "Mesh index out of range".
   */
  GetMeshAreaCount(meshIx)
  {
    if (this.IsUsingCMF()) this._ValidateMeshIndex(meshIx);

    return this._GetValidMesh(meshIx).indices.length;
  }

  /**
   * The name of a mesh.
   *
   * Carbon: TriGrannyRes::GetMeshName (trinity/trinity/Resources/TriGrannyRes.cpp:1064-1094;
   * TriGrannyRes.h:88). Exposed (TriGrannyRes_Blue.cpp:73-77, MAP_METHOD_AND_WRAP).
   *
   * Adapted: the output `name` is returned and a failed `Be::Result` is thrown, as `GetMeshAreaCount`.
   *
   * @param {number} meshIx Mesh index.
   * @returns {string} The name.
   * @throws {Error} The `GetMeshAreaCount` messages.
   */
  GetMeshName(meshIx)
  {
    if (this.IsUsingCMF()) this._ValidateMeshIndex(meshIx);

    return this._GetValidMesh(meshIx).name;
  }

  /**
   * The names of the bones a mesh binds.
   *
   * Carbon: TriGrannyRes::GetMeshBoneBindings (trinity/trinity/Resources/TriGrannyRes.cpp:1096-1134;
   * TriGrannyRes.h:91). Exposed (TriGrannyRes_Blue.cpp:78-82, MAP_METHOD_AND_WRAP).
   *
   * Adapted: the output vector is returned (a new array) and a failed `Be::Result` is thrown.
   *
   * @param {number} meshIx Mesh index.
   * @returns {string[]} The bone names, in binding order.
   * @throws {Error} The `GetMeshAreaCount` messages.
   */
  GetMeshBoneBindings(meshIx)
  {
    if (this.IsUsingCMF()) this._ValidateMeshIndex(meshIx);

    return this._GetValidMesh(meshIx).boneBindings.map(binding => binding.name);
  }

  /**
   * The vertex declaration elements of a mesh as `[usage, usageIndex]` pairs.
   *
   * Carbon: TriGrannyRes::GetMeshVertexElements (trinity/trinity/Resources/TriGrannyRes.cpp:1136-1176;
   * TriGrannyRes.h:92). Exposed (TriGrannyRes_Blue.cpp:83-87, MAP_METHOD_AND_WRAP). Not implemented:
   * Carbon builds the declaration from the Granny vertex type (`BuildFromGrannyVertexDecl`), and the
   * projection keeps eight fixed channels instead of the file's vertex members.
   *
   * @throws {Error} Always.
   */
  GetMeshVertexElements(_meshIx)
  {
    throw new Error("TriGrannyRes.GetMeshVertexElements is not implemented in CarbonEngineJS.");
  }

  /**
   * The number of triangles of a mesh.
   *
   * Carbon: TriGrannyRes::GetMeshTriangleCount (trinity/trinity/Resources/TriGrannyRes.cpp:1178-1222;
   * TriGrannyRes.h:93). Exposed (TriGrannyRes_Blue.cpp:88-92, MAP_METHOD_AND_WRAP). Carbon sums
   * `TriCount` over the topology's groups, and answers 0 for a mesh with no topology.
   *
   * Adapted: the output `count` is returned and a failed `Be::Result` is thrown. A group's `TriCount`
   * is the length of its `faces` view over three.
   *
   * @param {number} meshIx Mesh index.
   * @returns {number} The triangle count.
   * @throws {Error} The `GetMeshAreaCount` messages.
   */
  GetMeshTriangleCount(meshIx)
  {
    if (this.IsUsingCMF()) this._ValidateMeshIndex(meshIx);

    let count = 0;

    for (const group of this._GetValidMesh(meshIx).indices)
    {
      count += group.faces.length / 3;
    }

    return count;
  }

  /**
   * The number of morph targets of a mesh.
   *
   * Carbon: TriGrannyRes::GetMeshMorphCount (trinity/trinity/Resources/TriGrannyRes.cpp:1224-1258;
   * TriGrannyRes.h:94). Exposed (TriGrannyRes_Blue.cpp:93-97, MAP_METHOD_AND_WRAP). Carbon answers
   * `MorphTargetCount`, or the vertex annotation set count when it is 0.
   *
   * Adapted: the output `count` is returned and a failed `Be::Result` is thrown. The projection lists
   * the morph targets followed by the annotation sets that hold rows, so an annotation set with no
   * rows is not counted.
   *
   * @param {number} meshIx Mesh index.
   * @returns {number} The morph target count.
   * @throws {Error} The `GetMeshAreaCount` messages.
   */
  GetMeshMorphCount(meshIx)
  {
    if (this.IsUsingCMF()) this._ValidateMeshIndex(meshIx);

    return this._GetValidMesh(meshIx).morphTargets.length;
  }

  /**
   * The name of a morph target of a mesh.
   *
   * Carbon: TriGrannyRes::GetMeshMorphName (trinity/trinity/Resources/TriGrannyRes.cpp:1260-1317;
   * TriGrannyRes.h:95). Exposed (TriGrannyRes_Blue.cpp:98-103, MAP_METHOD_AND_WRAP). Carbon names the
   * morph target by `ScalarName`, or the annotation set by `Name`.
   *
   * Adapted: the output `name` is returned and a failed `Be::Result` is thrown (the extra message is
   * "Morph target index out of range").
   *
   * @param {number} meshIx Mesh index.
   * @param {number} morphIx Morph target index.
   * @returns {string} The name.
   * @throws {Error} The `GetMeshAreaCount` messages, or "Morph target index out of range".
   */
  GetMeshMorphName(meshIx, morphIx)
  {
    if (this.IsUsingCMF()) this._ValidateMeshIndex(meshIx);

    const mesh = this._GetValidMesh(meshIx);

    if (morphIx >>> 0 >= mesh.morphTargets.length) throw new Error("Morph target index out of range");

    return mesh.morphTargets[morphIx].name;
  }

  /**
   * The lowercase, digit-free names of every morph target of a mesh.
   *
   * Carbon: TriGrannyRes::GetAllMeshMorphNamesNoDigits (trinity/trinity/Resources/TriGrannyRes.cpp:1319-1404;
   * TriGrannyRes.h:96). Exposed (TriGrannyRes_Blue.cpp:104-110, MAP_METHOD_AND_WRAP). The Granny branch
   * copies each name into a 1024-byte buffer, dropping the digits '0'-'9' and lowercasing 'A'-'Z'.
   *
   * quirk: the copy stops after 1023 characters kept (cpp:1361-1378), so a longer name is truncated.
   * Reproduced.
   *
   * Adapted: the output vector is returned (a new array) and a failed `Be::Result` is thrown.
   *
   * @param {number} meshIx Mesh index.
   * @returns {string[]} One name per morph target.
   * @throws {Error} The `GetMeshAreaCount` messages.
   */
  GetAllMeshMorphNamesNoDigits(meshIx)
  {
    if (this.IsUsingCMF()) this._ValidateMeshIndex(meshIx);

    const mesh = this._GetValidMesh(meshIx);

    return mesh.morphTargets.map(target =>
    {
      let name = "";

      for (const c of target.name)
      {
        if (name.length === 1023) break;
        if (c >= "0" && c <= "9") continue;
        name += c >= "A" && c <= "Z" ? c.toLowerCase() : c;
      }

      return name;
    });
  }

  /**
   * The number of animations.
   *
   * Carbon: TriGrannyRes::GetAnimationCount (trinity/trinity/Resources/TriGrannyRes.cpp:1547-1575;
   * TriGrannyRes.h:98). Exposed as the read-only property "animationCount" (TriGrannyRes_Blue.cpp:111-114).
   *
   * @returns {number} The animation count; 0 for the CMF branch or without a file.
   */
  GetAnimationCount()
  {
    if (this.IsUsingCMF()) return 0;

    const fi = this.ValidateFileInfo();

    if (!fi) return 0;

    return fi.animations.length;
  }

  /** Carbon property "animationCount" (TriGrannyRes_Blue.cpp:111-114, MAP_PROPERTY_READONLY): `GetAnimationCount`. */
  get animationCount()
  {
    return this.GetAnimationCount();
  }

  /**
   * The name of an animation.
   *
   * Carbon: TriGrannyRes::GetAnimationName (trinity/trinity/Resources/TriGrannyRes.cpp:1577-1610;
   * TriGrannyRes.h:99). Exposed (TriGrannyRes_Blue.cpp:115-119, MAP_METHOD_AND_WRAP).
   *
   * @param {number} ix Animation index.
   * @returns {string} The name, or "" for an index outside the animations.
   */
  GetAnimationName(ix)
  {
    if (this.IsUsingCMF()) return "";

    const fi = this._ValidateAnimationIx(ix);

    if (!fi) return "";

    return fi.animations[ix].name;
  }

  /**
   * The duration of an animation in seconds.
   *
   * Carbon: TriGrannyRes::GetAnimationDuration (trinity/trinity/Resources/TriGrannyRes.cpp:1612-1646;
   * TriGrannyRes.h:101). Exposed (TriGrannyRes_Blue.cpp:120-125, MAP_METHOD_AND_WRAP).
   *
   * @param {number} ix Animation index.
   * @returns {number} The duration, or 0 for an index outside the animations.
   */
  GetAnimationDuration(ix)
  {
    if (this.IsUsingCMF()) return 0;

    const fi = this._ValidateAnimationIx(ix);

    if (!fi) return 0;

    return fi.animations[ix].duration;
  }

  /**
   * The number of track groups of the file.
   *
   * Carbon: TriGrannyRes::GetTrackGroupCount (trinity/trinity/Resources/TriGrannyRes.cpp:1504-1521;
   * TriGrannyRes.h:106). Exposed (TriGrannyRes_Blue.cpp:127). Not implemented: it counts
   * `granny_file_info::TrackGroups`, the file's own list; the projection keeps track groups only under
   * each animation.
   *
   * @throws {Error} Always.
   */
  GetTrackGroupCount()
  {
    throw new Error("TriGrannyRes.GetTrackGroupCount is not implemented in CarbonEngineJS.");
  }

  /**
   * The name of a track group of the file.
   *
   * Carbon: TriGrannyRes::GetTrackGroupName (trinity/trinity/Resources/TriGrannyRes.cpp:1523-1545;
   * TriGrannyRes.h:105). Exposed (TriGrannyRes_Blue.cpp:128-132). Not implemented, as `GetTrackGroupCount`.
   *
   * @throws {Error} Always.
   */
  GetTrackGroupName(_groupIdx)
  {
    throw new Error("TriGrannyRes.GetTrackGroupName is not implemented in CarbonEngineJS.");
  }

  /**
   * The number of vector tracks of a track group of the file.
   *
   * Carbon: TriGrannyRes::GetVectorTrackCount (trinity/trinity/Resources/TriGrannyRes.cpp:1406-1427;
   * TriGrannyRes.h:103). Exposed (TriGrannyRes_Blue.cpp:133-137). Not implemented, as `GetTrackGroupCount`.
   *
   * @throws {Error} Always.
   */
  GetVectorTrackCount(_groupIdx)
  {
    throw new Error("TriGrannyRes.GetVectorTrackCount is not implemented in CarbonEngineJS.");
  }

  /**
   * The name of a vector track of a track group of the file.
   *
   * Carbon: TriGrannyRes::GetVectorTrackName (trinity/trinity/Resources/TriGrannyRes.cpp:1429-1453;
   * TriGrannyRes.h:104). Exposed (TriGrannyRes_Blue.cpp:138-143). Not implemented, as `GetTrackGroupCount`.
   *
   * @throws {Error} Always.
   */
  GetVectorTrackName(_groupIdx, _ix)
  {
    throw new Error("TriGrannyRes.GetVectorTrackName is not implemented in CarbonEngineJS.");
  }

  /**
   * The number of event (text) tracks of a track group of the file.
   *
   * Carbon: TriGrannyRes::GetEventTrackCount (trinity/trinity/Resources/TriGrannyRes.cpp:1455-1476;
   * TriGrannyRes.h:107). Exposed (TriGrannyRes_Blue.cpp:144-148). Not implemented: the projection keeps no text tracks.
   *
   * @throws {Error} Always.
   */
  GetEventTrackCount(_groupIdx)
  {
    throw new Error("TriGrannyRes.GetEventTrackCount is not implemented in CarbonEngineJS.");
  }

  /**
   * The name of an event (text) track of a track group of the file.
   *
   * Carbon: TriGrannyRes::GetEventTrackName (trinity/trinity/Resources/TriGrannyRes.cpp:1478-1502;
   * TriGrannyRes.h:108). Exposed (TriGrannyRes_Blue.cpp:149-154). Not implemented: the projection keeps no text tracks.
   *
   * @throws {Error} Always.
   */
  GetEventTrackName(_groupIdx, _ix)
  {
    throw new Error("TriGrannyRes.GetEventTrackName is not implemented in CarbonEngineJS.");
  }

  /**
   * The nearest triangle a ray hits.
   *
   * Carbon: TriGrannyRes::RayIntersection (trinity/trinity/Resources/TriGrannyRes.cpp:2096-2276;
   * TriGrannyRes.h:110) and, for a Granny file, `GrannyRayIntersection` (cpp:1830-2085). Exposed
   * (TriGrannyRes_Blue.cpp:157-165, MAP_METHOD_AND_WRAP). Each triangle of the chosen mesh (every mesh
   * when `meshIndex` is negative) and area (every area when `areaIndex` is negative; it needs a mesh)
   * is tested with `IntersectTri`; the nearest hit fills the result: position, and the interpolated
   * normal (normalised), first texture coordinates and the first bone index of the first vertex when the
   * mesh has those channels.
   *
   * Adapted: the file is the payload and its channels are the projection's float arrays, so the
   * vertex members are read from `vertex.position`, `normal`, `texcoord0` and `blendIndice` with the
   * channel's own width (a four-wide position is read as its first three). Carbon reads the bone index
   * as the first byte of the vertex's index member; the projection holds it as a number. A mesh with no
   * index stream is skipped, as one with no `PrimaryTopology` is. A mesh without a position channel is skipped.
   *
   * quirk: like Carbon, a hit is found among triangles whose `dist` is below the closest so far with no
   * back-face test; two triangles at the same distance keep the first.
   *
   * @param {ArrayLike<number>} pos Ray origin.
   * @param {ArrayLike<number>} dir Ray direction.
   * @param {number} meshIndex Mesh to test; negative for all.
   * @param {number} areaIndex Area to test; negative for all.
   * @returns {Tr2GrannyIntersectionResult|null} The hit, or null.
   */
  RayIntersection(pos, dir, meshIndex, areaIndex)
  {
    if (this.IsUsingCMF()) return null;

    const fi = this.GetPayload();

    if (!fi) return null;

    if (meshIndex >= 0 && meshIndex >= fi.meshes.length) return null;
    if (areaIndex >= 0 && meshIndex < 0) return null;
    if (areaIndex >= 0)
    {
      if (!fi.meshes[meshIndex].indexBuffer) return null;
      if (areaIndex >= fi.meshes[meshIndex].indices.length) return null;
    }

    const meshCount = meshIndex >= 0 ? 1 : fi.meshes.length;
    const meshOffset = meshIndex >= 0 ? meshIndex : 0;
    let closestDist = 3.4028234663852886e38;
    let result = null;

    for (let i = 0; i < meshCount; ++i)
    {
      const mesh = fi.meshes[i + meshOffset];

      if (!mesh.indexBuffer) continue;

      const vertices = mesh.vertex;
      const vertexCount = mesh.vertexCount ?? vertices.position.length / 3;

      if (!vertices.position.length) continue;

      const positionWidth = vertices.position.length / vertexCount;
      const normalWidth = vertices.normal.length / vertexCount;
      const uvWidth = vertices.texcoord0.length / vertexCount;
      const boneWidth = vertices.blendIndice.length / vertexCount;
      const area = areaIndex >= 0 ? mesh.indices[areaIndex] : null;
      let index = area ? area.firstElement * 3 : 0;
      const triCount = area ? area.faces.length / 3 : mesh.indexBuffer.length / 3;

      for (let j = 0; j < triCount; ++j)
      {
        const a = mesh.indexBuffer[index++];
        const b = mesh.indexBuffer[index++];
        const c = mesh.indexBuffer[index++];
        const p0 = vertices.position.subarray(a * positionWidth, a * positionWidth + 3);
        const p1 = vertices.position.subarray(b * positionWidth, b * positionWidth + 3);
        const p2 = vertices.position.subarray(c * positionWidth, c * positionWidth + 3);
        const hit = IntersectTri(p0, p1, p2, pos, dir);

        if (hit === null || !(hit.dist < closestDist)) continue;

        closestDist = hit.dist;
        result = new Tr2GrannyIntersectionResult();
        result.meshIndex = i + meshOffset;
        result.areaIndex = area ? areaIndex : this._FindAreaIndex(mesh, index - 3);

        for (let k = 0; k < 3; ++k)
        {
          result.position[k] = f(f(p0[k] + f(f(p1[k] - p0[k]) * hit.u)) + f(f(p2[k] - p0[k]) * hit.v));
        }
        result.hasPosition = true;

        if (normalWidth)
        {
          const n = [ 0, 0, 0 ];
          for (let k = 0; k < 3; ++k)
          {
            const n0 = vertices.normal[a * normalWidth + k];
            n[k] = f(f(n0 + f(f(vertices.normal[b * normalWidth + k] - n0) * hit.u)) + f(f(vertices.normal[c * normalWidth + k] - n0) * hit.v));
          }
          const length = f(Math.sqrt(f(f(f(n[0] * n[0]) + f(n[1] * n[1])) + f(n[2] * n[2]))));
          for (let k = 0; k < 3; ++k) result.normal[k] = f(n[k] / length);
          result.hasNormal = true;
        }
        else
        {
          result.normal.fill(0);
          result.hasNormal = false;
        }

        if (uvWidth)
        {
          for (let k = 0; k < 2; ++k)
          {
            const t0 = vertices.texcoord0[a * uvWidth + k];
            result.uv[k] = f(f(t0 + f(f(vertices.texcoord0[b * uvWidth + k] - t0) * hit.u)) + f(f(vertices.texcoord0[c * uvWidth + k] - t0) * hit.v));
          }
          result.hasUv = true;
        }
        else
        {
          result.uv.fill(0);
          result.hasUv = false;
        }

        if (boneWidth)
        {
          result.boneIndex = vertices.blendIndice[a * boneWidth];
          result.hasBoneIndex = true;
        }
        else
        {
          result.boneIndex = -1;
          result.hasBoneIndex = false;
        }
      }
    }

    return result;
  }

  /**
   * The area whose triangle range holds a triangle's first index.
   *
   * Carbon: FindAreaIndex, an anonymous-namespace helper of TriGrannyRes.cpp (cpp:1937-1948). The index
   * is divided by 3 and the first group with `TriFirst <= index < TriFirst + TriCount` wins.
   *
   * @param {object} mesh A projected mesh.
   * @param {number} index Index of the triangle's first vertex index.
   * @returns {number} The area index, or -1.
   */
  _FindAreaIndex(mesh, index)
  {
    const triangle = Math.trunc(index / 3);

    for (let i = 0; i < mesh.indices.length; ++i)
    {
      const group = mesh.indices[i];

      if (triangle >= group.firstElement && triangle < group.firstElement + group.faces.length / 3) return i;
    }

    return -1;
  }

  /**
   * A `TriGeometryRes` made from this resource, for baking blendshapes.
   *
   * Carbon: TriGrannyRes::CreateGeometryRes (trinity/trinity/Resources/TriGrannyRes.cpp:1737-1752;
   * TriGrannyRes.h:111). Exposed (TriGrannyRes_Blue.cpp:36-41, MAP_METHOD_AND_WRAP). Not implemented:
   * it calls `TriGeometryRes::PrepareFromGrannyRes`, which `TriGeometryRes` does not have.
   *
   * @throws {Error} Always.
   */
  CreateGeometryRes()
  {
    throw new Error("TriGrannyRes.CreateGeometryRes is not implemented in CarbonEngineJS.");
  }

  /**
   * Bakes a blendshape by naming each morph target's weight.
   *
   * Carbon: TriGrannyRes::BakeBlendshape (trinity/trinity/Resources/TriGrannyRes.cpp:417-421;
   * TriGrannyRes.h:73), the overload taking `NameToWeightMap`. Not implemented: it blends the morph
   * targets into a vertex buffer and uploads it through a `Tr2SuballocatedBuffer::Allocation`.
   *
   * @throws {Error} Always.
   */
  BakeBlendshape__NameToWeight(_meshIx, _nameToWeight, _vertexData, _renderContext, _vertexDataSize)
  {
    throw new Error("TriGrannyRes.BakeBlendshape__NameToWeight is not implemented in CarbonEngineJS.");
  }

  /**
   * Bakes a blendshape from a weight list matching the morph target layout.
   *
   * Carbon: TriGrannyRes::BakeBlendshape (trinity/trinity/Resources/TriGrannyRes.cpp:412-415;
   * TriGrannyRes.h:76), the overload taking `std::vector<float>` weights. Not implemented, as
   * `BakeBlendshape__NameToWeight`.
   *
   * @throws {Error} Always.
   */
  BakeBlendshape__Weights(_meshIx, _weights, _vertexData, _renderContext, _vertexDataSize)
  {
    throw new Error("TriGrannyRes.BakeBlendshape__Weights is not implemented in CarbonEngineJS.");
  }

  /**
   * The shared body of the blendshape bakes.
   *
   * Carbon: TriGrannyRes::BakeBlendshape (trinity/trinity/Resources/TriGrannyRes.cpp:423-957;
   * TriGrannyRes.h:171), protected, the overload with the optional name map and `deltaOnly`. Not
   * implemented, as `BakeBlendshape__NameToWeight`.
   *
   * @throws {Error} Always.
   */
  _BakeBlendshape__DeltaOnly(_meshIx, _weights, _vertexData, _renderContext, _vertexDataSize, _nameToWeight, _deltaOnly)
  {
    throw new Error("TriGrannyRes._BakeBlendshape__DeltaOnly is not implemented in CarbonEngineJS.");
  }

  /**
   * Bakes a blendshape into a geometry resource, for script.
   *
   * Carbon: TriGrannyRes::BakeBlendshapeFromScript (trinity/trinity/Resources/TriGrannyRes.cpp:1754-1798;
   * TriGrannyRes.h:112). Exposed as "BakeBlendshape" (TriGrannyRes_Blue.cpp:42-49, MAP_METHOD_AND_WRAP).
   * Not implemented: it needs the geometry resource's LOD vertex allocation and `BakeBlendshape`.
   *
   * @throws {Error} Always.
   */
  BakeBlendshapeFromScript(_meshIx, _weights, _geom)
  {
    throw new Error("TriGrannyRes.BakeBlendshapeFromScript is not implemented in CarbonEngineJS.");
  }

  /**
   * The CMF data.
   *
   * Carbon: TriGrannyRes::GetCMFData (trinity/trinity/Resources/TriGrannyRes.cpp:1809-1812;
   * TriGrannyRes.h:114). Not supported: `cmf::Data` is the native CMF library's structure and
   * `Tr2CmfContents` is not ported (resource/dropped).
   *
   * @throws {Error} Always.
   */
  GetCMFData()
  {
    throw new Error("TriGrannyRes.GetCMFData: Tr2CmfContents is not supported.");
  }

  /**
   * The bytes of a CMF buffer view.
   *
   * Carbon: TriGrannyRes::GetCMFViewData (trinity/trinity/Resources/TriGrannyRes.cpp:1814-1817;
   * TriGrannyRes.h:115). Not supported, as `GetCMFData`.
   *
   * @throws {Error} Always.
   */
  GetCMFViewData(_view)
  {
    throw new Error("TriGrannyRes.GetCMFViewData: Tr2CmfContents is not supported.");
  }

  /**
   * The CMF contents.
   *
   * Carbon: TriGrannyRes::GetCMFContents (trinity/trinity/Resources/TriGrannyRes.cpp:1819-1822;
   * TriGrannyRes.h:116). Not supported, as `GetCMFData`.
   *
   * @throws {Error} Always.
   */
  GetCMFContents()
  {
    throw new Error("TriGrannyRes.GetCMFContents: Tr2CmfContents is not supported.");
  }

  /**
   * Carbon `DoPrepare` (TriGrannyRes.cpp:271-275): nothing to prepare.
   *
   * @returns {boolean} Always true.
   */
  _DoPrepare()
  {
    return true;
  }

  static payload = ResourceRequirement.GEOMETRY;
}


CjsSchema.decorateField(TriGrannyRes, "_useCMF", meta.implemented);
CjsSchema.decorateMethod(TriGrannyRes, "IsMemoryUsageKnown", blue.method, meta.implemented);
CjsSchema.decorateMethod(TriGrannyRes, "GetMemoryUsage", blue.method, meta.implemented);
CjsSchema.decorateMethod(TriGrannyRes, "Load", be.mapMethodAndWrap("LoadForTools"), meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "IsUsingCMF", meta.implemented);
CjsSchema.decorateMethod(TriGrannyRes, "GetGrannyFile", meta.notSupported);
CjsSchema.decorateMethod(TriGrannyRes, "GetGrannySkeleton", meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "GetGrannyMesh", meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetGrannyVertexType", meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "GetVertexSize", meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "GetVertexComponentOffset", meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "ValidateFileInfo", meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "_ValidateAnimationIx", meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "_ValidateMeshIndex", meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetModelCount", meta.adapted);
CjsSchema.decorateField(TriGrannyRes, "modelCount", be.mapPropertyReadOnly(), type.int32, meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetModelName", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshCount", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateField(TriGrannyRes, "meshCount", be.mapPropertyReadOnly(), type.int32, meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshAreaCount", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshName", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshBoneBindings", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshVertexElements", be.mapMethodAndWrap(), meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshTriangleCount", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshMorphCount", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshMorphName", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetAllMeshMorphNamesNoDigits", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetAnimationCount", meta.adapted);
CjsSchema.decorateField(TriGrannyRes, "animationCount", be.mapPropertyReadOnly(), type.int32, meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetAnimationName", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetAnimationDuration", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "GetTrackGroupCount", be.mapMethodAndWrap(), meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "GetTrackGroupName", be.mapMethodAndWrap(), meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "GetVectorTrackCount", be.mapMethodAndWrap(), meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "GetVectorTrackName", be.mapMethodAndWrap(), meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "GetEventTrackCount", be.mapMethodAndWrap(), meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "GetEventTrackName", be.mapMethodAndWrap(), meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "RayIntersection", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "_FindAreaIndex", meta.cjs, meta.adapted);
CjsSchema.decorateMethod(TriGrannyRes, "CreateGeometryRes", be.mapMethodAndWrap(), meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "BakeBlendshape__NameToWeight", meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "BakeBlendshape__Weights", meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "_BakeBlendshape__DeltaOnly", meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "BakeBlendshapeFromScript", be.mapMethodAndWrap("BakeBlendshape"), meta.notImplemented);
CjsSchema.decorateMethod(TriGrannyRes, "GetCMFData", meta.notSupported);
CjsSchema.decorateMethod(TriGrannyRes, "GetCMFViewData", meta.notSupported);
CjsSchema.decorateMethod(TriGrannyRes, "GetCMFContents", meta.notSupported);
CjsSchema.decorateMethod(TriGrannyRes, "_DoPrepare", meta.implemented);
CjsSchema.decorateMethod(TriGrannyRes, "_GetValidMesh", meta.cjs, meta.adapted);
CjsSchema.exposure.define("TriGrannyRes")(TriGrannyRes);
blue.inherit(ICacheable)(TriGrannyRes, { kind: "class" });
CjsSchema.exposure.mapInterface(ICacheable)(TriGrannyRes);
