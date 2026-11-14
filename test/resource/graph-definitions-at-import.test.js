import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsGraph } from "../../npm/dist/global/model/graph/index.js";
import { getClassRegistrations } from "../../npm/dist/blue/exposure/classes/registry.js";
import { IRootReaderBase } from "../../npm/dist/blue/format/IRootReaderBase.js";
import { ImportAllDistModules } from "../support/allDistClasses.js";

await ImportAllDistModules();

// Nothing here defines a class: only the definitions the modules made themselves exist, as in an application.
test("a class defined when its module loads has every row its exposure chain gives the readers", () =>
{
  const differences = [];
  let defined = 0;

  for (const { name, type } of getClassRegistrations())
  {
    if (!CjsGraph.isDefined(type)) continue;
    defined++;

    // A definition lists its class's own rows; a chain parent the graph has no definition for adds none.
    const names = CjsGraph.getClassInfo(type).compiled.memberNames;
    const want = IRootReaderBase.getDictionaryDeclarations(type).fields.map(field => field.name);
    if (names.join() !== want.join()) differences.push(`${name}: ${names.join()} / ${want.join()}`);
  }

  assert.ok(defined >= 10, `defined ${defined}`);
  assert.deepEqual(differences, []);
});
