// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/IEveProceduralSelectionMethod.h
import { meta } from "#schema";


/** Required procedural-child selection contract. */
@meta.define({ className: "IEveProceduralSelectionMethod", family: "eve/child/procedural" })
export class IEveProceduralSelectionMethod
{

  /** Updates the procedural selection method during the asynchronous phase. */
  @meta.blue.method
  @meta.abstract
  UpdateAsyncronous(_updateContext)
  {
    throw new Error("IEveProceduralSelectionMethod.UpdateAsyncronous must be implemented by a concrete selection method.");
  }

  /** Reports whether the selected child changed. */
  @meta.blue.method
  @meta.abstract
  IsSelectedChildModified()
  {
    throw new Error("IEveProceduralSelectionMethod.IsSelectedChildModified must be implemented by a concrete selection method.");
  }

  /** Returns the volumes used to visualize this selection method. */
  @meta.blue.method
  @meta.abstract
  GetDebugVolumes(_out)
  {
    throw new Error("IEveProceduralSelectionMethod.GetDebugVolumes must be implemented by a concrete selection method.");
  }

  /** Returns the currently selected child reference. */
  @meta.blue.method
  @meta.abstract
  GetSelectedChild()
  {
    throw new Error("IEveProceduralSelectionMethod.GetSelectedChild must be implemented by a concrete selection method.");
  }

  /** Accepts an optional procedural-selection variable. */
  @meta.blue.method
  @meta.noop
  SetProceduralMethodVariable(_name, _value)
  {
  }

  /** Returns Carbon's default procedural-selection variable result. */
  @meta.blue.method
  @meta.implemented
  GetProceduralMethodVariable(_name)
  {
    return "not Implemented";
  }

}
