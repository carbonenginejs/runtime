// Source: trinity/trinity/GrannyBoneOffset.h
// Source: trinity/trinity/GrannyBoneOffset.cpp
// Source: trinity/trinity/GrannyBoneOffset_Blue.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { IInitialize } from "#blue/IInitialize";
import { carbon, impl, type } from "#schema";


/**
 * Per-bone rotation and translation offsets layered on top of an animated rig,
 * keyed by bone name until bound into the rig's joint order.
 */
@type.define({ className: "GrannyBoneOffset", family: "trinityCore" })
export class GrannyBoneOffset extends IInitialize
{
  /** Runtime name-to-offset storage; not exposed or persisted. */
  _transforms = new Map();
  /** Runtime rig-order references into the offset map; not exposed. */
  _riggedTransforms = [];

  /** Nothing to prepare; always succeeds. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    return true;
  }

  /** Whether any bone offset has been set. */
  @carbon.method
  @impl.implemented
  HaveTransforms()
  {
    return this._transforms.size !== 0;
  }

  /**
   * True when offsets exist but the cached rig binding does not cover the given
   * bone count, so BindToRig must run again.
   */
  @carbon.method
  @impl.implemented
  NeedRebind(numBones)
  {
    return this.HaveTransforms() && this._riggedTransforms.length !== numBones;
  }

  /**
   * Drops the joint-order cache, forcing the next BindToRig to rebuild it; the
   * named offsets are kept.
   */
  @carbon.method
  @impl.implemented
  ClearRigBindings()
  {
    this._riggedTransforms.length = 0;
  }

  /** Drops every named bone offset along with the rig binding. */
  @carbon.method
  @impl.implemented
  ClearTransforms()
  {
    this._transforms.clear();
    this.ClearRigBindings();
  }

  /**
   * Replaces a bone's offset with one built from the quaternion components,
   * discarding any translation previously set for that bone, and invalidates the
   * rig binding. JavaScript string coercion and falsy-name rejection preserve
   * the existing name adapter; gl-matrix stores the native quaternion layout.
   */
  @carbon.method
  @impl.adapted
  SetRotation(bone, r, i, j, k)
  {
    if (!bone) return;
    const transform = mat4.fromQuat(mat4.create(), quat.fromValues(r, i, j, k));
    this._transforms.set(String(bone), transform);
    this.ClearRigBindings();
  }

  /**
   * Sets a bone's offset translation in place, keeping any rotation already
   * stored for it, and invalidates the rig binding. The existing JavaScript
   * adapter coerces truthy names to strings and rejects falsy names.
   */
  @carbon.method
  @impl.adapted
  SetOffset(bone, x, y, z)
  {
    if (!bone) return;
    const key = String(bone);
    const transform = this._transforms.get(key) ?? mat4.create();
    transform[12] = x;
    transform[13] = y;
    transform[14] = z;
    this._transforms.set(key, transform);
    this.ClearRigBindings();
  }

  /**
   * Caches the named offsets in the rig's bone order so Apply can index them by
   * joint; bones with no offset get a null slot. The existing JavaScript array
   * adapter defaults the count and rebuilds all slots, unlike native resize
   * which can retain unmatched slots when rebinding an unchanged size.
   */
  @carbon.method
  @impl.adapted
  BindToRig(bones, numBones = bones?.length ?? 0)
  {
    if (!bones || !numBones) return;
    this._riggedTransforms = Array.from({ length: numBones }, (_, index) =>
      this._transforms.get(String(bones[index])) ?? null);
  }

  /**
   * Composes the joint's offset into its bone transform and multiplies by the
   * parent, writing the result into out; returns false when that joint has no
   * offset. Carbon's row-vector `(offset * bone) * parent` becomes `parent *
   * (bone * offset)` here, and the translation is added component-wise rather
   * than transformed.
   */
  @carbon.method
  @impl.adapted
  Apply(out, joint, boneMatrix, parentMatrix)
  {
    const offset = this._riggedTransforms[joint];
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
   * that joint has no offset. JavaScript treats an absent/out-of-range slot
   * as unbound and uses gl-matrix decomposition and reversed composition.
   */
  @carbon.method
  @impl.adapted
  ApplyToLocal(joint, rotation, position)
  {
    const offset = this._riggedTransforms[joint];
    if (!offset) return false;
    const offsetRotation = mat4.getRotation(quat.create(), offset);
    // Carbon (row-vector): rotation = offsetRotation * rotation - offset first.
    quat.multiply(rotation, rotation, offsetRotation);
    vec3.add(position, position, mat4.getTranslation(vec3.create(), offset));
    return true;
  }
}

carbon.interfaceTable({ interfaces: [ GrannyBoneOffset, IInitialize ], chainTo: null })(GrannyBoneOffset);
