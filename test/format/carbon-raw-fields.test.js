import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { Tr2SamplerSetup } from "../../src/resource/shader/sampler/Tr2SamplerSetup.js";
import { Tr2EffectStageInput } from "../../src/resource/shader/reflection/Tr2EffectStageInput.js";

/**
 * Guards the whole `*Raw` class, not the one field that got it wrong.
 *
 * The reflection classes store certain float values as raw 32-bit patterns —
 * `mipLODBiasRaw`, `minLODRaw`, `maxLODRaw`, `borderColorRaw` — so a value like
 * `-FLT_MAX` survives serialization without a decimal round trip. That is a
 * property of the hydration boundary and it did not go away when the mapping
 * moved off the intermediate document: the trap simply followed the seam, and it
 * now sits in the classes' own record emitters.
 *
 * Assigning such a field straight into a `float` record slot passes every
 * structural check by construction — right length, right position, sound arena,
 * exhaustive parse — and writes `4286578687.0` where the file says
 * `-3.4028235e38`. Only a comparison against real values catches it, and only for
 * effects that happen to use an extreme one.
 */

const MAPPING_SOURCES = [
    new URL(
        "../../src/resource/shader/sampler/Tr2SamplerSetup.js",
        import.meta.url
    ),
    new URL(
        "../../src/resource/shader/reflection/Tr2EffectStageInput.js",
        import.meta.url
    )
];

/**
 * Fields whose name ends in `Raw` but which are deliberately not reinterpreted.
 *
 * Keep this empty unless there is a reason; each entry is a place the class guard
 * does not protect.
 */
const ALLOWED_DIRECT_RAW = new Set();

const NEGATIVE_FLT_MAX_BITS = 0xff7fffff;
const POSITIVE_FLT_MAX_BITS = 0x7f7fffff;
const NEGATIVE_FLT_MAX = -3.4028234663852886e38;
const POSITIVE_FLT_MAX = 3.4028234663852886e38;

test("every *Raw source field is reinterpreted, never assigned into a float slot", async () =>
{
    let sawReinterpretation = false;

    for (const url of MAPPING_SOURCES)
    {
        const source = await readFile(url, "utf8");
        const code = source
            .replace(/^[ \t]*\/\*\*[\s\S]*?\*\//gmu, "")
            .replace(/^[ \t]*\/\/.*$/gmu, "");

        const offenders = [];
        const lines = code.split("\n");
        for (let index = 0; index < lines.length; index += 1)
        {
            // Only property *reads* — `.somethingRaw` — not the helper's own name.
            for (const match of lines[index].matchAll(/\.(?<field>[A-Za-z_$][\w$]*Raw)\b/gu))
            {
                const field = match.groups.field;
                if (ALLOWED_DIRECT_RAW.has(field)) continue;
                // Same line, deliberately. A window that spanned neighbouring
                // lines would let a correct call on an adjacent line vouch for a
                // broken one — verified: with a three-line window, breaking
                // `minLOD` went undetected because the `maxLOD` line below it was
                // still correct. Keeping the rule to one line costs only that raw
                // mappings be written on one line.
                if (lines[index].includes("toRecordFloat")) continue;
                offenders.push(
                    `${field} at line ${index + 1}: ${lines[index].trim()}`
                );
            }
        }

        assert.deepEqual(
            offenders,
            [],
            `raw bit patterns assigned without reinterpretation: ${offenders.join(", ")}`
        );
        if (/toRecordFloat/u.test(code)) sawReinterpretation = true;
    }

    // The guard is only meaningful if the pattern it looks for actually occurs.
    assert.ok(
        sawReinterpretation,
        "no toRecordFloat call found; the raw-field guard is checking nothing"
    );
});

test("a raw bit pattern maps to the float it encodes, not to its integer value", () =>
{
    // 0xff7fffff is -FLT_MAX. Read as an integer it is 4286578687, which is what
    // a direct assignment produced before this was caught.
    const sampler = new Tr2SamplerSetup();
    sampler.isDynamic = true;
    sampler.hasName = true;
    sampler.name = "Sampler";
    sampler.sampler = {
        comparison: false,
        minFilter: 0,
        magFilter: 0,
        mipFilter: 0,
        addressU: 0,
        addressV: 0,
        addressW: 0,
        mipLODBiasRaw: NEGATIVE_FLT_MAX_BITS,
        maxAnisotropy: 0,
        comparisonFunc: 0,
        borderColorRaw: [ NEGATIVE_FLT_MAX_BITS, 0, 0, POSITIVE_FLT_MAX_BITS ],
        minLODRaw: NEGATIVE_FLT_MAX_BITS,
        maxLODRaw: POSITIVE_FLT_MAX_BITS
    };

    const record = sampler.toCarbonBinary(0);

    assert.equal(record.mipLODBias, NEGATIVE_FLT_MAX);
    assert.equal(record.minLOD, NEGATIVE_FLT_MAX);
    assert.equal(record.maxLOD, POSITIVE_FLT_MAX);
    assert.deepEqual(record.borderColor, [
        NEGATIVE_FLT_MAX,
        0,
        0,
        POSITIVE_FLT_MAX
    ]);
});

test("a static sampler's raw fields are reinterpreted too", () =>
{
    // A static sampler is the easier one to miss: it lives inside the signature
    // rather than in the sampler map, and its border colour is a one-byte enum
    // where a dynamic sampler's is four floats.
    const input = new Tr2EffectStageInput();
    input.signature = {
        registers: [],
        staticSamplers: [ {
            registerIndex: 5,
            registerSpace: 1,
            descriptor: {
                comparison: true,
                minFilter: 0,
                magFilter: 0,
                mipFilter: 0,
                addressU: 0,
                addressV: 0,
                addressW: 0,
                mipLODBiasRaw: NEGATIVE_FLT_MAX_BITS,
                maxAnisotropy: 0,
                comparisonFunc: 0,
                borderColor: 2,
                minLODRaw: NEGATIVE_FLT_MAX_BITS,
                maxLODRaw: POSITIVE_FLT_MAX_BITS
            }
        } ]
    };

    const record = input.toCarbonBinaryInput();
    const staticSampler = record.staticSamplers[0];

    assert.equal(staticSampler.mipLODBias, NEGATIVE_FLT_MAX);
    assert.equal(staticSampler.minLOD, NEGATIVE_FLT_MAX);
    assert.equal(staticSampler.maxLOD, POSITIVE_FLT_MAX);
    // Still the enum, not a reinterpreted float.
    assert.equal(staticSampler.borderColor, 2);
});
