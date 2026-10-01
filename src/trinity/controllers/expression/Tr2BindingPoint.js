// Source: trinity/trinity/Controllers/Tr2BindingPoint.h
// Source: trinity/trinity/Controllers/Tr2BindingPoint.cpp
import { copyArrayLike, fillArrayLike } from "#utils";
import { isArrayLike } from "#utils/is";
import { meta, types } from "#schema";


const SWIZZLE_OFFSETS = {
  x: 0,
  r: 0,
  y: 1,
  g: 1,
  z: 2,
  b: 2,
  w: 3,
  a: 3
};

/**
 * Resolves an authored `path`/`attribute` pair against named root objects into a
 * concrete property, optionally a single swizzled component of a vector, and
 * reads or writes it.
 * Native is a plain embedded helper; the registered JavaScript record retains
 * authored-field metadata used by existing flattened action adapters. It has
 * no native Blue query table or notification interface of its own.
 */
@meta.define({
  className: "Tr2BindingPoint",
  family: "controllers"
})
export class Tr2BindingPoint
{
  /** Authored path, flattened by containing native actions. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  path = "";

  // Every embedding owner exposes it READWRITE|PERSIST|NOTIFY
  // (Tr2ActionSetValue_Blue.cpp:18, Tr2ActionAnimateValue_Blue.cpp:19).
  /** Authored direct object, used when the path is empty. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.objectRef("IRoot")
  object = null;

  /** Authored member name and optional component swizzle. */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  attribute = "";

  /** Native weak target pointer; retained as a live JS reference in this adapter. */
  @types.weakRef("IRoot")
  resolvedObject = null;

  /** Native weak notification pointer; the existing JS notification adapter resolves callbacks at write time. */
  @types.weakRef("INotify")
  notifyPtr = null;

  /** Native member descriptor represented by a property name in this adapter. */
  @types.objectRef("Be::VarEntry")
  entry = null;

  /** Current JavaScript property value standing in for the native storage pointer. */
  @types.objectRef("Be::Var")
  destination = null;

  /** Vector component offset, or -1 for the whole member. */
  @types.int32
  entryOffset = -1;

  /** Number of components in the resolved array-like value. */
  @types.int32
  arraySize = 0;

  /** Resolved destination retained by the JavaScript property adapter. */
  _target = null;

  /** Resolved property key without a component suffix. */
  _attributeName = "";

  /**
   * Resolves and links this binding against named root objects.
   * @param {Array|object|null} [roots=null] Named roots or action controller.
   * @param {object|null} [owner=null] Optional explicit owner.
   * @returns {boolean} Whether the destination resolved.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Link(roots = null, owner = null)
  {
    this.Unlink();
    const target = this.path ? Tr2BindingPoint.ResolvePath(this.path, Tr2BindingPoint._getLinkRoots(roots, owner)) : this.object ?? owner;
    return this.SetDestination(target, this.attribute);
  }

  /**
   * Clears the resolved binding target.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.implemented
  Unlink()
  {
    this.resolvedObject = null;
    this.notifyPtr = null;
    this.entry = null;
    this.destination = null;
    this.entryOffset = -1;
    this.arraySize = 0;
    this._target = null;
    this._attributeName = "";
  }

  /**
   * Checks whether this binding has resolved to a writable target.
   * @returns {boolean} Whether a target and key are retained.
   */
  @meta.carbon.method
  @meta.impl.implemented
  IsValid()
  {
    return !!this._target && !!this._attributeName;
  }

  /**
   * Writes a value into the bound destination.
   * @param {*} value Value accepted by the retained JS storage adapter.
   * @param {Array|object|null} [roots=null] Roots used for lazy linking.
   * @param {object|null} [owner=null] Explicit owner for lazy linking.
   * @returns {boolean} Whether storage changed.
   */
  @meta.carbon.method
  @meta.impl.adapted
  @meta.impl.reason("JS returns whether a value changed; like the donor, successful writes notify regardless of equality through the existing JS notification adapter.")
  SetValue(value, roots = null, owner = null)
  {
    if (!this.IsValid())
    {
      this.Link(roots, owner);
    }
    if (!this._target || !this._attributeName)
    {
      return false;
    }
    const current = this._target[this._attributeName];
    let changed = false;
    if (this.entryOffset === -1)
    {
      if (ArrayBuffer.isView(current) && isArrayLike(value))
      {
        const previous = Array.from(current);
        current.set(value);
        changed = !Tr2BindingPoint._areArrayValuesEqual(previous, current);
      }
      else if (Array.isArray(current) && isArrayLike(value))
      {
        const previous = current.slice();
        copyArrayLike(current, value);
        changed = !Tr2BindingPoint._areArrayValuesEqual(previous, current);
      }
      else if (isArrayLike(current) && typeof current !== "string" && typeof value === "number")
      {
        const previous = Array.from(current);
        fillArrayLike(current, value);
        changed = !Tr2BindingPoint._areArrayValuesEqual(previous, current);
      }
      else
      {
        if (!Object.is(current, value))
        {
          this._target[this._attributeName] = value;
          changed = true;
        }
      }
    }
    else if (isArrayLike(current))
    {
      const next = Number(value);
      if (!Object.is(current[this.entryOffset], next))
      {
        current[this.entryOffset] = next;
        changed = true;
      }
    }
    else
    {
      return false;
    }
    Tr2BindingPoint._notifyValueChanged(this._target, this._attributeName, value, this);
    return changed;
  }

  /**
   * Reads a numeric value from the bound destination.
   * @param {Array|object|null} [roots=null] Roots used for lazy linking.
   * @param {object|null} [owner=null] Explicit owner for lazy linking.
   * @param {number} [fallback=0] Value for an unresolved or nonnumeric destination.
   * @returns {number} Sampled numeric value.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetValue(roots = null, owner = null, fallback = 0)
  {
    if (!this.IsValid())
    {
      this.Link(roots, owner);
    }
    if (!this._target || !this._attributeName)
    {
      return fallback;
    }
    const value = this._target[this._attributeName];
    if (this.entryOffset !== -1)
    {
      return isArrayLike(value) && value.length > this.entryOffset ? Number(value[this.entryOffset]) : fallback;
    }
    const number = isArrayLike(value) && typeof value !== "string" ? Number(value[0]) : Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  /**
   * Gets the resolved object, or the authored direct object.
   * @param {Array|object|null} [roots=null] Roots used for lazy linking.
   * @param {object|null} [owner=null] Explicit owner for lazy linking.
   * @returns {object|null} Resolved or authored object.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetBoundObject(roots = null, owner = null)
  {
    if (!this.IsValid())
    {
      this.Link(roots, owner);
    }
    return this.resolvedObject ?? this.object;
  }

  /**
   * Sets the resolved destination object and attribute swizzle.
   * Adapted: retained JS property lookup differs from native stored-member
   * lookup/type admission (cpp:9-28,391-478); that algorithm gap is held.
   * @param {object|null} target Candidate target.
   * @param {string} attribute Member and optional component suffix.
   * @returns {boolean} Whether storage resolved.
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetDestination(target, attribute)
  {
    this.Unlink();
    const parsed = Tr2BindingPoint._parseAttribute(attribute);
    if (!Tr2BindingPoint._isObjectRecord(target) || !parsed || !parsed.name)
    {
      return false;
    }
    if (!(parsed.name in target))
    {
      return false;
    }
    const current = target[parsed.name];
    if (parsed.offset !== -1 && (!isArrayLike(current) || parsed.offset >= current.length))
    {
      return false;
    }
    this.resolvedObject = target;
    this.destination = current;
    this.entry = parsed.name;
    this.entryOffset = parsed.offset;
    this.arraySize = isArrayLike(current) ? current.length : 0;
    this._target = target;
    this._attributeName = parsed.name;
    return true;
  }

  /**
   * Walks a binding path of the form `Root.child[0].other["name"]` against the
   * supplied name/value root pairs, returning the addressed object or null if
   * any step fails.
   * @param {string} path Authored path.
   * @param {Array<Array>} roots Named root pairs.
   * @returns {object|null} Resolved object.
   */
  static ResolvePath(path, roots)
  {
    if (!path)
    {
      return null;
    }
    const root = Tr2BindingPoint._readIdentifier(path, 0);
    if (!root)
    {
      return null;
    }
    let object = null;
    for (const [name, value] of roots)
    {
      if (name === root.value)
      {
        object = value;
        break;
      }
    }
    let index = root.next;
    while (object && index < path.length)
    {
      if (path[index] === ".")
      {
        const property = Tr2BindingPoint._readIdentifier(path, index + 1);
        if (!property || !Tr2BindingPoint._isObjectRecord(object))
        {
          return null;
        }
        object = object[property.value];
        index = property.next;
        continue;
      }
      const selector = Tr2BindingPoint._readIndex(path, index);
      if (!selector)
      {
        return null;
      }
      object = Tr2BindingPoint._getListElement(object, selector.value);
      index = selector.next;
    }
    return Tr2BindingPoint._isObjectRecord(object) ? object : null;
  }

  /**
   * Normalizes the `roots` argument into name/value pairs, accepting an array of
   * pairs, a plain object map, or a controller whose owner is exposed as `Owner`
   * alongside its own binding path roots.
   * Custom: adapts JavaScript root argument forms.
   * @param {Array|object|null} roots Root pairs, map or controller.
   * @param {object|null} owner Explicit owner.
   * @returns {Array<Array>} Named root pairs.
   */
  @meta.impl.custom
  static _getLinkRoots(roots, owner)
  {
    if (Array.isArray(roots))
    {
      return roots.slice();
    }
    if (Tr2BindingPoint._isPlainRootMap(roots))
    {
      return Object.entries(roots).map(([name, value]) => [name, value && typeof value === "object" ? value : null]);
    }
    const controller = roots;
    const out = [];
    const controllerOwner = owner ?? controller?.GetOwner() ?? null;
    if (controllerOwner)
    {
      out.push(["Owner", controllerOwner]);
    }
    if (controller)
    {
      out.push(...(controller.GetBindingPathRoots()));
    }
    return out;
  }

  /**
   * Splits `field.x` into a property name and a component offset; returns an
   * offset of -1 for a whole-field binding and null when the suffix is not a
   * single valid xyzw/rgba swizzle.
   * @param {string} attribute Authored member name.
   * @returns {object|null} Name and component offset.
   */
  @meta.impl.custom
  static _parseAttribute(attribute)
  {
    const dot = attribute.indexOf(".");
    if (dot === -1)
    {
      return { name: attribute, offset: -1 };
    }
    const swizzle = attribute.slice(dot + 1);
    if (swizzle.length !== 1 || SWIZZLE_OFFSETS[swizzle] === undefined)
    {
      return null;
    }
    return { name: attribute.slice(0, dot), offset: SWIZZLE_OFFSETS[swizzle] };
  }

  /**
   * Reads a C-style identifier starting at an index, returning its text and the
   * index just past it.
   * @param {string} path Authored path.
   * @param {number} index Character offset.
   * @returns {object|null} Identifier and next offset.
   */
  @meta.impl.custom
  static _readIdentifier(path, index)
  {
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(path.slice(index));
    return match ? { value: match[0], next: index + match[0].length } : null;
  }

  /**
   * Reads a bracketed selector, which is either a possibly negative integer
   * index or a double-quoted name.
   * @param {string} path Authored path.
   * @param {number} index Character offset.
   * @returns {object|null} Selector and next offset.
   */
  @meta.impl.custom
  static _readIndex(path, index)
  {
    if (path[index] !== "[")
    {
      return null;
    }
    const end = path.indexOf("]", index + 1);
    if (end === -1)
    {
      return null;
    }
    const body = path.slice(index + 1, end);
    if (/^-?\d+$/.test(body))
    {
      return { value: Number(body), next: end + 1 };
    }
    if (body.length >= 2 && body[0] === '"' && body[body.length - 1] === '"')
    {
      return { value: body.slice(1, -1), next: end + 1 };
    }
    return null;
  }

  /**
   * Selects an element from a list by integer index, counting from the end for
   * negative values, or by matching the element's `name`.
   * @param {object|null} object List or existing JS wrapper.
   * @param {number|string} selector Index or name.
   * @returns {object|null} Selected item.
   */
  @meta.impl.custom
  static _getListElement(object, selector)
  {
    if (!object)
    {
      return null;
    }
    const list = Array.isArray(object) ? object : Tr2BindingPoint._isObjectRecord(object) ? Tr2BindingPoint._findListProperty(object) : null;
    if (!list)
    {
      return null;
    }
    if (typeof selector === "number")
    {
      const index = selector < 0 ? list.length + selector : selector;
      return index >= 0 && index < list.length ? list[index] : null;
    }
    return list.find(item => Tr2BindingPoint._isObjectRecord(item) && item.name === selector) ?? null;
  }

  /**
   * Finds the array a bracketed selector should index into, checking `items`,
   * `children`, `curveSets`, `controllers` and `actions` in that order.
   * @param {object} object Existing JS list wrapper.
   * @returns {Array|null} First recognized array.
   */
  @meta.impl.custom
  static _findListProperty(object)
  {
    for (const name of ["items", "children", "curveSets", "controllers", "actions"])
    {
      if (Array.isArray(object[name]))
      {
        return object[name];
      }
    }
    return null;
  }

  /**
   * Adapted: retained JavaScript destination notification adapter. Native
   * cpp:476-477 captures mapped INotify and cpp:356-358 calls OnModified; the
   * target migration is separate from removing this helper's model base.
   * Tells the target its property changed through the first of UpdateValues,
   * OnValueChanged or OnModified that it implements, and otherwise marks the
   * field in a `_dirty` record.
   * @param {object} target Destination.
   * @param {string} attribute Changed member.
   * @param {*} value Assigned value.
   * @param {Tr2BindingPoint} source Binding source.
   * @returns {void}
   */
  @meta.impl.custom
  static _notifyValueChanged(target, attribute, value, source)
  {
    if (Tr2BindingPoint._hasFunction(target, "UpdateValues"))
    {
      target.UpdateValues({ property: attribute, source });
    }
    else if (Tr2BindingPoint._hasFunction(target, "OnValueChanged"))
    {
      target.OnValueChanged(attribute, value, source);
    }
    else if (Tr2BindingPoint._hasFunction(target, "OnModified"))
    {
      target.OnModified(attribute);
    }
    else if (Tr2BindingPoint._isObjectRecord(target._dirty))
    {
      target._dirty[attribute] = true;
    }
  }

  /**
   * Compares two array-likes element-wise with Object.is, used to decide whether
   * a vector write actually changed anything.
   * @param {ArrayLike} a Previous values.
   * @param {ArrayLike} b Current values.
   * @returns {boolean} Whether every value matches.
   */
  @meta.impl.custom
  static _areArrayValuesEqual(a, b)
  {
    if (a.length !== b.length)
    {
      return false;
    }
    for (let i = 0; i < a.length; i++)
    {
      if (!Object.is(a[i], b[i]))
      {
        return false;
      }
    }
    return true;
  }

  /**
   * Distinguishes a plain name-to-object root map from a controller, by checking
   * that it exposes neither GetOwner nor GetBindingPathRoots.
   * @param {*} value Candidate root map.
   * @returns {boolean} Whether it is a supported plain map.
   */
  @meta.impl.custom
  static _isPlainRootMap(value)
  {
    return Tr2BindingPoint._isObjectRecord(value) && !Tr2BindingPoint._hasFunction(value, "GetOwner") && !Tr2BindingPoint._hasFunction(value, "GetBindingPathRoots");
  }

  /**
   * Checks that a value is a non-null object and so can be indexed by a path
   * step.
   * @param {*} value Candidate object.
   * @returns {boolean} Whether it is non-null object storage.
   */
  @meta.impl.custom
  static _isObjectRecord(value)
  {
    return !!value && typeof value === "object";
  }

  /** Checks that a value is an object whose named key is callable.
   * @param {*} value Candidate object.
   * @param {string} key Method name.
   * @returns {boolean} Whether the existing adapter callback is callable.
   */
  @meta.impl.custom
  static _hasFunction(value, key)
  {
    return Tr2BindingPoint._isObjectRecord(value) && typeof value[key] === "function";
  }
}
