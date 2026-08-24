// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/IEveChildTransformModifier.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Required child-transform modifier contract. */
@type.define({ className: "IEveChildTransformModifier", family: "eve/child/modifiers" })
export class IEveChildTransformModifier extends CjsModel
{

  /** Applies this modifier to a child transform. */
  @carbon.method
  @impl.abstract
  ApplyTransform(_localTransform, _worldTransform, _parentTransform, _perObjectData)
  {
    throw new Error("IEveChildTransformModifier.ApplyTransform must be implemented by a concrete modifier.");
  }

}
