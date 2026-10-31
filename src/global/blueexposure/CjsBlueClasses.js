import { exposure as be } from "#be";
// Source: blueexposure/BlueClasses.h
// Source: blueexposure/BlueClasses.cpp
// Source: blueexposure/include/BlueTypes.h:409-419 (Be::ClassRegistration)
// Source: blueexposure/include/Find.h, blueexposure/Find.cpp (the Find functions, as statics)
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
import { registerClass, unregisterClass, getClassRegistration, getClassRegistrations, BeClasses, setBeClasses } from "./classes/registry.js";
import { CjsSchema, meta, blue } from "#schema";
import { getCarbonTypeDefinition, inferCarbonTypeFromCpp } from "../schema/types/carbonTypes.js";
import { mappedInterfaces, ownMappedInterfaces, exposureChainTo } from "../compose/interface.js";
import { IBlueClasses } from "./IBlueClasses.js";
import { BlueRttiType } from "./BlueRttiType.js";
import { Copier } from "./Copier.js";
import * as CcpLog from "../logging/ccpLog.js";

/** Be::EDITFLAGS bits (BlueTypes.h:288-303), keyed by the schema's edit flag names. */
const EDIT_FLAG_BITS = [
  [ "read", 0x001 ], [ "write", 0x002 ], [ "notify", 0x004 ], [ "hidden", 0x008 ],
  [ "persist", 0x010 ], [ "rpersist", 0x020 ]
];

/** Be::EDIT_FLAGS and Be::EDIT_ENUM (BlueTypes.h:288-303): read from the member's type. */
const EDIT_FLAGS = 0x100;
const EDIT_ENUM = 0x200;


/** `CjsBlueClasses` - the class registry `be.classes` holds, per blueexposure/BlueClasses.cpp.
 *
 * Carbon: BlueClasses (blueexposure/BlueClasses.h:23)
 */
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
   * `BlueClasses::Initialize()` (BlueClasses.cpp:257-264): makes the one
   * registry `BeClasses`. Carbon's instance is a function static, so a
   * second call keeps it; so does this.
   *
   * @adapted Carbon also records the main thread's id here; JavaScript runs
   *   Blue on one thread, so there is none to record.
   * @returns {boolean} True.
   */
  static Initialize()
  {
    if (!BeClasses) setBeClasses(new CjsBlueClasses());
    return true;
  }

  /**
   * Register every entry of a table (BlueClasses.cpp:296-302).
   *
   * @adapted Carbon walks a null-terminated array; JavaScript takes any iterable of
   *   registrations.
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
   * @implemented
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
   * @implemented
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
   * @implemented
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
   * @adapted A class id is the class name: there are no GUIDs to carry, and Carbon already
   *   forbids name clashes between modules.
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
   * @adapted the id is the class name; the registered spelling is returned
   *   where Carbon returns a pointer to the registered `Be::Clsid`.
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
   * @adapted the id is the class name, as in `FindClsid(name)`.
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
   * @adapted Carbon returns bool and writes the instance through ppv after a QueryInterface
   *   for riid; JavaScript returns the instance or null, with no interface id to query.
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
   * @adapted Carbon returns bool and writes the instance through ppv after a QueryInterface
   *   for riid; JavaScript returns the instance or null, with no interface id to query.
   * @param {string} className Class name.
   * @returns {object|null} New instance.
   */
  CreateInstanceFromName(className)
  {
    // Carbon (BlueClasses.cpp:448-464) looks the name up itself; a class id is the name here, so CreateInstance answers.
    return this.CreateInstance(className);
  }

  /**
   * Register one entry, refusing a name already taken (BlueClasses.cpp:266-280).
   *
   * @adapted
   */
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
   * @adapted Carbon writes the offset-adjusted pointer to its `ppv` output
   *   parameter and returns bool; the output parameter is the return value
   *   here, and JavaScript has no offsets, so it is `self` or null. `type` is
   *   the class itself, a JavaScript class being its own type information. The
   *   log names the class without Carbon's module prefix, which JavaScript
   *   classes do not carry.
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
   * @implemented
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
   * @adapted Carbon returns bool and writes the destination to its `dest`
   *   output parameter; the output parameter is the return value here, the
   *   destination or null.
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
   * @adapted Carbon returns bool and writes the destination to its `dest`
   *   output parameter; the output parameter is the return value here, the
   *   destination or null.
   * @param {object} source The object to copy.
   * @param {object|null} dest An existing object of the same class, which is filled and returned, or null for a new one.
   * @returns {object|null} The destination, or null when the copy failed.
   */
  CloneTo(source, dest)
  {
    return new Copier().CloneTo(source, dest);
  }

  /**
   * `GetRtti( const Be::ClassInfo *ci )` (BlueClasses.cpp:586-593): the
   * class's flattened run-time type information, built on the first request
   * and kept on the class info.
   *
   * @implemented
   * @param {import("./ClassInfo.js").ClassInfo} ci The class information, from `ClassInfo.exposeToBlue(Class)`.
   * @returns {BlueRttiType} The class's RTTI.
   */
  GetRtti(ci)
  {
    if (!ci.rtti)
    {
      ci.rtti = new BlueRttiType(ci);
    }
    return ci.rtti;
  }

  /**
   * `GetClassTypes` - Blue's `PyGetClassTypes` (BlueClasses_Blue.cpp:84-114):
   * the type info of every registered class, in registration order.
   *
   * Not supported: the module filter. A JavaScript registration carries no
   * module (see FindClsid), so a module name throws rather than filtering
   * nothing.
   *
   * @adapted
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
   * @notSupported Carbon counts construction and destruction in each
   *   ClassInfo. JavaScript objects are released by the garbage collector, which
   *   reports neither, so no count exists.
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
   * @notSupported JavaScript has no reference counts (see IRoot).
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
   * @notSupported there are no Python wrappers. The per-object wrapper Carbon
   *   keeps (BlueWrapper, BluePyWrap.cpp) is not ported.
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
   * Not used: live-object enumeration is a `BLUE_LIVELIST_ENABLED` debugging aid, and it reports
   * LiveCount's and LockCount's numbers, which JavaScript does not keep.
   *
   * @notUsed
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
   * @implemented
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
   * @adapted a class id is `module.Name` as Carbon requires
   *   (`Clsid::InitFromString`, BlueTypes.cpp:55-80), but the module is ignored,
   *   as FindClsid ignores it; JavaScript registrations carry none.
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
      CjsBlueClasses.enumerateChildren__Filter(
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
   * @adapted a member's `type` is the schema type kind, not Carbon's numeric
   *   `Be::VarType`, which the schema does not record. `module` is empty and
   *   `autovar` is 0: registrations carry no module, and JavaScript objects
   *   have no IRoot flags. Method documentation and `signatures` are empty: no
   *   docstrings or signatures are kept.
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
   * @adapted the type is the schema type kind, not Carbon's numeric
   *   `Be::VarType` (see GetTypeInfo); the element count is the vector or
   *   matrix length the kind defines.
   * @returns {string} The report.
   */
  GetPersistedClassesReport()
  {
    const classes = [];
    for (const registration of getClassRegistrations())
    {
      // BlueMemberIterator walks every PERSIST entry, a persisted property included.
      const info = CjsSchema.getSchema(registration.type);
      const members = [ ...info.members, ...info.properties ]
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
      // Carbon's EXPOSURE_BEGIN doc string is a separate question; our class prose lives in the JSDoc.
      description: "",
      autovar: flags & 0x1 ? 1 : 0,
      signatures: {}
    };

    const interfaces = {};
    for (const Interface of mappedInterfaces(Constructor)) interfaces[CjsSchema.getClassName(Interface)] = 0;

    const members = {};
    const completeExposureNames = new Set();
    // An accessor row is a property (blue.property/meta.property, flags derived)
    // or an attribute over the accessor path (its own flags); one carrying only
    // status markers is not exposed.
    for (const member of [ ...schema.members, ...schema.properties.filter(property => property.property || property.edit) ])
    {
      if (completeExposureNames.has(member.name)) continue;
      // PyGetTypeInfo lists what Carbon's EXPOSURE table holds (TypeInfo.cpp:118-148, the mMemberTable walk); our own rows are not in it.
      if (member.exposure?.origin === "ours") continue;
      if (member.exposure) completeExposureNames.add(member.name);
      const type = member.type;
      const reference = type && (type.kind === "rootRef" || type.kind === "rootWeak") ? type.className : null;
      let editflags = 0;
      // A member declared with no Blue flags has no edit record: Carbon's mEditFlags 0.
      if (member.exposure) editflags = member.exposure.flags;
      else
      {
        // Old declarations infer editor bits; new macro rows supply them exactly.
        if (member.edit !== undefined) for (const [ flag, bit ] of EDIT_FLAG_BITS) if (member.edit[flag] === true) editflags |= bit;
        if (member.type?.flags === true) editflags |= EDIT_FLAGS;
        if (member.enum) editflags |= EDIT_ENUM;
      }
      // PyGetChooserInfo (TypeInfo.cpp:28-68) reads mChooserTable whatever the
      // edit flags say: a `chooser` declaration (MAP_ATTRIBUTE_WITH_CHOOSER
      // without ENUM) reports its table and sets no bit; otherwise an enum's
      // registered chooser.
      const chooser = member.exposure
        ? member.exposure.chooser ? member.chooser.entries : null
        : member.chooser ? member.chooser.entries : member.enum && member.enum.chooser;
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
        // PyGetTypeInfo walks the class's PyMethodDef table, which only the MAP_METHOD* macros fill (blueexposure/TypeInfo.cpp:155-160): a method
        // belongs when it carries an exposure record of Carbon's (class-level rows and aliases included), never the legacy origin stamp or one of ours.
        if (method.exposure && method.exposure.origin !== "ours")
        {
          methods[method.exposure?.name ?? method.name] = "";
          for (const alias of method.exposure?.aliases ?? []) methods[alias.name ?? method.name] = "";
        }
      }
    }

    return [ classInfo, interfaces, members, methods ];
  }

  /**
   * Carbon's free `EnumerateChildren(obj, onChild)` (Find.h:139-148): see
   * `blue.EnumerateChildren` for the reported arguments.
   *
   * Carbon: Find (blueexposure/include/Find.h:140)
   *
   * @adapted
   * @param {object|null} obj Object whose immediate children are enumerated.
   * @param {function(object, object, (number|string|null)): void} onChild
   *   Receives the child, the member declaration, and the collection index or key.
   * @returns {void}
   */
  static enumerateChildren__OnChild(obj, onChild)
  {
    CjsBlueClasses.enumerateChildren__Filter(
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
   * Carbon: Find (blueexposure/include/Find.h:67)
   *
   * @adapted as EnumerateChildren, collection items are reported for the
   *   owner's member. onAttribute receives the declaring class where Carbon passes
   *   its ClassInfo, and 0 for Carbon's member offset; onListItem and onDictItem
   *   also receive the member and the collection, which Carbon reaches through
   *   the list object itself.
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

      let value = CjsBlueClasses._readStorage(obj, member.key);
      if (member.index !== undefined) value = CjsBlueClasses._readStorage(value, member.index);

      CjsBlueClasses._enumerateValue(value, member.type, (child, kind, index, container) =>
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
   * Carbon: Find (blueexposure/include/Find.h:61)
   *
   * @adapted a step into a collection item is the two steps Carbon would take,
   *   `[owner, 0, member]` then `[collection, 1, index]`, because a JavaScript
   *   collection is not a Blue object in the enumeration.
   * @param {object} from Start of the routes.
   * @param {object} to End of the routes.
   * @returns {Array<Array<Array<*>>>} Every route; `[[]]` when from is to.
   * @throws {Error} When either argument is null, as Carbon's ValueError.
   */
  static findRoute(from, to)
  {
    if (!from || !to) throw new Error("neither from nor to parameter can be None");

    const result = [];
    CjsBlueClasses._EnumerateRoutes(from, to, stack =>
    {
      result.push(CjsBlueClasses._routeOf(stack));
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
   * Carbon: Find (blueexposure/include/Find.h:54)
   *
   * @adapted
   * @param {object} from Start of the route.
   * @param {object} to End of the route.
   * @returns {Array<Array<*>>} The route; empty when from is to.
   * @throws {TypeError} When either argument is null.
   * @throws {Error} When no route exists, as Carbon's ValueError.
   */
  static findFirstRoute(from, to)
  {
    if (!from || !to) throw new TypeError("Argument 'from' or 'to' are not of type IRoot.");
    if (from === to) return [];

    let path = null;
    CjsBlueClasses._EnumerateRoutes(from, to, stack =>
    {
      path = CjsBlueClasses._routeOf(stack);
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
   * Carbon: Find (blueexposure/include/Find.h:63)
   *
   * @adapted Carbon returns a Python dict keyed by object; this returns a Map.
   *   A collection item's reference names its collection and index, as Carbon
   *   names the list object; the collection itself is not a key.
   * @param {IRoot} root Root of the tree.
   * @returns {Map<object, Array<Array<*>>>} References per reached object.
   * @throws {TypeError} For a null root, which Carbon dereferences unchecked.
   */
  static findAllReferences(root)
  {
    const result = new Map();
    // Carbon dereferences root unchecked (Find.cpp:556). enumerateChildren skips
    // a null object, so that dereference's failure is raised here; Carbon's
    // root-object check has nothing to catch, GetRootObject being the object.
    if (root === null || root === undefined) throw new TypeError("FindAllReferences: root is null.");
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

      CjsBlueClasses.enumerateChildren__Filter(
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
   * Carbon: Find (blueexposure/include/Find.h:57)
   *
   * @implemented
   * @param {object|null} obj Root object.
   * @param {string} iidName Interface name.
   * @returns {object[]} Objects mapping the interface.
   */
  static findInterface(obj, iidName)
  {
    const result = [];
    if (!obj) return result;

    const Interface = CjsSchema.getConstructor(iidName);
    const stack = [ obj ];
    const seen = new Set();
    while (stack.length)
    {
      const current = stack.pop();
      if (seen.has(current)) continue;
      seen.add(current);

      if (Interface && ownMappedInterfaces(current.constructor).has(Interface)) result.push(current);

      CjsBlueClasses.enumerateChildren__OnChild(current, child => stack.push(child));
    }
    return result;
  }

  /**
   * `FindReference` (Find.cpp:507-548): whether one object is reachable from
   * another.
   *
   * Carbon: Find (blueexposure/include/Find.h:62)
   *
   * @implemented
   * @param {object|null} from Source object.
   * @param {object|null} to Destination object.
   * @returns {boolean} True when `to` is `from` or is referenced below it.
   */
  static findReference(from, to)
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

      CjsBlueClasses.enumerateChildren__OnChild(current, child => stack.push(child));
    }
    return false;
  }

  /**
   * `EnumerateRoutes` (Find.cpp:250-308): Carbon's depth-first route walk.
   * Entries keep their parent's stack index, so the stack itself is the route
   * when `to` is reached; the level comparison pops finished branches.
   *
   * @adapted the anonymous-namespace template becomes a private method; its
   *   stack entry type is one record shape.
   * @param {object} from Start object.
   * @param {object} to End object.
   * @param {function(object[]): boolean} operation Receives the stack at each
   *   arrival; false stops the walk.
   * @returns {void}
   */
  static _EnumerateRoutes(from, to, operation)
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
        CjsBlueClasses.enumerateChildren__Filter(
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
   * @cjs
   * @implemented
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
   * @cjs
   * @implemented
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
   * @cjs
   * @implemented
   */
  static _describeType(type)
  {
    if (typeof type === "function") return { kind: "rootRef", className: type };
    if (typeof type !== "string") return type;
    if (type === "rootWeak") return { kind: "rootWeak" };
    if (CjsSchema.getConstructor(type)) return { kind: "rootRef", className: type };
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
   * @cjs
   * @implemented
   */
  static _enumerateValue(value, declaration, visit, kind = "attribute", index = null, collection = null)
  {
    if (value === null || typeof value !== "object") return;
    const type = CjsBlueClasses._describeType(declaration);
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
          if (entry) CjsBlueClasses._enumerateValue(entry.value, type.itemType, visit, "list", i, value);
        }
        return;
      }

      case "map":
      {
        const entries = value instanceof Map
          ? Array.from(value.entries())
          : Object.keys(value).map(key => [ key, Object.getOwnPropertyDescriptor(value, key).value ]);
        for (const [ key, item ] of entries) CjsBlueClasses._enumerateValue(item, type.valueType, visit, "dict", key, value);
        return;
      }
    }
  }

}


CjsSchema.exposure.mapInterface(IBlueClasses)(CjsBlueClasses);
CjsSchema.decorateMethod(CjsBlueClasses, "CreateInstance", blue.method);
CjsSchema.decorateMethod(CjsBlueClasses, "GetClassTypes", blue.method);
CjsSchema.decorateMethod(CjsBlueClasses, "LiveCount", blue.method);
CjsSchema.decorateMethod(CjsBlueClasses, "LockCount", blue.method);
CjsSchema.decorateMethod(CjsBlueClasses, "GetWrapperList", blue.method);
CjsSchema.decorateMethod(CjsBlueClasses, "LiveList", be.mapMethod(), meta.notUsed);
CjsSchema.decorateMethod(CjsBlueClasses, "ProcessAllPendingDeletes", blue.method, meta.noop);
CjsSchema.decorateMethod(CjsBlueClasses, "Copy", blue.method);
CjsSchema.decorateMethod(CjsBlueClasses, "Find", blue.method);
CjsSchema.decorateMethod(CjsBlueClasses, "GetTypeInfo", blue.method);
CjsSchema.decorateMethod(CjsBlueClasses, "GetPersistedClassesReport", blue.method);
CjsSchema.blue.define(CjsBlueClasses, {
  className: "CjsBlueClasses",
  unused: [
    "FindVariable", "UpdateObjectCount",
    "ProcessPendingDeletes",
    "SetPendingDeletesEnabled", "IsPendingDeletesEnabled",
    "RegisterThunker"
  ]
});

// Carbon's `BeClassesInitializer doTheInit` (BlueClasses.cpp:40-55) runs `BlueClasses::Initialize()` during static
// initialization, so `BeClasses` exists before anything asks for it; module evaluation is the JavaScript equivalent.
CjsBlueClasses.Initialize();
