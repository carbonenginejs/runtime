import assert from "node:assert/strict";
import { test } from "node:test";
import { ImportAllDistModules, ImportDist } from "../support/allDistClasses.js";

// Blue's class-info store (ClassInfo.exposeToBlue, BlueClasses.GetRtti) sits beside the schema's class record and is
// built from the same decorator metadata (decorator-upgrade.md § 5 step 2). For every registered class it must answer
// what the schema answers, and its Blue view must be what PyGetTypeInfo reports.

await ImportAllDistModules();
const { CjsSchema } = await ImportDist("global/schema/CjsSchema.js");
const { getClassRegistrations } = await ImportDist("global/blueexposure/classes/registry.js");
const { ClassInfo, CjsBlueClasses } = await ImportDist("global/blue/index.js");

const classes = new CjsBlueClasses();
const registrations = getClassRegistrations();

/** Be::HIDDEN (BlueTypes.h:292). */
const HIDDEN = 0x008;

test("the store is built once per class and its RTTI once per class info", () =>
{
  assert.ok(registrations.length > 1000, `expected the whole runtime registered, got ${registrations.length} classes`);
  for (const { type } of registrations)
  {
    const ci = ClassInfo.exposeToBlue(type);
    assert.equal(ClassInfo.exposeToBlue(type), ci);
    assert.equal(classes.GetRtti(ci), classes.GetRtti(ci));
  }
});

test("every schema row is found by its exposed name with its flags and key, and nothing else is", () =>
{
  const problems = [];
  for (const { name, type } of registrations)
  {
    const rtti = classes.GetRtti(ClassInfo.exposeToBlue(type));
    const schema = CjsSchema.getSchema(type);
    const byName = new Map();
    for (const row of [ ...schema.members, ...schema.properties.filter(property => property.property || property.edit) ])
    {
      const list = byName.get(row.name) ?? [];
      list.push(row);
      byName.set(row.name, list);
    }
    for (const [ rowName, list ] of byName)
    {
      // The row Carbon's RTTI takes for a name is its first that is not hidden.
      const value = rtti.FindAttribute(rowName);
      const row = list.find(entry => !(ClassInfo._VarEntryOf(type, entry).editFlags & HIDDEN));
      if (!row)
      {
        if (value) problems.push(`${name}.${rowName}: hidden, but found`);
        continue;
      }
      if (!value)
      {
        problems.push(`${name}.${rowName}: missing`);
        continue;
      }
      const flags = ClassInfo._VarEntryOf(type, row).editFlags;
      if (value.var.editFlags !== flags) problems.push(`${name}.${rowName}: flags ${value.var.editFlags}, schema ${flags}`);
      if (value.var.key !== (row.key ?? row.name)) problems.push(`${name}.${rowName}: key ${value.var.key}, schema ${row.key}`);
    }
    for (const varName of rtti.varMap.keys()) if (!byName.has(varName)) problems.push(`${name}.${varName}: not in the schema`);
  }
  assert.deepEqual(problems, []);
});

test("the Blue view is PyGetTypeInfo's members and methods", () =>
{
  const problems = [];
  for (const { name, type } of registrations)
  {
    const ci = ClassInfo.exposeToBlue(type);
    const [ , , members, methods ] = CjsBlueClasses._typeInfo(type, 0);
    const blueRows = new Map();
    const rowCount = new Map();
    for (let level = ci; level; level = level.parentClassInfo)
    {
      for (const entry of level.memberTable)
      {
        if (!entry.blue || (level !== ci && ci.hiddenInherited.has(entry.key))) continue;
        rowCount.set(entry.name, (rowCount.get(entry.name) ?? 0) + 1);
        if (!blueRows.has(entry.name)) blueRows.set(entry.name, entry);
      }
    }
    for (const [ memberName, info ] of Object.entries(members))
    {
      const entry = blueRows.get(memberName);
      if (!entry)
      {
        problems.push(`${name}.${memberName}: missing from the Blue view`);
        continue;
      }
      // PyGetTypeInfo keeps one row per name; where Carbon maps a name twice the flags of either may be reported.
      if (rowCount.get(memberName) === 1 && entry.editFlags !== info.editflags) problems.push(`${name}.${memberName}: flags ${entry.editFlags}, typeinfo ${info.editflags}`);
      if (entry.type !== info.type) problems.push(`${name}.${memberName}: type ${entry.type}, typeinfo ${info.type}`);
      if ((entry.iid ?? "") !== info.iid_name) problems.push(`${name}.${memberName}: iid ${entry.iid}, typeinfo ${info.iid_name}`);
      if (JSON.stringify(entry.chooserTable) !== JSON.stringify(info.choosers)) problems.push(`${name}.${memberName}: chooser differs`);
    }
    for (const memberName of blueRows.keys()) if (!(memberName in members)) problems.push(`${name}.${memberName}: not in typeinfo`);
    const blueMethods = new Set(ci.pyMethodTable.filter(method => method.blue).map(method => method.name));
    for (const methodName of Object.keys(methods)) if (!blueMethods.has(methodName)) problems.push(`${name}.${methodName}(): missing from the Blue view`);
    for (const methodName of blueMethods) if (!(methodName in methods)) problems.push(`${name}.${methodName}(): not in typeinfo`);
  }
  assert.deepEqual(problems, []);
});

test("our own map rows are in the store and left out of the Blue view", () =>
{
  const { meta, type: storage } = CjsSchema;
  class OwnStoreProbe
  {
    speed = 0;
  }
  CjsSchema.decorateField(OwnStoreProbe, "speed", meta.mapAttribute(meta.READWRITE | meta.PERSIST), storage.float32);
  meta.define("OwnStoreProbe")(OwnStoreProbe);
  const ci = ClassInfo.exposeToBlue(OwnStoreProbe);
  const value = classes.GetRtti(ci).FindAttribute("speed");
  assert.equal(value.type, "var");
  assert.equal(value.var.editFlags, 0x013);
  assert.equal(value.var.blue, false);
  assert.equal(ci.blue, false);
});
