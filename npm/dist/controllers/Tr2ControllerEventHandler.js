import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { BELIST_EVENTMASK, BELIST_REMOVED, BELIST_INSERTED } from './contracts.js';

let _initProto, _initClass, _init_actions, _init_extra_actions, _init_name, _init_extra_name;

/**
 * Binds a named controller event to a list of actions that are run as a single
 * one-shot pulse when the event fires.
 */
let _Tr2ControllerEventHa;
new class extends _identity {
  static [class Tr2ControllerEventHandler extends CjsModel {
    static {
      ({
        e: [_init_actions, _init_extra_actions, _init_name, _init_extra_name, _initProto],
        c: [_Tr2ControllerEventHa, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ControllerEventHandler",
        family: "controllers"
      })], [[[io, io.persist, void 0, type.list("ITr2ControllerAction")], 16, "actions"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "Link"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unlink"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, CjsModel));
    }
    actions = (_initProto(this), _init_actions(this, []));
    name = (_init_extra_actions(this), _init_name(this, ""));
    #controller = (_init_extra_name(this), null);

    /**
     * Handles Carbon list notifications for inserted and removed actions.
     */
    OnListModified(event, _key = 0, _key2 = 0, value = null, list = this.actions) {
      if (list !== this.actions) {
        return;
      }
      const action = _Tr2ControllerEventHa.#asControllerAction(value);
      switch (event & BELIST_EVENTMASK) {
        case BELIST_INSERTED:
          if (this.#controller && action) {
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
    Link(controller) {
      this.Unlink();
      this.#controller = controller;
      for (const action of this.actions) {
        action.Link?.(controller);
      }
    }

    /**
     * Unlinks all actions from the current controller.
     */
    Unlink() {
      if (!this.#controller) {
        return;
      }
      for (const action of this.actions) {
        action.Unlink?.();
      }
    }

    /**
     * Gets the authored handler name.
     */
    GetName() {
      return this.name;
    }

    /**
     * Executes all actions by starting them first, then stopping them.
     */
    Execute(controller) {
      for (const action of this.actions) {
        action.Start?.(controller);
      }
      for (const action of this.actions) {
        action.Stop?.(controller);
      }
    }

    /**
     * Narrows a stored entry to a controller action, so a malformed list entry is
     * ignored rather than invoked.
     */
  }];
  #asControllerAction(value) {
    return value && typeof value === "object" ? value : null;
  }
  constructor() {
    super(_Tr2ControllerEventHa), _initClass();
  }
}();

export { _Tr2ControllerEventHa as Tr2ControllerEventHandler };
//# sourceMappingURL=Tr2ControllerEventHandler.js.map
