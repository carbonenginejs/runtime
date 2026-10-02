import assert from "node:assert/strict";
import test from "node:test";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { CjsSchema, meta } from "../../npm/dist/global/schema/index.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { EveBoosterSet2, EveEntity, EveMobile, EveShip2, EveSpaceObject2, TriDevice, Tr2Renderer } from "../../npm/dist/trinity/index.js";
import { ITr2ShLightingReceiver } from "../../npm/dist/trinity/core/lighting/ITr2ShLightingReceiver.js";
import { ITr2SecondaryLightSource } from "../../npm/dist/trinity/core/lighting/ITr2SecondaryLightSource.js";

test("native lifecycle mappings belong to space objects and boosters and reach derived ships", () =>
{
  // EveSpaceObject2_Blue.cpp:190,196; EveBoosterSet2_Blue.cpp:35-36.
  for (const Constructor of [ EveSpaceObject2, EveMobile, EveShip2, EveBoosterSet2 ])
  {
    assert.ok(mappedInterfaces(Constructor).has(IInitialize), `${CjsSchema.getClassName(Constructor)} maps IInitialize`);
    assert.ok(mappedInterfaces(Constructor).has(INotify), `${CjsSchema.getClassName(Constructor)} maps INotify`);
  }
  assert.ok(mappedInterfaces(EveSpaceObject2).has(ITr2ShLightingReceiver));
  assert.ok(mappedInterfaces(EveSpaceObject2).has(ITr2SecondaryLightSource));
  assert.equal(mappedInterfaces(EveEntity).has(IInitialize), false, "mapping must not leak to the common entity base");
  assert.equal(mappedInterfaces(EveEntity).has(INotify), false);
});

test("canonical Black initializes the real booster before its ship and suppresses member notifications", t =>
{
  const calls = observeProductionLifecycle(t);
  const reader = new CjsBlackReader(authoredShipBytes(), { schema: null });
  const ship = reader.CreateObject();
  assert.equal(ship.constructor, EveShip2);
  assert.equal(ship.boosters.constructor, EveBoosterSet2);
  assert.equal(ship.name, "mapped ship");
  assert.equal(ship.boosters.staticTrailLength, 17);
  assert.deepEqual(calls, [ [ "booster", 17 ], [ "ship", "mapped ship", 17 ] ]);
  assert.equal(ship.boosters._revision, 1, "the original booster Initialize ran");
  assert.equal(reader.reader.AtEnd(), true);
  assert.deepEqual(reader.reports, []);
});

test("disabled canonical Black initialization still suppresses INotify on the real objects", t =>
{
  const calls = observeProductionLifecycle(t);
  const ship = new CjsBlackReader(authoredShipBytes(), { schema: null, initialize: false }).CreateObject();
  assert.equal(ship.boosters.staticTrailLength, 17);
  assert.equal(ship.name, "mapped ship");
  assert.deepEqual(calls, []);
  assert.equal(ship.boosters._revision, 0);
});

test("Copier initializes fresh and existing production ships after their copied boosters", t =>
{
  const calls = observeProductionLifecycle(t);
  const source = new EveShip2();
  source.name = "copied ship";
  source.boosters = new EveBoosterSet2();
  source.boosters.staticTrailLength = 29;
  const clone = new Copier().CloneTo(source);
  assert.ok(clone, "the complete production copy succeeds");
  assert.equal(clone.constructor, EveShip2);
  assert.notEqual(clone.boosters, source.boosters);
  assert.deepEqual(calls, [ [ "booster", 29 ], [ "ship", "copied ship", 29 ] ]);
  assert.equal(source.boosters._revision, 0, "copying does not initialize the source");
  assert.equal(clone.boosters._revision, 1);

  calls.length = 0;
  const destination = new EveShip2();
  assert.equal(new Copier().CopyTo(source, destination), destination);
  assert.notEqual(destination.boosters, source.boosters);
  assert.deepEqual(calls, [ [ "booster", 29 ], [ "ship", "copied ship", 29 ] ]);
});

test("having lifecycle methods without native mappings does not opt into Black or Copier callbacks", () =>
{
  class UnmappedLifecycle
  {
    value = 0;
    Initialize() { throw new Error("an unmapped Initialize must not run"); }
    OnModified() { throw new Error("an unmapped OnModified must not run"); }
  }
  CjsSchema.define(UnmappedLifecycle, {
    className: "BlueFoundationUnmappedLifecycle",
    fields: { value: [ meta.type.float32, meta.blue.persist, meta.blue.notify ] }
  });
  const reader = new CjsBlackReader(authoredUnmappedBytes(), { schema: null });
  const source = reader.CreateObject();
  assert.equal(source.constructor, UnmappedLifecycle);
  assert.equal(source.value, 11);
  const clone = new Copier().CloneTo(source);
  assert.equal(clone.constructor, UnmappedLifecycle);
  assert.equal(clone.value, 11);
});

/** Spies call the real initialization methods; only device creation is disabled. */
function observeProductionLifecycle(t)
{
  const calls = [];
  const before = new Set(TriDevice.GetResourcesRegistered());
  t.after(() =>
  {
    for (const resource of TriDevice.GetResourcesRegistered())
    {
      if (!before.has(resource) && resource.constructor === EveBoosterSet2) TriDevice.UnregisterResource(resource);
    }
  });
  t.mock.method(Tr2Renderer, "IsResourceCreationAllowed", () => false);
  const boosterInitialize = EveBoosterSet2.prototype.Initialize;
  const shipInitialize = EveShip2.prototype.Initialize;
  t.mock.method(EveBoosterSet2.prototype, "Initialize", function ()
  {
    calls.push([ "booster", this.staticTrailLength ]);
    return boosterInitialize.call(this);
  });
  t.mock.method(EveShip2.prototype, "Initialize", function ()
  {
    calls.push([ "ship", this.name, this.boosters.staticTrailLength ]);
    return shipInitialize.call(this);
  });
  for (const Constructor of [ EveBoosterSet2, EveShip2 ])
  {
    t.mock.method(Constructor.prototype, "OnModified", function ()
    {
      assert.fail(`${CjsSchema.getClassName(Constructor)} must initialize instead of notifying members`);
    });
  }
  return calls;
}

/** Independent minimal Black fixture: a production ship points to a production booster. */
function authoredShipBytes()
{
  const strings = [ "EveShip2", "name", "mapped ship", "boosters", "EveBoosterSet2", "staticTrailLength" ];
  const booster = objectBytes(2, Buffer.concat([ uint16(4), uint16(5), float32(17) ]));
  const ship = objectBytes(1, Buffer.concat([ uint16(0), uint16(1), uint16(2), uint16(3), booster ]));
  return blackBytes(strings, ship);
}

function authoredUnmappedBytes()
{
  return blackBytes([ "BlueFoundationUnmappedLifecycle", "value" ], objectBytes(1,
    Buffer.concat([ uint16(0), uint16(1), float32(11) ])));
}

function blackBytes(strings, object)
{
  const narrow = Buffer.concat([ uint16(strings.length), ...strings.map(value => Buffer.from(`${value}\0`, "utf8")) ]);
  return Buffer.concat([ uint32(0xb1acf11e), uint32(1), uint32(narrow.length), narrow, uint32(2), uint16(0), object ]);
}

function objectBytes(id, body)
{
  return Buffer.concat([ uint32(id), uint32(body.length), body ]);
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
