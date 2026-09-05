// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetExternalControllerVariable.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetExternalControllerVariable.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { ITr2ControllerAction, withITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that writes a constant or source-variable value into a
 * controller variable on a different object, named by destinationOwner among the
 * owner's binding roots.
 */
@type.define({
  className: "Tr2ActionSetExternalControllerVariable",
  family: "controllers"
})
export class Tr2ActionSetExternalControllerVariable extends withITr2ControllerAction(CjsModel)
{
  @io.read
  @type.objectRef("IRoot")
  destination = null;

  @io.notify
  @io.persist
  @type.string
  destinationOwner = "";

  @io.persist
  @type.string
  variable = "";

  @io.persist
  @type.float32
  value = 0;

  @io.persist
  @type.string
  sourceVariable = "";

  @io.persist
  @type.boolean
  startControllers = false;

  #controller = null;

  #linkedOwner = null;

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
   * Relinks the destination when the authored owner name changed since the
   * last link (Carbon gates on the m_destinationOwner notification;
   * broad-safe here means comparing against the cached linked owner rather
   * than a changed-property list).
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    if (this.destinationOwner !== this.#linkedOwner)
    {
      this.#linkToDestinationOwner();
    }
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
   * against the owner's binding roots, and records the name it resolved against
   * so OnModified can detect a real change.
   */
  #linkToDestinationOwner()
  {
    this.#linkedOwner = this.destinationOwner;
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
