import test from "node:test";
import assert from "node:assert/strict";

import { CjsHlslFormat } from "../../../../src/resource/formats/hlsl/index.js";
import { enumerateUniqueEffectBodies } from "../../../../src/resource/format/effect/effectBodyInventory.js";
import {
    buildEffectBytes,
    buildPortableReflectionEffectBytes
} from "../formats/hlsl/synthetic.js";

/**
 * Grouping permutation rows onto the bodies they address.
 *
 * The two tests here outlived the effect-reflection document they were written
 * beside: the inventory is container geometry - offsets, ranges, byte equality -
 * and never carried reflection of its own.
 *
 * The alias test also asserts that enumerating bodies decodes nothing. Reading a
 * body registers shaders and render states with the effect state manager, so an
 * inventory that decoded would leave those registries larger than it found them.
 */

test("body inventory deduplicates exact aliases before decoding", () =>
{
    const bytes = buildPortableReflectionEffectBytes();
    const effectRes = CjsHlslFormat.read(bytes, {
        emit: CjsHlslFormat.OUTPUT_RAW,
        source: "inventory.sm_depth"
    });
    const cacheSize = effectRes.m_shaders.size;
    const registrySizes = [
        effectRes.effectStateManager.shaders.size,
        effectRes.effectStateManager.shaderPrograms.size,
        effectRes.effectStateManager.renderStates.size,
        effectRes.effectStateManager.shaderLibraries.size
    ];
    const groups = enumerateUniqueEffectBodies(effectRes);

    assert.deepEqual(groups, [ {
        permutationIndex: 0,
        sourceRecord: {
            offset: effectRes.m_offsets[0].offset,
            byteLength: effectRes.m_offsets[0].size
        },
        variants: [
            {
                permutationIndex: 0,
                sourceRecord: {
                    offset: effectRes.m_offsets[0].offset,
                    byteLength: effectRes.m_offsets[0].size
                }
            },
            {
                permutationIndex: 1,
                sourceRecord: {
                    offset: effectRes.m_offsets[1].offset,
                    byteLength: effectRes.m_offsets[1].size
                }
            }
        ]
    } ]);
    assert.equal(effectRes.m_shaders.size, cacheSize);
    assert.deepEqual([
        effectRes.effectStateManager.shaders.size,
        effectRes.effectStateManager.shaderPrograms.size,
        effectRes.effectStateManager.renderStates.size,
        effectRes.effectStateManager.shaderLibraries.size
    ], registrySizes);
    const distinctBytes = Uint8Array.from(bytes);
    distinctBytes[effectRes.m_offsets[1].offset + effectRes.m_offsets[1].size - 1]
        ^= 0xff;
    const distinct = CjsHlslFormat.read(distinctBytes, {
        emit: CjsHlslFormat.OUTPUT_RAW
    });
    assert.equal(enumerateUniqueEffectBodies(distinct).length, 2);

    assert.throws(
        () => enumerateUniqueEffectBodies(
            CjsHlslFormat.read(buildEffectBytes({ version: 8 }), {
                emit: CjsHlslFormat.OUTPUT_RAW
            })
        ),
        /version-15/u
    );
});

test("body inventory rejects malformed ranges and excessive records", () =>
{
    const data = new Uint8Array(8);
    const makeEffect = (offsets) => ({
        m_version: 15,
        m_data: data,
        m_offsets: offsets,
        m_offsetCount: offsets.length
    });

    assert.throws(
        () => enumerateUniqueEffectBodies(makeEffect([
            { index: 0, offset: 0, size: 4, end: 4 },
            { index: 1, offset: 2, size: 4, end: 6 }
        ])),
        /partially overlap/u
    );
    assert.throws(
        () => enumerateUniqueEffectBodies(makeEffect([
            { index: 1, offset: 0, size: 4, end: 4 }
        ])),
        /body index 0 disagrees/u
    );
    assert.throws(
        () => enumerateUniqueEffectBodies(makeEffect([
            { index: 0, offset: 0, size: 0, end: 0 }
        ])),
        /body index 0 disagrees/u
    );

    const excessive = Array.from({ length: 0x10001 }, (_, index) => ({
        index,
        offset: 0,
        size: 1,
        end: 1
    }));
    const maximum = enumerateUniqueEffectBodies(
        makeEffect(excessive.slice(0, 0x10000))
    );
    assert.equal(maximum.length, 1);
    assert.equal(maximum[0].variants.length, 0x10000);
    assert.throws(
        () => enumerateUniqueEffectBodies(makeEffect(excessive)),
        /exceeds 65536 records/u
    );
});
