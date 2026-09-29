// Optional offline proof; point SAMPLER_BLACK_CORPUS_FILE at an unmodified copy
// of showinfo_background_angel_01a.black. No game bytes ship with this test.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";

function samplerLists(root)
{
  const result = [];
  const seen = new Set();
  function visit(value)
  {
    if (!value || typeof value !== "object" || seen.has(value) || ArrayBuffer.isView(value)) return;
    seen.add(value);
    if (Object.hasOwn(value, "samplerOverrides")) result.push(value.samplerOverrides);
    for (const child of Object.values(value)) visit(child);
  }
  visit(root);
  return result;
}

test("real Angel showinfo scene decodes its full sampler records after class registration", {
  skip: !process.env.SAMPLER_BLACK_CORPUS_FILE && "set SAMPLER_BLACK_CORPUS_FILE for the real scene proof"
}, async t =>
{
  const bytes = await readFile(process.env.SAMPLER_BLACK_CORPUS_FILE);
  assert.equal(bytes.length, 8387);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "111133b37cc8e5391bf9505b05ab33cdb62fbbbbd5cfa4e5d3fb587e70a13fda");
  // Without the item class, the existing reader preserves the opaque native
  // bytes. An early read must not cache the absence of a class-derived layout.
  const opaque = samplerLists(CjsBlackFormat.readPayload(bytes).object);
  assert.ok(opaque.length > 0);
  assert.ok(opaque.every(value => value.$type === "black.structureList" && value.structureSize === 56));
  await import("../../npm/dist/trinity/index.js");
  const decoded = samplerLists(CjsBlackFormat.readPayload(bytes).object);
  assert.equal(decoded.length, opaque.length);
  assert.ok(decoded.every(Array.isArray), "registered metadata must decode fields, not retain opaque blobs");
  assert.ok(decoded.flat().length > 0);
  for (const value of decoded.flat())
  {
    assert.equal(typeof value.name, "string");
    assert.equal(typeof value.maxAnisotropy, "number");
    assert.equal(Object.hasOwn(value, "sampler"), false);
  }
  t.diagnostic(`decoded ${decoded.flat().length} native 56-byte sampler override record(s)`);
});
