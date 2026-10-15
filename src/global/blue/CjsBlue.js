// Source: blue/include/IBlueResMan.h:135, blue/include/IBluePaths.h:49,
//   blue/include/IBlueOS.h:226 (process-wide Be* service references).
// Source: blueexposure/include/Find.h:66-148 (EnumerateChildren),
//   blueexposure/Find.cpp:147-599 (FindRoute, FindFirstRoute, FindAllReferences,
//   FindInterface, FindReference), blue/src/blue.cpp:333-395 (their exposure).
//
// Carbon registers the Find functions on the `blue` module; here they are
// instance methods of the `blue` holder (operator ruling, 2026-10-11).
// Carbon's EnumerateChildren is a free template function needing no receiver,
// so its body is the static `CjsBlue.enumerateChildren` (free functions
// become camelCase statics) and the instance methods delegate to it. Modules
// the holder itself imports (getResources, CjsBlueClasses) call the static:
// importing the `blue` instance from them would be an import cycle.
//
// NOTE ON DECORATORS: this folder cannot use `@` syntax (see CcpTime.js), so
// the declarations are made imperatively at the bottom of the file.
import { CjsSchema, meta, blue } from "#schema";
import { getCarbonTypeDefinition, inferCarbonTypeFromCpp } from "../schema/types/carbonTypes.js";
import { ownMappedInterfaces } from "../compose/interface.js";
import { CjsBlueResMan } from "./CjsBlueResMan.js";
import { CjsBluePaths } from "./CjsBluePaths.js";
import { CjsBlueOS } from "./CjsBlueOS.js";
import { CjsBlueClasses } from "./CjsBlueClasses.js";
import { blueEnums } from "./enums/CjsBlueEnumRegistry.js";
import { CjsWwiseSoundEngineStub } from "../audio/CjsWwiseSoundEngineStub.js";

/**
 * Inert holder of the process-wide Blue facilities. Construction creates only
 * local state: no tick registration, pumping, workers, fetch or device work.
 * SOF and playback implementations are installed by the composition root;
 * this layer never imports them. Enum/class registration remains shared with
 * schema so module definitions and the holder have one authoritative registry.
 */
export class CjsBlue
{
  /** Named enum definitions shared with schema. */
  enums = blueEnums;

  /** Resource manager, configured by the application before acquisition. */
  resMan = new CjsBlueResMan();

  /** Path service with no filesystem or remote cache installed initially. */
  paths = new CjsBluePaths();

  /** Host-pumped clock; construction does not register any tick recipient. */
  os = new CjsBlueOS();

  /** Registry facade over the shared class declarations. */
  classes = new CjsBlueClasses();

  /** Installed SOF service; absent until the composition root supplies it. */
  sof = null;

  /** Silent, dependency-light default; an installed playback engine replaces it. */
  audio = new CjsWwiseSoundEngineStub();

  /**
   * Delegates DNA to the installed SOF and all other requests to ResMan.
   * Custom: the application-facing common entry point needs only this routing.
   * Three or more colon-separated segments identify DNA unless a path scheme
   * is present. Carbon's backslash path spelling is accepted alongside '/'.
   * Options and results pass through unchanged; the services own readiness.
   */
  async Fetch(value, options)
  {
    if (typeof value === "string" && !/^[a-z][a-z0-9+.-]*:[/\\]/i.test(value)
      && value.split(":").length >= 3)
    {
      if (!this.sof) throw new Error("SOF is not configured");
      return this.sof.Fetch(value, options);
    }
    return this.resMan.Fetch(value, options);
  }

  /**
   * `EnumerateChildren(obj, onChild)` (Find.h:139-148): every object an
   * object references directly, through its members and its collections.
   *
   * Adapted: Carbon reports a collection member's list object as a child and
   * reaches the list's items through the list's own IList/IBlueDict interface.
   * JavaScript collections are not Blue objects, so a declared collection's
   * object items are reported here as children of the owner, with the member
   * and the item's index or key. A direct member reports a null index (Carbon
   * passes 0). Members run in the class's canonical order, derived to base, as
   * Carbon walks `mParentClassInfo`; storage is read without running accessors.
   *
   * @param {object|null} obj Object whose immediate children are enumerated.
   * @param {function(object, object, (number|string|null)): void} onChild
   *   Receives the child, the member declaration, and the collection index or
   *   key (null for a direct member).
   * @returns {void}
   */
  EnumerateChildren(obj, onChild)
  {
    CjsBlue.enumerateChildren(obj, onChild);
  }

  /**
   * `EnumerateChildren(obj, onAttribute, onListItem, onDictItem, filter)`:
   * see `CjsBlue.enumerateChildren__Filter`.
   *
   * @param {object|null} obj Object whose immediate children are enumerated.
   * @param {function(object, Function, object, number): void} onAttribute Direct member child.
   * @param {function(object, number, object, object): void} onListItem List or set item.
   * @param {function(object, string, object, object): void} onDictItem Map value.
   * @param {function(object): boolean} filter Member declaration test.
   * @returns {void}
   */
  EnumerateChildren__Filter(obj, onAttribute, onListItem, onDictItem, filter)
  {
    CjsBlue.enumerateChildren__Filter(obj, onAttribute, onListItem, onDictItem, filter);
  }

  /**
   * Carbon's free `EnumerateChildren(obj, onChild)` (Find.h:139-148): see
   * the instance method EnumerateChildren for the reported arguments.
   *
   * @param {object|null} obj Object whose immediate children are enumerated.
   * @param {function(object, object, (number|string|null)): void} onChild
   *   Receives the child, the member declaration, and the collection index or key.
   * @returns {void}
   */
  static enumerateChildren(obj, onChild)
  {
    CjsBlue.enumerateChildren__Filter(
      obj,
      (child, _type, member) => onChild(child, member, null),
      (child, index, member) => onChild(child, member, index),
      (child, key, member) => onChild(child, member, key),
      () => true
    );
  }

  /**
   * `EnumerateChildren(obj, onAttribute, onListItem, onDictItem, filter)`
   * (Find.h:66-137): the enumeration with a callback per kind of child and a
   * member filter. The filter decides for every member, collections included,
   * as Carbon's does for every IROOT/IROOTPTR member.
   *
   * Adapted: as EnumerateChildren, collection items are reported for the
   * owner's member. onAttribute receives the declaring class where Carbon passes
   * its ClassInfo, and 0 for Carbon's member offset; onListItem and onDictItem
   * also receive the member and the collection, which Carbon reaches through
   * the list object itself.
   *
   * @param {object|null} obj Object whose immediate children are enumerated.
   * @param {function(object, Function, object, number): void} onAttribute
   *   Direct member child: child, declaring class, member, offset.
   * @param {function(object, number, object, object): void} onListItem
   *   List or set item: child, index, member, collection.
   * @param {function(object, string, object, object): void} onDictItem
   *   Map value: child, key, member, map.
   * @param {function(object): boolean} filter Member declaration test.
   * @returns {void}
   */
  static enumerateChildren__Filter(obj, onAttribute, onListItem, onDictItem, filter)
  {
    if (obj === null || typeof obj !== "object") return;

    for (const member of CjsSchema.getSchema(obj.constructor).members)
    {
      if (member.role !== "member" || !filter(member)) continue;

      let value = CjsBlue._readStorage(obj, member.key);
      if (member.index !== undefined) value = CjsBlue._readStorage(value, member.index);

      CjsBlue._enumerateValue(value, member.type, (child, kind, index, container) =>
      {
        if (kind === "list") onListItem(child, index, member, container);
        else if (kind === "dict") onDictItem(child, index, member, container);
        else onAttribute(child, member.declaringClass, member, 0);
      });
    }
  }

  /**
   * `FindRoute` (Find.cpp:436-463): every route from one object to another.
   * Each route is a list of steps `[parent, type, key]`, type 0 for an
   * attribute (key = member name) and 1 for an index (key = index or map key).
   * Carbon's search marks each object seen once, so a node shared by two routes
   * yields only the first route through it.
   *
   * Adapted: a step into a collection item is the two steps Carbon would take,
   * `[owner, 0, member]` then `[collection, 1, index]`, because a JavaScript
   * collection is not a Blue object in the enumeration.
   *
   * @param {object} from Start of the routes.
   * @param {object} to End of the routes.
   * @returns {Array<Array<Array<*>>>} Every route; `[[]]` when from is to.
   * @throws {Error} When either argument is null, as Carbon's ValueError.
   */
  FindRoute(from, to)
  {
    if (!from || !to) throw new Error("neither from nor to parameter can be None");

    const result = [];
    this._EnumerateRoutes(from, to, stack =>
    {
      result.push(CjsBlue._routeOf(stack));
      return true;
    });
    return result;
  }

  /**
   * `FindFirstRoute` - Blue's exposure is `PyFindFirstRoute`
   * (Find.cpp:466-504): the first route found from one object to another, in
   * FindRoute's step format.
   *
   * Not supported: Carbon's C++ overload filling a `std::vector<RouteStep>`
   * (Find.cpp:400-433) and the RouteStep class are not ported; nothing here
   * replays a route.
   *
   * @param {object} from Start of the route.
   * @param {object} to End of the route.
   * @returns {Array<Array<*>>} The route; empty when from is to.
   * @throws {TypeError} When either argument is null.
   * @throws {Error} When no route exists, as Carbon's ValueError.
   */
  FindFirstRoute(from, to)
  {
    if (!from || !to) throw new TypeError("Argument 'from' or 'to' are not of type IRoot.");
    if (from === to) return [];

    let path = null;
    this._EnumerateRoutes(from, to, stack =>
    {
      path = CjsBlue._routeOf(stack);
      return false;
    });

    if (path) return path;
    throw new Error("No valid route found.");
  }

  /**
   * `FindAllReferences` (Find.cpp:551-599): every object in a tree, mapped to
   * the references that reach it, each `[parent, type, key]` as FindRoute's
   * steps.
   *
   * Adapted: Carbon returns a Python dict keyed by object; this returns a Map.
   * A collection item's reference names its collection and index, as Carbon
   * names the list object; the collection itself is not a key.
   *
   * @param {object|null} root Root of the tree.
   * @returns {Map<object, Array<Array<*>>>} References per reached object.
   */
  FindAllReferences(root)
  {
    const result = new Map();
    if (!root) return result;

    const record = (child, reference) =>
    {
      let found = result.get(child);
      if (!found)
      {
        found = [];
        result.set(child, found);
      }
      found.push(reference);
    };

    const stack = [ root ];
    const seen = new Set();
    while (stack.length)
    {
      const obj = stack.pop();
      if (seen.has(obj)) continue;
      seen.add(obj);

      this.EnumerateChildren__Filter(
        obj,
        (child, _type, member) =>
        {
          stack.push(child);
          record(child, [ obj, 0, member.name ]);
        },
        (child, index, _member, collection) =>
        {
          stack.push(child);
          record(child, [ collection, 1, index ]);
        },
        (child, key, _member, map) =>
        {
          stack.push(child);
          record(child, [ map, 1, key ]);
        },
        () => true
      );
    }
    return result;
  }

  /**
   * `FindInterface` (Find.cpp:352-396): every object in an object's hierarchy
   * that maps the named interface, in Carbon's stack order.
   *
   * Carbon known defect CE-114, reproduced: `IsMatch( IRoot*, const Be::IID& )`
   * (Find.cpp:159-173) loops up `mParentClassInfo` but reads the concrete
   * class's `mInterfaceTable` on every pass, so an interface mapped only by a
   * chained parent never matches. Only the object's own table is tested here.
   *
   * @param {object|null} obj Root object.
   * @param {string} iidName Interface name.
   * @returns {object[]} Objects mapping the interface.
   */
  FindInterface(obj, iidName)
  {
    const result = [];
    if (!obj) return result;

    const Interface = CjsSchema.GetConstructor(iidName);
    const stack = [ obj ];
    const seen = new Set();
    while (stack.length)
    {
      const current = stack.pop();
      if (seen.has(current)) continue;
      seen.add(current);

      if (Interface && ownMappedInterfaces(current.constructor).has(Interface)) result.push(current);

      this.EnumerateChildren(current, child => stack.push(child));
    }
    return result;
  }

  /**
   * `FindReference` (Find.cpp:507-548): whether one object is reachable from
   * another.
   *
   * @param {object|null} from Source object.
   * @param {object|null} to Destination object.
   * @returns {boolean} True when `to` is `from` or is referenced below it.
   */
  FindReference(from, to)
  {
    if (from === to) return true;
    if (!from || !to) return false;

    const stack = [ from ];
    const seen = new Set();
    while (stack.length)
    {
      const current = stack.pop();
      if (seen.has(current)) continue;
      seen.add(current);

      if (current === to) return true;

      this.EnumerateChildren(current, child => stack.push(child));
    }
    return false;
  }

  /**
   * `EnumerateRoutes` (Find.cpp:250-308): Carbon's depth-first route walk.
   * Entries keep their parent's stack index, so the stack itself is the route
   * when `to` is reached; the level comparison pops finished branches.
   *
   * Adapted: the anonymous-namespace template becomes a private method; its
   * stack entry type is one record shape.
   *
   * @param {object} from Start object.
   * @param {object} to End object.
   * @param {function(object[]): boolean} operation Receives the stack at each
   *   arrival; false stops the walk.
   * @returns {void}
   */
  _EnumerateRoutes(from, to, operation)
  {
    const stack = [];
    if (from === to)
    {
      operation(stack);
      return;
    }

    const seen = new Set();
    stack.push({ obj: from, level: 0, parent: -1, member: null, index: 0, collection: null });
    let prevLevel = 0;

    while (stack.length)
    {
      const e = stack[stack.length - 1];
      if (e.level < prevLevel)
      {
        prevLevel = e.level;
        stack.pop();
        continue;
      }
      prevLevel = e.level + 1;

      const obj = e.obj;
      if (obj === to)
      {
        if (!operation(stack)) return;
      }
      else
      {
        if (seen.has(obj)) continue;
        seen.add(obj);

        const parent = stack.length - 1;
        const level = e.level + 1;
        this.EnumerateChildren__Filter(
          obj,
          (child, _type, member) => stack.push({ obj: child, level, parent, member, index: 0, collection: null }),
          (child, index, member, collection) => stack.push({ obj: child, level, parent, member, index, collection }),
          (child, key, member, map) => stack.push({ obj: child, level, parent, member, index: key, collection: map }),
          () => true
        );
      }
    }
  }

  /**
   * The route a stack describes, as `GetPathItem` steps (Find.cpp:176-190).
   *
   * @param {object[]} stack EnumerateRoutes' stack at an arrival.
   * @returns {Array<Array<*>>} Steps from the start object.
   */
  static _routeOf(stack)
  {
    const path = [];
    let idx = stack.length - 1;
    while (idx > 0)
    {
      const step = stack[idx];
      const parent = stack[step.parent].obj;
      if (step.collection) path.unshift([ parent, 0, step.member.name ], [ step.collection, 1, step.index ]);
      else path.unshift([ parent, 0, step.member.name ]);
      idx = step.parent;
    }
    return path;
  }

  /**
   * Reads declared storage without running a live getter.
   *
   * @param {*} value Owner.
   * @param {string|number} key Storage key or index.
   * @returns {*} The stored value, or undefined.
   */
  static _readStorage(value, key)
  {
    for (let current = value; current !== null && typeof current === "object";
      current = Object.getPrototypeOf(current))
    {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor) return descriptor.value;
    }
    return undefined;
  }

  /**
   * Resolves a collection's constructor or name shorthand to a type descriptor.
   *
   * @param {*} type Declared type, item type or value type.
   * @returns {object|*} The descriptor.
   */
  static _describeType(type)
  {
    if (typeof type === "function") return { kind: "rootRef", className: type };
    if (typeof type !== "string") return type;
    if (type === "rootWeak") return { kind: "rootWeak" };
    if (CjsSchema.GetConstructor(type)) return { kind: "rootRef", className: type };
    const declared = getCarbonTypeDefinition(type);
    if (declared.kind !== "unknown" || type === "unknown") return declared;
    const native = inferCarbonTypeFromCpp(type);
    if (native.kind !== "unknown" && native.kind !== "enum") return native;
    // Unregistered native interface names are still explicit reference types.
    return { kind: "rootRef", className: type };
  }

  /**
   * Reports the object children a declared value holds: the value itself for
   * a reference, or its items for a declared list, set or map. Weak, opaque,
   * unknown and value-typed declarations are not edges, as only Carbon's
   * IROOT/IROOTPTR members are.
   *
   * @param {*} value Stored value.
   * @param {*} declaration Its declared type.
   * @param {function(object, string, (number|string|null), (object|null)): void} visit
   *   Receives child, kind ("attribute", "list" or "dict"), index or key, and collection.
   * @param {string} [kind="attribute"] Kind of the enclosing position.
   * @param {number|string|null} [index=null] Index or key in the enclosing collection.
   * @param {object|null} [collection=null] The enclosing collection.
   * @returns {void}
   */
  static _enumerateValue(value, declaration, visit, kind = "attribute", index = null, collection = null)
  {
    if (value === null || typeof value !== "object") return;
    const type = CjsBlue._describeType(declaration);
    switch (type?.kind)
    {
      case "rootRef":
        visit(value, kind, index, collection);
        return;

      case "root":
        if (type.className) visit(value, kind, index, collection);
        return;

      case "array":
      case "list":
      case "set":
      {
        const items = type.kind === "set" && value instanceof Set ? Array.from(value) : value;
        if (!Array.isArray(items)) return;
        for (let i = 0; i < items.length; i++)
        {
          const entry = Object.getOwnPropertyDescriptor(items, i);
          if (entry) CjsBlue._enumerateValue(entry.value, type.itemType, visit, "list", i, value);
        }
        return;
      }

      case "map":
      {
        const entries = value instanceof Map
          ? Array.from(value.entries())
          : Object.keys(value).map(key => [ key, Object.getOwnPropertyDescriptor(value, key).value ]);
        for (const [ key, item ] of entries) CjsBlue._enumerateValue(item, type.valueType, visit, "dict", key, value);
        return;
      }
    }
  }
}

CjsSchema.meta.define(CjsBlue, {
  className: "CjsBlue",
  fields: {},
  methods: {
    Fetch: [ meta.ours ],
    EnumerateChildren: [ meta.adapted ],
    EnumerateChildren__Filter: [ meta.adapted ],
    enumerateChildren: [ meta.adapted ],
    enumerateChildren__Filter: [ meta.adapted ],
    FindRoute: [ blue.method, meta.adapted ],
    FindFirstRoute: [ blue.method, meta.adapted ],
    FindAllReferences: [ blue.method, meta.adapted ],
    FindInterface: [ blue.method, meta.implemented ],
    FindReference: [ blue.method, meta.implemented ],
    _EnumerateRoutes: [ meta.adapted ]
  }
});
