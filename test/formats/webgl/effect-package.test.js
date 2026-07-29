import assert from "node:assert/strict";
import test from "node:test";

import { CjsHlslFormat } from "../../../src/formats/hlsl/index.js";
import {
    buildEffectBodyReflection
} from "../../../src/formats/hlsl/portable.js";

import CjsWebglFormat from "../../../src/formats/webgl/index.js";
import {
    buildCewgPackage,
    buildMinimalStagedEffectBytes
} from "./synthetic.js";

test("buildEffect converts compiled-effect bytes without filesystem dependencies", () =>
{
    const source = buildMinimalStagedEffectBytes({ version: 15 });
    const logicalPath = "res:/graphics/effect.dx11/synthetic.sm_hi";
    const result = CjsWebglFormat.buildEffect(source, {
        source: logicalPath,
        sourceIdentity: {
            filePath: logicalPath,
            logicalPath,
            game: "Eve",
            build: "3430261",
            md5: "00000000000000000000000000000000"
        },
        allPermutations: false,
        allowFailures: true
    });

    assert.equal(CjsWebglFormat.isCewg(result.bytes), true);
    assert.equal(result.info.sourceIdentity.logicalPath, logicalPath);
    assert.match(result.info.sourceIdentity.sha256, /^[0-9a-f]{64}$/u);
    assert.equal(result.info.permutationMode, "selected");
    assert.equal(result.glsl.stages[0].stageName, "vertex");
    assert.equal(result.qualification.level, "diagnostic");
    assert.deepEqual(CjsWebglFormat.read(result.bytes).info, result.info);
});

test("buildEffect fails closed unless a diagnostic package is explicit", () =>
{
    assert.throws(
        () => CjsWebglFormat.buildEffect(buildMinimalStagedEffectBytes({ version: 15 }), {
            source: "res:/graphics/effect.dx11/synthetic.sm_hi",
            allPermutations: false
        }),
        /CEWG target is incomplete/u
    );
});

test("version 15 CEWG preserves every permutation's portable reflection", () =>
{
    const source = buildMinimalStagedEffectBytes({
        version: 15,
        permutations: [
            {
                name: "QUALITY",
                options: [ "LOW", "HIGH" ],
                defaultOption: 1,
                description: "quality",
                type: 1
            },
            {
                name: "SKINNED",
                options: [ "OFF", "ON" ],
                defaultOption: 0,
                description: "skinning",
                type: 1
            }
        ],
        bodyPassCounts: [ 1, 2, 1, 2 ],
        distinctBodyRanges: true
    });
    const result = CjsWebglFormat.buildEffect(source, {
        source: "synthetic.sm_depth",
        allowFailures: true
    });

    assert.deepEqual(
        result.inspection.chunks.map(({ tag }) => tag),
        [ "INFO", "META", "PGRF", "RFLX", "RBLB", "GLSL" ]
    );
    assert.equal(result.info.formatVersion, 3);
    assert.equal(result.info.sourceBodyCoverage, "all-unique");
    assert.equal(result.info.backendBodyCoverage, "all");
    assert.deepEqual(result.info.completeness, {
        packageValid: true,
        sourceComplete: true,
        backendComplete: false,
        runtimeComplete: false
    });
    assert.equal(result.permutationGraph.variants.length, 4);
    assert.equal(result.permutationGraph.bodies.length, 2);
    assert.equal(result.metadata.bodies.length, 4);
    assert.equal(result.reflection.bodies.length, 2);
    assert.equal(result.info.effectReflection.formatVersion, 2);
    assert.match(result.info.effectReflection.sha256, /^[0-9a-f]{64}$/u);

    const raw = CjsWebglFormat.read(result.bytes, {
        emit: CjsWebglFormat.OUTPUT_RAW
    });
    const effectRes = CjsHlslFormat.read(source, {
        emit: CjsHlslFormat.OUTPUT_RAW,
        source: "synthetic.sm_depth"
    });
    for (let permutationIndex = 0; permutationIndex < 4; permutationIndex++)
    {
        assert.deepEqual(
            raw.GetPortableEffectReflection(permutationIndex),
            buildEffectBodyReflection(effectRes, permutationIndex)
        );
    }

    const first = raw.GetPortableEffectReflection();
    first.source.nativeHash[0] ^= 0xff;
    first.effect.techniques[0].passes[0].stages[0]
        .sourceProgram.bytes[0] ^= 0xff;
    assert.deepEqual(
        raw.GetPortableEffectReflection(),
        buildEffectBodyReflection(effectRes, result.info.defaultPermutationIndex)
    );

    const selected = CjsWebglFormat.buildEffect(source, {
        source: "synthetic.sm_depth",
        allPermutations: false,
        allowFailures: true
    });
    assert.equal(selected.info.permutationMode, "selected");
    assert.equal(selected.info.backendBodyCoverage, "selected");
    assert.equal(selected.info.sourcePermutationCount, 4);
    assert.equal(selected.info.sourceUniqueBodyCount, 2);
    assert.equal(selected.info.completeness.sourceComplete, true);
    assert.equal(selected.metadata.variants.length, 1);
    assert.equal(selected.metadata.variants[0].permutationIndex, 1);
    assert.deepEqual(
        selected.bytes,
        CjsWebglFormat.buildEffect(source, {
            source: "synthetic.sm_depth",
            allPermutations: false,
            allowFailures: true
        }).bytes
    );
});

test("filtered version 15 CEWG cannot overclaim backend completeness", () =>
{
    const result = CjsWebglFormat.buildEffect(
        buildMinimalStagedEffectBytes({ version: 15 }),
        {
            source: "synthetic.sm_depth",
            stage: "vertex",
            allowFailures: true
        }
    );

    assert.equal(result.info.sourceBodyCoverage, "all-unique");
    assert.equal(result.info.backendBodyCoverage, "all");
    assert.equal(result.info.backendProgramCoverage, "filtered");
    assert.equal(result.info.completeness.sourceComplete, true);
    assert.equal(result.info.completeness.backendComplete, false);
    assert.doesNotThrow(() => CjsWebglFormat.read(result.bytes));
});


test("CEWG reflection chunks and digests fail closed", () =>
{
    const result = CjsWebglFormat.buildEffect(
        buildMinimalStagedEffectBytes({ version: 15 }),
        {
            source: "synthetic.sm_depth",
            allowFailures: true
        }
    );
    const raw = CjsWebglFormat.read(result.bytes, {
        emit: CjsWebglFormat.OUTPUT_RAW
    });
    const rebuild = (mutate = {}, omitted = []) => CjsWebglFormat.build(
        raw.chunks
            .filter(({ tag }) => !omitted.includes(tag))
            .map(({ tag, bytes }) =>
            {
                if (!mutate[tag]) return [ tag, Uint8Array.from(bytes) ];
                const value = tag === "RBLB"
                    ? Uint8Array.from(bytes)
                    : raw.GetJson(tag);
                mutate[tag](value);
                return [ tag, value ];
            })
    );

    assert.throws(
        () => CjsWebglFormat.read(rebuild({}, [ "RFLX" ])),
        /requires RFLX and RBLB/u
    );
    assert.throws(
        () => CjsWebglFormat.read(rebuild({
            INFO: (value) => { value.permutationGraph.sha256 = "a".repeat(64); }
        })),
        /digest disagrees with PGRF/u
    );
    assert.throws(
        () => CjsWebglFormat.read(rebuild({
            RBLB: (value) => { value[0] ^= 0xff; }
        })),
        /blob-store envelope disagrees|digest/u
    );
    assert.throws(
        () => CjsWebglFormat.build([
            [ "INFO", { ok: true } ],
            [ "INFO", { ok: false } ]
        ]),
        /duplicate chunk tag/u
    );
    assert.throws(
        () => CjsWebglFormat.read(buildCewgPackage([
            [ "INFO", { ok: true } ],
            [ "INFO", { ok: false } ]
        ])),
        /duplicate chunk tag/u
    );
    assert.throws(
        () => CjsWebglFormat.read(CjsWebglFormat.build([
            [ "INFO", new Uint8Array([ 0x7b, 0xff, 0x7d ]) ]
        ])),
        /encoded|UTF-8|JSON/u
    );
});

test("canonical CEWG validation rejects forged backend and runtime graphs", () =>
{
    const result = CjsWebglFormat.buildEffect(
        buildMinimalStagedEffectBytes({ version: 15 }),
        {
            source: "synthetic.sm_depth",
            allowFailures: true
        }
    );
    const raw = CjsWebglFormat.read(result.bytes, {
        emit: CjsWebglFormat.OUTPUT_RAW
    });
    const rebuild = (mutate) => CjsWebglFormat.build(raw.chunks.map((chunk) =>
    {
        if (!mutate[chunk.tag])
        {
            return [ chunk.tag, Uint8Array.from(chunk.bytes) ];
        }
        const value = chunk.tag === "RBLB"
            ? Uint8Array.from(chunk.bytes)
            : raw.GetJson(chunk.tag);
        mutate[chunk.tag](value);
        return [ chunk.tag, value ];
    }));
    const rejected = [
        {
            INFO: (value) => { value.sourceEffectVersion = 14; }
        },
        {
            META: (value) => { value.sourcePath = "evil.sm_depth"; }
        },
        {
            GLSL: (value) => { value.selection.stage = "pixel"; }
        },
        {
            INFO: (value) => { value.packageKind = "tr2-effect-webgl"; }
        },
        {
            META: (value) => { value.variants[0].bodyKey = "missing"; },
            GLSL: (value) => { value.variants[0].bodyKey = "missing"; }
        },
        {
            GLSL: (value) => { value.bodies[0].stages = [ "missing" ]; }
        },
        {
            META: (value) => { value.bodies[0].manifest.passes[0].states = [ 1 ]; }
        }
    ];
    for (const mutations of rejected)
    {
        assert.throws(() => CjsWebglFormat.read(rebuild(mutations)));
    }

    const generic = CjsWebglFormat.read(rebuild({
        INFO: (value) => { value.packageKind = "generic-cewg"; },
        RFLX: (value) => { value.bodies[0].sha256 = "0".repeat(64); }
    }), {
        emit: CjsWebglFormat.OUTPUT_RAW
    });
    assert.equal(generic.GetPortableEffectReflection(0), null);
});

test("CEWG source SHA-256 is an assertion, not caller-authored metadata", () =>
{
    assert.throws(
        () => CjsWebglFormat.buildEffect(
            buildMinimalStagedEffectBytes({ version: 15 }),
            {
                sourceIdentity: { sha256: "0".repeat(64) },
                allowFailures: true
            }
        ),
        /does not match the exact effect input bytes/u
    );
});
