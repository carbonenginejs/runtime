// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildLineSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { quat } from "#math/quat";
import { EveChildTransform } from "./EveChildTransform.js";
import { color } from "#math/color";
import { vec4 } from "#math/vec4";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { blue, EnumRegistrationType, IInitialize, INotify, IsMatch } from "#blue";
import { mat4 } from "#math/mat4";
import { sph3 } from "#math/sph3";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { TriBatchType } from "#consts/graphics";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { EveCurveLineSet } from "../ui/lines/EveCurveLineSet.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { TriDevice } from "../../core/device/TriDevice.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2VertexDefinition } from "../../core/vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { CreateLodAllocations, RealizeBatchGeometry } from "../../core/mesh/TriGeometryResAllocations.js";
import { RawData } from "../../core/rawData/RawData.js";
import { EveChildLineSetPerObjectData } from "../../core/rawData/perObjectData/EveChildLineSetPerObjectData.js";
import { CalculateBoundingSphereForLineSetPaths } from "./lineSetPaths/IEveLineSetPath.js";

/** A child that renders a set of curved and sphere-projected line paths, as object geometry, as dedicated line rendering, or both. */
@meta.define({ className: "EveChildLineSet", family: "eve/child" })
@meta.blue.inherit(ITr2Renderable, IInitialize, INotify)
export class EveChildLineSet extends EveChildTransform
{

  /** m_translation (Vector3) [READWRITE, PERSIST] - EveChildLineSet_Blue.cpp:31 */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] - EveChildLineSet_Blue.cpp:32 */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  /** m_type (lineSetType - enum lineSetType) [READWRITE, PERSIST, ENUM, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.EveChildLineSet.lineSetType")
  renderType = 1;

  /** m_lineSet (EveCurveLineSetPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("EveCurveLineSet")
  lineSet = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_display (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_minScreenSize (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minScreenSize = -1;

  /** m_brightness (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  brightness = 1;

  /** m_baseColor (Vector4) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  baseColor = vec4.fromValues(1, 1, 1, 1);

  /** m_animColor (Vector4) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  animColor = color.createLinear();

  /** m_additiveBatch (bool) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  additiveBatches = false;

  /** m_scrollSpeed (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  scrollSpeed = 0;

  /** m_lines (PIEveLineSetPathVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveLineSetPath")
  lines = [];

  /** m_isAlwaysOn (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  alwaysOn = false;

  /** m_currentScreenSize (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  currentScreenSize = 1;

  /** m_mesh (Tr2MeshPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Mesh")
  mesh = null;

  _worldVelocity = vec3.create();

  _ownerMaxSpeed = 0;

  _updateLineSet = true;

  _hasUpdated = false;

  _isVisible = true;

  _boundingSphere = vec4.fromValues(0, 0, 0, 1);

  _vertexBuffer = new Tr2BufferAL();

  _stride = 48;

  _vertexCount = 0;

  _totalObjectCount = 0;

  _vertexDeclarationHandle = Tr2EffectStateManager.Unknown;

  _cachedSVD = 0;

  _vsData = RawData.create("EveSpaceObjectVSData");

  _psData = RawData.create("EveSpaceObjectPSData");

  /** Only the default created here is owned; an assigned line set is borrowed. */
  _ownedLineSet = null;

  /** Replaced defaults stay alive until the final owner can account for sharing. */
  _retiredLineSets = new Set();

  _instanceCursor = { view: null, offset: 0 };

  /** Registers the native device-resource lifetime and initializes default lines. */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
    this.Initialize();
  }

  /**
   * Explicit destruction replaces C++ member destructors. The final graph owner
   * may supply line sets whose lifetime it manages separately, including shared
   * sets retained by another graph; JS has no BluePtr reference count.
   */
  @meta.ours
  Destroy(managedLineSets = null)
  {
    this.ReleaseResources();
    this._vertexBuffer.Destroy();
    this._instanceCursor.view = null;
    if (this._ownedLineSet) this._retiredLineSets.add(this._ownedLineSet);
    for (const lineSet of this._retiredLineSets)
    {
      if (!managedLineSets?.has(lineSet)) lineSet.Destroy();
    }
    this._retiredLineSets.clear();
    this._ownedLineSet = null;
    TriDevice.UnregisterResource(this);
  }

  /**
   * Creates the default line set and regenerates paths (cpp:76-90). JS retains
   * replaced defaults until final destruction can account for shared graphs;
   * unlike BluePtr, assignment cannot tell whether another owner still uses one.
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    if (this._ownedLineSet && this.lineSet !== this._ownedLineSet)
    {
      this._retiredLineSets.add(this._ownedLineSet);
      this._ownedLineSet = null;
    }
    if (!this.lineSet) this.lineSet = this._ownedLineSet = new EveCurveLineSet();
    this.GenerateManagedPoints();
    this.InitializeLineSet();
    return true;
  }

  /** Updates additive selection immediately and defers regeneration until collection. */
  @meta.blue.method
  @meta.implemented
  OnModified(name)
  {
    if (IsMatch(name, "additiveBatches")) this.lineSet.SetAdditiveFlag(this.additiveBatches);
    this._updateLineSet = true;
    return true;
  }

  /** Regenerates every path beneath the current world transform, then bounds. */
  @meta.blue.method
  @meta.implemented
  GenerateManagedPoints()
  {
    for (const line of this.lines) line.GeneratePoints(this.worldTransform);
    this.UpdateBoundingSphere();
  }

  /** Empty path lists intentionally retain old line geometry (native cpp:149-165). */
  @meta.blue.method
  @meta.implemented
  InitializeLineSet()
  {
    if (!this.lineSet || !this.lines.length) return;
    this.lineSet.ClearLines();
    this.lineSet.SetDynamicFlag(true);
    const { vec4_0, vec4_1 } = EveChildLineSet.scratch;
    vec4.scale(vec4_0, this.baseColor, this.brightness);
    vec4.scale(vec4_1, this.animColor, this.brightness);
    for (const line of this.lines) line.AddLinesToSet(this.lineSet, vec4_0, vec4_1, this.scrollSpeed);
    this.lineSet.SubmitChanges();
  }

  /**
   * Aggregates path bounds with the selected mesh radius. Empty lists keep the
   * previous bound; native's helper leaves an uninitialized local output there.
   * The resource's existing sphere accessor replaces its native inline field.
   */
  @meta.blue.method
  @meta.adapted
  UpdateBoundingSphere(reCalculateChildren = true)
  {
    let objectSizeBonus = 0;
    if (this.renderType !== EveChildLineSet.lineSetType.LINE_RENDER && this.mesh)
    {
      const geometry = this.mesh.GetGeometryResource();
      if (geometry && geometry.IsGood())
      {
        const { vec4_0 } = EveChildLineSet.scratch;
        geometry.GetBoundingSphere(this.mesh.GetMeshIndex(), vec4_0);
        objectSizeBonus = vec4_0[3];
      }
    }
    CalculateBoundingSphereForLineSetPaths(this._boundingSphere, this.lines, reCalculateChildren, objectSizeBonus);
  }

  /** Uses gl-matrix sphere transformation for Carbon's world cull and local pixel-size threshold. */
  @meta.blue.method
  @meta.adapted
  UpdateVisibility(updateContext, _parentTransform, parentLod)
  {
    if (!this.display) return;
    this._isVisible = false;
    const { vec4_0 } = EveChildLineSet.scratch;
    sph3.transformMat4(vec4_0, this._boundingSphere, this.worldTransform);
    const frustum = updateContext.GetFrustum();
    if (frustum.IsSphereVisible(vec4_0))
    {
      this.currentScreenSize = frustum.GetPixelSizeAccross(this._boundingSphere);
      if (this.currentScreenSize >= this.minScreenSize) this._isVisible = true;
    }
    if (this.lineSet) this.lineSet.UpdateVisibility(updateContext, this.worldTransform);
    for (const line of this.lines) line.UpdateVisibility(frustum, parentLod, this.worldTransform);
  }

  /** Consumes pending regeneration only once an update and visibility allow collection. */
  @meta.blue.method
  @meta.implemented
  GetRenderables(renderables)
  {
    if (!this.IsUpdating() || !this._hasUpdated) return;
    if (this._updateLineSet)
    {
      this.GenerateManagedPoints();
      this.InitializeLineSet();
      this._updateLineSet = false;
    }
    if (this.renderType !== EveChildLineSet.lineSetType.LINE_RENDER) renderables.push(this);
    if (this.renderType !== EveChildLineSet.lineSetType.OBJECT_RENDER && this.lineSet) this.lineSet.GetRenderables(renderables);
  }

  /** Writes the aggregate bound transformed into world space using gl-matrix layout. */
  @meta.blue.method
  @meta.adapted
  GetBoundingSphere(out, _query = 0)
  {
    sph3.transformMat4(out, this._boundingSphere, this.worldTransform);
    return true;
  }

  /** Updates every path before visibility gates, then fills the selected render modes. */
  @meta.blue.method
  @meta.implemented
  UpdateSyncronous(updateContext, params)
  {
    this.CreateSpriteVertexDeclaration();
    this._ownerMaxSpeed = params.ownerMaxSpeed;
    let updateBounds = false;
    for (const line of this.lines) updateBounds = line.Update(updateContext, params) || updateBounds;
    if (updateBounds) this.UpdateBoundingSphere(false);
    if (!this.IsUpdating()) return;
    if (this.renderType === EveChildLineSet.lineSetType.OBJECT_RENDER || this.renderType === EveChildLineSet.lineSetType.BOTH)
    {
      this.UpdateBuffer(Tr2RenderContext_GetMainThreadRenderContext());
    }
    if (this.renderType === EveChildLineSet.lineSetType.LINE_RENDER || this.renderType === EveChildLineSet.lineSetType.BOTH) this.InitializeLineSet();
  }

  /**
   * Copies parent constants, updates transforms and opens the render gate.
   * RawData receives logical matrices and applies Carbon's sole transpose;
   * inverse-of-transpose is encoded as transpose-of-inverse. A singular JS
   * inverse writes nonfinite data instead of reusing an unrelated scratch value.
   */
  @meta.blue.method
  @meta.adapted
  UpdateAsyncronous(_updateContext, params)
  {
    const { mat4_0, mat4_1 } = EveChildLineSet.scratch;
    mat4.copy(mat4_0, params.localToWorldTransform);
    if (params.childParent) params.childParent.GetLocalToWorldTransform(mat4_0);
    else if (params.spaceObjectParent)
    {
      params.spaceObjectParent.GetLocalToWorldTransform(mat4_0);
      params.spaceObjectParent.GetPerObjectStructs(this._vsData, this._psData);
    }
    this._vsData.SetAndTranspose("worldTransformLast", this.worldTransform);
    this._psData.SetAndTranspose("worldTransformLast", this.worldTransform);
    this.UpdateTransform(mat4_0);
    if (!mat4.invert(mat4_1, this.worldTransform)) mat4_1.fill(NaN);
    this._vsData.SetAndTranspose("worldTransform", this.worldTransform);
    this._vsData.SetAndTranspose("invWorldTransform", mat4_1);
    this._psData.SetAndTranspose("worldTransform", this.worldTransform);
    this._psData.SetAndTranspose("invWorldTransform", mat4_1);
    this._hasUpdated = true;
  }

  /**
   * Maps the owned AL buffer and passes one advancing DataView cursor through
   * all paths. The cursor replaces uint8_t*&; finally unmaps if a JS path throws.
   */
  @meta.blue.method
  @meta.adapted
  UpdateBuffer(renderContext)
  {
    this._totalObjectCount = 0;
    for (const line of this.lines) this._totalObjectCount += line.GetPointCount();
    if (!this._vertexBuffer.IsValid() || this._vertexBuffer.GetDesc().count < this._totalObjectCount)
    {
      this._vertexBuffer.Create(Tr2BufferDescriptionAL.FromStride(
        this._stride, this._totalObjectCount, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN
      ), null, renderContext);
    }
    const mapped = this._vertexBuffer.MapForWriting(renderContext);
    if (Failed(mapped.result)) return;
    const cursor = this._instanceCursor;
    if (!cursor.view || cursor.view.buffer !== mapped.data.buffer || cursor.view.byteOffset !== mapped.data.byteOffset || cursor.view.byteLength !== mapped.data.byteLength)
    {
      cursor.view = new DataView(mapped.data.buffer, mapped.data.byteOffset, mapped.data.byteLength);
    }
    cursor.offset = 0;
    try
    {
      for (const line of this.lines) line.UpdateBuffer(renderContext, cursor, this.worldTransform, this._stride);
    }
    finally
    {
      this._vertexBuffer.UnmapForWriting(renderContext);
    }
  }

  /**
   * Extends the mesh declaration with current/previous instance aliases.
   * JS prepares the lazy geometry allocations here so its declaration exists;
   * Carbon already has that storage when UpdateSyncronous runs.
   */
  @meta.blue.method
  @meta.adapted
  CreateSpriteVertexDeclaration()
  {
    if (this.mesh)
    {
      const geometry = this.mesh.GetGeometryResource();
      if (!geometry) return;
      if (geometry.IsGood())
      {
        const index = this.mesh.GetMeshIndex();
        if (!CreateLodAllocations(geometry, index, geometry.GetMeshLodByIndex(index, 0), Tr2RenderContext_GetMainThreadRenderContext())) return;
        const meshData = geometry.GetMeshData(index);
        if (meshData.vertexDeclarationHandle !== this._cachedSVD)
        {
          const base = Tr2EffectStateManager.getVertexDeclarationElements(meshData.vertexDeclarationHandle);
          const declaration = new Tr2VertexDefinition();
          declaration.items = (Array.isArray(base) ? base : base.items).map(item => ({ ...item }));
          // Packed resource declarations are flat lists for stream zero. A
          // native-shaped definition carries its own per-stream offset ledger.
          if (Array.isArray(base)) declaration.nextOffset[0] = meshData.bytesPerVertex;
          else declaration.nextOffset = base.nextOffset.slice();
          for (let index = 8; index <= 10; index++) declaration.Add("FLOAT32_4", "TEXCOORD", index, 1, 1);
          // Native aliases previous transforms to current for procedural points.
          declaration.nextOffset[1] = 0;
          for (let index = 11; index <= 13; index++) declaration.Add("FLOAT32_4", "TEXCOORD", index, 1, 1);
          this._vertexDeclarationHandle = Tr2EffectStateManager.getVertexDeclarationHandle(declaration);
          this._cachedSVD = meshData.vertexDeclarationHandle;
        }
        return;
      }
    }
    this._cachedSVD = this._vertexDeclarationHandle = Tr2EffectStateManager.Unknown;
  }

  /**
   * Builds native instanced batches from LOD zero of mesh zero (cpp:473).
   * JS realizes its geometry descriptor before setting stream 1 and instance
   * count, otherwise deferred preparation would overwrite those native fields.
   */
  @meta.blue.method
  @meta.adapted
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    if (!this.display || this._cachedSVD === Tr2EffectStateManager.Unknown || this._vertexDeclarationHandle === Tr2EffectStateManager.Unknown || !this._vertexBuffer.IsValid()) return;
    if ((this.renderType !== EveChildLineSet.lineSetType.OBJECT_RENDER && this.renderType !== EveChildLineSet.lineSetType.BOTH) || !this.mesh) return;
    const geometry = this.mesh.GetGeometryResource();
    if (!geometry || !geometry.IsGood()) return;
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    const lod = geometry.GetMeshLodByIndex(0, 0);
    if (!lod || !CreateLodAllocations(geometry, 0, lod, context)) return;
    for (const area of this.mesh.GetAreas(batchType))
    {
      const batch = this.mesh.CreateGeometryBatch(geometry, area, perObjectData, false, lod);
      if (!batch) continue;
      batch.geometrySource.meshIndex = 0;
      if (!RealizeBatchGeometry(batch, context)) continue;
      batch.SetVertexDeclaration(this._vertexDeclarationHandle);
      batch.SetStreamSource(1, this._vertexBuffer, this._stride);
      batch.instanceCount = this._totalObjectCount;
      batches.Commit(batch);
    }
  }

  /** Borrows persistent owner constants; JS constructs the native pooled wrapper. */
  @meta.blue.method
  @meta.adapted
  GetPerObjectData(_accumulator)
  {
    const data = new EveChildLineSetPerObjectData();
    data.vsData = this._vsData;
    data.psData = this._psData;
    return data;
  }

  /** Reports transparent mesh areas only when display is enabled. */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return !!(this.display && this.mesh && this.mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT).length);
  }

  /** Inherited Tr2DeviceResource creation guard. */
  @meta.blue.method
  @meta.implemented
  PrepareResources()
  {
    return !Tr2Renderer.IsResourceCreationAllowed() || this.OnPrepareResources();
  }

  /** Creates Carbon's initial instance capacity using the AL description overload. */
  @meta.blue.method
  @meta.adapted
  OnPrepareResources()
  {
    return !Failed(this._vertexBuffer.Create(Tr2BufferDescriptionAL.FromStride(
      this._stride, 128, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN
    ), null, Tr2RenderContext_GetMainThreadRenderContext()));
  }

  /** Native ReleaseResources resets declaration caches, retaining the buffer. */
  @meta.blue.method
  @meta.implemented
  ReleaseResources()
  {
    this._cachedSVD = this._vertexDeclarationHandle = Tr2EffectStateManager.Unknown;
  }

  /** Copies the child's current world transform into caller-owned storage. */
  @meta.blue.method
  @meta.implemented
  GetLocalToWorldTransform(out)
  {
    mat4.copy(out, this.worldTransform);
  }

  /** Returns Carbon's authored activation bypass. */
  @meta.blue.method
  @meta.implemented
  IsAlwaysOn()
  {
    return this.alwaysOn;
  }

  /** Native Blue readonly property (EveChildLineSet_Blue.cpp:29). */
  get isUpdating()
  {
    return this.IsUpdating();
  }

  /** Returns whether both display and the last visibility test allow updates. */
  @meta.blue.method
  @meta.implemented
  IsUpdating()
  {
    return this.display && this._isVisible;
  }

  /** Returns the mesh assigned to object rendering. */
  @meta.blue.method
  @meta.implemented
  GetMesh()
  {
    return this.mesh;
  }

  /** Returns the owner's most recently supplied speed. */
  @meta.blue.method
  @meta.implemented
  GetOwnerMaxSpeed()
  {
    return this._ownerMaxSpeed;
  }

  /** Copies the native world velocity (zero until another owner changes it). */
  @meta.blue.method
  @meta.implemented
  GetWorldVelocity(out)
  {
    vec3.copy(out, this._worldVelocity);
  }

  /** Native child-line objects have a constant sort value. */
  @meta.blue.method
  @meta.implemented
  GetSortValue()
  {
    return 0;
  }

  /** Native shader-option hook is empty. */
  @meta.blue.method
  @meta.noop
  SetShaderOption(_name, _value)
  {
  }

  /** Native child-line LOD hook is empty. */
  @meta.blue.method
  @meta.noop
  ChangeLOD(_lod)
  {
  }

  /** Adds the native line-set debug toggle. */
  @meta.blue.method
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("LineSets");
  }

  /** Path debug geometry remains unported; normal rendering uses GetBatches. */
  @meta.blue.method
  @meta.notImplemented
  RenderDebugInfo(_renderer)
  {
    throw new Error("EveChildLineSet.RenderDebugInfo: path debug geometry is not ported.");
  }

  /** Returns native numeric TEXCOORD usage/index pairs in JS tuples. */
  @meta.blue.method
  @meta.adapted
  GetVertexElementAddedThroughCode()
  {
    return [[5, 8], [5, 9], [5, 10]];
  }

  static scratch = {
    vec4_0: vec4.create(),
    vec4_1: vec4.create(),
    mat4_0: mat4.create(),
    mat4_1: mat4.create()
  };

  static lineSetType = {
    OBJECT_RENDER: 0,
    LINE_RENDER: 1,
    BOTH: 2,
  };

}

// Registered as Carbon registers it (trinity/trinity/Eve/SpaceObject/Children/EveChildLineSet_Blue.cpp:13).
blue.enums.Create("trinity.EveChildLineSet.lineSetType", EveChildLineSet.lineSetType, {
  source: "trinity/trinity/Eve/SpaceObject/Children/EveChildLineSet.h", family: "eve/child", line: 92,
  exposedName: "LineSetTypes", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObject/Children/EveChildLineSet_Blue.cpp:7",
  chooser: [
    { name: "ObjectRender", value: EveChildLineSet.lineSetType.OBJECT_RENDER, description: "sprites or other objects are rendered at each segment" },
    { name: "LineRender", value: EveChildLineSet.lineSetType.LINE_RENDER, description: "To render a 3dLine shader between the points" },
    { name: "Both", value: EveChildLineSet.lineSetType.BOTH, description: "Both of the above" }
  ]
});

meta.blue.interfaceTable({ interfaces: [EveChildLineSet, EveSpaceObjectChild, IEveSpaceObjectChild, IInitialize, INotify, ITr2Renderable], chainTo: null })(EveChildLineSet, { kind: "class" });
