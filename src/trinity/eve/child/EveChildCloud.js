import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildCloud.h
// Hand-maintained from Carbon source.
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { RenderingMode, TriBatchType } from "#consts/graphics";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Tr2VertexDefinition } from "../../core/vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { TriDevice } from "../../core/device/TriDevice.js";
import { gTriDev } from "../../core/device/gTriDev.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2RenderBatch } from "../../core/batch/TriRenderBatch/Tr2RenderBatch.js";
import { EveChildCloudPerObjectData } from "../../core/rawData/perObjectData/EveChildCloudPerObjectData.js";


const LOCAL_MIN = vec3.fromValues(-0.5, -0.5, -0.5);
const LOCAL_MAX = vec3.fromValues(0.5, 0.5, 0.5);
const PARENT_TRANSFORM = mat4.create();
const BOUNDS_MIN = vec3.create();
const BOUNDS_MAX = vec3.create();


function updateBoundingSphere(cloud)
{
  vec3.transformMat4(BOUNDS_MIN, LOCAL_MIN, cloud.worldTransform);
  vec3.transformMat4(BOUNDS_MAX, LOCAL_MAX, cloud.worldTransform);
  vec4.set(
    cloud.boundingSphere,
    (BOUNDS_MIN[0] + BOUNDS_MAX[0]) * 0.5,
    (BOUNDS_MIN[1] + BOUNDS_MAX[1]) * 0.5,
    (BOUNDS_MIN[2] + BOUNDS_MAX[2]) * 0.5,
    vec3.distance(BOUNDS_MIN, BOUNDS_MAX) * 0.5);
}


/**
 * Legacy transformable volumetric-cloud child. Trinity owns its authored
 * state, SRT composition, visibility, tessellated screen grid and draw data.
 * Source: trinity/trinity/Eve/SpaceObject/Children/EveChildCloud.cpp.
 */
@meta.define({ className: "EveChildCloud", family: "eve/child", purpose: "Describes a transformable volumetric cloud child, including its effect, editable volume, tessellation, LOD, and bounds state." })
@meta.blue.inherit(ITr2Renderable)
@meta.blue.inherit(IInitialize, INotify)
export class EveChildCloud extends EveSpaceObjectChild
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  sortingModifier = 1;

  @meta.blue.read
  @meta.type.uint64
  currentLod = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minScreenSize = 0;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  preTesselationLevel = 32;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Material")
  effect = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("EveCloudEditableVolume")
  volume = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  cellScreenSize = 0.3;

  @meta.blue.readwrite
  @meta.type.boolean
  display = true;

  @meta.blue.read
  @meta.type.vec4
  boundingSphere = vec4.create();

  /** Runtime-local authored SRT transform. */
  localTransform = mat4.create();

  /** Runtime world transform composed during the sync pass. */
  worldTransform = mat4.create();

  /** Whether the last visibility pass accepted the cloud. */
  isVisible = false;

  /** Carbon does not render the cloud before its first update. */
  hasUpdated = false;

  /** LOD factor retained for an engine's tessellation selection. */
  lastLodFactor = 1;

  _vertexBuffer = new Tr2BufferAL();

  _indexBuffers = [];

  _declaration = Tr2EffectStateManager.Unknown;

  /** Registers the native device-resource lifetime and prepares its grid. */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
    this.PrepareResources();
  }

  /** Recreates native geometry; explicit destruction replaces C++ buffer assignment. */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    this._vertexBuffer.Destroy();
    this.ReleaseResources();
    this.PrepareResources();
    return true;
  }

  /** Rebuilds only for the native notified tessellation field (cpp:199-208). */
  @meta.blue.method
  @meta.adapted
  OnModified(names)
  {
    // Adapted: Blue's Var pointer is delivered as a field name or name list.
    if ((Array.isArray(names) ? names : [names]).includes("preTesselationLevel")) this.Initialize();
    return true;
  }

  /** Inherited Tr2DeviceResource.cpp:21-32 resource-creation gate. */
  @meta.blue.method
  @meta.implemented
  PrepareResources()
  {
    return !Tr2Renderer.IsResourceCreationAllowed() || this.OnPrepareResources();
  }

  /** Explicit buffer destruction replaces native index-vector clear (cpp:275-279). */
  @meta.blue.method
  @meta.adapted
  ReleaseResources()
  {
    this._declaration = Tr2EffectStateManager.Unknown;
    for (const buffer of this._indexBuffers) buffer.Destroy();
    this._indexBuffers.length = 0;
  }

  /** Releases final ownership because JavaScript has no deterministic destructor. */
  @meta.ours
  Destroy()
  {
    this.ReleaseResources();
    this._vertexBuffer.Destroy();
    TriDevice.UnregisterResource(this);
  }

  /**
   * Builds Carbon's staggered float2 grid and uint16 LODs (cpp:280-350).
   * Adapted: the AL description replaces the native stride/count overload.
   * Native quirks retained: LODs stop ABOVE 16, and uint16 indices wrap.
   */
  @meta.blue.method
  @meta.adapted
  OnPrepareResources()
  {
    const dimension = this.preTesselationLevel;
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    if (!this._vertexBuffer.IsValid())
    {
      const vertices = new Float32Array((dimension + 1) * (dimension + 1) * 2); // alloc: authored grid vertex stream
      for (let j = 0; j <= dimension; j++)
      {
        for (let i = 0; i <= dimension; i++)
        {
          const offset = (i + j * (dimension + 1)) * 2;
          vertices[offset] = (i - 0.5 + 0.5 * (j % 2)) / (dimension - 0.5) * 2 - 1;
          vertices[offset + 1] = j / dimension * 2 - 1;
        }
      }
      if (Failed(this._vertexBuffer.Create(Tr2BufferDescriptionAL.FromStride(
        8, vertices.length / 2, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.NONE
      ), vertices, context))) return false;
    }
    if (!this._indexBuffers.length)
    {
      let factor = 1;
      for (let dim = dimension; dim > 16; dim = Math.floor(dim / 2))
      {
        const indices = new Uint16Array(dim * dim * 6); // alloc: authored LOD index stream
        let offset = 0;
        for (let j = 0; j < dim; j++)
        {
          for (let i = 0; i < dim; i++)
          {
            const a = (i + j * (dimension + 1)) * factor;
            const b = (i + 1 + j * (dimension + 1)) * factor;
            const c = (i + (j + 1) * (dimension + 1)) * factor;
            const d = (i + 1 + (j + 1) * (dimension + 1)) * factor;
            indices[offset++] = a;
            indices[offset++] = b;
            indices[offset++] = j % 2 ? d : c;
            indices[offset++] = j % 2 ? d : c;
            indices[offset++] = j % 2 ? c : b;
            indices[offset++] = j % 2 ? a : d;
          }
        }
        const buffer = new Tr2BufferAL();
        if (Failed(buffer.Create(Tr2BufferDescriptionAL.FromStride(
          2, indices.length, Tr2GpuUsage.INDEX_BUFFER, Tr2CpuUsage.NONE
        ), indices, context))) return false;
        this._indexBuffers.push(buffer);
        factor *= 2;
      }
    }
    if (this._declaration === Tr2EffectStateManager.Unknown)
    {
      const definition = EveChildCloud._vertexDefinition;
      if (definition.empty()) definition.Add("FLOAT32_2", "POSITION");
      this._declaration = Tr2EffectStateManager.getVertexDeclarationHandle(definition);
    }
    return true;
  }

  /** Collects only visible, updated clouds with prepared geometry (cpp:218-230). */
  @meta.blue.method
  @meta.implemented
  GetRenderables(renderables)
  {
    if (!this.isVisible || !this.hasUpdated || !this._indexBuffers.length ||
      this._declaration === Tr2EffectStateManager.Unknown) return;
    renderables.push(this);
  }

  /** Camera globals live on the ambient context in this runtime (cpp:247-252). */
  @meta.blue.method
  @meta.adapted
  GetSortValue(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    const { vec3_0 } = EveChildCloud.scratch;
    mat4.getTranslation(vec3_0, this.worldTransform);
    return vec3.distance(renderContext.GetViewPosition(), vec3_0) - vec3.length(this.scaling) * this.sortingModifier;
  }

  /** Submits the native transparent indexed triangle grid (cpp:254-273). */
  @meta.blue.method
  @meta.implemented
  GetBatches(batches, batchType, perObjectData)
  {
    if (batchType !== TriBatchType.TRIBATCHTYPE_TRANSPARENT || !this.effect ||
      this._declaration === Tr2EffectStateManager.Unknown || !this._indexBuffers.length) return;
    const indexBuffer = this._indexBuffers[Math.min(this.currentLod, this._indexBuffers.length - 1)];
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.effect);
    batch.SetPerObjectData(perObjectData);
    batch.SetRenderingMode(RenderingMode.RM_ALPHA);
    batch.SetGeometry(this._declaration, this._vertexBuffer, 8, indexBuffer, 2);
    batch.SetDrawIndexedInstanced(indexBuffer.GetDesc().count, 1, 0, 0, 0);
    batches.Commit(batch);
  }

  /**
   * Fills the native 19-register VS block and selects grid LOD (cpp:352-407).
   * Adapted: camera statics come from the ambient context; RawData owns the
   * single GPU transpose. Empty clipped bounds use a zero-area rectangle,
   * replacing the donor's uninitialized points[0] read when every point is clipped.
   */
  @meta.blue.method
  @meta.adapted
  GetPerObjectData(accumulator)
  {
    const record = EveChildCloudPerObjectData.alloc(accumulator);
    if (!record) return null;
    const data = record.data;
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    const projection = context.GetProjection();
    const { mat4_0, mat4_1, mat4_2, vec3_0, vec4_0, vec4_1 } = EveChildCloud.scratch;
    data.SetAndTranspose("world", this.worldTransform);
    // Carbon world * view: local first, so gl-matrix reverses the operands.
    mat4.multiply(mat4_0, context.GetViewTransform(), this.worldTransform);
    data.SetAndTranspose("worldView", mat4_0);
    mat4.transpose(mat4_1, mat4_0);
    vec4.set(vec4_0, 0, 0, -1, -context.GetFrontClip());
    vec4.transformMat4(vec4_0, vec4_0, mat4_1);
    data.Set("nearPlaneLocal", vec4_0);
    if (!mat4.invert(mat4_1, mat4_0)) mat4.copy(mat4_1, mat4_0);
    data.SetAndTranspose("worldViewInv", mat4_1);
    vec3.set(vec3_0, 0, 0, 0);
    vec3.transformMat4(vec3_0, vec3_0, mat4_1);
    data.Set("eyePosLocal", vec3_0);
    // Carbon world * view * projection: projection is applied last.
    mat4.multiply(mat4_2, projection, mat4_0);
    vec3.set(vec3_0, 0, 0, 0);
    vec3.transformMat4(vec3_0, vec3_0, mat4_2);
    data.Set("screenDepth", vec3_0[2]);
    mat4.copy(mat4_2, projection);
    mat4_2[10] = -1;
    mat4_2[14] = -1000;
    if (!mat4.invert(mat4_1, mat4_2)) mat4.copy(mat4_1, mat4_2);
    data.SetAndTranspose("projectionInv", mat4_1);
    getProjectedCubeBounds(vec4_1, mat4_0, mat4_2, EveChildCloud.scratch);
    data.Set("screenSize", vec4_1);
    // Carbon bug CE-03: BOTH axes use back-buffer WIDTH (cpp:393-399).
    let size = Math.max(vec4_1[2] - vec4_1[0], vec4_1[3] - vec4_1[1]) *
      gTriDev.device.width / this.preTesselationLevel / this.lastLodFactor;
    this.currentLod = 0;
    while (size < this.cellScreenSize && this.currentLod + 1 < this._indexBuffers.length)
    {
      size *= 2;
      this.currentLod++;
    }
    return record;
  }

  /** Adds the cloud box and editable volume options (cpp:438-445). */
  @meta.blue.method
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Bounding Box");
    if (this.volume) this.volume.GetDebugOptions(options);
  }

  /** The native debug box requires the unported debug geometry renderer. */
  @meta.blue.method
  @meta.notImplemented
  RenderDebugInfo()
  {
    throw new Error("EveChildCloud.RenderDebugInfo requires the unported debug geometry renderer.");
  }

  /** Advances the editable volume, composes local SRT with its live parent and refreshes bounds. */
  @meta.blue.method
  @meta.implemented
  UpdateSyncronous(updateContext, params)
  {
    if (this.volume)
    {
      this.volume.Update(updateContext.GetTime());
    }

    mat4.fromRotationTranslationScale(
      this.localTransform, this.rotation, this.translation, this.scaling);
    const parent = params.childParent ?? params.spaceObjectParent;
    const parentTransform = parent.GetLocalToWorldTransform(PARENT_TRANSFORM);
    // Carbon row-vector local * parent maps to parent * local in gl-matrix.
    mat4.multiply(this.worldTransform, parentTransform, this.localTransform);
    updateBoundingSphere(this);
    this.hasUpdated = true;
  }

  /** Refreshes bounds from the transform finalized by the sync pass. */
  @meta.blue.method
  @meta.implemented
  UpdateAsyncronous(_updateContext, _params)
  {
    updateBoundingSphere(this);
  }

  /** Applies Carbon's display, frustum and minimum-screen-size visibility gate. */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(updateContext, _parentTransform, _parentLod)
  {
    const frustum = updateContext.GetFrustum();
    this.isVisible = this.display &&
      frustum.IsSphereVisible(this.boundingSphere) &&
      frustum.GetPixelSizeAccross(this.boundingSphere) >=
        this.minScreenSize * updateContext.GetLodFactor();
    this.lastLodFactor = updateContext.GetLodFactor();
  }

  /** Copies the current world-space sphere and always reports it available. */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    vec4.copy(out, this.boundingSphere);
    return true;
  }

  /** Copies the transform composed during the last sync pass. */
  @meta.blue.method
  @meta.implemented
  GetLocalToWorldTransform(out = mat4.create())
  {
    return mat4.copy(out, this.worldTransform);
  }

  /** Carbon always routes this legacy cloud through transparent rendering. */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return true;
  }
  static _vertexDefinition = new Tr2VertexDefinition();

  static scratch = {
    mat4_0: mat4.create(), mat4_1: mat4.create(), mat4_2: mat4.create(),
    vec3_0: vec3.create(), vec4_0: vec4.create(), vec4_1: vec4.create(),
    vec3_1: vec3.create(), vec3_2: vec3.create(), vec3_3: vec3.create(), vec3_4: vec3.create(),
    vec3_5: vec3.create(), vec3_6: vec3.create(), vec3_7: vec3.create(), vec3_8: vec3.create()
  };

}

// EveChildCloud_Blue.cpp: native exposure.
meta.blue.interfaceTable({ interfaces: [EveChildCloud, ITr2Renderable, IInitialize, INotify, EveSpaceObjectChild, IEveSpaceObjectChild], chainTo: null })(EveChildCloud, { kind: "class" });

// Native anonymous GetProjectedCubeBounds (cpp:69-160). Enumerating the 12
// unique edges instead of each face's edges removes duplicate extrema only.
const CUBE_EDGES = [0, 1, 0, 2, 0, 4, 1, 3, 1, 5, 2, 3, 2, 6, 3, 7, 4, 5, 4, 6, 5, 7, 6, 7];

function getProjectedCubeBounds(out, worldView, projection, scratch)
{
  const { vec4_0 } = scratch;
  const corners = [scratch.vec3_1, scratch.vec3_2, scratch.vec3_3, scratch.vec3_4, scratch.vec3_5, scratch.vec3_6, scratch.vec3_7, scratch.vec3_8];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < 8; i++)
  {
    vec3.set(corners[i], (i & 1) ? 0.5 : -0.5, (i & 2) ? 0.5 : -0.5, (i & 4) ? 0.5 : -0.5);
    vec3.transformMat4(corners[i], corners[i], worldView);
  }
  for (let i = 0; i < CUBE_EDGES.length; i += 2)
  {
    const a = corners[CUBE_EDGES[i]], b = corners[CUBE_EDGES[i + 1]];
    const v0 = a[2] + 1, v1 = b[2] + 1;
    for (let candidate = 0; candidate < 3; candidate++)
    {
      if (candidate === 0 && v0 <= 0) vec4.set(vec4_0, a[0], a[1], a[2], 0);
      else if (candidate === 1 && v1 <= 0) vec4.set(vec4_0, b[0], b[1], b[2], 0);
      else if (candidate === 2 && v0 * v1 < 0)
      {
        const t = v0 / (v0 - v1);
        vec4.set(vec4_0, a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2]), 0);
      }
      else continue;
      // Native deliberately projects w=0; the fake projection's translation is excluded.
      vec4.transformMat4(vec4_0, vec4_0, projection);
      const x = Math.max(-1, Math.min(1, vec4_0[0] / vec4_0[3]));
      const y = Math.max(-1, Math.min(1, vec4_0[1] / vec4_0[3]));
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  // Explicit adaptation of the donor's empty-array undefined read.
  if (minX === Infinity) minX = minY = maxX = maxY = 0;
  vec4.set(out, minX, minY, maxX, maxY);
}
