// Source: trinity/trinity/Eve/UI/EveSpherePin.h
// Source: trinity/trinity/Eve/UI/EveSpherePin.cpp
// Hand-maintained after promotion from generated schema intake.
import { meta } from "#schema";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";
import { IEveTransform } from "../IEveTransform.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { blue, IInitialize, INotify, IsMatch, ResourceRequirement } from "#blue";
import { TimeAsDouble } from "../../../global/blue/CcpTime.js";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { TriBatchType } from "#consts/graphics";
import { Tr2Lod } from "../EveLODHelper.js";
import { Tr2PickType, TR2_PICK_TYPE_DEFAULT } from "../../core/view/Tr2PickType.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";
import { TriDevice } from "../../core/device/TriDevice.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2RenderBatch } from "../../core/batch/TriRenderBatch/index.js";
import { CreateLodAllocations } from "../../core/mesh/TriGeometryResAllocations.js";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Failed } from "../../../trinityal/ALResult.js";
import { EveSpherePinIndexTree } from "./EveSpherePinIndexTree/index.js";

// Native s_treeMap shares one index per source resource. Weak keys replace
// its process-lifetime owning map so retired resources can be collected.
const treeMap = new WeakMap();

/** A UI sphere pin: authored SRT placement plus the pin constant record. */
@meta.define({ className: "EveSpherePin", family: "eve/ui" })
@meta.blue.inherit(IInitialize, ITr2Renderable, IEveSpaceObject2, IEveTransform, INotify)
export class EveSpherePin
{

  /** m_primitiveCount (int) [READ] */
  @meta.blue.read
  @meta.type.int32
  primitiveCount = 0;

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_display (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_enablePicking (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  enablePicking = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  _pinColor = vec4.fromValues(1, 1, 1, 1);

  /** Both native Blue color names address the same m_pinColor storage. */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  get pinColor()
  {
    return this._pinColor;
  }

  /** Copies into the shared native color storage. */
  set pinColor(value)
  {
    vec4.copy(this._pinColor, value);
  }

  /** Native Blue alias for pinColor. */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  get color()
  {
    return this._pinColor;
  }

  /** Writes the same storage as pinColor. */
  set color(value)
  {
    vec4.copy(this._pinColor, value);
  }

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("TriCurveSet")
  curveSets = [];

  /** m_sortValueMultiplier (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  sortValueMultiplier = 1;

  /** m_centerNormal (Vector3) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  centerNormal = vec3.fromValues(0, 0, 1);

  /** m_pinMaxRadius (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  pinMaxRadius = 0.2;

  /** m_pinRadius (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  pinRadius = 0.2;

  /** m_pinEffectResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  pinEffectResPath = "";

  /** m_geomResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  geometryResPath = "";

  /** m_pinRotation (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  pinRotation = 0;

  /** m_pinAlphaThreshold (float) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  pinAlphaThreshold = 0;

  /** m_uvAtlasScaleOffset (Vector4) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec4
  uvAtlasScaleOffset = vec4.fromValues(1, 1, 0, 0);

  /** m_pinEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  pinEffect = null;

  /** m_pickEffect (Tr2EffectPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("Tr2Effect")
  pickEffect = null;

  /** m_worldTransform (EveSpherePin.cpp:46; ctor identity) - runtime state
   * stamped by UpdateViewDependentData; not persisted. */
  worldTransform = mat4.create();

  /** Native local sphere: centerNormal and pinRadius, independent of geometry. */
  boundingSphere = vec4.create();

  _geometryResource = null;
  _tree = null;
  _rebuildIndices = 0;
  _indexBuffer = new Tr2BufferAL();
  _indexResult = { primitives: 0, indices: [] };
  _ownedEffects = new Set();

  /** Creates native effects, bounds and the device-resource registration. */
  constructor()
  {
    this.pinEffect = new Tr2Effect();
    this.pickEffect = new Tr2Effect();
    this._ownedEffects.add(this.pinEffect);
    this._ownedEffects.add(this.pickEffect);
    this.pickEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Space/UI/SpherePinPicking.fx");
    this.BuildBoundingSphere();
    TriDevice.RegisterResource(this);
    this.PrepareResources();
  }

  /**
   * Explicit JS lifetime replaces native member destruction. Constructor effects
   * stay owned after replacement; a graph retirement walk can retain or retire
   * shared effects itself by including them in managedResources.
   */
  @meta.ours
  Destroy(managedResources = null)
  {
    this.ReleaseResources();
    for (const effect of this._ownedEffects)
    {
      if (!managedResources?.has(effect)) effect.Destroy();
    }
    this._ownedEffects.clear();
    this._indexBuffer.Destroy();
    this._geometryResource = null;
    this._tree = null;
    this.pinEffect = this.pickEffect = null;
    TriDevice.UnregisterResource(this);
  }

  /** Native initialization requests geometry and refreshes bounds, not the draw effect path. */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    this.InitializeGeometryResource();
    this.BuildBoundingSphere();
    return true;
  }

  /**
   * Applies native notification branches in order. JS coalesces changed names
   * into one call, so independent branches handle every field in that call.
   */
  @meta.blue.method
  @meta.adapted
  OnModified(name)
  {
    if (IsMatch(name, "geometryResPath")) this.InitializeGeometryResource();
    if (IsMatch(name, "pinEffectResPath")) this.pinEffect.SetEffectPathName(this.pinEffectResPath);
    if (IsMatch(name, "centerNormal") || IsMatch(name, "pinRadius")
      || IsMatch(name, "pinMaxRadius") || IsMatch(name, "pinRotation")
      || IsMatch(name, "pinColor") || IsMatch(name, "color")
      || IsMatch(name, "pinAlphaThreshold") || IsMatch(name, "uvAtlasScaleOffset"))
    {
      this.BuildBoundingSphere();
      if (IsMatch(name, "centerNormal") || IsMatch(name, "pinMaxRadius")) this._rebuildIndices = 1;
    }
    return true;
  }

  /**
   * Requests the decoded geometry resource. Native notification callbacks are
   * both empty; JS polls its readiness without installing inert subscriptions.
   */
  @meta.blue.method
  @meta.adapted
  InitializeGeometryResource()
  {
    this._tree = null;
    this._geometryResource = this.geometryResPath
      ? blue.resMan.GetResource(this.geometryResPath, { requirement: ResourceRequirement.GEOMETRY })
      : null;
  }

  /** Native ReleaseResources is empty; final destruction releases the index buffer. */
  @meta.blue.method
  @meta.noop
  ReleaseResources(_storage)
  {
  }

  /** Native resource-creation guard. */
  @meta.blue.method
  @meta.implemented
  PrepareResources()
  {
    return !Tr2Renderer.IsResourceCreationAllowed() || this.OnPrepareResources();
  }

  /** Requests index regeneration when initialized geometry outlives its AL buffer. */
  @meta.blue.method
  @meta.implemented
  OnPrepareResources()
  {
    if (this._tree && this._tree.IsInitialized() && !this._indexBuffer.IsValid()) this._rebuildIndices = 1;
    return true;
  }

  /** The native resource completion callback is empty. */
  @meta.blue.method
  @meta.noop
  RebuildCachedData(_resource)
  {
  }

  /** The native resource release callback is empty. */
  @meta.blue.method
  @meta.noop
  ReleaseCachedData(_resource)
  {
  }

  /**
   * Builds selected uint16 triangles. A reusable result replaces native out
   * references, and AL Create takes the existing JS description overload.
   * Empty selections destroy the old buffer but retain the native rebuild flag.
   */
  @meta.blue.method
  @meta.adapted
  CreateIndexBuffer()
  {
    const output = this._indexResult;
    if (!this._tree.GetIndices(this.centerNormal, this.pinMaxRadius, output)) return;
    this.primitiveCount = output.primitives;
    this._indexBuffer.Destroy();
    if (this.primitiveCount <= 0) return;
    // alloc: AL upload storage, created only when the native subset is dirty.
    const indices = new Uint16Array(output.indices.slice(0, this.primitiveCount * 3)); // alloc: retained until AL copies the upload
    const bytes = new Uint8Array(indices.buffer); // alloc: byte view of that upload
    const result = this._indexBuffer.Create(Tr2BufferDescriptionAL.FromStride(
      2, this.primitiveCount * 3, Tr2GpuUsage.INDEX_BUFFER, Tr2CpuUsage.NONE
    ), bytes, Tr2RenderContext_GetMainThreadRenderContext());
    if (Failed(result)) return;
    this._rebuildIndices = 0;
  }

  /**
   * Shares and builds the native spherical index, then publishes a dirty subset.
   * JS geometry already retains decoded CPU channels, so the same resource
   * replaces Carbon's separate "raw" TriGrannyRes request.
   */
  @meta.blue.method
  @meta.adapted
  UpdateSyncronous(_updateContext)
  {
    if (!this._tree && this.geometryResPath)
    {
      const geometry = this._geometryResource
        ?? blue.resMan.GetResource(this.geometryResPath, { requirement: ResourceRequirement.GEOMETRY });
      if (geometry)
      {
        let tree = treeMap.get(geometry);
        if (!tree) treeMap.set(geometry, tree = new EveSpherePinIndexTree(geometry));
        this._tree = tree;
      }
      this._rebuildIndices = 1;
    }
    if (this._tree && this._rebuildIndices)
    {
      if (this._tree.IsInitialized() || this._tree.Initialize()) this.CreateIndexBuffer();
    }
  }

  /** Advances curves using native TimeAsDouble conversion from 100 ns ticks. */
  @meta.blue.method
  @meta.implemented
  UpdateAsyncronous(updateContext)
  {
    for (const curveSet of this.curveSets) curveSet.Update(TimeAsDouble(updateContext.GetTime()));
  }

  /** Native update orders synchronous geometry publication before curve updates. */
  @meta.blue.method
  @meta.implemented
  Update(updateContext)
  {
    this.UpdateSyncronous(updateContext);
    this.UpdateAsyncronous(updateContext);
  }

  /** Native visibility updates placement but performs no frustum cull. */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform)
  {
    if (!this.display) return;
    this.UpdateViewDependentData(updateContext.GetFrustum(), parentTransform);
  }

  /** Native collection checks display only; the optional impostor manager is unused. */
  @meta.blue.method
  @meta.implemented
  GetRenderables(renderables, _impostors = null)
  {
    if (this.display) renderables.push(this);
  }

  /** Native query returns the local sphere, without applying the world matrix. */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(out, _query = 0)
  {
    vec4.copy(out, this.boundingSphere);
    return true;
  }

  /** Native bounds are the center normal and authored pin radius. */
  @meta.blue.method
  @meta.implemented
  BuildBoundingSphere()
  {
    vec4.set(this.boundingSphere, this.centerNormal[0], this.centerNormal[1], this.centerNormal[2], this.pinRadius);
  }

  /** Native sphere pins always use high LOD. */
  @meta.blue.method
  @meta.implemented
  GetLODLevel()
  {
    return Tr2Lod.TR2_LOD_HIGH;
  }

  /** Native model-center update is empty. */
  @meta.blue.method
  @meta.noop
  UpdateModelCenterWorldPosition(_position, _time)
  {
  }

  /** Native model-center query leaves its output untouched. */
  @meta.blue.method
  @meta.noop
  GetModelCenterWorldPosition(_position)
  {
  }

  /** Native pins do not provide a local bounding box. */
  @meta.blue.method
  @meta.implemented
  GetLocalBoundingBox(_min, _max)
  {
    return false;
  }

  /** Native IEveTransform query deliberately returns identity. */
  @meta.blue.method
  @meta.implemented
  GetLocalToWorldTransform(out)
  {
    mat4.identity(out);
  }


  /** Carbon EveSpherePin::HasTransparentBatches is always true. */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /** Uses the supplied context or main renderer, without per-frame vector allocation. */
  @meta.blue.method
  @meta.adapted
  GetSortValue(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    const vec3_0 = EveSpherePin.scratch.vec3_0;
    vec3.transformMat4(vec3_0, this.boundingSphere, this.worldTransform);
    return vec3.distance(renderContext.GetViewPosition(), vec3_0) * this.sortValueMultiplier;
  }

  /** Routes transparent and picking passes through the corresponding native effect. */
  @meta.blue.method
  @meta.implemented
  GetBatches(accumulator, batchType, perObjectData, _reason)
  {
    if (batchType === TriBatchType.TRIBATCHTYPE_TRANSPARENT && this.pinEffect)
    {
      this.GetBatchWithEffect(accumulator, perObjectData, this.pinEffect);
    }
    else if (batchType === TriBatchType.TRIBATCHTYPE_PICKING && this.pickEffect && this.enablePicking)
    {
      this.GetBatchWithEffect(accumulator, perObjectData, this.pickEffect);
    }
  }

  /**
   * Binds selected pin indices beside shared mesh-zero / LOD-zero vertices.
   * JS realizes geometry lazily here because its resource layer cannot use AL.
   */
  @meta.blue.method
  @meta.adapted
  GetBatchWithEffect(accumulator, perObjectData, effect)
  {
    const geometry = this._geometryResource;
    if (!geometry || !geometry.IsGood() || geometry.GetMeshCount() < 1) return;
    const lod = geometry.GetMeshLodByIndex(0, 0);
    if (!lod || !this._indexBuffer.IsValid()) return;
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    if (!CreateLodAllocations(geometry, 0, lod, context)) return;
    const vertices = lod.vertexAllocation;
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(effect);
    batch.SetPerObjectData(perObjectData);
    batch.SetGeometry(geometry.GetMeshData(0).vertexDeclarationHandle,
      vertices.GetBuffer(), vertices.GetStride(), this._indexBuffer, this._indexBuffer.GetDesc().stride);
    batch.SetDrawIndexedInstanced(this.primitiveCount * 3, 1, 0, vertices.GetOffset() / vertices.GetStride(), 0);
    accumulator.Commit(batch);
  }

  /** Native picking-mask routing, including transparent and additive requests. */
  @meta.blue.method
  @meta.implemented
  GetPickingBatches(accumulator, pickTypes = TR2_PICK_TYPE_DEFAULT, perObjectData = null)
  {
    if (pickTypes & Tr2PickType.PICK_TYPE_PICKING) this.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_PICKING, perObjectData);
    if (pickTypes & Tr2PickType.PICK_TYPE_OPAQUE) this.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData);
    if (pickTypes & Tr2PickType.PICK_TYPE_TRANSPARENT)
    {
      this.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_TRANSPARENT, perObjectData);
      this.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_ADDITIVE, perObjectData);
    }
  }


  /** Carbon EveSpherePin::GetID uses the pin itself as its picking identity. */
  @meta.blue.method
  @meta.implemented
  GetID()
  {
    return this;
  }

  /** Carbon EveSpherePin::UpdateViewDependentData (cpp:243-251):
   * m_worldTransform = TransformationMatrix(scaling, rotation, translation) *
   * parentTransform. Carbon (row-vector): local * parent - local first, so
   * gl multiply(world, parent, local); Carbon (s, r, t) is gl
   * fromRotationTranslationScale (r, t, s). The frustum argument is unused
   * in Carbon's body and kept for signature parity. */
  @meta.blue.method
  @meta.implemented
  UpdateViewDependentData(_frustum, parentTransform)
  {
    const mat4_0 = EveSpherePin.scratch.mat4_0;
    mat4.fromRotationTranslationScale(mat4_0, this.rotation, this.translation, this.scaling);

    mat4.multiply(this.worldTransform, parentTransform, mat4_0);
  }

  /** Carbon EveSpherePin::GetPerObjectData (cpp:336-357). One transient
   * payload; SetAndTranspose performs Carbon's `Transpose(m_worldTransform)`.
   * The struct registers with stages ["vs", "ps"]: the SAME bytes are bound
   * to both per-object slots (cpp:415-425). */
  @meta.blue.method
  @meta.implemented
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveSpherePinPerObjectData");
    if (!data) return null;

    data.SetAndTranspose("worldMatrix", this.worldTransform);
    data.Set("pinPosition", [
      this.centerNormal[0],
      this.centerNormal[1],
      this.centerNormal[2],
      this.pinRadius
    ]);
    data.Set("pinRotation", [this.pinRotation, 0, 0, 0]);
    data.Set("pinColor", this.pinColor);
    data.Set("pinThreshold", [this.pinAlphaThreshold, 0, 0, 0]);
    data.Set("pinRadiusPrecalc", [
      Math.sin(this.pinRadius),
      Math.cos(this.pinRadius),
      Math.sin(this.pinRotation),
      Math.cos(this.pinRotation)
    ]);
    data.Set("pinUV", this.uvAtlasScaleOffset);

    return data;
  }

  static scratch = { vec3_0: vec3.create(), mat4_0: mat4.create() };

}

// EveSpherePin_Blue.cpp: native mapped contracts; picking uses the existing
// batch-mask API because this port has no ITr2Pickable contract class yet.
meta.blue.interfaceTable({ interfaces: [IInitialize, ITr2Renderable, IEveTransform, IEveSpaceObject2, INotify], chainTo: null })(EveSpherePin, { kind: "class" });
