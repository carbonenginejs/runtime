// Source: blue/include/IBlueResMan.h:135, blue/include/IBluePaths.h:49,
//   blue/include/IBlueOS.h:226 (process-wide Be* service references).
// Source: blue/src/blue.cpp:333-395 (the Find functions' exposure on the `blue` module).
//
// Carbon registers blueexposure's Find functions (Find.h) on the `blue`
// module; here they are instance methods of the `blue` holder (operator
// ruling, 2026-10-11) that forward to their bodies, the camelCase statics on
// BlueClasses (Weka, 2026-11-01: free functions become statics, and
// blueexposure's BlueClasses is their home). Modules the holder itself imports
// call the statics: importing the `blue` instance from them would be an
// import cycle.
//
// NOTE ON DECORATORS: this folder cannot use `@` syntax (see CcpTime.js), so
// the declarations are made imperatively at the bottom of the file.
import { CjsSchema } from "#schema";
import { BluePaths } from "./BluePaths.js";
import { BlueOS } from "./BlueOS.js";
import { BlueClasses } from "../blueexposure/BlueClasses.js";
import { BeClasses } from "../blueexposure/classes/registry.js";
import { blueEnums } from "./enums/CjsBlueEnumRegistry.js";
import { CjsWwiseSoundEngineStub } from "../../global/audio/CjsWwiseSoundEngineStub.js";

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

  /** Resource manager installed by Blue composition before acquisition. */
  resMan = null;

  /** Path service with no filesystem or remote cache installed initially. */
  paths = new BluePaths();

  /** Host-pumped clock; construction does not register any tick recipient. */
  os = new BlueOS();

  /** Carbon's `BeClasses` (BlueClasses.cpp:28): blueexposure's registry, made by `BlueClasses.initialize()`. */
  classes = BlueClasses.initialize() ? BeClasses : null;

  /** Installed SOF service; absent until the composition root supplies it. */
  sof = null;

  /**
   * Ours: the one character library, a `CjsCharacterLibraryManager`, shared by
   * every character as the SOF's data is by every ship. Absent until the
   * composition root (`CjsLibrary.Initialize`) supplies it, as `sof` is; this
   * layer never imports it (non-carbon-extensions.md § *The shared character
   * library*).
   */
  characterLibrary = null;

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
   * @adapted Carbon reports a collection member's list object as a child and
   *   reaches the list's items through the list's own IList/IBlueDict interface.
   *   JavaScript collections are not Blue objects, so a declared collection's
   *   object items are reported here as children of the owner, with the member
   *   and the item's index or key. A direct member reports a null index (Carbon
   *   passes 0). Members run in the class's canonical order, derived to base, as
   *   Carbon walks `mParentClassInfo`; storage is read without running accessors.
   * @param {object|null} obj Object whose immediate children are enumerated.
   * @param {function(object, object, (number|string|null)): void} onChild
   *   Receives the child, the member declaration, and the collection index or
   *   key (null for a direct member).
   * @returns {void}
   */
  EnumerateChildren(obj, onChild)
  {
    BlueClasses.enumerateChildren__OnChild(obj, onChild);
  }

  /**
   * `EnumerateChildren(obj, onAttribute, onListItem, onDictItem, filter)`:
   * see `BlueClasses.enumerateChildren__Filter`.
   *
   * @adapted
   * @param {object|null} obj Object whose immediate children are enumerated.
   * @param {function(object, Function, object, number): void} onAttribute Direct member child.
   * @param {function(object, number, object, object): void} onListItem List or set item.
   * @param {function(object, string, object, object): void} onDictItem Map value.
   * @param {function(object): boolean} filter Member declaration test.
   * @returns {void}
   */
  EnumerateChildren__Filter(obj, onAttribute, onListItem, onDictItem, filter)
  {
    BlueClasses.enumerateChildren__Filter(obj, onAttribute, onListItem, onDictItem, filter);
  }

  /**
   * `FindRoute`: every route from one object to another. Carbon's `blue` module exposes Find.h's functions
   * (blue/src/blue.cpp:333-395); the body is `BlueClasses.findRoute`.
   *
   * @implemented
   * @param {object} from Start of the routes.
   * @param {object} to End of the routes.
   * @returns {Array<Array<Array<*>>>} Every route.
   */
  FindRoute(from, to)
  {
    return BlueClasses.findRoute(from, to);
  }

  /**
   * `FindFirstRoute`: the first route from one object to another. Carbon's `blue` module exposes Find.h's functions
   * (blue/src/blue.cpp:333-395); the body is `BlueClasses.findFirstRoute`.
   *
   * @implemented
   * @param {object} from Start of the route.
   * @param {object} to End of the route.
   * @returns {Array<Array<*>>} The route.
   */
  FindFirstRoute(from, to)
  {
    return BlueClasses.findFirstRoute(from, to);
  }

  /**
   * `FindAllReferences`: every object in a tree, with the references that reach it. Carbon's `blue` module exposes Find.h's functions
   * (blue/src/blue.cpp:333-395); the body is `BlueClasses.findAllReferences`.
   *
   * @implemented
   * @param {IRoot} root Root of the tree.
   * @returns {Map<object, Array<Array<*>>>} References per reached object.
   */
  FindAllReferences(root)
  {
    return BlueClasses.findAllReferences(root);
  }

  /**
   * `FindInterface`: every object in a hierarchy that maps an interface. Carbon's `blue` module exposes Find.h's functions
   * (blue/src/blue.cpp:333-395); the body is `BlueClasses.findInterface`.
   *
   * @implemented
   * @param {object|null} obj Root object.
   * @param {string} iidName Interface name.
   * @returns {object[]} Objects mapping the interface.
   */
  FindInterface(obj, iidName)
  {
    return BlueClasses.findInterface(obj, iidName);
  }

  /**
   * `FindReference`: whether one object is reachable from another. Carbon's `blue` module exposes Find.h's functions
   * (blue/src/blue.cpp:333-395); the body is `BlueClasses.findReference`.
   *
   * @implemented
   * @param {object|null} from Source object.
   * @param {object|null} to Destination object.
   * @returns {boolean} Whether to is reachable from from.
   */
  FindReference(from, to)
  {
    return BlueClasses.findReference(from, to);
  }
}

CjsSchema.meta.define(CjsBlue, {
  className: "CjsBlue",
  fields: {},
  methods: {
    Fetch: [],
    EnumerateChildren: [],
    EnumerateChildren__Filter: [],
    FindRoute: [],
    FindFirstRoute: [],
    FindAllReferences: [],
    FindInterface: [],
    FindReference: []
  }
});
