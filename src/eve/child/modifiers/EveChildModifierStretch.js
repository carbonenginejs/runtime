// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\TransformModifiers\EveChildModifierStretch.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\TransformModifiers\EveChildModifierStretch.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\TransformModifiers\EveChildModifierStretch_Blue.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/**
 * Transform modifier that stretches a child along the vector from its own
 * position to a destination point, scaling it to the stretch length and centring
 * it on the midpoint.
 */
@type.define({ className: "EveChildModifierStretch", family: "eve/child/modifiers" })
export class EveChildModifierStretch extends CjsModel
{
  @io.persist
  @type.model("ITriVectorFunction")
  dest = null;

  /** m_destPosition - runtime fallback endpoint fed via SetDestPosition. */
  #destPosition = vec3.create();

  /**
   * Stretches the child from its position to the destination (Carbon
   * EveChildModifierStretch.cpp): keep the source rotation applied FIRST,
   * then a transform scaled to the stretch length, arc-rotated onto the
   * stretch direction, positioned at the midpoint - row-vector
   * `RotationMatrix(srcRot) * TransformationMatrix(scale, arcRot, mid)`.
   *
   * @param {Object} context - frame context; reads the frame time
   * @param {Float32Array} transform - source (read only)
   * @param {Number} [_boneCount] - Carbon signature parity, unused
   * @param {Float32Array} [_bones] - Carbon signature parity, unused
   * @param {Float32Array} out - caller-owned; receives the result
   * @returns {Float32Array} out
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the global frame time; JavaScript receives the equivalent time through the threaded update context.")
  ApplyTransform(context, transform, _boneCount = 0, _bones = null, out)
  {
    const { sourceRotation, sourceTranslation, sourceScale, end, diff, arcMat, arcQuat, scale, mid, srcRotMat } =
      EveChildModifierStretch.#scratch;

    mat4.decompose(transform, sourceRotation, sourceTranslation, sourceScale);
    vec3.copy(end, this.#destPosition);
    const now = context?.GetTime?.() ?? context?.currentTime ?? context?.time ?? 0;
    this.dest?.GetValueAt?.(now, end);

    vec3.set(diff, end[0] - transform[12], end[1] - transform[13], end[2] - transform[14]);
    const length = vec3.length(diff);
    mat4.arcFromForward(arcMat, diff);
    mat4.getRotation(arcQuat, arcMat);
    vec3.set(scale, sourceScale[0], sourceScale[1], length);
    vec3.set(mid, transform[12] + diff[0] / 2, transform[13] + diff[1] / 2, transform[14] + diff[2] / 2);

    mat4.fromRotationTranslationScale(out, arcQuat, mid, scale);
    mat4.fromQuat(srcRotMat, sourceRotation);
    // Carbon (row-vector): srcRotation * stretchTransform - source rotation first.
    return mat4.multiply(out, out, srcRotMat);
  }

  /**
   * Binds the vector function sampled at the frame time for the stretch
   * endpoint; a nullish value clears it and leaves the SetDestPosition fallback
   * in effect.
   */
  @carbon.method
  @impl.implemented
  SetDest(dest)
  {
    this.dest = dest ?? null;
  }

  /**
   * Copies the fallback stretch endpoint used when no destination vector
   * function is bound, or before one yields a value.
   */
  @carbon.method
  @impl.implemented
  SetDestPosition(destPosition)
  {
    vec3.copy(this.#destPosition, destPosition);
  }

  static #scratch = {
    sourceRotation: quat.create(),
    sourceTranslation: vec3.create(),
    sourceScale: vec3.create(),
    end: vec3.create(),
    diff: vec3.create(),
    arcMat: mat4.create(),
    arcQuat: quat.create(),
    scale: vec3.create(),
    mid: vec3.create(),
    srcRotMat: mat4.create()
  };

}
