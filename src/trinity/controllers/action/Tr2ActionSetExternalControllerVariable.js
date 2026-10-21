import { exposure as be } from "#be";
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetExternalControllerVariable.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetExternalControllerVariable.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetExternalControllerVariable_Blue.cpp
import { IsMatch, INotify } from "#blue";
import { meta, type, blue } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that writes a constant or source-variable value into a
 * controller variable on a different object, named by destinationOwner among the
 * owner's binding roots.
 */
@be.define("Tr2ActionSetExternalControllerVariable")
@blue.inherit(INotify)
@be.mapInterface(ITr2ControllerAction)
@be.mapInterface(INotify)
export class Tr2ActionSetExternalControllerVariable extends ITr2ControllerAction
{
  /**
   * Binding-root name used to resolve the object whose controller variable is changed.
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.string
  destinationOwner = "";

  /**
   * Resolved destination owner; native BlueWeakRef<IRoot>, retained as a live JavaScript reference.
   * @type {IRoot|null}
   */
  @be.mapAttribute(be.READ)
  @type.rootWeak("IRoot")
  destination = null;

  /**
   * Name of the destination controller variable written on Start.
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  variable = "";

  /**
   * Constant float value, also used when the selected source variable is unavailable.
   * @type {number}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  value = 0;

  /**
   * Optional linked-controller float-variable name sampled instead of the authored constant.
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  sourceVariable = "";

  /**
   * Whether Start first starts the resolved destination controllers before writing the variable.
   * @type {boolean}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  startControllers = false;

  /**
   * Reports whether a destination owner has resolved, without validating the variable or relinking.
   * @returns {boolean} Whether the cached destination is non-null.
   */
  @be.mapPropertyReadOnly()
  @type.boolean
  @meta.implemented
  get destinationIsValid()
  {
    return this.IsDestinationValid();
  }

  _controller = null;


  /**
   * Links to the destination owner.
   * Adapted: retains the existing binding-roots adapter. Native checks
   * ITr2ControllerOwner on the owner, GetRootObject result and selected target;
   * those nominal owner declarations are incomplete in the current domain.
   */
  @blue.method
  @meta.adapted
  Link(controller)
  {
    this._controller = controller;
    this._LinkToDestinationOwner();
  }

  /**
   * Clears the destination owner.
   */
  @blue.method
  @meta.implemented
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
   * Native Start keeps Link's controller rather than replacing it. That existing
   * no-argument/refresh convenience remains outside this model-base removal.
   */
  @blue.method
  @meta.adapted
  Start(controller = this._controller)
  {
    if (!controller)
    {
      return;
    }
    this._controller = controller;
    if (!this.destination)
    {
      this._LinkToDestinationOwner();
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
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "destinationOwner")) this._LinkToDestinationOwner();
    return true;
  }

  /**
   * Checks whether the destination owner resolved.
   */
  @blue.method
  @meta.implemented
  IsDestinationValid()
  {
    return !!this.destination;
  }

  /**
   * Checks whether a target variable name is authored.
   * Custom: native declares this method but provides no body or Blue exposure.
   */
  @blue.method
  @meta.adapted
  IsVariableValid()
  {
    return !!this.variable;
  }

  /**
   * Resolves `destination` by case-insensitively matching destinationOwner
   * against the owner's binding roots.
   */
  @meta.renamed("LinkToDestinationOwner")
  @meta.adapted
  _LinkToDestinationOwner()
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
