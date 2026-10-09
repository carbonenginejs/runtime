import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta } from "../../src/global/schema/index.js";
import { DictReader } from "../../src/global/blue/DictReader.js";
import { getDictionaryDeclarations } from "../../src/global/blue/dictionaryDeclarations.js";

class AliasRecord
{
  storedName = 0;
  get preferredName() { return this.storedName; }
  set preferredName(value) { this.storedName = value; }
}
CjsSchema.define(AliasRecord, {
  className: "MetaAliasRecord",
  fields: {
    storedName: [ meta.blue.readwrite, meta.blue.persist, meta.type.int32 ],
    preferredName: [ meta.ours, meta.keyAlias("storedName") ]
  }
});

test("an aliased getter's name reads into its target field", () =>
{
  const record = new DictReader({ declarations: true }).CreateObject({ _type: "MetaAliasRecord", preferredName: 7 });
  assert.equal(record.storedName, 7);
  const direct = new DictReader({ declarations: true }).CreateObject({ _type: "MetaAliasRecord", storedName: 9 });
  assert.equal(direct.storedName, 9);
});

test("the aliased getter is a second name, not an exposed field of its own", () =>
{
  const view = getDictionaryDeclarations(AliasRecord);
  assert.deepEqual(view.fields.map(field => field.name), [ "storedName" ]);
  assert.equal(view.aliases.get("preferredName"), view.byName.get("storedName"));
});

test("meta.keyAlias requires a target field name", () =>
{
  for (const target of [ undefined, null, "", "  ", 3 ]) assert.throws(() => meta.keyAlias(target), TypeError);
});
