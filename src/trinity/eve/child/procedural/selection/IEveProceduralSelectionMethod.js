// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/IEveProceduralSelectionMethod.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Required procedural-child selection contract. */
@type.define({ className: "IEveProceduralSelectionMethod", family: "eve/child/procedural" })
export class IEveProceduralSelectionMethod extends CjsModel
{

  /** Updates the procedural selection method during the asynchronous phase. */
  @carbon.method
  @impl.abstract
  UpdateAsyncronous(_updateContext)
  {
    throw new Error("IEveProceduralSelectionMethod.UpdateAsyncronous must be implemented by a concrete selection method.");
  }

  /** Reports whether the selected child changed. */
  @carbon.method
  @impl.abstract
  IsSelectedChildModified()
  {
    throw new Error("IEveProceduralSelectionMethod.IsSelectedChildModified must be implemented by a concrete selection method.");
  }

  /** Returns the volumes used to visualize this selection method. */
  @carbon.method
  @impl.abstract
  GetDebugVolumes(_out)
  {
    throw new Error("IEveProceduralSelectionMethod.GetDebugVolumes must be implemented by a concrete selection method.");
  }

  /** Returns the currently selected child reference. */
  @carbon.method
  @impl.abstract
  GetSelectedChild()
  {
    throw new Error("IEveProceduralSelectionMethod.GetSelectedChild must be implemented by a concrete selection method.");
  }

  /** Accepts an optional procedural-selection variable. */
  @carbon.method
  @impl.noop
  SetProceduralMethodVariable(_name, _value)
  {
  }

  /** Returns Carbon's default procedural-selection variable result. */
  @carbon.method
  @impl.implemented
  GetProceduralMethodVariable(_name)
  {
    return "not Implemented";
  }

}
