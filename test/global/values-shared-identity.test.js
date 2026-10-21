import assert from "node:assert/strict";
import test from "node:test";

import { blue } from "../../npm/dist/global/blue/index.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import "../../npm/dist/trinity/index.js";
import "../../npm/dist/audio/index.js";
import { composeStubResMan } from "../support/stubResMan.js";

// GetValues keeps object identity by default: a shared object is written once
// with an _id and aliased as { _ref } after (YamlWriter's anchors), so a round
// trip through from() rebuilds one object, not copies. refs: false is the
// explicit flat copy. Until npm/dist is rebuilt with that default, these skip.
const distSkip = "BeginReadOnlyMember" in DictWriter.prototype ? false
  : "npm/dist predates the refs default; rebuild npm/dist to run the shared-identity tests";

const SERVER = process.env.CJS_TOOLS_SERVER ?? "http://127.0.0.1:5510";
const HANGAR = "mdeha01:deathless:deathless:layout%3Fdeathless_hangar";

/** Distinct objects reachable through declared members, and how many are reached more than once. */
function census(root)
{
  const references = blue.FindAllReferences(root);
  let shared = 0;
  for (const list of references.values()) if (list.length > 1) shared++;
  return { distinct: references.size + 1, shared, objects: new Set([ root, ...references.keys() ]) };
}

test("a binding's source and destination survive a round trip as the graph's own objects", { skip: distSkip }, () =>
{
  const curve = CjsSchema.from("Tr2CurveScalar", { name: "source" });
  const target = CjsSchema.from("Tr2CurveScalar", { name: "target" });
  const binding = CjsSchema.from("TriValueBinding", { name: "binding" });
  binding.sourceObject = curve;
  binding.destinationObject = target;
  const set = CjsSchema.from("TriCurveSet", { name: "set" });
  set.curves.Append(curve);
  set.curves.Append(target);
  set.bindings.Append(binding);

  const values = CjsSchema.getValues(set, {}, { typeTags: true });
  const back = CjsSchema.from("TriCurveSet", values);
  const [ source, destination ] = back.curves;
  assert.equal(back.bindings[0].sourceObject, source, "the binding reads the curve in the set, not a copy");
  assert.equal(back.bindings[0].destinationObject, destination);

  // The flat copy splits them: that is what refs: false asks for.
  const flat = CjsSchema.from("TriCurveSet", CjsSchema.getValues(set, {}, { typeTags: true, refs: false }));
  assert.notEqual(flat.bindings[0].sourceObject, flat.curves[0]);
});

test("the mdeha01 hangar exports each object once and reloads with its sharing intact", { skip: distSkip }, async t =>
{
  let values;
  try
  {
    const answer = await fetch(`${SERVER}/eve/latest/sof/dna/${HANGAR}`, { signal: AbortSignal.timeout(120000) });
    if (!answer.ok) return t.skip(`tools-core ${SERVER} answered ${answer.status} for the hangar DNA`);
    values = await answer.json();
  }
  catch (error)
  {
    return t.skip(`the hangar needs tools-core at ${SERVER} (${error.message})`);
  }

  const stub = composeStubResMan();
  try
  {
    const root = CjsSchema.from(values._type, values);
    const before = census(root);

    // (a) Measured 2026-10-11, build 3599281: 36,842 objects, 7,949 shared,
    // 13.95 MB exported. The flat copy of the same graph computes to 26.8 MB
    // with bare resources, and passed 12 GB with real ones.
    const out = CjsSchema.getValues(root, {}, { typeTags: true });
    const bytes = JSON.stringify(out).length;
    assert.ok(bytes < 4 * JSON.stringify(values).length, `export is ${bytes} bytes`);

    // (b) The reload has the same objects and the same sharing.
    const back = CjsSchema.from(CjsSchema.getClassName(root.constructor), out);
    const after = census(back);
    assert.equal(after.distinct, before.distinct, "no object was split into copies");
    assert.equal(after.shared, before.shared, "every shared object is still shared");
    for (const object of after.objects)
    {
      for (const key of [ "sourceObject", "destinationObject" ])
      {
        const target = object[key];
        if (target && typeof target === "object") assert.ok(after.objects.has(target), `${key} points into the graph`);
      }
    }
  }
  finally
  {
    stub.restore();
  }
});
