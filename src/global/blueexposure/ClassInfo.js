// Source: blueexposure/include/BlueTypes.h:378-400 (Be::ClassInfo)
// Source: blueexposure/include/BlueExposureMacrosPython.h:20-67 (ExposeToBlue, EXPOSURE_BEGIN_IMP, EXPOSURE_END_IMPL)
import { CjsSchema } from "#schema";
import { getCarbonTypeDefinition } from "../schema/types/carbonTypes.js";
import { ownMappedInterfaces, exposureChainTo } from "../compose/interface.js";
import { VarEntry } from "./VarEntry.js";

/** Be::EDITFLAGS bits (BlueTypes.h:288-303), keyed by the schema's edit flag names. */
const EDIT_FLAG_BITS = [
  [ "read", 0x001 ], [ "write", 0x002 ], [ "notify", 0x004 ], [ "hidden", 0x008 ],
  [ "persist", 0x010 ], [ "rpersist", 0x020 ]
];

/** Be::FLAGS and Be::ENUM (BlueTypes.h:299-300). */
const EDIT_FLAGS = 0x100;
const EDIT_ENUM = 0x200;

/** @type {WeakMap<Function, {schema: object, classInfo: ClassInfo}>} */
const s_classInfo = new WeakMap();

/**
 * A class's Blue type information: Carbon's `Be::ClassInfo`, which a class's
 * `ExposeToBlue()` builds once from its exposure macros and keeps
 * (`EXPOSURE_BEGIN_IMP`, BlueExposureMacrosPython.h:23-24). Here the macros
 * are the class's `be`/`meta` decorators, so `ClassInfo.exposeToBlue(Class)`
 * reads their metadata and builds the record once. The flattened lookup is
 * `BlueRttiType`, which `BlueClasses.GetRtti` builds from it on demand.
 *
 * This sits beside the schema's own class record (`CjsSchema.getSchema`) and
 * reads it; tests compare the two for every registered class
 * (decorator-upgrade.md § 5 step 2).
 *
 * Carbon: Be::ClassInfo (blueexposure/include/BlueTypes.h:378-400)
 *
 * @adapted built once from the class's decorator metadata, which stands in for Carbon's exposure macros; `parentClassInfo` follows the registered JS superclass (see `exposeToBlue`).
 */
export class ClassInfo
{

  /**
   * Ours: the registered name, which minification cannot change.
   *
   * @cjs
   * @implemented
   */
  static className = "ClassInfo";

  /**
   * `mClassId`: the registered class name (a class id is its name, see CjsBlueClasses).
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
   * `mParentClassInfo`: the parent's class info, or null.
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
   * `ExposeToBlue()` (BlueExposureMacrosPython.h:20-67): the class's
   * information, built on the first call and returned from then on.
   *
   * `parentClassInfo` follows the nearest registered JavaScript superclass,
   * not `EXPOSURE_CHAINTO`: our metadata inherits members along `extends`, and
   * 769 of 1459 registered classes declare no chain while their superclass
   * does have members (measured 2026-11-01). QueryInterface still walks the
   * exposure chain (`mappedInterfaces`).
   *
   * @adapted our decorators stand in for the macros. Carbon generates one
   *   `ExposeToBlue` per class from its macros; JavaScript has one static that
   *   takes the class and reads its decorator metadata.
   *   The record is rebuilt only when that metadata has changed since (the
   *   schema hands out a new record then), which happens while classes are
   *   still being declared and in tests.
   * @param {Function} Constructor A class with registered metadata.
   * @returns {ClassInfo} Its class information.
   */
  static exposeToBlue(Constructor)
  {
    const schema = CjsSchema.getSchema(Constructor);
    const cached = s_classInfo.get(Constructor);
    if (cached && cached.schema === schema) return cached.classInfo;

    const ci = new ClassInfo();
    ci.classId = schema.className;
    ci.iid = schema.className;
    ci.blue = schema.blue === true;
    for (const Interface of ownMappedInterfaces(Constructor)) ci.interfaceTable.push(CjsSchema.getClassName(Interface));

    const Parent = ClassInfo._ParentClass(Constructor);
    ci.parentClassInfo = Parent ? ClassInfo.exposeToBlue(Parent) : null;
    for (let parent = ci.parentClassInfo; parent; parent = parent.parentClassInfo)
    {
      for (const entry of parent.memberTable) if (CjsSchema.isFieldHidden(Constructor, entry.key)) ci.hiddenInherited.add(entry.key);
    }

    // The class's own rows: those declared on it or on a superclass between it and its parent that has no class info of its own.
    const own = new Set();
    for (let type = Constructor; type && type !== Parent; type = Object.getPrototypeOf(type)) own.add(type);
    const seen = new Set();
    const rows = [ ...schema.members, ...schema.properties.filter(property => property.property || property.edit) ];
    for (let i = 0; i < rows.length; i++)
    {
      const member = rows[i];
      if (!own.has(member.declaringClass)) continue;
      // An older declaration under a name a complete row already gave adds nothing (PyGetTypeInfo skips it too); two
      // complete rows under one name are both kept, as both are in Carbon's table.
      if (seen.has(member.name) && !member.exposure) continue;
      if (member.exposure) seen.add(member.name);
      ci.memberTable.push(ClassInfo._VarEntryOf(Constructor, member));
    }

    // mPyMethodTable holds the class's methods and its parents' along the exposure chain, the walk PyGetTypeInfo makes
    // (CjsBlueClasses._typeInfo). Only a method with an exposure record (a `map*` row) is in it.
    const methodNames = new Set();
    for (let type = Constructor; type; type = exposureChainTo(type))
    {
      for (const method of CjsSchema.getSchema(type).methods || [])
      {
        if (!method.exposure) continue;
        const blue = method.exposure.origin !== "ours";
        for (const name of [ method.exposure.name ?? method.name, ...(method.exposure.aliases ?? []).map(alias => alias.name ?? method.name) ])
        {
          if (methodNames.has(name)) continue;
          methodNames.add(name);
          ci.pyMethodTable.push({ name, key: method.name, blue });
        }
      }
    }

    s_classInfo.set(Constructor, { schema, classInfo: ci });
    return ci;
  }

  /**
   * The nearest superclass with a registered name, standing in for
   * `mParentClassInfo` (see `exposeToBlue`). Ours.
   *
   * @cjs
   * @implemented
   * @param {Function} Constructor The class.
   * @returns {Function|null} The parent class, or null.
   */
  static _ParentClass(Constructor)
  {
    for (let type = Object.getPrototypeOf(Constructor); type && type !== Function.prototype; type = Object.getPrototypeOf(type))
    {
      if (CjsSchema.getClassName(type)) return type;
    }
    return null;
  }

  /**
   * One member or property row as a `VarEntry`. The flags are the row's own
   * when it carries an exposure record; an older declaration without one has
   * its editor bits derived from its edit flags, `type.flags` and enum, as
   * PyGetTypeInfo reports them (CjsBlueClasses._typeInfo). Ours: Carbon's
   * macros write each `VarEntry` directly.
   *
   * @cjs
   * @implemented
   * @param {Function} Constructor The class, for the property's accessors.
   * @param {object} member The schema's member or property record.
   * @returns {VarEntry} The row.
   */
  static _VarEntryOf(Constructor, member)
  {
    const entry = new VarEntry();
    const type = member.type;
    const reference = type && (type.kind === "rootRef" || type.kind === "rootWeak") ? type.className : null;
    entry.name = member.name;
    entry.key = member.key ?? member.name;
    entry.type = getCarbonTypeDefinition(type).kind;
    entry.iid = typeof reference === "function" ? CjsSchema.getClassName(reference) : reference || null;
    entry.description = member.jessica && member.jessica.description ? member.jessica.description : "";
    // An older declaration without an exposure record is in Blue's view, as PyGetTypeInfo lists it today.
    entry.blue = !member.exposure || member.exposure.origin !== "ours";
    if (member.exposure) entry.editFlags = member.exposure.flags;
    else
    {
      if (member.edit !== undefined) for (const [ flag, bit ] of EDIT_FLAG_BITS) if (member.edit[flag] === true) entry.editFlags |= bit;
      if (type?.flags === true) entry.editFlags |= EDIT_FLAGS;
      if (member.enum) entry.editFlags |= EDIT_ENUM;
    }
    const chooser = member.exposure
      ? member.exposure.chooser ? member.chooser.entries : null
      : member.chooser ? member.chooser.entries : member.enum && member.enum.chooser;
    entry.chooserTable = chooser ? chooser.map(item => [ item.name, item.value, item.description || "" ]) : null;
    if (member.role === "property" || member.property)
    {
      const descriptor = ClassInfo._FindDescriptor(Constructor.prototype, entry.key);
      entry.getProperty = descriptor?.get ?? null;
      entry.setProperty = descriptor?.set ?? null;
    }
    return entry;
  }

  /**
   * The accessor descriptor for a key, wherever it is on the prototype chain.
   * Ours: Carbon's macros take the getter and setter as arguments.
   *
   * @cjs
   * @implemented
   * @param {object} prototype The class prototype.
   * @param {string} key The property key.
   * @returns {PropertyDescriptor|null} The descriptor, or null.
   */
  static _FindDescriptor(prototype, key)
  {
    for (let target = prototype; target; target = Object.getPrototypeOf(target))
    {
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      if (descriptor) return descriptor;
    }
    return null;
  }

}

