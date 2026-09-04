// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildMesh.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildMesh.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildMesh_Blue.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { getBoneList } from "../../core/animation/Tr2GrannyAnimation.js";
import { vec4 } from "#math/vec4";
import { carbon, impl, io, type } from "#schema";
import { ReflectionMode, TriBatchType } from "#consts/graphics";
import { EveChildTransform, applyTransformModifiers } from "./EveChildTransform.js";
import { Origin } from "../../generated/eve/child/enums.js";
import { EveComponentType, ShouldReflect } from "../EveComponentTypes.js";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { Tr2Lod } from "../EveLODHelper.js";
import { Tr2PerObjectData } from "../../core/rawData/Tr2PerObjectData.js";
import { TR2_PICK_TYPE_DEFAULT, Tr2PickType } from "../../core/view/Tr2PickType.js";
import {
  createChildPerObjectRecords,
  inheritParentPerObjectData,
  stampChildTransforms
} from "../perObjectData/childPerObjectRecords.js";
import { Float4x3 } from "../../utilities/Float4x3.js";
import { EveGetLocatorPose } from "../locator/EveLocatorSets.js";
import { EveDamageOverlay } from "../overlays/EveDamageOverlay.js";
import {
  CollectOverlayAreaBlocks,
  EmitDamageOverlayBatches,
  EmitOverlayBatches
} from "../overlays/overlayBatches.js";
import { withITr2Renderable } from "../../core/ITr2Renderable.js";

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
const NO_BONE_TRANSFORMS = Object.freeze({ bones: null, boneCount: 0 });


/**
 * Space-object child that draws one mesh under its own transform, owning its
 * decals, lights, attachments, morph weights, world bounds and screen-size LOD
 * state.
 */
@type.define({ className: "EveChildMesh", family: "eve/child" })
export class EveChildMesh extends withITr2Renderable(EveChildTransform)
{
  #isMorphsBaked = false;

  #morphAnimationBuffer = [];

  #morphAnimationOffsets = {
    runtimeEvaluatedOffset: 0,
    runtimeEvaluatedCount: 0,
    bakedOffset: 0,
    bakedCount: 0,
    allCount: 0
  };

  // Carbon m_isVisible/m_instancesVisible/m_hasUpdated/m_activationStrength:
  // runtime-only frame state (never persisted; Carbon keeps them out of the
  // Blue surface too).
  #isVisible = false;

  #instancesVisible = false;

  #hasUpdated = false;

  #activationStrength = 1;

  /** m_vsData / m_psData - this child's PERSISTENT per-object record pair. */
  #perObjectData = createChildPerObjectRecords();

  /** Carbon's local `lastWorldTransform` (cpp:912), kept across frames here. */
  #lastWorldTransform = mat4.create();

  // Carbon m_worldBoundingBox/m_worldBoundingSphere: world-space bounds
  // refreshed by UpdateAsyncronous; the sphere is invalid while radius <= 0.
  #worldBoundsMin = vec3.create();

  #worldBoundsMax = vec3.create();

  #worldBoundsValid = false;

  #worldBoundingSphere = vec4.create();

  /** Identity rest-pose palette for skinned shaders without live animation. */
  #restPoseBoneTransforms = null;

  #parentOverlayEffects = null;

  #overlayAreaBlocks = [ [], [] ];

  #overlayAreaBlocksBuilt = false;

  // Carbon sets these two programmatically from SOF (EveSOF.cpp:3971-3972);
  // CarbonEngineJS delivers built objects as documents, so both persist.
  @io.persist
  @type.list("EveLocatorSets")
  ownedLocatorSets = [];

  @io.persist
  @type.objectRef("Tr2Effect")
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
    this.#isVisible = false;
    this.currentScreenSize = -1;
    this.#instancesVisible = false;
    this.currentInstanceScreenSize = -1;
  }

  /** Carbon-derived classes read m_activationStrength after the mesh update. */
  _GetActivationStrength()
  {
    return this.#activationStrength;
  }

  @io.notify
  @io.persist
  @type.int32
  @type.enum("ReflectionMode")
  reflectionMode = 3;

  @io.persist
  @type.list("IEveChildTransformModifier")
  transformModifiers = [];

  @io.read
  @type.mat4
  worldTransform = mat4.create();

  @io.notify
  @io.persist
  @type.boolean
  display = true;

  @io.persist
  @type.boolean
  inheritOverlayEffects = true;

  @io.persist
  @type.list("EveMeshOverlayEffect")
  overlayEffects = [];

  @io.persist
  @type.objectRef("EveDamageOverlay")
  damageOverlay = null;

  @io.notify
  @io.persist
  @type.boolean
  castShadow = false;

  @io.notify
  @io.persist
  @type.objectRef("Tr2MeshBase")
  mesh = null;

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.quat
  rotation = quat.create();

  @io.persist
  @type.vec3
  translation = vec3.create();

  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @io.persist
  @type.mat4
  localTransform = mat4.create();

  @io.persist
  @type.list("EveSpaceObjectDecal")
  decals = [];

  @io.persist
  @type.boolean
  staticTransform = false;

  @io.notify
  @io.persist
  @type.objectRef("Tr2GrannyAnimation")
  animationUpdater = null;

  @io.persist
  @type.list("IEveSpaceObjectAttachment")
  attachments = [];

  @io.persist
  @type.list("Tr2Light")
  lights = [];

  @io.persist
  @type.int32
  @type.enum("Tr2Lod")
  lowestLodVisible = 0;

  @io.persist
  @type.float32
  minScreenSize = 0;

  @io.persist
  @type.float32
  sortValueOffset = 0;

  @io.persist
  @type.float32
  sortValueScale = 1;

  @io.read
  @type.float32
  currentScreenSize = -1;

  @io.read
  @type.float32
  currentInstanceScreenSize = -1;

  @io.persist
  @type.boolean
  useSRT = true;

  @io.persist
  @type.boolean
  updateAnimation = true;

  // SOF-authored placement/instance values; persisted so the values
  // interchange reproduces Carbon's hidden child placement state.
  @io.persist
  @type.int32
  @type.enum("Origin")
  origin = 0;

  @io.rebuild("instanceBuffer")
  @io.persist
  @type.array("mat4")
  instanceTransforms = [];

  @io.persist
  @type.string
  sofDna = "";

  @io.persist
  @type.string
  sofParentHullName = "";

  @io.persist
  @type.string
  sofLocatorSetName = "";

  @io.persist
  @type.string
  sofLocatorIndex = "";

  /**
   * Rebuilds the local transform up front when the child is marked
   * staticTransform, since UpdateTransform will not rebuild it on later frames.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    if (this.staticTransform)
    {
      this.RebuildLocalTransform();
    }

    // cpp:84 - bind the updater to this mesh's geometry.
    this.InitializeAnimation();

    return true;
  }

  /**
   * Applies the authored scale/rotation/translation and, when supplied, the
   * lowest LOD level at which the child stays visible; returns the rebuilt local
   * transform.
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
  GetInstanceTransforms()
  {
    return this.instanceTransforms;
  }

  /**
   * Assigns the Tr2MeshBase this child draws; a nullish value clears it, which
   * also makes the child permanently invisible (UpdateVisibility requires a
   * mesh).
   */
  @carbon.method
  @impl.implemented
  SetMesh(mesh)
  {
    this.mesh = mesh ?? null;
    this.#overlayAreaBlocksBuilt = false;
    this.#restPoseBoneTransforms = null;
  }

  /** Appends an overlay owned by this child; inherited hull overlays render after it. */
  @carbon.method
  @impl.implemented
  AddOverlayEffect(effect)
  {
    if (!effect) throw new TypeError("EveChildMesh overlay effect must not be null");
    this.overlayEffects.push(effect);
  }

  /** Removes the first matching owned overlay. */
  @carbon.method
  @impl.implemented
  RemoveOverlayEffect(effect)
  {
    const index = this.overlayEffects.indexOf(effect);
    if (index !== -1) this.overlayEffects.splice(index, 1);
  }

  /** Returns the first owned overlay whose authored name matches. */
  @carbon.method
  @impl.implemented
  GetOverlayEffectByName(name)
  {
    return this.overlayEffects.find(effect => effect.name === String(name)) ?? null;
  }

  /**
   * Records whether this child's placement was authored in space or by SOF (the
   * Origin enum).
   */
  @carbon.method
  @impl.implemented
  SetOrigin(origin)
  {
    this.origin = Number(origin) | 0;
  }

  /**
   * Copies the given scale into the child's SRT scaling; it reaches the world
   * transform on the next local-transform rebuild.
   */
  @carbon.method
  @impl.implemented
  SetScale(scale)
  {
    vec3.copy(this.scaling, scale);
  }

  /**
   * Sets the reflection mode, which decides whether the child registers as a
   * ReflectionRenderable and whether it casts shadows during reflection passes.
   */
  @carbon.method
  @impl.implemented
  SetReflectionMode(mode)
  {
    this.reflectionMode = Number(mode) | 0;
  }

  /**
   * Sets whether the child registers as a shadow caster and contributes opaque
   * shadow batches.
   */
  @carbon.method
  @impl.implemented
  SetCastShadow(castShadow)
  {
    this.castShadow = !!castShadow;
  }

  /**
   * Sets the minimum screen size, in pixels across, that the child's world
   * bounding sphere must reach - after the frame's inverse LOD factor scaling -
   * before UpdateVisibility marks it visible.
   */
  @carbon.method
  @impl.implemented
  SetMinScreenSize(minScreenSize)
  {
    this.minScreenSize = Number(minScreenSize);
  }

  /** Carbon EveChildMesh::GetLocalToWorldTransform (cpp:1047-1050); the
   * optional out follows the EveChildInstancedMeshes copy-out shape. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the authored child name, coercing nullish to the empty string. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Appends a transform modifier; modifiers fold over the child's world
   * transform in insertion order on each async update.
   */
  @carbon.method
  @impl.implemented
  AddTransformModifier(modifier)
  {
    this.transformModifiers.push(modifier);
  }

  /**
   * Appends a decal; decals refresh their visibility only while the child itself
   * is visible, and ride along in GetRenderables when the mesh has a geometry
   * resource.
   */
  @carbon.method
  @impl.implemented
  AddDecal(decal)
  {
    this.decals.push(decal);
  }

  /**
   * Appends an attachment; attachments refresh their lights and visibility every
   * frame regardless of the child's own visibility.
   */
  @carbon.method
  @impl.implemented
  AddAttachment(attachment)
  {
    this.attachments.push(attachment);
  }

  /**
   * Drops every attachment, removing their lights, batches and visibility
   * updates from this child.
   */
  @carbon.method
  @impl.implemented
  ClearAttachments()
  {
    this.attachments.length = 0;
  }

  /**
   * Appends a light, submitted to the light manager from the child's world
   * transform while the child displays.
   */
  @carbon.method
  @impl.implemented
  AddLight(light)
  {
    this.lights.push(light);
  }

  /**
   * Drops every light, which also stops the child registering as a LightOwner on
   * the next component registration.
   */
  @carbon.method
  @impl.implemented
  ClearLights()
  {
    this.lights.length = 0;
  }

  /** Returns true unconditionally - a child mesh reports itself as always on. */
  @carbon.method
  @impl.implemented
  IsAlwaysOn()
  {
    return true;
  }

  /** Forwards a shader option to the mesh, every decal and every attachment. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
  GetMorphTargetNames()
  {
    return this.mesh?.GetMorphTargetNames?.() ?? [];
  }

  /**
   * Writes a named morph weight on the mesh; it only reaches the render path
   * after the next UpdateMorphAnimationBuffer pass re-sorts the indexed buffer.
   */
  @carbon.method
  @impl.adapted
  SetMorphTargetWeight(name, weight)
  {
    this.mesh?.SetMorphTargetWeight?.(name, weight);
  }

  /**
   * Reads a named morph weight straight from the mesh (0 when it has no such
   * target), bypassing any animation-driven value the morph buffer may have
   * applied.
   */
  @carbon.method
  @impl.adapted
  GetMorphTargetWeight(name)
  {
    return this.mesh?.GetMorphTargetWeight?.(name) ?? 0;
  }

  /** Rebuilds the source-backed indexed morph buffer from manual and animation weights. */
  @impl.adapted
  UpdateMorphAnimationBuffer()
  {
    const names = this.mesh?.GetMorphTargetNames?.();

    this.#morphAnimationOffsets = {
      runtimeEvaluatedOffset: 0,
      runtimeEvaluatedCount: 0,
      bakedOffset: 0,
      bakedCount: 0,
      allCount: 0
    };

    if (!Array.isArray(names))
    {
      this.#morphAnimationBuffer = [];
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

    this.#morphAnimationBuffer = [ ...runtime, ...baked, ...inactive ];
    this.#morphAnimationOffsets.runtimeEvaluatedCount = runtime.length;
    this.#morphAnimationOffsets.bakedOffset = runtime.length;
    this.#morphAnimationOffsets.bakedCount = baked.length;
    this.#morphAnimationOffsets.allCount = runtime.length + baked.length;
    return this.#morphAnimationOffsets.allCount;
  }

  /** Returns detached active indexed morph records for the native filter. */
  @impl.adapted
  GetMorphTargets(filter = 2)
  {
    const normalized = NormalizeMorphFilter(filter);
    let offset = 0;
    let count = 0;

    if (normalized === 2)
    {
      count = this.#morphAnimationOffsets.allCount;
    }
    else if (normalized === 0)
    {
      offset = this.#isMorphsBaked
        ? this.#morphAnimationOffsets.runtimeEvaluatedOffset
        : 0;
      count = this.#isMorphsBaked
        ? this.#morphAnimationOffsets.runtimeEvaluatedCount
        : this.#morphAnimationOffsets.allCount;
    }
    else
    {
      offset = this.#morphAnimationOffsets.bakedOffset;
      count = this.#morphAnimationOffsets.bakedCount;
    }

    return this.#morphAnimationBuffer.slice(offset, offset + count)
      .map(value => ({ index: value.index, weight: value.weight }));
  }

  /**
   * Always returns null: a child mesh exposes no packed area-id lookup, since
   * its SOF identity lives directly on its
   * sofParentHullName/sofLocatorSetName/sofLocatorIndex fields.
   */
  @carbon.method
  @impl.adapted
  GetSofSourceLocator()
  {
    return null;
  }

  /**
   * Sync-side frame update (Carbon EveChildMesh::UpdateSyncronous,
   * cpp:1002-1045). Carbon's body is entirely audio-geometry registration
   * (cpp:1004-1010, 1044 - engine/audio-owned, omitted) plus animationUpdater
   * re-binding and PrePhysicsAnimation stepping (cpp:1011-1042 - skipped: the
   * JS animation seam is absent, there is no Tr2GrannyAnimation runtime), so
   * the port is a documented frame-contract no-op.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Audio-geometry registration is engine-owned and the animationUpdater branches await the JS animation seam; nothing else remains in Carbon's body.")
  UpdateSyncronous(updateContext, _params)
  {
    if (this.damageOverlay) this.damageOverlay.UpdateSyncronous(updateContext);

    const time = updateContext.GetTime();
    for (const overlay of this.overlayEffects) overlay.Update(time, time);
  }

  /**
   * Per-frame async update (Carbon EveChildMesh::UpdateAsyncronous,
   * cpp:903-1000): rebuild the world transform from the parent, fold the
   * transform modifiers over it, store the activation strength, refresh the
   * attachment lights, the morph buffer, and the world bounds. The GPU ring
   * buffer advance/per-object-data invalidation (cpp:905-909), audio geometry
   * (cpp:920-930), parent VS/PS struct refresh (cpp:932-960), and the skinned
   * GetBounds overload are not modelled, hence @impl.adapted.
   * @param {Object} updateContext - frame context (EveUpdateContext), threaded to modifiers
   * @param {EveChildUpdateParams} params - localToWorldTransform + boneCount/bones
   * @returns {Float32Array} worldTransform
   */
  @carbon.method
  @carbon.contextual(["camera"])
  @impl.adapted
  UpdateAsyncronous(updateContext, params)
  {
    const parentTransform = params?.localToWorldTransform;

    // Carbon captures the OUTGOING transform before rebuilding (cpp:912).
    mat4.copy(this.#lastWorldTransform, this.worldTransform);

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
    inheritParentPerObjectData(this.#perObjectData, parent, this.translation);
    this.#parentOverlayEffects = this.inheritOverlayEffects && Array.isArray(parent?.overlayEffects)
      ? parent.overlayEffects
      : null;
    if (parent && !this.inheritOverlayEffects)
    {
      this.#perObjectData.vs.Set("clipData", [ 0, 0, 0, 0 ]);
      this.#perObjectData.ps.Set("clipRadiusSq", [ 0 ]);
      this.#perObjectData.ps.Set("clipRadius2Sq", [ 0 ]);
      this.#perObjectData.ps.Set("clipSphereFactor", [ 0 ]);
      this.#perObjectData.ps.Set("clipSphereFactor2", [ 0 ]);
    }
    stampChildTransforms(this.#perObjectData, this.worldTransform, this.#lastWorldTransform);

    this.#activationStrength = Number(params?.activationStrength ?? 1);
    if (this.damageOverlay)
    {
      const flicker = this.damageOverlay.GetActivationStrength(updateContext);
      this.#activationStrength *= flicker;
      const shipData = this.#perObjectData.ps.Get("shipData");
      this.#perObjectData.ps.Set("shipData", [ shipData[0], parent ? shipData[1] * flicker : flicker, shipData[2], shipData[3] ]);
      this.#perObjectData.ps.Set("impactDataOffset", [ this.damageOverlay.GetDataTextureOffset() ]);
    }

    // Carbon (cpp:962-970): attachments refresh their lights from the updated
    // world transform. Bones come from GetBoneTransforms (animationUpdater) -
    // null until the JS animation seam exists.
    for (const attachment of this.attachments)
    {
      if (!attachment) continue;
      attachment.UpdateLights(this.worldTransform, null, 0, this.#activationStrength, 0);
    }

    this.UpdateMorphAnimationBuffer();

    // Carbon (cpp:974-997): world AABB from the mesh bounds, world sphere
    // enclosing it. The skinned GetBounds overload (animation transforms +
    // morph targets, cpp:977-982) awaits the animation seam; the maintained
    // Tr2MeshBase GetBounds supplies the static/material bounds meanwhile.
    this.#worldBoundsValid = false;
    const bounds = this.mesh ? this.mesh.GetBounds() : null;

    if (bounds?.min && bounds?.max)
    {
      this.#worldBoundsMin[0] = this.#worldBoundsMin[1] = this.#worldBoundsMin[2] = Infinity;
      this.#worldBoundsMax[0] = this.#worldBoundsMax[1] = this.#worldBoundsMax[2] = -Infinity;
      for (let index = 0; index < 8; index++)
      {
        vec3.set(
          BOX_CORNER_SCRATCH,
          index & 1 ? bounds.max[0] : bounds.min[0],
          index & 2 ? bounds.max[1] : bounds.min[1],
          index & 4 ? bounds.max[2] : bounds.min[2]
        );
        vec3.transformMat4(BOX_CORNER_SCRATCH, BOX_CORNER_SCRATCH, this.worldTransform);
        vec3.min(this.#worldBoundsMin, this.#worldBoundsMin, BOX_CORNER_SCRATCH);
        vec3.max(this.#worldBoundsMax, this.#worldBoundsMax, BOX_CORNER_SCRATCH);
      }
      this.#worldBoundsValid = true;
      sph3.fromBounds(this.#worldBoundingSphere, this.#worldBoundsMin, this.#worldBoundsMax);
    }
    else
    {
      sph3.set(this.#worldBoundingSphere, 0, 0, 0, 0);
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
        isInFrustum: this.#isVisible,
        // Bind pose, not animated: the overlay seeds decals at the stable
        // authored position (Carbon EveChildMesh.cpp:1130, commit 98ee5e08).
        getDamageLocatorPositionOS: (index, out) => this.GetDamageLocatorBindPositionLocal(index, out)
      }, 0, false);
    }

    this.#hasUpdated = true;
    return this.worldTransform;
  }

  /**
   * Frame visibility + LOD state (Carbon EveChildMesh::UpdateVisibility,
   * cpp:366-463): screen size via the frustum, invLodFactor scaling, the
   * minScreenSize/lowestLodVisible gates, the per-instance visibility gate,
   * and the attachment/decal visibility fan-out. Carbon recomputes the local
   * mesh bounds here (cpp:380-394) but consumes only the world sphere/box
   * computed in UpdateAsyncronous, so the dead recompute is skipped. The
   * raytracing branch (cpp:450-462) is engine-owned and omitted.
   * @param {Object} updateContext - frame context (frustum + invLodFactor ducks)
   * @param {Float32Array} _parentTransform
   * @param {Number} parentLod - parent Tr2Lod level
   * @returns {Boolean} isVisible
   */
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
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2AnimationMeshBinding remains unported; Carbon's identity rest-pose fallback is used when neither live palette source is available.")
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
  @impl.implemented
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

    if (!this.#restPoseBoneTransforms || this.#restPoseBoneTransforms.length !== boneCount * 12)
    {
      const identity = Float4x3.fromMat4(mat4.create());
      this.#restPoseBoneTransforms = new Float32Array(boneCount * 12);
      for (let index = 0; index < boneCount; index++)
      {
        this.#restPoseBoneTransforms.set(identity, index * 12);
      }
    }

    return { bones: this.#restPoseBoneTransforms, boneCount };
  }

  /**
   * Resolves this child's visibility for the frame from its world bounding
   * sphere, the parent LOD, and the authored screen-size thresholds, recording
   * the mesh and per-instance screen sizes the batch path then draws at.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Bone-fed decal bounds still await the decal seam and the raytracing refresh is engine-owned; the LOD/screen-size math and the bone-fed attachment pass are ported.")
  UpdateVisibility(updateContext, _parentTransform = null, parentLod = Tr2Lod.TR2_LOD_HIGH)
  {
    this.#isVisible = false;
    this.currentScreenSize = -1;
    this.#instancesVisible = false;
    this.currentInstanceScreenSize = -1;

    if (!this.#hasUpdated)
    {
      return false;
    }

    const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
    const invLodFactor = Number(updateContext?.GetInvLodFactor?.() ?? updateContext?.invLodFactor) || 1;

    if (this.mesh)
    {
      this.currentScreenSize = Number(frustum?.GetPixelSizeAccross?.(this.#worldBoundingSphere) ?? Infinity) || 0;

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
        const viewPos = frustum?.m_viewPos ?? frustum?.viewPos ?? frustum?.GetViewPosition?.() ?? ZERO_VEC3;
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
        this.mesh.UseWithScreenSize?.(this.currentScreenSize, this.#worldBoundingSphere[3]);
      }

      this.currentScreenSize *= invLodFactor;
      this.currentInstanceScreenSize *= invLodFactor;

      BOX_QUERY_SCRATCH.min = this.#worldBoundsMin;
      BOX_QUERY_SCRATCH.max = this.#worldBoundsMax;
      const boxVisible = this.#worldBoundsValid &&
        (frustum?.IsBoxVisible ? !!frustum.IsBoxVisible(BOX_QUERY_SCRATCH) : true);

      if (boxVisible)
      {
        this.#isVisible = parentLod >= this.lowestLodVisible && this.currentScreenSize >= this.minScreenSize;
        this.#instancesVisible = this.#isVisible &&
          this.currentInstanceScreenSize >= EveChildMesh.#instanceScreenSizeThreshold;
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

    if (this.#isVisible)
    {
      for (const decal of this.decals)
      {
        // Carbon (cpp:441-446) feeds animated bone matrices to the decal first
        // - skipped until the JS animation seam exists. Carbon passes
        // &m_parentData (per-object shading struct, GPU seam); the owning
        // child stands in as the duck-typed parent.
        decal?.UpdateVisibility?.(updateContext, this);
      }
    }

    return this.#isVisible;
  }

  /**
   * Collects this child (and its decals) as renderables (Carbon
   * EveChildMesh::GetRenderables, cpp:571-616): instanced meshes contribute
   * only while the per-instance gate passed; decals ride along through their
   * duck-typed renderable collectors (mesh cache is engine-owned, passed null
   * as in EveSpaceObject2.GetRenderables).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The decal mesh cache is engine-owned (null placeholder); collection structure is ported.")
  GetRenderables(out = [])
  {
    if (!this.#isVisible)
    {
      return out;
    }

    const instanced = typeof this.mesh?.GetInstanceBoundsClosestToPoint === "function";

    if (instanced)
    {
      if (this.#instancesVisible)
      {
        out.push(this);
        if (this.decals.length && this.mesh.GetGeometryResource?.())
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
      const geometryResource = this.mesh?.GetGeometryResource?.();
      if (this.decals.length && geometryResource)
      {
        for (const decal of this.decals)
        {
          decal?.GetRenderables?.(out, null, geometryResource, this.currentScreenSize);
        }
      }
    }

    return out;
  }

  /** Carbon EveChildMesh::GetBoundingSphere (cpp:618-627): the realized world
   * sphere, valid only after an update produced bounds (radius > 0). */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    if (this.#worldBoundingSphere[3] > 0)
    {
      vec4.copy(out, this.#worldBoundingSphere);
      return true;
    }
    return false;
  }

  /** Carbon EveChildMesh::HasTransparentBatches (cpp:629-637). */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    if (this.display && this.mesh)
    {
      if ((this.mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT)?.length ?? 0) > 0) return true;
      for (const overlay of this.overlayEffects)
      {
        if (overlay.HasTransparentArea()) return true;
      }
      for (const overlay of this.#parentOverlayEffects ?? [])
      {
        if (overlay.HasTransparentArea()) return true;
      }
    }
    return false;
  }

  /** Carbon EveChildMesh::IsVisible (cpp:639-650): sphere-in-frustum plus the
   * estimated pixel size against the context visibility threshold. */
  @carbon.method
  @impl.adapted
  @impl.reason("Frustum and threshold arrive via the duck-typed update context instead of renderer state.")
  IsVisible(updateContext)
  {
    if (this.#worldBoundingSphere[3] > 0)
    {
      const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
      if (frustum?.IsSphereVisible?.(this.#worldBoundingSphere) !== false)
      {
        const method = frustum?.GetPixelSizeAccrossEst ?? frustum?.GetPixelSizeAccross;
        const size = Number(typeof method === "function" ? method.call(frustum, this.#worldBoundingSphere) : 0) || 0;
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
  @carbon.method
  @impl.implemented
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

    if (this.#activationStrength !== 0)
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
  @carbon.method
  @impl.adapted
  GetBatchesFromOverlayVector(batches, perObjectData, batchType)
  {
    const damageEffect = this.damageOverlay
      ? this.damageOverlay.GetArmorDamageShader(batchType)
      : null;
    const parentOverlays = this.#parentOverlayEffects;
    if (!this.mesh || (!damageEffect && !this.overlayEffects.length && !parentOverlays?.length)) return false;

    const geometry = this.mesh.GetGeometryResource();
    if (!geometry || geometry.IsGood() === false) return false;

    if (!this.#overlayAreaBlocksBuilt)
    {
      CollectOverlayAreaBlocks(this.mesh, this.#overlayAreaBlocks);
      this.#overlayAreaBlocksBuilt = true;
    }

    const meshIndex = this.mesh.GetMeshIndex();
    const lod = geometry.GetMeshLod(
      meshIndex, Math.min(this.currentInstanceScreenSize, this.currentScreenSize));
    let committed = false;

    if (damageEffect)
    {
      committed = EmitDamageOverlayBatches(
        batches, perObjectData, damageEffect, this.#overlayAreaBlocks, geometry, meshIndex, lod) || committed;
    }
    if (this.overlayEffects.length)
    {
      committed = EmitOverlayBatches(
        batches, perObjectData, batchType, this.overlayEffects,
        this.#overlayAreaBlocks, geometry, meshIndex, lod) || committed;
    }
    if (parentOverlays?.length)
    {
      committed = EmitOverlayBatches(
        batches, perObjectData, batchType, parentOverlays,
        this.#overlayAreaBlocks, geometry, meshIndex, lod) || committed;
    }
    return committed;
  }

  /** Carbon EveChildMesh::GetShadowBatches (cpp:672-681): the OPAQUE areas
   * only, gated on display/mesh/hasUpdated, at the caller's shadow pixel size
   * rather than the child's own screen size. Returns whether any batch was
   * committed (JS addition; Carbon returns void). */
  @carbon.method
  @impl.implemented
  GetShadowBatches(batches, perObjectData, shadowPixelSize = Infinity)
  {
    if (this.display && this.mesh && this.#hasUpdated)
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
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")
  GetSortValue(renderContext = null)
  {
    const viewPosition = renderContext?.GetViewPosition?.();
    const x = (viewPosition?.[0] ?? 0) - this.worldTransform[12];
    const y = (viewPosition?.[1] ?? 0) - this.worldTransform[13];
    const z = (viewPosition?.[2] ?? 0) - this.worldTransform[14];
    return Math.hypot(x, y, z) * this.sortValueScale + this.sortValueOffset;
  }

  /** Carbon EveChildMesh::GetShadowPerObjectData (cpp:794-797) forwards the
   * shadow pass to the same per-object record. */
  @carbon.method
  @impl.implemented
  GetShadowPerObjectData(accumulator = null)
  {
    return this.GetPerObjectData(accumulator);
  }

  /**
   * Carbon EveChildMesh::GetPerObjectData (cpp:799-843): resets the morph
   * counters, uploads the bone and morph rings, then hands back a handle over
   * this child's two PERSISTENT buffers.
   *
   * The ring OFFSETS (`boneOffsets[0..1]`, `morphTargetAnimationDataOffset`,
   * `morphTargetVertexDataOffset`, `bakedMorphTargetVertexDataOffset`) are GPU
   * addresses with no CPU derivation, so they keep their defaults; the counts,
   * which are CPU-known, are written.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("GPU ring-buffer offsets have no CPU derivation and keep their defaults; every CPU-known field is filled.")
  GetPerObjectData(_accumulator = null)
  {
    this.#perObjectData.vs.Set("activeMorphTargetsCount", [ 0 ]);
    // Carbon seeds the baked-morph offset with UINT32_MAX, not zero.
    this.#perObjectData.vs.Set("bakedMorphTargetVertexDataOffset", [ 0xffffffff ]);

    if (this.animationUpdater && this.animationUpdater.IsInitialized())
    {
      const boneCount = this.animationUpdater.GetMeshBoneCount();
      this.#perObjectData.vs.SetIndex("boneOffsets", 2, [ boneCount ]);
    }

    return { vs: this.#perObjectData.vs, ps: this.#perObjectData.ps };
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
  @carbon.method
  @impl.adapted
  @impl.reason("Overload dispatch by argument shape and a length-1 out array replace C++ overloading and the float& out-param; the shadow math is ported.")
  IsCastingShadow(cameraFrustum, shadowFrustumOrPosition, renderReasonOrRadius, sizeInShadowOutOrRenderReason = null)
  {
    if (!this.display || !this.castShadow || !this.#hasUpdated)
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

    if (this.#worldBoundingSphere[3] <= 0)
    {
      return false;
    }

    let sizeInShadow = 0;
    if (shadowFrustum?.IsVisible?.(cameraFrustum, this.#worldBoundingSphere))
    {
      let sphere = this.#worldBoundingSphere;
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
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
        attachment?.Register?.(registry);
      }
    }
  }

  /** Carbon EveChildMesh::UnRegisterComponents (cpp:275-290): forwards the
   * attachments only (own components were already removed by
   * EveEntity::UnRegister, EveEntity.cpp:90); no display re-check.
   * UnregisterAudioGeometry (cpp:277) is audio-engine-owned and unported. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const attachment of this.attachments)
      {
        attachment?.UnRegister?.(registry);
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
  @carbon.method
  @impl.implemented
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
      light?.AddLight?.(lightManager, this.worldTransform, 1, bones, boneCount);
      light?.SetBrightnessMultiplier?.(this.#activationStrength);
    }
  }

  /** Carbon EveChildMesh::GetID returns GetRawRoot(), i.e. this object. */
  @carbon.method
  @impl.implemented
  GetID(_area = 0)
  {
    return this;
  }

  /** Invalidates merged locators on both the old and new owner. */
  @carbon.method
  @impl.implemented
  SetOwner(owner)
  {
    if (this.GetOwner() === owner) return;
    const oldOwner = this.GetOwner();
    if (oldOwner) oldOwner.InvalidateMergedLocators("structure");
    super.SetOwner(owner);
    if (owner) owner.InvalidateMergedLocators("structure");
  }

  /** Contributes child-owned locator sets with the child-to-object transform. */
  @carbon.method
  @impl.adapted
  CollectOwnedLocatorSets(parentTransform, out)
  {
    if (!this.ownedLocatorSets.length) return;
    const local = this.RebuildLocalTransform();
    const childToObject = mat4.create();
    mat4.multiply(childToObject, parentTransform, local);
    for (const sets of this.ownedLocatorSets)
    {
      out.push({ childToObject: mat4.clone(childToObject), owner: this, sets });
    }
  }

  /** Contributes this child's geometry to the owner's merged raycast set. */
  @carbon.method
  @impl.adapted
  CollectOwnedGeometry(parentTransform, out)
  {
    const geometry = this.mesh ? this.mesh.GetGeometryResource() : null;
    if (!geometry) return;
    const local = this.RebuildLocalTransform();
    const childToObject = mat4.create();
    mat4.multiply(childToObject, parentTransform, local);
    out.push({ childToObject, geometry, owner: this, mesh: this.mesh });
  }

  /** Replaces the locator sets owned by this child and invalidates the owner. */
  @carbon.method
  @impl.adapted
  SetOwnedLocatorSets(sets)
  {
    this.ownedLocatorSets = Array.from(sets ?? []);
    const owner = this.GetOwner();
    if (owner) owner.InvalidateMergedLocators("structure");
  }

  /** Returns this child mesh's armour and hull damage overlay. */
  @carbon.method
  @impl.implemented
  GetDamageOverlay()
  {
    return this.damageOverlay;
  }

  /** Creates this child mesh's damage overlay when it does not yet exist. */
  @carbon.method
  @impl.implemented
  EnsureDamageOverlay()
  {
    this.damageOverlay ??= new EveDamageOverlay();
    return this.damageOverlay;
  }

  /** Sets the per-part armour damage shader stamped by SOF placement creation. */
  @carbon.method
  @impl.implemented
  SetArmorDamageShaderEffect(effect)
  {
    this.armorDamageShader = effect ?? null;
  }

  /** Returns the per-part armour damage shader, or null when the part has none. */
  @carbon.method
  @impl.implemented
  GetArmorDamageShaderEffect()
  {
    return this.armorDamageShader;
  }

  /**
   * Returns the locator list of this child's own damage set, or null when the
   * child owns no damage locators (Carbon EveChildMesh.cpp:2117-2127).
   */
  @carbon.method
  @impl.implemented
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
   * EveChildMesh.cpp:2129-2139).
   */
  @carbon.method
  @impl.implemented
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
   * EveChildMesh.cpp:2141-2151).
   */
  @carbon.method
  @impl.implemented
  GetDamageLocatorAnimatedLocal(index, outPosition, outDirection)
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
  @carbon.method
  @impl.implemented
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
        const areas = this.mesh.GetAreas?.(batchType);

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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.notImplemented
  BakeMorphs(..._args)
  {
    throw new Error("EveChildMesh.BakeMorphs is not implemented in CarbonEngineJS.");
  }

  /** Carbon UnbakeMorphs releases the baked-morph GPU allocation; GPU-owned. */
  @carbon.method
  @impl.notImplemented
  UnbakeMorphs(..._args)
  {
    throw new Error("EveChildMesh.UnbakeMorphs is not implemented in CarbonEngineJS.");
  }

  /** Carbon IsMeshBaked reads the baked-morph GPU allocation state; GPU-owned. */
  @carbon.method
  @impl.notImplemented
  IsMeshBaked(..._args)
  {
    throw new Error("EveChildMesh.IsMeshBaked is not implemented in CarbonEngineJS.");
  }

  // Carbon s_instanceScreenSizeThreshold (EveChildMesh.cpp:22).
  static #instanceScreenSizeThreshold = 1;

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
