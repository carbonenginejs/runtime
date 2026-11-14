import assert from "node:assert/strict";
import { test } from "node:test";
import { VARTYPE } from "../../npm/dist/global/model/graph/index.js";
import { blue } from "../../npm/dist/blue/index.js";
import { CjsBlueGraph } from "../../npm/dist/blue/formats/graph/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/index.js";
import { getClassRegistrations } from "../../npm/dist/blue/exposure/classes/registry.js";
import { ImportAllDistModules } from "../support/allDistClasses.js";

await ImportAllDistModules();
CjsBlueGraph.register(blue.classes);

// What the readers read: each class's ClassInfo record (ClassInfoMeta, of VarEntry rows).
const { ClassInfo } = await import("../../npm/dist/blue/base/ClassInfo.js");
const { BLACK_DESTINATION } = await import("../../npm/dist/blue/base/VarEntry.js");

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

/** What the compiled definition says, for the same comparison. */
function compiled(member)
{
  const object = member.edgeKind === "embed" && member.collection === null;

  return {
    vartype: member.vartype,
    length: member.vartype === VARTYPE.FLOATARRAY ? member.length : 0,
    wrapper: member.wrapped === null ? null : member.wrapped.wireClass,
    destination: object ? null : member.collection === "array" || member.collection === "set" ? member.collection : member.destination
  };
}

test("every persisted member compiles to what the readers' ClassInfo record says it is", () =>
{
  const differences = [];
  let compared = 0;

  for (const { name, type } of getClassRegistrations())
  {
    const entries = ClassInfo.exposeToBlue(type).meta.entries;
    const members = CjsGraph.getClassInfo(type).compiled.persistByName;

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
