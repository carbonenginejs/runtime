import assert from "node:assert/strict";
import { test } from "node:test";
import { GraphMemberFlags, GraphOperation, VARTYPE } from "../../npm/dist/global/model/graph/index.js";
import { EDITFLAGS } from "../../npm/dist/global/consts/blue.js";
import { blue } from "../../npm/dist/blue/index.js";
import { CjsBlueGraph } from "../../npm/dist/blue/formats/graph/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/index.js";
import { getClassRegistrations } from "../../npm/dist/blue/exposure/classes/registry.js";
import { ImportAllDistModules } from "../support/allDistClasses.js";

await ImportAllDistModules();
CjsBlueGraph.register(blue.classes);

// What the readers read: each class's ClassInfo record (its persisted VarEntry rows).
const { ClassInfo } = await import("../../npm/dist/global/model/graph/ClassInfo.js");
const { BLACK_DESTINATION } = await import("../../npm/dist/global/model/graph/VarEntry.js");
const { compileClassInfo } = await import("../../npm/dist/blue/schema/compileClassInfo.js");
const { IRootReaderBase } = await import("../../npm/dist/blue/format/IRootReaderBase.js");

const DESTINATIONS = BLACK_DESTINATION && {
  [BLACK_DESTINATION.LIST]: "list", [BLACK_DESTINATION.ARRAY]: "array", [BLACK_DESTINATION.SET]: "set",
  [BLACK_DESTINATION.DICT]: "dict", [BLACK_DESTINATION.STRUCTURELIST]: "structureList", [BLACK_DESTINATION.WRAPPER]: "wrapper"
};

/** What the readers' record says, in the compiled definition's terms. */
function expected(entry)
{
  return {
    vartype: entry.type,
    length: entry.floatArraySize,
    wrapper: entry.wrapperClass,
    destination: DESTINATIONS[entry.destination] ?? null
  };
}

/** Where a reader would put a graph-declared member's value, from the row's own facts. */
function destinationOf(member)
{
  if (member.wrapped !== null) return "wrapper";
  if (member.collection === "array" || member.collection === "set") return member.collection;
  if (member.edgeKind === null) return member.kind === "values" ? "list" : member.kind === "valuesMap" ? "dict" : null;
  if (member.collection === "map") return "dict";
  if (member.collection !== null) return member.edgeKind === "embed" ? "structureList" : "list";
  return null;
}

/** The row a reader finds under each name: the nearest class's that is persisted or runtime-only. */
function persisted(type)
{
  const byName = Object.create(null);
  for (const member of CjsGraph.getClassInfo(type).compiled.members)
  {
    if ((member.flags & (EDITFLAGS.PERSIST | GraphMemberFlags.RUNTIMEONLY)) !== 0 && !Object.hasOwn(byName, member.name)) byName[member.name] = member;
  }
  return byName;
}

/** What the compiled definition says, for the same comparison. */
function compiled(member)
{
  return {
    vartype: member.type,
    length: member.type === VARTYPE.FLOATARRAY ? member.length : 0,
    wrapper: member.wrapped === null ? null : member.wrapped.wireClass,
    destination: destinationOf(member)
  };
}

test("a persisted member the graph compiled is the readers' own row, not a copy", () =>
{
  const copies = [];
  let shared = 0;

  for (const { name, type } of getClassRegistrations())
  {
    const members = persisted(type);

    for (const [ member, entry ] of ClassInfo.exposeToBlue(type).entries)
    {
      if (members[member] === entry) shared++;
      else copies.push(`${name}.${member}`);
    }
  }

  assert.ok(shared > 4000, `shared ${shared}`);
  assert.deepEqual(copies.slice(0, 40), [], `${copies.length} are copies`);
});

test("a class defines its own rows only, and the chain walk gives the readers' flattened list", () =>
{
  const differences = [];
  let own = 0, inherited = 0;

  for (const { name, type } of getClassRegistrations())
  {
    const info = CjsGraph.getClassInfo(type);
    for (const row of info.declared.members)
    {
      if (row.owner === info) own++;
      else differences.push(`${name}.${row.name}: defined by ${name}, owned by ${row.owner.classId}`);
    }

    // Each name once, the nearest class first: what the readers' own selection gives, in its order.
    const names = info.compiled.memberNames;
    const want = IRootReaderBase.getDictionaryDeclarations(type).fields.map(field => field.name);
    inherited += names.length - new Set(info.declared.members.map(row => row.name)).size;
    if (names.join() !== want.join()) differences.push(`${name}: ${names.join()} / ${want.join()}`);
  }

  assert.ok(own > 4000, `own ${own}`);
  assert.ok(inherited > 1000, `inherited ${inherited}`);
  assert.deepEqual(differences.slice(0, 40), [], `${differences.length} differ`);
});

test("a name a class declares again is answered by its own row in every table, or by none", () =>
{
  // The readers take the nearest class's declaration and never fall back to the one it shadows. The
  // graph filters by flags before it resolves a name, so a shadowing row a table leaves out would
  // let the shadowed one through.
  const served = [];
  let shadowed = 0;
  const asks = [
    [ GraphOperation.GET, {} ], [ GraphOperation.GET, { persistOnly: true } ], [ GraphOperation.GET, { roundTrip: true } ],
    [ GraphOperation.GET, { persistOnly: true, roundTrip: true } ], [ GraphOperation.SET, {} ]
  ];

  for (const { name, type } of getClassRegistrations())
  {
    const info = CjsGraph.getClassInfo(type);

    for (const member of info.compiled.memberNames)
    {
      const candidates = info.compiled.byName[member];
      if (candidates.length < 2) continue;
      shadowed++;

      for (const [ operation, options ] of asks)
      {
        const row = CjsGraph._getMemberTable(info, operation, options).byName[member];
        if (row !== undefined && row !== candidates[0]) served.push(`${name}.${member}: ${JSON.stringify(options)} serves ${row.owner.classId}'s row`);
      }
    }
  }

  assert.ok(shadowed > 10, `shadowed ${shadowed}`);
  assert.deepEqual(served, []);
});

test("a recompile keeps every row, so the graph's definition still lists the readers' rows", () =>
{
  const swapped = [];
  let kept = 0;

  for (const { name, type } of getClassRegistrations())
  {
    const before = [ ...ClassInfo.exposeToBlue(type).memberTable ];
    const table = compileClassInfo(type).memberTable;

    if (table.length !== before.length) swapped.push(`${name}: ${before.length} rows became ${table.length}`);
    for (let i = 0; i < before.length; i++)
    {
      if (table[i] === before[i]) kept++;
      else swapped.push(`${name}.${before[i].name}`);
    }
  }

  for (const { name, type } of getClassRegistrations())
  {
    const members = persisted(type);
    for (const [ member, entry ] of ClassInfo.exposeToBlue(type).entries) if (members[member] !== entry) swapped.push(`${name}.${member}: the graph holds another row`);
  }

  assert.ok(kept > 4000, `kept ${kept}`);
  assert.deepEqual(swapped.slice(0, 40), []);
});

test("every persisted member compiles to what the readers' ClassInfo record says it is", () =>
{
  const differences = [];
  let compared = 0;

  for (const { name, type } of getClassRegistrations())
  {
    const entries = ClassInfo.exposeToBlue(type).entries;
    const members = persisted(type);

    for (const [ member, entry ] of entries)
    {

      const definition = members[member];
      if (!definition)
      {
        differences.push(`${name}.${member}: no compiled member`);
        continue;
      }

      // Our own character classes never reach Black, and their Maps of leaf values are not built.
      if (name.startsWith("CjsCharacter")) continue;

      compared++;
      const want = expected(entry), got = compiled(definition);
      if (JSON.stringify(want) !== JSON.stringify(got)) differences.push(`${name}.${member}: ${JSON.stringify(want)} / ${JSON.stringify(got)}`);
    }
  }

  assert.ok(compared > 4000, `compared ${compared}`);
  assert.deepEqual(differences.slice(0, 40), [], `${differences.length} of ${compared} differ`);
});
