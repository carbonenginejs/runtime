// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetExternalControllerVariable.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetExternalControllerVariable.cpp
import { CjsModel } from "#model";
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
@carbon.inherit(ITr2ControllerAction)
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

  #controller = null;


  /**
   * Links to the destination owner.
   */
  @carbon.method
  @impl.adapted
  Link(controller)
  {
    this.#controller = controller;
    this.#linkToDestinationOwner();
  }

  /**
   * Clears the destination owner.
   */
  @carbon.method
  @impl.implemented
  Unlink()
  {
    this.destination = null;
    this.#controller = null;
  }

  /**
   * Sets the external controller variable.
   */
  @carbon.method
  @impl.adapted
  Start(controller = this.#controller)
  {
    if (!controller)
    {
      return;
    }
    this.#controller = controller;
    if (!this.destination)
    {
      this.#linkToDestinationOwner();
    }
    const value = this.sourceVariable ? ITr2ControllerAction.toNumber(this.#controller?.GetFloatVariableByName?.(this.sourceVariable), this.value) : this.value;
    if (!this.IsDestinationValid())
    {
      return;
    }
    if (this.startControllers)
    {
      ITr2ControllerAction.callTarget(this.destination, "StartControllers");
    }
    Tr2ActionSetExternalControllerVariable.#setControllerVariable(this.destination, this.variable, value);
  }

  /**
   * Relinks the destination on the native destinationOwner notification.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Dispatches Carbon member notifications by exposed property name; existing JS expression and resource adapters retain their owning methods.")
  OnModified(propertyName)
  {
    if (propertyName === "destinationOwner") this.#linkToDestinationOwner();
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
  #linkToDestinationOwner()
  {
    this.destination = null;
    if (!this.#controller)
    {
      return;
    }
    const owner = ITr2ControllerAction.getOwner(this.#controller);
    const roots = Tr2ActionSetExternalControllerVariable.#getBindingRoots(owner);
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
   * false when the destination or variable name is missing or the method is
   * absent.
   */
  static #setControllerVariable(destination, variable, value)
  {
    if (!destination || !variable)
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
  static #getBindingRoots(owner)
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
