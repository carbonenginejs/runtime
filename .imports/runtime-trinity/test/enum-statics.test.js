// Enum drift check: every @type.enum("X") field must resolve its member map
// through the owning class's PascalCase static `Constructor.X` (own or
// inherited). Known deferred gaps are allowlisted below; growing that list is
// a regression, shrinking it should update the list.
import test from "node:test";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import * as trinity from "../npm/dist/index.js";

// All @type.enum fields now resolve a class-static member map: trinity-owned
// enums inline, global graphics/device/render-context vocabulary aliased from
// @carbonenginejs/runtime-utils. The allowlist is intentionally empty.
const KNOWN_GAPS = new Set([]);

test("every @type.enum field resolves a class-static member map or is a known gap", () =>
{
  const seen = new Set();
  const gaps = [];
  let enumFields = 0;
  for (const name of Object.keys(trinity))
  {
    const Ctor = trinity[name];
    if (typeof Ctor !== "function" || !Ctor.prototype || seen.has(Ctor)) continue;
    seen.add(Ctor);
    let instance = null;
    try
    {
      instance = new Ctor();
    }
    catch
    {
      continue;
    }
    void instance;
    const schema = CjsSchema.getSchema(Ctor);
    for (const field of schema?.fields ?? [])
    {
      const enumType = field?.enum?.enumType;
      if (!enumType) continue;
      enumFields++;
      const members = Ctor[enumType];
      if (!members || typeof members !== "object")
      {
        gaps.push(`${name}.${field.name} -> ${enumType}`);
      }
    }
  }

  const unexpected = gaps.filter(gap => !KNOWN_GAPS.has(gap));
  const resolvedFromAllowlist = [...KNOWN_GAPS].filter(gap => !gaps.includes(gap));
  if (unexpected.length)
  {
    throw new Error(`new enum static gaps:\n${unexpected.join("\n")}`);
  }
  if (resolvedFromAllowlist.length)
  {
    throw new Error(`allowlisted gaps now resolve; remove them:\n${resolvedFromAllowlist.join("\n")}`);
  }
  if (enumFields < 200)
  {
    throw new Error(`enum field sweep looks broken: only ${enumFields} enum fields seen`);
  }
});

// docs/standards/enum-placement.md "Never both": a vocabulary has exactly one
// home. Two frozen objects carrying the same members under the same name can
// drift apart, and a consumer comparing one against the other still passes
// today - which is what makes the drift silent. Aliasing (`static X = X`) keeps
// the class-scoped identity without minting a second object.
test("no enum type name resolves to two distinct objects with the same members", () =>
{
  const homes = new Map();   // typeName -> [{ object, where }]

  const record = (typeName, object, where) =>
  {
    if (!object || typeof object !== "object") return;
    const list = homes.get(typeName) ?? [];
    if (!list.some(entry => entry.object === object)) list.push({ object, where });
    homes.set(typeName, list);
  };

  for (const name of Object.keys(trinity))
  {
    const value = trinity[name];
    if (typeof value === "function" && value.prototype)
    {
      // Own statics only: an inherited one is the same object by definition.
      for (const key of Object.getOwnPropertyNames(value))
      {
        if (!/^[A-Z]/.test(key)) continue;
        const members = value[key];
        if (!members || typeof members !== "object" || Array.isArray(members)) continue;
        if (!Object.values(members).every(member => typeof member === "number")) continue;
        record(key, members, `${name}.${key}`);
      }
      continue;
    }
    // A bare enum object re-exported by a barrel.
    if (value && typeof value === "object" && !Array.isArray(value)
      && Object.keys(value).length
      && Object.values(value).every(member => typeof member === "number"))
    {
      record(name, value, `export ${name}`);
    }
  }

  const duplicates = [];
  for (const [ typeName, list ] of homes)
  {
    for (let i = 0; i < list.length; i++)
    {
      for (let j = i + 1; j < list.length; j++)
      {
        if (JSON.stringify(list[i].object) !== JSON.stringify(list[j].object)) continue;
        duplicates.push(`${typeName}: ${list[i].where} and ${list[j].where} are equal but distinct objects`);
      }
    }
  }

  if (duplicates.length)
  {
    throw new Error(`duplicate enum identities (${duplicates.length}):\n${duplicates.join("\n")}`);
  }
});
