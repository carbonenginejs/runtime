import { exposure as be } from "#be";
import { IRoot } from "../../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/IEveProceduralSelectionMethod.h
import { meta, blue } from "#schema";


/** Required procedural-child selection contract. */
@be.interface("IEveProceduralSelectionMethod")
@be.inherit(IRoot)
export class IEveProceduralSelectionMethod extends IRoot
{

  /** Updates the procedural selection method during the asynchronous phase. */
  @be.abstract
  UpdateAsyncronous(_updateContext) {}

  /** Reports whether the selected child changed. */
  @be.abstract
  IsSelectedChildModified() {}

  /** Returns the volumes used to visualize this selection method. */
  @be.abstract
  GetDebugVolumes(_out) {}

  /** Returns the currently selected child reference. */
  @be.abstract
  GetSelectedChild() {}

  /** Accepts an optional procedural-selection variable. */

  @meta.noop
  SetProceduralMethodVariable(_name, _value)
  {
  }

  /** Returns Carbon's default procedural-selection variable result. */

  @meta.implemented
  GetProceduralMethodVariable(_name)
  {
    return "not Implemented";
  }

}
