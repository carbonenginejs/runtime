// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocatorSets.h
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocatorSets.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { MatrixCopyFrom3x4 } from "../lights/lightConversion.js";
import { Locator } from "./Locator.js";

const UNIT_Y = vec3.fromValues(0, 1, 0);
const POSE_BONE_SCRATCH = mat4.create();

/**
 * Resolves a locator to its posed position and direction, transformed by the
 * animation updater's mesh bone when the locator is bone-attached.
 *
 * Carbon `EveGetLocatorPose` (EveLocatorSets.cpp:11-27). The direction is +Y
 * rotated by the authored quaternion. Carbon assumes bone 0 is unanimated for
 * performance, so only `boneIndex > 0` applies a bone matrix, and the
 * direction is deliberately NOT normalized here - the merged-damage caller in
 * EveSpaceObject2 normalizes after its own transform, and other callers take
 * the raw basis-transformed value.
 *
 * @param {Float32Array} outPosition - receives the object-space position
 * @param {Float32Array} outDirection - receives the unnormalized direction
 * @param {Object|null} animationUpdater - Tr2GrannyAnimation or null
 * @param {Object} locator - a Locator record
 */
export function EveGetLocatorPose(outPosition, outDirection, animationUpdater, locator)
{
  vec3.copy(outPosition, locator.position);
  vec3.transformQuat(outDirection, UNIT_Y, locator.direction);

  if (locator.boneIndex > 0 && animationUpdater && animationUpdater.IsInitialized() &&
    locator.boneIndex < animationUpdater.GetMeshBoneCount())
  {
    const bones = animationUpdater.GetMeshBoneMatrixList();
    // Carbon leaves the outputs caller-uninitialized when the palette is
    // absent; CarbonEngineJS keeps the unskinned values instead.
    if (!bones || (locator.boneIndex + 1) * 12 > bones.length) return;
    MatrixCopyFrom3x4(POSE_BONE_SCRATCH, bones, locator.boneIndex);
    vec3.transformMat4(outPosition, locator.position, POSE_BONE_SCRATCH);
    const [ x, y, z ] = outDirection;
    outDirection[0] = POSE_BONE_SCRATCH[0] * x + POSE_BONE_SCRATCH[4] * y + POSE_BONE_SCRATCH[8] * z;
    outDirection[1] = POSE_BONE_SCRATCH[1] * x + POSE_BONE_SCRATCH[5] * y + POSE_BONE_SCRATCH[9] * z;
    outDirection[2] = POSE_BONE_SCRATCH[2] * x + POSE_BONE_SCRATCH[6] * y + POSE_BONE_SCRATCH[10] * z;
  }
}


/**
 * Named group of locators that a space object publishes for turrets, effects and
 * distributions to attach to.
 */
@type.define({
  className: "EveLocatorSets",
  family: "eve/utils"
})
export class EveLocatorSets extends CjsModel
{
  @io.persist
  @type.list("Locator")
  locators = [];

  @io.persist
  @type.string
  name = "";

  /**
   * Shifts the position of every locator in the set by an offset, doing nothing
   * for a zero offset.
   */
  @carbon.method
  @impl.implemented
  Translate(offset)
  {
    if (EveLocatorSets.#lengthSq(offset) === 0)
    {
      return;
    }
    for (const locator of this.locators)
    {
      vec3.add(locator.position, locator.position, offset);
    }
  }

  /**
   * Appends copies of the given locators, so the set never aliases the caller's
   * records.
   */
  @carbon.method
  @impl.adapted
  Append(locators)
  {
    for (const locator of locators)
    {
      this.locators.push(Locator.from(locator));
    }
  }

  /**
   * Reports whether the set carries exactly this name; set lookups are an exact
   * string match.
   */
  @carbon.method
  @impl.implemented
  HasName(name)
  {
    return this.name === String(name);
  }

  /** Returns the set's live locator list, not a copy. */
  @carbon.method
  @impl.implemented
  GetLocators()
  {
    return this.locators;
  }

  /** Returns the name callers look this set up by. */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the name callers look this set up by, coercing the value to a string. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Replaces both the set name and its whole locator list with copies of the
   * given locators.
   */
  @carbon.method
  @impl.adapted
  Set(name, locators)
  {
    this.SetName(name);
    this.locators = locators.map(locator => Locator.from(locator));
  }

  /**
   * Overwrites the locator at an index from a plain value, defaulting a missing
   * scale to zero and a missing bone index to 0; an index outside the list is
   * ignored.
   */
  @carbon.method
  @impl.adapted
  SetLocator(index, value)
  {
    const existing = this.locators[index];
    if (existing)
    {
      existing.SetValues({
        position: value.position,
        direction: value.direction,
        scale: value.scale ?? [0, 0, 0],
        boneIndex: value.boneIndex ?? 0
      });
    }
  }

  /**
   * Squared length of a three-component value, used to test an offset for being
   * zero without a square root.
   */
  static #lengthSq(value)
  {
    return value[0] * value[0] + value[1] * value[1] + value[2] * value[2];
  }
}
