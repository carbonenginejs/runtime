import assert from "node:assert/strict";
import { test } from "node:test";
import { ImportDist } from "../support/allDistClasses.js";

// An embedded object member that holds nothing (Carbon's owning std::unique_ptr, null) reads its values back: null
// keeps it empty, and a dictionary gives it a new object of its declared class.
const { CjsSchema, type } = await ImportDist("blue/schema/index.js");
const { DictReader } = await ImportDist("blue/formats/graph/DictReader.js");

class NullEmbedItem
{
  size = 0;
}
CjsSchema.decorateField(NullEmbedItem, "size", type.uint32);
CjsSchema.meta.define("NullEmbedItem")(NullEmbedItem);

class NullEmbedOwner
{
  item = null;
}
CjsSchema.decorateField(NullEmbedOwner, "item", type.object.embed("NullEmbedItem"));
CjsSchema.meta.define("NullEmbedOwner")(NullEmbedOwner);

test("an embedded member that holds nothing reads null as empty", () =>
{
  const owner = new NullEmbedOwner();
  new DictReader().ReadInto(owner, { item: null }, null);
  assert.equal(owner.item, null);
});

test("an embedded member that holds nothing reads a dictionary as a new object", () =>
{
  const owner = new NullEmbedOwner();
  new DictReader().ReadInto(owner, { item: { size: 4 } }, null);
  assert.ok(owner.item instanceof NullEmbedItem);
  assert.equal(owner.item.size, 4);
});
