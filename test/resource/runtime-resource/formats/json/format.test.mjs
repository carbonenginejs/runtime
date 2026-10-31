import assert from "node:assert/strict";
import { test } from "node:test";

import CjsJsonFormat, {
    CjsJsonFormat as NamedCjsJsonFormat,
} from "../../../../../npm/dist/resource/formats/json/index.js";
import { CjsJsonFormat as BarrelCjsJsonFormat } from "../../../../../npm/dist/resource/formats/index.js";

test("CjsJsonFormat is exported by name, by default and from the formats barrel", () =>
{
    assert.equal(CjsJsonFormat, NamedCjsJsonFormat);
    assert.equal(BarrelCjsJsonFormat, CjsJsonFormat);
    assert.deepEqual(CjsJsonFormat.extensions, [ ".json" ]);
    assert.equal(CjsJsonFormat.id, "CjsJsonFormat");
});

test("CjsJsonFormat parses text and UTF-8 bytes, stripping one BOM", () =>
{
    const value = { name: "Rifter", typeID: 587, tags: [ "frigate" ] };
    const text = JSON.stringify(value);

    assert.deepEqual(CjsJsonFormat.read(text), value);
    assert.deepEqual(CjsJsonFormat.read(new TextEncoder().encode(text)), value);
    assert.deepEqual(CjsJsonFormat.read(new TextEncoder().encode(text).buffer), value);
    assert.deepEqual(CjsJsonFormat.read("﻿" + text), value);
    assert.deepEqual(new CjsJsonFormat().Read(text), value);
});

test("CjsJsonFormat rejects invalid JSON, invalid UTF-8 and other inputs, naming the source", () =>
{
    assert.throws(() => CjsJsonFormat.read("{", { source: "res:/data/broken.json" }), /res:\/data\/broken\.json is not valid JSON/u);
    assert.throws(() => CjsJsonFormat.read(new Uint8Array([ 0xff ]), { source: "bad.json" }), /bad\.json is not valid UTF-8/u);
    assert.throws(() => CjsJsonFormat.read(42), TypeError);
    assert.throws(() => new CjsJsonFormat(null), TypeError);
});
