import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';

let _initProto, _initClass, _init_destination, _init_extra_destination, _init_destinationOwner, _init_extra_destinationOwner, _init_variable, _init_extra_variable, _init_value, _init_extra_value, _init_sourceVariable, _init_extra_sourceVariable, _init_startControllers, _init_extra_startControllers;

/**
 * Controller action that writes a constant or source-variable value into a
 * controller variable on a different object, named by destinationOwner among the
 * owner's binding roots.
 */
let _Tr2ActionSetExternal;
new class extends _identity {
  static [class Tr2ActionSetExternalControllerVariable extends CjsModel {
    static {
      ({
        e: [_init_destination, _init_extra_destination, _init_destinationOwner, _init_extra_destinationOwner, _init_variable, _init_extra_variable, _init_value, _init_extra_value, _init_sourceVariable, _init_extra_sourceVariable, _init_startControllers, _init_extra_startControllers, _initProto],
        c: [_Tr2ActionSetExternal, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ActionSetExternalControllerVariable",
        family: "controllers"
      })], [[[io, io.read, void 0, type.objectRef("IRoot")], 16, "destination"], [[io, io.notify, io, io.persist, type, type.string], 16, "destinationOwner"], [[io, io.persist, type, type.string], 16, "variable"], [[io, io.persist, type, type.float32], 16, "value"], [[io, io.persist, type, type.string], 16, "sourceVariable"], [[io, io.persist, type, type.boolean], 16, "startControllers"], [[carbon, carbon.method, impl, impl.adapted], 18, "Link"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unlink"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsDestinationValid"]], 0, void 0, CjsModel));
    }
    destination = (_initProto(this), _init_destination(this, null));
    destinationOwner = (_init_extra_destination(this), _init_destinationOwner(this, ""));
    variable = (_init_extra_destinationOwner(this), _init_variable(this, ""));
    value = (_init_extra_variable(this), _init_value(this, 0));
    sourceVariable = (_init_extra_value(this), _init_sourceVariable(this, ""));
    startControllers = (_init_extra_sourceVariable(this), _init_startControllers(this, false));
    #controller = (_init_extra_startControllers(this), null);
    #linkedOwner = null;

    /**
     * Links to the destination owner.
     */
    Link(controller) {
      this.#controller = controller;
      this.#linkToDestinationOwner();
    }

    /**
     * Clears the destination owner.
     */
    Unlink() {
      this.destination = null;
      this.#controller = null;
    }

    /**
     * Sets the external controller variable.
     */
    Start(controller = this.#controller) {
      if (!controller) {
        return;
      }
      this.#controller = controller;
      if (!this.destination) {
        this.#linkToDestinationOwner();
      }
      const value = this.sourceVariable ? ITr2ControllerAction.toNumber(this.#controller?.GetFloatVariableByName?.(this.sourceVariable), this.value) : this.value;
      if (!this.IsDestinationValid()) {
        return;
      }
      if (this.startControllers) {
        ITr2ControllerAction.callTarget(this.destination, "StartControllers");
      }
      _Tr2ActionSetExternal.#setControllerVariable(this.destination, this.variable, value);
    }

    /**
     * Relinks the destination when the authored owner name changed since the
     * last link (Carbon gates on the m_destinationOwner notification;
     * broad-safe here means comparing against the cached linked owner rather
     * than a changed-property list).
     */
    OnModified(_options = {}) {
      if (this.destinationOwner !== this.#linkedOwner) {
        this.#linkToDestinationOwner();
      }
      return true;
    }

    /**
     * Checks whether the destination owner resolved.
     */
    IsDestinationValid() {
      return !!this.destination;
    }

    /**
     * Checks whether a target variable name is authored.
     */
    IsVariableValid() {
      return !!this.variable;
    }

    /**
     * Resolves `destination` by case-insensitively matching destinationOwner
     * against the owner's binding roots, and records the name it resolved against
     * so OnModified can detect a real change.
     */
    #linkToDestinationOwner() {
      this.#linkedOwner = this.destinationOwner;
      this.destination = null;
      if (!this.#controller) {
        return;
      }
      const owner = ITr2ControllerAction.getOwner(this.#controller);
      const roots = _Tr2ActionSetExternal.#getBindingRoots(owner);
      const destinationOwner = this.destinationOwner.toLowerCase();
      if (!destinationOwner) {
        return;
      }
      for (const [name, value] of roots) {
        if (name.toLowerCase() === destinationOwner) {
          this.destination = value;
          return;
        }
      }
    }

    /**
     * Writes the value through the destination's SetControllerVariable, returning
     * false when the destination or variable name is missing or the method is
     * absent.
     */

    /**
     * Normalizes an owner's binding roots into name/value pairs, accepting an
     * array, a Map, a `bindingRoots` property or a plain object.
     */
  }];
  #setControllerVariable(destination, variable, value) {
    if (!destination || !variable) {
      return false;
    }
    if (ITr2ControllerAction.hasFunction(destination, "SetControllerVariable")) {
      destination.SetControllerVariable(variable, value);
      return true;
    }
    return false;
  }
  #getBindingRoots(owner) {
    const roots = ITr2ControllerAction.callTarget(owner, "GetBindingRoots");
    if (Array.isArray(roots)) {
      return roots.map(entry => [String(entry[0] ?? ""), entry[1]]);
    }
    if (roots instanceof Map) {
      return Array.from(roots.entries()).map(([name, value]) => [String(name), value]);
    }
    if (ITr2ControllerAction.hasProperty(owner, "bindingRoots")) {
      return Object.entries(owner.bindingRoots);
    }
    if (roots && typeof roots === "object") {
      return Object.entries(roots);
    }
    return [];
  }
  constructor() {
    super(_Tr2ActionSetExternal), _initClass();
  }
}();

export { _Tr2ActionSetExternal as Tr2ActionSetExternalControllerVariable };
//# sourceMappingURL=Tr2ActionSetExternalControllerVariable.js.map
