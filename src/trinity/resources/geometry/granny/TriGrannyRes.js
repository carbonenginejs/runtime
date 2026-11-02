import { exposure as be } from "#be";
// Source: trinity/trinity/Resources/TriGrannyRes.h
// Source: trinity/trinity/Resources/TriGrannyRes.cpp
// Source: trinity/trinity/Resources/TriGrannyRes_Blue.cpp
import { CjsSchema, type } from "#schema";
import { BlueAsyncRes, ICacheable, blue as blueService } from "#blue";
import * as CcpLog from "../../../../global/logging/ccpLog.js";
import { CjsGr2Format } from "../../../../resource/formats/gr2/CjsGr2Format.js";
import { readGr2Sections } from "../../../../resource/formats/gr2/core/reader.js";
import { assertResourcePayloadObject, resourcePayloadError } from "../../resourceBoundary.js";
import { Failed } from "../../../../trinityal/ALResult.js";
import { TriGeometryRes } from "../TriGeometryRes.js";
import { GrannyGetTotalTypeSize } from "../../../utilities/GeometryUtils.js";
import { CjsCmfFormat } from "../../../../resource/formats/cmf/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../core/context/Tr2RenderContext.js";
import { Tr2GrannyIntersectionResult } from "./Tr2GrannyIntersectionResult.js";

// std::numeric_limits<float>::min()
const FLOAT_MIN = 1.1754943508222875e-38;

const f = Math.fround;

// The JS GR2 projection needs canonical conversion; native CMF already owns
// decoded channels. Cache by payload identity so replacing/releasing a payload
// cannot reuse stale channels, and a drag never reconverts every mesh.
const canonicalMorphSources = new WeakMap();

/** Returns immutable canonical source channels for this projected payload. */
function CanonicalMorphSource(payload)
{
  let source = canonicalMorphSources.get(payload);
  if (!source)
  {
    source = CjsCmfFormat.loadShared(payload);
    canonicalMorphSources.set(payload, source);
  }
  return source;
}

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
 * Offsets of the Position and Normal members of a Granny vertex type, and whether each is Real16
 * (BakeBlendshape's DatatypeInfo, TriGrannyRes.cpp:638-700).
 *
 * @param {Array<{name: string, type: number, arrayWidth: number}>} members Granny vertex type.
 * @returns {Object<string, {offset: number, half: boolean}>} Info by member name.
 */
function GrannyMemberInfos(members)
{
  const infos = {};
  let offset = 0;
  for (const member of members)
  {
    if (member.name === "Position" || member.name === "Normal") infos[member.name] = { offset, half: member.type === 21 };
    offset += GrannyGetTotalTypeSize(member);
  }
  return infos;
}

/**
 * One float component, Real32 or Real16 (Vector3_16).
 *
 * @param {DataView} view Bytes.
 * @param {number} offset Element offset.
 * @param {number} axis Component.
 * @param {boolean} half Whether the element is Real16.
 * @returns {number} The value.
 */
function ReadGrannyFloat(view, offset, axis, half)
{
  return half ? HalfToFloat(view.getUint16(offset + axis * 2, true)) : view.getFloat32(offset + axis * 4, true);
}

/**
 * Writes one float component, Real32 or Real16 (Vector3_16).
 *
 * @param {DataView} view Bytes.
 * @param {number} offset Element offset.
 * @param {number} axis Component.
 * @param {boolean} half Whether the element is Real16.
 * @param {number} value The value.
 */
function WriteGrannyFloat(view, offset, axis, half, value)
{
  if (half) view.setUint16(offset + axis * 2, FloatToHalf(value), true);
  else view.setFloat32(offset + axis * 4, value, true);
}

/**
 * IEEE half to float.
 *
 * @param {number} h Half bits.
 * @returns {number} The value.
 */
function HalfToFloat(h)
{
  const sign = h & 0x8000 ? -1 : 1, exponent = (h >> 10) & 0x1f, fraction = h & 0x3ff;
  if (exponent === 0) return sign * fraction * 2 ** -24;
  if (exponent === 31) return fraction ? NaN : sign * Infinity;
  return sign * (1 + fraction / 1024) * 2 ** (exponent - 15);
}

/**
 * Float to IEEE half, rounding to nearest; subnormals flush to zero.
 *
 * @param {number} value The value.
 * @returns {number} Half bits.
 */
function FloatToHalf(value)
{
  const u = new Uint32Array(new Float32Array([ value ]).buffer)[0];
  const sign = (u >> 16) & 0x8000, exponent = ((u >> 23) & 0xff) - 127 + 15, mantissa = u & 0x7fffff;
  if (exponent <= 0) return sign;
  if (exponent >= 31) return sign | 0x7c00;
  // Added, not or-ed: a mantissa that rounds up to 1024 carries into the exponent.
  const half = sign + (exponent << 10) + Math.round(mantissa / 0x2000);
  return half;
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
export class TriGrannyRes extends BlueAsyncRes
{
  /**
   * m_memoryUsage: the sum of the file's expanded section sizes, set once the
   * Granny file is read (TriGrannyRes.cpp:253-258), so MotherLode can cache
   * the resource by size. A `.cmf` would take the stream's size (:213), but a
   * `.cmf` cannot load here, so it stays 0 and the cache does not keep it
   * (MotherLode.cpp:381-387), as for any failed load.
   */
  _memoryUsage = 0;

  /**
   * m_useCMF - whether the file is a `.cmf` (TriGrannyRes.h:140).
   *
   * @implemented
   */
  _useCMF = false;

  /**
   * Check application registration before opening the source through resMan.
   *
   * @implemented
   * @adapted
   * @returns {Promise<boolean>} Whether the configured source opened.
   * @throws {Error} When the source extension has no registered reader.
   */
  _DoOpenStream()
  {
    blueService.resMan.GetResourceFormat(this);
    return super._DoOpenStream();
  }

  /**
   * Carbon DoLoad (TriGrannyRes.cpp:200-260). Browser reads may use a worker;
   * retain the decoded Granny projection after the manager checks cancellation.
   *
   * @adapted
   * @returns {Promise<number>} Native LoadingResult.
   */
  async _DoLoad()
  {
    this._useCMF = this.GetFilePath().endsWith(".cmf");
    if (this._useCMF) return BlueAsyncRes.LoadingResult.LR_FAILED;
    const resMan = blueService.resMan;
    const attempt = resMan._GetResourceLoad(this);
    const descriptor = blueService.resMan.GetResourceFormat(this);
    // The section array is read from the header first: the read may transfer the bytes to a worker.
    const sections = readGr2Sections(this._dataStream.data);
    const payload = await resMan.ReadFormatOnce(this, descriptor, this._dataStream.data,
      resMan._GetResourceRequest(this));
    resMan._AssertResourceLoad(this, attempt);
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
    this._grannyFile = payload;
    this._memoryUsage = 0;
    for (let i = 0; i < sections.length; i++) this._memoryUsage += sections[i].expandedSize;
    return BlueAsyncRes.LoadingResult.LR_SUCCESS;
  }


  /**
   * Carbon `IsMemoryUsageKnown` (TriGrannyRes.cpp:1727-1730): known once loaded.
   *
   * @implemented
   * @returns {boolean}
   */
  IsMemoryUsageKnown()
  {
    return !this.IsLoading();
  }

  /**
   * Carbon `GetMemoryUsage` (TriGrannyRes.cpp:1732-1735): `m_memoryUsage`.
   *
   * @implemented
   * @returns {number} Bytes.
   */
  GetMemoryUsage()
  {
    return this._memoryUsage;
  }

  /**
   * Carbon Load (TriGrannyRes.cpp:173-198), exposed as LoadForTools.
   *
   * @adapted browser I/O and decoding use resMan's normal background/worker
   *   and main preparation queues instead of Carbon's inline stream read.
   * @param {string} path Resource path.
   * @returns {Promise<boolean>} Whether loading and preparation succeeded.
   */
  async Load(path)
  {
    this.CancelPendingLoad();
    this.Initialize(path, "raw");
    try
    {
      await blueService.resMan.Ready(this);
      return this.IsGood();
    }
    catch
    {
      return false;
    }
  }

  /**
   * Whether the file was loaded as a `.cmf`.
   *
   * Carbon: TriGrannyRes::IsUsingCMF (trinity/trinity/Resources/TriGrannyRes.cpp:1800-1807;
   * TriGrannyRes.h:112). `WITH_GRANNY` is on (decorator-upgrade.md § 00), so it answers `m_useCMF`.
   *
   * @implemented
   * @returns {boolean} Whether `Load` was given a `.cmf`.
   */
  IsUsingCMF()
  {
    return this._useCMF;
  }

  /**
   * Carbon GetGrannyFile (TriGrannyRes.h:50-53). Adapted: the decoded JS graph
   * represents the native Granny file; no pointer escapes into JavaScript.
   *
   * @adapted
   * @returns {object|null} Retained Granny graph.
   */
  GetGrannyFile()
  {
    return this._grannyFile;
  }

  /**
   * One skeleton of the file.
   *
   * Carbon: TriGrannyRes::GetGrannySkeleton (trinity/trinity/Resources/TriGrannyRes.cpp:351-380;
   * TriGrannyRes.h:55). Not implemented: it indexes `granny_file_info::Skeletons`, the file's skeleton
   * list, which the projection does not keep (a model carries its own skeleton record).
   *
   * @notImplemented
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
   * @adapted the file is the payload and the mesh is its projected mesh record, not a `granny_mesh`.
   * @param {number} meshIx Mesh index.
   * @returns {object|null} The projected mesh, or null.
   */
  GetGrannyMesh(meshIx)
  {
    const payload = this.GetGrannyFile();

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
   * @notImplemented
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
   * @notImplemented
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
   * @notImplemented
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
   * @adapted `granny_file_info*` is the payload, the projection `CjsGr2Format` emits. It has no
   *   separate "invalid file info" state, so only the first message applies.
   * @returns {object|null} The payload, or null.
   */
  ValidateFileInfo()
  {
    const payload = this.GetGrannyFile();

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
   * @adapted
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
   * @adapted `Be::Result<std::string>` success is undefined and the failure message is thrown. Since
   *   `Tr2CmfContents` is not ported the contents are always empty, so the first check always fails.
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
   * @adapted
   * @returns {number} The number of animations of a loaded file; 0 for the CMF branch or without a file.
   */
  GetModelCount()
  {
    if (this.IsUsingCMF()) return 0;

    const fi = this.ValidateFileInfo();

    if (!fi) return 0;

    return fi.animations.length;
  }

  /**
   * Carbon property "modelCount" (TriGrannyRes_Blue.cpp:50-53, MAP_PROPERTY_READONLY): `GetModelCount`.
   *
   * @adapted
   */
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
   * @adapted
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
   * @adapted
   * @returns {number} The mesh count; 0 for the CMF branch or without a file.
   */
  GetMeshCount()
  {
    if (this.IsUsingCMF()) return 0;

    const fi = this.ValidateFileInfo();

    if (!fi) return 0;

    return fi.meshes.length;
  }

  /**
   * Carbon property "meshCount" (TriGrannyRes_Blue.cpp:60-63, MAP_PROPERTY_READONLY): `GetMeshCount`.
   *
   * @adapted
   */
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
   * @cjs
   * @adapted
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
   * @adapted `Be::Result<std::string>` with the output `count` is the count returned and a failed
   *   result is a thrown `Error` with Carbon's message. The projection keeps the topology's index groups
   *   and not the material bindings, so a mesh with no topology answers 0.
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
   * @adapted the output `name` is returned and a failed `Be::Result` is thrown, as `GetMeshAreaCount`.
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
   * @adapted the output vector is returned (a new array) and a failed `Be::Result` is thrown.
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
   * @notImplemented
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
   * @adapted the output `count` is returned and a failed `Be::Result` is thrown. A group's `TriCount`
   *   is the length of its `faces` view over three.
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
   * @adapted the output `count` is returned and a failed `Be::Result` is thrown. The projection lists
   *   the morph targets followed by the annotation sets that hold rows, so an annotation set with no
   *   rows is not counted.
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
   * @adapted the output `name` is returned and a failed `Be::Result` is thrown (the extra message is
   *   "Morph target index out of range").
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
   * @adapted the output vector is returned (a new array) and a failed `Be::Result` is thrown.
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
   * @adapted
   * @returns {number} The animation count; 0 for the CMF branch or without a file.
   */
  GetAnimationCount()
  {
    if (this.IsUsingCMF()) return 0;

    const fi = this.ValidateFileInfo();

    if (!fi) return 0;

    return fi.animations.length;
  }

  /**
   * Carbon property "animationCount" (TriGrannyRes_Blue.cpp:111-114, MAP_PROPERTY_READONLY): `GetAnimationCount`.
   *
   * @adapted
   */
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
   * @adapted
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
   * @adapted
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
   * @notImplemented
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
   * @notImplemented
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
   * @notImplemented
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
   * @notImplemented
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
   * @notImplemented
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
   * @notImplemented
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
   * quirk: like Carbon, a hit is found among triangles whose `dist` is below the closest so far with no
   * back-face test; two triangles at the same distance keep the first.
   *
   * @adapted the file is the payload and its channels are the projection's float arrays, so the
   *   vertex members are read from `vertex.position`, `normal`, `texcoord0` and `blendIndice` with the
   *   channel's own width (a four-wide position is read as its first three). Carbon reads the bone index
   *   as the first byte of the vertex's index member; the projection holds it as a number. A mesh with no
   *   index stream is skipped, as one with no `PrimaryTopology` is. A mesh without a position channel is skipped.
   * @param {ArrayLike<number>} pos Ray origin.
   * @param {ArrayLike<number>} dir Ray direction.
   * @param {number} meshIndex Mesh to test; negative for all.
   * @param {number} areaIndex Area to test; negative for all.
   * @returns {Tr2GrannyIntersectionResult|null} The hit, or null.
   */
  RayIntersection(pos, dir, meshIndex, areaIndex)
  {
    if (this.IsUsingCMF()) return null;

    const fi = this.GetGrannyFile();

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
   * @cjs
   * @adapted
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
   * Carbon CreateGeometryRes (TriGrannyRes.cpp:1737-1752), with lazy JS device allocation.
   *
   * @adapted
   */
  CreateGeometryRes()
  {
    const geometry = new TriGeometryRes();
    geometry.PrepareFromGrannyRes(this);
    return geometry;
  }

  /**
   * Bakes a blendshape by naming each morph target's weight.
   *
   * Carbon: TriGrannyRes::BakeBlendshape (trinity/trinity/Resources/TriGrannyRes.cpp:417-421;
   * TriGrannyRes.h:73), the overload taking `NameToWeightMap`. Not implemented: it blends the morph
   * targets into a vertex buffer and uploads it through a `Tr2SuballocatedBuffer::Allocation`.
   *
   * @notImplemented
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
   * @notImplemented
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
   * @notImplemented
   * @throws {Error} Always.
   */
  _BakeBlendshape__DeltaOnly(_meshIx, _weights, _vertexData, _renderContext, _vertexDataSize, _nameToWeight, _deltaOnly)
  {
    throw new Error("TriGrannyRes._BakeBlendshape__DeltaOnly is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon BakeBlendshape's Granny branch (TriGrannyRes.cpp:566-900) for a destination geometry
   * read as Granny: the base vertices as Granny stores them, plus each weighted target's Position and
   * Normal (Real32 or Real16, either side), from morph targets or, without them, the vertex
   * annotation sets; uploaded into the destination's LOD-zero allocation, whose size must match.
   *
   * @adapted the Granny mesh is the destination geometry's own granny file (the same file this
   *   resource reads as shared data), since Carbon bakes from the file's vertex bytes and this
   *   resource does not keep them. Name-to-weight and delta-only baking are not reached here.
   * @param {number} meshIx Granny mesh index in the file.
   * @param {ArrayLike<number>} weights One weight per target.
   * @param {TriGeometryRes} geom Destination geometry read as Granny.
   * @returns {boolean} True after a successful vertex upload.
   * @throws {Error} With Carbon's messages, when the mesh, weights or destination do not fit.
   */
  _BakeBlendshape__GrannyFile(meshIx, weights, geom)
  {
    const mesh = geom.GetGrannyInfo()?.Meshes?.[meshIx];
    if (!mesh) throw new Error("Mesh index out of range");
    const lod = geom.GetMeshLod__LodIndex(meshIx, 0);
    if (!lod) throw new Error("Trying to bake using geometryRes with NULL lod");
    if (!lod.allocationsValid) throw new Error("Trying to bake to a null vertex buffer");
    const vertices = mesh.PrimaryVertexData.Vertices;
    const vertexCount = vertices.count, bytesPerVertex = vertices.stride;
    if (vertexCount * bytesPerVertex !== lod.vertexCount * lod.mesh.bytesPerVertex) throw new Error("TriGrannyRes::BakeBlendshape: Incorrect vertex buffer size");

    const annotations = mesh.PrimaryVertexData.VertexAnnotationSets ?? [];
    const fromAnnotations = !(mesh.MorphTargets ?? []).length;
    const numBlends = fromAnnotations ? annotations.length : mesh.MorphTargets.length;
    if (numBlends === 0) return true;
    if (weights.length !== numBlends)
    {
      throw new Error("TriGrannyRes::BakeBlendshape: Incorrect number of weights - " + weights.length + " given, " + numBlends + " expected");
    }
    const blendFormat = fromAnnotations
      ? annotations.find(set => set.VertexAnnotations?.type)?.VertexAnnotations?.type
      : mesh.MorphTargets[0].VertexData.Vertices.type;

    const local = new Uint8Array(vertices.bytes); // alloc: Carbon's localVertexData
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    if (!blendFormat)
    {
      if (Failed(lod.vertexAllocation.Update(local, context))) throw new Error("Blendshape vertex upload failed");
      return true;
    }
    const infos = GrannyMemberInfos(vertices.type), blendInfos = GrannyMemberInfos(blendFormat);
    const baseView = new DataView(local.buffer);
    for (let j = 0; j < numBlends; ++j)
    {
      const weight = Math.fround(weights[j]);
      if (weight < Math.fround(1e-4)) continue;
      const blend = fromAnnotations ? annotations[j].VertexAnnotations : mesh.MorphTargets[j].VertexData.Vertices;
      const vertexIndices = fromAnnotations ? annotations[j].VertexAnnotationIndices : null;
      const count = fromAnnotations ? vertexIndices?.length ?? 0 : blend.count;
      if (!fromAnnotations && count !== vertexCount)
      {
        throw new Error("TriGrannyRes::BakeBlendshape: Vertex count of morph target doesn't match vertex count of base vertex data");
      }
      const blendView = new DataView(blend.bytes.buffer, blend.bytes.byteOffset, blend.bytes.byteLength);
      for (const name of [ "Position", "Normal" ])
      {
        const base = infos[name], delta = blendInfos[name];
        if (!base || !delta) continue;
        for (let i = 0; i < count; ++i)
        {
          const vertexIx = vertexIndices ? vertexIndices[i] : i;
          const baseOffset = vertexIx * bytesPerVertex + base.offset, deltaOffset = i * blend.stride + delta.offset;
          for (let axis = 0; axis < 3; axis++)
          {
            const value = ReadGrannyFloat(baseView, baseOffset, axis, base.half)
              + weight * ReadGrannyFloat(blendView, deltaOffset, axis, delta.half);
            WriteGrannyFloat(baseView, baseOffset, axis, base.half, value);
          }
        }
      }
    }
    if (Failed(lod.vertexAllocation.Update(local, context))) throw new Error("Blendshape vertex upload failed");
    return true;
  }

  /**
   * Bakes weights from immutable source channels into an allocated destination.
   * Carbon: TriGrannyRes.cpp:423-565,1754-1798. Adapted: Granny is normalized
   * to CMF by the JS reader, so its absolute-target arithmetic is used even
   * for GR2 input. Unsupported packed frames fail before upload. Float32
   * operations retain the native threshold and do not clamp weights above one.
   * As in Carbon, CPU source channels stay immutable; only the destination
   * vertex allocation is rewritten. Picking retains the source geometry.
   *
   * @adapted
   * @param {number} meshIx Source and destination mesh index.
   * @param {ArrayLike<number>} weights Weights in exact source target order.
   * @param {TriGeometryRes} geom Independently owned destination geometry.
   * @returns {boolean} True after a successful vertex upload.
   */
  BakeBlendshapeFromScript(meshIx, weights, geom)
  {
    if (!geom.IsUsingCMF()) return this._BakeBlendshape__GrannyFile(meshIx, weights, geom);
    const source = CanonicalMorphSource(this.GetGrannyFile()).meshes[meshIx];
    const destination = geom.GetMeshData(meshIx);
    const lod = geom.GetMeshLod__LodIndex(meshIx, 0);
    if (!source || !destination || !lod?.allocationsValid) throw new Error("Blendshape requires a valid allocated destination LOD");
    if (weights.length !== source.morphTargets.targets.length) throw new RangeError("Blendshape weight count does not match targets");
    if (source.decl.some(element => /PackedTangent/.test(element.usage))) throw new Error("Packed tangent blendshape baking is not implemented");
    const base = source.lods[0].vertex;
    const destinationVertex = geom.GetCMFLod(meshIx, lod)?.vertex;
    if (!base.position || !destinationVertex || destinationVertex.position.length !== base.position.length) throw new Error("Blendshape destination layout mismatch");
    const vertex = Object.fromEntries(Object.entries(base).map(([key, value]) => [key, value.slice()]));

    for (let index = 0; index < weights.length; index++)
    {
      const weight = f(weights[index]);
      if (!Number.isFinite(weight)) throw new TypeError("Blendshape weights must be finite float32 values");
      if (weight < f(1e-4)) continue;
      const target = source.lods[0].morphTargets[index].vertex;
      for (const channel of ["position", "normal", "tangent", "binormal"])
      {
        if (!target[channel]) continue;
        if (!base[channel] || target[channel].length !== base[channel].length) throw new Error("Blendshape channel layout mismatch");
        for (let i = 0; i < vertex[channel].length; i++)
          vertex[channel][i] = f(vertex[channel][i] + f(weight * f(target[channel][i] - base[channel][i])));
      }
    }
    const packed = TriGeometryRes.packLodGeometry({ ...source, lods: [{ ...source.lods[0], vertex }] }, 0);
    if (packed.vertex.stride !== destination.bytesPerVertex || packed.vertex.count !== lod.vertexCount) throw new Error("Blendshape destination buffer mismatch");
    if (Failed(lod.vertexAllocation.Update(packed.vertex.bytes, Tr2RenderContext_GetMainThreadRenderContext())))
    {
      throw new Error("Blendshape vertex upload failed");
    }
    return true;
  }

  /**
   * The CMF data.
   *
   * Carbon: TriGrannyRes::GetCMFData (trinity/trinity/Resources/TriGrannyRes.cpp:1809-1812;
   * TriGrannyRes.h:114). Not supported: `cmf::Data` is the native CMF library's structure and
   * `Tr2CmfContents` is not ported (resource/dropped).
   *
   * @notSupported
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
   * @notSupported
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
   * @notSupported
   * @throws {Error} Always.
   */
  GetCMFContents()
  {
    throw new Error("TriGrannyRes.GetCMFContents: Tr2CmfContents is not supported.");
  }

  /**
   * Carbon `DoPrepare` (TriGrannyRes.cpp:271-275): nothing to prepare.
   *
   * @implemented
   * @returns {boolean} Always true.
   */
  _DoPrepare()
  {
    return true;
  }


  /** m_grannyFile, represented by the decoded Granny graph in JS. */
  _grannyFile = null;

  /**
   * Drop the graph owned by Carbon's resource destructor.
   *
   * @adapted explicit JS teardown replaces native destruction; the existing
   *   MotherLode switches keep CPU data and opaque adapter cleanup independent.
   * @param {object} [options={}] Existing MotherLode cleanup policy.
   * @param {boolean} [options.releasePayload=true] Release owned family data.
   * @param {boolean} [options.destroyAdapters=true] Destroy opaque device adapter slots.
   * @returns {void}
   */
  _OnShutdown(options = {})
  {
    if (options.releasePayload === false) return;
    this._grannyFile = null;
    this._memoryUsage = 0;
  }
}


CjsSchema.exposure.mapICacheableMethods()(TriGrannyRes);
CjsSchema.decorateMethod(TriGrannyRes, "Load", be.mapMethodAndWrap("LoadForTools"));
CjsSchema.decorateField(TriGrannyRes, "modelCount", be.mapPropertyReadOnly(), type.int32);
CjsSchema.decorateMethod(TriGrannyRes, "GetModelName", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshCount", be.mapMethodAndWrap());
CjsSchema.decorateField(TriGrannyRes, "meshCount", be.mapPropertyReadOnly(), type.int32);
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshAreaCount", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshName", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshBoneBindings", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshVertexElements", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshTriangleCount", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshMorphCount", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetMeshMorphName", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetAllMeshMorphNamesNoDigits", be.mapMethodAndWrap());
CjsSchema.decorateField(TriGrannyRes, "animationCount", be.mapPropertyReadOnly(), type.int32);
CjsSchema.decorateMethod(TriGrannyRes, "GetAnimationName", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetAnimationDuration", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetTrackGroupCount", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetTrackGroupName", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetVectorTrackCount", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetVectorTrackName", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetEventTrackCount", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "GetEventTrackName", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "RayIntersection", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "CreateGeometryRes", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGrannyRes, "BakeBlendshapeFromScript", be.mapMethodAndWrap("BakeBlendshape"));
CjsSchema.exposure.define("TriGrannyRes")(TriGrannyRes);
be.inherit(ICacheable)(TriGrannyRes, { kind: "class" });
CjsSchema.exposure.mapInterface(ICacheable)(TriGrannyRes);
// Carbon: TriGrannyRes::ExposeToBlue (trinity/trinity/Resources/TriGrannyRes_Blue.cpp:173).
CjsSchema.blue.chainTo(BlueAsyncRes)(TriGrannyRes);





