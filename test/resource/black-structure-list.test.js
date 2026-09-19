import test from "node:test";
import assert from "node:assert/strict";
import { CjsBlackBinaryReader } from "../../src/resource/formats/black/core/CjsBlackBinaryReader.js";
import { CjsBlackPropertyReaders } from "../../src/resource/formats/black/core/CjsBlackPropertyReaders.js";

const structure = { name: "Tr2ConstantEffectParameter", size: 24, members: [
    { name: "name", offset: 0, type: "string" },
    { name: "value", offset: 8, type: "vector4" },
] };

function fixture(stride = 24, stringIndex = 0)
{
    const data = new DataView(new ArrayBuffer(30));
    data.setInt32(0, 1, true);
    data.setUint16(4, stride, true);
    data.setUint16(6, stringIndex, true);
    data.setUint32(8, 0xffffffff, true); // Padding must not become part of the string index.
    for (let i = 0; i < 4; i++) data.setFloat32(14 + i * 4, i / 4, true);
    return new CjsBlackBinaryReader(data, { info: { strings: [ "DirtColor1" ] } });
}

test("Black structure members retain uint16 shared-string references and padded vec4 values", () =>
{
    assert.deepEqual(CjsBlackPropertyReaders.readStructureList(fixture(), { structure }), [
        { name: "DirtColor1", value: [ 0, .25, .5, .75 ] },
    ]);
    assert.throws(() => CjsBlackPropertyReaders.readStructureList(fixture(16), { structure }), /Incompatible/);
    assert.throws(() => CjsBlackPropertyReaders.readStructureList(fixture(24, 1), { structure }), /string index/);
    assert.equal(CjsBlackPropertyReaders.readStructureList(fixture(), {}).$type, "black.structureList");
});
