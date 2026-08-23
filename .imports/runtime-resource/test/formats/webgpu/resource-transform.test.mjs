import assert from "node:assert/strict";
import test from "node:test";

import CjsWebgpuFormat from "../../../src/formats/webgpu/index.js";
import {
    buildResourceTransformPlan
} from "../../../src/formats/webgpu/core/wgsl/buildResourceTransformPlan.js";

function register(typeName, registerIndex, options = {})
{
    return {
        typeName,
        componentCount: [ "resource", "sampler" ].includes(typeName) ? 0 : 4,
        mask: options.mask || "",
        swizzle: options.swizzle || "",
        selected: options.selected || "",
        modifierName: options.modifierName || "none",
        minPrecisionName: "default",
        registerIndex,
        indices: Number.isInteger(registerIndex)
            ? [ { values: [ registerIndex ], relative: null } ]
            : []
    };
}

function immediate(bits)
{
    return {
        ...register("immediate32", null, { swizzle: "xyzw" }),
        immediateValues: bits.map((uint32) => ({ uint32, float32: 0 }))
    };
}

function signature(semanticName, registerIndex, mask)
{
    return {
        semanticName,
        semanticIndex: 0,
        systemValueType: semanticName.startsWith("SV_") ? 1 : 0,
        componentType: 3,
        componentTypeName: "float32",
        registerIndex,
        mask,
        readWriteMask: mask,
        stream: 0,
        minPrecision: 0
    };
}

function instruction(offset, opcodeName, operands)
{
    return { offset, opcode: 0, opcodeName, isDeclaration: false, operands };
}

function declaration(offset, opcodeName, operandType, registerIndex, data)
{
    return {
        offset,
        opcode: 0,
        opcodeName,
        isDeclaration: true,
        declaration: { registerIndex, ...data },
        operands: [ register(operandType, registerIndex) ]
    };
}

function detailFixture(layerCount, duplicateDetail2Sample = false)
{
    const detailRegisters = Array.from({ length: layerCount }, (_, index) => 4 + index);
    const instructions = [
        {
            offset: 0,
            opcode: 0,
            opcodeName: "dcl_global_flags",
            isDeclaration: true,
            declaration: { globalFlags: 1 << 11, refactoringAllowed: true },
            operands: []
        },
        declaration(2, "dcl_sampler", "sampler", 0, { samplerModeName: "default" }),
        ...detailRegisters.map((registerIndex, index) =>
            declaration(4 + index * 2, "dcl_resource", "resource", registerIndex, {
                resourceDimensionName: "texture2d",
                returnType: { returnTypeNames: [ "float", "float", "float", "float" ] }
            })),
        {
            offset: 12,
            opcode: 0,
            opcodeName: "dcl_input_ps",
            isDeclaration: true,
            declaration: { registerIndex: 1, interpolationModeName: "linear" },
            operands: [ register("input", 1) ]
        }
    ];
    let offset = 16;
    for (let index = 0; index < layerCount; index += 1)
    {
        instructions.push(instruction(offset, "sample_b", [
            register("temp", index, { mask: "xyzw" }),
            register("input", 1, { swizzle: index === 1 ? "zwzz" : "xyxx" }),
            register("resource", detailRegisters[index], { swizzle: "xyzw" }),
            register("sampler", 0),
            immediate([ 0x3dcccccd ])
        ]));
        offset += 6;
    }
    if (duplicateDetail2Sample)
    {
        instructions.push(instruction(offset, "sample_b", [
            register("temp", layerCount, { mask: "xyzw" }),
            register("input", 1, { swizzle: "xyxx" }),
            register("resource", detailRegisters[1], { swizzle: "xyzw" }),
            register("sampler", 0),
            immediate([ 0x3dcccccd ])
        ]));
        offset += 6;
    }
    const sampledTemps = layerCount + (duplicateDetail2Sample ? 1 : 0);
    instructions.push(instruction(offset, "mov", [
        register("output", 0, { mask: "xyzw" }),
        register("temp", sampledTemps - 1, { swizzle: "xyzw" })
    ]));
    instructions.push(instruction(offset + 4, "ret", []));
    const decoded = {
        program: {
            programType: 0,
            programTypeName: "pixel",
            majorVersion: 5,
            minorVersion: 0
        },
        signatures: {
            input: [ signature("TEXCOORD", 1, 15) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions
    };
    const ir = CjsWebgpuFormat.buildShaderIr(decoded, {
        source: `synthetic-detail-${layerCount}`
    });
    const semanticBindings = detailRegisters.map((registerIndex, index) => ({
        kind: "resource",
        registerIndex,
        registerSpace: 0,
        registerCount: 1,
        arrayCount: 1,
        metadataName: `Detail${index + 1}Map`,
        carbon: {
            name: `Detail${index + 1}Map`,
            type: 2,
            arrayElements: 1,
            isSRGB: false,
            isAutoregister: false
        }
    }));
    return { ir, semanticBindings };
}

function planFor(fixture)
{
    return buildResourceTransformPlan([ fixture ], { layoutKey: "Main.pass0" });
}

test("detail resource planning recognizes ordered two- and three-layer sample families", () =>
{
    for (const [ layerCount, duplicateDetail2Sample ] of [ [ 2, true ], [ 3, false ] ])
    {
        const fixture = detailFixture(layerCount, duplicateDetail2Sample);
        const before = structuredClone(fixture.semanticBindings);
        const plan = planFor(fixture);
        const transform = plan.resourceTransforms[0];

        assert.equal(Object.isFrozen(plan), true);
        assert.equal(transform.output.layerCount, layerCount);
        assert.deepEqual(transform.inputs.map((input) => [ input.parameter, input.layer ]), Array.from(
            { length: layerCount },
            (_, layer) => [ `Detail${layer + 1}Map`, layer ]
        ));
        assert.equal(transform.output.identity, transform.inputs[0].identity);
        assert.deepEqual(fixture.semanticBindings, before);
    }
});

test("detail resource planning rejects incomplete or semantically unsafe candidates", () =>
{
    const base = detailFixture(3);
    const cases = [
        (fixture) => fixture.semanticBindings.splice(1, 1),
        (fixture) => { fixture.semanticBindings[1].metadataName = "Detail3Map"; },
        (fixture) => {
            const first = fixture.semanticBindings[0].registerIndex;
            fixture.semanticBindings[0].registerIndex = fixture.semanticBindings[1].registerIndex;
            fixture.semanticBindings[1].registerIndex = first;
        },
        // The next two are decided by the shared recogniser rather than by
        // anything WGSL-specific, so they also prove it is in this path.
        (fixture) => { fixture.semanticBindings[1].carbon.isSRGB = true; },
        (fixture) => { delete fixture.semanticBindings[1].carbon.isSRGB; },
        (fixture) => {
            fixture.ir.bindings.find((binding) =>
                (binding.range?.lowerBound ?? binding.registerIndex) === 5)
                .resourceDimension = "texturecube";
        },
        (fixture) => {
            fixture.ir.instructions.find((entry) =>
                entry.opcodeName === "sample_b"
                && entry.operands[2].registerIndex === 5)
                .operands[3].registerIndex = 1;
        },
        (fixture) => {
            fixture.ir.instructions.find((entry) =>
                entry.opcodeName === "sample_b"
                && entry.operands[2].registerIndex === 5)
                .opcodeName = "ld";
        },
        (fixture) => {
            fixture.ir.instructions.find((entry) =>
                entry.opcodeName === "sample_b"
                && entry.operands[2].registerIndex === 5)
                .extensions = [ {
                    typeName: "sample_controls",
                    sampleOffsets: { u: 1, v: 0, w: 0 }
                } ];
        },
        (fixture) => {
            fixture.ir.instructions.find((entry) =>
                entry.opcodeName === "sample_b"
                && entry.operands[2].registerIndex === 5)
                .operands[2].indices[0].relative = {
                    register: register("temp", 7, { selected: "x" })
                };
        }
    ];
    for (const mutate of cases)
    {
        const fixture = structuredClone(base);
        mutate(fixture);
        assert.equal(planFor(fixture), null);
    }
});

test("detail transform lowers one physical array binding with fixed semantic layers", () =>
{
    for (const [ layerCount, duplicateDetail2Sample, expectedLayers ] of [
        [ 2, true, [ "0", "1", "1" ] ],
        [ 3, false, [ "0", "1", "2" ] ]
    ])
    {
        const fixture = detailFixture(layerCount, duplicateDetail2Sample);
        const resourceTransformPlan = planFor(fixture);
        const bindingPlan = CjsWebgpuFormat.buildWgslBindingPlan([ fixture.ir ], {
            resourceTransformPlan
        });
        const shader = CjsWebgpuFormat.buildWgsl(fixture.ir, {
            bindingPlan,
            resourceTransformPlan
        });
        const textures = shader.program.bindings.filter((binding) =>
            binding.texture);
        assert.equal(bindingPlan.formatVersion, 3);
        assert.equal(textures.length, 1);
        assert.equal(textures[0].type, "texture_2d_array<f32>");
        assert.equal(textures[0].texture.viewDimension, "2d-array");
        assert.equal(textures[0].arrayLayerCount, layerCount);
        assert.equal(textures[0].identity,
            resourceTransformPlan.resourceTransforms[0].inputs[0].identity);
        const fixedLayers = shader.code.split("\n")
            .filter((line) => line.includes(`textureSampleBias(${textures[0].generatedSymbol},`))
            .map((line) => /, ([0-9]+)i,/u.exec(line)?.[1]);
        assert.deepEqual(fixedLayers, expectedLayers);
        assert.doesNotMatch(shader.code, /round\(/u);

        const set = CjsWebgpuFormat.buildWgslSet([
            { key: "Main.pass0.pixel", shader }
        ]);
        assert.equal(set.formatVersion, 3);
        assert.deepEqual(set.resourceTransforms,
            resourceTransformPlan.resourceTransforms);
        assert.equal(set.layouts[0].bindGroups[0].bindings
            .filter((binding) => binding.texture).length, 1);
    }
});

test("WGSL set transform links fail closed on missing recipes, bindings, and layers", () =>
{
    const fixture = detailFixture(3);
    const resourceTransformPlan = planFor(fixture);
    const bindingPlan = CjsWebgpuFormat.buildWgslBindingPlan([ fixture.ir ], {
        resourceTransformPlan
    });
    const shader = CjsWebgpuFormat.buildWgsl(fixture.ir, {
        bindingPlan,
        resourceTransformPlan
    });

    const missingRecipe = structuredClone(shader);
    delete missingRecipe.program.resourceTransforms;
    assert.throws(
        () => CjsWebgpuFormat.buildWgslSet([
            { key: "Main.pass0.pixel", shader: missingRecipe }
        ]),
        /without resource recipes/u
    );

    const missingLink = structuredClone(shader);
    delete missingLink.program.bindings.find((binding) =>
        binding.transformId).transformId;
    delete missingLink.program.bindings.find((binding) =>
        binding.arrayLayerCount).arrayLayerCount;
    assert.throws(
        () => CjsWebgpuFormat.buildWgslSet([
            { key: "Main.pass0.pixel", shader: missingLink }
        ]),
        /link exactly one physical binding/u
    );

    const duplicateLayer = structuredClone(shader);
    duplicateLayer.program.resourceTransforms[0].inputs[1].layer = 0;
    assert.throws(
        () => CjsWebgpuFormat.buildWgslSet([
            { key: "Main.pass0.pixel", shader: duplicateLayer }
        ]),
        /invalid input at layer 1/u
    );
});

test("WGSL set validates removed transform inputs within their owning pass", () =>
{
    const transformedFixture = detailFixture(3);
    const resourceTransformPlan = planFor(transformedFixture);
    const transformedBindingPlan = CjsWebgpuFormat.buildWgslBindingPlan(
        [ transformedFixture.ir ],
        { resourceTransformPlan }
    );
    const transformedShader = CjsWebgpuFormat.buildWgsl(transformedFixture.ir, {
        bindingPlan: transformedBindingPlan,
        resourceTransformPlan
    });

    const ordinaryFixture = detailFixture(3);
    const ordinaryBindingPlan = CjsWebgpuFormat.buildWgslBindingPlan([ ordinaryFixture.ir ]);
    const ordinaryShader = CjsWebgpuFormat.buildWgsl(ordinaryFixture.ir, {
        bindingPlan: ordinaryBindingPlan
    });

    const set = CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.pixel", shader: transformedShader },
        { key: "Other.pass0.pixel", shader: ordinaryShader }
    ]);

    assert.equal(set.resourceTransforms.length, 1);
    assert.equal(set.resourceTransforms[0].layoutKey, "Main.pass0");
    assert.equal(set.layouts.find((layout) => layout.key === "Other.pass0")
        .bindGroups[0].bindings.filter((binding) => binding.texture).length, 3);
});
