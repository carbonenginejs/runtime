import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema, meta, type } from "../../src/global/schema/index.js";
import { normalizeCarbonValue, coerceCarbonMathInto } from "../../src/global/schema/types/carbonTypes.js";
import { CjsBlackSchemaRegistry } from "../../src/resource/formats/black/core/CjsBlackSchemaRegistry.js";

test("math values compare at the declared storage precision before reporting a change", () =>
{
  const single = { kind: "vector3", scalar: "float32", length: 3 };
  const double = { kind: "vector3", scalar: "float64", length: 3 };
  const values = [0.1, 0.2, 0.3];
  const target = normalizeCarbonValue(values, single);
  assert.equal(coerceCarbonMathInto(target, values, single), false);
  assert.equal(coerceCarbonMathInto(target, [0.1 + 1e-10, 0.2, 0.3], single), false);
  assert.equal(coerceCarbonMathInto(target, [0.5, 0.2, 0.3], single), true);
  assert.equal(coerceCarbonMathInto(target, [0.5, 0.2, 0.3], single), false);
  const precise = normalizeCarbonValue(values, double);
  assert.equal(coerceCarbonMathInto(precise, [0.1 + 1e-10, 0.2, 0.3], double), true);
});

test("semantic type decorators nothing used are gone; Carbon's math types remain", () =>
{
  for (const removed of [ "rgb", "rgba", "linear", "local", "world", "translation", "rotation", "scale", "mixed" ])
    assert.equal(type[removed], undefined, removed);
  for (const kept of [ "color", "quat", "vec2", "vec3", "vec4", "mat4" ]) assert.equal(typeof type[kept], "function", kept);
});

test("Stage-3, decorator calls and manual declarations agree for compound flags and component labels", () =>
{
  const definitions = {};
  definitions.flags = type.flags({ A: 1, B: 2 });
  definitions.words = type.uint32Array;
  definitions.packed = [type.vec4, meta.ui.components(["speed", "size", "opacity", "age"]), meta.ui.description("Particle channels")];
  class Manual {}
  CjsSchema.define(Manual, { className: "MeaningManual", fields: definitions });
  class Decorated {}
  const metadata = {};
  for (const [name, decorators] of Object.entries(definitions))
  {
    for (const decorator of Array.isArray(decorators) ? decorators : [decorators])
      decorator(undefined, { kind: "field", name, metadata, addInitializer() {} });
  }
  meta.define({ className: "MeaningStage3" })(Decorated, { kind: "class", metadata });
  class Applied {}
  for (const [name, decorators] of Object.entries(definitions))
    for (const decorator of Array.isArray(decorators) ? decorators : [decorators]) decorator(Applied.prototype, name);
  CjsSchema.define(Applied, { className: "MeaningApplied" });
  const records = Type => CjsSchema.getSchema(Type).members.map(({ declaringClass, ...field }) => field);
  assert.deepEqual(records(Decorated), records(Manual));
  assert.deepEqual(records(Applied), records(Manual));
  const flags = CjsSchema.getField(Manual, "flags");
  assert.equal(flags.type.kind, "uint32");
  assert.equal(flags.type.flags, true);
  assert.notEqual(flags.enum, undefined);
  assert.equal(normalizeCarbonValue(-1, flags.type), 4294967295);
  const packed = CjsSchema.getField(Manual, "packed");
  assert.deepEqual(packed.components, {x:{name:"speed"},y:{name:"size"},z:{name:"opacity"},w:{name:"age"}});
  assert.deepEqual(packed.jessica, { description: "Particle channels" });
  assert.equal(packed.edit, undefined);
});

test("object pointers are Carbon's rootRef and rootWeak; the retired kinds fail where they are declared", () =>
{
  for (const retired of [ "model", "objectRef", "weakRef" ]) assert.equal(type[retired], undefined);
  class Pointers {}
  CjsSchema.define(Pointers, { className: "RetiredKindsPointers", fields: {
    strong: type.rootRef("RetiredKindsPointers"), weak: type.rootWeak("RetiredKindsPointers")
  } });
  assert.equal(CjsSchema.getField(Pointers, "strong").type.kind, "rootRef");
  assert.equal(CjsSchema.getField(Pointers, "weak").type.kind, "rootWeak");
  assert.equal(CjsBlackSchemaRegistry.fromDeclaredType(CjsSchema.getField(Pointers, "weak").type).black.beType, "IROOTWEAKREF");
  for (const [ type, message ] of [
    [ { kind: "objectRef", className: "X" }, /"objectRef" is retired; Carbon's name is "rootRef"/ ],
    [ { kind: "model", className: "X" }, /"model" is retired; Carbon's name is "rootRef"/ ],
    [ { kind: "weakRef", className: "X" }, /"weakRef" is retired; Carbon's name is "rootWeak"/ ],
    [ { kind: "list", itemType: { kind: "objectRef", className: "X" } }, /"objectRef" is retired/ ]
  ])
  {
    class Stale {}
    assert.throws(() => CjsSchema.define(Stale, { className: "RetiredKindsStale", fields: [ { name: "value", type } ] }), message);
  }
});

test("component labels require valid explicit declarations; type.custom is gone", () =>
{
  assert.equal(type.custom, undefined);
  assert.equal(Object.hasOwn(meta.ui, "readOnly"), false, "editability is Blue WRITE; Carbon has no read-only annotation");
  assert.throws(() => meta.ui.components(["x", 2]), /string labels/);
  assert.throws(() => meta.ui.components(["a", "b", "c", "d", "e"]), /four/);
  assert.equal(CjsBlackSchemaRegistry.fromDeclaredType({ kind: "uint32", binary: true }).black.beType, "BINARYBLOCK");
  assert.throws(() => CjsBlackSchemaRegistry.fromDeclaredType({ kind: "typedArray", arrayType: "Uint32Array" }), /Unsupported canonical Black type: typedArray/);
});

test("named requirements install throwing methods while preserving implementations", () =>
{
  class Contract { Existing() { return "existing"; } }
  meta.requires("Missing", "Second", "Existing", "Missing")(Contract, {kind:"class"});
  CjsSchema.define(Contract, {className:"NamedRequirementContract"});
  class Consumer extends Contract {}
  CjsSchema.define(Consumer, {className:"NamedRequirementConsumer"});
  const value = new Consumer();
  assert.equal(value.Existing(), "existing");
  assert.throws(() => value.Missing(), /NamedRequirementConsumer does not implement NamedRequirementContract.Missing/);
  assert.throws(() => value.Second(), /Second/);
  assert.throws(() => meta.requires("A", ""), /nonempty/);
  assert.throws(() => meta.requires("A")({}, {kind:"class"}), /only supports classes/);
});
