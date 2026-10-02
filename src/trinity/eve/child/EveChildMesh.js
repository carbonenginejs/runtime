import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildMesh.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildMesh.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildMesh_Blue.cpp
import "#consts/graphics/trinityEnums";
import "#consts/trinity";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { getBoneList } from "../../core/animation/Tr2GrannyAnimation.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2RingBuffer, Tr2RingBufferOffsets } from "../../core/device/Tr2RingBuffer/index.js";
import { vec4 } from "#math/vec4";
import { CjsSchema, meta } from "#schema";
import { BLUELISTEVENT } from "#consts/blue";
import { IsMatch, IListNotify } from "#blue";
import { EveEntity } from "../EveEntity.js";
import { ReflectionMode, TriBatchType } from "#consts/graphics";
import { EveChildTransform, applyTransformModifiers } from "./EveChildTransform.js";
import { Origin } from "../../generated/eve/child/enums.js";
import { EveComponentType, ShouldReflect } from "../EveComponentTypes.js";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { Tr2Lod } from "../EveLODHelper.js";
import { Tr2PerObjectData } from "../../core/rawData/perObjectData/Tr2PerObjectData.js";
import { IEveSpaceObject2ParentData } from "../spaceObject/IEveSpaceObject2ParentData.js";
import { TR2_PICK_TYPE_DEFAULT, Tr2PickType } from "../../core/view/Tr2PickType.js";
import {
  createChildPerObjectRecords,
  inheritParentPerObjectData,
  stampChildTransforms
} from "../perObjectData/childPerObjectRecords.js";
import { Float4x3 } from "../../utilities/Float4x3.js";
import { EveCollectAreas } from "./EveSpaceObjectChild.js";
import { EveGetLocatorPose } from "../locator/EveLocatorSets.js";
import { EveDamageOverlay } from "../overlays/EveDamageOverlay.js";
import {
  CollectOverlayAreaBlocks,
  EmitDamageOverlayBatches,
  EmitOverlayBatches
} from "../overlays/overlayBatches.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import "./EveChildContainer.js";

// Module scratch for the hot per-frame visibility/shadow paths (allocation
// rules: copy-into, never allocate per call; child updates run sequentially so
// the scratch is non-reentrant by construction).
const INVERSE_WORLD_SCRATCH = mat4.create();
const LOCAL_VIEW_SCRATCH = vec3.create();
const INSTANCE_SPHERE_SCRATCH = vec4.create();
const SHADOW_SPHERE_SCRATCH = vec4.create();
const BOX_CORNER_SCRATCH = vec3.create();
const BOX_QUERY_SCRATCH = { min: vec3.create(), max: vec3.create() };
const ZERO_VEC3 = vec3.create();

// Carbon's (nullptr, 0) bone result - frozen so callers cannot mutate it.
const NO_BONE_TRANSFORMS = { bones: null, boneCount: 0 };


/**
 * Space-object child that draws one mesh under its own transform, owning its
 * decals, lights, attachments, morph weights, world bounds and screen-size LOD
 * state.
 */
@meta.define({ className: "EveChildMesh", family: "eve/child" })
@meta.blue.inherit(ITr2Renderable)
@meta.blue.inherit(IListNotify)
@meta.blue.inherit(IInitialize, INotify, IListNotify)
export class EveChildMesh extends EveChildTransform
{
  _isMorphsBaked = false;

  _morphAnimationBuffer = [];

  _morphAnimationOffsets = {
    runtimeEvaluatedOffset: 0,
    runtimeEvaluatedCount: 0,
    bakedOffset: 0,
    bakedCount: 0,
    allCount: 0
  };

  // Carbon m_isVisible/m_instancesVisible/m_hasUpdated/m_activationStrength:
  // runtime-only frame state (never persisted; Carbon keeps them out of the
  // Blue surface too).
  _isVisible = false;

  _instancesVisible = false;

  _hasUpdated = false;

  _activationStrength = 1;

  /** m_vsData / m_psData - this child's PERSISTENT per-object record pair. */
  _perObjectData = createChildPerObjectRecords();

  /** Carbon's local `lastWorldTransform` (cpp:912), kept across frames here. */
  _lastWorldTransform = mat4.create();

  // Carbon m_worldBoundingBox/m_worldBoundingSphere: world-space bounds
  // refreshed by UpdateAsyncronous; the sphere is invalid while radius <= 0.
  _worldBoundsMin = vec3.create();

  _worldBoundsMax = vec3.create();

  _worldBoundsValid = false;

  _worldBoundingSphere = vec4.create();

  /** Identity rest-pose palette for skinned shaders without live animation. */
  _restPoseBoneTransforms = null;

  /** Carbon m_boneOffsets: where this child's palette landed in the bone ring, this frame and last. */
  _boneOffsets = new Tr2RingBufferOffsets();

  _parentOverlayEffects = null;

  /** m_parentData (IEveSpaceObject2::ParentData) - refreshed from the space
   * object parent in UpdateSyncronous and handed to the decals (cpp:1015, 450). */
  _parentData = new IEveSpaceObject2ParentData();

  _overlayAreaBlocks = [ [], [] ];

  _overlayAreaBlocksBuilt = false;

  // Carbon sets these two programmatically from SOF (EveSOF.cpp:3971-3972);
  // CarbonEngineJS delivers built objects as documents, so both persist.
  @meta.blue.persist
  @meta.type.list("EveLocatorSets")
  ownedLocatorSets = [];

  @meta.blue.persist
  @meta.type.objectRef("Tr2Effect")
  armorDamageShader = null;

  /**
   * Clears the private visibility state for a derived child whose own Carbon
   * cull rejects it before EveChildMesh::UpdateVisibility runs.
   *
   * EveChildInstanceMeshRenderer owns exactly that two-stage cull. Keeping the
   * mutation here preserves one state owner instead of shadowing the four
   * private values in the subclass.
   */
  _ResetVisibilityState()
  {
    this._isVisible = false;
    this.currentScreenSize = -1;
    this._instancesVisible = false;
    this.currentInstanceScreenSize = -1;
  }

  /** Carbon-derived classes read m_activationStrength after the mesh update. */
  _GetActivationStrength()
  {
    return this._activationStrength;
  }

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.EntityComponents.ReflectionMode")
  reflectionMode = 3;

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveChildTransformModifier")
  transformModifiers = [];

  @meta.blue.read
  @meta.type.mat4
  worldTransform = mat4.create();

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  inheritOverlayEffects = true;

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveMeshOverlayEffect")
  overlayEffects = [];

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveDamageOverlay")
  damageOverlay = null;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  castShadow = false;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2MeshBase")
  mesh = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.mat4
  localTransform = mat4.create();

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSpaceObjectDecal")
  decals = [];

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  staticTransform = false;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2GrannyAnimation")
  animationUpdater = null;

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSpaceObjectAttachment")
  attachments = [];

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2Light")
  lights = [];

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.Tr2Lod")
  lowestLodVisible = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minScreenSize = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  sortValueOffset = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  sortValueScale = 1;

  @meta.blue.read
  @meta.type.float32
  currentScreenSize = -1;

  @meta.blue.read
  @meta.type.float32
  currentInstanceScreenSize = -1;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  useSRT = true;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  updateAnimation = true;

  // SOF-authored placement/instance values; persisted so the values
  // interchange reproduces Carbon's hidden child placement state.
  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.EveSpaceObjectChild.Origin")
  origin = 0;

  @meta.blue.persist
  @meta.type.array("mat4")
  instanceTransforms = [];

  @meta.blue.persist
  @meta.type.string
  sofDna = "";

  @meta.blue.persist
  @meta.type.string
  sofParentHullName = "";

  @meta.blue.persist
  @meta.type.string
  sofLocatorSetName = "";

  @meta.blue.persist
  @meta.type.string
  sofLocatorIndex = "";

  /**
   * Rebuilds the local transform up front when the child is marked
   * staticTransform, since UpdateTransform will not rebuild it on later frames.
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    if (this.staticTransform)
    {
      this.RebuildLocalTransform();
    }

    // cpp:84 - bind the updater to this mesh's geometry.
    this.InitializeAnimation();

    for (let index = 0; index < this.decals.length; index++) this.decals[index].SetPriority(index);

    return true;
  }

  /** Carbon owner-list consequences (EveChildMesh.cpp:103–194). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("JS arrays use the shared list mutation entry points; component interface IDs use the existing EveComponentType map.")
  OnListModified(event, key, key2, value, list)
  {
    const kind = event & BLUELISTEVENT.BELIST_EVENTMASK;
    if (list === this.decals)
    {
      if (kind === BLUELISTEVENT.BELIST_INSERTED || kind === BLUELISTEVENT.BELIST_REMOVED)
      {
        // Carbon quirk: Blue append may report size rather than size - 1.
        // EveChildMesh.cpp:107–111 retains that off-by-one workaround.
        const first = kind === BLUELISTEVENT.BELIST_INSERTED && key === this.decals.length ? key - 1 : key;
        for (let index = first; index < this.decals.length; index++) this.decals[index].SetPriority(index);
      }
      else if (kind === BLUELISTEVENT.BELIST_SWAPPED)
      {
        this.decals[key].SetPriority(key);
        this.decals[key2].SetPriority(key2);
      }
      else if (kind === BLUELISTEVENT.BELIST_MOVED)
      {
        for (let index = Math.min(key, key2); index <= Math.max(key, key2); index++) this.decals[index].SetPriority(index);
      }
    }
    if (list === this.lights)
    {
      const registry = this.GetComponentRegistry();
      if (registry)
      {
        if (kind === BLUELISTEVENT.BELIST_UNLOADSTART || (kind === BLUELISTEVENT.BELIST_REMOVED && !this.lights.length))
        {
          registry.UnRegisterComponent(EveComponentType.LightOwner, this);
        }
        else if (kind === BLUELISTEVENT.BELIST_INSERTED && this.lights.length === 1)
        {
          registry.RegisterComponent(EveComponentType.LightOwner, this);
        }
      }
    }
    if (list === this.attachments && !(event & BLUELISTEVENT.BELIST_LOADING) && this.IsInRegistry())
    {
      const registry = this.GetComponentRegistry();
      if (kind === BLUELISTEVENT.BELIST_INSERTED || kind === BLUELISTEVENT.BELIST_REMOVED)
      {
        const entity = CjsSchema.cast(value, EveEntity);
        if (entity)
        {
          if (kind === BLUELISTEVENT.BELIST_INSERTED) entity.Register(registry);
          else entity.UnRegister(registry);
        }
      }
      else if (kind === BLUELISTEVENT.BELIST_UNLOADSTART)
      {
        for (const attachment of this.attachments)
        {
          const entity = CjsSchema.cast(attachment, EveEntity);
          if (entity) entity.UnRegister(registry);
        }
      }
    }
  }

  /**
   * Applies the authored scale/rotation/translation and, when supplied, the
   * lowest LOD level at which the child stays visible; returns the rebuilt local
   * transform.
   */
  @meta.blue.method
  @meta.implemented
  Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null)
  {
    super.Setup(scale, rotation, translation, lowestLodVisible);
    if (lowestLodVisible !== null && lowestLodVisible !== undefined)
    {
      this.lowestLodVisible = Number(lowestLodVisible) | 0;
    }
    return this.localTransform;
  }

  /**
   * Replaces the instance placement list with clones of the supplied matrices, so later caller mutations do not reach the child.
   * @param {Iterable<Float32Array>} instances - 16-value matrices; a wrongly sized entry throws TypeError
   * @returns {Array<Float32Array>} the stored list
   */
  @meta.blue.method
  @meta.implemented
  SetInstanceTransforms(instances)
  {
    const next = [];
    for (const transform of instances ?? [])
    {
      if (!transform || transform.length !== 16)
      {
        throw new TypeError("EveChildMesh instance transforms must contain 16 values");
      }
      next.push(mat4.clone(transform));
    }
    this.instanceTransforms = next;
    return this.instanceTransforms;
  }

  /**
   * Returns the live instance transform list, not a copy - mutating it changes
   * what the child renders.
   */
  @meta.blue.method
  @meta.adapted
  GetInstanceTransforms()
  {
    return this.instanceTransforms;
  }

  /** Returns the Tr2MeshBase this child draws, or null (Carbon EveChildMesh.cpp:968-971). */
  @meta.blue.method
  @meta.implemented
  GetMesh()
  {
    return this.mesh;
  }

  /**
   * Assigns the Tr2MeshBase this child draws; a nullish value clears it, which
   * also makes the child permanently invisible (UpdateVisibility requires a
   * mesh).
   */
  @meta.blue.method
  @meta.implemented
  SetMesh(mesh)
  {
    this.mesh = mesh ?? null;
    this._overlayAreaBlocksBuilt = false;
    this._restPoseBoneTransforms = null;
  }

  /** Appends an overlay owned by this child; inherited hull overlays render after it. */
  @meta.blue.method
  @meta.implemented
  AddOverlayEffect(effect)
  {
    if (!effect) throw new TypeError("EveChildMesh overlay effect must not be null");
    this.overlayEffects.push(effect);
  }

  /** Removes the first matching owned overlay. */
  @meta.blue.method
  @meta.implemented
  RemoveOverlayEffect(effect)
  {
    const index = this.overlayEffects.indexOf(effect);
    if (index !== -1) this.overlayEffects.splice(index, 1);
  }

  /** Returns the first owned overlay whose authored name matches. */
  @meta.blue.method
  @meta.implemented
  GetOverlayEffectByName(name)
  {
    return this.overlayEffects.find(effect => effect.name === String(name)) ?? null;
  }

  /**
   * Records whether this child's placement was authored in space or by SOF (the
   * Origin enum).
   */
  @meta.blue.method
  @meta.implemented
  SetOrigin(origin)
  {
    this.origin = Number(origin) | 0;
  }

  /**
   * Copies the given scale into the child's SRT scaling; it reaches the world
   * transform on the next local-transform rebuild.
   */
  @meta.blue.method
  @meta.implemented
  SetScale(scale)
  {
    vec3.copy(this.scaling, scale);
  }

  /**
   * Sets the reflection mode, which decides whether the child registers as a
   * ReflectionRenderable and whether it casts shadows during reflection passes.
   */
  @meta.blue.method
  @meta.implemented
  SetReflectionMode(mode)
  {
    this.reflectionMode = Number(mode) | 0;
  }

  /**
   * Sets whether the child registers as a shadow caster and contributes opaque
   * shadow batches.
   */
  @meta.blue.method
  @meta.implemented
  SetCastShadow(castShadow)
  {
    this.castShadow = !!castShadow;
  }

  /**
   * Sets the minimum screen size, in pixels across, that the child's world
   * bounding sphere must reach - after the frame's inverse LOD factor scaling -
   * before UpdateVisibility marks it visible.
   */
  @meta.blue.method
  @meta.implemented
  SetMinScreenSize(minScreenSize)
  {
    this.minScreenSize = Number(minScreenSize);
  }

  /** Carbon EveChildMesh::GetLocalToWorldTransform (cpp:1047-1050); the
   * optional out follows the EveChildInstancedMeshes copy-out shape. */
  @meta.blue.method
  @meta.implemented
  GetLocalToWorldTransform(out = null)
  {
    if (out)
    {
      return mat4.copy(out, this.worldTransform);
    }
    return this.worldTransform;
  }

  /**
   * The authored name, persisted with the child and used to identify it in the
   * parent graph.
   */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the authored child name, coercing nullish to the empty string. */
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Appends a transform modifier; modifiers fold over the child's world
   * transform in insertion order on each async update.
   */
  @meta.blue.method
  @meta.implemented
  AddTransformModifier(modifier)
  {
    this.transformModifiers.push(modifier);
  }

  /**
   * Appends a decal; decals refresh their visibility only while the child itself
   * is visible, and ride along in GetRenderables when the mesh has a geometry
   * resource.
   */
  @meta.blue.method
  @meta.implemented
  AddDecal(decal)
  {
    this.decals.push(decal);
  }

  /**
   * Appends an attachment; attachments refresh their lights and visibility every
   * frame regardless of the child's own visibility.
   */
  @meta.blue.method
  @meta.implemented
  AddAttachment(attachment)
  {
    this.attachments.push(attachment);
  }

  /**
   * Drops every attachment, removing their lights, batches and visibility
   * updates from this child.
   */
  @meta.blue.method
  @meta.implemented
  ClearAttachments()
  {
    this.attachments.length = 0;
  }

  /**
   * Appends a light, submitted to the light manager from the child's world
   * transform while the child displays.
   */
  @meta.blue.method
  @meta.implemented
  AddLight(light)
  {
    this.lights.push(light);
  }

  /**
   * Drops every light, which also stops the child registering as a LightOwner on
   * the next component registration.
   */
  @meta.blue.method
  @meta.implemented
  ClearLights()
  {
    this.lights.length = 0;
  }

  /** Returns true unconditionally - a child mesh reports itself as always on. */
  @meta.blue.method
  @meta.implemented
  IsAlwaysOn()
  {
    return true;
  }

  /** Forwards a shader option to the mesh, every decal and every attachment. */
  @meta.blue.method
  @meta.implemented
  SetShaderOption(name, value)
  {
    this.mesh?.SetShaderOption?.(name, value);
    for (const decal of this.decals)
    {
      decal?.SetShaderOption?.(name, value);
    }
    for (const attachment of this.attachments)
    {
      if (!attachment) continue;
      attachment.SetShaderOption(name, value);
    }
  }

  /**
   * Names of the mesh's morph targets in index order, or an empty array when the
   * mesh exposes none; the indices line up with the records GetMorphTargets
   * returns.
   */
  @meta.blue.method
  @meta.adapted
  GetMorphTargetNames()
  {
    return this.mesh?.GetMorphTargetNames?.() ?? [];
  }

  /**
   * Writes a named morph weight on the mesh; it only reaches the render path
   * after the next UpdateMorphAnimationBuffer pass re-sorts the indexed buffer.
   */
  @meta.blue.method
  @meta.adapted
  SetMorphTargetWeight(name, weight)
  {
    this.mesh?.SetMorphTargetWeight?.(name, weight);
  }

  /**
   * Reads a named morph weight straight from the mesh (0 when it has no such
   * target), bypassing any animation-driven value the morph buffer may have
   * applied.
   */
  @meta.blue.method
  @meta.adapted
  GetMorphTargetWeight(name)
  {
    return this.mesh?.GetMorphTargetWeight?.(name) ?? 0;
  }

  /**
   * Rebuilds the source-backed indexed morph buffer from manual and animation
   * weights. Runs from UpdateAsyncronous.
   *
   * An animation value with the exact morph-target name overrides the mesh
   * weight. Weights below 0.001 are inactive. The buffer is ordered runtime
   * records, then baked records, then inactive ones, and the offsets record
   * each active partition's start and count.
   */
  @meta.adapted
  UpdateMorphAnimationBuffer()
  {
    const names = this.mesh?.GetMorphTargetNames?.();

    this._morphAnimationOffsets = {
      runtimeEvaluatedOffset: 0,
      runtimeEvaluatedCount: 0,
      bakedOffset: 0,
      bakedCount: 0,
      allCount: 0
    };

    if (!Array.isArray(names))
    {
      this._morphAnimationBuffer = [];
      return 0;
    }

    const manual = this.mesh?.GetMorphAnimations?.();
    const records = names.map((name, index) => ({
      index,
      weight: ReadMorphWeight(
        ReadNamedMorph(manual, name) ?? this.mesh?.GetMorphTargetWeight?.(name) ?? 0,
        name,
        "mesh"
      ),
      baked: !!(this.mesh?.IsBakedMorph?.(index)
        ?? this.mesh?.GetBakedMorphTarget?.(name)
        ?? false)
    }));

    if (this.animationUpdater?.IsInitialized?.())
    {
      const animated = this.animationUpdater.GetMorphAnimations?.();

      for (const record of records)
      {
        const name = names[record.index];
        const value = ReadNamedMorph(animated, name);

        if (value !== undefined)
        {
          record.weight = ReadMorphWeight(value, name, "animation");
        }
      }
    }

    const runtime = [];
    const baked = [];
    const inactive = [];

    for (const record of records)
    {
      if (record.weight >= 0.001)
      {
        (record.baked ? baked : runtime).push(record);
      }
      else
      {
        inactive.push(record);
      }
    }

    this._morphAnimationBuffer = [ ...runtime, ...baked, ...inactive ];
    this._morphAnimationOffsets.runtimeEvaluatedCount = runtime.length;
    this._morphAnimationOffsets.bakedOffset = runtime.length;
    this._morphAnimationOffsets.bakedCount = baked.length;
    this._morphAnimationOffsets.allCount = runtime.length + baked.length;
    return this._morphAnimationOffsets.allCount;
  }

  /** Returns detached active indexed morph records for the native filter. */
  @meta.adapted
  GetMorphTargets(filter = 2)
  {
    const normalized = NormalizeMorphFilter(filter);
    let offset = 0;
    let count = 0;

    if (normalized === 2)
    {
      count = this._morphAnimationOffsets.allCount;
    }
    else if (normalized === 0)
    {
      offset = this._isMorphsBaked
        ? this._morphAnimationOffsets.runtimeEvaluatedOffset
        : 0;
      count = this._isMorphsBaked
        ? this._morphAnimationOffsets.runtimeEvaluatedCount
        : this._morphAnimationOffsets.allCount;
    }
    else
    {
      offset = this._morphAnimationOffsets.bakedOffset;
      count = this._morphAnimationOffsets.bakedCount;
    }

    return this._morphAnimationBuffer.slice(offset, offset + count)
      .map(value => ({ index: value.index, weight: value.weight }));
  }

  /**
   * Always returns null: a child mesh exposes no packed area-id lookup, since
   * its SOF identity lives directly on its
   * sofParentHullName/sofLocatorSetName/sofLocatorIndex fields.
   */
  @meta.blue.method
  @meta.adapted
  GetSofSourceLocator()
  {
    return null;
  }

  /**
   * Sync-side frame update (Carbon EveChildMesh::UpdateSyncronous,
   * cpp:1142-1205): the damage and overlay updates, then the animation -
   * re-bind the updater when the mesh's geometry changed, and step it when
   * `updateAnimation` is on.
   *
   * Adapted: audio-geometry registration is not ported; the step uses the
   * frame delta where Carbon's PrePhysicsAnimation reads Tr2Renderer's
   * animation clock; Tr2AnimationMeshBinding (an updater without a mesh
   * binding) is unported, so GetBoneTransforms falls back to the rest pose
   * there.
   */
  @meta.blue.method
  @meta.adapted
  UpdateSyncronous(updateContext, _params)
  {
    if (this.damageOverlay) this.damageOverlay.UpdateSyncronous(updateContext);

    const time = updateContext.GetTime();
    for (const overlay of this.overlayEffects) overlay.Update(time, time);

    const updater = this.animationUpdater;
    if (updater)
    {
      if (this.mesh && !updater.resPath_ && this.mesh.GetGeometryResource() !== updater.GetSharedGeometryRes())
      {
        this.InitializeAnimation();
      }
      if (this.updateAnimation) updater.Update(updateContext.GetDeltaT());
    }
  }

  /**
   * Per-frame async update (Carbon EveChildMesh::UpdateAsyncronous,
   * cpp:903-1000): rebuild the world transform from the parent, fold the
   * transform modifiers over it, store the activation strength, refresh the
   * attachment lights, the morph buffer, and the world bounds. The bone ring
   * cursor advances first (cpp:987); the morph ring advance and per-object-data
   * invalidation (cpp:988-991), audio geometry
   * (cpp:920-930), parent VS/PS struct refresh (cpp:932-960), and the skinned
   * GetBounds overload are not modelled, hence @impl.adapted.
   * @param {Object} updateContext - frame context (EveUpdateContext), threaded to modifiers
   * @param {EveChildUpdateParams} params - localToWorldTransform + boneCount/bones
   * @returns {Float32Array} worldTransform
   */
  @meta.blue.method
  @meta.blue.contextual(["camera"])
  @meta.adapted
  UpdateAsyncronous(updateContext, params)
  {
    this._boneOffsets.AdvanceFrame();

    const parentTransform = params?.localToWorldTransform;

    // Carbon captures the OUTGOING transform before rebuilding (cpp:912).
    mat4.copy(this._lastWorldTransform, this.worldTransform);

    if (parentTransform && parentTransform.length === 16)
    {
      this.UpdateTransform(parentTransform);
    }

    applyTransformModifiers(
      this,
      updateContext,
      params?.boneCount ?? 0,
      params?.bones ?? null
    );

    // Carbon cpp:932-954: inherit the hull's per-object values, rebase the clip
    // data by this child's translation, then stamp our own transforms.
    const parent = params?.spaceObjectParent ?? null;
    inheritParentPerObjectData(this._perObjectData, parent, this.translation);
    // Carbon cpp:1015: the decals' parent data comes from the space object
    // parent, then is made relevant to this child below.
    if (parent) parent.GetParentData(this._parentData);
    this._parentOverlayEffects = this.inheritOverlayEffects && Array.isArray(parent?.overlayEffects)
      ? parent.overlayEffects
      : null;
    if (parent && !this.inheritOverlayEffects)
    {
      this._perObjectData.vs.Set("clipData", [ 0, 0, 0, 0 ]);
      this._perObjectData.ps.Set("clipRadiusSq", [ 0 ]);
      this._perObjectData.ps.Set("clipRadius2Sq", [ 0 ]);
      this._perObjectData.ps.Set("clipSphereFactor", [ 0 ]);
      this._perObjectData.ps.Set("clipSphereFactor2", [ 0 ]);
      // cpp:1033-1036: the decals lose the inherited clip sphere too.
      this._parentData.clipRadiusSq = 0;
      this._parentData.clipRadius2Sq = 0;
      this._parentData.clipFactor = 0;
      this._parentData.clipFactor2 = 0;
    }
    // cpp:1044: the decals are placed by this child's world transform.
    if (parent) mat4.copy(this._parentData.transform, this.worldTransform);
    stampChildTransforms(this._perObjectData, this.worldTransform, this._lastWorldTransform);

    this._activationStrength = Number(params?.activationStrength ?? 1);
    if (this.damageOverlay)
    {
      const flicker = this.damageOverlay.GetActivationStrength(updateContext);
      this._activationStrength *= flicker;
      const shipData = this._perObjectData.ps.Get("shipData");
      this._perObjectData.ps.Set("shipData", [ shipData[0], parent ? shipData[1] * flicker : flicker, shipData[2], shipData[3] ]);
      this._perObjectData.ps.Set("impactDataOffset", [ this.damageOverlay.GetDataTextureOffset() ]);
    }

    // Carbon (cpp:962-970): attachments refresh their lights from the updated
    // world transform. Bones come from GetBoneTransforms (animationUpdater) -
    // null until the JS animation seam exists.
    for (const attachment of this.attachments)
    {
      if (!attachment) continue;
      attachment.UpdateLights(this.worldTransform, null, 0, this._activationStrength, 0);
    }

    this.UpdateMorphAnimationBuffer();

    // Carbon (cpp:974-997): world AABB from the mesh bounds, world sphere
    // enclosing it. The skinned GetBounds overload (animation transforms +
    // morph targets, cpp:977-982) awaits the animation seam; the maintained
    // Tr2MeshBase GetBounds supplies the static/material bounds meanwhile.
    this._worldBoundsValid = false;
    const bounds = this.mesh ? this.mesh.GetBounds() : null;

    if (bounds?.min && bounds?.max)
    {
      this._worldBoundsMin[0] = this._worldBoundsMin[1] = this._worldBoundsMin[2] = Infinity;
      this._worldBoundsMax[0] = this._worldBoundsMax[1] = this._worldBoundsMax[2] = -Infinity;
      for (let index = 0; index < 8; index++)
      {
        vec3.set(
          BOX_CORNER_SCRATCH,
          index & 1 ? bounds.max[0] : bounds.min[0],
          index & 2 ? bounds.max[1] : bounds.min[1],
          index & 4 ? bounds.max[2] : bounds.min[2]
        );
        vec3.transformMat4(BOX_CORNER_SCRATCH, BOX_CORNER_SCRATCH, this.worldTransform);
        vec3.min(this._worldBoundsMin, this._worldBoundsMin, BOX_CORNER_SCRATCH);
        vec3.max(this._worldBoundsMax, this._worldBoundsMax, BOX_CORNER_SCRATCH);
      }
      this._worldBoundsValid = true;
      sph3.fromBounds(this._worldBoundingSphere, this._worldBoundsMin, this._worldBoundsMax);
    }
    else
    {
      sph3.set(this._worldBoundingSphere, 0, 0, 0, 0);
    }

    if (this.damageOverlay)
    {
      const localSphere = vec4.fromValues(0, 0, 0, -1);
      if (bounds?.min && bounds?.max)
      {
        const cx = (bounds.min[0] + bounds.max[0]) * 0.5;
        const cy = (bounds.min[1] + bounds.max[1]) * 0.5;
        const cz = (bounds.min[2] + bounds.max[2]) * 0.5;
        vec4.set(localSphere, cx, cy, cz,
          Math.hypot(bounds.max[0] - cx, bounds.max[1] - cy, bounds.max[2] - cz));
      }
      this.damageOverlay.UpdateAsyncronous(updateContext, {
        boundingSphere: localSphere,
        estimatedPixelDiameter: Math.max(this.currentScreenSize, 0),
        isInFrustum: this._isVisible,
        // Bind pose, not animated: the overlay seeds decals at the stable
        // authored position (Carbon EveChildMesh.cpp:1130, commit 98ee5e08).
        getDamageLocatorPositionOS: (index, out) => this.GetDamageLocatorBindPositionLocal(index, out)
      }, 0, false);
    }

    this._hasUpdated = true;
    return this.worldTransform;
  }

  /**
   * Frame visibility + LOD state (Carbon EveChildMesh::UpdateVisibility,
   * cpp:366-463): screen size via the frustum, invLodFactor scaling, the
   * minScreenSize/lowestLodVisible gates, the per-instance visibility gate,
   * and the attachment/decal visibility fan-out. Carbon recomputes the local
   * mesh bounds here (cpp:380-394) but consumes only the world sphere/box
   * computed in UpdateAsyncronous, so the dead recompute is skipped. The
   * raytracing branch (cpp:450-462) is not ported yet and omitted.
   * @param {Object} updateContext - frame context (frustum + invLodFactor ducks)
   * @param {Float32Array} _parentTransform
   * @param {Number} parentLod - parent Tr2Lod level
   * @returns {Boolean} isVisible
   */
  /**
   * The updater this mesh animates with (ITr2GrannyAnimationOwner, Carbon
   * EveChildMesh.cpp:1481-1484). A placement container whose animation owner
   * is this mesh uploads this updater's palette.
   *
   * @returns {Tr2GrannyAnimation|null} The updater.
   */
  @meta.blue.method
  @meta.implemented
  GetAnimationController()
  {
    return this.animationUpdater;
  }

  /**
   * The mesh's bone palette, as a borrowed Float4x3 buffer and its bone count.
   *
   * Carbon `EveChildMesh::GetBoneTransforms` (cpp:1285-1307). Carbon branches:
   * the updater's own palette when it has a mesh binding, otherwise a separate
   * `Tr2AnimationMeshBinding` palette. Only the first branch exists here -
   * `Tr2AnimationMeshBinding` is unported - so a mesh relying on the second
   * gets no bones rather than the wrong ones.
   *
   * Carbon also assigns `accumulatedTransforms` and never reads it; that dead
   * local is not reproduced.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Tr2AnimationMeshBinding remains unported; Carbon's identity rest-pose fallback is used when neither live palette source is available.")
  GetBoneTransforms()
  {
    const updater = this.animationUpdater;

    if (!updater || !updater.IsInitialized())
    {
      return this.GetRestPoseBoneTransforms();
    }

    // cpp:1297-1302 - the updater's own palette when it binds to the mesh.
    if (updater.HasMeshBinding())
    {
      return getBoneList(updater);
    }

    // A maintained Tr2AnimationMeshBinding would be consulted here. Until that
    // source exists, Carbon's final identity rest-pose path is the safe result.
    return this.GetRestPoseBoneTransforms();
  }

  /**
   * Builds Carbon's identity Float4x3 rest-pose palette. Geometry with no bone
   * bindings still receives one identity because skinned shaders read bone 0.
   */
  @meta.implemented
  GetRestPoseBoneTransforms()
  {
    const geometry = this.mesh ? this.mesh.GetGeometryResource() : null;
    if (!geometry)
    {
      return NO_BONE_TRANSFORMS;
    }

    const meshIndex = Number(this.mesh.GetMeshIndex()) >>> 0;
    const mesh = geometry.GetMeshData(meshIndex);
    const boneCount = Math.max(mesh?.boneBindings?.length ?? 0, 1);

    if (!this._restPoseBoneTransforms || this._restPoseBoneTransforms.length !== boneCount * 12)
    {
      const identity = Float4x3.fromMat4(mat4.create());
      this._restPoseBoneTransforms = new Float32Array(boneCount * 12);
      for (let index = 0; index < boneCount; index++)
      {
        this._restPoseBoneTransforms.set(identity, index * 12);
      }
    }

    return { bones: this._restPoseBoneTransforms, boneCount };
  }

  /**
   * Resolves this child's visibility for the frame from its world bounding
   * sphere, the parent LOD, and the authored screen-size thresholds, recording
   * the mesh and per-instance screen sizes the batch path then draws at.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Bone-fed decal bounds still await the decal seam and the raytracing refresh is not ported yet; the LOD/screen-size math and the bone-fed attachment pass are ported.")
  UpdateVisibility(updateContext, _parentTransform = null, parentLod = Tr2Lod.TR2_LOD_HIGH)
  {
    this._isVisible = false;
    this.currentScreenSize = -1;
    this._instancesVisible = false;
    this.currentInstanceScreenSize = -1;

    if (!this._hasUpdated)
    {
      return false;
    }

    const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
    const invLodFactor = Number(updateContext?.GetInvLodFactor?.() ?? updateContext?.invLodFactor) || 1;

    if (this.mesh)
    {
      this.currentScreenSize = Number(frustum?.GetPixelSizeAccross?.(this._worldBoundingSphere) ?? Infinity) || 0;

      // Cached Tr2InstancedMesh downcast in Carbon (m_instancedMesh); the JS
      // port duck-types the instanced surface instead.
      const instanced = typeof this.mesh.GetInstanceBoundsClosestToPoint === "function";
      let instanceBounds = null;

      if (instanced)
      {
        // Carbon: TransformCoord(frustum.m_viewPos, Inverse(m_worldTransform))
        // - a single-matrix point transform (no composition; TransformCoord
        // maps to vec3.transformMat4 unchanged per the math conventions).
        if (!mat4.invert(INVERSE_WORLD_SCRATCH, this.worldTransform))
        {
          mat4.identity(INVERSE_WORLD_SCRATCH);
        }
        const viewPos = frustum?.viewPos ?? ZERO_VEC3;
        vec3.transformMat4(LOCAL_VIEW_SCRATCH, viewPos, INVERSE_WORLD_SCRATCH);
        instanceBounds = this.mesh.GetInstanceBoundsClosestToPoint(LOCAL_VIEW_SCRATCH);
      }

      if (instanceBounds)
      {
        // Carbon: instanceBounds.Transform(m_worldTransform) - single-matrix
        // sphere transform, ported via sph3.transformMat4.
        sph3.set(
          INSTANCE_SPHERE_SCRATCH,
          instanceBounds.center[0],
          instanceBounds.center[1],
          instanceBounds.center[2],
          instanceBounds.radius
        );
        sph3.transformMat4(INSTANCE_SPHERE_SCRATCH, INSTANCE_SPHERE_SCRATCH, this.worldTransform);
        this.currentInstanceScreenSize = Number(frustum?.GetPixelSizeAccross?.(INSTANCE_SPHERE_SCRATCH) ?? Infinity) || 0;
        this.mesh.UseWithScreenSize?.(this.currentInstanceScreenSize, INSTANCE_SPHERE_SCRATCH[3]);
      }
      else
      {
        // Carbon uses std::numeric_limits<float>::max(); Infinity keeps the
        // instance gate permanently open the same way.
        this.currentInstanceScreenSize = Infinity;
        this.mesh.UseWithScreenSize?.(this.currentScreenSize, this._worldBoundingSphere[3]);
      }

      this.currentScreenSize *= invLodFactor;
      this.currentInstanceScreenSize *= invLodFactor;

      BOX_QUERY_SCRATCH.min = this._worldBoundsMin;
      BOX_QUERY_SCRATCH.max = this._worldBoundsMax;
      const boxVisible = this._worldBoundsValid &&
        (frustum?.IsBoxVisible ? !!frustum.IsBoxVisible(BOX_QUERY_SCRATCH) : true);

      if (boxVisible)
      {
        this._isVisible = parentLod >= this.lowestLodVisible && this.currentScreenSize >= this.minScreenSize;
        this._instancesVisible = this._isVisible &&
          this.currentInstanceScreenSize >= EveChildMesh._instanceScreenSizeThreshold;
      }
    }

    // Carbon (cpp:427-435): attachments always refresh visibility, fed the bone
    // palette so a bone-parented attachment is placed by its bone.
    const { bones, boneCount } = this.GetBoneTransforms();

    for (const attachment of this.attachments)
    {
      if (!attachment) continue;
      attachment.UpdateVisibility(updateContext, this.worldTransform, bones, boneCount);
    }

    if (this._isVisible)
    {
      for (const decal of this.decals)
      {
        // Carbon (cpp:441-446) feeds animated bone matrices to the decal first
        // - skipped until the JS animation seam exists. Carbon passes
        // &m_parentData (cpp:450), refreshed in UpdateSyncronous.
        decal?.UpdateVisibility(updateContext, this._parentData);
      }
    }

    return this._isVisible;
  }

  /**
   * Collects this child (and its decals) as renderables (Carbon
   * EveChildMesh::GetRenderables, cpp:571-616): instanced meshes contribute
   * only while the per-instance gate passed; decals ride along through their
   * duck-typed renderable collectors (mesh cache is not ported yet, passed null
   * as in EveSpaceObject2.GetRenderables).
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The decal mesh cache is not ported yet (null placeholder); collection structure is ported.")
  GetRenderables(out = [])
  {
    if (!this._isVisible)
    {
      return out;
    }

    const instanced = typeof this.mesh?.GetInstanceBoundsClosestToPoint === "function";

    if (instanced)
    {
      if (this._instancesVisible)
      {
        out.push(this);
        if (this.decals.length && this.mesh.GetGeometryResource())
        {
          for (const decal of this.decals)
          {
            decal?.GetInstancedRenderables?.(out, null, this.mesh, this.currentInstanceScreenSize);
          }
        }
      }
    }
    else
    {
      out.push(this);
      const geometryResource = this.mesh?.GetGeometryResource();
      if (this.decals.length && geometryResource)
      {
        for (const decal of this.decals)
        {
          decal?.GetRenderables(out, null, geometryResource, this.currentScreenSize);
        }
      }
    }

    return out;
  }

  /** Carbon EveChildMesh::GetBoundingSphere (cpp:618-627): the realized world
   * sphere, valid only after an update produced bounds (radius > 0). */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    if (this._worldBoundingSphere[3] > 0)
    {
      vec4.copy(out, this._worldBoundingSphere);
      return true;
    }
    return false;
  }

  /** Carbon EveChildMesh::HasTransparentBatches (cpp:629-637). */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    if (this.display && this.mesh)
    {
      if ((this.mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT)?.length ?? 0) > 0) return true;
      for (const overlay of this.overlayEffects)
      {
        if (overlay.HasTransparentArea()) return true;
      }
      for (const overlay of this._parentOverlayEffects ?? [])
      {
        if (overlay.HasTransparentArea()) return true;
      }
    }
    return false;
  }

  /** Carbon EveChildMesh::IsVisible (cpp:639-650): sphere-in-frustum plus the
   * estimated pixel size against the context visibility threshold. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Frustum and threshold arrive via the duck-typed update context instead of renderer state.")
  IsVisible(updateContext)
  {
    if (this._worldBoundingSphere[3] > 0)
    {
      const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
      if (frustum?.IsSphereVisible(this._worldBoundingSphere) !== false)
      {
        const method = frustum?.GetPixelSizeAccrossEst ?? frustum?.GetPixelSizeAccross;
        const size = Number(typeof method === "function" ? method.call(frustum, this._worldBoundingSphere) : 0) || 0;
        const threshold = Number(updateContext?.GetVisibilityThreshold?.() ?? updateContext?.visibilityThreshold) || 0;
        return size >= threshold;
      }
    }
    return false;
  }

  /** Carbon EveChildMesh::GetBatches (cpp:652-670): the mesh delegates per
   * batch type and activated attachments recurse, at
   * min(currentInstanceScreenSize, currentScreenSize) and with a reverse-winding
   * flag from Determinant(m_worldTransform) < 0 - a negative determinant means
   * the transform mirrors, which flips triangle facing. A determinant is
   * transpose-invariant, so the row-vector/column-vector difference does not
   * apply to this test. Returns whether any batch was committed (JS addition;
   * Carbon returns void). */
  @meta.blue.method
  @meta.implemented
  GetBatches(batches, batchType, perObjectData, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    if (!this.display)
    {
      return false;
    }

    let committed = false;

    if (this.mesh)
    {
      committed = this.mesh.GetBatches(
        batches,
        this.mesh.GetAreas(batchType),
        perObjectData,
        Math.min(this.currentInstanceScreenSize, this.currentScreenSize),
        mat4.determinant(this.worldTransform) < 0) === true;
    }

    if (this._activationStrength !== 0)
    {
      for (const attachment of this.attachments)
      {
        if (!attachment) continue;
        committed = attachment.GetBatches(batches, batchType, perObjectData, reason) === true || committed;
      }
    }

    committed = this.GetBatchesFromOverlayVector(batches, perObjectData, batchType) || committed;

    return committed;
  }

  /** Emits damage, child-owned, then inherited parent overlays over this mesh. */
  @meta.blue.method
  @meta.adapted
  GetBatchesFromOverlayVector(batches, perObjectData, batchType)
  {
    const damageEffect = this.damageOverlay
      ? this.damageOverlay.GetArmorDamageShader(batchType)
      : null;
    const parentOverlays = this._parentOverlayEffects;
    if (!this.mesh || (!damageEffect && !this.overlayEffects.length && !parentOverlays?.length)) return false;

    const geometry = this.mesh.GetGeometryResource();
    if (!geometry || geometry.IsGood() === false) return false;

    if (!this._overlayAreaBlocksBuilt)
    {
      CollectOverlayAreaBlocks(this.mesh, this._overlayAreaBlocks);
      this._overlayAreaBlocksBuilt = true;
    }

    const meshIndex = this.mesh.GetMeshIndex();
    const lod = geometry.GetMeshLod(
      meshIndex, Math.min(this.currentInstanceScreenSize, this.currentScreenSize));
    let committed = false;

    if (damageEffect)
    {
      committed = EmitDamageOverlayBatches(
        batches, perObjectData, damageEffect, this._overlayAreaBlocks, geometry, meshIndex, lod) || committed;
    }
    if (this.overlayEffects.length)
    {
      committed = EmitOverlayBatches(
        batches, perObjectData, batchType, this.overlayEffects,
        this._overlayAreaBlocks, geometry, meshIndex, lod) || committed;
    }
    if (parentOverlays?.length)
    {
      committed = EmitOverlayBatches(
        batches, perObjectData, batchType, parentOverlays,
        this._overlayAreaBlocks, geometry, meshIndex, lod) || committed;
    }
    return committed;
  }

  /** Carbon EveChildMesh::GetShadowBatches (cpp:672-681): the OPAQUE areas
   * only, gated on display/mesh/hasUpdated, at the caller's shadow pixel size
   * rather than the child's own screen size. Returns whether any batch was
   * committed (JS addition; Carbon returns void). */
  @meta.blue.method
  @meta.implemented
  GetShadowBatches(batches, perObjectData, shadowPixelSize = Infinity)
  {
    if (this.display && this.mesh && this._hasUpdated)
    {
      return this.mesh.GetBatches(
        batches,
        this.mesh.GetAreas(TriBatchType.TRIBATCHTYPE_OPAQUE),
        perObjectData,
        shadowPixelSize,
        mat4.determinant(this.worldTransform) < 0) === true;
    }
    return false;
  }

  /** Carbon EveChildMesh::GetSortValue (cpp:787-792): view distance scaled by
   * sortValueScale plus sortValueOffset. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")
  GetSortValue(renderContext = null)
  {
    const viewPosition = renderContext?.GetViewPosition();
    const x = (viewPosition?.[0] ?? 0) - this.worldTransform[12];
    const y = (viewPosition?.[1] ?? 0) - this.worldTransform[13];
    const z = (viewPosition?.[2] ?? 0) - this.worldTransform[14];
    return Math.hypot(x, y, z) * this.sortValueScale + this.sortValueOffset;
  }

  /** Carbon EveChildMesh::GetShadowPerObjectData (cpp:794-797) forwards the
   * shadow pass to the same per-object record. */
  @meta.blue.method
  @meta.implemented
  GetShadowPerObjectData(accumulator = null)
  {
    return this.GetPerObjectData(accumulator);
  }

  /**
   * Carbon EveChildMesh::GetPerObjectData (cpp:877-921): resets the morph
   * counters, uploads the bone palette to the BoneTransforms ring and stamps
   * [current offset, previous offset, bone count], then hands back this
   * child's two PERSISTENT buffers.
   *
   * The palette is GetBoneTransforms' - the updater's, or the identity rest
   * pose - and is uploaded even at rest, as Carbon does, because skinned
   * shaders read it regardless. Adapted: the morph ring is not ported, so its
   * offsets keep their defaults; Carbon allocates a pooled handle where this
   * port returns the records directly.
   */
  @meta.blue.method
  @meta.adapted
  GetPerObjectData(_accumulator = null)
  {
    this._perObjectData.vs.Set("activeMorphTargetsCount", [ 0 ]);
    // Carbon seeds the baked-morph offset with UINT32_MAX, not zero.
    this._perObjectData.vs.Set("bakedMorphTargetVertexDataOffset", [ 0xffffffff ]);

    // cpp:906-910.
    const { bones, boneCount } = this.GetBoneTransforms();
    this._perObjectData.vs.SetIndex("boneOffsets", 2, [ boneCount ]);
    // Carbon uploads zero rows too, which only records the head; with no
    // bones nothing reads the offset, so it stays INVALID_OFFSET here.
    if (boneCount)
    {
      const ring = Tr2RingBuffer.GetInstance("Float4x3", 48, Tr2RenderContext_GetMainThreadRenderContext());
      this._boneOffsets.UploadTransforms(ring, bones, boneCount);
    }
    this._perObjectData.vs.SetIndex("boneOffsets", 0, [ this._boneOffsets.GetCurrentFrameOffset() ]);
    this._perObjectData.vs.SetIndex("boneOffsets", 1, [ this._boneOffsets.GetPreviousFrameOffset() ]);

    return { vs: this._perObjectData.vs, ps: this._perObjectData.ps };
  }

  /**
   * Carbon's two IsCastingShadow overloads, dispatched on the second argument:
   * a position vector (length >= 3) selects the sphere-overlap overload
   * (cpp:338-364); anything else is the shadow-frustum overload (cpp:295-336),
   * whose Carbon out-param float& sizeInShadow becomes the optional trailing
   * length-1 array (out-params last).
   * @param {Object} cameraFrustum
   * @param {Object|Float32Array} shadowFrustumOrPosition
   * @param {Number} renderReasonOrRadius
   * @param {Array|Number} sizeInShadowOutOrRenderReason
   * @returns {Boolean}
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Overload dispatch by argument shape and a length-1 out array replace C++ overloading and the float& out-param; the shadow math is ported.")
  IsCastingShadow(cameraFrustum, shadowFrustumOrPosition, renderReasonOrRadius, sizeInShadowOutOrRenderReason = null)
  {
    if (!this.display || !this.castShadow || !this._hasUpdated)
    {
      return false;
    }

    const positionOverload = typeof shadowFrustumOrPosition?.length === "number" &&
      shadowFrustumOrPosition.length >= 3;
    const renderReason = positionOverload
      ? Number(sizeInShadowOutOrRenderReason ?? Tr2RenderReason.TR2RENDERREASON_NORMAL)
      : Number(renderReasonOrRadius ?? Tr2RenderReason.TR2RENDERREASON_NORMAL);

    if (renderReason === Tr2RenderReason.TR2RENDERREASON_REFLECTION &&
      !ShouldReflect(this.reflectionMode))
    {
      return false;
    }

    if (positionOverload)
    {
      // Carbon (cpp:338-364): squared distance between the world sphere and
      // the query sphere against their combined radius.
      if (!this.GetBoundingSphere(SHADOW_SPHERE_SCRATCH))
      {
        return false;
      }
      const position = shadowFrustumOrPosition;
      const radius = Number(renderReasonOrRadius) || 0;
      const dx = SHADOW_SPHERE_SCRATCH[0] - position[0];
      const dy = SHADOW_SPHERE_SCRATCH[1] - position[1];
      const dz = SHADOW_SPHERE_SCRATCH[2] - position[2];
      const combined = radius + SHADOW_SPHERE_SCRATCH[3];
      return dx * dx + dy * dy + dz * dz - combined * combined < 0;
    }

    // Carbon (cpp:295-336): shadow-frustum visibility, then the size in the
    // shadow map from the instance sphere nearest the shadow eye (falling back
    // to the whole world sphere).
    const shadowFrustum = shadowFrustumOrPosition;
    const sizeOut = sizeInShadowOutOrRenderReason;
    if (sizeOut)
    {
      sizeOut[0] = 0;
    }

    if (this._worldBoundingSphere[3] <= 0)
    {
      return false;
    }

    let sizeInShadow = 0;
    if (shadowFrustum?.IsVisible?.(cameraFrustum, this._worldBoundingSphere))
    {
      let sphere = this._worldBoundingSphere;
      if (typeof this.mesh?.GetInstanceBoundsClosestToPoint === "function")
      {
        // Carbon: TransformCoord(shadowFrustum.GetEyePos(), Inverse(
        // m_worldTransform)) - single-matrix point transform (no composition).
        if (!mat4.invert(INVERSE_WORLD_SCRATCH, this.worldTransform))
        {
          mat4.identity(INVERSE_WORLD_SCRATCH);
        }
        const eyePos = shadowFrustum?.GetEyePos?.() ?? ZERO_VEC3;
        vec3.transformMat4(LOCAL_VIEW_SCRATCH, eyePos, INVERSE_WORLD_SCRATCH);
        const instanceBounds = this.mesh.GetInstanceBoundsClosestToPoint(LOCAL_VIEW_SCRATCH);
        if (instanceBounds)
        {
          // Carbon: instanceBounds.Transform(m_worldTransform) - single-matrix
          // sphere transform.
          sph3.set(
            INSTANCE_SPHERE_SCRATCH,
            instanceBounds.center[0],
            instanceBounds.center[1],
            instanceBounds.center[2],
            instanceBounds.radius
          );
          sph3.transformMat4(INSTANCE_SPHERE_SCRATCH, INSTANCE_SPHERE_SCRATCH, this.worldTransform);
          sphere = INSTANCE_SPHERE_SCRATCH;
        }
      }
      sizeInShadow = Number(shadowFrustum?.GetSizeInShadow?.(sphere)) || 0;
    }

    if (sizeOut)
    {
      sizeOut[0] = sizeInShadow;
    }
    return sizeInShadow > 5;
  }

  /** Carbon EveChildMesh::ChangeLOD (cpp:1052-1054) is an intentional no-op. */
  @meta.blue.method
  @meta.implemented
  ChangeLOD(_lod)
  {
  }

  /** Carbon EveChildMesh::RegisterComponents (cpp:239-269): LightOwner when
   * lights are authored; ReflectionRenderable (ShouldReflect) and ShadowCaster
   * (castShadow) only when a mesh is present; then forwards the attachments.
   * Gate m_display. "MeshMorph" stays OUT-OF-BAND: Carbon registers it at
   * baked-morph need inside BakeMorphs (cpp:1404-1409), not here - the JS
   * BakeMorphs stub is the site that would register it when the GPU morph
   * bake is ported. */
  @meta.blue.method
  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      if (this.lights.length)
      {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }

      if (this.mesh !== null)
      {
        if (ShouldReflect(this.reflectionMode))
        {
          registry.RegisterComponent(EveComponentType.ReflectionRenderable, this);
        }
        if (this.castShadow)
        {
          registry.RegisterComponent(EveComponentType.ShadowCaster, this);
        }
      }

      for (const attachment of this.attachments)
      {
        attachment?.Register(registry);
      }
    }
  }

  /** Carbon EveChildMesh::UnRegisterComponents (cpp:275-290): forwards the
   * attachments only (own components were already removed by
   * EveEntity::UnRegister, EveEntity.cpp:90); no display re-check.
   * UnregisterAudioGeometry (cpp:277) is audio-engine-owned and unported. */
  @meta.blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const attachment of this.attachments)
      {
        attachment?.UnRegister(registry);
      }
    }
  }

  /** Carbon EveChildMesh::GetLights (cpp:1638-1652): BOTH gates (empty
   * lights and display, cpp:1640 - unlike EveSpaceObject2's display-only),
   * then per light AddLight(manager, worldTransform, 1, bones, boneCount)
   * FOLLOWED by SetBrightnessMultiplier(m_activationStrength) - the
   * one-frame-lag order is contract (the submission uses the multiplier
   * stamped on the previous pass; the first pass uses the Tr2Light default
   * 1). */
  @meta.blue.method
  @meta.implemented
  GetLights(lightManager)
  {
    if (!this.lights.length || !this.display)
    {
      return;
    }

    // cpp:1645 - bones so a bone-parented light is placed by its bone.
    const { bones, boneCount } = this.GetBoneTransforms();

    for (const light of this.lights)
    {
      light?.AddLight(lightManager, this.worldTransform, 1, bones, boneCount);
      light?.SetBrightnessMultiplier?.(this._activationStrength);
    }
  }

  /** Carbon EveChildMesh::GetID returns GetRawRoot(), i.e. this object. */
  @meta.blue.method
  @meta.implemented
  GetID(_area = 0)
  {
    return this;
  }

  /**
   * Carbon OnModified (EveChildMesh.cpp:197-216): three independent tests, not
   * a chain - a mesh change satisfies the first two, and the third only runs
   * for a child that owns locator sets.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("JS identifies Carbon's changed member address by its exposed property name; the instanced-mesh cast is performed where that interface is used.")
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "reflectionMode") || IsMatch(propertyName, "display")
      || IsMatch(propertyName, "mesh") || IsMatch(propertyName, "castShadow"))
    {
      this.ReRegister();
    }
    if (IsMatch(propertyName, "mesh") || IsMatch(propertyName, "animationUpdater"))
    {
      this.InitializeAnimation();
    }
    if (this.ownedLocatorSets.length && (IsMatch(propertyName, "scaling")
      || IsMatch(propertyName, "rotation") || IsMatch(propertyName, "translation")
      || IsMatch(propertyName, "localTransform")))
    {
      this.InvalidateOwnerMergedLocators("partMoved");
    }
    return true;
  }

  /**
   * Carbon InvalidateOwnerMergedLocators (EveChildMesh.cpp:1330-1336): tell the
   * owner its merged locator sets are stale, and why.
   */
  @meta.blue.method
  @meta.implemented
  InvalidateOwnerMergedLocators(reason = "structure")
  {
    this.GetOwner()?.InvalidateMergedLocators(reason);
  }

  /** Invalidates merged locators on both the old and new owner. */
  @meta.blue.method
  @meta.implemented
  SetOwner(owner)
  {
    if (this.GetOwner() === owner) return;
    // Carbon cpp:1894-1896: the same helper on both sides of the move.
    this.InvalidateOwnerMergedLocators("structure");
    super.SetOwner(owner);
    this.InvalidateOwnerMergedLocators("structure");
  }

  /** Contributes child-owned locator sets with the child-to-object transform. */
  @meta.blue.method
  @meta.adapted
  CollectOwnedLocatorSets(parentTransform, out)
  {
    if (!this.ownedLocatorSets.length) return;
    const local = this.RebuildLocalTransform();
    const childToObject = mat4.create();
    mat4.multiply(childToObject, parentTransform, local);
    for (const sets of this.ownedLocatorSets)
    {
      out.push({ childToObject: mat4.clone(childToObject), owner: this, partTag: this.GetPartTag(), sets });
    }
  }

  /**
   * Contributes this child's geometry to the owner's merged raycast set
   * (Carbon EveChildMesh.cpp:2061-2077): one record per mesh, its areas
   * appended to the shared pool by batch type.
   */
  @meta.blue.method
  @meta.implemented
  CollectOwnedGeometry(type, parentTransform, out, areaPool)
  {
    const geometry = this.mesh ? this.mesh.GetGeometryResource() : null;
    if (!geometry) return;
    const local = this.RebuildLocalTransform();
    const childToObject = mat4.create();
    mat4.multiply(childToObject, parentTransform, local);
    const areaStart = areaPool.length;
    EveCollectAreas(type, this.mesh, areaPool);
    out.push({ geometry, childToObject, areaStart, areaCount: areaPool.length - areaStart });
  }

  /** Replaces the locator sets owned by this child and invalidates the owner. */
  @meta.blue.method
  @meta.adapted
  SetOwnedLocatorSets(sets)
  {
    this.ownedLocatorSets = Array.from(sets ?? []);
    const owner = this.GetOwner();
    if (owner) owner.InvalidateMergedLocators("structure");
  }

  /**
   * Returns this child mesh's armour and hull damage overlay; a child mesh is
   * one part, so the tag is ignored (Carbon EveChildMesh.cpp:2098-2101).
   */
  @meta.blue.method
  @meta.implemented
  GetPartDamageOverlay(_partTag)
  {
    return this.damageOverlay;
  }

  /** Creates this child mesh's damage overlay when it does not yet exist (Carbon cpp:2103-2109). */
  @meta.blue.method
  @meta.implemented
  CreatePartDamageOverlay(_partTag)
  {
    this.damageOverlay ??= new EveDamageOverlay();
  }

  /** Sets the per-part armour damage shader stamped by SOF placement creation. */
  @meta.blue.method
  @meta.implemented
  SetArmorDamageShaderEffect(effect)
  {
    this.armorDamageShader = effect ?? null;
  }

  /** Returns the per-part armour damage shader, or null when the part has none (Carbon cpp:2116-2119). */
  @meta.blue.method
  @meta.implemented
  GetPartArmorDamageShaderEffect(_partTag)
  {
    return this.armorDamageShader;
  }

  /**
   * Returns the locator list of this child's own damage set, or null when the
   * child owns no damage locators (Carbon EveChildMesh.cpp:2121-2131).
   */
  @meta.blue.method
  @meta.implemented
  GetOwnedDamageLocators()
  {
    for (const set of this.ownedLocatorSets)
    {
      if (set.HasName("damage")) return set.GetLocators();
    }
    return null;
  }

  /**
   * Resolves one damage locator's BIND-pose position in the child's local
   * space - no bone transform, the stable overlay seed position (Carbon
   * EveChildMesh.cpp:2133-2143).
   */
  @meta.blue.method
  @meta.implemented
  GetDamageLocatorBindPositionLocal(index, out = vec3.create())
  {
    const locators = this.GetOwnedDamageLocators();
    const locatorIndex = Number(index) | 0;
    if (!locators || locatorIndex < 0 || locatorIndex >= locators.length) return false;
    vec3.copy(out, locators[locatorIndex].position);
    return true;
  }

  /**
   * Resolves one damage locator's animated position and direction in the
   * child's local space, posed by this child's own animation updater (Carbon
   * EveChildMesh.cpp:2145-2155; the part tag is ignored).
   */
  @meta.blue.method
  @meta.implemented
  GetPartDamageLocatorAnimatedLocal(_partTag, index, outPosition, outDirection)
  {
    const locators = this.GetOwnedDamageLocators();
    const locatorIndex = Number(index) | 0;
    if (!locators || locatorIndex < 0 || locatorIndex >= locators.length) return false;
    EveGetLocatorPose(outPosition, outDirection, this.animationUpdater, locators[locatorIndex]);
    return true;
  }

  /**
   * Carbon EveChildMesh::GetPickingBatches (cpp:862-889): collects the geometry
   * a pick pass should test, by mask. Unlike the hull's version this one has no
   * overlay effects to pull in.
   *
   * @param {Object} batches - the picking accumulator
   * @param {Number} pickTypes - a Tr2PickType mask
   * @param {Object} perObjectData - this child's per-object record
   */
  @meta.blue.method
  @meta.implemented
  GetPickingBatches(batches, pickTypes = TR2_PICK_TYPE_DEFAULT, perObjectData = null)
  {
    if (pickTypes & Tr2PickType.PICK_TYPE_PICKING)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_PICKING, perObjectData);
    }

    if (pickTypes & Tr2PickType.PICK_TYPE_OPAQUE)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData);
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_DECAL, perObjectData);
    }

    if (pickTypes & Tr2PickType.PICK_TYPE_TRANSPARENT)
    {
      // A hidden mesh suppresses the transparent pass only; Carbon returns
      // early here, after the collections above have already run.
      if (!this.mesh || this.mesh.display === false)
      {
        return true;
      }

      for (const batchType of [ TriBatchType.TRIBATCHTYPE_TRANSPARENT, TriBatchType.TRIBATCHTYPE_ADDITIVE ])
      {
        const areas = this.mesh.GetAreas(batchType);

        if (areas)
        {
          this.mesh.GetBatches?.(batches, areas, perObjectData);
        }
      }
    }

    return true;
  }

  /**
   * Binds the animation updater to this mesh's geometry, so a child with no
   * animation resource of its own animates from the mesh's own bone binding.
   *
   * Carbon `EveChildMesh::InitializeAnimation` (cpp:217-232). Only runs when
   * the updater has no authored resPath - one that does keeps its own
   * resource. When the mesh has no geometry yet the shared binding is cleared
   * rather than left stale, so a later mesh swap rebinds cleanly.
   */
  @meta.blue.method
  @meta.implemented
  InitializeAnimation()
  {
    const updater = this.animationUpdater;

    if (!updater || updater.resPath_)
    {
      return;
    }

    const geometry = this.mesh ? this.mesh.GetGeometryResource() : null;

    if (geometry)
    {
      updater.SetUseMeshBinding(true);
      updater.SetSharedGeometryRes(geometry);
      return;
    }

    updater.SetSharedGeometryRes(null);
  }

  /** Carbon BakeMorphs runs the merge-morphs GPU compute pass; GPU-owned. */
  @meta.blue.method
  @meta.notImplemented
  BakeMorphs(..._args)
  {
    throw new Error("EveChildMesh.BakeMorphs is not implemented in CarbonEngineJS.");
  }

  /** Carbon UnbakeMorphs releases the baked-morph GPU allocation; GPU-owned. */
  @meta.blue.method
  @meta.notImplemented
  UnbakeMorphs(..._args)
  {
    throw new Error("EveChildMesh.UnbakeMorphs is not implemented in CarbonEngineJS.");
  }

  /** Carbon IsMeshBaked reads the baked-morph GPU allocation state; GPU-owned. */
  @meta.blue.method
  @meta.notImplemented
  IsMeshBaked(..._args)
  {
    throw new Error("EveChildMesh.IsMeshBaked is not implemented in CarbonEngineJS.");
  }

  // Carbon s_instanceScreenSizeThreshold (EveChildMesh.cpp:22).
  static _instanceScreenSizeThreshold = 1;

  static Origin = Origin;

  static ReflectionMode = ReflectionMode;

  static Tr2Lod = Tr2Lod;

}

function ReadNamedMorph(values, name)
{
  if (values instanceof Map)
  {
    return values.has(name) ? values.get(name) : undefined;
  }

  if (values && typeof values === "object" && Object.hasOwn(values, name))
  {
    return values[name];
  }

  return undefined;
}

function ReadMorphWeight(value, name, source)
{
  const weight = Number(value && typeof value === "object" ? value.weight : value);

  if (!Number.isFinite(weight))
  {
    throw new TypeError(`EveChildMesh ${source} morph target "${name}" weight must be finite`);
  }

  return weight;
}

function NormalizeMorphFilter(value)
{
  if (typeof value === "string")
  {
    const normalized = value.toLowerCase();
    if (normalized === "runtime" || normalized === "runtime_evaluated") return 0;
    if (normalized === "baked") return 1;
    if (normalized === "all") return 2;
  }

  const filter = Number(value);
  if (filter === 0 || filter === 1 || filter === 2) return filter;
  throw new TypeError(`Unsupported EveChildMesh morph target filter "${value}"`);
}

// EveChildMesh_Blue.cpp: native exposure; unported contracts: IEveSpaceObjectDecalOwner, ITr2GrannyAnimationOwner, IEveSpaceObjectAttachmentOwner, ITr2LightOwner, ITr2Pickable, IEveShadowCaster.
meta.blue.interfaceTable({ interfaces: [EveChildMesh, EveEntity, EveSpaceObjectChild, IEveSpaceObjectChild, ITr2Renderable, IInitialize, INotify], chainTo: null })(EveChildMesh, { kind: "class" });
