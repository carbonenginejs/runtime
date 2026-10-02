// Source: trinity/trinity/Tr2VisibilityResults.h
//   trinity/trinity/Tr2VisibilityResults.cpp
//   trinity/trinity/Tr2VisibilityResults_Blue.cpp

import { meta } from "#schema";

/**
 * Collects the visibility events a visibility executor emits, for the interior
 * and portal consumers to read back.
 */
@meta.define({ className: "Tr2VisibilityResults", family: "trinityCore" })
export class Tr2VisibilityResults
{

  // Carbon's m_events is private transient execution state, not Blue data.
  #events = [];

  /** Adds the value-like visibility event emitted by a visibility executor. */
  @meta.blue.method
  @meta.adapted
  AddVisibilityEvent(event)
  {
    this.#events.push(event);
  }

  /** Returns a detached container view of the current visibility events. */
  @meta.blue.method
  @meta.adapted
  GetEvents()
  {
    return this.#events.slice();
  }

  /** Clears the result set. */
  @meta.blue.method
  @meta.implemented
  Clear()
  {
    this.#events.length = 0;
  }

  /** Gets the number of visibility events in the result set. */
  @meta.blue.method
  @meta.implemented
  GetNumVisibilityEvents()
  {
    return this.#events.length;
  }

}
