// Source: trinity/trinity/Controllers/Tr2ControllerEventHandler.h
// Source: trinity/trinity/Controllers/Tr2ControllerEventHandler.cpp
// Source: trinity/trinity/Controllers/Tr2ControllerEventHandler_Blue.cpp
import { meta, types } from "#schema";
import { BlueList } from "#blue";
import { mappedInterfaces } from "../../global/compose/interface.js";
import { ITr2ControllerAction } from "./action/ITr2ControllerAction.js";
import { BLUELISTEVENT } from "#consts/blue";
import { IListNotify } from "#blue/IListNotify";


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
 * does not schedule updates or keep actions active across frames. Blue declarations
 * provide persistence for the authored name and action list.
 */
@meta.define({
  className: "Tr2ControllerEventHandler",
  family: "controllers"
})
export class Tr2ControllerEventHandler extends IListNotify
{
  /** Authored event name compared by the owning controller. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  name = "";

  /** Ordered native interface vector, observed by this handler. */
  @meta.edit.read
  @meta.edit.persist
  @types.list("ITr2ControllerAction")
  actions = new BlueList(ITr2ControllerAction, { className: null, listOps: 0 });

  /** Retained controller; native Unlink deliberately leaves this pointer intact. */
  _controller = null;

  /** Subscribes to the owned action vector (native constructor, cpp:8-12). */
  constructor()
  {
    super();
    this.actions.SetNotify(this);
  }

  /**
   * Handles Carbon list notifications for inserted and removed actions.
   *
   * Insertions link to the retained controller, if present; removals unlink
   * their action. Notifications for another list or another event are ignored.
   * Native BlueCastPtr accepts only the exposed action interface identity.
   *
   * @param {number} event Carbon list event flags, masked with BELIST_EVENTMASK.
   * @param {number} [_key=0] Unused list notification key.
   * @param {number} [_key2=0] Unused secondary notification key.
   * @param {object|null} [value=null] Inserted or removed action.
   * @param {BlueList} [list=this.actions] List that emitted the notification.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = this.actions)
  {
    if (list !== this.actions)
    {
      return;
    }
    const action = value && mappedInterfaces(value.constructor).has(ITr2ControllerAction) ? value : null;
    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_INSERTED:
        if (this._controller && action)
        {
          action.Link(this._controller);
        }
        break;
      case BLUELISTEVENT.BELIST_REMOVED:
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
  @meta.carbon.method
  @meta.impl.implemented
  Link(controller)
  {
    this.Unlink();
    this._controller = controller;
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
  @meta.carbon.method
  @meta.impl.implemented
  Unlink()
  {
    if (!this._controller)
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
  @meta.carbon.method
  @meta.impl.implemented
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
  @meta.carbon.method
  @meta.impl.implemented
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


}

// Native exposure ends at this concrete table (Tr2ControllerEventHandler_Blue.cpp).
meta.carbon.interfaceTable({
  interfaces: [Tr2ControllerEventHandler, IListNotify],
  chainTo: null
})(Tr2ControllerEventHandler);
