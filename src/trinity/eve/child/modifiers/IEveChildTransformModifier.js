// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/IEveChildTransformModifier.h
import { meta } from "#schema";


/** Required child-transform modifier contract. */
@meta.define({ className: "IEveChildTransformModifier", family: "eve/child/modifiers" })
export class IEveChildTransformModifier
{

  /** Applies this modifier to a child transform. */
  @meta.blue.method
  @meta.abstract
  ApplyTransform(_localTransform, _worldTransform, _parentTransform, _perObjectData)
  {
    throw new Error("IEveChildTransformModifier.ApplyTransform must be implemented by a concrete modifier.");
  }

}
