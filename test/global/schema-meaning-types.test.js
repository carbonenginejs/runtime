import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema, meta } from "../../src/global/schema/index.js";
import { defaultCarbonValue, normalizeCarbonTypeDescriptor, normalizeCarbonValue, coerceCarbonMathInto } from "../../src/global/schema/types/carbonTypes.js";
import { CjsBlackSchemaRegistry } from "../../src/resource/formats/black/core/CjsBlackSchemaRegistry.js";

const meanings = {
  rgb: ["vector3", 3], rgba: ["vector4", 4], linear: ["vector4", 4],
  local: ["matrix4", 16], world: ["matrix4", 16], translation: ["vector3", 3],
  rotation: ["quaternion", 4], scale: ["vector3", 3], mixed: ["vector4", 4]
};

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

test("meaning decorators resolve ordinary data kinds and preserve declared defaults", () =>
{
  class Record {}
  CjsSchema.define(Record, { className: "MeaningTypeRecord", fields: Object.fromEntries(Object.keys(meanings).map(name => [name, meta.type[name]])) });
  for (const [name, [kind, length]] of Object.entries(meanings))
  {
    const field = CjsSchema.getField(Record, name);
    const descriptor = normalizeCarbonTypeDescriptor(field.type);
    assert.equal(descriptor.kind, kind);
    assert.equal(descriptor.semantic, name);
    const value = defaultCarbonValue(field.type);
    assert.ok(value instanceof Float32Array);
    assert.equal(value.length, length);
    if (name === "scale") assert.deepEqual([...value], [1, 1, 1]);
    if (name === "rotation") assert.deepEqual([...value], [0, 0, 0, 1]);
    if (name === "world" || name === "local") assert.deepEqual([...value], [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
    const input = Array.from({ length }, (_, i) => i + 0.25);
    assert.equal(coerceCarbonMathInto(value, input, field.type), true);
    assert.deepEqual([...value], input);
    assert.equal(coerceCarbonMathInto(value, input, field.type), false);
    assert.throws(() => normalizeCarbonValue([1, 2], field.type), /declares .* elements/);
    // A format dispatches storage, without knowing the meaning vocabulary.
    assert.equal(CjsBlackSchemaRegistry.fromDeclaredType(field.type).black.beType, "FLOATARRAY");
  }
});

test("Stage-3, decorator calls and manual declarations agree for compound flags and meaning types", () =>
{
  const definitions = Object.fromEntries(Object.keys(meanings).map(name => [name, meta.type[name]]));
  definitions.flags = meta.type.flags({ A: 1, B: 2 });
  definitions.words = meta.type.uint32Array;
  definitions.packed = [meta.type.mixed, meta.ui.components(["speed", "size", "opacity", "age"]), meta.ui.description("Particle channels")];
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
  assert.equal(flags.edit.flags, true);
  assert.equal(flags.edit.enum, true);
  assert.equal(normalizeCarbonValue(-1, flags.type), 4294967295);
  const packed = CjsSchema.getField(Manual, "packed");
  assert.deepEqual(packed.components, {x:{name:"speed"},y:{name:"size"},z:{name:"opacity"},w:{name:"age"}});
  assert.deepEqual(packed.jessica, { description: "Particle channels" });
  assert.equal(packed.edit, undefined);
});

test("object pointers are Carbon's rootRef and rootWeak; the retired kinds fail where they are declared", () =>
{
  for (const retired of [ "model", "objectRef", "weakRef" ]) assert.equal(meta.type[retired], undefined);
  class Pointers {}
  CjsSchema.define(Pointers, { className: "RetiredKindsPointers", fields: {
    strong: meta.type.rootRef("RetiredKindsPointers"), weak: meta.type.rootWeak("RetiredKindsPointers")
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

test("component labels require valid explicit declarations; meta.type.custom is gone", () =>
{
  assert.equal(meta.type.custom, undefined);
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
