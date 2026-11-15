import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsGraph } from "../../npm/dist/global/model/graph/index.js";
import { getClassRegistrations } from "../../npm/dist/blue/exposure/classes/registry.js";
import { IRootReaderBase } from "../../npm/dist/blue/format/IRootReaderBase.js";
import { CjsBlueGraph } from "../../npm/dist/blue/formats/graph/index.js";
import { ImportAllDistModules } from "../support/allDistClasses.js";

await ImportAllDistModules();

// Nothing here defines a class: only the definitions the modules made themselves exist, as in an application.
test("every registered class is defined when its module loads, with every row its exposure chain gives the readers", () =>
{
  const differences = [], missing = [];

  for (const { name, type } of getClassRegistrations())
  {
    if (!CjsGraph.isDefined(type)) { missing.push(name); continue; }

    // A definition lists its class's own rows; a chain parent the graph has no definition for adds none.
    const names = [ ...new Set(CjsGraph.getClassInfo(type).compiled.members.map(member => member.name)) ];
    const want = IRootReaderBase.getDictionaryDeclarations(type).fields.map(field => field.name);
    if (names.join() !== want.join()) differences.push(`${name}: ${names.join()} / ${want.join()}`);
  }

  assert.deepEqual(missing, []);
  assert.deepEqual(differences, []);
});

test("a class's definition made when it was declared is the one a second define makes after every module has loaded", () =>
{
  const differences = [];
  const describe = info => JSON.stringify({
    chainTo: info.declared.chainTo, bases: info.declared.bases, interfaces: info.declared.interfaces,
    members: info.declared.members.map(row => [ row.name, row.key, row.index, row.type, row.length, row.handler?.constructor.className ?? null, row.flags, row.edgeKind, row.edgeType, row.collection ])
  });

  for (const { name, type } of getClassRegistrations())
  {
    const declared = describe(CjsGraph.getClassInfo(type));
    const again = describe(CjsBlueGraph.define(type, name));
    if (declared !== again) differences.push(`${name}: ${declared} / ${again}`);
  }

  assert.deepEqual(differences.slice(0, 5), []);
});
