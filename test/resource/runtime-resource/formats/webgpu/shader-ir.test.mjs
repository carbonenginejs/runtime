import { test } from "node:test";
import assert from "node:assert/strict";

import CjsWebgpuFormat from "../../../../../src/resource/formats/webgpu/index.js";
import { buildMinimalVertexDxbc } from "./synthetic.js";

test("BuildShaderIr lowers SM5.0 DXBC into immutable front-end records", () =>
{
    const ir = CjsWebgpuFormat.buildShaderIr(buildMinimalVertexDxbc(), { source: "synthetic-vs" });

    assert.equal(ir.kind, "shader-program");
    assert.equal(ir.format, "CJS_SHADER_IR");
    assert.equal(ir.stage, "vertex");
    assert.deepEqual(ir.shaderModel, { major: 5, minor: 0 });
    assert.equal(ir.declarations[0].opcodeName, "dcl_temps");
    assert.deepEqual(ir.instructions.map((instruction) => instruction.opcodeName), [ "ret", "ret" ]);
    assert.deepEqual(ir.blocks.map((block) => block.instructionIndices), [ [ 0 ], [ 1 ] ]);
    assert.equal(Object.isFrozen(ir), true);
    assert.throws(() => ir.instructions.push({}), /read only|extensible|frozen|object/i);
    assert.deepEqual(
        CjsWebgpuFormat.buildShaderIr(buildMinimalVertexDxbc(), { source: "synthetic-vs" }),
        ir
    );
});

test("BuildShaderIr preserves SM5.1 binding ranges and resource references", () =>
{
    const bindingRange = {
        bindingModel: "sm5.1-range",
        rangeId: 4,
        lowerBound: 8,
        upperBound: 11,
        unbounded: false,
        registerCount: 4,
        registerSpace: 3
    };
    const ir = new CjsWebgpuFormat().BuildShaderIr({
        program: {
            programType: 0,
            programTypeName: "pixel",
            majorVersion: 5,
            minorVersion: 1
        },
        instructions: [ {
            offset: 2,
            opcode: 88,
            opcodeName: "dcl_resource",
            isDeclaration: true,
            declaration: {
                registerIndex: 8,
                bindingRange,
                resourceDimensionName: "texture2d"
            },
            operands: [ { typeName: "resource" } ]
        }, {
            offset: 9,
            opcode: 69,
            opcodeName: "sample",
            isDeclaration: false,
            operands: [ {
                typeName: "resource",
                resourceReference: {
                    bindingModel: "sm5.1-range",
                    rangeId: 4,
                    nonUniform: true,
                    absoluteIndex: { values: [ 9 ], relative: null }
                }
            } ]
        }, {
            offset: 13,
            opcode: 62,
            opcodeName: "ret",
            isDeclaration: false,
            operands: []
        } ]
    }, { source: "synthetic-ps51" });

    assert.equal(ir.bindings.length, 1);
    assert.equal(ir.bindings[0].id, "sampled-resource:space3:range4");
    assert.deepEqual(ir.bindings[0].range, bindingRange);
    assert.equal(ir.instructions[0].operands[0].resourceReference.nonUniform, true);
    assert.deepEqual(ir.blocks.map((block) => block.instructionIndices), [ [ 0, 1 ] ]);
});

test("BuildShaderIr preserves compute shared-memory declarations and sync controls", () =>
{
    const marker = 0xdecafbad;
    const executableMarker = 0xabad1dea;
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: {
            programType: 5,
            programTypeName: "compute",
            majorVersion: 5,
            minorVersion: 1
        },
        instructions: [ {
            offset: 2,
            opcode: 160,
            opcodeName: "dcl_thread_group_shared_memory_structured",
            isDeclaration: true,
            declaration: {
                registerIndex: 0,
                structureStride: 4,
                structureCount: 64
            },
            operands: [ {
                type: 31,
                typeName: "thread_group_shared_memory",
                componentCount: 0,
                indices: [ {
                    representation: 0,
                    values: [ 0 ],
                    relative: null
                } ]
            } ],
            tailTokens: [ marker ]
        }, {
            offset: 8,
            opcode: 190,
            opcodeName: "sync",
            isDeclaration: false,
            syncFlags: 3,
            syncFlagNames: [ "threads_in_group", "thread_group_shared_memory" ],
            operands: [],
            tailTokens: [ executableMarker ]
        }, {
            offset: 9,
            opcode: 62,
            opcodeName: "ret",
            isDeclaration: false,
            operands: []
        } ]
    }, { source: "synthetic-cs51-shared" });

    assert.deepEqual(ir.declarations[0].data, {
        registerIndex: 0,
        structureStride: 4,
        structureCount: 64
    });
    assert.equal(ir.declarations[0].operands[0].typeName, "thread_group_shared_memory");
    assert.deepEqual(ir.declarations[0].tailTokens, [ marker ]);
    assert.equal(ir.instructions[0].opcodeName, "sync");
    assert.equal(ir.instructions[0].syncFlags, 3);
    assert.deepEqual(ir.instructions[0].syncFlagNames, [
        "threads_in_group",
        "thread_group_shared_memory"
    ]);
    assert.deepEqual(ir.instructions[0].tailTokens, [ executableMarker ]);
});

test("BuildShaderIr partitions structured control boundaries deterministically", () =>
{
    const names = [ "if", "mov", "else", "mov", "endif", "ret" ];
    const instructions = names.map((opcodeName, index) => ({
        offset: 2 + index,
        opcode: index,
        opcodeName,
        isDeclaration: false,
        operands: []
    }));
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        instructions
    });

    assert.deepEqual(ir.blocks.map((block) => block.instructionIndices), [ [ 0 ], [ 1 ], [ 2 ], [ 3 ], [ 4 ], [ 5 ] ]);
    assert.deepEqual(ir.blocks.map((block) => block.terminator), [ "if", null, "else", null, "endif", "ret" ]);
    assert.deepEqual(ir.blocks[0].successors, [
        { blockId: "block1", kind: "selection-true" },
        { blockId: "block2", kind: "selection-false" }
    ]);
    assert.deepEqual(ir.blocks[1].successors, [ { blockId: "block4", kind: "selection-merge" } ]);
    assert.deepEqual(ir.blocks[3].successors, [ { blockId: "block4", kind: "fallthrough" } ]);
    assert.deepEqual(ir.blocks[4].mergeSite.predecessorBlockIds, [ "block1", "block3" ]);
    assert.equal(ir.controlFlow.regions[0].kind, "selection");
});

test("control-flow analysis routes an empty true arm directly to its merge", () =>
{
    const names = [ "if", "else", "mov", "endif", "ret" ];
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        instructions: names.map((opcodeName, index) => ({
            offset: 2 + index,
            opcode: index,
            opcodeName,
            isDeclaration: false,
            operands: []
        }))
    });

    assert.deepEqual(ir.blocks[0].successors, [
        { blockId: "block3", kind: "selection-true" },
        { blockId: "block1", kind: "selection-false" }
    ]);
});

test("control-flow analysis rejects crossing structured regions", () =>
{
    const names = [ "if", "loop", "endif", "endloop", "ret" ];
    assert.throws(() => CjsWebgpuFormat.buildShaderIr({
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        instructions: names.map((opcodeName, index) => ({
            offset: 2 + index,
            opcode: index,
            opcodeName,
            isDeclaration: false,
            operands: []
        }))
    }), /mismatched endif/i);
});

test("BuildShaderIr rejects malformed decoded inputs", () =>
{
    assert.throws(() => CjsWebgpuFormat.buildShaderIr({}), /expected DXBC bytes|decoded/i);
    assert.throws(() => CjsWebgpuFormat.buildShaderIr({
        program: { programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        instructions: [
            { offset: 3, opcodeName: "mov", isDeclaration: false },
            { offset: 2, opcodeName: "ret", isDeclaration: false }
        ]
    }), /strictly increasing/i);
});

test("register analysis versions full and partial writes", () =>
{
    const register = (mask = "xyzw", swizzle = "") => ({
        typeName: "temp",
        componentCount: 4,
        mask,
        swizzle,
        selected: "",
        indices: [ { values: [ 0 ], relative: null } ]
    });
    const input = (swizzle = "xyzw") => ({
        typeName: "input",
        componentCount: 4,
        mask: "",
        swizzle,
        selected: "",
        indices: [ { values: [ 0 ], relative: null } ]
    });
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        instructions: [
            { offset: 2, opcode: 54, opcodeName: "mov", isDeclaration: false, operands: [ register(), input() ] },
            { offset: 5, opcode: 54, opcodeName: "mov", isDeclaration: false, operands: [ register("xy"), input("zwzw") ] },
            { offset: 8, opcode: 0, opcodeName: "add", isDeclaration: false, operands: [ register(), register("", "xyzw"), input() ] },
            { offset: 12, opcode: 62, opcodeName: "ret", isDeclaration: false, operands: [] }
        ]
    });

    const full = ir.instructions[0].dataflow.writes[0];
    const partial = ir.instructions[1].dataflow.writes[0];
    const readAfterPartial = ir.instructions[2].dataflow.reads[0];
    assert.equal(full.mask, "xyzw");
    assert.equal(full.previous, null);
    assert.equal(partial.mask, "xy");
    assert.equal(partial.previous.z.valueId, full.valueId);
    assert.equal(partial.previous.w.valueId, full.valueId);
    assert.deepEqual(ir.instructions[1].dataflow.reads[0].components, [ "z", "w" ]);
    assert.equal(readAfterPartial.refs[0].valueId, partial.valueId);
    assert.equal(readAfterPartial.refs[2].valueId, full.valueId);
});

test("register analysis resolves branch inputs and materializes live selection merges", () =>
{
    const temp = {
        typeName: "temp",
        componentCount: 4,
        mask: "xyzw",
        swizzle: "xyzw",
        selected: "",
        indices: [ { values: [ 1 ], relative: null } ]
    };
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        instructions: [
            { offset: 2, opcode: 31, opcodeName: "if", isDeclaration: false, operands: [ temp ] },
            { offset: 4, opcode: 54, opcodeName: "mov", isDeclaration: false, operands: [ temp, temp ] },
            { offset: 7, opcode: 18, opcodeName: "else", isDeclaration: false, operands: [] },
            { offset: 8, opcode: 54, opcodeName: "mov", isDeclaration: false, operands: [ temp, temp ] },
            { offset: 11, opcode: 21, opcodeName: "endif", isDeclaration: false, operands: [] },
            { offset: 12, opcode: 54, opcodeName: "mov", isDeclaration: false, operands: [ temp, temp ] },
            { offset: 15, opcode: 62, opcodeName: "ret", isDeclaration: false, operands: [] }
        ]
    });

    assert.equal(ir.blocks.length, 6);
    assert.ok(ir.blocks[0].inputValueIds.length > 0);
    assert.ok(ir.blocks[1].inputValueIds.length > 0);
    assert.ok(ir.blocks[3].inputValueIds.length > 0);
    assert.equal(ir.blocks[1].inputValueIds[0], ir.blocks[3].inputValueIds[0]);
    assert.equal(ir.blocks[4].mergeSite.valueIds.length, 4);
    const merge = ir.values.find((value) => value.id === ir.blocks[4].mergeSite.valueIds[0]);
    assert.equal(merge.origin, "control-flow-merge");
    assert.deepEqual(merge.incoming.map((incoming) => incoming.blockId), [ "block1", "block3" ]);
    assert.equal(ir.blocks[5].inputValueIds[0], merge.id);
    assert.equal(ir.values.some((value) => value.origin === "block-input"), false);
});

test("control-flow analysis records loop backedges and conditional exits", () =>
{
    const names = [ "loop", "breakc", "continuec", "endloop", "ret" ];
    const instructions = names.map((opcodeName, index) => ({
        offset: 2 + index,
        opcode: index,
        opcodeName,
        isDeclaration: false,
        operands: []
    }));
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        instructions
    });

    assert.deepEqual(ir.blocks.map((block) => block.instructionIndices), [ [ 0 ], [ 1 ], [ 2 ], [ 3 ], [ 4 ] ]);
    assert.deepEqual(ir.blocks[1].successors, [
        { blockId: "block4", kind: "break" },
        { blockId: "block2", kind: "condition-false" }
    ]);
    assert.deepEqual(ir.blocks[2].successors, [
        { blockId: "block3", kind: "continue" },
        { blockId: "block3", kind: "condition-false" }
    ]);
    assert.deepEqual(ir.blocks[3].successors, [ { blockId: "block0", kind: "loop-back" } ]);
    assert.deepEqual(ir.blocks[0].mergeSite.predecessorBlockIds, [ "block3" ]);
    assert.equal(ir.blocks[4].exits[0], "return");
});

test("register analysis materializes entry and backedge values at loop headers", () =>
{
    const operand = (typeName, index = 0) => ({
        typeName,
        componentCount: 4,
        mask: "xyzw",
        swizzle: "xyzw",
        selected: "",
        indices: [ { values: [ index ], relative: null } ]
    });
    const temp = operand("temp");
    const input = operand("input");
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        instructions: [
            { offset: 2, opcode: 47, opcodeName: "loop", isDeclaration: false, operands: [] },
            { offset: 3, opcode: 0, opcodeName: "add", isDeclaration: false, operands: [ temp, temp, input ] },
            { offset: 7, opcode: 3, opcodeName: "breakc", isDeclaration: false, operands: [ temp ] },
            { offset: 9, opcode: 22, opcodeName: "endloop", isDeclaration: false, operands: [] },
            { offset: 10, opcode: 54, opcodeName: "mov", isDeclaration: false, operands: [ temp, temp ] },
            { offset: 13, opcode: 62, opcodeName: "ret", isDeclaration: false, operands: [] }
        ]
    });

    assert.equal(ir.blocks[0].mergeSite.includesEntry, true);
    assert.equal(ir.blocks[0].mergeSite.valueIds.length, 4);
    const merge = ir.values.find((value) => value.id === ir.blocks[0].mergeSite.valueIds[0]);
    assert.deepEqual(merge.incoming.map((incoming) => incoming.kind), [ "program-entry", "predecessor" ]);
    assert.equal(merge.incoming[1].blockId, "block2");
    assert.equal(ir.values.find((value) => value.id === merge.incoming[0].valueId).origin, "undefined-register");
    assert.equal(ir.instructions[1].dataflow.reads[0].refs[0].valueId, merge.id);
    assert.equal(ir.values.some((value) => value.origin === "block-input"), false);
});

test("register analysis preserves partial-write lanes through a split loop header", () =>
{
    const operand = (typeName, index = 0, { mask = "xyzw", swizzle = "xyzw", selected = "" } = {}) => ({
        typeName,
        componentCount: 4,
        mask,
        swizzle,
        selected,
        indices: [ { values: [ index ], relative: null } ]
    });
    const temp = (options) => operand("temp", 0, options);
    const input = (options) => operand("input", 0, options);
    const output = (options) => operand("output", 0, options);
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ { registerIndex: 0, mask: 15, componentTypeName: "float32" } ],
            output: [ { registerIndex: 0, mask: 15, componentTypeName: "float32" } ]
        },
        instructions: [
            { offset: 2, opcode: 54, opcodeName: "mov", isDeclaration: false, operands: [ temp(), input() ] },
            { offset: 5, opcode: 47, opcodeName: "loop", isDeclaration: false, operands: [] },
            { offset: 6, opcode: 3, opcodeName: "breakc", isDeclaration: false, operands: [ input({ selected: "x" }) ] },
            { offset: 8, opcode: 54, opcodeName: "mov", isDeclaration: false, operands: [ temp({ mask: "xyz" }), input() ] },
            { offset: 11, opcode: 22, opcodeName: "endloop", isDeclaration: false, operands: [] },
            { offset: 12, opcode: 54, opcodeName: "mov", isDeclaration: false, operands: [ output(), temp() ] },
            { offset: 15, opcode: 62, opcodeName: "ret", isDeclaration: false, operands: [] }
        ]
    });

    assert.deepEqual(ir.blocks[0].instructionIndices, [ 0 ]);
    assert.deepEqual(ir.blocks[1].instructionIndices, [ 1 ]);
    assert.deepEqual(ir.blocks[1].predecessors.map((edge) => edge.blockId), [ "block0", "block4" ]);
    assert.deepEqual(ir.blocks[4].successors, [ { blockId: "block1", kind: "loop-back" } ]);
    assert.equal(ir.values.some((value) => value.origin === "block-input"), false);
    const preheaderValue = ir.instructions[0].dataflow.writes[0].valueId;
    const finalRead = ir.instructions[5].dataflow.reads[0];
    assert.equal(finalRead.refs[3].valueId, preheaderValue);
    assert.notEqual(finalRead.refs[0].valueId, preheaderValue);
    assert.equal(ir.values.find((value) => value.id === finalRead.refs[0].valueId).origin, "control-flow-merge");
});

test("register analysis removes trivial joins and marks unreachable blocks", () =>
{
    const temp = {
        typeName: "temp",
        componentCount: 4,
        mask: "xyzw",
        swizzle: "xyzw",
        selected: "",
        indices: [ { values: [ 0 ], relative: null } ]
    };
    const names = [ "if", "nop", "else", "nop", "endif", "mov", "ret", "mov", "ret" ];
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        instructions: names.map((opcodeName, index) => ({
            offset: 2 + index * 2,
            opcode: index,
            opcodeName,
            isDeclaration: false,
            operands: opcodeName === "if" ? [ temp ] : opcodeName === "mov" ? [ temp, temp ] : []
        }))
    });

    const join = ir.blocks.find((block) => block.terminator === "endif");
    assert.deepEqual(join.mergeSite.valueIds, []);
    assert.equal(join.mergeSite.requiresRegisterMerge, false);
    assert.ok(ir.controlFlow.unreachableBlockIds.length > 0);
    const reachableReads = ir.instructions[5].dataflow.reads[0].refs;
    assert.ok(reachableReads.every((ref) => ir.values.find((value) => value.id === ref.valueId).origin === "undefined-register"));
});

test("type inference propagates signature types through moves", () =>
{
    const register = (typeName, index) => ({
        typeName,
        componentCount: 4,
        mask: "xyzw",
        swizzle: "xyzw",
        selected: "",
        indices: [ { values: [ index ], relative: null } ]
    });
    const signature = (registerIndex) => ({ registerIndex, mask: 15, componentTypeName: "float32" });
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: { programType: 1, programTypeName: "vertex", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ signature(0) ], output: [ signature(0) ] },
        instructions: [
            { offset: 2, opcode: 54, opcodeName: "mov", isDeclaration: false, operands: [ register("output", 0), register("input", 0) ] },
            { offset: 5, opcode: 62, opcodeName: "ret", isDeclaration: false, operands: [] }
        ]
    });

    const write = ir.values.find((value) => value.origin === "instruction-write");
    assert.deepEqual(write.componentTypes, { x: "float32", y: "float32", z: "float32", w: "float32" });
    assert.equal(ir.instructions[0].typeInfo.rule, "move");
    assert.equal(ir.instructions[0].typeInfo.resultType, "float32");
    assert.equal(ir.typeSystem.comparisonResult, "uint32-mask");
});

test("type inference records comparison masks, control projection, and conversions", () =>
{
    const register = (typeName, index) => ({
        typeName,
        componentCount: 4,
        mask: "xyzw",
        swizzle: "xyzw",
        selected: "",
        indices: [ { values: [ index ], relative: null } ]
    });
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ { registerIndex: 0, mask: 15, componentTypeName: "float32" } ] },
        instructions: [
            { offset: 2, opcode: 48, opcodeName: "lt", isDeclaration: false, operands: [ register("temp", 0), register("input", 0), register("input", 0) ] },
            { offset: 6, opcode: 31, opcodeName: "if", isDeclaration: false, operands: [ register("temp", 0) ] },
            { offset: 8, opcode: 21, opcodeName: "endif", isDeclaration: false, operands: [] },
            { offset: 9, opcode: 27, opcodeName: "ftoi", isDeclaration: false, operands: [ register("temp", 1), register("input", 0) ] },
            { offset: 12, opcode: 62, opcodeName: "ret", isDeclaration: false, operands: [] }
        ]
    });

    const comparison = ir.values.find((value) => value.instructionIndex === 0);
    const converted = ir.values.find((value) => value.instructionIndex === 3);
    assert.ok(Object.values(comparison.componentTypes).every((type) => type === "uint32"));
    assert.equal(ir.instructions[1].typeInfo.conditionProjection, "nonzero");
    assert.deepEqual(ir.instructions[3].typeInfo.conversion, { from: "float32", to: "int32" });
    assert.ok(Object.values(converted.componentTypes).every((type) => type === "int32"));
});

test("type inference materializes reinterpretation only for conflicting typeless uses", () =>
{
    const register = (typeName, index) => ({
        typeName,
        componentCount: 4,
        mask: "xyzw",
        swizzle: "xyzw",
        selected: "",
        indices: [ { values: [ index ], relative: null } ]
    });
    const immediate = {
        typeName: "immediate32",
        componentCount: 4,
        mask: "",
        swizzle: "xyzw",
        selected: "",
        indices: [],
        immediateValues: [ 0, 1, 2, 3 ].map((value) => ({ uint32: value, float32: value }))
    };
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [ { registerIndex: 0, mask: 15, componentTypeName: "float32" } ] },
        instructions: [
            { offset: 2, opcode: 0, opcodeName: "add", isDeclaration: false, operands: [ register("temp", 0), register("input", 0), immediate ] },
            { offset: 7, opcode: 1, opcodeName: "and", isDeclaration: false, operands: [ register("temp", 1), register("temp", 0), immediate ] },
            { offset: 12, opcode: 62, opcodeName: "ret", isDeclaration: false, operands: [] }
        ]
    });

    const conflicted = ir.values.find((value) => value.instructionIndex === 0);
    assert.ok(Object.values(conflicted.componentTypes).every((type) => type === "bitpattern32"));
    assert.ok(ir.instructions[0].typeInfo.bitcasts.some((bitcast) => bitcast.kind === "result-bitcast"));
    assert.ok(ir.instructions[0].typeInfo.bitcasts.some((bitcast) => bitcast.kind === "immediate-bitcast"));
    assert.ok(ir.instructions[1].typeInfo.bitcasts.some((bitcast) => bitcast.kind === "read-bitcast"));
});

test("type inference derives sampled values from resource return types", () =>
{
    const register = (typeName, index) => ({
        typeName,
        componentCount: 4,
        mask: "xyzw",
        swizzle: "xyzw",
        selected: "",
        registerIndex: index,
        indices: [ { values: [ index ], relative: null } ]
    });
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        instructions: [
            {
                offset: 2,
                opcode: 88,
                opcodeName: "dcl_resource",
                isDeclaration: true,
                declaration: {
                    registerIndex: 0,
                    resourceDimensionName: "texture2d",
                    returnType: { returnTypeNames: [ "uint", "uint", "uint", "uint" ] }
                },
                operands: [ register("resource", 0) ]
            },
            {
                offset: 7,
                opcode: 69,
                opcodeName: "sample",
                isDeclaration: false,
                operands: [ register("temp", 0), register("input", 0), register("resource", 0), register("sampler", 0) ]
            },
            { offset: 13, opcode: 62, opcodeName: "ret", isDeclaration: false, operands: [] }
        ]
    });

    const sampled = ir.values.find((value) => value.instructionIndex === 0);
    assert.ok(Object.values(sampled.componentTypes).every((type) => type === "uint32"));
    assert.equal(ir.instructions[0].typeInfo.rule, "sample-resource");
    assert.equal(ir.instructions[0].typeInfo.resultType, "uint32");
});

test("type inference types ubfe and structured-store addressing without widening store data lanes", () =>
{
    const register = (typeName, registerIndex, {
        componentCount = 4,
        mask = "",
        swizzle = "",
        selected = ""
    } = {}) => ({
        typeName,
        componentCount,
        mask,
        swizzle,
        selected,
        modifierName: "none",
        minPrecisionName: "default",
        nonUniform: false,
        registerIndex,
        indices: Number.isInteger(registerIndex)
            ? [ { values: [ registerIndex ], relative: null } ]
            : [],
        immediateValues: []
    });
    const immediate = (values) => ({
        ...register("immediate32", null, { componentCount: values.length }),
        immediateValues: values.map((uint32) => ({ uint32, float32: uint32 }))
    });
    const ir = CjsWebgpuFormat.buildShaderIr({
        program: { programType: 5, programTypeName: "compute", majorVersion: 5, minorVersion: 0 },
        signatures: { input: [], output: [], patch: [] },
        instructions: [
            {
                offset: 2,
                opcode: 0,
                opcodeName: "dcl_temps",
                isDeclaration: true,
                declaration: { tempCount: 3 },
                operands: []
            },
            {
                offset: 4,
                opcode: 0,
                opcodeName: "mov",
                isDeclaration: false,
                operands: [
                    register("temp", 0, { mask: "xy" }),
                    immediate([ 17, 3, 0, 0 ])
                ]
            },
            {
                offset: 8,
                opcode: 0,
                opcodeName: "ubfe",
                isDeclaration: false,
                operands: [
                    register("temp", 1, { mask: "x" }),
                    immediate([ 8, 0, 0, 0 ]),
                    immediate([ 8, 0, 0, 0 ]),
                    register("temp", 0, { swizzle: "xxxx" })
                ]
            },
            {
                offset: 13,
                opcode: 0,
                opcodeName: "utof",
                isDeclaration: false,
                operands: [
                    register("temp", 2, { mask: "x" }),
                    register("temp", 1, { swizzle: "xxxx" })
                ]
            },
            {
                offset: 17,
                opcode: 0,
                opcodeName: "store_structured",
                isDeclaration: false,
                operands: [
                    register("uav", 0, { mask: "x" }),
                    register("temp", 0, { swizzle: "yyyy" }),
                    immediate([ 0 ]),
                    register("temp", 2, { swizzle: "xxxx" })
                ]
            },
            {
                offset: 22,
                opcode: 0,
                opcodeName: "ret",
                isDeclaration: false,
                operands: []
            }
        ]
    });

    const bitfield = ir.instructions[1];
    assert.equal(bitfield.typeInfo.rule, "unsigned-integer");
    assert.equal(bitfield.typeInfo.resultType, "uint32");
    assert.deepEqual(
        bitfield.typeInfo.operandTypes.map((entry) => entry.expectedType),
        [ "uint32", "uint32", "uint32", "uint32" ]);

    const store = ir.instructions[3];
    assert.equal(store.typeInfo.rule, "structured-store");
    assert.equal(store.typeInfo.resultType, "unknown");
    assert.deepEqual(
        store.typeInfo.operandTypes.map((entry) => entry.expectedType),
        [ "unknown", "uint32", "uint32", "unknown" ]);
    assert.deepEqual(
        store.dataflow.reads.map((read) => ({
            operandIndex: read.operandIndex,
            components: read.components
        })),
        [
            { operandIndex: 1, components: [ "y" ] },
            { operandIndex: 3, components: [ "x" ] }
        ]);
    const stored = ir.values.find((value) => value.instructionIndex === 2);
    assert.equal(stored.componentTypes.x, "float32");
});
