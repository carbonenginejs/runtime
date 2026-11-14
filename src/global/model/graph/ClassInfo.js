// Source: blueexposure/include/BlueTypes.h:378-400 (Be::ClassInfo)
// Source: blueexposure/include/BlueExposureMacrosPython.h:20-67 (ExposeToBlue, EXPOSURE_BEGIN_IMP, EXPOSURE_END_IMPL)
//
// The bridge's one record per class. It imports nothing: the schema compiles a
// class's Carbon tables into it at registration (blue/schema/compileClassInfo.js),
// the graph keeps its own parts on the same object, and the registration
// carries that object too.

/**
 * A class's Blue type information: Carbon's `Be::ClassInfo`, which a class's
 * `ExposeToBlue()` builds once from its exposure macros and keeps
 * (`EXPOSURE_BEGIN_IMP`, BlueExposureMacrosPython.h:23-24). Here the macros
 * are the class's `be`/`meta` decorators, and the schema compiles them once,
 * when the class registers. The flattened lookup is `BlueRttiType`, which
 * `BlueClasses.GetRtti` builds from it on demand.
 *
 * Carbon: Be::ClassInfo (blueexposure/include/BlueTypes.h:378-400)
 *
 * @adapted compiled once at registration from the class's decorator metadata, which stands in for Carbon's exposure macros.
 */
export class ClassInfo
{

  /**
   * `mClassId`: the registered class name (a class id is its name, see BlueClasses).
   *
   * @implemented
   */
  classId = "";

  /**
   * `mIID`: the class's own interface id, its registered name.
   *
   * @implemented
   */
  iid = "";

  /**
   * `mDescription`: Carbon's doc string. Ours live in JSDoc.
   *
   * @implemented
   */
  description = "";

  /**
   * `mInterfaceTable`: the class's own `MAP_INTERFACE` entries, in order.
   *
   * @implemented
   */
  interfaceTable = [];

  /**
   * `mMemberTable`: the class's own rows.
   *
   * @implemented
   */
  memberTable = [];

  /**
   * `mPyMethodTable`: `{ name, key, blue }` for every exposed method, the class's and its parents'.
   *
   * @implemented
   */
  pyMethodTable = [];

  /**
   * `mParentClassInfo`: the parent's class info along `EXPOSURE_CHAINTO`, or null.
   *
   * @implemented
   */
  parentClassInfo = null;

  /**
   * `mRtti`: built by `BlueClasses.GetRtti` on first request.
   *
   * @implemented
   */
  rtti = null;

  /**
   * Ours: whether the class is Carbon's exposure (`be.define`) rather than ours (`meta.define`).
   *
   * @cjs
   * @implemented
   */
  blue = false;

  /**
   * Ours: the keys of parent rows this class hides (`hideInherited`), which its RTTI leaves out. Carbon has no way to
   * hide an inherited member; our classes declare it where a subclass drops a base's member.
   * @cjs
   * @implemented
   */
  hiddenInherited = new Set();

  /**
   * Ours: the class this information describes. Carbon's `ClassInfo` is the
   * class's own static; here it is compiled from the class.
   *
   * @cjs
   * @type {Function|null}
   */
  ctor = null;

  /**
   * Ours: whether Blue has taken this record, when the schema registers or compiles the class.
   * A record the graph made first, for a lifetime, is not yet Blue's.
   *
   * @cjs
   * @type {boolean}
   */
  exposed = false;

  /**
   * Ours: the graph's own declaration of the class, or null. Replaced through `CjsGraph.define`, never in place.
   *
   * @cjs
   * @type {object|null}
   */
  declared = null;

  /**
   * Ours: the graph's last compiled view of `declared`, or null. `CjsGraph.getClassInfo` refreshes it after a
   * registration change.
   *
   * @cjs
   * @type {object|null}
   */
  compiled = null;

  /**
   * Ours: what ends an instance: the class's base list, its own `_Destructor` and its declared capabilities.
   * Null for a class with nothing to end.
   *
   * @cjs
   * @type {{name: (string|null), bases: Array, destructor: (Function|null), capabilities: string[]}|null}
   */
  lifetime = null;

  /**
   * Ours: true when a host supplies `lifetime` separately from the graph's definition.
   *
   * @cjs
   * @type {boolean}
   */
  lifetimeExplicit = false;

  /**
   * Ours: the compiled teardown and the registration revision that produced it, or null.
   *
   * @cjs
   * @type {object|null}
   */
  teardown = null;

  /**
   * Ours: each own row's declaration, for the record `meta` builds.
   *
   * @cjs
   * @type {Map<import("./VarEntry.js").VarEntry, object>}
   */
  _declarations = new Map();

  /**
   * Ours, built on first use and cleared when the class or a parent recompiles:
   * the persisted rows by exposed name, found as `IRootReaderBase::FindEntry`
   * finds them (IRootReader.cpp:303-319). Null until a reader asks.
   *
   * @cjs Carbon keeps no such table: FindEntry walks the chain on every lookup.
   * @type {Map<string, import("./VarEntry.js").VarEntry>|null}
   */
  _entries = null;

  /**
   * Ours, built with `_entries`: whether instances are IInitialize.
   *
   * @cjs Carbon casts each object (BlackReader.cpp:397); ours answers once per class.
   * @type {boolean}
   */
  _isInitialize = false;

  /**
   * Ours, built with `_entries`: whether instances are INotify.
   *
   * @cjs Carbon casts each object (BlackReader.cpp:420); ours answers once per class.
   * @type {boolean}
   */
  _isNotify = false;

  /**
   * Ours, built with `_entries`: whether instances are IBlueObjectProxy.
   *
   * @cjs Carbon casts each object (BlackReader.cpp:355); ours answers once per class.
   * @type {boolean}
   */
  _isProxy = false;

  /**
   * Ours, built with `_entries`: whether instances are ICustomPersist.
   *
   * @cjs Carbon casts each object (IRootReader.cpp:84); ours answers once per class.
   * @type {boolean}
   */
  _isCustomPersist = false;

  /**
   * The persisted rows by exposed name.
   *
   * @cjs The lazy face of `_entries`: built on the first ask after a compile.
   * @returns {Map<string, import("./VarEntry.js").VarEntry>} The rows.
   */
  get entries()
  {
    if (this._entries === null) ClassInfo.entriesBuilder(this);
    return this._entries;
  }

  /**
   * Whether instances are IInitialize.
   *
   * @cjs The lazy face of `_entries`: built on the first ask after a compile.
   * @returns {boolean} True when they are.
   */
  get isInitialize()
  {
    if (this._entries === null) ClassInfo.entriesBuilder(this);
    return this._isInitialize;
  }

  /**
   * Whether instances are INotify.
   *
   * @cjs The lazy face of `_entries`: built on the first ask after a compile.
   * @returns {boolean} True when they are.
   */
  get isNotify()
  {
    if (this._entries === null) ClassInfo.entriesBuilder(this);
    return this._isNotify;
  }

  /**
   * Whether instances are IBlueObjectProxy.
   *
   * @cjs The lazy face of `_entries`: built on the first ask after a compile.
   * @returns {boolean} True when they are.
   */
  get isProxy()
  {
    if (this._entries === null) ClassInfo.entriesBuilder(this);
    return this._isProxy;
  }

  /**
   * Whether instances are ICustomPersist.
   *
   * @cjs The lazy face of `_entries`: built on the first ask after a compile.
   * @returns {boolean} True when they are.
   */
  get isCustomPersist()
  {
    if (this._entries === null) ClassInfo.entriesBuilder(this);
    return this._isCustomPersist;
  }

  /**
   * Ours: the declaration an own row was compiled from.
   *
   * @cjs
   * @param {import("./VarEntry.js").VarEntry} row A row of `memberTable`.
   * @returns {object} The schema's member or property record.
   */
  declarationOf(row)
  {
    return this._declarations.get(row);
  }

  /**
   * Ours: the one store, a record per class. The graph's class map and the registration hold the same objects.
   *
   * @cjs A Map, because the graph walks every record when it compiles a selection. It holds every class it is asked
   *   about for the life of the process, so a class made at runtime is never collected; classes are module-level.
   * @type {Map<Function, ClassInfo>}
   */
  static _byType = new Map();

  /**
   * Ours: the schema's compile, for a class asked about before or without
   * registering (it stores what it compiles). Null until the schema loads.
   *
   * @cjs
   * @type {((Constructor: Function) => ClassInfo)|null}
   */
  static compiler = null;

  /**
   * Ours: the schema's builder for `entries` and the four interface answers. Null until the schema loads.
   *
   * @cjs
   * @type {((ci: ClassInfo) => void)|null}
   */
  static entriesBuilder = null;

  /**
   * `ExposeToBlue()` (BlueExposureMacrosPython.h:20-67): the class's
   * information. The compile at registration stored it; a class not yet
   * compiled is compiled now.
   *
   * @adapted one static takes the class, where Carbon generates one `ExposeToBlue` per class from its macros.
   * @param {Function} Constructor A class.
   * @returns {ClassInfo} Its class information.
   */
  static exposeToBlue(Constructor)
  {
    const ci = ClassInfo._byType.get(Constructor);
    return ci !== undefined && ci.exposed ? ci : ClassInfo.compiler(Constructor);
  }

  /**
   * Ours: a class's record, made on the first ask.
   *
   * @cjs
   * @param {Function} Constructor The class.
   * @returns {ClassInfo} Its one record.
   */
  static of(Constructor)
  {
    let ci = ClassInfo._byType.get(Constructor);
    if (ci === undefined)
    {
      ci = new ClassInfo();
      ci.ctor = Constructor;
      ClassInfo._byType.set(Constructor, ci);
    }
    return ci;
  }

  /**
   * Ours: the registered name, which minification cannot change.
   *
   * @cjs
   * @implemented
   */
  static className = "ClassInfo";

}
