// Source: blueexposure/BlueClasses.h
// Source: blueexposure/BlueClasses.cpp
// Source: blueexposure/include/BlueTypes.h:409-419 (Be::ClassRegistration)
//
// The registry behind `be.classes` (`BeClasses`).
//
// The classes/registry leaf owns complete registration records for every
// CjsBlueClasses instance and for CjsSchema. Class metadata remains schema-owned;
// registering or removing a name never creates or discards that metadata.
// The first registration wins, and replacement requires explicit removal.
//
// It answers truthfully
// before anything is composed - an empty registry finds nothing, which is what
// Carbon returns for a class nobody registered - so the slot holds this class
// directly rather than a throwing interface.
//
// A REGISTRATION IS { name, type, createFn, flags }. `type`, `createFn` and
// `flags` are Carbon's `mType`, `mCreateFn` and `mFlags`. In JavaScript a
// class is its own type information, so `type` is the constructor itself:
// `GetClassRegistration("X").type` is how a caller reaches a class's statics
// or subclasses it without importing it. `name` is the class name Carbon's
// `ClassInfo` carries; it is given explicitly and never read from
// `type.name`, because a minifier renames classes and the lookup would
// then silently miss in production.
//
// A CLASS ID IS THE CLASS NAME. Carbon's `Be::Clsid` is a GUID paired with a
// module and name, and `FindClsid` already ignores the module ("we don't allow
// name clashes between modules", BlueClasses.cpp:340-343). With no GUIDs to
// carry, the name is the only identity there is.
//
// Source: blueexposure/BlueClasses_Blue.cpp:311-444 (the Python exposure:
// GetClassTypes, LiveCount, LockCount, GetWrapperList, LiveList,
// ProcessAllPendingDeletes, Copy, Find, GetTypeInfo, GetPersistedClassesReport),
// blueexposure/TypeInfo.cpp:66-190 (PyGetTypeInfo), blueexposure/Find.cpp:147-246
// (FindSingle, PyFindImpl).
import { registerClass, unregisterClass, getClassRegistration, getClassRegistrations } from "./classes/registry.js";
import { CjsSchema, meta, blue } from "#schema";
import { getCarbonTypeDefinition } from "../schema/types/carbonTypes.js";
import { mappedInterfaces, exposureChainTo } from "../compose/interface.js";
import { IBlueClasses } from "./IBlueClasses.js";
import { Copier } from "./Copier.js";
import * as CcpLog from "../logging/ccpLog.js";
// The class, not the `blue` instance: the holder constructs this registry,
// so importing the instance here would be an import cycle.
import { CjsBlue } from "./CjsBlue.js";

/** Be::EDITFLAGS bits (BlueTypes.h:288-303), keyed by the schema's edit flag names. */
const EDIT_FLAG_BITS = [
  [ "read", 0x001 ], [ "write", 0x002 ], [ "notify", 0x004 ], [ "hidden", 0x008 ],
  [ "persist", 0x010 ], [ "rpersist", 0x020 ]
];

/** Be::EDIT_FLAGS and Be::EDIT_ENUM (BlueTypes.h:288-303): read from the member's type. */
const EDIT_FLAGS = 0x100;
const EDIT_ENUM = 0x200;


/** `CjsBlueClasses` - the class registry `be.classes` holds, per blueexposure/BlueClasses.cpp. */
export class CjsBlueClasses extends IBlueClasses
{

  /** Carbon's `Be::ClassRegistration::Flags` (BlueTypes.h:415-418). */
  static Flags = {
    DISABLE_PYTHON_CONSTRUCTION: 1
  };

  /** Carbon's `BLUEQIOPT` (BlueTypes.h:468-472). */
  static BLUEQIOPT = {
    BEQI_NONE: 0x0,
    BEQI_SILENT: 0x1
  };

  /**
   * Register every entry of a table (BlueClasses.cpp:296-302).
   *
   * Adapted: Carbon walks a null-terminated array; JavaScript takes any iterable of
   * registrations.
   *
   * @param {Array<{name: string, type: Function, createFn?: Function, flags?: number}>} table Registrations.
   */
  RegisterClasses(table)
  {
    for (const registration of table)
    {
      this._RegisterSingleClass(registration);
    }
  }

  /**
   * `RegisterClasses( std::vector<Be::ClassRegistration>& table )`: register
   * every entry of a vector (BlueClasses.cpp:314-320).
   *
   * @param {Array<{name: string, type: Function, createFn?: Function, flags?: number}>} table Registrations.
   */
  RegisterClasses__Vector(table)
  {
    // Carbon (BlueClasses.cpp:296-320): both overloads register each entry; a JS array carries its length.
    return this.RegisterClasses(table);
  }

  /**
   * Remove every entry of a table (BlueClasses.cpp:304-310, 282-294).
   *
   * @param {Array<{name: string}>} table Registrations to remove.
   */
  UnregisterClasses(table)
  {
    for (const registration of table)
    {
      unregisterClass(registration.name);
    }
  }

  /**
   * `UnregisterClasses( std::vector<Be::ClassRegistration>& table )`: remove
   * every entry of a vector (BlueClasses.cpp:323-329).
   *
   * @param {Array<{name: string}>} table Registrations to remove.
   */
  UnregisterClasses__Vector(table)
  {
    // Carbon (BlueClasses.cpp:305-329): both overloads remove each entry; a JS array carries its length.
    return this.UnregisterClasses(table);
  }

  /**
   * A copy of the shared registration, or null (BlueClasses.cpp:331-336).
   * Changing this returned record does not mutate the registered entry.
   *
   * Adapted: A class id is the class name: there are no GUIDs to carry, and Carbon already
   * forbids name clashes between modules.
   *
   * @param {string} clsid Class id, which is the class name.
   * @returns {{name: string, type: Function, createFn: Function, flags: number}|null} Registration.
   */
  GetClassRegistration(clsid)
  {
    return getClassRegistration(clsid);
  }

  /**
   * `FindClsid( const char* name )`: the class id registered under a name, or
   * null (BlueClasses.cpp:355-364).
   *
   * Adapted: the id is the class name; the registered spelling is returned
   * where Carbon returns a pointer to the registered `Be::Clsid`.
   *
   * @param {string} name Class name.
   * @returns {string|null} Class id.
   */
  FindClsid(name)
  {
    return getClassRegistration(name)?.name ?? null;
  }

  /**
   * `FindClsid( Be::Clsid& clsid, const char* module, const char* name )`: the
   * class id registered under a module and name, or null
   * (BlueClasses.cpp:338-353). Carbon writes the id to its `clsid` output
   * parameter and returns whether it found one; the output parameter is the
   * return value here, and null is Carbon's false.
   *
   * Adapted: the id is the class name, as in `FindClsid(name)`.
   *
   * @param {string} _module Module name; Carbon ignores it.
   * @param {string} name Class name.
   * @returns {string|null} Class id.
   */
  FindClsid__Module(_module, name)
  {
    // Carbon (BlueClasses.cpp:340-345): the module is ignored and the name looked up, as FindClsid(name).
    return this.FindClsid(name);
  }

  /**
   * A new instance of the class with this id, or null (BlueClasses.cpp:429-445).
   *
   * Adapted: Carbon returns bool and writes the instance through ppv after a QueryInterface
   * for riid; JavaScript returns the instance or null, with no interface id to query.
   *
   * @param {string} clsid Class id, which is the class name.
   * @returns {object|null} New instance.
   */
  CreateInstance(clsid)
  {
    const registration = this.GetClassRegistration(clsid);

    return registration ? registration.createFn() : null;
  }

  /**
   * A new instance of the class registered under a name, or null (BlueClasses.cpp:448-464).
   *
   * Adapted: Carbon returns bool and writes the instance through ppv after a QueryInterface
   * for riid; JavaScript returns the instance or null, with no interface id to query.
   *
   * @param {string} className Class name.
   * @returns {object|null} New instance.
   */
  CreateInstanceFromName(className)
  {
    // Carbon (BlueClasses.cpp:448-464) looks the name up itself; a class id is the name here, so CreateInstance answers.
    return this.CreateInstance(className);
  }

  /** Register one entry, refusing a name already taken (BlueClasses.cpp:266-280). */
  _RegisterSingleClass(registration)
  {
    registerClass(registration);
  }

  /**
   * `QueryThisInterface( pThis, riid, ppv, type, options = BEQI_NONE )`: the
   * object when `type`'s exposure table maps the interface, otherwise null
   * (BlueClasses.cpp:376-415). The table is the class's own entries followed by
   * each `chainTo` parent's, which is the order Carbon walks
   * `mParentClassInfo`. A miss is logged unless `BEQI_SILENT` is set, and
   * only when a type was given, as Carbon logs only for a non-null `type`.
   *
   * Adapted: Carbon writes the offset-adjusted pointer to its `ppv` output
   * parameter and returns bool; the output parameter is the return value
   * here, and JavaScript has no offsets, so it is `self` or null. `type` is
   * the class itself, a JavaScript class being its own type information. The
   * log names the class without Carbon's module prefix, which JavaScript
   * classes do not carry.
   *
   * @param {object} self The object to query.
   * @param {Function} riid The interface or class to ask for.
   * @param {Function|null} type The class whose exposure table is walked, usually `self.constructor`.
   * @param {number} [options=BEQI_NONE] `BLUEQIOPT` flags.
   * @returns {object|null} `self`, or null.
   */
  QueryThisInterface(self, riid, type, options = CjsBlueClasses.BLUEQIOPT.BEQI_NONE)
  {
    if (mappedInterfaces(type).has(riid)) return self;
    if (type && (options & CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) === 0)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("blue"), "Interface %s not found on class %s",
        CjsSchema.getClassName(riid), CjsSchema.getClassName(type));
    }
    return null;
  }

  /**
   * `CopyTo( source, dest )`: `CopyTo__Callbacks` with Carbon's default
   * callbacks and contexts, all null (IBlueClasses.h:72-79).
   *
   * @param {object} source The object to copy.
   * @param {object|null} dest An existing object of the same class, which is filled and returned, or null for a new one.
   * @returns {object|null} The destination, or null when the copy failed.
   */
  CopyTo(source, dest)
  {
    // Carbon (IBlueClasses.h:72-79): copyOverride, overrideContext, postCopy and postCopyContext default to nullptr.
    return this.CopyTo__Callbacks(source, dest, null, null, null, null);
  }

  /**
   * `CopyTo( source, dest, copyOverride, overrideContext, postCopy, postCopyContext )`:
   * copies `source` into `dest`, or into a new instance of its class when
   * `dest` is null, through a fresh Copier given both callbacks and their
   * contexts (BlueClasses.cpp:498-510).
   *
   * Adapted: Carbon returns bool and writes the destination to its `dest`
   * output parameter; the output parameter is the return value here, the
   * destination or null.
   *
   * @param {object} source The object to copy.
   * @param {object|null} dest An existing object of the same class, which is filled and returned, or null for a new one.
   * @param {Function|null} [copyOverride=null] See `Copier.SetCopyOverrideCallback`.
   * @param {*} [overrideContext=null] Passed to `copyOverride` as its last argument.
   * @param {Function|null} [postCopy=null] See `Copier.SetPostCopyCallback`.
   * @param {*} [postCopyContext=null] Passed to `postCopy` as its last argument.
   * @returns {object|null} The destination, or null when the copy failed.
   */
  CopyTo__Callbacks(source, dest, copyOverride = null, overrideContext = null, postCopy = null, postCopyContext = null)
  {
    const copier = new Copier();
    copier.SetCopyOverrideCallback(copyOverride, overrideContext);
    copier.SetPostCopyCallback(postCopy, postCopyContext);
    return copier.CopyTo(source, dest);
  }

  /**
   * Copies preserving topology, through a fresh Copier (BlueClasses.cpp:512-516).
   *
   * Adapted: Carbon returns bool and writes the destination to its `dest`
   * output parameter; the output parameter is the return value here, the
   * destination or null.
   *
   * @param {object} source The object to copy.
   * @param {object|null} dest An existing object of the same class, which is filled and returned, or null for a new one.
   * @returns {object|null} The destination, or null when the copy failed.
   */
  CloneTo(source, dest)
  {
    return new Copier().CloneTo(source, dest);
  }

  /**
   * `GetClassTypes` - Blue's `PyGetClassTypes` (BlueClasses_Blue.cpp:84-114):
   * the type info of every registered class, in registration order.
   *
   * Not supported: the module filter. A JavaScript registration carries no
   * module (see FindClsid), so a module name throws rather than filtering
   * nothing.
   *
   * @param {string|null} [moduleName=null] Carbon's optional module filter.
   * @returns {Array<Array<object>>} One GetTypeInfo record per class.
   * @throws {TypeError} When a module name is given.
   */
  GetClassTypes(moduleName = null)
  {
    if (moduleName !== null)
    {
      throw new TypeError("GetClassTypes: registrations carry no module, so a module filter cannot be applied.");
    }
    return getClassRegistrations().map(registration => CjsBlueClasses._typeInfo(registration.type, 0));
  }

  /**
   * `LiveCount` (BlueClasses_Blue.cpp:162-184): live instances per class.
   *
   * Not supported: Carbon counts construction and destruction in each
   * ClassInfo. JavaScript objects are released by the garbage collector, which
   * reports neither, so no count exists.
   *
   * @returns {never}
   * @throws {Error} Always.
   */
  LiveCount()
  {
    throw new Error("LiveCount: JavaScript garbage collection does not report object lifetimes, so live counts are not kept.");
  }

  /**
   * `LockCount` (BlueClasses_Blue.cpp:187-207): reference locks per class.
   *
   * Not supported: JavaScript has no reference counts (see IRoot).
   *
   * @returns {never}
   * @throws {Error} Always.
   */
  LockCount()
  {
    throw new Error("LockCount: JavaScript objects carry no reference counts.");
  }

  /**
   * `GetWrapperList` (BlueClasses_Blue.cpp:210-217): every Blue object wrapped
   * for Python.
   *
   * Not supported: there are no Python wrappers. The per-object wrapper Carbon
   * keeps (BlueWrapper, BluePyWrap.cpp) is not ported.
   *
   * @returns {never}
   * @throws {Error} Always.
   */
  GetWrapperList()
  {
    throw new Error("GetWrapperList: no Python wrappers exist in JavaScript.");
  }

  /**
   * `LiveList` (BlueClasses_Blue.cpp:116-160, `BLUE_LIVELIST_ENABLED` builds
   * only): live and lock counts per class and per tracked instance.
   *
   * Not supported: it reports LiveCount's and LockCount's numbers, which
   * JavaScript does not keep.
   *
   * @returns {never}
   * @throws {Error} Always.
   */
  LiveList()
  {
    throw new Error("LiveList: JavaScript keeps no live or lock counts.");
  }

  /**
   * `ProcessAllPendingDeletes` (BlueClasses.cpp:549-560): runs every deferred
   * `FinalDelete`.
   *
   * No-op: JavaScript never defers a deletion, so the pending list is always
   * empty.
   *
   * @returns {void}
   */
  ProcessAllPendingDeletes()
  {
  }

  /**
   * `Copy` - Blue's `PyCopy` (BlueClasses_Blue.cpp:219-240): a copy of an
   * object through its persisted members, by `CopyTo`.
   *
   * @param {object} src The object to copy.
   * @returns {object} The copy.
   * @throws {TypeError} When `src` is not an object, Carbon's "Value is not a Blue object".
   * @throws {Error} When the copy fails, Carbon's "Couldn't copy object".
   */
  Copy(src)
  {
    if (src === null || typeof src !== "object") throw new TypeError("Value is not a Blue object");

    const dst = this.CopyTo(src, null);
    if (!dst) throw new Error("Couldn't copy object");
    return dst;
  }

  /**
   * `Find` - Blue's `PyFind` -> `PyFindImpl` -> `FindSingle`
   * (BlueClasses_Blue.cpp:242-264, Find.cpp:193-246, 313-349): every object
   * below `obj`, itself included, whose class or a class its exposure chains to
   * is one of `className`. Only persisted members are followed. `maxLevel` stops
   * the descent at that depth; `prune` does not look below a match. Results are
   * in Carbon's stack order.
   *
   * Adapted: a class id is `module.Name` as Carbon requires
   * (`Clsid::InitFromString`, BlueTypes.cpp:55-80), but the module is ignored,
   * as FindClsid ignores it; JavaScript registrations carry none.
   *
   * @param {object} obj Root object.
   * @param {string|string[]} className Class id or ids, e.g. "trinity.Tr2Effect".
   * @param {number} [maxLevel=-1] Maximum depth; negative is unlimited.
   * @param {boolean} [prune=false] Do not look below a match.
   * @returns {object[]} The matching objects.
   * @throws {TypeError} When obj is not an object, or a class id has no module part.
   */
  Find(obj, className, maxLevel = -1, prune = false)
  {
    if (obj === null || typeof obj !== "object") throw new TypeError("First argument is not a Blue object");

    const names = (Array.isArray(className) ? className : [ className ]).map(id =>
    {
      if (typeof id !== "string") throw new TypeError("first argument must be string or sequence of strings");
      const dot = id.indexOf(".");
      if (dot < 0) throw new TypeError(`Cannot convert "${id}" to a valid class id`);
      return id.slice(dot + 1);
    });

    const result = [];
    const stack = [ { obj, level: 0 } ];
    const seen = new Set();
    while (stack.length)
    {
      const e = stack.pop();
      if (seen.has(e.obj)) continue;
      seen.add(e.obj);

      if (CjsBlueClasses._isMatch(e.obj, names))
      {
        result.push(e.obj);
        if (prune) continue;
      }

      if (maxLevel >= 0 && e.level >= maxLevel) continue;

      const level = e.level + 1;
      CjsBlue.enumerateChildren__Filter(
        e.obj,
        child => stack.push({ obj: child, level }),
        child => stack.push({ obj: child, level }),
        child => stack.push({ obj: child, level }),
        member => member.edit !== undefined && member.edit.persist === true
      );
    }
    return result;
  }

  /**
   * `GetTypeInfo` - Blue's `PyTypeInfo` -> `PyGetTypeInfo`
   * (BlueClasses_Blue.cpp:266-280, TypeInfo.cpp:66-190): four records, the
   * class, its interfaces, its members and its methods.
   *
   * Adapted: a member's `type` is the schema type kind, not Carbon's numeric
   * `Be::VarType`, which the schema does not record. `module` is empty and
   * `autovar` is 0: registrations carry no module, and JavaScript objects
   * have no IRoot flags. Method documentation and `signatures` are empty: no
   * docstrings or signatures are kept.
   *
   * @param {object} obj The object.
   * @returns {Array<object>} `[classInfo, interfaces, members, methods]`.
   * @throws {TypeError} When obj is not an object, Carbon's "Value is not a Blue object".
   */
  GetTypeInfo(obj)
  {
    if (obj === null || typeof obj !== "object") throw new TypeError("Value is not a Blue object");
    return CjsBlueClasses._typeInfo(obj.constructor, 0);
  }

  /**
   * `GetPersistedClassesReport` (BlueClasses.cpp:607-669): every class with a
   * persisted member, sorted by name, listing each persisted member and its type.
   * A float-array member also lists its element count.
   *
   * Adapted: the type is the schema type kind, not Carbon's numeric
   * `Be::VarType` (see GetTypeInfo); the element count is the vector or
   * matrix length the kind defines.
   *
   * @returns {string} The report.
   */
  GetPersistedClassesReport()
  {
    const classes = [];
    for (const registration of getClassRegistrations())
    {
      const members = CjsSchema.getSchema(registration.type).members
        .filter(member => member.edit !== undefined && (member.edit.persist === true || member.edit.rpersist === true));
      if (members.length) classes.push({ name: registration.name, members });
    }
    classes.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    let result = "";
    for (const { name, members } of classes)
    {
      result += `${name}:\n`;
      for (const member of members)
      {
        const definition = getCarbonTypeDefinition(member.type);
        result += `-   ${member.name}:\n`;
        result += `    -   ${definition.kind}\n`;
        if (definition.length !== undefined) result += `    -   ${definition.length}\n`;
      }
    }
    return result;
  }

  /**
   * `IsMatch( IRoot*, const idvector_t& )` (Find.cpp:147-156): the object's
   * class, or any class its exposure chains to, has one of the names.
   *
   * @param {object} obj The object.
   * @param {string[]} names Class names.
   * @returns {boolean} Whether it matches.
   */
  static _isMatch(obj, names)
  {
    for (let type = obj.constructor; type; type = exposureChainTo(type))
    {
      if (names.includes(CjsSchema.getClassName(type))) return true;
    }
    return false;
  }

  /**
   * `PyGetTypeInfo` (TypeInfo.cpp:66-190) for a class.
   *
   * @param {Function} Constructor The class.
   * @param {number} flags IRoot flags; only the autovar bit is read.
   * @returns {Array<object>} `[classInfo, interfaces, members, methods]`.
   */
  static _typeInfo(Constructor, flags)
  {
    const schema = CjsSchema.getSchema(Constructor);
    const classInfo = {
      module: "",
      classname: schema.className,
      description: CjsSchema.getClassPurpose(Constructor) || "",
      autovar: flags & 0x1 ? 1 : 0,
      signatures: {}
    };

    const interfaces = {};
    for (const Interface of mappedInterfaces(Constructor)) interfaces[CjsSchema.getClassName(Interface)] = 0;

    const members = {};
    for (const member of [ ...schema.members, ...schema.properties ])
    {
      const type = member.type;
      const reference = type && (type.kind === "rootRef" || type.kind === "rootWeak") ? type.className : null;
      let editflags = 0;
      // A member declared with no Blue flags has no edit record: Carbon's mEditFlags 0.
      if (member.edit !== undefined) for (const [ flag, bit ] of EDIT_FLAG_BITS) if (member.edit[flag] === true) editflags |= bit;
      if (member.type?.flags === true) editflags |= EDIT_FLAGS;
      if (member.enum) editflags |= EDIT_ENUM;
      // PyGetChooserInfo (TypeInfo.cpp:28-68) reads mChooserTable whatever the
      // edit flags say: a `chooser` declaration (MAP_ATTRIBUTE_WITH_CHOOSER
      // without ENUM) reports its table and sets no bit; otherwise an enum's
      // registered chooser.
      const chooser = member.chooser ? member.chooser.entries : member.enum && member.enum.chooser;
      members[member.name] = {
        type: getCarbonTypeDefinition(type).kind,
        iid_name: typeof reference === "function" ? CjsSchema.getClassName(reference) : reference || "",
        iid_ver: 0,
        description: member.jessica && member.jessica.description ? member.jessica.description : "",
        editflags,
        min: null,
        max: null,
        choosers: chooser ? chooser.map(item => [ item.name, item.value, item.description || "" ]) : null
      };
    }

    const methods = {};
    for (let type = Constructor; type; type = exposureChainTo(type))
    {
      for (const method of CjsSchema.getSchema(type).methods || [])
      {
        if (method.carbon && method.carbon.method === true) methods[method.name] = "";
      }
    }

    return [ classInfo, interfaces, members, methods ];
  }

}


CjsSchema.blue.interface(IBlueClasses)(CjsBlueClasses);
CjsSchema.blue.define(CjsBlueClasses, {
  className: "CjsBlueClasses",
  donors: [ "BlueClasses" ],
  unused: [
    "FindVariable", "UpdateObjectCount",
    "ProcessPendingDeletes",
    "SetPendingDeletesEnabled", "IsPendingDeletesEnabled",
    "RegisterThunker", "GetRtti"
  ],
  fields: {},
  methods: {
    _RegisterSingleClass: [ blue.method, meta.adapted ],
    RegisterClasses: [ blue.method, meta.adapted ],
    RegisterClasses__Vector: [ blue.method, meta.implemented ],
    UnregisterClasses: [ blue.method, meta.implemented ],
    UnregisterClasses__Vector: [ blue.method, meta.implemented ],
    GetClassRegistration: [ blue.method, meta.adapted ],
    FindClsid: [ blue.method, meta.adapted ],
    FindClsid__Module: [ blue.method, meta.adapted ],
    CreateInstance: [ blue.method, meta.adapted ],
    CreateInstanceFromName: [ blue.method, meta.adapted ],
    QueryThisInterface: [ blue.method, meta.adapted ],
    CopyTo: [ blue.method, meta.implemented ],
    CopyTo__Callbacks: [ blue.method, meta.adapted ],
    CloneTo: [ blue.method, meta.adapted ],
    GetClassTypes: [ blue.method, meta.adapted ],
    LiveCount: [ blue.method, meta.notSupported ],
    LockCount: [ blue.method, meta.notSupported ],
    GetWrapperList: [ blue.method, meta.notSupported ],
    LiveList: [ blue.method, meta.notSupported ],
    ProcessAllPendingDeletes: [ blue.method, meta.noop ],
    Copy: [ blue.method, meta.implemented ],
    Find: [ blue.method, meta.adapted ],
    GetTypeInfo: [ blue.method, meta.adapted ],
    GetPersistedClassesReport: [ blue.method, meta.adapted ]
  }
});
