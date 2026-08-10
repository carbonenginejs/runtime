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
