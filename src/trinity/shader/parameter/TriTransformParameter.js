// Source: trinity/trinity/Shader/Parameter/TriTransformParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { CjsParameter } from "./CjsParameter.js";
import { TriTransformBase } from "#consts/graphics";

/** Composes authored translation, rotation, scale, and transform-base state into the matrix uploaded to a shader constant. */
@type.define({ className: "TriTransformParameter", family: "shader" })
export class TriTransformParameter extends CjsParameter
{

  /** m_transformBase (TRITRANSFORMBASE - enum TRITRANSFORMBASE) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("TRITRANSFORMBASE")
  transformBase = 0;

  /** m_rotationCenter (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  rotationCenter = vec3.create();

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  translation = vec3.create();

  /** m_worldTransform (Matrix) [READWRITE, PERSIST] */
  @io.persist
  @type.mat4
  worldTransform = mat4.create();

  /** The shader constant name the composed transform matrix is uploaded to. */
  @carbon.method
  @impl.implemented
  GetParameterName()
  {
    return this.name;
  }

  /**
   * Content hash: transform base + translation/scaling/rotation bytes, then
   * name (Carbon hashes the contiguous transform-state struct region).
   */
  @carbon.method
  @impl.adapted
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    startingHash = CjsParameter.hashFnv1Floats([this.transformBase], startingHash);
    startingHash = CjsParameter.hashFnv1Floats(this.translation, startingHash);
    startingHash = CjsParameter.hashFnv1Floats(this.scaling, startingHash);
    startingHash = CjsParameter.hashFnv1Floats(this.rotation, startingHash);
    return CjsParameter.hashFnv1String(this.name, startingHash);
  }

  /** Carbon TriTransformParameter::CopyValueToEffect
   * (TriTransformParameter.cpp:30-66) builds the 6-arg TransformationMatrix
   * (math Matrix.cpp:66-143, scalingCenter NULL): row-vector
   * S * T(-rotationCenter) * R * T(rotationCenter + translation) - the scale
   * is about the TRUE ORIGIN while only the rotation pivots on
   * m_rotationCenter (translation bytes: t + rc - R*rc, rc UNSCALED). NOT
   * gl-matrix's fromRotationTranslationScaleOrigin, which scales about the
   * origin point too (t + o - R*(S*o)) - the two differ whenever
   * scaling != 1 and rotationCenter != 0. gl column order:
   * T(rc + t) * R * T(-rc) * S. NOTE: Carbon's TRITB_OBJECT branch
   * (cpp:48-66) additionally multiplies in the object world matrix - an
   * unported composition (the JS treats every non-FIXED base as the zeroed
   * inverse view only); when ported it must swap per the convention. */
  @carbon.method
  @impl.adapted
  CopyValueToEffect(_inputType, dest, size = 64, context = null)
  {
    const transform = mat4.create();
    const rotationCenter = this.rotationCenter;
    // gl column build of T(rc + t) * R * T(-rc) * S, right-to-left:
    mat4.fromQuat(transform, this.rotation);
    mat4.translate(transform, transform, [-rotationCenter[0], -rotationCenter[1], -rotationCenter[2]]);
    mat4.scale(transform, transform, this.scaling);
    transform[12] += rotationCenter[0] + this.translation[0];
    transform[13] += rotationCenter[1] + this.translation[1];
    transform[14] += rotationCenter[2] + this.translation[2];
    const base = context?.inverseViewTransform ?? context?.GetInverseViewTransform?.() ?? null;
    if (base && this.transformBase !== 0)
    {
      const baseTransform = mat4.clone(base);
      baseTransform[12] = 0;
      baseTransform[13] = 0;
      baseTransform[14] = 0;
      // Carbon (row-vector): texTransform *= original - the base transform
      // applies first, the authored SRT last.
      mat4.multiply(transform, transform, baseTransform);
    }
    const out = mat4.create();
    mat4.transpose(out, transform);
    const count = Math.min(16, Math.floor(Number(size) / 4) || 16, dest?.length ?? 16);
    for (let i = 0; i < count; i++)
    {
      dest[i] = out[i];
    }
  }

  static TRITRANSFORMBASE = TriTransformBase;

}
