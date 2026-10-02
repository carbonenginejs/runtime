import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import "../../npm/dist/trinity/index.js";
import "../../npm/dist/sof/index.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { CjsBlackPropertyReaders } from "../../npm/dist/resource/formats/black/core/CjsBlackPropertyReaders.js";
import schema from "../../npm/dist/resource/formats/black/core/blackSchema.js";

// Existing build3503375 cache assets; no game bytes are committed. This covers
// six nonempty struct families. The cached3503375/3542233 corpus contains no
// quaternion-key, banner or timeline owners and no populated child transforms.
const corpus = process.env.CJS_BLACK_STRUCT_CORPUS_DIR;
const cases = [
    ["Tr2CurveScalarKey", "11/119f400e626e4e28_7c4b330b47c23cee3505a9d8cd495b58", 760,
        "632d3f3c03026a78d794d6519423fc1a7a120ea0a4e349f794bc62be7a67a6e2", 20, 5, "value", .5],
    ["Tr2ConstantEffectParameter", "23/239c7988b27b7d47_0cc28327a33385b16c42365fcba7deec", 4107,
        "5eb86d18c1c525a9e09d7fa9beb67744bc0bfaf50345f296571d69ce369b3b18", 24, 2, "name", "DiffuseColor"],
    ["Tr2ShaderOption", "82/82944ceeb7961003_b44af3868f5e44d0cbea39ea51e13604", 12480,
        "b3d8334813ecda1fed5490dc6a68262730d2db95a31e7724d93ca88cf3e92d34", 16, 4, "value", "REGULAR"],
    ["Tr2SamplerOverride", "25/25495c70c6958a45_137fde1e3cf4b1dcb786e02281c011e4", 47978,
        "f4d863c4a374d51108390f6559d380d00d996cb2ac2419b679da7bfca3af6a9d", 56, 1, "name", "DiffuseMapSampler"],
    ["Locator", "c2/c2bbe7c2e400058e_96093b35491cd5533757a276defd0c93", 44479,
        "1704e7dd32c2dd527e225f91a31871373e7666489824fe93a8fe61f368671200", 44, 19, "partTag", 0],
    ["EveSofDataMeshInstance", "35/350cf81f2f26b64b_a800b64240ea16a7efba1d1b96df3365", 184126948,
        "b888ce85f9040a49e2cfff6357e9e7ab89905818562562c7ec06e786b165afec", 44, 429, "boneIndex", 0]
];

for (const [family, path, size, sha256, stride, count, member, expected] of cases)
{
    test(`real Black corpus decodes ${family} from its class-owned layout`, {
        skip: !corpus && "Set CJS_BLACK_STRUCT_CORPUS_DIR to the existing ResFiles cache."
    }, context =>
    {
        const bytes = readFileSync(join(corpus, path));
        assert.equal(bytes.length, size);
        assert.equal(createHash("sha256").update(bytes).digest("hex"), sha256);
        const original = CjsBlackPropertyReaders.readStructureList;
        let first;
        context.mock.method(CjsBlackPropertyReaders, "readStructureList", (reader, descriptor) =>
        {
            const offset = reader.offset;
            const rows = original.call(CjsBlackPropertyReaders, reader, descriptor);
            if (!first && descriptor.structure?.name === family && rows.length)
            {
                first = rows;
                const view = new DataView(reader.data.buffer, reader.data.byteOffset, reader.data.byteLength);
                assert.equal(view.getUint16(offset + 4, true), stride);
            }
            return rows;
        });
        const reader = new CjsBlackReader(bytes, { schema, initialize: false });
        reader.ReadDocument();
        assert.ok(reader.reader.AtEnd());
        assert.deepEqual(reader.reports, []);
        assert.equal(first?.length, count);
        assert.equal(first[0][member], expected);
    });
}
