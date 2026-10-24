import { writeBackendBlock } from "../../../../../src/resource/format/carbonEffect/carbonEffectBackendBlock.js";
import test from "node:test";
import assert from "node:assert/strict";
import { CjsCarbonEffectFormat } from "../../../../../src/resource/formats/carbonEffect/index.js";
import { CjsHlslFormat } from "../../../../../src/resource/formats/hlsl/index.js";
import { CjsCarbonEffectReader } from "../../../../../src/resource/format/carbonEffect/CjsCarbonEffectReader.js";
import { CjsCarbonEffectWriter } from "../../../../../src/resource/format/carbonEffect/CjsCarbonEffectWriter.js";
import { buildSyntheticDescription } from "../../format/carbonEffectSynthetic.js";

for (const backend of [false, true])
{
    test(`effect format preserves the existing writer bytes (backend blocks: ${backend})`, () =>
    {
        const description = buildSyntheticDescription();
        if (backend)
        {
            for (const technique of description.techniques)
            {
                for (const pass of technique.passes)
                {
                    const bytes = writeBackendBlock({ bindGroups: [], transforms: [] });
                    pass.backendBlock = { bytes, size: bytes.length };
                }
            }
        }
        const parts = {
            version: 15, compilerVersion: [1, 2, 3, 4], sourceHash: "a".repeat(32), backend,
            permutations: [{ name: "MODE", options: ["A", "B"], defaultOption: 1 }],
            bodies: [{ index: 0, description }, { index: 1, description }]
        };
        const original = new CjsCarbonEffectWriter(parts);
        for (const axis of parts.permutations) original.addPermutation(axis);
        for (const body of parts.bodies) original.addBody(body.index, body.description);
        const expected = original.toBytes();
        const bytes = CjsCarbonEffectFormat.write(parts);
        assert.deepEqual(bytes, expected);
        assert.deepEqual(new CjsCarbonEffectFormat().Write(parts), expected);
        const reader = CjsCarbonEffectFormat.read(bytes, { emit: "raw" });
        assert.equal(reader.constructor, CjsCarbonEffectReader);
        assert.equal(reader.records[0].offset, reader.records[1].offset, "identical bodies still alias");
        const decoded = CjsCarbonEffectFormat.readDescription(reader, 1, { backend });
        const again = CjsCarbonEffectFormat.readDescription(reader, 1, { backend });
        assert.notEqual(decoded, again, "format does not own a runtime shader cache");
        assert.deepEqual(CjsCarbonEffectFormat.write({
            ...parts,
            bodies: [{ index: 0, description: reader.readDescription(0, { backend }) }, { index: 1, description: reader.readDescription(1, { backend }) }]
        }), expected);
        decoded.techniques[0].name = "Changed";
        assert.equal(again.techniques[0].name, "Main");
        assert.equal(CjsCarbonEffectFormat.read(bytes).effect.techniques[0].name, "Main");
    });
}

test("historical HLSL format name is an alias, not a second implementation", () =>
{
    assert.equal(CjsHlslFormat, CjsCarbonEffectFormat);
    assert.equal(CjsCarbonEffectFormat.className, "CjsCarbonEffectFormat");
});

test("write failures retain the shared writer validation", () =>
{
    assert.throws(() => CjsCarbonEffectFormat.write({ version: 99, bodies: [] }), /version/i);
    assert.throws(() => CjsCarbonEffectFormat.write({ bodies: [] }), /body/i);
});
