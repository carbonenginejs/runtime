import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsFormat } from "../../../npm/dist/format/CjsFormat.js";
import {
  CjsLoadingObject,
  CjsResMan
} from "../../../npm/dist/index.js";
import CjsPickleFormat, {
  CjsPickleFormat as NamedCjsPickleFormat
} from "../../../src/formats/pickle/index.js";

test("package subpath exports one public pickle format class", async () =>
{
  const mod = await import("../../../src/formats/pickle/index.js");

  assert.deepEqual(Object.keys(mod).sort(), [ "CjsPickleFormat", "default" ]);
  assert.equal(mod.default, CjsPickleFormat);
  assert.equal(NamedCjsPickleFormat, CjsPickleFormat);
});

test("pickle facade declares protocol 0 and the standard format vocabulary", () =>
{
  assert.deepEqual(Object.getOwnPropertyNames(CjsPickleFormat.prototype).sort(), [
    "GetValues", "Read", "ReadJSON", "ReadPayload", "ReadRaw", "SetValues",
    "ToJSON", "constructor"
  ].sort());
  assert.equal(CjsPickleFormat.id, "pickle");
  assert.deepEqual(CjsPickleFormat.extensions, [ ".pickle" ]);
  assert.deepEqual(CjsPickleFormat.supportedProtocols, [ 0 ]);
  assert.equal(typeof CjsPickleFormat.normalizeValues, "function");
  assert.doesNotThrow(() => CjsFormat.validateContract(CjsPickleFormat));
});

test("default output decodes protocol-0 data into JSON-compatible values", () =>
{
  const result = CjsPickleFormat.read(bytes(
    "(dp0\n"
    + "Vprofile\n"
    + "p1\n"
    + "(dp2\n"
    + "Vcolors\n"
    + "p3\n"
    + "(lp4\n"
    + "(F0.5\nF0.25\nF0.125\nI1\n"
    + "tp5\n"
    + "asVlabel\n"
    + "p6\n"
    + "Vexample\\u0020profile\n"
    + "p7\n"
    + "ss."
  ));

  assert.deepEqual(result, {
    profile: {
      colors: [ [ 0.5, 0.25, 0.125, 1 ] ],
      label: "example profile"
    }
  });
  assert.doesNotThrow(() => JSON.stringify(result));
});

test("payload output preserves memo aliases while JSON rejects cycles", () =>
{
  const shared = bytes(
    "(dp0\n"
    + "Vleft\n"
    + "p1\n"
    + "(lp2\nI1\nas"
    + "Vright\n"
    + "p3\n"
    + "g2\ns."
  );
  const value = CjsPickleFormat.readPayload(shared);

  assert.deepEqual(value, { left: [ 1 ], right: [ 1 ] });
  assert.equal(value.left, value.right);
  assert.equal(CjsPickleFormat.toJSON(value), value);

  const cyclic = bytes("(lp0\ng0\na.");
  const raw = CjsPickleFormat.readRaw(cyclic);
  assert.equal(raw[0], raw);
  assert.throws(
    () => CjsPickleFormat.readJSON(cyclic),
    error => error.code === "CJS_PICKLE_JSON_INVALID"
      && error.protocol === 0
  );
  assert.throws(
    () => CjsPickleFormat.toJSON(raw),
    error => error.code === "CJS_PICKLE_JSON_INVALID"
  );
});

test("pickle reader preserves lossless integers and safe dictionary keys", () =>
{
  assert.equal(
    CjsPickleFormat.read(bytes("L9007199254740993L\n.")),
    "9007199254740993"
  );
  assert.deepEqual(
    CjsPickleFormat.read(bytes("(dp0\nI7\nS'seven'\np1\ns.")),
    { "7": "seven" }
  );

  const prototypeKey = CjsPickleFormat.read(bytes(
    "(dp0\nS'__proto__'\np1\nS'inert'\np2\ns."
  ));
  assert.equal(Object.getPrototypeOf(prototypeKey), Object.prototype);
  assert.equal(Object.hasOwn(prototypeKey, "__proto__"), true);
  assert.equal(prototypeKey.__proto__, "inert");

  assert.throws(
    () => CjsPickleFormat.read(bytes(
      "(dp0\nI0\nS'number'\np1\nsS'0'\np2\nS'text'\np3\ns."
    )),
    error => error.code === "CJS_PICKLE_CONTAINER_INVALID"
  );
});

test("pickle reader rejects executable and unsupported protocol opcodes", () =>
{
  assert.throws(
    () => CjsPickleFormat.read(bytes("cos\nsystem\n(S'unsafe'\ntR.")),
    error => error.code === "CJS_PICKLE_OPCODE_UNSUPPORTED"
      && error.protocol === 0
      && error.offset === 0
  );
  assert.throws(
    () => CjsPickleFormat.read(new Uint8Array([ 0x80, 0x02, 0x4e, 0x2e ])),
    error => error.code === "CJS_PICKLE_OPCODE_UNSUPPORTED"
      && error.offset === 0
  );
  assert.throws(
    () => CjsPickleFormat.read(bytes("(tI1\na.")),
    error => error.code === "CJS_PICKLE_CONTAINER_INVALID"
      && /APPEND target must be a list/u.test(error.message)
  );
  assert.throws(
    () => CjsPickleFormat.readRaw(bytes("(p0\ng0\nl.")),
    error => error.code === "CJS_PICKLE_MARK_INVALID"
      && /MARK cannot be stored/u.test(error.message)
  );
});

test("pickle profiles strictly validate options and resource limits", () =>
{
  const format = new CjsPickleFormat({
    emit: "payload",
    limits: { maxInputBytes: 8 }
  });

  assert.equal(format.GetValues().emit, "payload");
  assert.equal(format.GetValues().limits.maxInputBytes, 8);
  assert.equal(format.SetValues({ emit: "json" }), format);
  assert.equal(format.Read(bytes("N.")), null);

  assert.throws(
    () => format.Read(bytes("S'larger'\n.")),
    error => error.code === "CJS_PICKLE_LIMIT_EXCEEDED"
  );
  assert.throws(
    () => new CjsPickleFormat({ emit: "runtime" }),
    /unknown emit value/u
  );
  assert.throws(
    () => new CjsPickleFormat({ protocol: 0 }),
    /unknown option/u
  );
  assert.throws(
    () => new CjsPickleFormat({ limits: { maxInputBytes: 0 } }).Read(bytes("N.")),
    error => error.code === "CJS_PICKLE_LIMIT_INVALID"
  );
  assert.throws(
    () => new CjsPickleFormat({ limits: { unknown: 1 } }).Read(bytes("N.")),
    error => error.code === "CJS_PICKLE_LIMIT_INVALID"
  );
});

test("ResMan routes lowercase pickle resource context without domain coupling", async () =>
{
  const input = bytes("(dp0\nVvalue\np1\nI7\ns.");
  let identifyContext = null;
  const resMan = new CjsResMan({
    source: {
      Read()
      {
        return input;
      }
    },
    extensions: {
      pickle: {
        Handler: CjsLoadingObject,
        Format: CjsPickleFormat,
        Identify(value, context)
        {
          assert.deepEqual(value, { value: 7 });
          identifyContext = context;
          return true;
        }
      }
    }
  });

  assert.deepEqual(
    await resMan.Fetch(" RES:\\Data\\Profile.PICKLE "),
    { value: 7 }
  );
  assert.equal(identifyContext.resFilePath, "res:/data/profile.pickle");
  assert.equal(identifyContext.ext, "pickle");
  assert.equal(identifyContext.fileName, "profile.pickle");
  assert.equal(identifyContext.url, null);
});

function bytes(value)
{
  return new TextEncoder().encode(value);
}
