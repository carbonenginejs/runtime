import { test } from "node:test";
import assert from "node:assert/strict";
import { lowerBindingLayout } from "../../../../../src/resource/formats/webgpu/core/wgsl/lowerBindingLayout.js";
import { buildWgslBindingPlan } from "../../../../../src/resource/formats/webgpu/core/wgsl/buildWgslBindingPlan.js";

import { readBackendBlock, writeBackendBlock } from "../../../../../src/resource/format/carbonEffect/carbonEffectBackendBlock.js";

function program(stage = "pixel", uses = [ [ "sample_l", 0 ] ])
{
    const binding = (resourceKind, registerIndex, declarationOffset) => ({
        id: `${resourceKind}:${registerIndex}`, resourceKind, registerIndex, declarationOffset,
        range: { lowerBound: registerIndex, registerSpace: 0, registerCount: 1, unbounded: false },
        ...(resourceKind === "sampled-resource" ? {
            resourceDimension: "texture2d", returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
        } : {})
    });
    return {
        format: "CJS_SHADER_IR", formatVersion: 1, stage,
        declarations: [ 0, 1 ].map((registerIndex) => ({ dxbcOffset: registerIndex + 10, data: { samplerModeName: "default" } })),
        bindings: [ binding("sampled-resource", 0, 1), binding("sampler", 0, 10), binding("sampler", 1, 11) ],
        instructions: uses.map(([ opcodeName, registerIndex ]) => ({
            opcodeName, isDeclaration: false, operands: [
                { typeName: "resource", registerIndex: 0 },
                ...(registerIndex === null ? [] : [ { typeName: "sampler", registerIndex } ])
            ]
        }))
    };
}

function sampler(registerIndex, overrides = {})
{
    return { kind: "sampler", registerSpace: 0, registerIndex, carbon: { sampler: {
        isDynamic: false, comparison: false, minFilter: 1, magFilter: 1, mipFilter: 1, ...overrides
    } } };
}

test("immutable Carbon point samplers accept unfilterable float samples and gathers", () =>
{
    for (const mipFilter of [ 0, 1 ])
    {
        const ir = program("pixel", [ [ "sample_l", 0 ], [ "gather4", 0 ], [ "ld", null ], [ "resinfo", null ] ]);
        const plan = buildWgslBindingPlan([ ir ], { semanticBindings: { pixel: [ sampler(0, { mipFilter }) ] } });
        assert.equal(plan.bindings.find((entry) => entry.generatedSymbol === "t0").texture.sampleType, "unfilterable-float");
        assert.equal(plan.bindings.find((entry) => entry.generatedSymbol === "s0").sampler.type, "non-filtering");
        const emitted = lowerBindingLayout(ir, structuredClone(plan));
        assert.equal(emitted.find((entry) => entry.generatedSymbol === "t0").texture.sampleType, "unfilterable-float");
        assert.equal(emitted.find((entry) => entry.generatedSymbol === "s0").sampler.type, "non-filtering");
    }
});

test("one texture used by point and linear samplers remains filterable", () =>
{
    const ir = program("pixel", [ [ "sample_l", 0 ], [ "sample", 1 ] ]);
    const plan = buildWgslBindingPlan([ ir ], { semanticBindings: { pixel: [ sampler(0), sampler(1, { magFilter: 2 }) ] } });
    assert.equal(plan.bindings[0].texture.sampleType, "float");
    assert.deepEqual(plan.bindings.filter((entry) => entry.sampler).map((entry) => entry.sampler.type), [ "non-filtering", "filtering" ]);
});

test("dynamic, missing, comparison and filtering sampler metadata stays conservative", () =>
{
    const ir = program();
    for (const bindings of [ [], [ sampler(0, { isDynamic: true }) ], [ sampler(0, { isDynamic: undefined }) ],
        [ sampler(0, { comparison: true }) ], [ sampler(0, { mipFilter: 2 }) ], [ sampler(0, { minFilter: 3 }) ] ])
    {
        const plan = buildWgslBindingPlan([ ir ], { semanticBindings: { pixel: bindings } });
        assert.equal(plan.bindings[0].texture.sampleType, "float");
        assert.equal(plan.bindings[1].sampler.type, "filtering");
    }
});

test("equal sampler registers in vertex and pixel stages retain independent filtering", () =>
{
    const vertex = program("vertex"), pixel = program("pixel");
    const plan = buildWgslBindingPlan([ vertex, pixel ], { semanticBindings: {
        vertex: [ sampler(0, { minFilter: 2, magFilter: 2, mipFilter: 2 }) ], pixel: [ sampler(0) ]
    } });
    assert.equal(lowerBindingLayout(vertex, plan)[0].texture.sampleType, "float");
    assert.equal(lowerBindingLayout(pixel, plan)[0].texture.sampleType, "unfilterable-float");
    assert.throws(() => buildWgslBindingPlan([ vertex, pixel ], {
        semanticBindings: { vertex: [ sampler(0, { minFilter: 2 }) ], pixel: [ sampler(0) ] },
        sharedIdentities: [ "sampler:0:0" ]
    }), /incompatible stage declarations/u);
});

test("load-only textures retain their existing unfilterable layout without sampler metadata", () =>
{
    const ir = program("pixel", [ [ "ld", null ], [ "resinfo", null ] ]);
    assert.equal(lowerBindingLayout(ir)[0].texture.sampleType, "unfilterable-float");
    assert.equal(lowerBindingLayout(program("pixel", []))[0].texture.sampleType, "float");
});

test("SM5.1 range IDs resolve to the correct space/register before testing filtering", () =>
{
    const ir = program("pixel", [ [ "sample_l", 1 ] ]);
    for (const [ index, binding ] of ir.bindings.entries())
    {
        binding.registerIndex = 7 + index;
        binding.range = { ...binding.range, lowerBound: 7 + index, registerSpace: 2, rangeId: index === 0 ? 4 : 2 - index };
    }
    ir.instructions[0].operands[0] = {
        typeName: "resource", registerIndex: 4,
        resourceReference: { rangeId: 4, absoluteIndex: { relative: false, values: [ 7 ] } }
    };
    ir.instructions[0].operands[1] = {
        typeName: "sampler", registerIndex: 1,
        resourceReference: { rangeId: 1, absoluteIndex: { relative: false, values: [ 8 ] } }
    };
    const point = { ...sampler(8), registerSpace: 2 };
    const linear = { ...sampler(9, { minFilter: 2 }), registerSpace: 2 };
    const plan = buildWgslBindingPlan([ ir ], { semanticBindings: { pixel: [ point, linear ] } });
    assert.equal(lowerBindingLayout(ir, plan)[0].texture.sampleType, "unfilterable-float");
    ir.instructions[0].operands[1] = {
        typeName: "sampler", registerIndex: 0,
        resourceReference: { rangeId: 0, absoluteIndex: { relative: false, values: [ 9 ] } }
    };
    const mixed = buildWgslBindingPlan([ ir ], { semanticBindings: { pixel: [ point, linear ] } });
    assert.equal(mixed.bindings[0].texture.sampleType, "float");
});

test("SM5.1 sampler range collisions across register spaces cannot select a point sampler", () =>
{
    const ir = program();
    ir.bindings[0].range.rangeId = 4;
    ir.bindings[1].range.rangeId = 1;
    ir.bindings[2].registerIndex = 5;
    ir.bindings[2].range = { lowerBound: 5, registerSpace: 1, registerCount: 1, unbounded: false, rangeId: 0 };
    ir.instructions[0].operands = [
        { typeName: "resource", registerIndex: 4, resourceReference: { rangeId: 4, absoluteIndex: { relative: false, values: [ 0 ] } } },
        { typeName: "sampler", registerIndex: 0, resourceReference: { rangeId: 0, absoluteIndex: { relative: false, values: [ 5 ] } } }
    ];
    const plan = buildWgslBindingPlan([ ir ], { semanticBindings: { pixel: [
        sampler(0), { ...sampler(5, { minFilter: 2 }), registerSpace: 1 }
    ] } });
    assert.equal(lowerBindingLayout(ir, plan)[0].texture.sampleType, "float");
    assert.equal(plan.bindings.find((entry) => entry.generatedSymbol === "s5_space1").sampler.type, "filtering");
});
test("packaged point, mixed, dynamic and stage-scoped layouts retain sampler filtering", () =>
{
    for (const pixelBindings of [ [ sampler(0) ], [ sampler(0), sampler(1, { minFilter: 2 }) ],
        [ sampler(0, { isDynamic: true }) ], [] ])
    {
        const vertex = program("vertex"), pixel = program("pixel", [ [ "sample_l", 0 ], [ "sample_l", 1 ] ]);
        const plan = buildWgslBindingPlan([ vertex, pixel ], { semanticBindings: {
            vertex: [ sampler(0) ], pixel: pixelBindings
        } });
        const bindGroups = [ { group: 0, bindings: plan.bindings.map((binding) => ({ ...binding, visibility: binding.stages })) } ];
        const decoded = readBackendBlock(writeBackendBlock({ bindGroups })).bindGroups[0].bindings;
        assert.deepEqual(decoded.map((binding) => [ binding.texture, binding.sampler ]),
            plan.bindings.map((binding) => [ binding.texture, binding.sampler ]));
        assert.equal(decoded.some((binding) => "samplerBindingType" in binding), false);
    }
});

test("the backend block rejects unknown sampler binding types", () =>
{
    const plan = buildWgslBindingPlan([ program() ], { semanticBindings: { pixel: [ sampler(0) ] } });
    plan.bindings.find((binding) => binding.sampler).sampler.type = "invalid";
    assert.throws(() => writeBackendBlock({ bindGroups: [ { group: 0, bindings: plan.bindings.map((binding) => ({ ...binding, visibility: binding.stages })) } ] }),
        /Unknown sampler binding type/u);
});
