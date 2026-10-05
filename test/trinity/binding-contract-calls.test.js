import assert from "node:assert/strict";
import test from "node:test";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { Tr2DynamicBinding, Tr2ExternalParameter, Tr2FloatParameter, TriValueBinding } from "../../npm/dist/trinity/index.js";

function externalTo(destination, attribute = "scale")
{
  const binding = new Tr2ExternalParameter();
  binding.SetDestinationObject(destination);
  binding.SetDestinationAttribute(attribute);
  return binding;
}

function valueTo(destination, attribute = "scale")
{
  const source = new Tr2DynamicBinding();
  source.scale = 3;
  const binding = new TriValueBinding();
  binding.SetSource("scale", source);
  binding.SetDestination(attribute, destination);
  binding.Initialize();
  return binding;
}

for (const [name, create, copy] of [
  ["external parameter", externalTo, binding => binding.SetValue(3)],
  ["value binding", valueTo, binding => binding.CopyValue()]
])
{
  test(`${name} uses the nominal notification contract instead of structural alternatives`, () =>
  {
    const destination = new Tr2DynamicBinding();
    const calls = [];
    destination.OnModified = member => calls.push(member);
    destination.UpdateValues = () => assert.fail("UpdateValues is not INotify");
    destination.OnValueChanged = () => assert.fail("OnValueChanged is not INotify");
    copy(create(destination));
    assert.deepEqual(calls, ["scale"], "Tr2ExternalParameter.cpp:107,161-164; TriValueBinding.cpp:53-55,406-409");
  });

  test(`${name} requires OnModified on an installed INotify receiver`, () =>
  {
    const destination = new Tr2DynamicBinding();
    destination.OnModified = undefined;
    assert.throws(() => copy(create(destination)), TypeError);
  });

  test(`${name} does not notify an object merely because it has similarly named methods`, () =>
  {
    const destination = { scale: 1, OnModified() { assert.fail("No INotify identity"); } };
    assert.doesNotThrow(() => copy(create(destination)));
    assert.equal(destination.scale, 3);
  });
}

test("value bindings require a declared NOTIFY destination field", () =>
{
  for (const field of ["scale", "undeclared"])
  {
    const destination = new TriValueBinding();
    destination[field] = 0;
    destination.OnModified = () => assert.fail("TriValueBinding.cpp:406-409 requires Be::NOTIFY");
    const binding = valueTo(destination, field);
    assert.equal(binding.IsValid(), true);
    assert.equal(binding.CopyValue(), true);
    assert.equal(destination[field], 3);
  }
});

for (const method of ["GetSize", "GetAt"])
{
  test(`dynamic list paths require ${method} on a nominal IList`, () =>
  {
    const list = new BlueList(Tr2FloatParameter);
    list.push(new Tr2FloatParameter());
    list[method] = undefined;
    assert.throws(() => Tr2DynamicBinding._resolveReference("Root[0]", { Root: list }), TypeError,
      "Tr2DynamicBinding.cpp:81-120 calls the cast IList contract");
  });
}

test("dynamic list paths reject structural lists and retain array indexing and names", () =>
{
  const value = Object.assign(new Tr2FloatParameter(), { name: "chosen" });
  const structural = { GetSize: () => 1, GetAt: () => value };
  assert.equal(Tr2DynamicBinding._resolveReference("Root[0]", { Root: structural }), null);
  for (const list of [[value], new BlueList(Tr2FloatParameter)])
  {
    if (!list.length) list.push(value);
    for (const suffix of ["[0]", "[-1]", '["chosen"]'])
      assert.equal(Tr2DynamicBinding._resolveReference("Root" + suffix, { Root: list }), value);
    assert.equal(Tr2DynamicBinding._resolveReference("Root[1]", { Root: list }), null);
  }
});

for (const method of ["RegisterBinding", "GetDestination", "IsRerouted"])
{
  test(`value rerouting requires the nominal ${method} method`, () =>
  {
    const destination = new Tr2FloatParameter();
    destination[method] = undefined;
    assert.throws(() => valueTo(destination, "value").CopyValue(), TypeError,
      "ITriReroutable.h:8-16; TriValueBinding.cpp:414-432");
  });
}

test("value rerouting does not accept structural receiver imitations", () =>
{
  const destination = {
    value: 1,
    RegisterBinding() { assert.fail("No ITriReroutable identity"); },
    GetDestination() { assert.fail("No ITriReroutable identity"); }
  };
  assert.doesNotThrow(() => valueTo(destination, "value").CopyValue());
  assert.equal(destination.value, 3);
});

test("value rerouting consumes the required destination record without a null fallback", () =>
{
  const destination = new Tr2FloatParameter();
  destination.GetDestination = () => null;
  assert.throws(() => valueTo(destination, "value"), TypeError,
    "ITriReroutable.GetDestination adapts the required native out parameters as {dest,size}");
});

test("value rerouting keeps the declared buffer-size check and explicit copy callback", () =>
{
  const destination = new Tr2FloatParameter();
  const buffer = { value: 0 };
  destination.GetDestination = () => ({ dest: buffer, size: 0 });
  valueTo(destination, "value").CopyValue();
  assert.equal(buffer.value, 0);
  assert.equal(destination.value, 3, "TriValueBinding.cpp:421-428 keeps the original destination when too small");
  const callback = valueTo(new Tr2DynamicBinding());
  let calls = 0;
  callback.copyValueCallable = (from, to) => { calls++; to.scale = from.scale + 1; };
  callback.Initialize();
  assert.equal(callback.CopyValue(), true);
  assert.equal(calls, 1);
  assert.equal(callback.GetCurrentDestinationObject().scale, 4);
});
