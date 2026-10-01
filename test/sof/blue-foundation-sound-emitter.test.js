import assert from "node:assert/strict";
import test from "node:test";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { EveSOFDataHullSoundEmitter } from "../../npm/dist/sof/hull/EveSOFDataHullSoundEmitter.js";

const members = [ "name", "prefix", "position", "rotation", "attenuationScalingFactor" ];

test("the production sound emitter has only native stored members and constructor defaults", () =>
{
  // EveSOFData.h:1505-1522, EveSOFData_Blue.cpp:915-929 and EveSOFData.cpp:1062-1067.
  const emitter = new EveSOFDataHullSoundEmitter();
  const other = new EveSOFDataHullSoundEmitter();
  const schema = CjsSchema.getSchema(EveSOFDataHullSoundEmitter);
  assert.equal(CjsSchema.GetConstructor("EveSOFDataHullSoundEmitter"), EveSOFDataHullSoundEmitter);
  assert.equal(schema.className, "EveSOFDataHullSoundEmitter");
  assert.deepEqual(schema.members.map(member => member.name), members);
  assert.deepEqual(schema.members.map(member => member.key), members);
  assert.deepEqual(schema.members.map(member => member.type.kind), [ "string", "wstring", "vec3", "quat", "float32" ]);
  assert.ok(schema.members.every(member => member.edit.read && member.edit.write && member.edit.persist));
  assert.deepEqual(schema.properties, []);
  assert.equal(mappedInterfaces(EveSOFDataHullSoundEmitter).size, 0);
  assert.equal(emitter.name, "");
  assert.equal(emitter.prefix, "");
  assert.deepEqual(Array.from(emitter.position), [ 0, 0, 0 ]);
  assert.deepEqual(Array.from(emitter.rotation), [ 0, 0, 0, 1 ]);
  assert.equal(emitter.attenuationScalingFactor, 1);
  assert.notEqual(emitter.position, other.position);
  assert.notEqual(emitter.rotation, other.rotation);
  assertPlainEmitter(emitter);
});

test("canonical Black reads the actual sound emitter using separate narrow and wide string tables", () =>
{
  const reader = new CjsBlackReader(authoredEmitterBytes(), { schema: null });
  const payload = reader.ReadPayload().object;
  assert.equal(payload.name, "narrow emitter");
  assert.equal(payload.prefix, "wide emitter \u03a9");
  const emitter = reader.CreateObject();
  assert.equal(emitter.constructor, EveSOFDataHullSoundEmitter);
  assertAuthoredMembers(emitter);
  assertPlainEmitter(emitter);
  assert.equal(reader.reader.AtEnd(), true);
  assert.deepEqual(reader.reports, []);
  const another = reader.CreateObject();
  assert.equal(another.constructor, EveSOFDataHullSoundEmitter);
  assert.notEqual(another, emitter);
  assert.notEqual(another.position, emitter.position);
  assert.notEqual(another.rotation, emitter.rotation);
  assertAuthoredMembers(another);
});

test("Blue copies the production sound emitter into fresh and existing native-shaped storage", () =>
{
  const source = new CjsBlackReader(authoredEmitterBytes(), { schema: null }).CreateObject();
  const clone = new Copier().CloneTo(source);
  assert.equal(clone.constructor, EveSOFDataHullSoundEmitter);
  assert.notEqual(clone, source);
  assert.notEqual(clone.position, source.position);
  assert.notEqual(clone.rotation, source.rotation);
  assertAuthoredMembers(clone);
  assertPlainEmitter(clone);

  const destination = new EveSOFDataHullSoundEmitter();
  const position = destination.position, rotation = destination.rotation;
  assert.equal(new Copier().CopyTo(source, destination), destination);
  assert.equal(destination.position, position);
  assert.equal(destination.rotation, rotation);
  assertAuthoredMembers(destination);
  assertPlainEmitter(destination);

  clone.position[0] = 99;
  clone.rotation[0] = 1;
  assertAuthoredMembers(source);
  assertAuthoredMembers(destination);
});

function assertPlainEmitter(emitter)
{
  assert.deepEqual(Object.keys(emitter), members);
  assert.equal(Object.getPrototypeOf(EveSOFDataHullSoundEmitter.prototype), Object.prototype);
  assert.equal("from" in EveSOFDataHullSoundEmitter, false);
  for (const name of [ "__state", "SetValues", "GetValues", "UpdateValues", "Initialize", "OnModified" ])
  {
    assert.equal(name in emitter, false, `${name} is not part of this native class`);
  }
}

function assertAuthoredMembers(emitter)
{
  assert.equal(emitter.name, "narrow emitter");
  assert.equal(emitter.prefix, "wide emitter \u03a9");
  assert.ok(emitter.position instanceof Float32Array);
  assert.ok(emitter.rotation instanceof Float32Array);
  assert.deepEqual(Array.from(emitter.position), [ 2, -3, 4.5 ]);
  assert.deepEqual(Array.from(emitter.rotation), [ 0.5, 0.5, 0.5, 0.5 ]);
  assert.equal(emitter.attenuationScalingFactor, 2.5);
}

/** Independently authored Black bytes: fixed wire indexes, no schema-derived writer or game asset. */
function authoredEmitterBytes()
{
  const strings = [ "narrow emitter", "EveSOFDataHullSoundEmitter", ...members ];
  const narrow = Buffer.concat([ uint16(strings.length), ...strings.map(value => Buffer.from(`${value}\0`, "utf8")) ]);
  const wide = Buffer.concat([ uint16(1), Buffer.from("wide emitter \u03a9\0", "utf16le") ]);
  // Both string fields refer to index zero, but in different string tables.
  const body = Buffer.concat([
    uint16(1),
    uint16(2), uint16(0),
    uint16(3), uint16(0),
    uint16(4), floats([ 2, -3, 4.5 ]),
    uint16(5), floats([ 0.5, 0.5, 0.5, 0.5 ]),
    uint16(6), floats([ 2.5 ])
  ]);
  return Buffer.concat([
    uint32(0xb1acf11e), uint32(1), uint32(narrow.length), narrow,
    uint32(wide.length), wide, uint32(1), uint32(body.length), body
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

function floats(values)
{
  const bytes = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => bytes.writeFloatLE(value, index * 4));
  return bytes;
}
