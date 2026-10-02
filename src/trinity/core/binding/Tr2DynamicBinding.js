// Source: trinity/trinity/Tr2DynamicBinding.h
// Source: trinity/trinity/Tr2DynamicBinding.cpp
// Source: trinity/trinity/Tr2DynamicBinding_Blue.cpp
import { meta } from "#schema";
import { INotify } from "#blue/INotify";
import { ISimTimeRebaseNotify } from "#blue/ISimTimeRebaseNotify";
import { TriValueBinding } from "./TriValueBinding.js";


/**
 * A value binding described by object paths: it resolves both endpoints against
 * its owner's parameter map, builds a weak TriValueBinding and starts copying
 * after a configured delay.
 */
@meta.define({ className: "Tr2DynamicBinding", family: "trinityCore" })
@meta.blue.inherit(ISimTimeRebaseNotify)
export class Tr2DynamicBinding extends INotify
{
  /** Native name member. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** Native destination object path member. */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  destinationObjectPath = "";

  /** Native destination object attribute member. */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  destinationObjectAttribute = "";

  /** Native destination member. */
  @meta.blue.read
  @meta.type.weakRef("IRoot")
  destination = null;

  /**
   * Native readonly endpoint validity property.
   * @returns {boolean} Whether the endpoint is alive.
   */
  @meta.property()
  @meta.blue.read
  @meta.type.boolean
  @meta.implemented
  get isDestinationValid()
  {
    return this.IsDestinationValid();
  }

  /** Native source object path member. */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  sourceObjectPath = "";

  /** Native source object attribute member. */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  sourceObjectAttribute = "";

  /** Native source member. */
  @meta.blue.read
  @meta.type.weakRef("IRoot")
  source = null;

  /** Native scale member. */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  scale = 1;

  /** Native binding delay member. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  bindingDelay = 0;

  /**
   * Native readonly endpoint validity property.
   * @returns {boolean} Whether the endpoint is alive.
   */
  @meta.property()
  @meta.blue.read
  @meta.type.boolean
  @meta.implemented
  get isSourceValid()
  {
    return this.IsSourceValid();
  }

  /** Native binding member. */
  @meta.blue.read
  @meta.type.objectRef("TriValueBinding")
  binding = null;

  /** Runtime binding time state for the portable binding adapter. */
  _bindingTime = 0;

  /** Runtime current frame time state for the portable binding adapter. */
  _currentFrameTime = 0;

  /** Runtime destination ref state for the portable binding adapter. */
  _destinationRef = null;

  /** Runtime owner state for the portable binding adapter. */
  _owner = null;

  /** Runtime source ref state for the portable binding adapter. */
  _sourceRef = null;

  /** Portable validity cache refreshed from the weak endpoint. */
  _isDestinationValid = false;

  /** Portable validity cache refreshed from the weak endpoint. */
  _isSourceValid = false;

  /**
   * Redefines the read-only source and destination fields as getters over the
   * weakly held endpoint references.
   * Adapted: JavaScript weak-reference accessors replace native BlueWeakRef storage.
   * Held gap: native constructor/destructor OS rebase registration is absent; callers retain the established explicit-seconds boundary.
   */
  constructor()
  {
    super();
    Object.defineProperty(this, "source", {
      configurable: true,
      enumerable: true,
      get: () => this._sourceRef?.deref?.() ?? null
    });
    Object.defineProperty(this, "destination", {
      configurable: true,
      enumerable: true,
      get: () => this._destinationRef?.deref?.() ?? null
    });
  }

  /**
   * Unlinks, resolves both object paths against the owner's parameter map and
   * builds a weak binding between the two attributes, scheduling the first copy
   * bindingDelay milliseconds after the current frame time; returns false
   * without an owner or when either endpoint fails to resolve.
   * Adapted: Resolves Carbon Blue paths through the portable JavaScript graph and accepts current frame time explicitly instead of reading BeOS.
   * @param {number|undefined} [currentFrameTime] Explicit frame time in seconds when supplied.
   * @returns {boolean} Binding result.
   */
  @meta.blue.method
  @meta.adapted
  Link(currentFrameTime = undefined)
  {
    this.Unlink();
    if (currentFrameTime !== undefined)
    {
      this._currentFrameTime = Number(currentFrameTime);
    }
    if (!this._owner)
    {
      return false;
    }

    const roots = this._owner.GetParameterMap();
    const destination = Tr2DynamicBinding._resolveReference(this.destinationObjectPath, roots);
    const source = Tr2DynamicBinding._resolveReference(this.sourceObjectPath, roots);
    this._destinationRef = Tr2DynamicBinding._makeWeakRef(destination);
    this._sourceRef = Tr2DynamicBinding._makeWeakRef(source);
    this._isDestinationValid = !!destination;
    this._isSourceValid = !!source;

    if (source && destination)
    {
      this.binding = new TriValueBinding();
      this.binding.CreateWeakBinding(
        source,
        this.sourceObjectAttribute,
        destination,
        this.destinationObjectAttribute,
        this.scale
      );
      this._bindingTime = this._currentFrameTime + this.bindingDelay / 1000;
      return true;
    }
    return false;
  }

  /**
   * Tears down the binding, clears both endpoint references and validity flags
   * and resets the pending binding time.
   * Adapted: Explicitly detaches the held JavaScript binding destination before dropping it, replacing native reference-counted cleanup.
   * @returns {void} No return value.
   */
  @meta.blue.method
  @meta.adapted
  Unlink()
  {
    this.binding?.SetDestinationObject(null);
    this.binding = null;
    this._sourceRef = null;
    this._destinationRef = null;
    this._isSourceValid = false;
    this._isDestinationValid = false;
    this._bindingTime = 0;
  }

  /**
   * Sets the object whose GetParameterMap supplies the roots that Link resolves
   * paths against; without it Link always fails.
   * Adapted: Normalizes a nullish JavaScript owner to the native null-owner state.
   * @param {object|null} owner Owner supplying GetParameterMap.
   * @returns {void} No return value.
   */
  @meta.blue.method
  @meta.adapted
  SetOwner(owner)
  {
    this._owner = owner ?? null;
  }

  /**
   * Records the current frame time and copies the bound value once the binding
   * delay has elapsed; returns whether a copy took place.
   * Adapted: Preserves the existing owner boundary in seconds and caches frame time for relinking; returns the copy result where native Update is void.
   * @param {number} time Frame time in seconds.
   * @returns {boolean} Binding result.
   */
  @meta.blue.method
  @meta.adapted
  Update(time)
  {
    this._currentFrameTime = Number(time);
    if (this.binding && this._bindingTime <= this._currentFrameTime)
    {
      return this.binding.CopyValue();
    }
    return false;
  }

  /**
   * Shifts the pending binding time and the cached frame time by the clock
   * delta, so rebasing the simulation clock neither skips nor stalls the delay.
   * Adapted: Preserves the explicit seconds boundary and rebases the cached frame time as well as the pending binding time.
   * @param {number} oldTime Old simulation time in seconds.
   * @param {number} newTime New simulation time in seconds.
   * @returns {void} No return value.
   */
  @meta.blue.method
  @meta.adapted
  OnSimClockRebase(oldTime, newTime)
  {
    const adjustment = Number(newTime) - Number(oldTime);
    this._bindingTime += adjustment;
    this._currentFrameTime += adjustment;
  }

  /**
   * Re-checks that the weakly held destination is still alive and refreshes the
   * read-only flag.
   * @returns {boolean} Binding result.
   */
  @meta.blue.method
  @meta.implemented
  IsDestinationValid()
  {
    this._isDestinationValid = !!this.destination;
    return this._isDestinationValid;
  }

  /**
   * Re-checks that the weakly held source is still alive and refreshes the
   * read-only flag.
   * @returns {boolean} Binding result.
   */
  @meta.blue.method
  @meta.implemented
  IsSourceValid()
  {
    this._isSourceValid = !!this.source;
    return this._isSourceValid;
  }

  /**
   * Relinks on notification when an owner is present; otherwise unlinks.
   * Adapted: Dispatches Carbon member notifications by exposed property name; existing JS expression and resource adapters retain their owning methods.
   * @param {string|null} propertyName Changed member name.
   * @returns {boolean} Binding result.
   */
  @meta.blue.method
  @meta.adapted
  OnModified(propertyName)
  {
    if (this._owner) this.Link(this._currentFrameTime);
    else this.Unlink();
    return true;
  }

  /**
   * Looks a named root up in the owner's parameter map, which may be a Map or a
   * plain object.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {Map|object} roots Named parameter roots.
   * @param {string} name Member or root name.
   * @returns {object|null} Binding result.
   */
  @meta.ours
  static _getRoot(roots, name)
  {
    if (roots instanceof Map) return roots.get(name) ?? null;
    return roots && Object.prototype.hasOwnProperty.call(roots, name) ? roots[name] : null;
  }

  /**
   * Selects an element of an array or of a GetSize/GetAt list, either by index
   * (negative counts from the end) or by matching an element's name.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {*} value Incoming value.
   * @param {number|string} selector Index or element name.
   * @returns {object|null} Binding result.
   */
  @meta.ours
  static _getListElement(value, selector)
  {
    const length = Array.isArray(value) ? value.length : Number(value?.GetSize?.());
    if (!Number.isInteger(length) || length < 0) return null;
    const at = index => Array.isArray(value) ? value[index] : value.GetAt?.(index);
    if (typeof selector === "number")
    {
      const index = selector < 0 ? selector + length : selector;
      return index >= 0 && index < length ? at(index) ?? null : null;
    }
    for (let index = 0; index < length; index++)
    {
      const element = at(index);
      if (typeof element?.name === "string" && element.name === selector) return element;
    }
    return null;
  }

  /**
   * Walks a path of the form root.attribute[0]["name"] through the parameter
   * map, returning the object only when the whole path was consumed and the
   * result is a reference.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {string} reference Object path from a named root.
   * @param {Map|object} roots Named parameter roots.
   * @returns {object|null} Binding result.
   */
  @meta.ours
  static _resolveReference(reference, roots)
  {
    const value = String(reference ?? "");
    const rootMatch = /^([A-Za-z_][A-Za-z_0-9]*)/.exec(value);
    if (!rootMatch) return null;
    let object = Tr2DynamicBinding._getRoot(roots, rootMatch[1]);
    let offset = rootMatch[1].length;

    while (object && offset < value.length)
    {
      const remainder = value.slice(offset);
      const attribute = /^\.([A-Za-z_][A-Za-z_0-9]*)/.exec(remainder);
      if (attribute)
      {
        object = object && typeof object === "object" ? object[attribute[1]] ?? null : null;
        offset += attribute[0].length;
        continue;
      }

      const index = /^\[(-?[0-9]+)\]/.exec(remainder);
      if (index)
      {
        object = Tr2DynamicBinding._getListElement(object, Number(index[1]));
        offset += index[0].length;
        continue;
      }

      const named = /^\["([^"]*)"\]/.exec(remainder);
      if (named)
      {
        object = Tr2DynamicBinding._getListElement(object, named[1]);
        offset += named[0].length;
        continue;
      }
      return null;
    }
    return offset === value.length && Tr2DynamicBinding._isReference(object) ? object : null;
  }

  /**
   * Wraps a reference in a WeakRef, or in a strong deref shim where WeakRef is
   * unavailable; null for anything that is not a reference.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {*} value Incoming value.
   * @returns {WeakRef|object|null} Binding result.
   */
  @meta.ours
  static _makeWeakRef(value)
  {
    if (!value || (typeof value !== "object" && typeof value !== "function")) return null;
    return typeof WeakRef === "function" ? new WeakRef(value) : { deref: () => value };
  }

  /**
   * Whether a value can be held by WeakRef, i.e. an object or a function.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {*} value Incoming value.
   * @returns {boolean} Binding result.
   */
  @meta.ours
  static _isReference(value)
  {
    return value !== null && (typeof value === "object" || typeof value === "function");
  }
}

// Tr2DynamicBinding_Blue.cpp: concrete self and notify, without an exposure chain.
meta.blue.interfaceTable({ interfaces: [Tr2DynamicBinding, INotify], chainTo: null })(Tr2DynamicBinding, { kind: "class" });
