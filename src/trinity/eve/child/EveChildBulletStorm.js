// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBulletStorm.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBulletStorm.cpp
// Hand-maintained after promotion from generated schema intake.
import { meta } from "#schema";
import { INotify, IsMatch } from "#blue";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { TriBatchType } from "#consts/graphics";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Tr2VertexDefinition } from "../../core/vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { TriDevice } from "../../core/device/TriDevice.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2RenderBatch } from "../../core/batch/TriRenderBatch/Tr2RenderBatch.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";

/** BulletStormVertex (cpp:20-23): one float corner id. */
const CORNER_STRIDE = 4;

/** PerInstanceVertex (cpp:25-30): source position, source direction and the per-instance random data, 10 floats. */
const INSTANCE_STRIDE = 40;

/** Locator-driven bullet-storm child: instances, target blobs, and the clip-sphere state machine. */
@meta.define({ className: "EveChildBulletStorm", family: "eve/child" })
@meta.blue.inherit(ITr2Renderable)
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(INotify)
export class EveChildBulletStorm extends EveSpaceObjectChild
{

  /** Registers the device-resource lifetime and prepares its buffers, as Carbon's constructor does (cpp:35-50). */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
    this.PrepareResources();
  }

  /** Carbon EveChildBulletStorm.cpp:70: only instance-source edits rebuild the swarm. */
  @meta.implemented
  OnModified(names)
  {
    if (IsMatch(names, "multiplier") || IsMatch(names, "sourceObject") || IsMatch(names, "sourceLocatorSet"))
      this.Rebuild();
    return true;
  }


  _changingClipSphere = false;

  /** m_hasUpdated: nothing renders before the first update. */
  _hasUpdated = false;

  /** m_vertexDeclHandle */
  _vertexDeclHandle = Tr2EffectStateManager.Unknown;

  /** m_vertexBuffer: the four quad corners. */
  _vertexBuffer = new Tr2BufferAL();

  /** m_perInstanceBuffer: one PerInstanceVertex per entry of instances. */
  _perInstanceBuffer = new Tr2BufferAL();

  _clipSphereMultiplier = 0;

  @meta.type.list("EveChildBulletStormInstance")
  instances = [];

  @meta.type.array("vec4")
  targetBlobs = [];

  @meta.type.mat4
  worldTransform = mat4.create();

  /** m_targetObjects (PIEveSpaceObject2Vector) [READ, NOTIFY] */
  @meta.blue.notify
  @meta.blue.read
  @meta.type.list("IEveSpaceObject2")
  targetObjects = [];

  /** m_objectCount (unsigned int) [READ] */
  @meta.blue.read
  @meta.type.uint32
  objectCount = 0;

  /** m_clipSphere (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  clipSphere = 1;

  /** m_sourceRadius (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  sourceRadius = 0;

  /** m_sourceObject (EveSpaceObject2Ptr) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.objectRef("EveSpaceObject2")
  sourceObject = null;

  /** m_multiplier (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  multiplier = 1;

  /** m_speed (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  speed = 1000;

  /** m_sourceLocatorSet (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  sourceLocatorSet = "";

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_range (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  range = 1000;

  /** m_display (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  display = true;

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  effect = null;

  /** Carbon method CanChangeState (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  CanChangeState()
  {
    return !this._changingClipSphere;
  }

  /** Carbon EveChildBulletStorm::Initialize (cpp:60-64): a loaded storm prepares its resources. */
  @meta.implemented
  Initialize()
  {
    this.PrepareResources();
    return true;
  }

  /** Carbon Tr2DeviceResource::PrepareResources (Tr2DeviceResource.cpp:21-32): only while resource creation is allowed. */
  @meta.implemented
  PrepareResources()
  {
    return !Tr2Renderer.IsResourceCreationAllowed() || this.OnPrepareResources();
  }

  /** Carbon EveChildBulletStorm::ReleaseResources (cpp:98-103). Adapted: the buffers are destroyed explicitly. */
  @meta.adapted
  ReleaseResources()
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
    this._vertexBuffer.Destroy();
    this._perInstanceBuffer.Destroy();
  }

  /** Releases final ownership because JavaScript has no deterministic destructor. */
  @meta.ours
  Destroy()
  {
    this.ReleaseResources();
    TriDevice.UnregisterResource(this);
  }

  /**
   * Carbon EveChildBulletStorm::OnPrepareResources (cpp:110-150): the instanced declaration (corner id on stream 0,
   * PerInstanceVertex on stream 1), the four-corner buffer, the per-instance buffer, and two quads of the shared
   * quad-list index buffer. Adapted: the AL description replaces the native stride/count overload.
   */
  @meta.adapted
  OnPrepareResources()
  {
    this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(EveChildBulletStorm._VertexDefinition());
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return false;

    if (!this._vertexBuffer.IsValid())
    {
      if (Failed(this._vertexBuffer.Create(Tr2BufferDescriptionAL.FromStride(CORNER_STRIDE, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.NONE),
        EveChildBulletStorm._corners, Tr2RenderContext_GetMainThreadRenderContext()))) return false;
    }

    this.Rebuild();
    Tr2Renderer.ReserveQuadListIndexBuffer(2);
    return true;
  }

  /**
   * Carbon method Rebuild (MAP_METHOD_AND_WRAP; cpp:156-205): one instance per locator of the source's set, multiplier
   * times, each carrying the locator position, its up axis and (rand, rand, rand, (j + streamRand) / multiplier).
   * Adapted: Math.random stands in for TriRand; instances keeps the CPU copy, and the per-instance buffer is created only
   * while resource creation is allowed.
   */
  @meta.blue.method
  @meta.adapted
  Rebuild()
  {
    this.instances.length = 0;
    this.objectCount = 0;
    this._perInstanceBuffer.Destroy();
    if (!this.sourceObject) return false;
    const locators = this.sourceObject.GetLocatorsForSet(this.sourceLocatorSet);
    if (!locators) return false;
    const count = Math.max(0, Number(this.multiplier) >>> 0);
    for (const locator of locators)
    {
      const direction = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 1, 0), locator.direction);
      const randomOffset = Math.random();
      for (let i = 0; i < count; i++)
      {
        this.instances.push({
          sourcePositionOS: vec3.clone(locator.position),
          sourceDirectionOS: vec3.clone(direction),
          data: vec4.fromValues(Math.random(), Math.random(), Math.random(), (i + randomOffset) / count)
        });
      }
    }
    this.objectCount = this.instances.length;
    if (this.objectCount > 0 && Tr2Renderer.IsResourceCreationAllowed())
    {
      const vertices = new Float32Array(this.objectCount * INSTANCE_STRIDE / 4); // alloc: per-instance stream, rebuilt on edit
      for (let index = 0; index < this.objectCount; index++)
      {
        const instance = this.instances[index];
        vertices.set(instance.sourcePositionOS, index * 10);
        vertices.set(instance.sourceDirectionOS, index * 10 + 3);
        vertices.set(instance.data, index * 10 + 6);
      }
      if (Failed(this._perInstanceBuffer.Create(Tr2BufferDescriptionAL.FromStride(INSTANCE_STRIDE, this.objectCount, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.NONE),
        vertices, Tr2RenderContext_GetMainThreadRenderContext()))) return false;
    }
    return true;
  }

  /** Carbon EveChildBulletStorm::GetRenderables (cpp:84-91): once updated and displayed. Adapted: returns the array. */
  @meta.adapted
  GetRenderables(renderables = [])
  {
    if (this.display && this._hasUpdated) renderables.push(this);
    return renderables;
  }

  /** Carbon EveChildBulletStorm::GetBoundingSphere (cpp:209-212): reports a sphere without writing one - the storm may be huge. */
  @meta.implemented
  GetBoundingSphere(_sphere, _query = 0)
  {
    return true;
  }

  /** Carbon EveChildBulletStorm::GetLocalToWorldTransform (cpp:295-298). Adapted: without an out it returns the live matrix. */
  @meta.adapted
  GetLocalToWorldTransform(out = null)
  {
    return out ? mat4.copy(out, this.worldTransform) : this.worldTransform;
  }

  /** Carbon method StartEffect (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  StartEffect()
  {
    this._clipSphereMultiplier = 1;
    this.clipSphere = 0;
    this._changingClipSphere = true;
  }

  /** Carbon method StopEffect (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  StopEffect()
  {
    this._clipSphereMultiplier = -1;
    this.clipSphere = 0;
    this._changingClipSphere = true;
  }

  /** Carbon EveChildBulletStorm::HasTransparentBatches is always false. */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveChildBulletStorm::GetSortValue is the constant zero. */
  @meta.blue.method
  @meta.implemented
  GetSortValue()
  {
    return 0;
  }

  /**
   * Carbon EveChildBulletStorm::GetBatches (cpp:313-350): additive only; the corner quad on stream 0 drawn once per
   * instance from stream 1 over the shared quad-list index buffer. Adapted: the effect is asked IsGood before drawing,
   * as the other instanced draws do.
   */
  @meta.blue.method
  @meta.adapted
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    if (batchType !== TriBatchType.TRIBATCHTYPE_ADDITIVE) return;
    if (!this._vertexBuffer.IsValid() || !this._perInstanceBuffer.IsValid() || !this.effect) return;
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return;
    if (!this.display) return;
    const indexBuffer = Tr2Renderer.GetQuadListIndexBuffer();
    if (!indexBuffer.IsValid()) return;
    if (!this.effect.IsGood()) return;

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.effect);
    batch.SetPerObjectData(perObjectData);
    batch.SetVertexDeclaration(this._vertexDeclHandle);
    batch.SetStreamSource(0, this._vertexBuffer, CORNER_STRIDE);
    batch.SetStreamSource(1, this._perInstanceBuffer, INSTANCE_STRIDE);
    batch.SetIndices(indexBuffer.GetBuffer(), indexBuffer.GetStride());
    batch.SetDrawIndexedInstanced(6, this.objectCount, indexBuffer.GetStartIndex(), 0, 0);
    batches.Commit(batch);
  }

  /** Carbon EveChildBulletStorm::GetPerObjectData (cpp:393-410): transposed
   * world (Set(MATRIX) does it), effectInfo = (targetObjects.length,
   * sourceRadius + range, clipSphere, speed), then targetPositionsWS[i] per
   * target blob. Slots past targetBlobs.length are NEVER written - the
   * per-element writes keep Carbon's arena-garbage tail. VS-only payload. */
  @meta.blue.method
  @meta.implemented
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveChildBulletStormPerObjectData");

    data.SetAndTranspose("worldTransform", this.worldTransform);
    data.Set("effectInfo", [
      this.targetObjects.length,
      this.sourceRadius + this.range,
      this.clipSphere,
      this.speed
    ]);

    for (let index = 0; index < this.targetBlobs.length; index++)
    {
      data.SetIndex("targetPositionsWS", index, this.targetBlobs[index]);
    }

    return data;
  }

  /**
   * Re-reads the world transform from the owning space object, rebuilds the
   * world-space target blobs for up to the first ten targets (each blob radius
   * floored at 4050), refreshes the source object's radius, and - while the clip
   * sphere is still animating - advances it at the storm's travel speed over the
   * total reach, clamped to -1..1.
   */
  @meta.adapted
  UpdateAsyncronous(updateContext, params = {})
  {
    if (params.spaceObjectParent) params.spaceObjectParent.GetLocalToWorldTransform(this.worldTransform);
    this.targetBlobs.length = 0;
    for (const target of this.targetObjects.slice(0, 10))
    {
      const position = vec3.create();
      target.GetModelCenterWorldPosition(position);
      // Carbon reads targetSize.w whether or not GetBoundingSphere succeeded.
      const sphere = vec4.create();
      target.GetBoundingSphere(sphere);
      this.targetBlobs.push(vec4.fromValues(position[0], position[1], position[2], Math.max(sphere[3], 4050)));
    }
    if (this.sourceObject)
    {
      const { vec4_0 } = EveChildBulletStorm.scratch;
      if (this.sourceObject.GetBoundingSphere(vec4_0)) this.sourceRadius = vec4_0[3];
    }
    if (this._changingClipSphere)
    {
      const deltaTime = updateContext.GetDeltaT();
      const denominator = this.sourceRadius + this.range;
      if (denominator) this.clipSphere += this._clipSphereMultiplier * this.speed * deltaTime / denominator;
      this.clipSphere = Math.max(-1, Math.min(1, this.clipSphere));
      this._changingClipSphere = Math.abs(this.clipSphere) !== 1;
    }
    this._hasUpdated = true;
  }

  /** Carbon's static s_spriteVertexDecl (cpp:113-121). */
  static _VertexDefinition()
  {
    const definition = EveChildBulletStorm._vertexDefinition;
    if (definition.empty())
    {
      definition.Add("FLOAT32_1", "TEXCOORD", 0, 0);
      definition.Add("FLOAT32_3", "TEXCOORD", 1, 1, 1);
      definition.Add("FLOAT32_3", "TEXCOORD", 2, 1, 1);
      definition.Add("FLOAT32_4", "TEXCOORD", 3, 1, 1);
    }
    return definition;
  }

  static _vertexDefinition = new Tr2VertexDefinition();

  static scratch = { vec4_0: vec4.create() };

  /** The four corner ids (cpp:126-131). */
  static _corners = new Float32Array([ 0, 1, 2, 3 ]);

}
