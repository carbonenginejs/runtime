import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { carbonDescriptionFromPortable } from "../../src/format/carbonEffect/carbonDescriptionFromPortable.js";

/**
 * Guards the whole `*Raw` class, not the one field that got it wrong.
 *
 * The portable reflection stores certain float values as raw 32-bit patterns —
 * `mipLODBiasRaw`, `minLODRaw`, `maxLODRaw`, `borderColorRaw` — because JSON cannot
 * round-trip `-FLT_MAX` through a decimal. That is a legitimate property of the
 * hydration boundary and it does not go away when the wire format changes: the trap
 * simply stays at the mapping seam, waiting for the next field somebody adds with
 * that suffix.
 *
 * Assigning such a field straight into a `float` record slot passes every structural
 * check by construction — right length, right position, sound arena, exhaustive
 * parse — and writes `4286578687.0` where the file says `-3.4028235e38`. Only a
 * comparison against the source file catches it, and only for effects that happen to
 * use an extreme value.
 */

const MAPPING_SOURCE = new URL(
    "../../src/format/carbonEffect/carbonDescriptionFromPortable.js",
    import.meta.url
);

/**
 * Fields whose name ends in `Raw` but which are deliberately not reinterpreted.
 *
 * Keep this empty unless there is a reason; each entry is a place the class guard
 * does not protect.
 */
const ALLOWED_DIRECT_RAW = new Set();

test("every *Raw source field is reinterpreted, never assigned into a float slot", async () =>
{
    const source = await readFile(MAPPING_SOURCE, "utf8");
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
            // Same line, deliberately. A window that spanned neighbouring lines
            // would let a correct call on an adjacent line vouch for a broken one —
            // verified: with a three-line window, breaking `minLOD` went undetected
            // because the `maxLOD` line below it was still correct. Keeping the rule
            // to one line costs only that raw mappings be written on one line.
            if (lines[index].includes("floatFromRaw")) continue;
            offenders.push(`${field} at line ${index + 1}: ${lines[index].trim()}`);
        }
    }

    assert.deepEqual(
        offenders,
        [],
        `raw bit patterns assigned without reinterpretation: ${offenders.join(", ")}`
    );

    // The guard is only meaningful if the pattern it looks for actually occurs.
    assert.ok(
        /floatFromRaw/u.test(code),
        "no floatFromRaw call found; the raw-field guard is checking nothing"
    );
});

test("a raw bit pattern maps to the float it encodes, not to its integer value", () =>
{
    // 0xff7fffff is -FLT_MAX. Read as an integer it is 4286578687, which is what a
    // direct assignment produced before this was caught.
    const NEGATIVE_FLT_MAX_BITS = 0xff7fffff;
    const POSITIVE_FLT_MAX_BITS = 0x7f7fffff;

    const reflection = {
        effect: {
            techniques: [ {
                name: "Main",
                passes: [ {
                    renderStates: [],
                    stages: [ {
                        stageType: 0,
                        sourceProgram: { shaderSize: 0, bytes: new Uint8Array(0) },
                        input: {
                            constantDefaults: { declaredByteLength: 0, bytes: new Uint8Array(0) },
                            constants: [],
                            resources: [],
                            uavs: [],
                            annotations: [],
                            samplers: [ {
                                registerIndex: 0,
                                name: "DiffuseSampler",
                                isDynamic: true,
                                descriptor: {
                                    comparison: false,
                                    minFilter: 2, magFilter: 2, mipFilter: 2,
                                    addressU: 1, addressV: 1, addressW: 1,
                                    mipLODBiasRaw: NEGATIVE_FLT_MAX_BITS,
                                    maxAnisotropy: 8,
                                    comparisonFunc: 0,
                                    borderColorRaw: [ 0, 0x3f800000, 0, POSITIVE_FLT_MAX_BITS ],
                                    minLODRaw: NEGATIVE_FLT_MAX_BITS,
                                    maxLODRaw: POSITIVE_FLT_MAX_BITS
                                }
                            } ],
                            signature: {
                                pipelineInputs: [],
                                registers: [],
                                staticSamplers: [ {
                                    registerIndex: 3,
                                    registerSpace: 0,
                                    descriptor: {
                                        comparison: false,
                                        minFilter: 1, magFilter: 1, mipFilter: 1,
                                        addressU: 0, addressV: 0, addressW: 0,
                                        mipLODBiasRaw: 0x3f800000,
                                        maxAnisotropy: 1,
                                        comparisonFunc: 0,
                                        borderColor: 2,
                                        minLODRaw: NEGATIVE_FLT_MAX_BITS,
                                        maxLODRaw: POSITIVE_FLT_MAX_BITS
                                    }
                                } ],
                                threadGroupSize: { x: 0, y: 0, z: 0 }
                            }
                        }
                    } ]
                } ],
                libraries: []
            } ],
            annotations: []
        }
    };

    const stage = carbonDescriptionFromPortable(reflection).techniques[0].passes[0].stages[0];

    const sampler = stage.samplers[0];
    assert.equal(sampler.minLOD, -3.4028234663852886e+38);
    assert.equal(sampler.maxLOD, 3.4028234663852886e+38);
    assert.equal(sampler.mipLODBias, -3.4028234663852886e+38);
    assert.deepEqual(sampler.borderColor, [ 0, 1, 0, 3.4028234663852886e+38 ]);
    assert.notEqual(sampler.minLOD, NEGATIVE_FLT_MAX_BITS);

    const staticSampler = stage.staticSamplers[0];
    assert.equal(staticSampler.mipLODBias, 1);
    assert.equal(staticSampler.minLOD, -3.4028234663852886e+38);
    assert.equal(staticSampler.maxLOD, 3.4028234663852886e+38);
    // Border colour on a static sampler is a one-byte enum, not a raw float.
    assert.equal(staticSampler.borderColor, 2);
});
