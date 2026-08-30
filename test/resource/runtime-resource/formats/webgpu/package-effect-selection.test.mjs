import { test } from "node:test";
import assert from "node:assert/strict";

import {
    buildWgslSelectionMetadata,
    parsePackageEffectArguments,
    selectPackageEffectStages,
    validateMatchingEffectResolution,
    validatePackageEffectPaths,
    validateResolvedPermutation
} from "./support/packageEffectSelection.js";

const STAGES = Object.freeze([
    { key: "Main.pass0.vertex", techniqueName: "Main", passIndex: 0, stageName: "vertex" },
    { key: "Main.pass0.pixel", techniqueName: "Main", passIndex: 0, stageName: "pixel" },
    { key: "Depth.pass0.vertex", techniqueName: "Depth", passIndex: 0, stageName: "vertex" },
    { key: "Depth.pass0.pixel", techniqueName: "Depth", passIndex: 0, stageName: "pixel" }
]);

test("package-effect keeps legacy all-stage selection when no flags are present", () =>
{
    const parsed = parsePackageEffectArguments([ "input.sm_lo", "output.carbonwebgpu" ]);

    assert.deepEqual(parsed.permutation, []);
    assert.equal(parsed.selection, null);
    assert.equal(parsed.overwrite, false);
    assert.deepEqual(selectPackageEffectStages(STAGES, parsed.selection), STAGES);
    assert.equal(buildWgslSelectionMetadata(parsed.selection, STAGES), null);
});

test("package-effect requires an explicit overwrite alias for existing output", () =>
{
    assert.equal(parsePackageEffectArguments([
        "input.sm_lo", "output.carbonwebgpu", "--overwrite"
    ]).overwrite, true);
    assert.equal(parsePackageEffectArguments([
        "input.sm_lo", "output.carbonwebgpu", "--force"
    ]).overwrite, true);
});

test("package-effect parses exact repeatable permutation assertions", () =>
{
    const parsed = parsePackageEffectArguments([
        "input.sm_lo",
        "output.carbonwebgpu",
        "--permutation", "BINDLESS_RENDERING=BINDLESS_RENDERING_DISABLED",
        "--permutation", "SPACE_OBJECT_PPT_ENABLED=SOPPT_ENABLED",
        "--technique", "Main",
        "--pass", "0"
    ]);

    assert.deepEqual(parsed.permutation, [
        { name: "BINDLESS_RENDERING", value: "BINDLESS_RENDERING_DISABLED" },
        { name: "SPACE_OBJECT_PPT_ENABLED", value: "SOPPT_ENABLED" }
    ]);
});

test("package-effect selects one explicitly asserted complete pass in ANLS order", () =>
{
    const parsed = parsePackageEffectArguments([
        "input.sm_lo",
        "output.carbonwebgpu",
        "--technique", "Main",
        "--pass", "0",
        "--stage", "pixel",
        "--stage", "vertex"
    ]);
    const selected = selectPackageEffectStages(STAGES, parsed.selection);

    assert.deepEqual(selected.map((stage) => stage.key), [ "Main.pass0.vertex", "Main.pass0.pixel" ]);
    assert.deepEqual(buildWgslSelectionMetadata(parsed.selection, selected), {
        mode: "explicit",
        completePasses: true,
        techniqueName: "Main",
        passIndex: 0,
        requestedStageNames: [ "vertex", "pixel" ],
        selectedStageKeys: [ "Main.pass0.vertex", "Main.pass0.pixel" ]
    });
});

test("package-effect accepts an explicitly asserted compute-only pass", () =>
{
    const stages = [
        { key: "Compute.pass0.compute", techniqueName: "Compute", passIndex: 0, stageName: "compute" }
    ];
    const parsed = parsePackageEffectArguments([
        "input.sm_hi", "output.carbonwebgpu",
        "--technique", "Compute", "--pass", "0", "--stage", "compute"
    ]);

    assert.deepEqual(selectPackageEffectStages(stages, parsed.selection), stages);
    assert.deepEqual(buildWgslSelectionMetadata(parsed.selection, stages), {
        mode: "explicit",
        completePasses: true,
        techniqueName: "Compute",
        passIndex: 0,
        requestedStageNames: [ "compute" ],
        selectedStageKeys: [ "Compute.pass0.compute" ]
    });
});

const invalidArguments = [
    [ [ "input", "output", "extra" ], /Usage/u ],
    [ [ "input", "output", "--unknown" ], /Unknown/u ],
    [ [ "input", "output", "--pass", "0" ], /requires --technique/u ],
    [ [ "input", "output", "--technique", "Main", "--pass", "-1" ], /non-negative integer/u ],
    [ [ "input", "output", "--technique", "Main", "--pass", "1.5" ], /non-negative integer/u ],
    [ [ "input", "output", "--stage", "vertex" ], /requires --technique and --pass/u ],
    [ [ "input", "output", "--technique", "Main", "--pass", "0", "--stage", "vertex", "--stage", "vertex" ], /duplicated/u ],
    [ [ "input", "output", "--permutation", "SPACE_OBJECT_PPT_ENABLED" ], /NAME=VALUE/u ],
    [ [ "input", "output", "--permutation", "=SOPPT_ENABLED" ], /NAME=VALUE/u ],
    [ [ "input", "output", "--permutation", "A=B=C" ], /NAME=VALUE/u ],
    [ [ "input", "output", "--permutation", "A=B", "--permutation", "A=C" ], /duplicates axis A/u ]
];

for (const [ args, pattern ] of invalidArguments)
{
    test(`package-effect rejects invalid arguments: ${args.join(" ")}`, () =>
    {
        assert.throws(() => parsePackageEffectArguments(args), pattern);
    });
}

test("package-effect rejects missing selectors and incomplete stage assertions", () =>
{
    const unknown = parsePackageEffectArguments([ "input", "output", "--technique", "Unknown" ]);
    assert.throws(() => selectPackageEffectStages(STAGES, unknown.selection), /Unknown effect technique/u);

    const missingPass = parsePackageEffectArguments([ "input", "output", "--technique", "Main", "--pass", "4" ]);
    assert.throws(() => selectPackageEffectStages(STAGES, missingPass.selection), /Unknown effect pass/u);

    const incomplete = parsePackageEffectArguments([
        "input", "output", "--technique", "Main", "--pass", "0", "--stage", "vertex"
    ]);
    assert.throws(() => selectPackageEffectStages(STAGES, incomplete.selection), /unlisted pixel/u);
});

test("package-effect rejects malformed and duplicate ANLS stage records", () =>
{
    assert.throws(
        () => selectPackageEffectStages([ { ...STAGES[0], key: "wrong" } ], null),
        /malformed/u
    );
    assert.throws(
        () => selectPackageEffectStages([ STAGES[0], { ...STAGES[0] } ], null),
        /duplicate stage/u
    );
});

test("package-effect fails closed on structurally valid but unsupported stage kinds", () =>
{
    const compute = { key: "Main.pass0.compute", techniqueName: "Main", passIndex: 0, stageName: "compute" };
    const geometry = { key: "Main.pass0.geometry", techniqueName: "Main", passIndex: 0, stageName: "geometry" };

    assert.deepEqual(selectPackageEffectStages([ compute ], null), [ compute ]);
    assert.throws(
        () => selectPackageEffectStages([ geometry ], null),
        /stage Main\.pass0\.geometry kind geometry is not supported/u
    );
    assert.throws(
        () => selectPackageEffectStages([ STAGES[0], compute ], null),
        /pass Main\.pass0 cannot mix compute and render stages/u
    );
});

test("package-effect requires requested permutations to resolve exactly", () =>
{
    const selected = [
        { name: "BINDLESS_RENDERING", value: "BINDLESS_RENDERING_DISABLED" },
        { name: "SPACE_OBJECT_PPT_ENABLED", value: "SOPPT_ENABLED" }
    ];
    assert.equal(validateResolvedPermutation([
        { name: "SPACE_OBJECT_PPT_ENABLED", value: "SOPPT_ENABLED" }
    ], selected), true);
    assert.throws(
        () => validateResolvedPermutation([ { name: "MISSING", value: "ON" } ], selected),
        /Unknown effect permutation axis MISSING/u
    );
    assert.throws(
        () => validateResolvedPermutation([
            { name: "SPACE_OBJECT_PPT_ENABLED", value: "SOPPT_DISABLED" }
        ], selected),
        /requested SOPPT_DISABLED but resolved SOPPT_ENABLED/u
    );
    assert.throws(
        () => validateResolvedPermutation([
            { name: "SPACE_OBJECT_PPT_ENABLED", value: "SOPPT_ENABLED" },
            { name: "SPACE_OBJECT_PPT_ENABLED", value: "SOPPT_ENABLED" }
        ], selected),
        /duplicates axis/u
    );
});

test("package-effect rejects input overwrite and mismatched bytecode resolution", () =>
{
    assert.equal(validatePackageEffectPaths("input.sm_lo", "output.carbonwebgpu"), true);
    assert.throws(
        () => validatePackageEffectPaths("E:/Effects/Quad.sm_lo", "e:/effects/quad.sm_lo", "win32"),
        /must not overwrite/u
    );
    const selectedOptions = [
        { name: "SPACE_OBJECT_PPT_ENABLED", value: "SOPPT_ENABLED", optionIndex: 1 }
    ];
    assert.equal(validateMatchingEffectResolution(
        { bodyIndex: 4, selectedOptions },
        { bodyIndex: 4, selectedOptions }
    ), true);
    assert.throws(
        () => validateMatchingEffectResolution(
            { bodyIndex: 4, selectedOptions },
            { bodyIndex: 0, selectedOptions: [ { ...selectedOptions[0], value: "SOPPT_DISABLED", optionIndex: 0 } ] }
        ),
        /body indices do not match/u
    );
});
