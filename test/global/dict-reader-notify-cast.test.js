import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "../../npm/dist/blue/schema/index.js";
import { INotify } from "../../npm/dist/blue/exposure/INotify.js";
import { IInitialize } from "../../npm/dist/blue/exposure/IInitialize.js";
import { DictReader } from "../../npm/dist/blue/formats/graph/DictReader.js";

// Carbon's DictReader::ReadMembers (blue/src/DictReader.cpp:162-168) tells an object of its NOTIFY members only
// through a BlueCastPtr to INotify, and not at all when the object is IInitialize. ReadInto applies the same cast to
// the notify target it is given.

const { meta, type: storage } = CjsSchema;

/**
 * A registered probe with one NOTIFY member that records the OnModified calls it receives.
 *
 * @param {string} name Registered class name.
 * @param {Function[]} interfaces Interfaces to map.
 * @returns {Function} The class.
 */
function Probe(name, interfaces)
{
  const Probed = class
  {
    speed = 0;
    calls = [];
    OnModified(member) { this.calls.push(member); return true; }
    Initialize() { return true; }
  };
  CjsSchema.decorateField(Probed, "speed", meta.mapAttribute(meta.READWRITE | meta.NOTIFY), storage.float32);
  meta.define(name)(Probed);
  for (const Interface of interfaces) CjsSchema.exposure.mapInterface(Interface)(Probed);
  return Probed;
}

const Notifying = Probe("NotifyCastProbeINotify", [ INotify ]);
const Plain = Probe("NotifyCastProbePlain", []);
const Initializing = Probe("NotifyCastProbeInitialize", [ INotify, IInitialize ]);

test("an INotify target is told of a NOTIFY member", () =>
{
  const object = new Notifying();
  new DictReader().ReadInto(object, { speed: 2 }, object);
  assert.equal(object.speed, 2);
  assert.deepEqual(object.calls, [ "speed" ]);
});

test("a target that is not INotify is not told, even with an OnModified", () =>
{
  const object = new Plain();
  new DictReader().ReadInto(object, { speed: 2 }, object);
  assert.equal(object.speed, 2);
  assert.deepEqual(object.calls, []);
});

test("an IInitialize target gets no individual notifications", () =>
{
  const object = new Initializing();
  new DictReader().ReadInto(object, { speed: 2 }, object);
  assert.equal(object.speed, 2);
  assert.deepEqual(object.calls, []);
});

test("a null notify target stays null", () =>
{
  const object = new Notifying();
  new DictReader().ReadInto(object, { speed: 2 }, null);
  assert.equal(object.speed, 2);
  assert.deepEqual(object.calls, []);
});
