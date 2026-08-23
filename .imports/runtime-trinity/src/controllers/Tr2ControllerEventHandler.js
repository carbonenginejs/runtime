// Source: E:\carbonengine\trinity\trinity\Controllers\Tr2ControllerEventHandler.h
// Source: E:\carbonengine\trinity\trinity\Controllers\Tr2ControllerEventHandler.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { BELIST_EVENTMASK, BELIST_INSERTED, BELIST_REMOVED } from "./contracts.js";


/**
 * Binds a named controller event to a list of actions that are run as a single
 * one-shot pulse when the event fires.
 */
@type.define({
  className: "Tr2ControllerEventHandler",
  family: "controllers"
})
export class Tr2ControllerEventHandler extends CjsModel
{
  @io.persist
  @type.list("ITr2ControllerAction")
  actions = [];

  @io.persist
  @type.string
  name = "";

  #controller = null;

  /**
   * Handles Carbon list notifications for inserted and removed actions.
   */
  @carbon.method
  @impl.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = this.actions)
  {
    if (list !== this.actions)
    {
      return;
    }
    const action = Tr2ControllerEventHandler.#asControllerAction(value);
    switch (event & BELIST_EVENTMASK)
    {
      case BELIST_INSERTED:
        if (this.#controller && action)
        {
          action.Link?.(this.#controller);
        }
        break;
      case BELIST_REMOVED:
        action?.Unlink?.();
        break;
    }
  }

  /**
   * Links all actions to the supplied action controller.
   */
  @carbon.method
  @impl.implemented
  Link(controller)
  {
    this.Unlink();
    this.#controller = controller;
    for (const action of this.actions)
    {
      action.Link?.(controller);
    }
  }

  /**
   * Unlinks all actions from the current controller.
   */
  @carbon.method
  @impl.implemented
  Unlink()
  {
    if (!this.#controller)
    {
      return;
    }
    for (const action of this.actions)
    {
      action.Unlink?.();
    }
  }

  /**
   * Gets the authored handler name.
   */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Executes all actions by starting them first, then stopping them.
   */
  @carbon.method
  @impl.implemented
  Execute(controller)
  {
    for (const action of this.actions)
    {
      action.Start?.(controller);
    }
    for (const action of this.actions)
    {
      action.Stop?.(controller);
    }
  }

  /**
   * Narrows a stored entry to a controller action, so a malformed list entry is
   * ignored rather than invoked.
   */
  static #asControllerAction(value)
  {
    return value && typeof value === "object" ? value : null;
  }
}
