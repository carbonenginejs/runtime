// Source: trinity/trinity/Controllers/Tr2ControllerEventHandler.h
// Source: trinity/trinity/Controllers/Tr2ControllerEventHandler.cpp
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";
import { BELIST_EVENTMASK, BELIST_INSERTED, BELIST_REMOVED } from "./contracts.js";


/**
 * Binds a named controller event to a list of actions that are run as a single
 * one-shot pulse when the event fires.
 *
 * Tr2Controller owns these handlers in eventHandlers. While playing, it matches
 * an incoming event name against each handler and calls Execute for every match.
 * The handler supplies an ordered action list; each ITr2ControllerAction owns
 * its bindings and the work performed by Start and Stop.
 *
 * Link supplies the action controller used to resolve those bindings. Execute
 * performs a synchronous pulse, starting all actions before stopping any; it
 * does not schedule updates or keep actions active across frames. CjsModel and
 * the schema provide persistence for the authored name and action list.
 */
@type.define({
  className: "Tr2ControllerEventHandler",
  family: "controllers"
})
export class Tr2ControllerEventHandler extends CjsModel
{
  @edit.read
  @edit.persist
  @type.list("ITr2ControllerAction")
  actions = [];

  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  #controller = null;

  /**
   * Handles Carbon list notifications for inserted and removed actions.
   *
   * Insertions link to the retained controller, if present; removals unlink
   * their action. Notifications for another list or another event are ignored.
   * Entries must provide the action interface; the local object guard does not
   * validate its methods.
   *
   * @param {number} event Carbon list event flags, masked with BELIST_EVENTMASK.
   * @param {number} [_key=0] Unused list notification key.
   * @param {number} [_key2=0] Unused secondary notification key.
   * @param {object|null} [value=null] Inserted or removed action.
   * @param {Array} [list=this.actions] List that emitted the notification.
   * @returns {void}
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
          action.Link(this.#controller);
        }
        break;
      case BELIST_REMOVED:
        action?.Unlink();
        break;
    }
  }

  /**
   * Links all actions to the supplied action controller.
   *
   * Unlinks the previous action bindings first, retains the controller, then
   * links each action in list order. Action errors propagate without rollback.
   *
   * @param {ITr2ActionController} controller Controller used to resolve bindings.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  Link(controller)
  {
    this.Unlink();
    this.#controller = controller;
    for (const action of this.actions)
    {
      action.Link(controller);
    }
  }

  /**
   * Unlinks all actions from the current controller.
   *
   * Does nothing before the first Link. Like Carbon, this retains the controller
   * reference: subsequent insert notifications can still link new actions, and
   * repeated calls invoke Unlink on the actions again.
   *
   * @returns {void}
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
      action.Unlink();
    }
  }

  /**
   * Gets the authored handler name.
   *
   * @returns {string} Name compared with incoming controller event names.
   */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Executes all actions by starting them first, then stopping them.
   *
   * Both passes use list order and the supplied controller. An action error
   * propagates immediately; remaining calls, including Stop calls, are skipped.
   * The caller is responsible for deciding whether the controller is playing.
   *
   * @param {ITr2ActionController} controller Controller passed to Start and Stop.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  Execute(controller)
  {
    for (const action of this.actions)
    {
      action.Start(controller);
    }
    for (const action of this.actions)
    {
      action.Stop(controller);
    }
  }

  /**
   * Accepts object-valued entries for list notification dispatch.
   *
   * This guard rejects null and primitives but does not check the action
   * interface. An object without Link or Unlink can still fail at the call site.
   *
   * @param {*} value Candidate list entry.
   * @returns {object|null} Object entry, or null when the guard rejects it.
   */
  static #asControllerAction(value)
  {
    return value && typeof value === "object" ? value : null;
  }
}
