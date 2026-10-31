// Source: trinity/trinity/Controllers/Finalizers/ITr2StateMachineStateFinalizer.h
//
// The contract a state finalizer answers to. Until 2026-09-05 this file was a
// one-line `export {};` - re-exported from the barrel and listed in the
// generated summary, so it READ as ported while declaring nothing. Carbon
// gives Link and Unlink EMPTY BODIES and makes only CanTransition pure
// virtual, which is why Tr2StateMachineState's calls into its finalizer were
// hedged: the hedge was emulating the empty bodies one call site at a time.

import { CjsSchema, meta } from "#schema";
import { IRoot } from "../../../global/blue/IRoot.js";


/** Contract for an object that holds a state machine in its current state. */
export class ITr2StateMachineStateFinalizer extends IRoot
{

  /**
   * Attaches this finalizer to the controller whose state it gates.
   *
   * @adapted
   * @param {object} _controller The owning controller.
   */

  @meta.adapted
  Link(_controller)
  {
  }

  /**
   * Detaches this finalizer, dropping every reference to the controller.
   *
   * @adapted
   */

  @meta.adapted
  Unlink()
  {
  }

  /**
   * Whether the owning state may transition away.
   *
   * THE ONE METHOD CARBON MAKES PURE VIRTUAL: a finalizer exists precisely to
   * answer this, so there is no sensible default.
   *
   * @abstract
   * @param {object} _controller The owning controller.
   * @returns {boolean} Whether the state machine may leave the current state.
   */
  @meta.abstract
  CanTransition(_controller) {}
}


CjsSchema.exposure.inherit(IRoot)(ITr2StateMachineStateFinalizer);
CjsSchema.exposure.interface("ITr2StateMachineStateFinalizer")(ITr2StateMachineStateFinalizer);
