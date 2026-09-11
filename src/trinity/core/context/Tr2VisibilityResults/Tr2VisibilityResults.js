// Source: trinity/trinity/Tr2VisibilityResults.h
//   trinity/trinity/Tr2VisibilityResults.cpp
//   trinity/trinity/Tr2VisibilityResults_Blue.cpp

import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";

/**
 * Collects the visibility events a visibility executor emits, for the interior
 * and portal consumers to read back.
 */
@type.define({ className: "Tr2VisibilityResults", family: "trinityCore" })
export class Tr2VisibilityResults extends CjsModel
{

  // Carbon's m_events is private transient execution state, not Blue data.
  #events = [];

  /** Adds the value-like visibility event emitted by a visibility executor. */
  @carbon.method
  @impl.adapted
  AddVisibilityEvent(event)
  {
    this.#events.push(event);
  }

  /** Returns a detached container view of the current visibility events. */
  @carbon.method
  @impl.adapted
  GetEvents()
  {
    return this.#events.slice();
  }

  /** Clears the result set. */
  @carbon.method
  @impl.implemented
  Clear()
  {
    this.#events.length = 0;
  }

  /** Gets the number of visibility events in the result set. */
  @carbon.method
  @impl.implemented
  GetNumVisibilityEvents()
  {
    return this.#events.length;
  }

}
