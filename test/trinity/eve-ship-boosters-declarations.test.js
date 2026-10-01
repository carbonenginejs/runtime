import assert from "node:assert/strict";
import test from "node:test";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { EveBoosterSet2, EveComponentRegistry, EveComponentType, EveShip2, TriDevice, Tr2Renderer } from "../../npm/dist/trinity/index.js";

test("EveShip2 preserves distinct native stored and live booster declarations", () =>
{
  // EveShip2_Blue.cpp:21-22: PERSISTONLY backing member and READWRITE property.
  const schema = CjsSchema.getSchema(EveShip2);
  const members = schema.members.filter(member => member.name === "boosters");
  const properties = schema.properties.filter(property => property.name === "boosters");
  assert.equal(members.length, 1);
  assert.equal(properties.length, 1);
  const member = members[0], property = properties[0];
  assert.equal(member.key, "_boosters");
  assert.equal(member.declaringClass, EveShip2);
  assert.equal(member.role, "member");
  assert.deepEqual(member.edit, { persist: true, persistOnly: true, hidden: true });
  assert.deepEqual(member.type, { kind: "objectRef", className: "EveBoosterSet2" });
  assert.equal(property.key, "boosters");
  assert.equal(property.declaringClass, EveShip2);
  assert.equal(property.role, "property");
  assert.deepEqual(property.edit, { read: true, write: true });
  assert.deepEqual(property.type, member.type);
  const ship = new EveShip2();
  assert.equal(Object.hasOwn(ship, "boosters"), false);
  assert.equal(Object.getOwnPropertyDescriptor(ship, "_boosters").value, null);
  assert.equal(ship.boosters, null);
  assert.equal(ship.GetBoosters(), null);
  assert.ok(mappedInterfaces(EveShip2).has(IInitialize));
  assert.ok(mappedInterfaces(EveShip2).has(INotify));
});

test("dictionary reads and writes use boosters backing storage and its exposed name", t =>
{
  guardDeviceCreation(t);
  const ship = new EveShip2();
  const first = new EveBoosterSet2();
  first.staticTrailLength = 31;
  ship._boosters = first;
  Object.defineProperty(ship, "boosters", {
    configurable: true,
    get() { assert.fail("dictionary persistence must not call the live getter"); },
    set(_) { assert.fail("dictionary persistence must not call the live setter"); }
  });
  for (const options of [ {}, { persistOnly: true } ])
  {
    const values = new DictWriter().WriteObject(ship, {}, options);
    assert.equal(values.boosters.staticTrailLength, 31);
    assert.equal(Object.hasOwn(values, "_boosters"), false);
    assert.equal(Object.keys(values).filter(name => name === "boosters").length, 1);
  }
  const second = new EveBoosterSet2();
  const read = values => new DictReader().ReadInto(ship, values, null);
  assert.deepEqual([ ...read({ boosters: second }) ], [ "boosters" ]);
  assert.equal(ship._boosters, second);
  assert.deepEqual([ ...read({ boosters: null }) ], [ "boosters" ]);
  assert.equal(ship._boosters, null);
  assert.equal(read({ boosters: null }).size, 0);
  assert.throws(() => read({ _boosters: second }), /Invalid attribute/u);
});

test("retained model construction reads a real booster through the stored declaration", t =>
{
  guardDeviceCreation(t);
  t.mock.method(EveShip2.prototype, "SetBoosters", () => assert.fail("values construction must bypass the live setter"));
  const initialization = [];
  const boosterInitialize = EveBoosterSet2.prototype.Initialize;
  const shipInitialize = EveShip2.prototype.Initialize;
  t.mock.method(EveBoosterSet2.prototype, "Initialize", function ()
  {
    initialization.push("booster");
    return boosterInitialize.call(this);
  });
  t.mock.method(EveShip2.prototype, "Initialize", function ()
  {
    initialization.push("ship");
    return shipInitialize.call(this);
  });
  const ship = EveShip2.from({ boosters: { _type: "EveBoosterSet2", staticTrailLength: 19 } });
  assert.equal(ship._boosters.constructor, EveBoosterSet2);
  assert.equal(ship.boosters, ship._boosters);
  assert.equal(ship.boosters.staticTrailLength, 19);
  assert.deepEqual(initialization, [ "booster", "ship" ]);
  assert.equal(ship.GetValues({ persistOnly: true }).boosters.staticTrailLength, 19);
});

test("direct live assignment delegates to GetBoosters and SetBoosters", t =>
{
  guardDeviceCreation(t);
  const ship = new EveShip2();
  const booster = new EveBoosterSet2();
  const setter = t.mock.method(ship, "SetBoosters");
  const getter = t.mock.method(ship, "GetBoosters");
  ship.boosters = booster;
  assert.equal(setter.mock.callCount(), 1);
  assert.equal(setter.mock.calls[0].arguments[0], booster);
  assert.equal(ship.boosters, booster);
  assert.equal(getter.mock.callCount(), 1);
  assert.equal(ship._boosters, booster);
});

test("live replacement transfers native component registration without destroying boosters", t =>
{
  guardDeviceCreation(t);
  const registry = new EveComponentRegistry();
  const foreign = new EveComponentRegistry();
  t.after(() => { registry.Clear(); foreign.Clear(); });
  const ship = new EveShip2();
  const first = new EveBoosterSet2();
  const second = new EveBoosterSet2();
  ship.Register(registry);
  ship.boosters = first;
  second.Register(foreign);
  assert.equal(first.GetComponentRegistry(), registry);
  assert.ok(registry.GetComponents(EveComponentType.LightOwner).includes(first));

  ship.boosters = second;
  assert.equal(first.GetComponentRegistry(), null);
  assert.equal(second.GetComponentRegistry(), registry);
  assert.ok(!foreign.registeredEntities.includes(second));
  assert.ok(!registry.GetComponents(EveComponentType.LightOwner).includes(first));
  assert.ok(registry.GetComponents(EveComponentType.LightOwner).includes(second));
  assert.ok(TriDevice.GetResourcesRegistered().includes(first), "replacing one owner does not destroy the old device resource");

  const calls = [];
  const unregister = second.UnRegister, register = second.Register;
  t.mock.method(second, "UnRegister", function (target)
  {
    calls.push([ "unregister", target ]);
    return unregister.call(this, target);
  });
  t.mock.method(second, "Register", function (target)
  {
    calls.push([ "register", target ]);
    return register.call(this, target);
  });
  ship.boosters = second;
  assert.deepEqual(calls, [ [ "unregister", registry ], [ "register", registry ] ], "Carbon does not short-circuit same-pointer replacement");
  ship.boosters = null;
  assert.equal(ship._boosters, null);
  assert.equal(second.GetComponentRegistry(), null);
  assert.ok(!registry.GetComponents(EveComponentType.LightOwner).includes(second));
  assert.ok(TriDevice.GetResourcesRegistered().includes(second));
});

test("a detached ship clears an incoming booster's foreign registry with Register(null)", t =>
{
  guardDeviceCreation(t);
  const foreign = new EveComponentRegistry();
  t.after(() => foreign.Clear());
  const booster = new EveBoosterSet2();
  booster.Register(foreign);
  const ship = new EveShip2();
  const register = t.mock.method(booster, "Register");
  ship.boosters = booster;
  assert.equal(register.mock.callCount(), 1);
  assert.deepEqual(register.mock.calls[0].arguments, [ null ]);
  assert.equal(booster.GetComponentRegistry(), null);
  assert.equal(foreign.registeredEntities.length, 0);
  assert.equal(foreign.ComponentCount(EveComponentType.LightOwner), 0);
  assert.equal(ship.GetBoosters(), booster);
});

test("canonical Black and Copier keep production booster persistence off the live setter", t =>
{
  guardDeviceCreation(t);
  t.mock.method(EveShip2.prototype, "SetBoosters", () => assert.fail("native persistence must bypass the live setter"));
  const ship = new CjsBlackReader(authoredShipBytes(), { schema: null }).CreateObject();
  assert.equal(ship._boosters.constructor, EveBoosterSet2);
  assert.equal(ship.GetBoosters().staticTrailLength, 23);
  const clone = new Copier().CloneTo(ship);
  assert.equal(clone.constructor, EveShip2);
  assert.notEqual(clone._boosters, ship._boosters);
  assert.equal(clone.GetBoosters().staticTrailLength, 23);
});

/** Avoids device realization and releases only test-created booster registrations. */
function guardDeviceCreation(t)
{
  const before = new Set(TriDevice.GetResourcesRegistered());
  t.mock.method(Tr2Renderer, "IsResourceCreationAllowed", () => false);
  t.after(() =>
  {
    for (const resource of TriDevice.GetResourcesRegistered())
    {
      if (!before.has(resource) && resource.constructor === EveBoosterSet2) TriDevice.UnregisterResource(resource);
    }
  });
}

/** Independently authored Black ship and booster records; no generated schema or external asset. */
function authoredShipBytes()
{
  const strings = [ "EveShip2", "boosters", "EveBoosterSet2", "staticTrailLength" ];
  const narrow = Buffer.concat([ uint16(strings.length), ...strings.map(value => Buffer.from(`${value}\0`, "utf8")) ]);
  const boosterBody = Buffer.concat([ uint16(2), uint16(3), float32(23) ]);
  const booster = Buffer.concat([ uint32(2), uint32(boosterBody.length), boosterBody ]);
  const shipBody = Buffer.concat([ uint16(0), uint16(1), booster ]);
  return Buffer.concat([
    uint32(0xb1acf11e), uint32(1), uint32(narrow.length), narrow, uint32(2), uint16(0),
    uint32(1), uint32(shipBody.length), shipBody
  ]);
}

function uint16(value)
{
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16LE(value);
  return bytes;
}

function uint32(value)
{
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32LE(value);
  return bytes;
}

function float32(value)
{
  const bytes = Buffer.alloc(4);
  bytes.writeFloatLE(value);
  return bytes;
}
