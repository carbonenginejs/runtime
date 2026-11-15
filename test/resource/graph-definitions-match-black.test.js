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
const { CjsSchema } = await import("../../npm/dist/blue/schema/CjsSchema.js");
const { compileClassInfo, declaredMemberType, declaredTypes } = await import("../../npm/dist/blue/schema/compileClassInfo.js");
const { IRootReaderBase } = await import("../../npm/dist/blue/format/IRootReaderBase.js");

/**
 * What the schema's compile writes on a row from its member's declared type, which the graph's compile then writes
 * over: the nearest class's exposed declaration under the row's name, key and index.
 */
function declaredOf(type, row)
{
  const schema = CjsSchema.getSchema(type);
  const matches = [ ...schema.members, ...schema.properties ].filter(member => member.exposure && member.name === row.name &&
    (member.key ?? member.name) === row.key && (member.index ?? -1) === row.index);
  const nearest = matches.find(member => !matches.some(other => other !== member && member.declaringClass.isPrototypeOf(other.declaringClass)));
  if (nearest === undefined) return null;
  const declared = declaredMemberType(nearest.type);
  const holdsObjects = declared.type === VARTYPE.IROOT || declared.type === VARTYPE.IROOTPTR || declared.type === VARTYPE.IROOTWEAKREF;
  return { collection: declared.collection, edgeType: holdsObjects ? declaredTypes(nearest.type) : [] };
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
    const names = [ ...new Set(info.compiled.members.map(member => member.name)) ];
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

    for (const member of new Set(info.compiled.members.map(row => row.name)))
    {
      const candidates = info.compiled.members.filter(row => row.name === member);
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

// The graph's compile runs after the schema's on every compile, so the row holds the graph's value.
test("the graph's compile writes the storage and classes the schema's compile wrote on every persisted row", () =>
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

      const declared = declaredOf(type, entry);
      if (declared === null)
      {
        differences.push(`${name}.${member}: no exposed declaration`);
        continue;
      }
      compared++;
      const got = { collection: definition.collection, edgeType: definition.edgeType };
      if (JSON.stringify(declared) !== JSON.stringify(got)) differences.push(`${name}.${member}: ${JSON.stringify(declared)} / ${JSON.stringify(got)}`);
    }
  }

  assert.ok(compared > 4000, `compared ${compared}`);
  assert.deepEqual(differences.slice(0, 40), [], `${differences.length} of ${compared} differ`);
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
