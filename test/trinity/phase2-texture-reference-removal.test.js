import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Copier, DictReader, INotify, IInitialize } from "../../npm/dist/global/blue/index.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { Tr2TextureReference, ITr2TextureProvider } from "../../npm/dist/trinity/core/index.js";
import { Tr2Effect } from "../../npm/dist/trinity/shader/Tr2Effect.js";
import { Tr2TextureAL } from "../../npm/dist/trinityal/index.js";

// Real AL value ownership against a small CPU-only implementation. No context,
// device, resource acquisition or network is started by this fixture.
function textureValue()
{
  const value = new Tr2TextureAL();
  const state = { destroyed: 0 };
  const desc = { GetWidth: () => 8, GetHeight: () => 4, GetDepth: () => 2,
    GetType: () => 3, GetMipCount: () => 2, GetFormat: () => 87, GetArraySize: () => 6 };
  value._texture = { owners: 1, implementation: { IsValid: () => state.destroyed === 0,
    GetDesc: () => desc, GetName: () => "fixture", Destroy: () => { state.destroyed += 1; } } };
  return { value, state };
}

test("texture reference has exact nominal provider and native self-provider query", () =>
{
  const reference = new Tr2TextureReference();
  assert.equal(Object.getPrototypeOf(Tr2TextureReference.prototype), ITr2TextureProvider.prototype);
  assert.equal(CjsSchema.cast(reference, ITr2TextureProvider), reference);
  assert.deepEqual([...mappedInterfaces(Tr2TextureReference)], [Tr2TextureReference, ITr2TextureProvider]);
  assert.equal(CjsSchema.cast(reference, INotify), null);
  assert.equal(CjsSchema.cast(reference, IInitialize), null);
  for (const name of ["SetValues", "UpdateValues", "OnEvent", "GetResources", "Traverse", "Initialize"])
    assert.equal(name in reference, false, name);
});

test("provider prerequisite declares only its two native abstract methods", () =>
{
  assert.deepEqual(Object.getOwnPropertyNames(ITr2TextureProvider.prototype), ["constructor", "GetTexture", "OnTextureChange"]);
  assert.deepEqual([...mappedInterfaces(ITr2TextureProvider)], []);
  assert.throws(() => new ITr2TextureProvider().GetTexture(), /must be implemented/);
  assert.throws(() => new ITr2TextureProvider().OnTextureChange(() => {}), /must be implemented/);
});

test("texture reference declarations expose live readonly properties in native order", () =>
{
  const info = CjsSchema.getSchema(Tr2TextureReference);
  assert.deepEqual(info.members.map(field => [field.name, field.type.kind]), [["texture", "rawStruct"], ["onTextureChange", "rawStruct"]]);
  assert.deepEqual(info.properties.map(field => field.name), ["width", "height", "depth", "type", "mipCount", "format", "arraySize", "name"]);
  for (const field of info.properties)
  {
    assert.equal(field.edit.read, true);
    assert.notEqual(field.edit.write, true);
    assert.notEqual(field.edit.persist, true);
  }
  for (const field of info.members) assert.notEqual(field.edit?.persist, true);
  const reference = new Tr2TextureReference();
  assert.deepEqual(info.properties.map(field => reference[field.name]), [0, 0, 0, 0, 0, 0, 0, ""]);
  const { value } = textureValue();
  reference.SetTexture(value);
  assert.deepEqual(info.properties.map(field => reference[field.name]), [8, 4, 2, 3, 2, 87, 6, "fixture"]);
  assert.throws(() => { reference.width = 32; }, TypeError);
  reference.SetTexture(null);
  value.Destroy();
  assert.equal(reference.width, 0);
});

test("texture replacement copies before release and preserves caller ownership", () =>
{
  const { value, state } = textureValue(), reference = new Tr2TextureReference();
  reference.SetTexture(value);
  const old = reference.GetTexture();
  assert.notEqual(old, value);
  assert.equal(old.Equals(value), true);
  reference.SetTexture(old);
  assert.equal(old.IsValid(), false);
  assert.equal(reference.GetTexture().IsValid(), true);
  assert.equal(state.destroyed, 0);
  value.Destroy();
  assert.equal(reference.GetTexture().IsValid(), true);
  reference.SetTexture(null);
  assert.equal(state.destroyed, 1);
  reference.SetTexture(null);
  assert.equal(state.destroyed, 1);
});

test("texture change uses class-owned snapshot listeners and explicit unsubscribe", () =>
{
  const reference = new Tr2TextureReference(), calls = [];
  let unsubscribeSecond;
  const unsubscribeFirst = reference.OnTextureChange(owner => { calls.push(["first", owner.GetTexture()]); unsubscribeSecond(); });
  unsubscribeSecond = reference.OnTextureChange(owner => calls.push(["second", owner.GetTexture()]));
  const { value } = textureValue();
  reference.SetTexture(value);
  assert.deepEqual(calls.map(call => call[0]), ["first", "second"]);
  assert.equal(calls[0][1], reference.GetTexture());
  reference.SetTexture(null);
  assert.deepEqual(calls.map(call => call[0]), ["first", "second", "first"]);
  assert.equal(calls.at(-1)[1], null);
  unsubscribeFirst(); unsubscribeFirst();
  reference.SetTexture(null);
  assert.equal(calls.length, 3);
  value.Destroy();
});

test("opaque texture and event state stay outside Blue resources and persisted copies", () =>
{
  const reference = new Tr2TextureReference();
  reference.texture = { isResource: true };
  reference.onTextureChange = { isResource: true };
  reference.OnTextureChange(() => {});
  assert.deepEqual(GetResources(reference), []);
  const copy = new Copier().CopyTo(reference);
  assert.equal(copy.GetTexture(), null);
  assert.equal(copy.onTextureChange, null);
  assert.deepEqual(copy._listeners, []);
  const read = new DictReader({ declarations: true }).CreateObject({ _type: "Tr2TextureReference" });
  assert.equal(read.constructor, Tr2TextureReference);
  assert.equal(read.GetTexture(), null);
  assert.throws(() => read.Save("unused"), /not implemented/);
});

test("effect owner reuses its provider and releases only its own AL value share", () =>
{
  const effect = new Tr2Effect(), first = textureValue(), second = textureValue();
  effect.SetParameter("InputTexture", first.value);
  const parameter = effect.GetResourceByName("InputTexture"), reference = parameter.GetTextureProvider();
  assert.equal(CjsSchema.cast(reference, ITr2TextureProvider), reference);
  const events = [];
  reference.OnTextureChange(owner => events.push(owner.GetTexture()));
  first.value.Destroy();
  effect.SetParameter("InputTexture", second.value);
  assert.equal(parameter.GetTextureProvider(), reference);
  assert.equal(first.state.destroyed, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0], reference.GetTexture());
  effect.ClearAllResources();
  assert.equal(reference.GetTexture(), null);
  assert.equal(events.at(-1), null);
  assert.equal(second.state.destroyed, 0);
  assert.equal(second.value.IsValid(), true);
  second.value.Destroy();
  assert.equal(second.state.destroyed, 1);
  effect.Destroy();
});
