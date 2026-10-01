// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetExternalControllerVariable.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetExternalControllerVariable.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetExternalControllerVariable_Blue.cpp
import { CjsModel } from "#model";
import { INotify } from "#blue";
import { carbon, impl, edit, type } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that writes a constant or source-variable value into a
 * controller variable on a different object, named by destinationOwner among the
 * owner's binding roots.
 */
@type.define({
  className: "Tr2ActionSetExternalControllerVariable",
  family: "controllers"
})
@carbon.inherit(ITr2ControllerAction, INotify)
export class Tr2ActionSetExternalControllerVariable extends CjsModel
{
  @edit.read
  @type.objectRef("IRoot")
  destination = null;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  destinationOwner = "";

  @edit.readwrite
  @edit.persist
  @type.string
  variable = "";

  @edit.readwrite
  @edit.persist
  @type.float32
  value = 0;

  @edit.readwrite
  @edit.persist
  @type.string
  sourceVariable = "";

  @edit.readwrite
  @edit.persist
  @type.boolean
  startControllers = false;

  _controller = null;


  /**
   * Links to the destination owner.
   */
  @carbon.method
  @impl.adapted
  Link(controller)
  {
    this._controller = controller;
    this._linkToDestinationOwner();
  }

  /**
   * Clears the destination owner.
   */
  @carbon.method
  @impl.implemented
  Unlink()
  {
    this.destination = null;
    this._controller = null;
  }

  /**
   * Starts the destination if requested, then samples and writes its variable.
   *
   * Adapted: Uses the existing JavaScript owner-binding adapter rather than native
   * interface casts. A supplied controller refreshes the stored link. Missing
   * source values use the authored constant; nonfinite source values are copied.
   */
  @carbon.method
  @impl.adapted
  Start(controller = this._controller)
  {
    if (!controller)
    {
      return;
    }
    this._controller = controller;
    if (!this.destination)
    {
      this._linkToDestinationOwner();
    }
    if (!this.IsDestinationValid())
    {
      return;
    }
    if (this.startControllers)
    {
      ITr2ControllerAction.callTarget(this.destination, "StartControllers");
    }
    const value = this.sourceVariable ? this._controller.GetFloatVariableByName(this.sourceVariable) ?? this.value : this.value;
    Tr2ActionSetExternalControllerVariable._setControllerVariable(this.destination, this.variable, value);
  }

  /**
   * Relinks the destination on the native destinationOwner notification.
   *
   * Adapted: Dispatches the native member notification by exposed property name.
   */
  @carbon.method
  @impl.adapted
  OnModified(propertyName)
  {
    if (propertyName === "destinationOwner") this._linkToDestinationOwner();
    return true;
  }

  /**
   * Checks whether the destination owner resolved.
   */
  @carbon.method
  @impl.implemented
  IsDestinationValid()
  {
    return !!this.destination;
  }

  /**
   * Checks whether a target variable name is authored.
   */
  IsVariableValid()
  {
    return !!this.variable;
  }

  /**
   * Resolves `destination` by case-insensitively matching destinationOwner
   * against the owner's binding roots.
   */
  _linkToDestinationOwner()
  {
    this.destination = null;
    if (!this._controller)
    {
      return;
    }
    const owner = ITr2ControllerAction.getOwner(this._controller);
    const roots = Tr2ActionSetExternalControllerVariable._getBindingRoots(owner);
    const destinationOwner = this.destinationOwner.toLowerCase();
    if (!destinationOwner)
    {
      return;
    }
    for (const [name, value] of roots)
    {
      if (name.toLowerCase() === destinationOwner)
      {
        this.destination = value;
        return;
      }
    }
  }

  /**
   * Writes the value through the destination's SetControllerVariable, returning
   * false when the destination or the method is absent. Empty names are forwarded.
   */
  static _setControllerVariable(destination, variable, value)
  {
    if (!destination)
    {
      return false;
    }
    if (ITr2ControllerAction.hasFunction(destination, "SetControllerVariable"))
    {
      destination.SetControllerVariable(variable, value);
      return true;
    }
    return false;
  }

  /**
   * Normalizes an owner's binding roots into name/value pairs, accepting an
   * array, a Map, a `bindingRoots` property or a plain object.
   */
  static _getBindingRoots(owner)
  {
    const roots = ITr2ControllerAction.callTarget(owner, "GetBindingRoots");
    if (Array.isArray(roots))
    {
      return roots.map(entry => [String(entry[0] ?? ""), entry[1]]);
    }
    if (roots instanceof Map)
    {
      return Array.from(roots.entries()).map(([name, value]) => [String(name), value]);
    }
    if (ITr2ControllerAction.hasProperty(owner, "bindingRoots"))
    {
      return Object.entries(owner.bindingRoots);
    }
    if (roots && typeof roots === "object")
    {
      return Object.entries(roots);
    }
    return [];
  }
}

// Native exposure ends at this concrete table (Tr2ActionSetExternalControllerVariable_Blue.cpp:13-15,27).
carbon.interfaceTable({
  interfaces: [Tr2ActionSetExternalControllerVariable, ITr2ControllerAction, INotify],
  chainTo: null
})(Tr2ActionSetExternalControllerVariable);
