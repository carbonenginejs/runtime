import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveSpaceObjectChild as _EveSpaceObjectChild } from './EveSpaceObjectChild.js';

let _initProto, _initClass, _init_translation, _init_extra_translation, _init_scaling, _init_extra_scaling, _init_rotation, _init_extra_rotation, _init_localTransform, _init_extra_localTransform, _init_worldTransform, _init_extra_worldTransform, _init_staticTransform, _init_extra_staticTransform, _init_useSRT, _init_extra_useSRT, _init_useStaticRotation, _init_extra_useStaticRotation, _init_useStaticScale, _init_extra_useStaticScale;

// Carbon's registered space-object children multiple-inherit EveEntity
// alongside EveChildTransform (e.g. EveChildMesh.h:56-64, EveChildContainer.h
// :33-41); JavaScript single inheritance flattens the EveEntity registration
// lifecycle (Register/UnRegister/GetComponentRegistry/component state) into
// this shared child base so container RegisterComponents overrides can forward
// child?.Register?.(registry) exactly like Carbon's BlueCastPtr<EveEntity>
// fan-out. Children whose Carbon class is not an EveEntity simply never get
// forwarded a registry (Carbon's BlueCastPtr fails; JS registers them with no
// components, base RegisterComponents being a no-op).

/**
 * Shared base for space-object children: holds the SRT values, local and world
 * transforms, and the rules by which a child's world transform is derived from
 * its parent's each frame.
 */
let _EveChildTransform;
new class extends _identity {
  static [class EveChildTransform extends _EveSpaceObjectChild {
    static {
      ({
        e: [_init_translation, _init_extra_translation, _init_scaling, _init_extra_scaling, _init_rotation, _init_extra_rotation, _init_localTransform, _init_extra_localTransform, _init_worldTransform, _init_extra_worldTransform, _init_staticTransform, _init_extra_staticTransform, _init_useSRT, _init_extra_useSRT, _init_useStaticRotation, _init_extra_useStaticRotation, _init_useStaticScale, _init_extra_useStaticScale, _initProto],
        c: [_EveChildTransform, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildTransform",
        family: "eve/child"
      })], [[[type, type.vec3], 16, "translation"], [[type, type.vec3], 16, "scaling"], [[type, type.quat], 16, "rotation"], [[type, type.mat4], 16, "localTransform"], [[type, type.mat4], 16, "worldTransform"], [[type, type.boolean], 16, "staticTransform"], [[type, type.boolean], 16, "useSRT"], [[type, type.boolean], 16, "useStaticRotation"], [[type, type.boolean], 16, "useStaticScale"], [[carbon, carbon.method, impl, impl.implemented], 18, "RebuildLocalTransform"]], 0, void 0, _EveSpaceObjectChild));
    }
    constructor(...args) {
      super(...args);
      _init_extra_useStaticScale(this);
    }
    translation = (_initProto(this), _init_translation(this, vec3.create()));
    scaling = (_init_extra_translation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));
    rotation = (_init_extra_scaling(this), _init_rotation(this, quat.create()));
    localTransform = (_init_extra_rotation(this), _init_localTransform(this, mat4.create()));
    worldTransform = (_init_extra_localTransform(this), _init_worldTransform(this, mat4.create()));
    staticTransform = (_init_extra_worldTransform(this), _init_staticTransform(this, false));
    useSRT = (_init_extra_staticTransform(this), _init_useSRT(this, true));
    useStaticRotation = (_init_extra_useSRT(this), _init_useStaticRotation(this, false));
    useStaticScale = (_init_extra_useStaticRotation(this), _init_useStaticScale(this, false));

    /**
     * Recomposes the local transform from the current scaling, rotation and
     * translation; a child with useSRT off keeps its authored localTransform
     * untouched.
     */
    RebuildLocalTransform() {
      if (this.useSRT) {
        _EveChildTransform.#compose(this.localTransform, this.scaling, this.rotation, this.translation);
      }
      return this.localTransform;
    }

    /**
     * Applies the supplied SRT components (each optional - omitted ones keep their current value) and rebuilds the local transform; a child with useSRT off returns its authored localTransform unchanged.
     * @param {Number} [_lowestLodVisible] - accepted for Carbon signature parity, unused here
     * @returns {Float32Array} the child's live local transform
     */
    Setup(scale = null, rotation = null, translation = null, _lowestLodVisible = null) {
      if (!this.useSRT) {
        return this.localTransform;
      }
      if (scale) {
        vec3.copy(this.scaling, scale);
      }
      if (rotation) {
        quat.copy(this.rotation, rotation);
      }
      if (translation) {
        vec3.copy(this.translation, translation);
      }
      return this.RebuildLocalTransform();
    }

    /**
     * Setup that also latches useStaticRotation, so from then on UpdateTransform
     * strips the parent's rotation and the child keeps a fixed world orientation.
     */
    SetupWithStaticRotation(scale = null, rotation = null, translation = null, lowestLodVisible = null) {
      this.useStaticRotation = true;
      return this.Setup(scale, rotation, translation, lowestLodVisible);
    }

    /**
     * Setup that also latches staticTransform, so from then on UpdateTransform
     * reuses the local transform as-is instead of recomposing it from the SRT
     * values every frame.
     */
    SetupWithStaticTransform(scale = null, rotation = null, translation = null, lowestLodVisible = null) {
      this.staticTransform = true;
      return this.Setup(scale, rotation, translation, lowestLodVisible);
    }

    // Carbon: m_worldTransform = m_localTransform * parentTransform in
    // row-vector convention (local first, then parent), which is
    // mat4.multiply(world, parent, local) in gl-matrix - matching
    // EveTransform.UpdateViewDependentData.

    /**
     * Recomputes the child's world transform from its parent for this frame - the single place a child's placement is driven. A staticTransform or non-SRT child reuses its local transform as-is; otherwise it is recomposed first, and when useStaticScale or useStaticRotation is set the parent is decomposed and rebuilt with unit scale and/or identity rotation before the two are combined.
     * @param {Float32Array} parentTransform - borrowed, read only
     * @returns {Float32Array} the child's live world transform
     */
    UpdateTransform(parentTransform) {
      if (this.staticTransform || !this.useSRT) {
        return mat4.multiply(this.worldTransform, parentTransform, this.localTransform);
      }
      this.RebuildLocalTransform();
      if (!this.useStaticRotation && !this.useStaticScale) {
        return mat4.multiply(this.worldTransform, parentTransform, this.localTransform);
      }
      const scale = mat4.getScaling(vec3.create(), parentTransform);
      const rotation = _EveChildTransform.#getRotation(quat.create(), parentTransform, scale);
      const translation = mat4.getTranslation(vec3.create(), parentTransform);
      if (this.useStaticScale) {
        vec3.set(scale, 1, 1, 1);
      }
      if (this.useStaticRotation) {
        quat.identity(rotation);
      }
      const modifiedParentTransform = _EveChildTransform.#compose(mat4.create(), scale, rotation, translation);
      return mat4.multiply(this.worldTransform, modifiedParentTransform, this.localTransform);
    }

    /** Builds a transform matrix from a scale, rotation and translation triple. */

    /**
     * Extracts the normalized rotation quaternion from a transform by dividing
     * each basis column by the matching component of the supplied scale first, so
     * non-uniform scaling does not skew the result.
     */
  }];
  #compose(out, scale, rotation, translation) {
    return mat4.fromRotationTranslationScale(out, rotation, translation, scale);
  }
  #getRotation(out, transform, scale) {
    const normalized = mat4.create();
    for (let column = 0; column < 3; column++) {
      const divisor = scale[column];
      for (let row = 0; row < 3; row++) {
        normalized[column * 4 + row] = divisor ? transform[column * 4 + row] / divisor : 0;
      }
    }
    mat4.getRotation(out, normalized);
    return quat.normalize(out, out);
  }
  constructor() {
    super(_EveChildTransform), _initClass();
  }
}(); // Module ping-pong scratch for the modifier fold (assume-dirty, never pooled;
const modifierFoldScratch = mat4.create();

/**
 * Folds a child's transform modifiers over its worldTransform in order, each
 * modifier's output feeding the next. Carbon inlines this loop inside each
 * EveChildMesh/Container/ParticleSystem UpdateAsyncronous
 * (`m_worldTransform = (*it)->ApplyTransform(m_worldTransform, boneCount, bones)`);
 * this is a JS-only helper (zero-alloc ping-pong between worldTransform and a
 * module scratch buffer so no modifier reads and writes the same matrix), kept a
 * free function rather than a method so it stays off the Carbon method surface.
 * The frame context is threaded through to camera-dependent modifiers.
 * @param {EveChildTransform} child - owns transformModifiers + worldTransform
 * @param {Object} context - frame context (EveUpdateContext)
 * @param {Number} boneCount
 * @param {Float32Array|null} bones
 * @returns {Float32Array} child.worldTransform
 */
function applyTransformModifiers(child, context, boneCount, bones) {
  const modifiers = child.transformModifiers;
  if (!modifiers || modifiers.length === 0) {
    return child.worldTransform;
  }
  let source = child.worldTransform;
  let target = modifierFoldScratch;
  for (const modifier of modifiers) {
    if (!modifier?.ApplyTransform) {
      continue;
    }
    modifier.ApplyTransform(context, source, boneCount, bones, target);
    const swap = source;
    source = target;
    target = swap;
  }
  if (source !== child.worldTransform) {
    mat4.copy(child.worldTransform, source);
  }
  return child.worldTransform;
}

export { _EveChildTransform as EveChildTransform, applyTransformModifiers };
//# sourceMappingURL=EveChildTransform.js.map
