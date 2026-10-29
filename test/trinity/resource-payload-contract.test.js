import assert from "node:assert/strict";
import test from "node:test";
import { Tr2GrannyAnimation } from "../../npm/dist/trinity/index.js";
import { TriGrannyRes } from "../../npm/dist/trinity/resources/geometry/granny/TriGrannyRes.js";

for (const [name, create, read, data, absent] of [
  ["Granny animation", resource => Object.assign(new Tr2GrannyAnimation(), { grannyRes: resource }), owner => owner.GetFileInfo(), { animations: [{ name: "idle" }] }, null]
])
{
  test(`${name} requires GetGrannyFile on a runtime resource`, () =>
  {
    const resource = new TriGrannyRes();
    resource.GetGrannyFile = undefined;
    assert.throws(() => read(create(resource)), TypeError);
  });

  test(`${name} never replaces a null payload with wrapper properties`, () =>
  {
    const resource = Object.assign(new TriGrannyRes(), data);
    assert.equal(read(create(resource)), absent);
  });

  test(`${name} retains decoded records without treating structural methods as resource identity`, () =>
  {
    const decoded = { ...data, GetGrannyFile() { throw new Error("Decoded record is not a resource"); } };
    const value = read(create(decoded));
    assert.equal(value, decoded);
  });

  test(`${name} reads a concrete resource payload`, () =>
  {
    const resource = new TriGrannyRes();
    resource._grannyFile = data;
    const value = read(create(resource));
    assert.equal(value, data);
  });
}
