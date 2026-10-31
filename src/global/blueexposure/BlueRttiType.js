// Source: blueexposure/BlueClasses.cpp:72-231 (BlueRttiType)
// Source: blueexposure/include/IBlueRtti.h:14-35 (BlueRttiValue, IBlueRtti)

/**
 * A class's run-time type information: every exposed member and method under
 * its name, flattened once from the class and its parents so a lookup never
 * walks the class tree. Carbon's `BlueRttiType`, which `BlueClasses::GetRtti`
 * builds on first request and keeps on the `ClassInfo` (BlueClasses.cpp:586-593).
 *
 * A value is Carbon's `BlueRttiValue`: `{ type: "var" | "pyproperty", var }`
 * for a member, `{ type: "pymethod", method }` for a method.
 *
 * Adapted: Carbon's `mXtraOffset` and `mTotalOffset` locate a member's bytes
 * through each parent's offset; a JavaScript member is reached by its key on
 * the object, so neither is kept. Carbon's generic thunkers
 * (`RegisterThunker`) are not added: nothing registers one here.
 *
 * Carbon: BlueRttiType (blueexposure/BlueClasses.cpp:72-231)
 *
 * @adapted no member offsets are kept, and parent rows a class hides with `hideInherited` are left out (see `Init`).
 */
export class BlueRttiType
{

  /**
   * `mVarMap`: members and properties by name.
   *
   * @implemented
   */
  varMap = new Map();

  /**
   * `mFullMap`: members, properties and methods by name.
   *
   * @implemented
   */
  fullMap = new Map();

  /**
   * `BlueRttiType( const Be::ClassInfo* ci )` (BlueClasses.cpp:74-77).
   *
   * @param {import("./ClassInfo.js").ClassInfo} ci The class.
   */
  constructor(ci)
  {
    this.Init(ci);
  }

  /**
   * `Init( const Be::ClassInfo *ci )` (BlueClasses.cpp:82-187): collects the
   * class's members, then each parent's, then its methods, and inserts them
   * in that order without replacing a name already present, so a derived
   * class's entry wins. Hidden members are left out, as in Carbon.
   *
   * @adapted parent rows the class hides with `hideInherited` are left out
   *   too (ours, see ClassInfo), and no offsets are kept (see the class).
   * @param {import("./ClassInfo.js").ClassInfo} ci The class.
   */
  Init(ci)
  {
    const tmp = [];
    for (let type = ci; type; type = type.parentClassInfo)
    {
      const memberTable = type.memberTable;
      for (let i = 0; i < memberTable.length; i++)
      {
        const entry = memberTable[i];
        // Be::HIDDEN (BlueTypes.h:292).
        if (entry.editFlags & 0x008) continue;
        if (type !== ci && ci.hiddenInherited.has(entry.key)) continue;
        tmp.push([ entry.name, entry.getProperty ? { type: "pyproperty", var: entry } : { type: "var", var: entry } ]);
      }
    }
    // mPyMethodTable holds the class's methods and its parents' (BlueClasses.cpp:126-138).
    const methodTable = ci.pyMethodTable;
    for (let i = 0; i < methodTable.length; i++)
    {
      tmp.push([ methodTable[i].name, { type: "pymethod", method: methodTable[i] } ]);
    }
    for (let i = 0; i < tmp.length; i++)
    {
      const [ name, value ] = tmp[i];
      if (!this.fullMap.has(name)) this.fullMap.set(name, value);
      if (value.type !== "pymethod" && !this.varMap.has(name)) this.varMap.set(name, value);
    }
  }

  /**
   * `GetMethodsAsList()` (BlueClasses.cpp:191-207): the names of every method.
   *
   * @adapted Carbon builds a Python list under `BLUE_WITH_PYTHON`; JavaScript
   *   stands in for Python (decorator-upgrade.md § 00), so this is an array.
   * @returns {string[]} Method names.
   */
  GetMethodsAsList()
  {
    const list = [];
    for (const [ name, value ] of this.fullMap) if (value.type === "pymethod") list.push(name);
    return list;
  }

  /**
   * `FindAttribute( const char* name )` (BlueClasses.cpp:209-218).
   *
   * @implemented
   * @param {string} name Exposed name.
   * @returns {object|null} The member or property, or null.
   */
  FindAttribute(name)
  {
    return this.varMap.get(name) ?? null;
  }

  /**
   * `FindMethod( const char* name )` (BlueClasses.cpp:220-229): any entry, member or method.
   *
   * @implemented
   * @param {string} name Exposed name.
   * @returns {object|null} The entry, or null.
   */
  FindMethod(name)
  {
    return this.fullMap.get(name) ?? null;
  }

  /**
   * Ours: the registered name, which minification cannot change.
   *
   * @cjs
   * @implemented
   */
  static className = "BlueRttiType";

}

