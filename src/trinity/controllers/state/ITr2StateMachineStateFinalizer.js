// Source: trinity/trinity/Controllers/Finalizers/ITr2StateMachineStateFinalizer.h
//
// The contract a state finalizer answers to. Until 2026-09-05 this file was a
// one-line `export {};` - re-exported from the barrel and listed in the
// generated summary, so it READ as ported while declaring nothing. Carbon
// gives Link and Unlink EMPTY BODIES and makes only CanTransition pure
// virtual, which is why Tr2StateMachineState's calls into its finalizer were
// hedged: the hedge was emulating the empty bodies one call site at a time.

import { CjsSchema } from "#schema";
import { Adopt, Brand } from "../ITr2Controller.js";


const ITR2_STATE_MACHINE_STATE_FINALIZER = Symbol.for("carbonenginejs.contract.ITr2StateMachineStateFinalizer");

const FINALIZER_NOOPS = [ "Link", "Unlink" ];
const FINALIZER_ABSTRACTS = [ "CanTransition" ];


/** Contract for an object that holds a state machine in its current state. */
export class ITr2StateMachineStateFinalizer
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITR2_STATE_MACHINE_STATE_FINALIZER] === true;
  }

  /**
   * Attaches this finalizer to the controller whose state it gates.
   *
   * @param {object} _controller The owning controller.
   */
  Link(_controller)
  {
  }

  /** Detaches this finalizer, dropping every reference to the controller. */
  Unlink()
  {
  }

  /**
   * Whether the owning state may transition away.
   *
   * THE ONE METHOD CARBON MAKES PURE VIRTUAL: a finalizer exists precisely to
   * answer this, so there is no sensible default.
   *
   * @param {object} _controller The owning controller.
   * @returns {boolean} Whether the state machine may leave the current state.
   */
  CanTransition(_controller)
  {
    throw new Error("ITr2StateMachineStateFinalizer.CanTransition must be implemented by a finalizer.");
  }
}


Brand(ITr2StateMachineStateFinalizer, ITR2_STATE_MACHINE_STATE_FINALIZER, FINALIZER_NOOPS, FINALIZER_ABSTRACTS);
CjsSchema.define(ITr2StateMachineStateFinalizer, { className: "ITr2StateMachineStateFinalizer" });


/**
 * Adds the ITr2StateMachineStateFinalizer contract without replacing an
 * existing model base.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying the contract.
 */
export function withITr2StateMachineStateFinalizer(Base)
{
  const Finalizer = Adopt(Base, ITr2StateMachineStateFinalizer, [ ...FINALIZER_NOOPS, ...FINALIZER_ABSTRACTS ]);

  Brand(Finalizer, ITR2_STATE_MACHINE_STATE_FINALIZER, FINALIZER_NOOPS, FINALIZER_ABSTRACTS);

  return Finalizer;
}
