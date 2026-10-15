// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocatorSets.h
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocatorSets.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";
import { MatrixCopyFrom3x4 } from "../lights/lightConversion.js";
import { Locator } from "./Locator.js";

/** Locator's struct members (Locator.js), copied by value. */
const LOCATOR_FIELDS = [ "position", "direction", "scale", "boneIndex", "partTag" ];

const UNIT_Y = vec3.fromValues(0, 1, 0);
const POSE_BONE_SCRATCH = mat4.create();

/**
 * Resolves a locator to its posed position and direction, transformed by the
 * animation updater's mesh bone when the locator is bone-attached.
 *
 * Carbon `EveGetLocatorPose` (EveLocatorSets.cpp:11-27). The direction is +Y
 * rotated by the authored quaternion, and is deliberately NOT normalized here -
 * the merged-damage caller in EveSpaceObject2 normalizes after its own
 * transform, and other callers take the raw basis-transformed value.
 *
 * Adapted: Carbon applies a bone only when `boneIndex > 0` (cpp:20; CE-27), so
 * a locator on binding 0 keeps its authored place. Binding 0 is a mesh bone
 * binding and can be animated - the Bowhead (orecs2_t1) moves its MASTER
 * binding through Normal2Warp, and child meshes on bone 0 were seen to stay
 * behind (operator, 2026-10-14) - so ours applies bone 0 like any other; -1
 * stays no bone.
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

  if (locator.boneIndex >= 0 && animationUpdater && animationUpdater.IsInitialized() &&
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
@blue.define("EveLocatorSets")
export class EveLocatorSets
{
  @blue.read
  @blue.persist
  @type.structList("Locator")
  locators = [];

  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /**
   * Shifts the position of every locator in the set by an offset, doing nothing
   * for a zero offset.
   */
  @blue.method
  @meta.implemented
  Translate(offset)
  {
    if (EveLocatorSets._lengthSq(offset) === 0)
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
  @blue.method
  @meta.adapted
  Append(locators)
  {
    for (const locator of locators)
    {
      this.locators.push(EveLocatorSets._copyLocator(locator));
    }
  }

  /**
   * Reports whether the set carries exactly this name; set lookups are an exact
   * string match.
   */
  @blue.method
  @meta.implemented
  HasName(name)
  {
    return this.name === String(name);
  }

  /** Returns the set's live locator list, not a copy. */
  @blue.method
  @meta.implemented
  GetLocators()
  {
    return this.locators;
  }

  /** Returns the name callers look this set up by. */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the name callers look this set up by, coercing the value to a string. */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Replaces both the set name and its whole locator list with copies of the
   * given locators.
   */
  @blue.method
  @meta.adapted
  Set(name, locators)
  {
    this.SetName(name);
    this.locators = locators.map(locator => EveLocatorSets._copyLocator(locator));
  }

  /**
   * A Locator copied by value from a Locator or any record carrying its fields,
   * as Carbon assigns `(Locator)locators[i]` (EveLocatorSets.h:58-68). A field
   * the record lacks keeps Locator's default.
   *
   * @param {object} source The locator to copy.
   * @returns {Locator} The copy.
   */
  static _copyLocator(source)
  {
    const locator = new Locator();
    for (const name of LOCATOR_FIELDS)
    {
      if (!(name in source)) continue;
      const value = source[name];
      if (ArrayBuffer.isView(locator[name])) locator[name].set(value);
      else locator[name] = value;
    }
    return locator;
  }

  /**
   * Squared length of a three-component value, used to test an offset for being
   * zero without a square root.
   */
  static _lengthSq(value)
  {
    return value[0] * value[0] + value[1] * value[1] + value[2] * value[2];
  }
}
