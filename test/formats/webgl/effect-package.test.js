import assert from "node:assert/strict";
import test from "node:test";

import CjsWebglFormat from "../../../src/formats/webgl/index.js";
import {
    inspectGlslEffectContainer
} from "../../../src/formats/webgl/core/inspectGlslEffectContainer.js";
import { buildMinimalStagedEffectBytes } from "./synthetic.js";

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

    // `bytes` is the container now, so what is asserted is that it reads back as
    // one. The build result still carries `info`/`glsl` — that is the in-memory
    // translation, which is richer than the wire and is where the provenance and
    // the qualification verdict live.
    assert.equal(inspectGlslEffectContainer(result.bytes).version, 15);
    assert.equal(result.info.sourceIdentity.logicalPath, logicalPath);
    assert.match(result.info.sourceIdentity.sha256, /^[0-9a-f]{64}$/u);
    assert.equal(result.info.permutationMode, "selected");
    assert.equal(result.glsl.stages[0].stageName, "vertex");
    assert.equal(result.qualification.level, "diagnostic");
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

test("version 15 packaging reports its permutation and body accounting", () =>
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

    // The inspection describes the container, not the chunk package. Four
    // permutations over two distinct bodies is exactly the row-aliasing the
    // container exists to do, so it is what the summary has to show: a tag list
    // could not have said this, and the counts here are the ones a reader of a
    // finished file would need to trust it.
    assert.equal(result.inspection.isContainer, true);
    assert.equal(result.inspection.version, 15);
    assert.equal(result.inspection.recordCount, 4);
    assert.equal(result.inspection.permutationProduct, 4);
    assert.equal(result.inspection.dense, true);
    assert.equal(result.inspection.uniqueBodyCount, 2);
    assert.equal(result.inspection.aliasedRowCount, 2);
    assert.deepEqual(
        result.inspection.permutationAxes.map(({ name, options }) => [ name, options ]),
        [ [ "QUALITY", [ "LOW", "HIGH" ] ], [ "SKINNED", [ "OFF", "ON" ] ] ]
    );
    assert.ok(!("chunks" in result.inspection), "container inspection must not report chunks");
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
    // These coverage fields used to be gated on a built reflection document.
    // They describe the source and the emitted bodies, so they now stand on the
    // version check that document was only ever a consequence of.
    assert.equal(result.info.sourceBodyCoverage, "all-unique");
    assert.equal(result.info.backendBodyCoverage, "all");

    // What used to be here: every permutation's portable reflection written into
    // the package's RFLX/RBLB chunks and read back through
    // `GetPortableEffectReflection`, plus a check that the accessor handed out a
    // defensive copy.
    //
    // That was a property of the chunk format. A Carbon container carries
    // Carbon's own per-stage reflection inside each body description instead —
    // `readGlslEffectContainer` reads it, and `glsl-effect-completeness.test.js` holds
    // the emitted GLSL against it. Serving portable reflection *from a container*
    // is the engine seam's job and does not exist yet, so the property is not
    // restated here in a weaker form; a stand-in assertion would read as coverage
    // that is not there.
    //
    // The body/permutation structure it also depended on is asserted above,
    // against the container: four records over two bodies.

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

    // A filtered build still emits a readable container; what it must not do is
    // claim to be complete, which the flags above assert.
    assert.doesNotThrow(() => inspectGlslEffectContainer(result.bytes));
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
