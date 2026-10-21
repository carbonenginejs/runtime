import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2DynamicBinding.h
// Source: trinity/trinity/Tr2DynamicBinding.cpp
// Source: trinity/trinity/Tr2DynamicBinding_Blue.cpp
import { CjsSchema, meta, type, blue as legacyBlue } from "#schema";
import { IList } from "#blue/IList";
import { INotify } from "#blue/INotify";
import { ISimTimeRebaseNotify } from "#blue/ISimTimeRebaseNotify";
import { blue, CcpTime } from "#blue";
import { TriValueBinding } from "./TriValueBinding.js";


/**
 * A value binding described by object paths: it resolves both endpoints against
 * its owner's parameter map, builds a weak TriValueBinding and starts copying
 * after a configured delay.
 *
 * Times are Be::Time, Blue 100ns ticks. Every instance takes part in sim-time
 * rebasing from construction, as Carbon's does.
 */
@be.define("Tr2DynamicBinding")
@legacyBlue.inherit(ISimTimeRebaseNotify)
@be.mapInterface(INotify)
export class Tr2DynamicBinding extends INotify
{
  /** Native name member. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** Native destination object path member. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.string
  destinationObjectPath = "";

  /** Native destination object attribute member. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.string
  destinationObjectAttribute = "";

  /**
   * Native destination member: the weakly held endpoint, or null once it is
   * gone. Adapted: a WeakRef replaces native BlueWeakRef storage, so
   * Carbon's MAP_ATTRIBUTE("destination", m_destination, Be::READ) row
   * (Tr2DynamicBinding_Blue.cpp:16) is an attribute over this accessor.
   *
   * @returns {object|null} The destination object.
   */
  @be.mapAttribute(be.READ)
  @type.object.weak("IRoot")
  get destination()
  {
    return this._destinationRef ? this._destinationRef.deref() ?? null : null;
  }

  /**
   * Native readonly endpoint validity property.
   * @returns {boolean} Whether the endpoint is alive.
   */
  @be.mapPropertyReadOnly()
  @type.boolean
  @meta.implemented
  get isDestinationValid()
  {
    return this.IsDestinationValid();
  }

  /** Native source object path member. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.string
  sourceObjectPath = "";

  /** Native source object attribute member. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.string
  sourceObjectAttribute = "";

  /**
   * Native source member: the weakly held endpoint, or null once it is gone.
   * Adapted: a WeakRef replaces native BlueWeakRef storage, so Carbon's
   * MAP_ATTRIBUTE("source", m_source, Be::READ) row
   * (Tr2DynamicBinding_Blue.cpp:21) is an attribute over this accessor.
   *
   * @returns {object|null} The source object.
   */
  @be.mapAttribute(be.READ)
  @type.object.weak("IRoot")
  get source()
  {
    return this._sourceRef ? this._sourceRef.deref() ?? null : null;
  }

  /** Native scale member. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.float32
  scale = 1;

  /** Native binding delay member. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.int32
  bindingDelay = 0;

  /**
   * Native readonly endpoint validity property.
   * @returns {boolean} Whether the endpoint is alive.
   */
  @be.mapPropertyReadOnly()
  @type.boolean
  @meta.implemented
  get isSourceValid()
  {
    return this.IsSourceValid();
  }

  /** Native binding member. */
  @be.mapAttribute(be.READ)
  @type.object.ref("TriValueBinding")
  binding = null;

  /** m_bindingTime (Be::Time, Blue 100ns ticks): the frame time from which Update copies; 0 while unlinked. */
  _bindingTime = 0;

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

  /** The OS the constructor registered with, so Destruct unregisters from that same one. */
  _rebaseOS = null;

  /**
   * Carbon's constructor (Tr2DynamicBinding.cpp:172-183): defaults on the fields,
   * then `BeOS->RegisterForSimTimeRebase( this )`, so the pending binding time
   * follows a sim-clock rebase.
   */
  constructor()
  {
    super();
    this._rebaseOS = blue.os;
    this._rebaseOS.RegisterForSimTimeRebase(this);
  }

  /**
   * Carbon's destructor (Tr2DynamicBinding.cpp:185-190): unregisters from sim-time
   * rebasing, drops the owner and unlinks.
   *
   * Adapted: JavaScript has no deterministic destructor, so the holder that
   * abandons a binding calls this; until then the OS keeps it registered.
   * Carbon's registry is a non-owning std::vector<ISimTimeRebaseNotify*>
   * (BlueOS.h:169) while CjsBlueOS holds a strong array, the same shape as
   * TriDevice's resource registry; which owners call Destruct is pending the
   * open teardown ruling (operator, with TriDevice's registry and plan Q4).
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   *
   * @returns {void}
   */
  @meta.adapted
  Destruct()
  {
    if (this._rebaseOS)
    {
      this._rebaseOS.UnregisterForSimTimeRebase(this);
      this._rebaseOS = null;
    }
    this._owner = null;
    this.Unlink();
  }

  /**
   * Unlinks, resolves both object paths against the owner's parameter map and
   * builds a weak binding between the two attributes, scheduling the first copy
   * bindingDelay milliseconds after the current frame time; returns false
   * without an owner or when either endpoint fails to resolve.
   * The first copy is due at Blue's frame time, read here as Carbon reads
   * BeOS->GetCurrentFrameTime(), plus TimeFromMS(bindingDelay)
   * (Tr2DynamicBinding.cpp:229-251). Carbon quirk, kept: Unlink has just zeroed
   * m_bindingTime, so its `m_bindingTime == 0` test always passes.
   * Adapted: Resolves Carbon Blue paths through the portable JavaScript graph,
   * and returns whether both endpoints resolved where native Link is void.
   * @returns {boolean} Binding result.
   */

  @meta.adapted
  Link()
  {
    this.Unlink();
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
      if (this._bindingTime === 0)
      {
        this._bindingTime = blue.os.GetCurrentFrameTime() + CcpTime.timeFromMS(this.bindingDelay);
      }
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

  @meta.adapted
  SetOwner(owner)
  {
    this._owner = owner ?? null;
  }

  /**
   * Copies the bound value once the binding time is reached
   * (Tr2DynamicBinding.cpp:221-227).
   * Adapted: returns the copy result where native Update is void.
   * @param {number} time Frame time (Be::Time, Blue 100ns ticks).
   * @returns {boolean} Binding result.
   */

  @meta.adapted
  Update(time)
  {
    if (this.binding && this._bindingTime <= time)
    {
      return this.binding.CopyValue();
    }
    return false;
  }

  /**
   * Shifts the pending binding time by the clock delta, so rebasing the
   * simulation clock neither skips nor stalls the delay (Tr2DynamicBinding.cpp:206-209).
   * @param {number} oldTime Old simulation time (Be::Time, Blue 100ns ticks).
   * @param {number} newTime New simulation time (Be::Time, Blue 100ns ticks).
   * @returns {void} No return value.
   */

  @meta.implemented
  OnSimClockRebase(oldTime, newTime)
  {
    this._bindingTime += newTime - oldTime;
  }

  /**
   * Re-checks that the weakly held destination is still alive and refreshes the
   * read-only flag.
   * @returns {boolean} Binding result.
   */

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

  @meta.implemented
  IsSourceValid()
  {
    this._isSourceValid = !!this.source;
    return this._isSourceValid;
  }

  /**
   * Relinks on notification when an owner is present; otherwise unlinks.
   * @param {string|null} propertyName Changed member name.
   * @returns {boolean} Binding result.
   */

  @meta.implemented
  OnModified(propertyName)
  {
    if (this._owner) this.Link();
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
  static _getRoot(roots, name)
  {
    if (roots instanceof Map) return roots.get(name) ?? null;
    return roots && Object.prototype.hasOwnProperty.call(roots, name) ? roots[name] : null;
  }

  /**
   * Selects an element of a native IList or portable array, either by index
   * (negative counts from the end) or by matching an element's name.
   * Source: trinity/trinity/Tr2DynamicBinding.cpp:81-120
   * Custom: JavaScript arrays and named properties adapt native list and Blue member storage.
   * @param {*} value Incoming value.
   * @param {number|string} selector Index or element name.
   * @returns {object|null} Binding result.
   */
  static _getListElement(value, selector)
  {
    const list = CjsSchema.cast(value, IList);
    if (!list && !Array.isArray(value)) return null;
    const length = list ? list.GetSize() : value.length;
    const at = index => list ? list.GetAt(index) : value[index];
    if (typeof selector === "number")
    {
      const index = selector < 0 ? selector + length : selector;
      return index >= 0 && index < length ? at(index) : null;
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
  static _isReference(value)
  {
    return value !== null && (typeof value === "object" || typeof value === "function");
  }
}

// Tr2DynamicBinding_Blue.cpp: concrete self and notify, without an exposure chain.
