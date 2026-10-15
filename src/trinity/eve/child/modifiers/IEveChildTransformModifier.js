import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/IEveChildTransformModifier.h
import { meta, blue } from "#schema";


/** Required child-transform modifier contract. */
@blue.define("IEveChildTransformModifier")
@blue.inherit(IRoot)
export class IEveChildTransformModifier
{

  /** Applies this modifier to a child transform. */
  @blue.method
  @meta.abstract
  ApplyTransform(_localTransform, _worldTransform, _parentTransform, _perObjectData)
  {
    throw new Error("IEveChildTransformModifier.ApplyTransform must be implemented by a concrete modifier.");
  }

}
