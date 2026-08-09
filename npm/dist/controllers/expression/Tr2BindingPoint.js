import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { copyArrayLike, fillArrayLike } from '@carbonenginejs/runtime-utils/utils';
import { isArrayLike } from '@carbonenginejs/runtime-utils/is';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl, CjsSchema } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_path, _init_extra_path, _init_object, _init_extra_object, _init_attribute, _init_extra_attribute, _init_resolvedObject, _init_extra_resolvedObject, _init_notifyPtr, _init_extra_notifyPtr, _init_entry, _init_extra_entry, _init_destination, _init_extra_destination, _init_entryOffset, _init_extra_entryOffset, _init_arraySize, _init_extra_arraySize;
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
 */
let _Tr2BindingPoint;
new class extends _identity {
  static [class Tr2BindingPoint extends CjsModel {
    static {
      ({
        e: [_init_path, _init_extra_path, _init_object, _init_extra_object, _init_attribute, _init_extra_attribute, _init_resolvedObject, _init_extra_resolvedObject, _init_notifyPtr, _init_extra_notifyPtr, _init_entry, _init_extra_entry, _init_destination, _init_extra_destination, _init_entryOffset, _init_extra_entryOffset, _init_arraySize, _init_extra_arraySize, _initProto],
        c: [_Tr2BindingPoint, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2BindingPoint",
        family: "controllers"
      })], [[[io, io.notify, io, io.persist, type, type.string], 16, "path"], [[io, io.notify, io, io.persist, void 0, type.objectRef("IRoot")], 16, "object"], [[io, io.notify, io, io.persist, type, type.string], 16, "attribute"], [type.objectRef("IRoot"), 0, "resolvedObject"], [type.objectRef("INotify"), 0, "notifyPtr"], [type.objectRef("Be::VarEntry"), 0, "entry"], [type.objectRef("Be::Var"), 0, "destination"], [[type, type.int32], 16, "entryOffset"], [[type, type.int32], 16, "arraySize"], [[carbon, carbon.method, impl, impl.adapted], 18, "Link"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unlink"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsValid"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundObject"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetDestination"]], 0, void 0, CjsModel));
    }
    path = (_initProto(this), _init_path(this, ""));
    object = (_init_extra_path(this), _init_object(this, null));
    attribute = (_init_extra_object(this), _init_attribute(this, ""));
    resolvedObject = (_init_extra_attribute(this), _init_resolvedObject(this, null));
    notifyPtr = (_init_extra_resolvedObject(this), _init_notifyPtr(this, null));
    entry = (_init_extra_notifyPtr(this), _init_entry(this, null));
    destination = (_init_extra_entry(this), _init_destination(this, null));
    entryOffset = (_init_extra_destination(this), _init_entryOffset(this, -1));
    arraySize = (_init_extra_entryOffset(this), _init_arraySize(this, 0));
    #target = (_init_extra_arraySize(this), null);
    #attributeName = "";

    /**
     * Resolves and links this binding against named root objects.
     */
    Link(roots = null, owner = null) {
      this.Unlink();
      const target = this.path ? _Tr2BindingPoint.ResolvePath(this.path, _Tr2BindingPoint.#getLinkRoots(roots, owner)) : this.object ?? owner;
      return this.SetDestination(target, this.attribute);
    }

    /**
     * Clears the resolved binding target.
     */
    Unlink() {
      this.resolvedObject = null;
      this.notifyPtr = null;
      this.entry = null;
      this.destination = null;
      this.entryOffset = -1;
      this.arraySize = 0;
      this.#target = null;
      this.#attributeName = "";
    }

    /**
     * Checks whether this binding has resolved to a writable target.
     */
    IsValid() {
      return !!this.#target && !!this.#attributeName;
    }

    /**
     * Writes a value into the bound destination.
     */
    SetValue(value, roots = null, owner = null) {
      if (!this.IsValid()) {
        this.Link(roots, owner);
      }
      if (!this.#target || !this.#attributeName) {
        return false;
      }
      const current = this.#target[this.#attributeName];
      const always = CjsSchema.getField(this.#target.constructor, this.#attributeName)?.io?.always === true;
      let changed = false;
      if (this.entryOffset === -1) {
        if (ArrayBuffer.isView(current) && isArrayLike(value)) {
          const previous = Array.from(current);
          current.set(value);
          changed = !_Tr2BindingPoint.#areArrayValuesEqual(previous, current);
        } else if (Array.isArray(current) && isArrayLike(value)) {
          const previous = current.slice();
          copyArrayLike(current, value);
          changed = !_Tr2BindingPoint.#areArrayValuesEqual(previous, current);
        } else if (isArrayLike(current) && typeof current !== "string" && typeof value === "number") {
          const previous = Array.from(current);
          fillArrayLike(current, value);
          changed = !_Tr2BindingPoint.#areArrayValuesEqual(previous, current);
        } else {
          if (always || !Object.is(current, value)) {
            this.#target[this.#attributeName] = value;
            changed = true;
          }
        }
      } else if (isArrayLike(current)) {
        const next = Number(value);
        if (always || !Object.is(current[this.entryOffset], next)) {
          current[this.entryOffset] = next;
          changed = true;
        }
      } else {
        return false;
      }
      if (always) {
        changed = true;
      }
      if (changed) {
        _Tr2BindingPoint.#notifyValueChanged(this.#target, this.#attributeName, value, this);
      }
      return changed;
    }

    /**
     * Reads a numeric value from the bound destination.
     */
    GetValue(roots = null, owner = null, fallback = 0) {
      if (!this.IsValid()) {
        this.Link(roots, owner);
      }
      if (!this.#target || !this.#attributeName) {
        return fallback;
      }
      const value = this.#target[this.#attributeName];
      if (this.entryOffset !== -1) {
        return isArrayLike(value) && value.length > this.entryOffset ? Number(value[this.entryOffset]) : fallback;
      }
      const number = isArrayLike(value) && typeof value !== "string" ? Number(value[0]) : Number(value);
      return Number.isFinite(number) ? number : fallback;
    }

    /**
     * Gets the resolved object, or the authored direct object.
     */
    GetBoundObject(roots = null, owner = null) {
      if (!this.IsValid()) {
        this.Link(roots, owner);
      }
      return this.resolvedObject ?? this.object;
    }

    /**
     * Sets the resolved destination object and attribute swizzle.
     */
    SetDestination(target, attribute) {
      this.Unlink();
      const parsed = _Tr2BindingPoint.#parseAttribute(attribute);
      if (!_Tr2BindingPoint.#isObjectRecord(target) || !parsed || !parsed.name) {
        return false;
      }
      if (!(parsed.name in target)) {
        return false;
      }
      const current = target[parsed.name];
      if (parsed.offset !== -1 && (!isArrayLike(current) || parsed.offset >= current.length)) {
        return false;
      }
      this.resolvedObject = target;
      this.destination = current;
      this.entry = parsed.name;
      this.entryOffset = parsed.offset;
      this.arraySize = isArrayLike(current) ? current.length : 0;
      this.#target = target;
      this.#attributeName = parsed.name;
      return true;
    }

    /**
     * Walks a binding path of the form `Root.child[0].other["name"]` against the
     * supplied name/value root pairs, returning the addressed object or null if
     * any step fails.
     */
    static ResolvePath(path, roots) {
      if (!path) {
        return null;
      }
      const root = _Tr2BindingPoint.#readIdentifier(path, 0);
      if (!root) {
        return null;
      }
      let object = null;
      for (const [name, value] of roots) {
        if (name === root.value) {
          object = value;
          break;
        }
      }
      let index = root.next;
      while (object && index < path.length) {
        if (path[index] === ".") {
          const property = _Tr2BindingPoint.#readIdentifier(path, index + 1);
          if (!property || !_Tr2BindingPoint.#isObjectRecord(object)) {
            return null;
          }
          object = object[property.value];
          index = property.next;
          continue;
        }
        const selector = _Tr2BindingPoint.#readIndex(path, index);
        if (!selector) {
          return null;
        }
        object = _Tr2BindingPoint.#getListElement(object, selector.value);
        index = selector.next;
      }
      return _Tr2BindingPoint.#isObjectRecord(object) ? object : null;
    }

    /**
     * Normalizes the `roots` argument into name/value pairs, accepting an array of
     * pairs, a plain object map, or a controller whose owner is exposed as `Owner`
     * alongside its own binding path roots.
     */

    /**
     * Splits `field.x` into a property name and a component offset; returns an
     * offset of -1 for a whole-field binding and null when the suffix is not a
     * single valid xyzw/rgba swizzle.
     */

    /**
     * Reads a C-style identifier starting at an index, returning its text and the
     * index just past it.
     */

    /**
     * Reads a bracketed selector, which is either a possibly negative integer
     * index or a double-quoted name.
     */

    /**
     * Selects an element from a list by integer index, counting from the end for
     * negative values, or by matching the element's `name`.
     */

    /**
     * Finds the array a bracketed selector should index into, checking `items`,
     * `children`, `curveSets`, `controllers` and `actions` in that order.
     */

    /**
     * Tells the target its property changed through the first of UpdateValues,
     * OnValueChanged or OnModified that it implements, and otherwise marks the
     * field in a `_dirty` record.
     */

    /**
     * Compares two array-likes element-wise with Object.is, used to decide whether
     * a vector write actually changed anything.
     */

    /**
     * Distinguishes a plain name-to-object root map from a controller, by checking
     * that it exposes neither GetOwner nor GetBindingPathRoots.
     */

    /**
     * Checks that a value is a non-null object and so can be indexed by a path
     * step.
     */

    /** Checks that a value is an object whose named key is callable. */
  }];
  #getLinkRoots(roots, owner) {
    if (Array.isArray(roots)) {
      return roots.slice();
    }
    if (_Tr2BindingPoint.#isPlainRootMap(roots)) {
      return Object.entries(roots).map(([name, value]) => [name, value && typeof value === "object" ? value : null]);
    }
    const controller = roots;
    const out = [];
    const controllerOwner = owner ?? controller?.GetOwner?.() ?? null;
    if (controllerOwner) {
      out.push(["Owner", controllerOwner]);
    }
    if (controller) {
      out.push(...(controller.GetBindingPathRoots?.() ?? []));
    }
    return out;
  }
  #parseAttribute(attribute) {
    const dot = attribute.indexOf(".");
    if (dot === -1) {
      return {
        name: attribute,
        offset: -1
      };
    }
    const swizzle = attribute.slice(dot + 1);
    if (swizzle.length !== 1 || SWIZZLE_OFFSETS[swizzle] === undefined) {
      return null;
    }
    return {
      name: attribute.slice(0, dot),
      offset: SWIZZLE_OFFSETS[swizzle]
    };
  }
  #readIdentifier(path, index) {
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(path.slice(index));
    return match ? {
      value: match[0],
      next: index + match[0].length
    } : null;
  }
  #readIndex(path, index) {
    if (path[index] !== "[") {
      return null;
    }
    const end = path.indexOf("]", index + 1);
    if (end === -1) {
      return null;
    }
    const body = path.slice(index + 1, end);
    if (/^-?\d+$/.test(body)) {
      return {
        value: Number(body),
        next: end + 1
      };
    }
    if (body.length >= 2 && body[0] === '"' && body[body.length - 1] === '"') {
      return {
        value: body.slice(1, -1),
        next: end + 1
      };
    }
    return null;
  }
  #getListElement(object, selector) {
    if (!object) {
      return null;
    }
    const list = Array.isArray(object) ? object : _Tr2BindingPoint.#isObjectRecord(object) ? _Tr2BindingPoint.#findListProperty(object) : null;
    if (!list) {
      return null;
    }
    if (typeof selector === "number") {
      const index = selector < 0 ? list.length + selector : selector;
      return index >= 0 && index < list.length ? list[index] : null;
    }
    return list.find(item => _Tr2BindingPoint.#isObjectRecord(item) && item.name === selector) ?? null;
  }
  #findListProperty(object) {
    for (const name of ["items", "children", "curveSets", "controllers", "actions"]) {
      if (Array.isArray(object[name])) {
        return object[name];
      }
    }
    return null;
  }
  #notifyValueChanged(target, attribute, value, source) {
    if (_Tr2BindingPoint.#hasFunction(target, "UpdateValues")) {
      target.UpdateValues({
        property: attribute,
        source
      });
    } else if (_Tr2BindingPoint.#hasFunction(target, "OnValueChanged")) {
      target.OnValueChanged(attribute, value, source);
    } else if (_Tr2BindingPoint.#hasFunction(target, "OnModified")) {
      target.OnModified({
        property: attribute,
        source
      });
    } else if (_Tr2BindingPoint.#isObjectRecord(target._dirty)) {
      target._dirty[attribute] = true;
    }
  }
  #areArrayValuesEqual(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  #isPlainRootMap(value) {
    return _Tr2BindingPoint.#isObjectRecord(value) && !_Tr2BindingPoint.#hasFunction(value, "GetOwner") && !_Tr2BindingPoint.#hasFunction(value, "GetBindingPathRoots");
  }
  #isObjectRecord(value) {
    return !!value && typeof value === "object";
  }
  #hasFunction(value, key) {
    return _Tr2BindingPoint.#isObjectRecord(value) && typeof value[key] === "function";
  }
  constructor() {
    super(_Tr2BindingPoint), _initClass();
  }
}();

export { _Tr2BindingPoint as Tr2BindingPoint };
//# sourceMappingURL=Tr2BindingPoint.js.map
