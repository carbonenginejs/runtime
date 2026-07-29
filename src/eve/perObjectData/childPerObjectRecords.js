// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildMesh.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildContainer.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBehaviorSystem.cpp
//
// The per-object record pair every space-object CHILD keeps.
//
// Carbon declares an identical `EveSpaceObjectVSData m_vsData` /
// `EveSpaceObjectPSData m_psData` pair on EveChildMesh, EveChildContainer and
// EveChildBehaviorSystem, constructs them the same way, and fills them with the
// same three-step block: inherit the parent's structs, rebase the clip data by
// the child's own translation, then stamp the child's transforms. The block is
// shared here rather than copied four times; the records themselves stay owned
// by each class, as Carbon has them.
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

import { RawData } from "../../trinityCore/rawData/RawData.js";


const INVERSE_SCRATCH = mat4.create();

const CLIP_SCRATCH = vec3.create();

/** Carbon fills the whole field then overwrites x/y, so the tail is 0. */
const DEFAULT_SHIP_DATA = Object.freeze([ 0, 1, 0, 1 ]);

/** m_psData.screenSize default (EveChildMesh.cpp:65). */
const DEFAULT_SCREEN_SIZE = Object.freeze([ 0.5, 0.5, 0.5, 1 ]);


/**
 * A child's persistent record pair, with Carbon's constructor defaults applied:
 * shipData.y and .w are 1, and the PS record starts at a half screen size.
 * @returns {{vs: RawData, ps: RawData}}
 */
export function createChildPerObjectRecords()
{
  const vs = RawData.create("EveSpaceObjectVSData");
  const ps = RawData.create("EveSpaceObjectPSData");

  vs.Set("shipData", DEFAULT_SHIP_DATA);
  ps.Set("shipData", DEFAULT_SHIP_DATA);
  ps.Set("screenSize", DEFAULT_SCREEN_SIZE);

  return { vs, ps };
}


/**
 * Inherit the parent hull's per-object values, then move the clip data
 * inversely to the child's own translation so the clip sphere stays put in
 * world space (EveChildMesh.cpp:933-941).
 *
 * @param {{vs: RawData, ps: RawData}} records - the child's own pair
 * @param {Object} parent - anything exposing GetPerObjectStructs
 * @param {Float32Array} translation - the child's local translation
 * @returns {Boolean} false when the parent cannot supply structs
 */
export function inheritParentPerObjectData(records, parent, translation)
{
  if (typeof parent?.GetPerObjectStructs !== "function")
  {
    return false;
  }

  parent.GetPerObjectStructs(records.vs, records.ps);

  const clipData = records.vs.Get("clipData");
  records.vs.Set("clipData", [
    clipData[0] - translation[0],
    clipData[1] - translation[1],
    clipData[2] - translation[2],
    clipData[3]
  ]);

  vec3.subtract(CLIP_SCRATCH, records.ps.Get("clipSphereCenter"), translation);
  records.ps.Set("clipSphereCenter", CLIP_SCRATCH);

  return true;
}


/**
 * Stamp the child's own transforms into both records (EveChildMesh.cpp:948-954).
 *
 * Carbon writes `invWorldTransform = Inverse( m_vsData.worldTransform )` - the
 * inverse of the ALREADY-TRANSPOSED matrix. By carbon-math-conventions F2 that
 * equals Transpose(Inverse(W)), so inverting the LOGICAL transform and letting
 * SetAndTranspose encode it produces the same bytes with one transpose less.
 *
 * @param {{vs: RawData, ps: RawData}} records - the child's own pair
 * @param {Float32Array} worldTransform - logical world transform
 * @param {Float32Array} lastWorldTransform - logical previous world transform
 */
export function stampChildTransforms(records, worldTransform, lastWorldTransform)
{
  if (!mat4.invert(INVERSE_SCRATCH, worldTransform))
  {
    mat4.identity(INVERSE_SCRATCH);
  }

  for (const record of [ records.vs, records.ps ])
  {
    record.SetAndTranspose("worldTransform", worldTransform);
    record.SetAndTranspose("worldTransformLast", lastWorldTransform);
    record.SetAndTranspose("invWorldTransform", INVERSE_SCRATCH);
  }
}
