// Source: trinity/trinityal/include/Tr2RenderPassAL.h
//
// The two attachment descriptions `RenderPassHint` takes.
//
// Both default to DONT_CARE/DONT_CARE, which is Carbon's default and is the
// reason an empty `{}` reads as "this attachment is not part of the hint" at
// every call site in `EveSpaceScene.cpp`.

import { Tr2LoadAction, Tr2StoreAction } from "../../../global/consts/renderContext/index.js";


/** How a pass treats its depth attachment. */
export class Tr2DepthAttachment
{
  /** What the pass does with the existing depth. */
  load = Tr2LoadAction.DONT_CARE;

  /** Whether the resulting depth is written back. */
  store = Tr2StoreAction.DONT_CARE;

  /** The depth a CLEAR load starts from. */
  clearValue = 0;

  /**
   * @param {number} [load] A `Tr2LoadAction`.
   * @param {number} [store] A `Tr2StoreAction`.
   * @param {number} [clearValue] The depth a CLEAR starts from.
   */
  constructor(load = Tr2LoadAction.DONT_CARE, store = Tr2StoreAction.DONT_CARE, clearValue = 0)
  {
    this.load = load;
    this.store = store;
    this.clearValue = clearValue;
  }
}


/** How a pass treats one colour attachment. */
export class Tr2ColorAttachment
{
  /** What the pass does with the existing colour. */
  load = Tr2LoadAction.DONT_CARE;

  /** Whether the resulting colour is written back. */
  store = Tr2StoreAction.DONT_CARE;

  /** The packed colour a CLEAR load starts from. */
  clearColor = 0;

  /**
   * @param {number} [load] A `Tr2LoadAction`.
   * @param {number} [store] A `Tr2StoreAction`.
   * @param {number} [clearColor] The packed colour a CLEAR starts from.
   */
  constructor(load = Tr2LoadAction.DONT_CARE, store = Tr2StoreAction.DONT_CARE, clearColor = 0)
  {
    this.load = load;
    this.store = store;
    this.clearColor = clearColor;
  }
}
