import { BLUELISTEVENT, EDITFLAGS } from "../../consts/blue.js";
import { ClassInfo } from "./ClassInfo.js";
import { VarEntry } from "./VarEntry.js";
import { CjsGraphClassUIInfo } from "./CjsGraphClassUIInfo.js";
import { CjsGraphState } from "./CjsGraphState.js";
import { GRAPH_METADATA_KEY, GRAPH_TYPES, GraphMemberFlags, GraphOperation, VARTYPE } from "./graphTypes.js";
import { getGraphHandler } from "./types/index.js";

/**
 * Independent graph declarations and their compiled class records.
 * @cjs Independent registration, declared-edge traversal and value operations.
 */
export class CjsGraph
{

  /** One record per class: the bridge's one store, which Blue's compile fills too. */
  static _classes = ClassInfo._byType;

  /** The edgeType of a member that declares no class. */
  static _noTypes = [];

  /** Stable declared names, never inferred from Function.name. */
  static _names = new Map();

  /** Counts definitions: a selection compiled before the last one is rebuilt on its next use, and a walk under way fails. */
  static _revision = 0;

  /**
   * The classes derived from each class: those whose exposure chains to it or that list it as a base, under the
   * name or constructor their declaration gives. A class defined again rebuilds them with it.
   */
  static _derived = new Map();

  /** Derived selection tables, weakly keyed by immutable selection descriptions. */
  static _selections = new WeakMap();

  /** Reusable traversal storage, isolated by active call depth for nested visitors. */
  static _traversals = [];

  /** Number of currently active synchronous traversals. */
  static _traversalDepth = 0;

  /**
   * Class libraries, oldest first. The graph's own definitions are the oldest, so a
   * registered library replaces them by name.
   */
  static _libraries = [ {
    Get(typeName)
    {
      return CjsGraph._names.get(typeName)?.ctor;
    },
    Create(typeName)
    {
      return new (this.Get(typeName))();
    }
  } ];

  /** A member's flags when its definition gives none. */
  static _defaultFlags = EDITFLAGS.READWRITE | EDITFLAGS.PERSIST;

  /** The flags of a member no value operation reads. */
  static _unread = GraphMemberFlags.BINARY | GraphMemberFlags.RUNTIMEONLY;

  /** The flags that each let a value in. */
  static _accepting = EDITFLAGS.WRITE | EDITFLAGS.PERSIST | EDITFLAGS.RPERSIST;

  /** Value keys that are not members. */
  static _reserved = new Set([ "_type", "_id", "_ref", GRAPH_METADATA_KEY ]);

  /** The store that holds object metadata, supplied by whoever owns one. Null keeps none. */
  static _metadata = null;

  /**
   * What a class's definition may say its instances can do. The graph gives none of them to a class:
   * each is declared by the class, and a door checks the declaration.
   * @cjs Carbon has no such list: an IRoot has all three by being one.
   */
  static Capability = { VALUES: "values", DESTRUCT: "destruct", EVENTS: "events" };

  /** The teardown of an object whose class has no lifetime record: nothing to run. */
  static _noTeardown = { destruct: false, onDestruct: false, destructors: [] };

  /**
   * Registers or replaces a class's own definition while retaining its class-info identity.
   * Definition shape: { name, members: [{ name, key?, type?, edge?, flags? }], interfaces? }.
   * A member's type is a GRAPH_TYPES name; one with no type describes and walks, and refuses
   * every value operation. flags holds its Be::EDITFLAGS and GraphMemberFlags, READWRITE | PERSIST
   * by default. item names the type of a values list, length a length of its own, and options
   * anything rare.
   * edge is { kind, type?, collection?, map? }: type is a class, a name or a list of them, the
   * first being the declared one, and collection is true or "list", "array", "set" or "map".
   * interfaces names classes an instance also counts as without inheriting from them.
   * bases is its C++ base list and chainTo the class its exposure table continues into, or null.
   * destructor is this level's own _Destructor, its C++ destructor body, or null; a base's belongs to the base.
   * capabilities lists CjsGraph.Capability names; destruct reaches every class below along the base list.
   * OnDestruct is no definition key: it is a method of the class, found by ordinary dispatch.
   * initialize, notify and listNotify say instances take Initialize, OnModified and
   * OnListModified. ownValues says instances hold values that are not members,
   * through GetOwnValues, SetOwnValues and IsOwnValues. customPersist, list, proxy and abstract are
   * facts for readers, and layout a structure record's { size, boundaries, fields }. ui is a
   * function returning the class's presentation, called only when something asks for it.
   * The class's record is whole when this returns: its members by name and its teardown are built here, and
   * rebuilt for every class derived from it. A base given by a name must already be defined. A class defined
   * again under another name is no longer reached by a class that chains to the old name, which loses its rows.
   * A definition that throws leaves the record, and every row handed in, as it was.
   * @cjs Compiles each member to one flat object; authored default values are not cloned.
   */
  static define(ctor, definition)
  {
    if (typeof ctor !== "function") throw new TypeError("Graph class requires a constructor.");
    const name = definition.name;
    if (typeof name !== "string" || !name) throw new TypeError("Graph class requires a stable name.");
    if (definition.onDestruct !== undefined) throw new TypeError("Graph onDestruct is not a definition key: write OnDestruct on the class.");
    if (definition.destructor != null && typeof definition.destructor !== "function")
      throw new TypeError("Graph destructor must be a function or null.");
    const existing = this._classes.get(ctor);
    const named = this._names.get(name);
    if (named && named !== existing) throw new TypeError(`Graph class name already registered: ${name}`);

    const members = [];
    const names = new Set();
    // Each row handed in, and what it held before this definition filled it.
    const rows = [], held = [];
    const info = existing ?? ClassInfo.of(ctor);

    try
    {
      for (const member of definition.members ?? [])
      {
        if (typeof member.name !== "string" || !member.name) throw new TypeError("Graph member requires a name.");
        if (names.has(member.name)) throw new TypeError(`Duplicate graph member: ${name}.${member.name}`);
        if (member.index !== undefined && (!Number.isSafeInteger(member.index) || member.index < 0))
          throw new TypeError(`Graph member index must be a non-negative integer: ${name}.${member.name}`);
        names.add(member.name);

        if (member.row !== undefined)
        {
          rows.push(member.row);
          held.push({ ...member.row });
        }
        members.push(this.compileMember(member));
      }
      const declared = { ...definition, members, interfaces: definition.interfaces ?? [] };

      const lifetime = info.lifetimeExplicit ? info.lifetime : {
        name, bases: declared.bases ?? [], destructor: declared.destructor ?? null,
        capabilities: this.checkCapabilities(declared.capabilities ?? [], name)
      };
      // A row the record already held has its owner from the class that made it.
      for (let i = 0; i < members.length; i++) if (members[i].owner === null) members[i].owner = info;
      this._classes.set(ctor, info);
      this._replace(info, declared, lifetime);
    }
    catch (error)
    {
      for (let i = 0; i < rows.length; i++) Object.assign(rows[i], held[i]);
      throw error;
    }

    return info;
  }

  /**
   * Gives a record its declaration and lifetime, and builds it and every class derived from it. One that cannot
   * be built, for an unknown or cyclic base, throws and leaves every record as it was.
   * @cjs
   * @param {ClassInfo} info The record.
   * @param {object|null} declared Its declaration, or null for a record that holds a lifetime only.
   * @param {object|null} lifetime Its lifetime.
   * @returns {void}
   */
  static _replace(info, declared, lifetime)
  {
    const previous = info.declared, previousLifetime = info.lifetime;
    // Under its old name too: a class that named it by that name no longer reaches it.
    const before = this._getDerived(info);
    this._setDeclared(info, declared, lifetime);
    try
    {
      this._build(new Set([ ...before, ...this._getDerived(info) ]));
    }
    catch (error)
    {
      this._setDeclared(info, previous, previousLifetime);
      throw error;
    }
    this._revision++;
  }

  /**
   * Puts a declaration and lifetime on a record, the record under its name, and the record among the classes
   * derived from each class it chains to or lists as a base.
   * @cjs
   * @param {ClassInfo} info The record.
   * @param {object|null} declared Its declaration.
   * @param {object|null} lifetime Its lifetime.
   * @returns {void}
   */
  static _setDeclared(info, declared, lifetime)
  {
    this._setDerived(info, false);
    if (info.declared) this._names.delete(info.declared.name);
    info.declared = declared;
    info.lifetime = lifetime;
    if (declared) this._names.set(declared.name, info);
    this._setDerived(info, true);
  }

  /**
   * Adds a record to, or takes it from, the classes derived from each class it chains to or lists as a base.
   * @cjs
   * @param {ClassInfo} info The record.
   * @param {boolean} add True to add it.
   * @returns {void}
   */
  static _setDerived(info, add)
  {
    const from = info.lifetime ? info.lifetime.bases.slice() : [];
    if (info.declared && info.declared.chainTo) from.push(info.declared.chainTo);

    for (const key of from)
    {
      let derived = this._derived.get(key);
      if (add)
      {
        if (!derived) this._derived.set(key, derived = new Set());
        derived.add(info);
      }
      else if (derived) derived.delete(info);
    }
  }

  /**
   * A record and every record derived from it, directly or through another: the ones built from its rows and
   * its destructor.
   * @cjs
   * @param {ClassInfo} info The record.
   * @returns {ClassInfo[]} The records, the given one first, each once.
   */
  static _getDerived(info)
  {
    const records = [ info ], seen = new Set(records);

    for (let i = 0; i < records.length; i++)
    {
      const { ctor, declared } = records[i];
      for (const key of declared ? [ ctor, declared.name ] : [ ctor ])
      {
        for (const derived of this._derived.get(key) ?? this._noTypes)
        {
          if (seen.has(derived)) continue;
          seen.add(derived);
          records.push(derived);
        }
      }
    }

    return records;
  }

  /**
   * Builds each record's compiled members and teardown. All are compiled before any is replaced, so a failure
   * replaces none.
   * @cjs Carbon's tables are static, so it has nothing to rebuild; a JavaScript class can be defined again.
   * @param {Iterable<ClassInfo>} records A record and the records derived from it.
   * @returns {void}
   */
  static _build(records)
  {
    const built = [];

    for (const record of records)
    {
      built.push(record.declared ? this._compile(record) : null, record.lifetime ? this._compileTeardown(record) : null);
    }

    let i = 0;
    for (const record of records)
    {
      record.compiled = built[i++];
      record.teardown = built[i++];
    }
  }

  /**
   * Compiles one member definition to the row every walk reads. A definition that names a `row`
   * the record already holds has that row filled, not copied: its maker's name, key, index,
   * VARTYPE and sign stay, and only the graph's own fields are written.
   * Modelled on: Be::VarEntry (blueexposure/include/BlueTypes.h:326-376).
   * @cjs One shape: the type's data copied flat, then name, flags and edge. JS keys replace offsets.
   */
  static compileMember(member)
  {
    const entry = member.type === undefined ? GRAPH_TYPES.invalid : GRAPH_TYPES[member.type];
    const flags = member.flags ?? this._defaultFlags;
    if (!entry) throw new TypeError(`Unknown graph type: ${member.type}`);

    const edge = member.edge ? this._compileEdge(member.edge) : null;

    let row = member.row;
    if (row === undefined)
    {
      row = new VarEntry();
      row.name = member.name;
      row.key = member.key ?? member.name;
      row.index = member.index ?? -1;
      row.type = (flags & GraphMemberFlags.BINARY) !== 0 ? VARTYPE.BINARYBLOCK : entry.storage;
      row.signed = entry.signed === true;
    }
    row.role = member.role ?? "attribute";
    row.handler = getGraphHandler(entry.handler);
    row.direct = entry.direct === true;
    row.length = member.length ?? entry.length ?? 0;
    row.bits = entry.bits ?? 0;
    row.ctor = entry.ctor ?? null;
    row.check = entry.check ?? null;
    row.item = this._compileItem(member);
    row.flags = flags;
    row.options = member.options ?? null;
    row.edgeKind = edge === null ? null : edge.kind;
    row.edgeType = edge === null ? this._noTypes : edge.types;
    row.collection = edge === null ? member.collection ?? null : edge.collection;
    return row;
  }

  /** The compiled row for a member's items, or null; the declaration is a type name, or { type, item } for a nested list. @cjs */
  static _compileItem(member)
  {
    if (member.item === undefined) return null;

    return this.compileMember(typeof member.item === "string" ? { name: member.name, type: member.item } : { ...member.item, name: member.name });
  }

  /**
   * Supplies the object metadata store: GetMetadata(object) and Set(object, key, value).
   * @cjs The graph imports nothing of Blue; Blue hands over BeObjectMetadata.
   */
  static setMetadataStore(store)
  {
    this._metadata = store;
  }

  /**
   * Adds presentation to a class: { settings?, members?, parameters? }. A host uses this for what
   * the class does not say itself, and for parameters of its own.
   * @cjs
   */
  static defineUI(type, ui)
  {
    const info = this.getClassInfo(type);

    (info.declared.hostUI ??= []).push(ui);
    // A class's presentation holds its chain's, so the classes derived from this one build theirs again.
    for (const record of this._getDerived(info)) if (record.compiled) record.compiled.ui = null;
  }

  /**
   * Returns a class's presentation: its own and its bases', base first, then what a host added.
   * @cjs Built on the first request, so a library with no editor builds none.
   */
  static getClassUIInfo(type)
  {
    const info = this.getClassInfo(type);
    if (info.compiled.ui !== null) return info.compiled.ui;

    // Along the exposure chain, the class it chains to first.
    const ui = new CjsGraphClassUIInfo(), owners = this._GetExposureChain(info).reverse();

    for (const owner of owners)
    {
      if (owner.declared.ui) ui.Merge(owner.declared.ui());
      for (const added of owner.declared.hostUI ?? []) ui.Merge(added);
    }

    info.compiled.ui = ui;
    return ui;
  }

  /**
   * Whether a constructor already has a definition.
   * @cjs
   */
  static isDefined(ctor)
  {
    return this._classes.get(ctor)?.declared != null;
  }

  /**
   * Checks a declared capability list: an array of CjsGraph.Capability names, each once.
   * @cjs The one place the names are checked, for the graph's own definitions and a host's.
   * @param {*} capabilities The declared list.
   * @param {string} name The declaring class, for the message.
   * @returns {string[]} The same list.
   */
  static checkCapabilities(capabilities, name)
  {
    if (!Array.isArray(capabilities)) throw new TypeError(`${name}: capabilities is a list of capability names.`);
    const known = Object.values(this.Capability);
    for (let i = 0; i < capabilities.length; i++)
    {
      if (!known.includes(capabilities[i])) throw new TypeError(`${name}: unknown capability ${String(capabilities[i])}; the names are ${known.join(", ")}.`);
      if (capabilities.indexOf(capabilities[i]) !== i) throw new TypeError(`${name}: capability ${capabilities[i]} is listed twice.`);
    }
    return capabilities;
  }

  /**
   * Whether a constructor has a lifetime record.
   * @cjs A class with nothing to end has none: see defineLifetime's caller.
   * @param {Function} ctor The constructor.
   * @returns {boolean} True when defineLifetime or define has recorded one.
   */
  static hasLifetime(ctor)
  {
    const info = this._classes.get(ctor);
    return info !== undefined && info.lifetime !== null;
  }

  /**
   * Declares ancestry, an own destructor and own capabilities without claiming a value/member definition.
   * @cjs A host can register lifetime before opting into graph value operations, in the same record.
   * @param {Function} ctor The constructor.
   * @param {{name?: string|null, bases?: Function[], destructor?: Function|null, capabilities?: string[]}} definition
   *   The class's stable name for messages, its own ancestry, _Destructor and declared capabilities.
   * @returns {ClassInfo} The shared record, retained by subsequent full definitions.
   */
  static defineLifetime(ctor, { name = null, bases = [], destructor = null, capabilities = [], onDestruct })
  {
    if (typeof ctor !== "function") throw new TypeError("Graph lifetime requires a constructor.");
    if (onDestruct !== undefined) throw new TypeError("Graph onDestruct is not a definition key: write OnDestruct on the class.");
    if (destructor !== null && typeof destructor !== "function") throw new TypeError("Graph destructor must be a function or null.");
    if (!Array.isArray(bases) || bases.some(base => typeof base !== "function"))
      throw new TypeError("Graph lifetime bases must be constructors.");
    this.checkCapabilities(capabilities, name ?? "Graph lifetime");
    const info = ClassInfo.of(ctor);
    const previous = info.lifetime;
    const same = previous && previous.destructor === destructor && previous.name === name
      && previous.bases.length === bases.length && previous.bases.every((base, i) => base === bases[i])
      && previous.capabilities.length === capabilities.length
      && previous.capabilities.every((capability, i) => capability === capabilities[i]);
    if (!same)
    {
      this._classes.set(ctor, info);
      this._replace(info, info.declared, { name, bases: bases.slice(), destructor, capabilities: capabilities.slice() });
    }
    // Only once the lifetime is in: a later define keeps an explicit lifetime in place of building its own.
    info.lifetimeExplicit = true;
    return info;
  }

  /**
   * Returns a class's record, which define built.
   * @cjs Accepts a registered constructor or stable declared name; unknown classes fail.
   */
  static getClassInfo(type)
  {
    const info = typeof type === "string" ? this._names.get(type) : this._classes.get(type);
    if (!info?.declared) throw new TypeError(typeof type === "string" ? `Unknown graph class: ${type}` : "Unknown graph class.");
    return info;
  }

  /**
   * The check a class static adds to a door: the object is exactly that class, never a subclass.
   * @cjs CjsGraph's own doors take any registered object; Foo.get(object) takes a Foo only.
   * @param {Function} ctor The class whose static was called.
   * @param {object} object The object handed in.
   * @returns {object} The same object.
   */
  static door(ctor, object)
  {
    if (object === null || typeof object !== "object" || object.constructor !== ctor)
      throw new TypeError(`${this.getClassInfo(ctor).declared.name} takes exactly its own class.`);
    return object;
  }

  /**
   * The check a class static adds to values: a _type they name is that class's.
   * @cjs Values with no _type pass; whether they are plain is the door's own check.
   * @param {Function} ctor The class whose static was called.
   * @param {*} values The values handed in.
   * @returns {*} The same values.
   */
  static doorValues(ctor, values)
  {
    const name = this.getClassInfo(ctor).declared.name;
    if (values !== null && values !== undefined && values._type !== undefined && values._type !== name)
      throw new TypeError(`${name} takes values of its own class, not _type ${values._type}.`);
    return values;
  }

  /**
   * Returns an object's runtime state, creating it on the first ask. Nothing else creates one.
   * @cjs An object that is never asked keeps `__cjs` null and costs nothing.
   * @param {object} object The object.
   * @returns {CjsGraphState} Its state.
   */
  static getState(object)
  {
    return object.__cjs ??= new CjsGraphState();
  }

  /**
   * Whether an object is being destructed or has been: its state is above ALIVE.
   * @cjs Creates nothing and checks no class, so any object may be asked.
   * @param {object} object The object.
   * @returns {boolean} False for an object with no state.
   */
  static isDestructed(object)
  {
    const state = object.__cjs;
    return state != null && state.state > CjsGraphState.State.ALIVE;
  }

  /**
   * Ends a registered object, once, and says whether it ran. In order:
   * 0. Its class, or a class in its base list, must declare the destruct capability; otherwise this throws.
   * 1. An object that is being destructed or has been answers false; nothing runs again.
   * 2. Its OnDestruct(options) runs while the object still reads as alive. If it answers false the
   *    object refuses: no state changes and no destructor runs. One that throws leaves it alive.
   * 3. The state becomes DESTRUCTING, each level's _Destructor runs (finalDelete), and the state
   *    becomes DESTRUCTED.
   * @cjs JavaScript ends nothing by itself, so the graph holds the state. OnDestruct is one method,
   * the most derived, found by ordinary dispatch. No member is entered and no reference is cleared.
   * A _Destructor that throws leaves the state at DESTRUCTING. Only an answer of exactly false
   * refuses. An object with no __cjs field gains one here.
   * @param {object} target The registered object.
   * @param {*} [options] Whatever the caller gave Destruct, handed to OnDestruct unchanged.
   * @returns {boolean} True if it ran; false on a second call or a refusal.
   */
  static destruct(target, options)
  {
    const teardown = this._getTeardown(target);
    if (!teardown.destruct) throw new TypeError(`${this._lifetimeName(target.constructor)} does not declare the destruct capability.`);
    if (this.isDestructed(target)) return false;
    if (teardown.onDestruct && target.OnDestruct(options) === false) return false;

    const state = this.getState(target);
    state.state = CjsGraphState.State.DESTRUCTING;
    for (let i = 0; i < teardown.destructors.length; i++) teardown.destructors[i].call(target);
    state.state = CjsGraphState.State.DESTRUCTED;
    return true;
  }

  /**
   * Runs an object's C++ destruction: each level's own _Destructor, most derived first, along
   * the class's base list, a shared ancestor once.
   * Modelled on: RootRefLock::FinalDelete (blueexposure/include/BlueClass.h:157-161), which runs
   * the destructor.
   * @cjs JavaScript runs no destructor, so the graph calls each level's body in C++'s order. It
   * reads no state, sets none, checks no capability and enters no member, so it runs for any
   * object, more than once if asked; each _Destructor owns its repeat safety. An object whose class
   * has no record has no destructor to run. Nothing is freed.
   * @param {object} object The object.
   * @returns {void}
   */
  static finalDelete(object)
  {
    const { destructors } = this._getTeardown(object);
    for (let i = 0; i < destructors.length; i++) destructors[i].call(object);
  }

  /**
   * The name a message gives a class: its lifetime record's, its definition's, or its own className.
   * @cjs Never Function.name, which a minifier rewrites.
   * @param {Function} ctor The constructor.
   * @returns {string} The name.
   */
  static _lifetimeName(ctor)
  {
    const info = this._classes.get(ctor);
    return info?.lifetime?.name ?? info?.declared?.name ?? ctor.className ?? "A class with no graph record";
  }

  /**
   * An object's teardown, which its class's definition built: whether its class is
   * destruct-capable, whether it has an OnDestruct, and its destructors in destruction order.
   * @cjs An object whose class has no lifetime record gets the empty teardown.
   * @param {object} object The object.
   * @returns {{destruct: boolean, onDestruct: boolean, destructors: Function[]}} The teardown.
   */
  static _getTeardown(object)
  {
    const info = this._classes.get(object.constructor);
    return info?.teardown ?? this._noTeardown;
  }

  /**
   * Compiles owning levels once, in reverse construction order, including declared base lists.
   * @cjs One JS object represents a shared ancestor once; exposure chains are not ancestry. A base
   * given as a constructor with no record has nothing to end and is passed over; a base given by a
   * name nothing registered is a mistake.
   * @param {ClassInfo} info The most-derived class.
   * @returns {{destruct: boolean, onDestruct: boolean, destructors: Function[]}}
   *   Whether any level declares destruct, whether the class has an OnDestruct, and each level's own
   *   _Destructor in destruction order.
   */
  static _compileTeardown(info)
  {
    const seen = new Set(), active = new Set(), destructors = [];
    let destruct = false;
    const visit = owner =>
    {
      if (active.has(owner)) throw new TypeError("Cyclic graph ancestry.");
      if (seen.has(owner)) return;
      active.add(owner);
      for (const base of owner.lifetime.bases)
      {
        const parent = typeof base === "string" ? this._names.get(base) : this._classes.get(base);
        if (typeof base === "string" && !parent) throw new TypeError(`Unknown graph base: ${base}, a base of ${owner.lifetime.name}`);
        if (parent?.lifetime) visit(parent);
      }
      active.delete(owner);
      seen.add(owner);
      if (owner.lifetime.capabilities.includes(this.Capability.DESTRUCT)) destruct = true;
      if (owner.lifetime.destructor) destructors.push(owner.lifetime.destructor);
    };
    visit(info);
    return { destruct, onDestruct: "OnDestruct" in info.ctor.prototype, destructors: destructors.reverse() };
  }

  /**
   * Visits registered objects once, depth-first, in eligible declaration/list order.
   * visit(object, classInfo) may return false to skip that object's children.
   * options.edges selects embed/ref/weak edges (default embed and ref);
   * options.acceptMember(member, classInfo) filters BEFORE inherited name resolution.
   * @cjs Synchronous read-only traversal, not Set's payload/reference processing.
   * Uses weak side-table pass marks so plain registered instances need no added fields.
   * Nested calls have their own marks and stack; no graph objects survive in idle frames.
   */
  static traverse(root, visit, options = {})
  {
    return this._traverse(root, visit, options, null, null);
  }

  /**
   * Registers a class library that defines _type names; the last registered wins.
   * library.Get(typeName) returns the class, or nothing; library.Create(typeName) creates one.
   * @cjs Blue's classes are one library, and our own classes can be another.
   */
  static registerLibrary(library)
  {
    this._libraries.push(library);
    return library;
  }

  /**
   * Compiles a class-only selection without reading any graph instances.
   * definition: { matchClass(classInfo), edges?, acceptMember(member, classInfo)? }.
   * Predicates must remain stable for the selection lifetime; create a new selection if they change.
   * @cjs Resource matching is supplied by the caller; graph imports no resource services.
   */
  static compileSelection(definition, diagnostics = null)
  {
    if (typeof definition.matchClass !== "function") throw new TypeError("Selection requires matchClass.");
    const selection = {
      matchClass: definition.matchClass,
      acceptMember: definition.acceptMember ?? null,
      edges: Array.from(definition.edges ?? ["embed", "ref"])
    };
    this._selections.set(selection, this._compileSelection(selection, diagnostics));
    return selection;
  }

  /**
   * Appends matching identities in traversal order; output is caller-owned and not cleared.
   * options.prune=false runs the full traversal as the reference result. Both paths use the
   * same compiled eligibility and traversal. Optional stats records visited/matched/skippedEdges/
   * compiledClasses. Registration changes rebuild before walking; diagnostics reports dynamic edges.
   * @cjs Selection assumes valid declared graphs; pruned branches are not validated or read.
   */
  static select(root, selection, output, options = {})
  {
    let compiled = this._selections.get(selection);
    if (!compiled) throw new TypeError("Selection must come from compileSelection.");
    let compiledClasses = 0;
    if (compiled.revision !== this._revision)
    {
      compiled = this._compileSelection(selection, options.diagnostics ?? null);
      this._selections.set(selection, compiled);
      compiledClasses = compiled.classes.size;
    }

    const start = output.length;
    const stats = options.stats;
    if (stats) Object.assign(stats, { visited: 0, matched: 0, skippedEdges: 0, compiledClasses });
    const visited = this._traverse(root, null, options, compiled, output);
    if (stats)
    {
      stats.visited = visited;
      stats.matched = output.length - start;
    }
    return output;
  }

  /**
   * Returns an object's values as a plain bag, written from its compiled members. A member equal
   * to a new instance's is left out, as a writer's m_skipDefaults does (IRootWriter.cpp:10,41).
   * options: full writes every member; persistOnly writes PERSIST members; roundTrip writes only
   * members a read takes back; refs (default true) writes a shared object once, then _ref, while false
   * writes it at every reference and a cycle never ends; typeTags writes _type where the class
   * differs from the declared one; forceTypeTags writes it always; copyOverride(object) may
   * return an object to hold in place of writing a held one, which set then keeps as a reference.
   * Modelled on: YamlWriter::WriteIRoot (blue/src/YamlWriter.cpp:322-376).
   * @cjs Plain values replace YAML events. A second sight anchors the first bag, as YamlWriter does.
   */
  static get(object, options = {})
  {
    return this._writeObject(object, this._noTypes, this._beginGet(options));
  }

  /**
   * Writes values into an existing object: IsEqual skips what already matches, and each changed
   * member is recorded. A nested object read in place records a nested bag, a replaced reference
   * records the live object, and a changed list records its whole new plain array, so the
   * record can be replayed through set. Returns that record, or false when nothing changed.
   * Then, children first and once references resolve, each changed object is told
   * commitValues(changedNames). Set never calls Initialize, unless initializeHeld is true.
   * options: validate (default true) runs each handler's IsValidValue on the incoming value;
   * skipEquality writes every value; skipEvents tells nothing and writes lists raw; idMap, a Map
   * of id to object, is this set's _id table: its entries resolve _ref, and a record then holds
   * _ref in place of a live object, with the map holding the object.
   * A nested object is the child's own set, so its owner is told only of its own members.
   * A failure rolls nothing back and tells nothing.
   * Modelled on: Blue::DictReader::ReadMembers, without its notification during the walk.
   * @cjs The door's rules (specifications/model-values-interchange.md), not Carbon's reader.
   */
  static set(object, values, options = {})
  {
    if (!this._isValues(values, "set")) return false;

    const operation = this._beginSet(options, GraphOperation.SET);
    const changes = this.setObject(object, values, this._noTypes, operation);
    this._finish(operation);
    return changes;
  }

  /**
   * Tells an object about its own members; it never reaches children. Calls OnModified once per
   * NOTIFY member, in member-table order: every one when names is null, otherwise those named.
   * A named member without NOTIFY is skipped. An unknown name throws unless
   * options.skipValidation, which SetValues passes for names it has already checked.
   * @cjs Our helper over Carbon's per-member INotify, for SetValues and for direct writes. It keeps
   * no baseline and compares nothing. Options are opt-outs (skip...). Engine code never calls it.
   * @param {object} object The object whose members changed.
   * @param {string|string[]|null} [names=null] One member, several, or null for all.
   * @param {{skipValidation?: boolean}} [options={}] Opt-outs.
   * @returns {void}
   */
  static commitValues(object, names = null, options = {})
  {
    const info = this._getObjectInfo(object, this._noTypes);
    const list = typeof names === "string" ? [ names ] : names;

    if (list !== null && !options.skipValidation)
    {
      for (let i = 0; i < list.length; i++)
      {
        if (!this._FindEntry(info, list[i])) throw new TypeError(`Unknown graph member: ${info.declared.name}.${list[i]}`);
      }
    }

    this._notify(object, info, list);
  }

  /**
   * Returns what set would change, as values, or false, and writes nothing. A held object's
   * differences nest, as set's record does; anything else is the value it would write.
   * @cjs A list is one whole value: its items are only matched once they carry a _guid or a
   * declared key, neither of which exists yet.
   */
  static diff(object, values, options = {})
  {
    if (!this._isValues(values, "diff")) return false;

    return this._diffObject(object, values, this._noTypes, this._beginSet(options, GraphOperation.SET));
  }

  /** The differences of one object. @cjs Reads only. */
  static _diffObject(object, values, type, options)
  {
    const info = this._getObjectInfo(object, type);
    if (values._id !== undefined) this._setAnchor(values._id, object, options);

    const members = this._getMemberTable(info, GraphOperation.SET, options).byName;
    let changes = false;

    for (const name of Object.keys(values))
    {
      const member = members[name];

      if (!member)
      {
        if (this._reserved.has(name) || this._FindEntry(info, name) || info.declared.ownValues === true) continue;
        throw new TypeError(`Unknown graph member: ${info.declared.name}.${name}`);
      }

      const value = values[name], stored = this._readMember(object, member);
      if (this._isValueLike(stored, member, value, options)) continue;

      if (changes === false) changes = {}; // alloc: only once something differs.

      if (member.edgeKind !== null && member.collection === null && stored !== null && value !== null
        && this.isPlain(value) && value._ref === undefined && (value._type === undefined || this.isType(stored, value._type)))
        changes[name] = this._diffObject(stored, value, member.edgeType, options);
      else changes[name] = value;
    }

    return changes;
  }

  /**
   * Creates an object and writes every value, with no comparison and no change tracking, then
   * returns it. Once references resolve each created object gets Initialize if it has one,
   * and otherwise OnModified per NOTIFY member: Carbon's readers make it either or
   * (DictReader.cpp:162-167, BlackReader.cpp:414-420, YamlReader.cpp:1347-1352). A mapped list
   * still gets LOADFINISHED, as ReadList sends it on a fresh load (DictReader.cpp:472-475).
   * type is a constructor, a registered name, or null when values names its own _type.
   * options as set; valuesMode returns plain values instead, leaving _type as data.
   * @cjs create + set + complete. An unknown class is an error, never a plain object.
   */
  static from(type, values, options = {})
  {
    if (!this._isValues(values, "from")) values = {};
    if (options.valuesMode === true) return this._copyValues(values);

    const operation = this._beginSet(options, GraphOperation.CREATE);
    const object = this.createObject(values, type === null ? this._noTypes : [ type ], operation);
    this._finish(operation);
    return object;
  }

  /**
   * Copies PERSIST members into an existing target, keeping its identity, as Carbon's Copier
   * does. IsExactEqual skips what matches (Copier.cpp:170-180) and there is no skipEquality.
   * An object reference gets a new object, and a list is rebuilt, as BlueVariable.cpp:430
   * recurses. An object with Initialize gets it at the end, even an existing target, with no
   * OnModified (Copier.cpp:141-145, :209); otherwise OnModified per changed member (:190).
   * Nothing outside the source is shared; options.copyOverride shares more, as m_override does.
   * @cjs Get then set, not a port of Copier's walk.
   */
  static copy(source, target, options = {})
  {
    const values = this.get(source, { persistOnly: true, ...options, typeTags: true, full: true, metadata: false });
    const operation = this._beginSet({ ...options, validate: false }, GraphOperation.COPY);
    const changes = this.setObject(target, values, this._noTypes, operation);
    this._finish(operation);
    return changes;
  }

  /**
   * Creates a separate graph with the same values and topology: get then from.
   * Sharing follows copy.
   * @cjs A preset, not Carbon's Copier.
   */
  static clone(source, options = {})
  {
    return this.from(null, this.get(source, { persistOnly: true, ...options, typeTags: true, full: true, metadata: false }), { ...options, validate: false });
  }

  /**
   * Writes one object, or an alias to one already written, inside a running get.
   * Object handlers re-enter here; options is the operation get began.
   * Modelled on: YamlWriter::WriteIRoot (blue/src/YamlWriter.cpp:349-376).
   * @cjs _id and _ref replace YAML anchors and aliases.
   * The override is Copier::m_override (Copier.cpp:47-58): undefined continues, and a failure throws.
   */
  static getObject(object, type, options)
  {
    if (options.copyOverride !== null)
    {
      const held = options.copyOverride(object);
      if (held !== undefined) return held;
    }

    return this._writeObject(object, type, options);
  }

  /** Writes an object's bag, or an alias to one already written. @cjs */
  static _writeObject(object, type, options)
  {
    const info = this._getObjectInfo(object, type);

    if (options.refs)
    {
      const written = options.written.get(object);
      if (written)
      {
        written._id ??= options.anchor++;
        return { _ref: written._id };
      }
    }

    const bag = {};
    if (options.refs) options.written.set(object, bag);
    if (options.forceTypeTags || (options.typeTags && (type.length === 0 || this.getClassInfo(type[0]) !== info))) bag._type = info.declared.name;

    if (this._metadata !== null && options.metadata)
    {
      const metadata = this._metadata.GetMetadata(object);
      if (metadata) bag[GRAPH_METADATA_KEY] = { ...metadata };
    }

    const members = this._getMemberTable(info, GraphOperation.GET, options).members;
    const defaults = options.full ? null : this._getWriteDefaults(info, options);

    for (let i = 0; i < members.length; i++)
    {
      const member = members[i];
      if (member.index >= 0 && object[member.key][member.index] === null) continue;
      if (defaults !== null)
      {
        if (this._isDefault(object, member, defaults, options)) continue;
        options.heldDefault = defaults[member.name];
      }

      bag[member.name] = this._getMember(object, member, options);
    }

    if (info.declared.ownValues === true) Object.assign(bag, object.GetOwnValues());

    return bag;
  }

  /**
   * Reads values into an existing object inside a running set.
   * @cjs Object handlers re-enter here; options is the operation set began.
   */
  static setObject(object, values, type, options)
  {
    const info = this._getObjectInfo(object, type);

    if (values._type !== undefined && !this.isType(object, values._type))
      throw new TypeError(`Expected ${info.declared.name} but got _type ${values._type}`);

    const initialize = options.initialize;
    options.initialize = options.initializeHeld ?? (options.creating || options.operation === GraphOperation.COPY);
    const changes = this._setMembers(object, info, values, options);
    options.initialize = initialize;

    return changes;
  }

  /**
   * Creates the object a bag describes inside a running set, and reads the bag into it.
   * @cjs An object read into under a creation gets Initialize too, as Copier gives one to every
   * object it fills, unless options.initializeHeld is false. CREATE decides this, not Set.
   */
  static createObject(values, type, options)
  {
    const declared = type[0] ?? null;
    const typeName = values._type ?? (typeof declared === "function" ? this.getClassInfo(declared).declared.name : declared);
    if (!typeName) throw new TypeError("Graph value names no class: it has no _type, and its member declares none.");

    const object = this._create(typeName);
    const info = this._getObjectInfo(object, type);
    const creating = options.creating, initialize = options.initialize;

    if (info.compiled.defaults === null) this.captureDefaults(object);

    options.creating = options.initialize = true;
    this._setMembers(object, info, values, options);
    options.creating = creating;
    options.initialize = initialize;

    return object;
  }

  /**
   * Records what a new instance holds, for leaving defaults out of a bag. A reader calls this on
   * the first object it creates of a class, straight after the constructor and before any value.
   * Modelled on: IRootWriter::WriteMembers's default instance (blue/src/IRootWriter.cpp:25-37).
   * @cjs The first real construction stands in for Carbon's spare instance. A class with none by
   * the time a writer needs it gets one spare, once, without Initialize, so a bag does not depend
   * on what was built before it.
   */
  static captureDefaults(object)
  {
    const info = this._getObjectInfo(object, this._noTypes);
    info.compiled.defaults = this._captureValues(object, info);
  }

  /**
   * Whether an object is an instance of a named class.
   * @cjs Resolves through the class libraries; an unknown name is an error.
   */
  static isType(object, typeName)
  {
    return this._getClass(typeName).prototype.isPrototypeOf(object);
  }

  /** Whether a value is a plain object, a bag rather than a live object. @cjs */
  static isPlain(value)
  {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  /**
   * Records a reference to an _id not seen yet, written once references resolve.
   * @cjs JS forward aliases postpone the write. record and recordKey name where the
   * change record keeps this object.
   */
  static deferReference(holder, key, id, type, record, recordKey, options)
  {
    const entry = { holder, key, id, type, record, recordKey, fill: null };
    options.pending.push(entry);
    return entry;
  }

  /**
   * Records an embedded object to fill by value from an _id.
   * @cjs A struct has no identity to alias, so the fixup copies once every source is read,
   * even for a known _id: its object can still be waiting, or part read. The value's own
   * _id names the held object, so another waiter can chain through it.
   */
  static deferValues(fill, value, type, options)
  {
    if (value._id !== undefined) this._setAnchor(value._id, fill, options);

    const entry = { holder: null, key: null, id: value._ref, type, record: null, recordKey: null, fill };
    options.pending.push(entry);
    return entry;
  }

  /** Whether this write compares nothing: a creation, a copy, or skipEquality. @cjs */
  static isWritingAll(options)
  {
    return options.skipEquality || options.creating || options.operation === GraphOperation.COPY;
  }

  /**
   * Whether a list is being loaded, which sends LOADFINISHED even when it is empty.
   * Modelled on: DictReader::ReadList (blue/src/DictReader.cpp:471-475).
   * @cjs A copy is AssignTo, which only sends it for items (BlueListUtil.h:542).
   */
  static isLoadingList(options)
  {
    return options.creating && options.operation !== GraphOperation.COPY;
  }

  /** Whether a bag on a held reference reads into that object; a copy makes a new one. @cjs */
  static isReadingInto(options)
  {
    return options.operation !== GraphOperation.COPY;
  }

  /** Whether a changed list waits for the end of the operation, for its events. @cjs */
  static isListStaged(list, owner, options)
  {
    if (options.skipEvents) return false;
    if (Object.getPrototypeOf(list) !== Array.prototype) return true;

    return !options.creating && this._getObjectInfo(owner, this._noTypes).declared.listNotify;
  }

  /** Whether a value is a _ref. @cjs */
  static isReference(value)
  {
    return this.isPlain(value) && value._ref !== undefined;
  }

  /**
   * Tests whether a value already describes an object, writing nothing.
   * @cjs Compares only what the value names. An _id is recorded as it is read, because a
   * later _ref in the same value names it; a _ref not yet known is no match.
   */
  static isObjectLike(object, value, type, options)
  {
    if (object === null || value === null) return object === value;
    if (!this.isPlain(value)) return object === value;
    if (value._ref !== undefined) return options.anchors.get(value._ref) === object;
    if (value._type !== undefined && !this.isType(object, value._type)) return false;

    const info = this._getObjectInfo(object, type);
    if (value._id !== undefined) this._setAnchor(value._id, object, options);

    const members = this._getMemberTable(info, GraphOperation.SET, options).byName;
    for (const name of Object.keys(value))
    {
      const member = members[name];

      if (!member)
      {
        if (this._reserved.has(name) || this._FindEntry(info, name)) continue;
        if (info.declared.ownValues === true) return object.IsOwnValues(value);
        return false;
      }

      const holder = member.index < 0 ? object : object[member.key];
      const key = member.index < 0 ? member.key : member.index;
      if (!this._isValueLike(holder[key], member, value[name], options)) return false;
    }

    return true;
  }

  /** Tests whether a list already holds what a plain array describes, writing nothing. @cjs */
  static isListLike(list, values, type, options)
  {
    if (list.length !== values.length) return false;

    for (let i = 0; i < list.length; i++)
    {
      if (!this.isObjectLike(list[i], values[i], type, options)) return false;
    }

    return true;
  }

  /**
   * Returns the bag an embedded object is read from.
   * @cjs Embedded storage keeps its identity, so a live object is copied by its values.
   * A _ref goes through deferValues instead.
   */
  static getEmbeddedValues(value, options)
  {
    return this.isPlain(value) ? value : this.get(value, { refs: false, full: true });
  }

  /**
   * The defaults to write an object against. An embedded object is written against the default
   * instance's own (IRootWriter.cpp:134).
   * @cjs A referenced one is too, where Carbon uses its class's (:149): a bag here reads into the
   * object held, which a constructor may have set, and Carbon's reader makes a new one.
   */
  static _getWriteDefaults(info, options)
  {
    const held = options.heldDefault;
    options.heldDefault = null;

    return held !== null && held !== undefined && held.info === info ? held.values : this._getDefaults(info);
  }

  /** What each member of a new instance holds, as compared by _isDefault. @cjs */
  static _captureValues(object, info, seen = new Set())
  {
    const values = Object.create(null); // alloc: once per class.
    seen.add(object);

    for (const member of info.compiled.members)
    {
      if (member.name in values) continue;

      const stored = this._readMember(object, member);
      values[member.name] = this._captureValue(stored, member, seen);
    }

    return values;
  }

  /**
   * One member's default. A list is only compared with nothing, as AreEqual does
   * (BlueVariable.cpp:274-349), so it keeps its size.
   * @cjs A held object keeps its values and class: _isDefault recurses into an embedded one, and
   * _getWriteDefaults writes a referenced one against them.
   */
  static _captureValue(stored, member, seen)
  {
    if (stored === null || stored === undefined) return null;

    if (member.edgeKind === null)
    {
      if (Array.isArray(stored)) return stored.slice();
      if (stored instanceof Map) return new Map(stored); // alloc: a load refills the Map it finds.
      return ArrayBuffer.isView(stored) ? stored.slice() : stored;
    }

    if (member.collection === "map") return stored.size;
    if (member.collection !== null) return stored.length;
    if ((member.flags & EDITFLAGS.PERSIST) === 0 || typeof stored !== "object" || seen.has(stored)) return true;

    const info = this._getObjectInfo(stored, member.edgeType);
    return { info, values: this._captureValues(stored, info, seen) };
  }

  /** The defaults of a class, from one spare instance if nothing has been built yet. @cjs */
  static _getDefaults(info)
  {
    const { compiled } = info;

    if (compiled.defaults === null) compiled.defaults = this._captureValues(this._create(info.declared.name), info);

    return compiled.defaults;
  }

  /** Reads a member's storage, through its slot if it has one. @cjs */
  static _readMember(object, member)
  {
    return member.index < 0 ? object[member.key] : object[member.key][member.index];
  }

  /**
   * Whether a member holds what a new instance does, within Carbon's tolerance.
   * Modelled on: BlueMemberIterator::SkipEquals (blueexposure/BlueMemberIterator.cpp:121-148).
   * @adapted AreEqual<IROOT> gives up on an embedded object that is not an empty collection
   * (BlueVariable.cpp:274-314). This recurses into it, so an embedded object left at its
   * defaults is left out: a reader starts from the same defaults. A member that holds null is
   * compared by null alone, before its type's AreEqual. Carbon has no such test, so it always writes
   * a type that has no AreEqual (BlueVariable.cpp:111-114); here a null one is left out.
   */
  static _isDefault(object, member, defaults, options)
  {
    const stored = this._readMember(object, member), value = defaults[member.name];

    if (stored === null || value === null) return stored === value;
    if (member.edgeKind === null) return member.handler.IsEqual(stored, value, member);
    if (member.collection === "map") return stored.size === 0 && value === 0;
    if (member.collection !== null) return stored.length === 0 && value === 0;
    if (member.edgeKind !== "embed" || value === true) return false;

    const info = this._getObjectInfo(stored, member.edgeType);
    if (info !== value.info) return false;

    const { members } = this._getMemberTable(info, GraphOperation.GET, options);
    for (let i = 0; i < members.length; i++)
    {
      if (!this._isDefault(stored, members[i], value.values, options)) return false;
    }

    return true;
  }

  /** The operation record for one get. @cjs Nothing is allocated per member. */
  static _beginGet(options)
  {
    return {
      persistOnly: options.persistOnly === true,
      roundTrip: options.roundTrip === true,
      refs: options.refs !== false,
      full: options.full === true,
      metadata: options.metadata !== false,
      typeTags: options.typeTags === true,
      forceTypeTags: options.forceTypeTags === true,
      copyOverride: options.copyOverride ?? null,
      written: new Map(),
      anchor: 1,
      heldDefault: null
    };
  }

  /**
   * Reads one member through its handler; a null never reaches a handler.
   * @cjs member.index selects a slot of the stored array. A direct leaf needs no call.
   */
  static _getMember(object, member, options)
  {
    const holder = member.index < 0 ? object : object[member.key];
    const key = member.index < 0 ? member.key : member.index;
    const stored = holder[key];

    if (stored === null || member.direct) return stored;

    return member.handler.Get(holder, key, member, options);
  }

  /** The operation record for one set, from or copy. @cjs Nothing is allocated per member. */
  static _beginSet(options, operation)
  {
    return {
      operation,
      validate: options.validate !== false,
      skipEquality: options.skipEquality === true,
      skipEvents: options.skipEvents === true,
      initializeHeld: options.initializeHeld ?? null,
      listEdits: [],
      anchors: options.idMap ?? new Map(),
      idMap: options.idMap ?? null,
      ids: null,
      nextId: 1,
      recorded: [],
      pending: [],
      completions: new Map(),
      creating: false,
      initialize: false,
      owner: null,
      deferred: null
    };
  }

  /**
   * Writes each named member, recording what changed unless the object is being created.
   * @cjs A member the table leaves out is skipped, as DictReader skips a member it may not
   * write, and a name the class does not declare fails. A null bypasses a leaf handler.
   */
  static _setMembers(object, info, values, options)
  {
    if (values._id !== undefined) this._setAnchor(values._id, object, options);
    if (values[GRAPH_METADATA_KEY] !== undefined && this._metadata !== null) this._readMetadata(object, values[GRAPH_METADATA_KEY]);

    const members = this._getMemberTable(info, GraphOperation.SET, options).byName;
    const names = Object.keys(values);
    const copying = options.operation === GraphOperation.COPY;
    const tracking = !options.creating || copying;
    let changes = false;
    let nested = null;

    for (let i = 0; i < names.length; i++)
    {
      const name = names[i];
      const member = members[name];

      if (!member)
      {
        if (this._reserved.has(name) || this._FindEntry(info, name) || info.declared.ownValues === true) continue;
        throw new TypeError(`Unknown graph member: ${info.declared.name}.${name}`);
      }

      const value = values[name];
      if (options.validate && value !== null && !member.handler.IsValidValue(value, member))
        throw new TypeError(`Invalid value for graph member: ${info.declared.name}.${name}`);

      const holder = member.index < 0 ? object : object[member.key];
      const key = member.index < 0 ? member.key : member.index;

      options.owner = object;
      const result = this._setMember(holder, key, value, member, options);

      if (!tracking)
      {
        options.deferred = null;
        continue;
      }

      if (result === false) continue;
      if (changes === false) changes = {}; // alloc: only once something changed.

      if (options.deferred !== null)
      {
        options.deferred.record = changes;
        options.deferred.recordKey = name;
        options.deferred = null;
        changes[name] = null;
      }
      else changes[name] = result === true ? this._getMember(object, member, options) : result;

      if (member.edgeKind === null) continue;
      if (options.idMap !== null) this._addRecorded(changes, name, member, options);

      // A nested bag is the child's own set: only the child's completion tells of it. Copier
      // tells the owner too: the embedded object's bytes differ (Copier.cpp:170-190).
      if (!copying && member.collection === null && result !== true && this.isPlain(result)) (nested ??= []).push(name);
    }

    if (info.declared.ownValues === true && !object.IsOwnValues(values))
    {
      object.SetOwnValues(values);
      if (tracking && changes === false) changes = {}; // alloc: only once something changed.
    }

    if (changes !== false || options.creating || options.initialize)
      this._addCompletion(object, info, changes, nested, options.creating && !copying ? values : null, options);

    return changes;
  }

  /**
   * Reads a bag's metadata into the store: string keys to string values.
   * Modelled on: DictReader::ReadMetadata (blue/src/DictReader.cpp:188-213).
   * @cjs
   */
  static _readMetadata(object, metadata)
  {
    for (const key of Object.keys(metadata)) this._metadata.Set(object, key, metadata[key]);
  }

  /** Writes one member, comparing as the operation requires. @cjs Returns as a handler's Set does. */
  static _setMember(holder, key, value, member, options)
  {
    if (member.edgeKind !== null) return member.handler.Set(holder, key, value, member, options);
    if (value === null) return this._clear(holder, key);

    if (options.operation === GraphOperation.COPY)
    {
      if (holder[key] !== null && member.handler.IsExactEqual(holder[key], value, member)) return false;
    }
    else if (!this.isWritingAll(options)) return member.handler.Set(holder, key, value, member, options);

    member.handler.Write(holder, key, value, member, options);
    return true;
  }

  /**
   * Fires OnModified in member-table order for the NOTIFY members among names (every NOTIFY
   * member when names is null), or for every named member when all is set; all with no names tells every
   * member, which nothing asks for. Names that are not members are skipped; commitValues validates them first.
   * One scan of the rows per row told: a class has few NOTIFY rows.
   * @cjs Carbon's per-member INotify. Copier takes no NOTIFY flag (Copier.cpp:190), so a copy
   * passes all.
   */
  static _notify(object, info, names, all = false)
  {
    if (!info.declared.notify) return;

    const { members } = info.compiled;

    for (let i = 0; i < members.length; i++)
    {
      const member = members[i];
      if (!all && (member.flags & EDITFLAGS.NOTIFY) === 0) continue;
      if (names !== null && names.indexOf(member.name) === -1) continue;
      // The nearest class's row answers for its name, as lookups do: one it shadows tells nothing.
      if (this._FindEntry(info, member.name) === member) object.OnModified(member.name);
    }
  }

  /**
   * The row a name finds: the class's own, else the nearest along its exposure chain; undefined for no member.
   * Modelled on: IRootReaderBase::FindEntry (blue/src/IRootReader.cpp:303-319), without its PERSIST test.
   * @cjs A scan of the rows, as Carbon's is. A map by name was measured against it and bought nothing: the
   * value operations read the per-operation tables.
   * @param {ClassInfo} info The class.
   * @param {string} name A member name.
   * @returns {VarEntry|undefined} The row.
   */
  static _FindEntry(info, name)
  {
    const { members } = info.compiled;

    for (let i = 0; i < members.length; i++)
    {
      if (members[i].name === name) return members[i];
    }

    return undefined;
  }

  /** Notes where a record holds live objects, for _recordReferences. @cjs idMap only. */
  static _addRecorded(record, name, member, options)
  {
    if (member.collection !== "map" || record[name] === null)
    {
      options.recorded.push(record, name);
      return;
    }

    for (const key of Object.keys(record[name])) options.recorded.push(record[name], key);
  }

  /**
   * The members an object changed itself, without its nested bags, or false.
   * @cjs Runs once references resolve, so a forward reference is already in the record.
   */
  static _getOwnChanges(changes, nested)
  {
    if (nested === null || changes === false) return changes;

    const names = Object.keys(changes);
    if (names.length === nested.length) return false;

    const own = {}; // alloc: only when an object changed both itself and a child.
    for (const name of names)
    {
      if (!nested.includes(name)) own[name] = changes[name];
    }

    return own;
  }

  /** Records an _id, keeping the reverse table current once it exists. @cjs */
  static _setAnchor(id, object, options)
  {
    options.anchors.set(id, object);
    if (options.ids !== null) options.ids.set(object, id);
  }

  /**
   * The id of an object in the _id table, adding it when it has none.
   * @cjs Runs at the end of a set, so a new id cannot collide with one the values name.
   */
  static _getId(object, options)
  {
    if (options.ids === null)
    {
      options.ids = new Map(); // alloc: only an idMap caller builds the reverse table.
      for (const [ id, known ] of options.anchors) options.ids.set(known, id);
    }

    let id = options.ids.get(object);
    if (id !== undefined) return id;

    do id = options.nextId++;
    while (options.anchors.has(id));

    this._setAnchor(id, object, options);
    return id;
  }

  /** Replaces a record's live object, or those in its list, with _ref. @cjs idMap only. */
  static _recordReferences(record, name, options)
  {
    const value = record[name];

    if (Array.isArray(value))
    {
      for (let i = 0; i < value.length; i++)
      {
        if (value[i] !== null) value[i] = { _ref: this._getId(value[i], options) };
      }
    }
    else if (value !== null && !this.isPlain(value)) record[name] = { _ref: this._getId(value, options) };
  }

  /** Writes a null over a leaf value. @cjs */
  static _clear(holder, key)
  {
    if (holder[key] === null) return false;

    holder[key] = null;
    return true;
  }

  /**
   * Compares one stored value with incoming input, as set would.
   * @cjs Runs IsValidValue itself: this input has not been through _setMembers.
   */
  static _isValueLike(stored, member, value, options)
  {
    if (stored === null || value === null) return stored === value;

    if (options.validate && !member.handler.IsValidValue(value, member))
      throw new TypeError(`Invalid value for graph member: ${member.owner.classId || member.owner.declared.name}.${member.name}`);

    if (member.edgeKind === null) return member.handler.IsUnchanged(stored, value, member);
    if (member.collection === "map") return member.handler.IsUnchanged(stored, value, member, options);
    if (member.collection !== null) return this.isListLike(stored, value, member.edgeType, options);

    return this.isObjectLike(stored, value, member.edgeType, options);
  }

  /** Records an object for completion, once, children before parents. @cjs */
  static _addCompletion(object, info, changes, nested, values, options)
  {
    const entry = options.completions.get(object);

    if (!entry)
    {
      options.completions.set(object, { object, info, changes, nested, values, initialize: options.initialize });
      return;
    }

    if (changes !== false) entry.changes = entry.changes === false ? changes : Object.assign(entry.changes, changes);
    if (nested !== null) entry.nested = entry.nested === null ? nested : entry.nested.concat(nested);
  }

  /**
   * Resolves forward references, then completes every changed or created object.
   * @cjs Nothing is told before references resolve, so a failure here notifies nothing.
   */
  static _finish(options)
  {
    for (const entry of options.pending)
    {
      const object = options.anchors.get(entry.id);
      if (object === undefined) throw new TypeError(`Unresolved _ref: ${entry.id}`);

      this._getObjectInfo(object, entry.type);
      if (entry.fill !== null) continue;

      if (entry.holder instanceof Map) entry.holder.set(entry.key, object);
      else entry.holder[entry.key] = object;

      if (entry.record !== null) entry.record[entry.recordKey] = object;
    }

    // Fills read references, so they run after every write above.
    for (const entry of options.pending)
    {
      if (entry.fill !== null) this._fill(entry, options);
    }

    for (const edit of options.listEdits) this._replaceList(edit.owner, edit.list, edit.items, options);

    for (let i = 0; i < options.recorded.length; i += 2)
    {
      this._recordReferences(options.recorded[i], options.recorded[i + 1], options);
    }

    if (options.skipEvents) return;

    for (const entry of options.completions.values()) this._complete(entry, options);
  }

  /**
   * Tells one object what happened: Initialize, or OnModified per member, never both.
   * Carbon: "If IInitialize is provided, don't do individual notifications"
   * (DictReader.cpp:162-167, Copier.cpp:141-145).
   * @cjs On a live set, only members it changed are told.
   */
  static _complete(entry, options)
  {
    const { object, info } = entry;

    if (entry.initialize && info.declared.initialize)
    {
      object.Initialize();
      return;
    }

    const changes = entry.values ?? this._getOwnChanges(entry.changes, entry.nested);
    if (changes !== false) this._notify(object, info, this._getMemberNames(changes), options.operation === GraphOperation.COPY);
  }

  /** The member names in a bag, without _type, _id and _ref. @cjs */
  static _getMemberNames(values)
  {
    const names = [];

    for (const name of Object.keys(values))
    {
      if (!this._reserved.has(name)) names.push(name);
    }

    return names;
  }

  /**
   * Writes a list that waited: a mapped list through its own ReplaceItems, and an ordinary array on
   * a list-notified owner with the owner's events. A copy sends what AssignTo does: the removal,
   * then LOADFINISHED only for items.
   * Modelled on: DictReader::ReadList (blue/src/DictReader.cpp:427-476).
   * Modelled on: BlueList_Impl::AssignTo (blueexposure/include/BlueListUtil.h:506-545).
   * @cjs UNLOADSTART runs with the old items still in the list.
   */
  static _replaceList(owner, list, items, options)
  {
    const copying = options.operation === GraphOperation.COPY;

    if (Object.getPrototypeOf(list) !== Array.prototype)
    {
      if (copying && items.length === 0) list.Remove(-1);
      else list.ReplaceItems(items);
      return;
    }

    if (list.length) owner.OnListModified(BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0, null, list);

    list.length = 0;

    if (copying)
    {
      for (let i = 0; i < items.length; i++) list.push(items[i]);
      if (items.length) owner.OnListModified(BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0, null, list);
      return;
    }

    for (let i = 0; i < items.length; i++)
    {
      list.push(items[i]);
      if (items[i] !== null) owner.OnListModified(BLUELISTEVENT.BELIST_INSERTED, list.length, 0, items[i], list);
    }
  }

  /**
   * Copies a forward _ref's values into an embedded object.
   * @cjs A source that is itself waiting fills first. The cleared fill ends a cycle.
   */
  static _fill(entry, options)
  {
    const target = entry.fill;
    if (target === null) return;
    entry.fill = null;

    const source = options.anchors.get(entry.id);
    for (const other of options.pending)
    {
      if (other.fill === source) this._fill(other, options);
    }

    if (source === target) return;

    this._setMembers(target, this._getObjectInfo(target, entry.type), this.getEmbeddedValues(source, options), options);
    if (entry.record !== null) entry.record[entry.recordKey] = target;
  }

  /** Applies the top-level values rule: a plain object, or null for no values. @cjs */
  static _isValues(values, operation)
  {
    if (values === null) return false;

    if (typeof values !== "object" || Array.isArray(values) || !this.isPlain(values))
      throw new TypeError(`Graph ${operation} requires plain values.`);

    return true;
  }

  /** The newest library's class for a name. @cjs */
  static _getClass(typeName)
  {
    for (let i = this._libraries.length - 1; i >= 0; i--)
    {
      const ctor = this._libraries[i].Get(typeName);
      if (ctor) return ctor;
    }

    throw new TypeError(`Unknown graph class: ${typeName}`);
  }

  /** Creates an instance through the newest library that names the class. @cjs */
  static _create(typeName)
  {
    for (let i = this._libraries.length - 1; i >= 0; i--)
    {
      if (this._libraries[i].Get(typeName)) return this._libraries[i].Create(typeName);
    }

    throw new TypeError(`Unknown graph class: ${typeName}`);
  }

  /** Copies plain values, leaving _type, _id and _ref as data. @cjs Values mode. */
  static _copyValues(value)
  {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(item => this._copyValues(item));
    if (ArrayBuffer.isView(value)) return Array.from(value);
    if (!this.isPlain(value)) throw new TypeError("Graph values mode requires plain values.");

    const copy = {};
    for (const name of Object.keys(value)) copy[name] = this._copyValues(value[name]);
    return copy;
  }

  /**
   * Whether a member takes a value from a set or a from. WRITE, PERSIST and RPERSIST each let one
   * in, as DictReader::FindEntry does (blue/src/DictReader.cpp:690-713).
   * @cjs A member with no access flags stays open to JavaScript.
   */
  static _isWritable(flags)
  {
    return (flags & this._accepting) !== 0 || (flags & EDITFLAGS.READ) === 0;
  }

  /**
   * The members one operation sees, resolved once per class and choice of flags.
   * @cjs Lives on the compiled record, so a registration change discards it with the rest.
   * Resolves names after filtering, as _selectEdges does.
   */
  static _getMemberTable(info, operation, options)
  {
    const reading = operation === GraphOperation.GET;
    const persistOnly = reading && options.persistOnly, roundTrip = reading && options.roundTrip;
    const index = reading ? (persistOnly ? 1 : 0) + (roundTrip ? 2 : 0) : 4;

    let table = info.compiled.tables[index];
    if (table) return table;

    const members = [], byName = Object.create(null);
    for (const member of info.compiled.members)
    {
      if (byName[member.name] || (member.flags & this._unread) !== 0) continue;
      if ((!reading || roundTrip) && !this._isWritable(member.flags)) continue;
      if (persistOnly && (member.flags & EDITFLAGS.PERSIST) === 0) continue;

      byName[member.name] = member;
      members.push(member);
    }

    table = { members, byName };
    info.compiled.tables[index] = table;
    return table;
  }

  /** Executes both full enumeration and compiled selection with one iterative walk. @cjs */
  static _traverse(root, visit, options, selection, output)
  {
    const depth = this._traversalDepth++;
    const state = this._traversals[depth] ??= {
      frames: [], seen: new WeakMap(), types: new WeakMap(), pass: 0, classes: new Map()
    };
    if (state.pass === Number.MAX_SAFE_INTEGER)
    {
      state.seen = new WeakMap();
      state.pass = 0;
    }
    const pass = ++state.pass;
    const revision = this._revision;
    let top = 0, count = 0;
    this._setFrame(state.frames, top, root, this._noTypes);

    try
    {
      while (top >= 0)
      {
        if (revision !== this._revision) throw new Error("Graph declarations changed during traversal.");
        const frame = state.frames[top];

        if (!frame.members)
        {
          const object = frame.object;
          if (object === null)
          {
            this._clearFrame(frame);
            top--;
            continue;
          }

          const info = this._getObjectInfo(object, frame.type);
          if (state.seen.get(object) === pass)
          {
            if (state.types.get(object) !== info) throw new TypeError("Shared graph struct has conflicting declared types.");
            this._clearFrame(frame);
            top--;
            continue;
          }
          state.seen.set(object, pass);
          state.types.set(object, info);
          count++;

          if (selection)
          {
            const row = selection.classes.get(info);
            if (row.matches) output.push(object);
            frame.members = options.prune === false ? row.full : row.selected;
            if (options.stats) options.stats.skippedEdges += row.full.length - frame.members.length;
          }
          else if (visit(object, info) === false)
          {
            this._clearFrame(frame);
            top--;
            continue;
          }

          else
          {
            let members = state.classes.get(info);
            if (!members)
            {
              members = this._selectEdges(info, options);
              state.classes.set(info, members);
            }
            frame.members = members;
          }
        }

        if (revision !== this._revision) throw new Error("Graph declarations changed during traversal.");

        // Continue a collection before reading the next declared member.
        if (frame.items && frame.itemIndex < frame.items.length)
        {
          const child = frame.items[frame.itemIndex++];
          this._setFrame(state.frames, ++top, child, frame.type);
          continue;
        }
        frame.items = null;

        if (frame.memberIndex === frame.members.length)
        {
          this._clearFrame(frame);
          top--;
          continue;
        }

        const member = frame.members[frame.memberIndex++];
        const stored = frame.object[member.key];
        if (member.index >= 0 && (!Array.isArray(stored) || member.index >= stored.length))
          throw new TypeError(`Graph member index is outside its storage: ${member.name}`);
        const value = member.index < 0 ? stored : stored[member.index];
        if (value === undefined) throw new TypeError(`Graph edge is undefined: ${member.name}`);
        if (member.collection !== null)
        {
          const items = member.collection === "map" && value !== null ? Array.from(value.values()) : value;
          if (!Array.isArray(items)) throw new TypeError(`Graph collection must be an array: ${member.name}`);
          frame.items = items;
          frame.itemIndex = 0;
          frame.type = member.edgeType;
        }
        else
        {
          this._setFrame(state.frames, ++top, value, member.edgeType);
        }
      }

      if (revision !== this._revision) throw new Error("Graph declarations changed during traversal.");
      return count;
    }
    finally
    {
      for (; top >= 0; top--) this._clearFrame(state.frames[top]);
      state.classes.clear();
      this._traversalDepth--;
    }
  }

  /**
   * Snapshots an explicit object/struct edge; an empty type list is dynamic.
   * @cjs Ownership is retained independently of collection shape and target class.
   */
  static _compileEdge(edge)
  {
    if (edge.kind !== "embed" && edge.kind !== "ref" && edge.kind !== "refWeak" && edge.kind !== "weak")
      throw new TypeError("Graph edge requires embed, ref, refWeak or weak ownership.");

    const types = edge.type == null ? this._noTypes : Array.isArray(edge.type) ? edge.type.slice() : [ edge.type ];
    for (const type of types)
    {
      if (typeof type !== "function" && typeof type !== "string")
        throw new TypeError("Graph edge type requires a constructor or registered name.");
    }

    const collection = edge.map === true ? "map" : edge.collection === true ? "list" : edge.collection || null;
    if (collection !== null && collection !== "list" && collection !== "array" && collection !== "set" && collection !== "map")
      throw new TypeError("Graph edge collection must be list, array, set or map.");

    return { kind: edge.kind, types, collection };
  }

  /** Resolves actual classes, using the declared type only for plain struct storage. @cjs */
  static _getObjectInfo(object, types)
  {
    if (typeof object !== "object") throw new TypeError("Graph edge requires an object.");
    const prototype = Object.getPrototypeOf(object);
    const plain = prototype === Object.prototype || prototype === null;

    if (types.length !== 0)
    {
      if (plain) return this.getClassInfo(types[0]);

      const info = this.getClassInfo(prototype.constructor);
      for (let i = 0; i < types.length; i++)
      {
        const declared = this.getClassInfo(types[i]);
        if (declared.ctor.prototype.isPrototypeOf(object) || info.declared.interfaces.includes(declared.declared.name)) return info;
      }

      throw new TypeError(`Graph edge is not assignable to ${this.getClassInfo(types[0]).declared.name}: holds ${info.declared.name}.`);
    }

    if (plain) throw new TypeError("Graph edge has no declared type for a plain object.");
    return this.getClassInfo(prototype.constructor);
  }

  /**
   * Derives reachability by propagating matches/dynamic edges through reverse dependencies.
   * @cjs Cycles need no recursion or repeated whole-registry fixed-point scan. Registered derived
   * classes are possible targets too. Unknown targets remain conservative until registration.
   */
  static _compileSelection(selection, diagnostics)
  {
    const revision = this._revision;
    const classes = new Map(), descendants = new Map(), prototypes = new Map();
    const queue = [];

    for (const info of this._classes.values()) if (info.declared) prototypes.set(info.ctor.prototype, info);

    for (const info of this._classes.values())
    {
      if (!info.declared) continue;
      const full = this._selectEdges(info, selection);
      const matches = !!selection.matchClass(info);
      if (revision !== this._revision) throw new Error("Graph declarations changed during selection compilation.");

      const row = { info, full, matches, reachable: matches, parents: [], dependencies: [], selected: [] };
      classes.set(info, row);
      if (matches) queue.push(row);

      // Use the same instance-prototype relation as runtime assignability, including
      // classes whose prototype inheritance was established without `extends`.
      for (let prototype = info.ctor.prototype; prototype; prototype = Object.getPrototypeOf(prototype))
      {
        const base = prototypes.get(prototype);
        if (!base) continue;
        let targets = descendants.get(base);
        if (!targets) descendants.set(base, targets = []);
        targets.push(row);
      }
    }

    for (const row of classes.values())
    {
      for (const member of row.full)
      {
        const types = member.edgeType;
        const known = types.map(type =>
        {
          const target = typeof type === "string" ? this._names.get(type) : this._classes.get(type);
          return target?.declared ? target : null;
        });
        const targets = types.length !== 0 && known.every(Boolean) ? known.flatMap(target => descendants.get(target) ?? []) : null;
        row.dependencies.push({ member, targets });
        if (targets)
        {
          for (const child of targets) child.parents.push(row);
        }
        else
        {
          if (!row.reachable)
          {
            row.reachable = true;
            queue.push(row);
          }
          if (diagnostics) diagnostics.push({
            className: row.info.declared.name, member: member.name,
            reason: types.length === 0 ? "dynamic" : "unregistered target"
          });
        }
      }
    }

    for (let i = 0; i < queue.length; i++)
    {
      for (const parent of queue[i].parents)
      {
        if (parent.reachable) continue;
        parent.reachable = true;
        queue.push(parent);
      }
    }

    for (const row of classes.values())
    {
      for (const dependency of row.dependencies)
      {
        let reachable = !dependency.targets;
        if (dependency.targets)
        {
          for (const target of dependency.targets)
          {
            if (target.reachable) { reachable = true; break; }
          }
        }
        if (reachable) row.selected.push(dependency.member);
      }
      // Only the warm execution data survives; discard compilation's dependency graph.
      row.parents = null;
      row.dependencies = null;
    }
    return { revision, classes };
  }

  /** Resolves eligible names before edge filtering, once per class per traversal. @cjs */
  static _selectEdges(info, options)
  {
    const selected = new Map();
    const edges = options.edges ?? ["embed", "ref"];
    for (const member of info.compiled.members)
    {
      if (selected.has(member.name)) continue;
      if (options.acceptMember && !options.acceptMember(member, info)) continue;
      selected.set(member.name, member);
    }

    const members = [];
    for (const member of selected.values())
    {
      if (member.edgeKind !== null && edges.includes(member.edgeKind)) members.push(member);
    }
    return members;
  }

  /** Reuses a depth frame rather than allocating one per visited object. @cjs */
  static _setFrame(frames, index, object, type)
  {
    const frame = frames[index] ??= {
      object: null, type: null, members: null, memberIndex: 0, items: null, itemIndex: 0
    };
    frame.object = object;
    frame.type = type;
    frame.memberIndex = 0;
    frame.itemIndex = 0;
  }

  /** Releases all graph/declaration references when a frame completes or fails. @cjs */
  static _clearFrame(frame)
  {
    frame.object = null;
    frame.type = null;
    frame.members = null;
    frame.items = null;
  }

  /**
   * A class and the classes its exposure chains to, by their declared chainTo names, derived first.
   * A chain naming a class with no definition ends there.
   * @cjs Carbon's ClassInfo holds the parent pointer itself.
   * @param {ClassInfo} info The class.
   * @returns {ClassInfo[]} The chain, the class first.
   */
  static _GetExposureChain(info)
  {
    const chain = [];
    for (let owner = info; owner && !chain.includes(owner); owner = owner.declared.chainTo ? this._names.get(owner.declared.chainTo) : undefined)
    {
      chain.push(owner);
    }
    return chain;
  }

  /**
   * Resolves inherited members without reading or constructing any instance.
   * Modelled on: BlueRttiType::Init (blueexposure/BlueClasses.cpp:82-125).
   * @adapted JS keys replace native offsets; flags are retained, and read by _getMemberTable.
   */
  static _compile(info)
  {
    const members = [];

    // Every row in derived-first order, a name as often as the chain declares it. Flags filter BEFORE
    // resolving a name; e.g. a runtime-only derived declaration must not erase a visible base declaration.
    // Carbon's FindEntry walks mParentClassInfo, which only EXPOSURE_CHAINTO sets: the declared chainTo,
    // never the prototype chain, which is the class's bases.
    for (const owner of this._GetExposureChain(info))
    {
      // The row itself, never a copy: every table lists the same objects.
      for (const member of owner.declared.members) members.push(member);
    }

    // The class's own facts (its name, bases, chain, interfaces and what its instances take) are in `declared`, once.
    // Stored beside the rows: only the per-operation tables, which measure about twice as fast as deriving them.
    return { members, tables: [], defaults: null, ui: null };
  }

  /** Stable class identity. */
  static className = "CjsGraph";

}
