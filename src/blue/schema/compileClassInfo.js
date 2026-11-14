// The one compile of a class into its Blue type information (Blue plan step 6).
// It reads the schema's sealed record once, at registration, and fills the base
// records (blue/base): ClassInfo with its VarEntry rows, and on first use the
// readers' table of persisted rows. The records import nothing
// but global/consts; everything that looks things up lives here.
//
// A late change to a registered class - a chain, an interface or a base declared
// at module bottom after define - recompiles it into the same ClassInfo object,
// so whatever holds it sees the change, and so do the classes that chain to it.
//
// CjsSchema imports this file and hands itself over (installClassInfoCompile)
// before it defines its own classes, so the two never import each other.
import { EDITFLAGS, VARTYPE } from "../../global/consts/blue.js";
import { CJS_CLASS_NAME } from "../compose/className.js";
import { baseList, exposureChainTo, mappedInterfaces, ownMappedInterfaces, setExposureChangeListener } from "../compose/interface.js";
import { CjsGraph } from "../../global/model/graph/CjsGraph.js";
import { registerClass } from "../exposure/classes/registry.js";
import { ClassInfo } from "../../global/model/graph/ClassInfo.js";
import { BLACK_DESTINATION, VarEntry } from "../../global/model/graph/VarEntry.js";
import { blueEnums } from "../enums/CjsBlueEnumRegistry.js";

/** The schema, from `installClassInfoCompile`. @type {typeof import("./CjsSchema.js").CjsSchema} */
let Schema = null;

/** Every class compiled so far, for a late change to a base class to reach its subclasses. */
const COMPILED = new Set();

/** Be::EDITFLAGS bits, keyed by the schema's edit flag names. */
const EDIT_FLAG_BITS = [
  [ "read", EDITFLAGS.READ ], [ "write", EDITFLAGS.WRITE ], [ "notify", EDITFLAGS.NOTIFY ], [ "hidden", EDITFLAGS.HIDDEN ],
  [ "persist", EDITFLAGS.PERSIST ], [ "rpersist", EDITFLAGS.RPERSIST ]
];

/**
 * The bits a member's values path honours: its edit flags, Carbon's row with any of ours merged
 * in, and a Carbon row's editor bits, or what the type adds. @meta.mapAttribute(meta.PERSIST) on a
 * Carbon READ row is PERSIST here.
 *
 * @param {object} member Declared member.
 * @returns {number} Be::EDITFLAGS bits.
 */
export function getDeclaredEditFlags(member)
{
  let flags = EDITFLAGS.NONE;
  if (member.edit !== undefined)
  {
    for (const [ flag, bit ] of EDIT_FLAG_BITS) if (member.edit[flag] === true) flags |= bit;
  }
  if (member.exposure) return flags | (member.exposure.flags & EDITFLAGS.EDMASK);
  if (member.type?.flags === true) flags |= EDITFLAGS.FLAGS;
  if (member.enum) flags |= EDITFLAGS.ENUM;
  return flags;
}

/**
 * A member's `mEditFlags` as Carbon's table holds them: the bits its exposure macro wrote. A
 * member without exposure is not in the table; for it this reports what it declares.
 *
 * @param {object} member Declared member.
 * @returns {number} Be::EDITFLAGS bits.
 */
export function getEditFlags(member)
{
  return member.exposure ? member.exposure.flags : getDeclaredEditFlags(member);
}

/** A declared scalar kind's VARTYPE, sign and float count (Carbon reads them from the C++ member type). */
const SCALARS = Object.freeze({
  boolean: [ VARTYPE.BOOL, false, 0 ],
  string: [ VARTYPE.STDSTRING, false, 0 ],
  path: [ VARTYPE.STDSTRING, false, 0 ],
  expression: [ VARTYPE.STDSTRING, false, 0 ],
  wstring: [ VARTYPE.STDWSTRING, false, 0 ],
  wpath: [ VARTYPE.STDWSTRING, false, 0 ],
  pyObject: [ VARTYPE.PYOBJECT, false, 0 ],
  scriptCallback: [ VARTYPE.SCRIPTCALLBACK, false, 0 ],
  enum: [ VARTYPE.LONG, true, 0 ],
  float32: [ VARTYPE.FLOAT, false, 0 ],
  float64: [ VARTYPE.DOUBLE, false, 0 ],
  int8: [ VARTYPE.BYTE, true, 0 ],
  uint8: [ VARTYPE.BYTE, false, 0 ],
  int16: [ VARTYPE.SHORT, true, 0 ],
  uint16: [ VARTYPE.SHORT, false, 0 ],
  int32: [ VARTYPE.LONG, true, 0 ],
  uint32: [ VARTYPE.ULONG, false, 0 ],
  int64: [ VARTYPE.INT64, true, 0 ],
  uint64: [ VARTYPE.UINT64, false, 0 ],
  vec2: [ VARTYPE.FLOATARRAY, false, 2 ],
  vector2: [ VARTYPE.FLOATARRAY, false, 2 ],
  vec3: [ VARTYPE.FLOATARRAY, false, 3 ],
  vector3: [ VARTYPE.FLOATARRAY, false, 3 ],
  vec4: [ VARTYPE.FLOATARRAY, false, 4 ],
  vector4: [ VARTYPE.FLOATARRAY, false, 4 ],
  color: [ VARTYPE.FLOATARRAY, false, 4 ],
  quat: [ VARTYPE.FLOATARRAY, false, 4 ],
  quaternion: [ VARTYPE.FLOATARRAY, false, 4 ],
  mat3: [ VARTYPE.FLOATARRAY, false, 9 ],
  matrix3: [ VARTYPE.FLOATARRAY, false, 9 ],
  mat4: [ VARTYPE.FLOATARRAY, false, 16 ],
  matrix4: [ VARTYPE.FLOATARRAY, false, 16 ]
});

/** A declared container kind's destination. */
const CONTAINERS = Object.freeze({
  list: BLACK_DESTINATION.LIST,
  array: BLACK_DESTINATION.ARRAY,
  set: BLACK_DESTINATION.SET,
  map: BLACK_DESTINATION.DICT
});

/**
 * A declared type as Carbon's member type gives it: VARTYPE, sign, float count,
 * and for an IROOT member what it holds. A type with no VARTYPE gives INVALID,
 * so reading it gives Carbon's "Invalid attribute type".
 *
 * @param {object|string|Function|undefined} declared The member's declared type.
 * @returns {{type: number, signed: boolean, floatArraySize: number, destination: number, wrapperClass: (string|null), structClass: (string|Function|null)}} The member type.
 */
export function declaredMemberType(declared)
{
  let type = declared;
  if (typeof type === "function") type = { kind: "rootRef", className: type };
  if (typeof type === "string") type = { kind: type };
  const result = { type: VARTYPE.INVALID, signed: false, floatArraySize: 0, destination: BLACK_DESTINATION.OBJECT, wrapperClass: null, structClass: null };
  if (!type || type.runtimeOnly === true) return result;

  // type.binary is Carbon's BINARYBLOCK, whatever value the member holds.
  if (type.binary === true)
  {
    result.type = VARTYPE.BINARYBLOCK;
    return result;
  }
  // type.mat4.wrapped("TriMatrix") etc.: an embedded Blue math wrapper read into the declared value.
  if (type.wrapped)
  {
    result.type = VARTYPE.IROOT;
    result.destination = BLACK_DESTINATION.WRAPPER;
    result.wrapperClass = type.wrapped;
    return result;
  }

  const kind = type.kind;
  if (Object.hasOwn(SCALARS, kind))
  {
    [ result.type, result.signed, result.floatArraySize ] = SCALARS[kind];
    return result;
  }
  if (kind === "rootRef") result.type = VARTYPE.IROOTPTR;
  else if (kind === "rootWeak") result.type = VARTYPE.IROOTWEAKREF;
  else if (kind === "root") result.type = VARTYPE.IROOT;
  else if (kind === "structList")
  {
    result.type = VARTYPE.IROOT;
    result.destination = BLACK_DESTINATION.STRUCTURELIST;
    result.structClass = type.className;
  }
  else if (Object.hasOwn(CONTAINERS, kind))
  {
    // A list, array, set or dict holds object references only.
    let itemType = kind === "map" ? type.valueType : type.itemType;
    // A string item names a class, except `unknown` (`type.array("unknown")`), which has no VARTYPE.
    if (typeof itemType === "function" || (typeof itemType === "string" && itemType !== "unknown")) itemType = { kind: "rootRef" };
    if (itemType?.kind === "rootRef" || itemType?.kind === "rootWeak")
    {
      result.type = VARTYPE.IROOT;
      result.destination = CONTAINERS[kind];
    }
  }
  return result;
}

/**
 * The nearest superclass with a registered name, where a class's own rows end.
 *
 * @param {Function} Constructor The class.
 * @returns {Function|null} The parent class, or null.
 */
function registeredParent(Constructor)
{
  for (let type = Object.getPrototypeOf(Constructor); type && type !== Function.prototype; type = Object.getPrototypeOf(type))
  {
    if (Schema.getClassName(type)) return type;
  }
  return null;
}

/**
 * The accessor descriptor for a key, wherever it is on the prototype chain.
 *
 * @param {object} prototype The class prototype.
 * @param {string} key The property key.
 * @returns {PropertyDescriptor|null} The descriptor, or null.
 */
function findDescriptor(prototype, key)
{
  for (let target = prototype; target; target = Object.getPrototypeOf(target))
  {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor) return descriptor;
  }
  return null;
}

/**
 * One exposed member or property row as a `VarEntry`, with the flags its exposure macro wrote.
 *
 * @param {Function} Constructor The class, for the property's accessors.
 * @param {object} member The schema's member or property record.
 * @returns {VarEntry} The row.
 */
function varEntryOf(Constructor, member)
{
  const entry = new VarEntry();
  const type = member.type;
  const reference = type && (type.kind === "rootRef" || type.kind === "rootWeak") ? type.className : null;
  entry.name = member.name;
  entry.meta.key = member.key ?? member.name;
  const declared = declaredMemberType(type);
  entry.type = declared.type;
  // Ours, beside Carbon's: what the readers need that a JavaScript property cannot say.
  entry.index = member.index ?? -1;
  entry.signed = declared.signed;
  entry.floatArraySize = declared.floatArraySize;
  entry.destination = declared.destination;
  entry.keepsNulls = type?.kind === "array";
  entry.wrapperClass = declared.wrapperClass;
  entry.wrapperKind = declared.wrapperClass ? type.kind : null;
  entry.accepts = declared.type === VARTYPE.INVALID ? [] : type?.accepts ?? (type?.className ? [ type.className ] : []);
  entry.structClass = declared.structClass;
  entry.iid = typeof reference === "function" ? Schema.getClassName(reference) : reference || null;
  entry.description = member.jessica && member.jessica.description ? member.jessica.description : "";
  // Blue's stamp comes only from Carbon's exposure (`be`, which names its macro); ours (`meta.mapAttribute`, no macro) is
  // in the table but not Blue's (operator, 2026-11-10).
  entry.meta.blue = Boolean(member.exposure) && typeof member.exposure.macro === "string";
  entry.editFlags = getEditFlags(member);
  // A chooser names its enum, which may register after the class: the row resolves it on first read.
  const chooser = member.exposure ? (member.exposure.chooser ? member.chooser : null) : member.chooser ?? null;
  if (chooser) entry.setChooserSource(chooser.entries ?? null, chooser.enumType ?? null, true);
  else if (!member.exposure && member.enum?.enumType?.includes(".")) entry.setChooserSource(null, member.enum.enumType, false);
  if (member.role === "property" || member.property)
  {
    const descriptor = findDescriptor(Constructor.prototype, entry.meta.key);
    entry.getProperty = descriptor?.get ?? null;
    entry.setProperty = descriptor?.set ?? null;
  }
  return entry;
}

/** The classes whose ClassInfo chains to each class's, so a recompile reaches them. */
const CHAINED_FROM = new WeakMap();

/**
 * Compiles a class into its ClassInfo, or recompiles it into the one it already has.
 *
 * The class's own rows are what it declares, and what unregistered helper classes
 * between it and its nearest registered JS ancestor declare. `parentClassInfo`
 * follows `EXPOSURE_CHAINTO`, never `extends`, as Carbon's does; the method table
 * walks the same chain, as PyGetTypeInfo does.
 *
 * @param {Function} Constructor The class.
 * @returns {ClassInfo} Its information, stored for `ClassInfo.exposeToBlue`.
 */
export function compileClassInfo(Constructor)
{
  registerGraphLifetime(Constructor);
  const schema = Schema.getDeclaredSchema(Constructor);
  const ci = classInfoOf(Constructor);
  COMPILED.add(Constructor);
  const previousParent = ci.parentClassInfo?.ctor ?? null;

  ci.classId = schema.className;
  ci.iid = schema.className;
  ci.blue = schema.blue === true;
  ci.interfaceTable = [];
  ci.memberTable = [];
  ci.pyMethodTable = [];
  ci.hiddenInherited = new Set();
  ci._declarations = new Map();
  ci._entries = null;
  ci.rtti = null;

  for (const Interface of ownMappedInterfaces(Constructor)) ci.interfaceTable.push(Schema.getClassName(Interface));
  // EXPOSURE_BEGIN_IMP puts IRoot first (BlueExposureMacrosPython.h:31). Compose inserts it once IRoot registers,
  // which a class defined before IRoot (the schema's own) precedes, so the table names it.
  if (ci.interfaceTable.length && ci.interfaceTable[0] !== "IRoot") ci.interfaceTable.unshift("IRoot");

  const Chained = exposureChainTo(Constructor);
  ci.parentClassInfo = Chained ? ClassInfo.exposeToBlue(Chained) : null;
  if (previousParent && previousParent !== Chained) CHAINED_FROM.get(previousParent)?.delete(Constructor);
  if (Chained) (CHAINED_FROM.get(Chained) ?? CHAINED_FROM.set(Chained, new Set()).get(Chained)).add(Constructor);
  for (let parent = ci.parentClassInfo; parent; parent = parent.parentClassInfo)
  {
    for (const entry of parent.memberTable) if (Schema.isFieldHidden(Constructor, entry.meta.key)) ci.hiddenInherited.add(entry.meta.key);
  }

  const Parent = registeredParent(Constructor);
  const own = new Set();
  for (let type = Constructor; type && type !== Parent; type = Object.getPrototypeOf(type)) own.add(type);
  // Carbon's member-table order where the class declares an exposure bag (CjsSchema.orderByExposureRows).
  // Only exposed members enter the table, as only Carbon's MAP_* macros fill mMemberTable (BlueExposureMacros.h:149-155):
  // Carbon's exposure (`be`) and ours (`meta.mapAttribute`). A typed or edit-flagged field without exposure is private and
  // stays out (operator, 2026-11-10).
  const declared = [ ...schema.members, ...schema.properties ];

  // Edit flags are what an exposure macro writes; on a stored member with no exposure they would be dropped silently. A
  // property's flags are read from its accessors (CjsSchema), not declared, so only members are checked.
  for (const member of schema.members)
  {
    if (!member.exposure && own.has(member.declaringClass) && (getDeclaredEditFlags(member) & (EDITFLAGS.MODMASK | EDITFLAGS.SERMASK)) !== 0)
    {
      throw new Error(`${Schema.getClassName(Constructor)}.${member.name}: edit flags without exposure: use be.mapAttribute or meta.mapAttribute`);
    }
  }

  const rows = Schema.orderByExposureRows(Constructor, declared.filter(member => member.exposure));
  for (const member of rows)
  {
    if (!own.has(member.declaringClass)) continue;
    // Two rows under one name are both kept, as both are in Carbon's table.
    const row = varEntryOf(Constructor, member);
    ci.memberTable.push(row);
    ci._declarations.set(row, member);
  }

  // mPyMethodTable holds the class's methods and its parents' along the exposure chain. Only a method with an
  // exposure record (a `map*` row) is in it.
  const methodNames = new Set();
  for (let type = Constructor; type; type = exposureChainTo(type))
  {
    for (const method of Schema.getDeclaredSchema(type).methods || [])
    {
      if (!method.exposure) continue;
      const blue = typeof method.exposure.macro === "string";
      for (const name of [ method.exposure.name ?? method.name, ...(method.exposure.aliases ?? []).map(alias => alias.name ?? method.name) ])
      {
        if (methodNames.has(name)) continue;
        methodNames.add(name);
        ci.pyMethodTable.push({ name, key: method.name, blue });
      }
    }
  }

  // The classes chaining to this one see its new rows through parentClassInfo; their own derived state
  // (hidden keys, method tables, persisted members) is rebuilt.
  for (const Child of CHAINED_FROM.get(Constructor) ?? []) if (ClassInfo._byType.get(Child)?.exposed) compileClassInfo(Child);
  return ci;
}

/**
 * Supplies own teardown facts at class registration, independently of graph value registration:
 * the base list, the class's own _Destructor and its declared capabilities. OnDestruct is found by
 * ordinary dispatch. A class with nothing to end gets no record: one that declares no capability,
 * has no _Destructor of its own, and has no base with a record. A class Blue knows only by its
 * JavaScript parent (no definition, no declared base list) keeps the record it gave the graph itself.
 * @cjs Constructor identities carry native base lists without loading readers or compiling values.
 * @param {Function} Constructor The class being compiled.
 * @param {Set<Function>} [visited] Current ancestry, including repeated/multiple bases.
 * @returns {void}
 */
function registerGraphLifetime(Constructor, visited = new Set())
{
  if (visited.has(Constructor)) return;
  visited.add(Constructor);
  const parent = Object.getPrototypeOf(Constructor);
  const bases = parent === Function.prototype || parent === Object || parent === null
    ? baseList(Constructor) : [ parent, ...baseList(Constructor) ];
  for (const base of bases) registerGraphLifetime(base, visited);
  const name = Schema.getClassName(Constructor);
  if (!Object.hasOwn(Constructor, CJS_CLASS_NAME) && !baseList(Constructor).length && CjsGraph.hasLifetime(Constructor)) return;
  const destructor = Object.getOwnPropertyDescriptor(Constructor.prototype, "_Destructor");
  const capabilities = CjsGraph.checkCapabilities(Schema.getCapabilities(Constructor), name);
  if (!destructor && !capabilities.length && !CjsGraph.hasLifetime(Constructor) && !bases.some(base => CjsGraph.hasLifetime(base))) return;
  CjsGraph.defineLifetime(Constructor, { name, bases, destructor: destructor ? destructor.value : null, capabilities });
}

/**
 * Whether a class provides an interface, by registered name: mapped along its exposure, or a base.
 *
 * @param {Set<Function>} mapped The class's mapped interfaces.
 * @param {Function} Constructor The class.
 * @param {string} Interface The interface's registered name.
 * @returns {boolean} True when it provides it.
 */
function provides(mapped, Constructor, Interface)
{
  for (const each of mapped) if (Schema.getClassName(each) === Interface) return true;
  for (let type = Constructor; type && type !== Function.prototype; type = Object.getPrototypeOf(type))
  {
    if (Schema.getClassName(type) === Interface) return true;
  }
  return false;
}

/**
 * Fills what the readers ask a class for: its persisted members by name, walked as Carbon's
 * `IRootReaderBase::FindEntry` does (IRootReader.cpp:303-319) - the class's
 * table, then each parent's, a row with PERSIST, first name wins - and the
 * interfaces they ask about. A row its class hides with `hideInherited` is left
 * out, as `BlueRttiType` does. Ours also reads a member Carbon exposes READ that
 * our values path persists (non-carbon-extensions.md).
 *
 * @param {ClassInfo} ci The class information.
 * @returns {void}
 */
export function buildReaderEntries(ci)
{
  const entries = new Map();
  for (let type = ci; type; type = type.parentClassInfo)
  {
    for (const row of type.memberTable)
    {
      if (entries.has(row.name)) continue;
      if (type !== ci && ci.hiddenInherited.has(row.meta.key)) continue;
      const declaration = type.declarationOf(row);
      if (!(row.editFlags & EDITFLAGS.PERSIST) && declaration.edit?.persist !== true && declaration.edit?.persistOnly !== true) continue;
      entries.set(row.name, row);
    }
  }
  const Constructor = ci.ctor, mapped = mappedInterfaces(Constructor);
  // By registered name: the interface classes extend IRoot, which the base must not import.
  ci._isInitialize = provides(mapped, Constructor, "IInitialize");
  ci._isNotify = provides(mapped, Constructor, "INotify");
  ci._isProxy = provides(mapped, Constructor, "IBlueObjectProxy");
  ci._isCustomPersist = provides(mapped, Constructor, "ICustomPersist");
  ci._entries = entries;
}

/**
 * A structure list's layout: the item class's `meta.struct` record, each field as
 * an entry the handlers read as a member.
 *
 * @param {string|Function} itemClass The item class, or its registered name.
 * @returns {{size: number, boundaries: number[], Item: Function, fields: object[], definition: object}} The layout.
 * @throws {TypeError} When the item class is unregistered or declares no structure.
 */
export function structureLayout(itemClass)
{
  const Item = typeof itemClass === "function" ? itemClass : Schema.getConstructor(itemClass);
  if (!Item) throw new TypeError(`Black struct item class ${itemClass} is not registered (import its package)`);
  const definition = Schema.getSchema(Item).structureDefinition;
  if (!definition) throw new TypeError(`Black struct ${Schema.getClassName(Item)} has no structureDefinition`);
  const declarations = new Map();
  for (const member of Schema.getSchema(Item).members)
  {
    if (member.role === "member" && !declarations.has(member.name)) declarations.set(member.name, member);
  }
  const fields = definition.members.map(field =>
  {
    const declaration = declarations.get(field.name);
    const type = declaredMemberType({ kind: field.type });
    return {
      name: field.name, key: declaration.key, index: declaration.index ?? -1, type: type.type, notify: false, isProperty: false,
      signed: type.signed, floatArraySize: type.floatArraySize, iids: [], destination: type.destination, keepsNulls: false,
      wrapperClass: null, wrapperKind: null, structure: null, offset: field.offset
    };
  });
  return { size: definition.size, boundaries: definition.boundaries ?? [], Item, fields, definition };
}

/**
 * An enum's chooser entries, by registered name: what the schema's export adds
 * to an enum or chooser declaration (CjsSchema enrichEnumRecord, enrichChooserField).
 *
 * @param {string} enumType The enum's registered name.
 * @param {boolean} required Whether a missing chooser is an error, as for a `chooser` declaration.
 * @returns {object[]|null} The entries, or null.
 * @throws {TypeError} When a required chooser is not registered.
 */
function blueEnumChooser(enumType, required)
{
  const info = blueEnums.GetEnumInfo(enumType);
  if (info.chooser === undefined)
  {
    if (required) throw new TypeError(`Enum ${enumType} registers no chooser.`);
    return null;
  }
  return info.chooser;
}

/**
 * A class's ClassInfo object, created empty and stored if it has none yet. The
 * registration carries it before the class's schema is sealed; the compile fills it.
 *
 * @param {Function} Constructor The class.
 * @returns {ClassInfo} Its one ClassInfo.
 */
export function classInfoOf(Constructor)
{
  const ci = ClassInfo.of(Constructor);
  ci.exposed = true;
  return ci;
}

/**
 * Registers one class, Carbon's `ClassRegistration`, whose `mType` is the
 * class's ClassInfo (BlueTypes.h:409-419). The schema's define, `setConstructor`
 * and `BlueClasses._RegisterSingleClass` all register through here.
 *
 * @param {{name: string, type: Function, createFn?: Function, flags?: number, classInfo?: ClassInfo}} registration The entry.
 *   Without `classInfo`, the class's own is compiled now.
 * @returns {boolean} True when registered; a duplicate logs and returns false.
 */
export function registerClassInfo(registration)
{
  // registerClass rejects a non-constructor; compiling one first would fail on its missing prototype instead.
  const isConstructor = typeof registration.type === "function";
  const classInfo = registration.classInfo ?? (isConstructor ? ClassInfo.exposeToBlue(registration.type) : null);
  return registerClass({ ...registration, classInfo });
}

/**
 * Recompiles a class whose ClassInfo has been compiled, into the same object; nothing for one that has not.
 *
 * @param {Function} Constructor The class.
 */
export function recompileClassInfo(Constructor)
{
  if (COMPILED.has(Constructor)) compileClassInfo(Constructor);
}

/**
 * A decorator changed a class's bases, interfaces or chain: recompile it and
 * every compiled subclass, which may read its tables. Lifetime bases register
 * even for unexposed infrastructure; value ClassInfo still waits for define.
 *
 * @param {Function} Changed The class.
 */
function onExposureChanged(Changed)
{
  // Unexposed infrastructure can compose native bases without ever defining a Blue class.
  registerGraphLifetime(Changed);
  for (const Constructor of COMPILED)
  {
    for (let type = Constructor; type && type !== Function.prototype; type = Object.getPrototypeOf(type))
    {
      if (type !== Changed) continue;
      compileClassInfo(Constructor);
      break;
    }
  }
}

/**
 * Connects the base records and compose to this compile. CjsSchema calls it
 * once, at load, before it defines any class.
 *
 * @param {typeof import("./CjsSchema.js").CjsSchema} schema The schema.
 */
export function installClassInfoCompile(schema)
{
  Schema = schema;
  setExposureChangeListener(onExposureChanged);
  ClassInfo.compiler = compileClassInfo;
  ClassInfo.entriesBuilder = buildReaderEntries;
  VarEntry.chooserResolver = blueEnumChooser;
  VarEntry.classResolver = name => Schema.getConstructor(name);
  VarEntry.structureResolver = structureLayout;
}
