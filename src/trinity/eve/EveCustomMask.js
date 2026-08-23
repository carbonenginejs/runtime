// Source: trinity/trinity/Eve/SpaceObject/Utils/EveCustomMask.h
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveCustomMask.cpp
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveCustomMask_Blue.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * One oriented box projected onto a hull that replaces a source material with a
 * chosen blend of target materials inside it.
 */
@type.define({ className: "EveCustomMask", family: "eve/spaceObject" })
export class EveCustomMask extends CjsModel
{
  static CUSTOM_MASK_COUNT = 2;

  @io.persist
  @type.boolean
  clampU = false;

  @io.persist
  @type.boolean
  clampV = false;

  @io.persist
  @type.vec3
  position = vec3.create();

  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @io.persist
  @type.quat
  rotation = quat.create();

  @io.persist
  @type.uint8
  materialIndex = 0;

  @io.persist
  @type.boolean
  isMirrored = false;

  @io.persist
  @type.vec4
  targetMaterials = vec4.fromValues(1, 1, 1, 1);

  /**
   * Assigns the mask's placement, mirroring, UV clamping, source material index
   * and target material weights in one call, substituting neutral defaults for
   * any argument that is missing.
   */
  @carbon.method
  @impl.adapted
  Setup(position, scaling, rotation, isMirrored, clampU, clampV, sourceMaterialID, targets)
  {
    vec3.copy(this.position, position || EveCustomMask.#zero);
    vec3.copy(this.scaling, scaling || EveCustomMask.#one);
    quat.copy(this.rotation, rotation || EveCustomMask.#identityRotation);
    this.isMirrored = !!isMirrored;
    this.clampU = !!clampU;
    this.clampV = !!clampV;
    this.materialIndex = Number(sourceMaterialID) & 0xff;
    vec4.copy(this.targetMaterials, targets || EveCustomMask.#one4);
    return true;
  }

  /**
   * Builds the box to draw when visualising this mask: the mask placement with its extents scaled by the owner's radius and flattened along X.
   * @param {Array} [out] - caller-owned mat4; a fresh matrix is allocated when omitted
   * @returns {Array} out
   */
  @carbon.method
  @impl.adapted
  GetDebugDrawMatrix(out = mat4.create(), objectRadius = 0)
  {
    const radius = Number(objectRadius) || 0;
    const scale = vec3.fromValues(0.1 * radius, this.scaling[1] * radius, this.scaling[2] * radius);
    return mat4.fromRotationTranslationScale(out, this.rotation, this.position, scale);
  }

  /**
   * Writes this mask into one of the two custom-mask slots of the per-object value structs: the transposed inverse placement plus the enable and mirror flags for the vertex stage, and the source material ID, target weights and UV clamps for the pixel stage. These are CPU-side value records; nothing is uploaded here.
   * @param {Number} index - custom-mask slot, 0 or 1
   * @returns {Boolean} false for an out-of-range slot, a missing struct, or a placement that cannot be inverted
   */
  @carbon.method
  @impl.adapted
  FillPerObjectData(index, vsData, psData)
  {
    if (!EveCustomMask.#isValidSlot(index) || !vsData || !psData)
    {
      return false;
    }
    // Carbon TransformationMatrix(scaling, rotation, position); gl takes
    // (rotation, translation, scale) - the same matrix, different argument order.
    const transform = mat4.fromRotationTranslationScale(mat4.create(), this.rotation, this.position, this.scaling);
    const inverse = mat4.invert(mat4.create(), transform);
    if (!inverse)
    {
      return false;
    }
    // Carbon stores Transpose(invCustomMaskTransform); SetAndTranspose performs
    // that, so the LOGICAL inverse is what gets passed.
    vsData.SetAndTransposeIndex("customMaskMatrix", index, inverse);
    vsData.SetIndex("customMaskData", index, [ 1, this.isMirrored ? 1 : 0, 0, 0 ]);
    psData.SetIndex("customMaskMaterialIDs", index, [ this.materialIndex, 0, 0, 0 ]);
    psData.SetIndex("customMaskTargets", index, this.targetMaterials);

    // customMaskClamps is ONE vec4 shared by both slots: slot n owns lanes
    // 2n and 2n+1 (EveCustomMask.cpp:80-81).
    const clamps = psData.Get("customMaskClamps");
    clamps[index * 2] = this.clampU ? 1 : 0;
    clamps[index * 2 + 1] = this.clampV ? 1 : 0;
    return true;
  }

  /**
   * Clears a custom-mask slot in the per-object value structs so the slot contributes nothing; the UV clamp values are left as they were.
   * @param {Number} index - custom-mask slot, 0 or 1
   * @returns {Boolean} false for an out-of-range slot or a missing struct
   */
  @carbon.method
  @impl.adapted
  static ZeroPerObjectData(index, vsData, psData)
  {
    if (!EveCustomMask.#isValidSlot(index) || !vsData || !psData)
    {
      return false;
    }
    // Carbon quirk (EveCustomMask.cpp:88-93): the zeroing path clears the
    // matrix, data, material IDs and targets but NOT customMaskClamps, so a
    // slot that stops being filled keeps its last clamp lanes. Reproduced.
    vsData.SetAndTransposeIndex("customMaskMatrix", index, EveCustomMask.#identity);
    vsData.SetIndex("customMaskData", index, EveCustomMask.#zero4);
    psData.SetIndex("customMaskMaterialIDs", index, EveCustomMask.#zero4);
    psData.SetIndex("customMaskTargets", index, EveCustomMask.#zero4);
    return true;
  }

  /** Whether an index addresses one of the two custom-mask slots. */
  static #isValidSlot(index)
  {
    return Number.isInteger(index) && index >= 0 && index < EveCustomMask.CUSTOM_MASK_COUNT;
  }

  /** A zeroed vec4, for the slot-clearing writes. */
  static #zero4 = vec4.create();

  /** Identity, for the cleared custom-mask matrix slot. */
  static #identity = mat4.create();

  static #zero = vec3.create();

  static #one = vec3.fromValues(1, 1, 1);

  static #identityRotation = quat.create();

  static #one4 = vec4.fromValues(1, 1, 1, 1);
}
