// Source: trinity/trinity/Eve/IEveSpaceObject2.h
//
// The contract every top-level scene object answers to: everything
// EveSpaceScene holds in `objects`, `uiObjects`, `backgroundObjects` and
// `warpTunnel`. Carbon makes the frame-pass nine PURE VIRTUAL - the scene
// drives them unhedged every frame - and gives the remaining nine defaulted
// bodies (mostly empty; IsPickable answers true, IsAudioOccluder false,
// GetWorldVelocity writes zero).
//
// TWO RULES THE MIXIN MUST KEEP, both learned from live call sites:
// - The defaulted nine get CONCRETE default bodies, never throws.
//   EveChildContainer and the smart-light expression bucket already call
//   GetWorldVelocity through a duck guard on every space-object parent; a
//   throwing default would convert those working fallbacks into live errors.
// - Nothing here installs `Update`, `UpdateSynchronous` or `UpdateAsynchronous`
//   (the English spellings): the stretch family defines those as its own
//   forwarding surface, probed with `typeof`, and a stub would flip the probe.

import { CjsSchema, impl } from "#schema";
import { Adopt, Brand } from "../controllers/ITr2Controller.js";
import { vec3 } from "#math/vec3";


const IEVE_SPACE_OBJECT_2 = Symbol.for("carbonenginejs.contract.IEveSpaceObject2");

const SPACE_OBJECT_ABSTRACTS = [
  "UpdateSyncronous", "UpdateAsyncronous", "UpdateVisibility", "GetRenderables",
  "GetBoundingSphere", "UpdateModelCenterWorldPosition", "GetModelCenterWorldPosition",
  "GetLocalBoundingBox", "GetLocalToWorldTransform"
];
const SPACE_OBJECT_NOOPS = [
  "RegisterWithQuadRenderer", "AddQuadsToQuadRenderer", "GetPerObjectStructs",
  "SetProceduralContainerVariable", "GetParentData", "InvalidateMergedLocators"
];
const SPACE_OBJECT_DEFAULTS = [ "GetWorldVelocity", "IsPickable", "IsAudioOccluder" ];


/** Contract for a top-level object an EveSpaceScene drives each frame. */
export class IEveSpaceObject2
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[IEVE_SPACE_OBJECT_2] === true;
  }

  /**
   * Runs the frame work that must happen on the sim thread, in order.
   *
   * @param {object} _updateContext The frame's EveUpdateContext.
   */
  UpdateSyncronous(_updateContext)
  {
    throw new Error("IEveSpaceObject2.UpdateSyncronous must be implemented by a space object.");
  }

  /**
   * Runs the frame work Carbon may run in parallel.
   *
   * @param {object} _updateContext The frame's EveUpdateContext.
   */
  UpdateAsyncronous(_updateContext)
  {
    throw new Error("IEveSpaceObject2.UpdateAsyncronous must be implemented by a space object.");
  }

  /**
   * Decides frame visibility against the frustum.
   *
   * @param {object} _updateContext The frame's EveUpdateContext.
   * @param {Float32Array} _parentTransform The parent's world transform.
   */
  UpdateVisibility(_updateContext, _parentTransform)
  {
    throw new Error("IEveSpaceObject2.UpdateVisibility must be implemented by a space object.");
  }

  /**
   * Appends this object's renderables for the frame.
   *
   * @param {Array} _renderables Collected renderables.
   * @param {object} [_impostors] The impostor manager, when one exists.
   */
  GetRenderables(_renderables, _impostors)
  {
    throw new Error("IEveSpaceObject2.GetRenderables must be implemented by a space object.");
  }

  /**
   * Writes the world-space bounding sphere.
   *
   * @param {Float32Array} _sphere Receives centre xyz and radius w.
   * @param {number} [_query] A BoundingSphereQuery.
   * @returns {boolean} Whether a sphere was written.
   */
  GetBoundingSphere(_sphere, _query)
  {
    throw new Error("IEveSpaceObject2.GetBoundingSphere must be implemented by a space object.");
  }

  /**
   * Updates the model/ball position and writes its world position.
   *
   * @param {Float32Array} _position Receives the position.
   * @param {number} _time Sim seconds.
   */
  UpdateModelCenterWorldPosition(_position, _time)
  {
    throw new Error("IEveSpaceObject2.UpdateModelCenterWorldPosition must be implemented by a space object.");
  }

  /**
   * Writes the model centre's world position without updating the object.
   *
   * @param {Float32Array} _position Receives the position.
   */
  GetModelCenterWorldPosition(_position)
  {
    throw new Error("IEveSpaceObject2.GetModelCenterWorldPosition must be implemented by a space object.");
  }

  /**
   * Writes a local-space AABB when the object can supply one.
   *
   * @param {Float32Array} _min Receives the minimum corner.
   * @param {Float32Array} _max Receives the maximum corner.
   * @returns {boolean} Whether a box was written.
   */
  GetLocalBoundingBox(_min, _max)
  {
    throw new Error("IEveSpaceObject2.GetLocalBoundingBox must be implemented by a space object.");
  }

  /**
   * Writes the local-to-world transform.
   *
   * @param {Float32Array} _transform Receives the matrix.
   */
  GetLocalToWorldTransform(_transform)
  {
    throw new Error("IEveSpaceObject2.GetLocalToWorldTransform must be implemented by a space object.");
  }

  /**
   * Writes the object's world velocity; a static object writes zero.
   *
   * @param {Float32Array} velocity Receives the velocity.
   */
  GetWorldVelocity(velocity)
  {
    vec3.set(velocity, 0, 0, 0);
  }

  /**
   * Registers this object and its attachments with the quad renderer.
   *
   * @param {object} _quadRenderer The scene's quad renderer.
   */
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /**
   * Adds this object's quads for the frame; Carbon calls this in parallel.
   *
   * @param {object} _frustum The frame's frustum.
   * @param {object} _quadRenderer The scene's quad renderer.
   */
  AddQuadsToQuadRenderer(_frustum, _quadRenderer)
  {
  }

  /**
   * Fills the per-object VS and PS constant structs.
   *
   * @param {object} _vsData Receives EveSpaceObjectVSData.
   * @param {object} _psData Receives EveSpaceObjectPSData.
   */
  GetPerObjectStructs(_vsData, _psData)
  {
  }

  /**
   * Whether picking may hit this object.
   *
   * @returns {boolean} True unless the object opts out.
   */
  IsPickable()
  {
    return true;
  }

  /**
   * Whether this object occludes audio.
   *
   * @returns {boolean} False unless the object opts in.
   */
  IsAudioOccluder()
  {
    return false;
  }

  /**
   * Sets one named variable on the object's procedural containers.
   *
   * @param {string} _name The variable's name.
   * @param {number} _value Its new value.
   */
  SetProceduralContainerVariable(_name, _value)
  {
  }

  /**
   * Fills the ParentData record passed down to children.
   *
   * @param {object} _parentData Receives the record.
   */
  GetParentData(_parentData)
  {
  }

  /**
   * Invalidates merged locator state after a structural change.
   *
   * @param {number} _reason A LocatorInvalidationReason.
   */
  InvalidateMergedLocators(_reason)
  {
  }
}


Brand(IEveSpaceObject2, IEVE_SPACE_OBJECT_2, SPACE_OBJECT_NOOPS, SPACE_OBJECT_ABSTRACTS);
for (const name of SPACE_OBJECT_DEFAULTS) CjsSchema.decorateMethod(IEveSpaceObject2, name, impl.implemented);
CjsSchema.define(IEveSpaceObject2, { className: "IEveSpaceObject2" });


/**
 * Adds the IEveSpaceObject2 contract without replacing an existing model base.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying the contract.
 */
export function withIEveSpaceObject2(Base)
{
  const SpaceObject = Adopt(
    Base,
    IEveSpaceObject2,
    [ ...SPACE_OBJECT_ABSTRACTS, ...SPACE_OBJECT_NOOPS, ...SPACE_OBJECT_DEFAULTS ]
  );

  Brand(SpaceObject, IEVE_SPACE_OBJECT_2, SPACE_OBJECT_NOOPS, SPACE_OBJECT_ABSTRACTS);
  for (const name of SPACE_OBJECT_DEFAULTS) CjsSchema.decorateMethod(SpaceObject, name, impl.implemented);

  return SpaceObject;
}
