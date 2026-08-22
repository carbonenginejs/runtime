import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { sph3 } from '@carbonenginejs/runtime-utils/sph3';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { getBoneList } from '../../core/animation/Tr2GrannyAnimation.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriBatchType, ReflectionMode } from '@carbonenginejs/runtime-utils/graphics';
import { EveChildTransform as _EveChildTransform, applyTransformModifiers } from './EveChildTransform.js';
import { Origin } from '../../generated/eve/child/enums.js';
import { ShouldReflect, EveComponentType } from '../EveComponentTypes.js';
import { Tr2RenderReason } from '../../generated/trinityCore/enums.js';
import { Tr2Lod } from '@carbonenginejs/runtime-utils/const/trinity';
import '../../core/rawData/Tr2PerObjectData.js';
import { TR2_PICK_TYPE_DEFAULT, Tr2PickType } from '../../core/view/Tr2PickType.js';
import { createChildPerObjectRecords, inheritParentPerObjectData, stampChildTransforms } from '../perObjectData/childPerObjectRecords.js';

let _initProto, _initClass, _init_reflectionMode, _init_extra_reflectionMode, _init_transformModifiers, _init_extra_transformModifiers, _init_worldTransform, _init_extra_worldTransform, _init_display, _init_extra_display, _init_castShadow, _init_extra_castShadow, _init_mesh, _init_extra_mesh, _init_name, _init_extra_name, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_scaling, _init_extra_scaling, _init_localTransform, _init_extra_localTransform, _init_decals, _init_extra_decals, _init_staticTransform, _init_extra_staticTransform, _init_animationUpdater, _init_extra_animationUpdater, _init_attachments, _init_extra_attachments, _init_lights, _init_extra_lights, _init_lowestLodVisible, _init_extra_lowestLodVisible, _init_minScreenSize, _init_extra_minScreenSize, _init_sortValueOffset, _init_extra_sortValueOffset, _init_sortValueScale, _init_extra_sortValueScale, _init_currentScreenSize, _init_extra_currentScreenSize, _init_currentInstanceScreenSize, _init_extra_currentInstanceScreenSize, _init_useSRT, _init_extra_useSRT, _init_updateAnimation, _init_extra_updateAnimation, _init_origin, _init_extra_origin, _init_instanceTransforms, _init_extra_instanceTransforms, _init_sofDna, _init_extra_sofDna, _init_sofParentHullName, _init_extra_sofParentHullName, _init_sofLocatorSetName, _init_extra_sofLocatorSetName, _init_sofLocatorIndex, _init_extra_sofLocatorIndex;

// Module scratch for the hot per-frame visibility/shadow paths (allocation
// rules: copy-into, never allocate per call; child updates run sequentially so
// the scratch is non-reentrant by construction).
const INVERSE_WORLD_SCRATCH = mat4.create();
const LOCAL_VIEW_SCRATCH = vec3.create();
const INSTANCE_SPHERE_SCRATCH = vec4.create();
const SHADOW_SPHERE_SCRATCH = vec4.create();
const BOX_CORNER_SCRATCH = vec3.create();
const BOX_QUERY_SCRATCH = {
  min: vec3.create(),
  max: vec3.create()
};
const ZERO_VEC3 = vec3.create();

// Carbon's (nullptr, 0) bone result - frozen so callers cannot mutate it.
const NO_BONE_TRANSFORMS = Object.freeze({
  bones: null,
  boneCount: 0
});

/**
 * Space-object child that draws one mesh under its own transform, owning its
 * decals, lights, attachments, morph weights, world bounds and screen-size LOD
 * state.
 */
let _EveChildMesh;
new class extends _identity {
  static [class EveChildMesh extends _EveChildTransform {
    static {
      ({
        e: [_init_reflectionMode, _init_extra_reflectionMode, _init_transformModifiers, _init_extra_transformModifiers, _init_worldTransform, _init_extra_worldTransform, _init_display, _init_extra_display, _init_castShadow, _init_extra_castShadow, _init_mesh, _init_extra_mesh, _init_name, _init_extra_name, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_scaling, _init_extra_scaling, _init_localTransform, _init_extra_localTransform, _init_decals, _init_extra_decals, _init_staticTransform, _init_extra_staticTransform, _init_animationUpdater, _init_extra_animationUpdater, _init_attachments, _init_extra_attachments, _init_lights, _init_extra_lights, _init_lowestLodVisible, _init_extra_lowestLodVisible, _init_minScreenSize, _init_extra_minScreenSize, _init_sortValueOffset, _init_extra_sortValueOffset, _init_sortValueScale, _init_extra_sortValueScale, _init_currentScreenSize, _init_extra_currentScreenSize, _init_currentInstanceScreenSize, _init_extra_currentInstanceScreenSize, _init_useSRT, _init_extra_useSRT, _init_updateAnimation, _init_extra_updateAnimation, _init_origin, _init_extra_origin, _init_instanceTransforms, _init_extra_instanceTransforms, _init_sofDna, _init_extra_sofDna, _init_sofParentHullName, _init_extra_sofParentHullName, _init_sofLocatorSetName, _init_extra_sofLocatorSetName, _init_sofLocatorIndex, _init_extra_sofLocatorIndex, _initProto],
        c: [_EveChildMesh, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildMesh",
        family: "eve/child"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, type.enum("ReflectionMode")], 16, "reflectionMode"], [[io, io.persist, void 0, type.list("IEveChildTransformModifier")], 16, "transformModifiers"], [[io, io.read, type, type.mat4], 16, "worldTransform"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "display"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "castShadow"], [[io, io.notify, io, io.persist, void 0, type.objectRef("Tr2MeshBase")], 16, "mesh"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.mat4], 16, "localTransform"], [[io, io.persist, void 0, type.list("EveSpaceObjectDecal")], 16, "decals"], [[io, io.persist, type, type.boolean], 16, "staticTransform"], [[io, io.notify, io, io.persist, void 0, type.objectRef("Tr2GrannyAnimation")], 16, "animationUpdater"], [[io, io.persist, void 0, type.list("IEveSpaceObjectAttachment")], 16, "attachments"], [[io, io.persist, void 0, type.list("Tr2Light")], 16, "lights"], [[io, io.persist, type, type.int32, void 0, type.enum("Tr2Lod")], 16, "lowestLodVisible"], [[io, io.persist, type, type.float32], 16, "minScreenSize"], [[io, io.persist, type, type.float32], 16, "sortValueOffset"], [[io, io.persist, type, type.float32], 16, "sortValueScale"], [[io, io.read, type, type.float32], 16, "currentScreenSize"], [[io, io.read, type, type.float32], 16, "currentInstanceScreenSize"], [[io, io.persist, type, type.boolean], 16, "useSRT"], [[io, io.persist, type, type.boolean], 16, "updateAnimation"], [[io, io.persist, type, type.int32, void 0, type.enum("Origin")], 16, "origin"], [[void 0, io.rebuild("instanceBuffer"), io, io.persist, void 0, type.array("mat4")], 16, "instanceTransforms"], [[io, io.persist, type, type.string], 16, "sofDna"], [[io, io.persist, type, type.string], 16, "sofParentHullName"], [[io, io.persist, type, type.string], 16, "sofLocatorSetName"], [[io, io.persist, type, type.string], 16, "sofLocatorIndex"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "Setup"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetInstanceTransforms"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetInstanceTransforms"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMesh"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetOrigin"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetScale"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetReflectionMode"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetCastShadow"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMinScreenSize"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocalToWorldTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddTransformModifier"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddDecal"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddAttachment"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearAttachments"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddLight"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearLights"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsAlwaysOn"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMorphTargetNames"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetMorphTargetWeight"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMorphTargetWeight"], [[impl, impl.adapted], 18, "UpdateMorphAnimationBuffer"], [[impl, impl.adapted], 18, "GetMorphTargets"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetSofSourceLocator"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Audio-geometry registration is engine-owned and the animationUpdater branches await the JS animation seam; nothing else remains in Carbon's body.")], 18, "UpdateSyncronous"], [[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.adapted], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Tr2AnimationMeshBinding is unported, so the second bone source (Carbon cpp:1303-1306) yields no bones rather than wrong ones.")], 18, "GetBoneTransforms"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Bone-fed decal bounds still await the decal seam and the raytracing refresh is engine-owned; the LOD/screen-size math and the bone-fed attachment pass are ported.")], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The decal mesh cache is engine-owned (null placeholder); collection structure is ported.")], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Frustum and threshold arrive via the duck-typed update context instead of renderer state.")], 18, "IsVisible"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetShadowBatches"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetShadowPerObjectData"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("GPU ring-buffer offsets have no CPU derivation and keep their defaults; every CPU-known field is filled.")], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Overload dispatch by argument shape and a length-1 out array replace C++ overloading and the float& out-param; the shadow math is ported.")], 18, "IsCastingShadow"], [[carbon, carbon.method, impl, impl.implemented], 18, "ChangeLOD"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLights"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetID"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPickingBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "InitializeAnimation"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "BakeMorphs"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "UnbakeMorphs"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "IsMeshBaked"]], 0, void 0, _EveChildTransform));
    }
    constructor(...args) {
      super(...args);
      _init_extra_sofLocatorIndex(this);
    }
    #isMorphsBaked = (_initProto(this), false);
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

    /**
     * Clears the private visibility state for a derived child whose own Carbon
     * cull rejects it before EveChildMesh::UpdateVisibility runs.
     *
     * EveChildInstanceMeshRenderer owns exactly that two-stage cull. Keeping the
     * mutation here preserves one state owner instead of shadowing the four
     * private values in the subclass.
     */
    _ResetVisibilityState() {
      this.#isVisible = false;
      this.currentScreenSize = -1;
      this.#instancesVisible = false;
      this.currentInstanceScreenSize = -1;
    }

    /** Carbon-derived classes read m_activationStrength after the mesh update. */
    _GetActivationStrength() {
      return this.#activationStrength;
    }
    reflectionMode = _init_reflectionMode(this, 3);
    transformModifiers = (_init_extra_reflectionMode(this), _init_transformModifiers(this, []));
    worldTransform = (_init_extra_transformModifiers(this), _init_worldTransform(this, mat4.create()));
    display = (_init_extra_worldTransform(this), _init_display(this, true));
    castShadow = (_init_extra_display(this), _init_castShadow(this, false));
    mesh = (_init_extra_castShadow(this), _init_mesh(this, null));
    name = (_init_extra_mesh(this), _init_name(this, ""));
    rotation = (_init_extra_name(this), _init_rotation(this, quat.create()));
    translation = (_init_extra_rotation(this), _init_translation(this, vec3.create()));
    scaling = (_init_extra_translation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));
    localTransform = (_init_extra_scaling(this), _init_localTransform(this, mat4.create()));
    decals = (_init_extra_localTransform(this), _init_decals(this, []));
    staticTransform = (_init_extra_decals(this), _init_staticTransform(this, false));
    animationUpdater = (_init_extra_staticTransform(this), _init_animationUpdater(this, null));
    attachments = (_init_extra_animationUpdater(this), _init_attachments(this, []));
    lights = (_init_extra_attachments(this), _init_lights(this, []));
    lowestLodVisible = (_init_extra_lights(this), _init_lowestLodVisible(this, 0));
    minScreenSize = (_init_extra_lowestLodVisible(this), _init_minScreenSize(this, 0));
    sortValueOffset = (_init_extra_minScreenSize(this), _init_sortValueOffset(this, 0));
    sortValueScale = (_init_extra_sortValueOffset(this), _init_sortValueScale(this, 1));
    currentScreenSize = (_init_extra_sortValueScale(this), _init_currentScreenSize(this, -1));
    currentInstanceScreenSize = (_init_extra_currentScreenSize(this), _init_currentInstanceScreenSize(this, -1));
    useSRT = (_init_extra_currentInstanceScreenSize(this), _init_useSRT(this, true));
    updateAnimation = (_init_extra_useSRT(this), _init_updateAnimation(this, true));

    // SOF-authored placement/instance values; persisted so the values
    // interchange reproduces Carbon's hidden child placement state.
    origin = (_init_extra_updateAnimation(this), _init_origin(this, 0));
    instanceTransforms = (_init_extra_origin(this), _init_instanceTransforms(this, []));
    sofDna = (_init_extra_instanceTransforms(this), _init_sofDna(this, ""));
    sofParentHullName = (_init_extra_sofDna(this), _init_sofParentHullName(this, ""));
    sofLocatorSetName = (_init_extra_sofParentHullName(this), _init_sofLocatorSetName(this, ""));
    sofLocatorIndex = (_init_extra_sofLocatorSetName(this), _init_sofLocatorIndex(this, ""));

    /**
     * Rebuilds the local transform up front when the child is marked
     * staticTransform, since UpdateTransform will not rebuild it on later frames.
     */
    Initialize() {
      if (this.staticTransform) {
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
    Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null) {
      super.Setup(scale, rotation, translation, lowestLodVisible);
      if (lowestLodVisible !== null && lowestLodVisible !== undefined) {
        this.lowestLodVisible = Number(lowestLodVisible) | 0;
      }
      return this.localTransform;
    }

    /**
     * Replaces the instance placement list with clones of the supplied matrices, so later caller mutations do not reach the child.
     * @param {Iterable<Float32Array>} instances - 16-value matrices; a wrongly sized entry throws TypeError
     * @returns {Array<Float32Array>} the stored list
     */
    SetInstanceTransforms(instances) {
      const next = [];
      for (const transform of instances ?? []) {
        if (!transform || transform.length !== 16) {
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
    GetInstanceTransforms() {
      return this.instanceTransforms;
    }

    /**
     * Assigns the Tr2MeshBase this child draws; a nullish value clears it, which
     * also makes the child permanently invisible (UpdateVisibility requires a
     * mesh).
     */
    SetMesh(mesh) {
      this.mesh = mesh ?? null;
    }

    /**
     * Records whether this child's placement was authored in space or by SOF (the
     * Origin enum).
     */
    SetOrigin(origin) {
      this.origin = Number(origin) | 0;
    }

    /**
     * Copies the given scale into the child's SRT scaling; it reaches the world
     * transform on the next local-transform rebuild.
     */
    SetScale(scale) {
      vec3.copy(this.scaling, scale);
    }

    /**
     * Sets the reflection mode, which decides whether the child registers as a
     * ReflectionRenderable and whether it casts shadows during reflection passes.
     */
    SetReflectionMode(mode) {
      this.reflectionMode = Number(mode) | 0;
    }

    /**
     * Sets whether the child registers as a shadow caster and contributes opaque
     * shadow batches.
     */
    SetCastShadow(castShadow) {
      this.castShadow = !!castShadow;
    }

    /**
     * Sets the minimum screen size, in pixels across, that the child's world
     * bounding sphere must reach - after the frame's inverse LOD factor scaling -
     * before UpdateVisibility marks it visible.
     */
    SetMinScreenSize(minScreenSize) {
      this.minScreenSize = Number(minScreenSize);
    }

    /** Carbon EveChildMesh::GetLocalToWorldTransform (cpp:1047-1050); the
     * optional out follows the EveChildInstancedMeshes copy-out shape. */
    GetLocalToWorldTransform(out = null) {
      if (out) {
        return mat4.copy(out, this.worldTransform);
      }
      return this.worldTransform;
    }

    /**
     * The authored name, persisted with the child and used to identify it in the
     * parent graph.
     */
    GetName() {
      return this.name;
    }

    /** Sets the authored child name, coercing nullish to the empty string. */
    SetName(name) {
      this.name = String(name ?? "");
    }

    /**
     * Appends a transform modifier; modifiers fold over the child's world
     * transform in insertion order on each async update.
     */
    AddTransformModifier(modifier) {
      this.transformModifiers.push(modifier);
    }

    /**
     * Appends a decal; decals refresh their visibility only while the child itself
     * is visible, and ride along in GetRenderables when the mesh has a geometry
     * resource.
     */
    AddDecal(decal) {
      this.decals.push(decal);
    }

    /**
     * Appends an attachment; attachments refresh their lights and visibility every
     * frame regardless of the child's own visibility.
     */
    AddAttachment(attachment) {
      this.attachments.push(attachment);
    }

    /**
     * Drops every attachment, removing their lights, batches and visibility
     * updates from this child.
     */
    ClearAttachments() {
      this.attachments.length = 0;
    }

    /**
     * Appends a light, submitted to the light manager from the child's world
     * transform while the child displays.
     */
    AddLight(light) {
      this.lights.push(light);
    }

    /**
     * Drops every light, which also stops the child registering as a LightOwner on
     * the next component registration.
     */
    ClearLights() {
      this.lights.length = 0;
    }

    /** Returns true unconditionally - a child mesh reports itself as always on. */
    IsAlwaysOn() {
      return true;
    }

    /** Forwards a shader option to the mesh, every decal and every attachment. */
    SetShaderOption(name, value) {
      this.mesh?.SetShaderOption?.(name, value);
      for (const decal of this.decals) {
        decal?.SetShaderOption?.(name, value);
      }
      for (const attachment of this.attachments) {
        attachment?.SetShaderOption?.(name, value);
      }
    }

    /**
     * Names of the mesh's morph targets in index order, or an empty array when the
     * mesh exposes none; the indices line up with the records GetMorphTargets
     * returns.
     */
    GetMorphTargetNames() {
      return this.mesh?.GetMorphTargetNames?.() ?? [];
    }

    /**
     * Writes a named morph weight on the mesh; it only reaches the render path
     * after the next UpdateMorphAnimationBuffer pass re-sorts the indexed buffer.
     */
    SetMorphTargetWeight(name, weight) {
      this.mesh?.SetMorphTargetWeight?.(name, weight);
    }

    /**
     * Reads a named morph weight straight from the mesh (0 when it has no such
     * target), bypassing any animation-driven value the morph buffer may have
     * applied.
     */
    GetMorphTargetWeight(name) {
      return this.mesh?.GetMorphTargetWeight?.(name) ?? 0;
    }

    /** Rebuilds the source-backed indexed morph buffer from manual and animation weights. */
    UpdateMorphAnimationBuffer() {
      const names = this.mesh?.GetMorphTargetNames?.();
      this.#morphAnimationOffsets = {
        runtimeEvaluatedOffset: 0,
        runtimeEvaluatedCount: 0,
        bakedOffset: 0,
        bakedCount: 0,
        allCount: 0
      };
      if (!Array.isArray(names)) {
        this.#morphAnimationBuffer = [];
        return 0;
      }
      const manual = this.mesh?.GetMorphAnimations?.();
      const records = names.map((name, index) => ({
        index,
        weight: ReadMorphWeight(ReadNamedMorph(manual, name) ?? this.mesh?.GetMorphTargetWeight?.(name) ?? 0, name, "mesh"),
        baked: !!(this.mesh?.IsBakedMorph?.(index) ?? this.mesh?.GetBakedMorphTarget?.(name) ?? false)
      }));
      if (this.animationUpdater?.IsInitialized?.()) {
        const animated = this.animationUpdater.GetMorphAnimations?.();
        for (const record of records) {
          const name = names[record.index];
          const value = ReadNamedMorph(animated, name);
          if (value !== undefined) {
            record.weight = ReadMorphWeight(value, name, "animation");
          }
        }
      }
      const runtime = [];
      const baked = [];
      const inactive = [];
      for (const record of records) {
        if (record.weight >= 0.001) {
          (record.baked ? baked : runtime).push(record);
        } else {
          inactive.push(record);
        }
      }
      this.#morphAnimationBuffer = [...runtime, ...baked, ...inactive];
      this.#morphAnimationOffsets.runtimeEvaluatedCount = runtime.length;
      this.#morphAnimationOffsets.bakedOffset = runtime.length;
      this.#morphAnimationOffsets.bakedCount = baked.length;
      this.#morphAnimationOffsets.allCount = runtime.length + baked.length;
      return this.#morphAnimationOffsets.allCount;
    }

    /** Returns detached active indexed morph records for the native filter. */
    GetMorphTargets(filter = 2) {
      const normalized = NormalizeMorphFilter(filter);
      let offset = 0;
      let count = 0;
      if (normalized === 2) {
        count = this.#morphAnimationOffsets.allCount;
      } else if (normalized === 0) {
        offset = this.#isMorphsBaked ? this.#morphAnimationOffsets.runtimeEvaluatedOffset : 0;
        count = this.#isMorphsBaked ? this.#morphAnimationOffsets.runtimeEvaluatedCount : this.#morphAnimationOffsets.allCount;
      } else {
        offset = this.#morphAnimationOffsets.bakedOffset;
        count = this.#morphAnimationOffsets.bakedCount;
      }
      return this.#morphAnimationBuffer.slice(offset, offset + count).map(value => ({
        index: value.index,
        weight: value.weight
      }));
    }

    /**
     * Always returns null: a child mesh exposes no packed area-id lookup, since
     * its SOF identity lives directly on its
     * sofParentHullName/sofLocatorSetName/sofLocatorIndex fields.
     */
    GetSofSourceLocator() {
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
    UpdateSyncronous(_updateContext, _params) {}

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
    UpdateAsyncronous(updateContext, params) {
      const parentTransform = params?.localToWorldTransform;

      // Carbon captures the OUTGOING transform before rebuilding (cpp:912).
      mat4.copy(this.#lastWorldTransform, this.worldTransform);
      if (parentTransform && parentTransform.length === 16) {
        this.UpdateTransform(parentTransform);
      }
      applyTransformModifiers(this, updateContext, params?.boneCount ?? 0, params?.bones ?? null);

      // Carbon cpp:932-954: inherit the hull's per-object values, rebase the clip
      // data by this child's translation, then stamp our own transforms.
      inheritParentPerObjectData(this.#perObjectData, params?.spaceObjectParent, this.translation);
      stampChildTransforms(this.#perObjectData, this.worldTransform, this.#lastWorldTransform);
      this.#activationStrength = Number(params?.activationStrength ?? 1);

      // Carbon (cpp:962-970): attachments refresh their lights from the updated
      // world transform. Bones come from GetBoneTransforms (animationUpdater) -
      // null until the JS animation seam exists.
      for (const attachment of this.attachments) {
        attachment?.UpdateLights?.(this.worldTransform, null, 0, this.#activationStrength, 0);
      }
      this.UpdateMorphAnimationBuffer();

      // Carbon (cpp:974-997): world AABB from the mesh bounds, world sphere
      // enclosing it. The skinned GetBounds overload (animation transforms +
      // morph targets, cpp:977-982) awaits the animation seam; Tr2MeshBase::
      // GetBounds itself remains an explicit @impl.notImplemented gap, hence the
      // duck call (Tr2InstancedMesh implements it).
      this.#worldBoundsValid = false;
      const bounds = this.mesh?.GetBounds?.();
      if (bounds?.min && bounds?.max) {
        this.#worldBoundsMin[0] = this.#worldBoundsMin[1] = this.#worldBoundsMin[2] = Infinity;
        this.#worldBoundsMax[0] = this.#worldBoundsMax[1] = this.#worldBoundsMax[2] = -Infinity;
        for (let index = 0; index < 8; index++) {
          vec3.set(BOX_CORNER_SCRATCH, index & 1 ? bounds.max[0] : bounds.min[0], index & 2 ? bounds.max[1] : bounds.min[1], index & 4 ? bounds.max[2] : bounds.min[2]);
          vec3.transformMat4(BOX_CORNER_SCRATCH, BOX_CORNER_SCRATCH, this.worldTransform);
          vec3.min(this.#worldBoundsMin, this.#worldBoundsMin, BOX_CORNER_SCRATCH);
          vec3.max(this.#worldBoundsMax, this.#worldBoundsMax, BOX_CORNER_SCRATCH);
        }
        this.#worldBoundsValid = true;
        sph3.fromBounds(this.#worldBoundingSphere, this.#worldBoundsMin, this.#worldBoundsMax);
      } else {
        sph3.set(this.#worldBoundingSphere, 0, 0, 0, 0);
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
     * Carbon also assigns `accumulatedTransforms` at cpp:1295 and never reads it;
     * a dead local, not reproduced.
     */
    GetBoneTransforms() {
      const updater = this.animationUpdater;
      if (!updater?.IsInitialized?.()) {
        return NO_BONE_TRANSFORMS;
      }

      // cpp:1297-1302 - the updater's own palette when it binds to the mesh.
      if (updater.HasMeshBinding?.()) {
        return getBoneList(updater);
      }

      // cpp:1303-1306 would fall to a Tr2AnimationMeshBinding palette here. That
      // class is unported, so this yields no bones rather than the wrong ones.
      return NO_BONE_TRANSFORMS;
    }

    /**
     * Resolves this child's visibility for the frame from its world bounding
     * sphere, the parent LOD, and the authored screen-size thresholds, recording
     * the mesh and per-instance screen sizes the batch path then draws at.
     */
    UpdateVisibility(updateContext, _parentTransform = null, parentLod = Tr2Lod.TR2_LOD_HIGH) {
      this.#isVisible = false;
      this.currentScreenSize = -1;
      this.#instancesVisible = false;
      this.currentInstanceScreenSize = -1;
      if (!this.#hasUpdated) {
        return false;
      }
      const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
      const invLodFactor = Number(updateContext?.GetInvLodFactor?.() ?? updateContext?.invLodFactor) || 1;
      if (this.mesh) {
        this.currentScreenSize = Number(frustum?.GetPixelSizeAccross?.(this.#worldBoundingSphere) ?? Infinity) || 0;

        // Cached Tr2InstancedMesh downcast in Carbon (m_instancedMesh); the JS
        // port duck-types the instanced surface instead.
        const instanced = typeof this.mesh.GetInstanceBoundsClosestToPoint === "function";
        let instanceBounds = null;
        if (instanced) {
          // Carbon: TransformCoord(frustum.m_viewPos, Inverse(m_worldTransform))
          // - a single-matrix point transform (no composition; TransformCoord
          // maps to vec3.transformMat4 unchanged per the math conventions).
          if (!mat4.invert(INVERSE_WORLD_SCRATCH, this.worldTransform)) {
            mat4.identity(INVERSE_WORLD_SCRATCH);
          }
          const viewPos = frustum?.m_viewPos ?? frustum?.viewPos ?? frustum?.GetViewPosition?.() ?? ZERO_VEC3;
          vec3.transformMat4(LOCAL_VIEW_SCRATCH, viewPos, INVERSE_WORLD_SCRATCH);
          instanceBounds = this.mesh.GetInstanceBoundsClosestToPoint(LOCAL_VIEW_SCRATCH);
        }
        if (instanceBounds) {
          // Carbon: instanceBounds.Transform(m_worldTransform) - single-matrix
          // sphere transform, ported via sph3.transformMat4.
          sph3.set(INSTANCE_SPHERE_SCRATCH, instanceBounds.center[0], instanceBounds.center[1], instanceBounds.center[2], instanceBounds.radius);
          sph3.transformMat4(INSTANCE_SPHERE_SCRATCH, INSTANCE_SPHERE_SCRATCH, this.worldTransform);
          this.currentInstanceScreenSize = Number(frustum?.GetPixelSizeAccross?.(INSTANCE_SPHERE_SCRATCH) ?? Infinity) || 0;
          this.mesh.UseWithScreenSize?.(this.currentInstanceScreenSize, INSTANCE_SPHERE_SCRATCH[3]);
        } else {
          // Carbon uses std::numeric_limits<float>::max(); Infinity keeps the
          // instance gate permanently open the same way.
          this.currentInstanceScreenSize = Infinity;
          this.mesh.UseWithScreenSize?.(this.currentScreenSize, this.#worldBoundingSphere[3]);
        }
        this.currentScreenSize *= invLodFactor;
        this.currentInstanceScreenSize *= invLodFactor;
        BOX_QUERY_SCRATCH.min = this.#worldBoundsMin;
        BOX_QUERY_SCRATCH.max = this.#worldBoundsMax;
        const boxVisible = this.#worldBoundsValid && (frustum?.IsBoxVisible ? !!frustum.IsBoxVisible(BOX_QUERY_SCRATCH) : true);
        if (boxVisible) {
          this.#isVisible = parentLod >= this.lowestLodVisible && this.currentScreenSize >= this.minScreenSize;
          this.#instancesVisible = this.#isVisible && this.currentInstanceScreenSize >= _EveChildMesh.#instanceScreenSizeThreshold;
        }
      }

      // Carbon (cpp:427-435): attachments always refresh visibility, fed the bone
      // palette so a bone-parented attachment is placed by its bone.
      const {
        bones,
        boneCount
      } = this.GetBoneTransforms();
      for (const attachment of this.attachments) {
        attachment?.UpdateVisibility?.(updateContext, this.worldTransform, bones, boneCount);
      }
      if (this.#isVisible) {
        for (const decal of this.decals) {
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
    GetRenderables(out = []) {
      if (!this.#isVisible) {
        return out;
      }
      const instanced = typeof this.mesh?.GetInstanceBoundsClosestToPoint === "function";
      if (instanced) {
        if (this.#instancesVisible) {
          out.push(this);
          if (this.decals.length && this.mesh.GetGeometryResource?.()) {
            for (const decal of this.decals) {
              decal?.GetInstancedRenderables?.(out, null, this.mesh, this.currentInstanceScreenSize);
            }
          }
        }
      } else {
        out.push(this);
        const geometryResource = this.mesh?.GetGeometryResource?.();
        if (this.decals.length && geometryResource) {
          for (const decal of this.decals) {
            decal?.GetRenderables?.(out, null, geometryResource, this.currentScreenSize);
          }
        }
      }
      return out;
    }

    /** Carbon EveChildMesh::GetBoundingSphere (cpp:618-627): the realized world
     * sphere, valid only after an update produced bounds (radius > 0). */
    GetBoundingSphere(out = vec4.create(), _query = 0) {
      if (this.#worldBoundingSphere[3] > 0) {
        vec4.copy(out, this.#worldBoundingSphere);
        return true;
      }
      return false;
    }

    /** Carbon EveChildMesh::HasTransparentBatches (cpp:629-637). */
    HasTransparentBatches() {
      if (this.display && this.mesh) {
        return (this.mesh.GetAreas?.(TriBatchType.TRIBATCHTYPE_TRANSPARENT)?.length ?? 0) > 0;
      }
      return false;
    }

    /** Carbon EveChildMesh::IsVisible (cpp:639-650): sphere-in-frustum plus the
     * estimated pixel size against the context visibility threshold. */
    IsVisible(updateContext) {
      if (this.#worldBoundingSphere[3] > 0) {
        const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
        if (frustum?.IsSphereVisible?.(this.#worldBoundingSphere) !== false) {
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
    GetBatches(batches, batchType, perObjectData, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL) {
      if (!this.display) {
        return false;
      }
      let committed = false;
      if (this.mesh) {
        committed = this.mesh.GetBatches(batches, this.mesh.GetAreas(batchType), perObjectData, Math.min(this.currentInstanceScreenSize, this.currentScreenSize), mat4.determinant(this.worldTransform) < 0) === true;
      }
      if (this.#activationStrength !== 0) {
        for (const attachment of this.attachments) {
          committed = attachment?.GetBatches?.(batches, batchType, perObjectData, reason) === true || committed;
        }
      }
      return committed;
    }

    /** Carbon EveChildMesh::GetShadowBatches (cpp:672-681): the OPAQUE areas
     * only, gated on display/mesh/hasUpdated, at the caller's shadow pixel size
     * rather than the child's own screen size. Returns whether any batch was
     * committed (JS addition; Carbon returns void). */
    GetShadowBatches(batches, perObjectData, shadowPixelSize = Infinity) {
      if (this.display && this.mesh && this.#hasUpdated) {
        return this.mesh.GetBatches(batches, this.mesh.GetAreas(TriBatchType.TRIBATCHTYPE_OPAQUE), perObjectData, shadowPixelSize, mat4.determinant(this.worldTransform) < 0) === true;
      }
      return false;
    }

    /** Carbon EveChildMesh::GetSortValue (cpp:787-792): view distance scaled by
     * sortValueScale plus sortValueOffset. */
    GetSortValue(renderContext = null) {
      const viewPosition = renderContext?.GetViewPosition?.();
      const x = (viewPosition?.[0] ?? 0) - this.worldTransform[12];
      const y = (viewPosition?.[1] ?? 0) - this.worldTransform[13];
      const z = (viewPosition?.[2] ?? 0) - this.worldTransform[14];
      return Math.hypot(x, y, z) * this.sortValueScale + this.sortValueOffset;
    }

    /** Carbon EveChildMesh::GetShadowPerObjectData (cpp:794-797) forwards the
     * shadow pass to the same per-object record. */
    GetShadowPerObjectData(accumulator = null) {
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
    GetPerObjectData(_accumulator = null) {
      this.#perObjectData.vs.Set("activeMorphTargetsCount", [0]);
      // Carbon seeds the baked-morph offset with UINT32_MAX, not zero.
      this.#perObjectData.vs.Set("bakedMorphTargetVertexDataOffset", [0xffffffff]);
      if (this.animationUpdater?.IsInitialized?.()) {
        const boneCount = this.animationUpdater.GetMeshBoneCount?.() ?? 0;
        this.#perObjectData.vs.SetIndex("boneOffsets", 2, [boneCount]);
      }
      return {
        vs: this.#perObjectData.vs,
        ps: this.#perObjectData.ps
      };
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
    IsCastingShadow(cameraFrustum, shadowFrustumOrPosition, renderReasonOrRadius, sizeInShadowOutOrRenderReason = null) {
      if (!this.display || !this.castShadow || !this.#hasUpdated) {
        return false;
      }
      const positionOverload = typeof shadowFrustumOrPosition?.length === "number" && shadowFrustumOrPosition.length >= 3;
      const renderReason = positionOverload ? Number(sizeInShadowOutOrRenderReason ?? Tr2RenderReason.TR2RENDERREASON_NORMAL) : Number(renderReasonOrRadius ?? Tr2RenderReason.TR2RENDERREASON_NORMAL);
      if (renderReason === Tr2RenderReason.TR2RENDERREASON_REFLECTION && !ShouldReflect(this.reflectionMode)) {
        return false;
      }
      if (positionOverload) {
        // Carbon (cpp:338-364): squared distance between the world sphere and
        // the query sphere against their combined radius.
        if (!this.GetBoundingSphere(SHADOW_SPHERE_SCRATCH)) {
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
      if (sizeOut) {
        sizeOut[0] = 0;
      }
      if (this.#worldBoundingSphere[3] <= 0) {
        return false;
      }
      let sizeInShadow = 0;
      if (shadowFrustum?.IsVisible?.(cameraFrustum, this.#worldBoundingSphere)) {
        let sphere = this.#worldBoundingSphere;
        if (typeof this.mesh?.GetInstanceBoundsClosestToPoint === "function") {
          // Carbon: TransformCoord(shadowFrustum.GetEyePos(), Inverse(
          // m_worldTransform)) - single-matrix point transform (no composition).
          if (!mat4.invert(INVERSE_WORLD_SCRATCH, this.worldTransform)) {
            mat4.identity(INVERSE_WORLD_SCRATCH);
          }
          const eyePos = shadowFrustum?.GetEyePos?.() ?? ZERO_VEC3;
          vec3.transformMat4(LOCAL_VIEW_SCRATCH, eyePos, INVERSE_WORLD_SCRATCH);
          const instanceBounds = this.mesh.GetInstanceBoundsClosestToPoint(LOCAL_VIEW_SCRATCH);
          if (instanceBounds) {
            // Carbon: instanceBounds.Transform(m_worldTransform) - single-matrix
            // sphere transform.
            sph3.set(INSTANCE_SPHERE_SCRATCH, instanceBounds.center[0], instanceBounds.center[1], instanceBounds.center[2], instanceBounds.radius);
            sph3.transformMat4(INSTANCE_SPHERE_SCRATCH, INSTANCE_SPHERE_SCRATCH, this.worldTransform);
            sphere = INSTANCE_SPHERE_SCRATCH;
          }
        }
        sizeInShadow = Number(shadowFrustum?.GetSizeInShadow?.(sphere)) || 0;
      }
      if (sizeOut) {
        sizeOut[0] = sizeInShadow;
      }
      return sizeInShadow > 5;
    }

    /** Carbon EveChildMesh::ChangeLOD (cpp:1052-1054) is an intentional no-op. */
    ChangeLOD(_lod) {}

    /** Carbon EveChildMesh::RegisterComponents (cpp:239-269): LightOwner when
     * lights are authored; ReflectionRenderable (ShouldReflect) and ShadowCaster
     * (castShadow) only when a mesh is present; then forwards the attachments.
     * Gate m_display. "MeshMorph" stays OUT-OF-BAND: Carbon registers it at
     * baked-morph need inside BakeMorphs (cpp:1404-1409), not here - the JS
     * BakeMorphs stub is the site that would register it when the GPU morph
     * bake is ported. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.display) {
        if (this.lights.length) {
          registry.RegisterComponent(EveComponentType.LightOwner, this);
        }
        if (this.mesh !== null) {
          if (ShouldReflect(this.reflectionMode)) {
            registry.RegisterComponent(EveComponentType.ReflectionRenderable, this);
          }
          if (this.castShadow) {
            registry.RegisterComponent(EveComponentType.ShadowCaster, this);
          }
        }
        for (const attachment of this.attachments) {
          attachment?.Register?.(registry);
        }
      }
    }

    /** Carbon EveChildMesh::UnRegisterComponents (cpp:275-290): forwards the
     * attachments only (own components were already removed by
     * EveEntity::UnRegister, EveEntity.cpp:90); no display re-check.
     * UnregisterAudioGeometry (cpp:277) is audio-engine-owned and unported. */
    UnRegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        for (const attachment of this.attachments) {
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
    GetLights(lightManager) {
      if (!this.lights.length || !this.display) {
        return;
      }

      // cpp:1645 - bones so a bone-parented light is placed by its bone.
      const {
        bones,
        boneCount
      } = this.GetBoneTransforms();
      for (const light of this.lights) {
        light?.AddLight?.(lightManager, this.worldTransform, 1, bones, boneCount);
        light?.SetBrightnessMultiplier?.(this.#activationStrength);
      }
    }

    /** Carbon EveChildMesh::GetID returns GetRawRoot(), i.e. this object. */
    GetID(_area = 0) {
      return this;
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
    GetPickingBatches(batches, pickTypes = TR2_PICK_TYPE_DEFAULT, perObjectData = null) {
      if (pickTypes & Tr2PickType.PICK_TYPE_PICKING) {
        this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_PICKING, perObjectData);
      }
      if (pickTypes & Tr2PickType.PICK_TYPE_OPAQUE) {
        this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData);
        this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_DECAL, perObjectData);
      }
      if (pickTypes & Tr2PickType.PICK_TYPE_TRANSPARENT) {
        // A hidden mesh suppresses the transparent pass only; Carbon returns
        // early here, after the collections above have already run.
        if (!this.mesh || this.mesh.display === false) {
          return true;
        }
        for (const batchType of [TriBatchType.TRIBATCHTYPE_TRANSPARENT, TriBatchType.TRIBATCHTYPE_ADDITIVE]) {
          const areas = this.mesh.GetAreas?.(batchType);
          if (areas) {
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
    InitializeAnimation() {
      const updater = this.animationUpdater;
      if (!updater || updater.resPath_) {
        return;
      }
      const geometry = this.mesh?.GetGeometryResource?.();
      if (geometry) {
        updater.SetUseMeshBinding?.(true);
        updater.SetSharedGeometryRes?.(geometry);
        return;
      }
      updater.SetSharedGeometryRes?.(null);
    }

    /** Carbon BakeMorphs runs the merge-morphs GPU compute pass; GPU-owned. */
    BakeMorphs(..._args) {
      throw new Error("EveChildMesh.BakeMorphs is not implemented in CarbonEngineJS.");
    }

    /** Carbon UnbakeMorphs releases the baked-morph GPU allocation; GPU-owned. */
    UnbakeMorphs(..._args) {
      throw new Error("EveChildMesh.UnbakeMorphs is not implemented in CarbonEngineJS.");
    }

    /** Carbon IsMeshBaked reads the baked-morph GPU allocation state; GPU-owned. */
    IsMeshBaked(..._args) {
      throw new Error("EveChildMesh.IsMeshBaked is not implemented in CarbonEngineJS.");
    }

    // Carbon s_instanceScreenSizeThreshold (EveChildMesh.cpp:22).
  }];
  #instanceScreenSizeThreshold = 1;
  Origin = Origin;
  ReflectionMode = ReflectionMode;
  Tr2Lod = Tr2Lod;
  constructor() {
    super(_EveChildMesh), _initClass();
  }
}();
function ReadNamedMorph(values, name) {
  if (values instanceof Map) {
    return values.has(name) ? values.get(name) : undefined;
  }
  if (values && typeof values === "object" && Object.hasOwn(values, name)) {
    return values[name];
  }
  return undefined;
}
function ReadMorphWeight(value, name, source) {
  const weight = Number(value && typeof value === "object" ? value.weight : value);
  if (!Number.isFinite(weight)) {
    throw new TypeError(`EveChildMesh ${source} morph target "${name}" weight must be finite`);
  }
  return weight;
}
function NormalizeMorphFilter(value) {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "runtime" || normalized === "runtime_evaluated") return 0;
    if (normalized === "baked") return 1;
    if (normalized === "all") return 2;
  }
  const filter = Number(value);
  if (filter === 0 || filter === 1 || filter === 2) return filter;
  throw new TypeError(`Unsupported EveChildMesh morph target filter "${value}"`);
}

export { _EveChildMesh as EveChildMesh };
//# sourceMappingURL=EveChildMesh.js.map
