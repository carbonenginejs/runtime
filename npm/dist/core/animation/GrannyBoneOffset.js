import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass;

/**
 * Per-bone rotation and translation offsets layered on top of an animated rig,
 * keyed by bone name until bound into the rig's joint order.
 */
let _GrannyBoneOffset;
class GrannyBoneOffset extends CjsModel {
  static {
    ({
      e: [_initProto],
      c: [_GrannyBoneOffset, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "GrannyBoneOffset",
      family: "trinityCore"
    })], [[[carbon, carbon.method, impl, impl.implemented], 18, "ClearTransforms"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetRotation"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetOffset"]], 0, void 0, CjsModel));
  }
  #transforms = (_initProto(this), new Map());
  #riggedTransforms = [];

  /** Nothing to prepare; always succeeds. */
  Initialize() {
    return true;
  }

  /** Whether any bone offset has been set. */
  HaveTransforms() {
    return this.#transforms.size !== 0;
  }

  /**
   * True when offsets exist but the cached rig binding does not cover the given
   * bone count, so BindToRig must run again.
   */
  NeedRebind(numBones) {
    return this.HaveTransforms() && this.#riggedTransforms.length !== numBones;
  }

  /**
   * Drops the joint-order cache, forcing the next BindToRig to rebuild it; the
   * named offsets are kept.
   */
  ClearRigBindings() {
    this.#riggedTransforms.length = 0;
  }

  /** Drops every named bone offset along with the rig binding. */
  ClearTransforms() {
    this.#transforms.clear();
    this.ClearRigBindings();
  }

  /**
   * Replaces a bone's offset with one built from the quaternion components,
   * discarding any translation previously set for that bone, and invalidates the
   * rig binding.
   */
  SetRotation(bone, r, i, j, k) {
    if (!bone) return;
    const transform = mat4.fromQuat(mat4.create(), quat.fromValues(r, i, j, k));
    this.#transforms.set(String(bone), transform);
    this.ClearRigBindings();
  }

  /**
   * Sets a bone's offset translation in place, keeping any rotation already
   * stored for it, and invalidates the rig binding.
   */
  SetOffset(bone, x, y, z) {
    if (!bone) return;
    const key = String(bone);
    const transform = this.#transforms.get(key) ?? mat4.create();
    transform[12] = x;
    transform[13] = y;
    transform[14] = z;
    this.#transforms.set(key, transform);
    this.ClearRigBindings();
  }

  /**
   * Caches the named offsets in the rig's bone order so Apply can index them by
   * joint; bones with no offset get a null slot.
   */
  BindToRig(bones, numBones = bones?.length ?? 0) {
    if (!bones || !numBones) return;
    this.#riggedTransforms = Array.from({
      length: numBones
    }, (_, index) => this.#transforms.get(String(bones[index])) ?? null);
  }

  /**
   * Composes the joint's offset into its bone transform and multiplies by the
   * parent, writing the result into out; returns false when that joint has no
   * offset. Carbon's row-vector `(offset * bone) * parent` becomes `parent *
   * (bone * offset)` here, and the translation is added component-wise rather
   * than transformed.
   */
  Apply(out, joint, boneMatrix, parentMatrix) {
    const offset = this.#riggedTransforms[joint];
    if (!offset) return false;

    // Carbon stores row-major matrices. Runtime matrices are column-major, so
    // Carbon's `(offset * bone) * parent` becomes `parent * (bone * offset)`.
    const local = mat4.multiply(mat4.create(), boneMatrix, offset);
    local[12] = boneMatrix[12] + offset[12];
    local[13] = boneMatrix[13] + offset[13];
    local[14] = boneMatrix[14] + offset[14];
    local[15] = 1;
    mat4.multiply(out, parentMatrix, local);
    return true;
  }

  /**
   * Applies the joint's offset to a local rotation and position in place -
   * offset rotation composed first, translation added - and returns false when
   * that joint has no offset.
   */
  ApplyToLocal(joint, rotation, position) {
    const offset = this.#riggedTransforms[joint];
    if (!offset) return false;
    const offsetRotation = mat4.getRotation(quat.create(), offset);
    // Carbon (row-vector): rotation = offsetRotation * rotation - offset first.
    quat.multiply(rotation, rotation, offsetRotation);
    vec3.add(position, position, mat4.getTranslation(vec3.create(), offset));
    return true;
  }
  static {
    _initClass();
  }
}

export { _GrannyBoneOffset as GrannyBoneOffset };
//# sourceMappingURL=GrannyBoneOffset.js.map
