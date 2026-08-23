import test from "node:test";
import assert from "node:assert/strict";

import { DxbcContainer } from "../../../../../src/resource/formats/dxbc/core/container.js";
import { DxbcInstructionDecoder } from "../../../../../src/resource/formats/dxbc/core/decoder.js";
import { DxbcShaderProgram } from "../../../../../src/resource/formats/dxbc/core/program.js";
import { buildContainer, buildShex, opcodeToken, operandToken } from "./synthetic.js";

const RET = 62;
const RETURN_FLOAT4 = 0x5555;

function decode(instructionTokens)
{
    const payload = buildShex([ ...instructionTokens, opcodeToken(RET, 1) ], { minor: 1 });
    const bytes = buildContainer([ { fourCC: "SHEX", payload } ]);
    const container = new DxbcContainer().Read(bytes, { source: "synthetic-sm51" });
    const program = new DxbcShaderProgram().Read(container.getChunk("SHEX"), { source: "synthetic-sm51" });
    return new DxbcInstructionDecoder().Decode(program, { source: "synthetic-sm51" });
}

function declaration(opcode, type, tail, tokenBits = 0)
{
    const length = 1 + 4 + tail.length;
    return [
        opcodeToken(opcode, length) | tokenBits,
        operandToken(type, [ 0, 0, 0 ]),
        7,
        3,
        5,
        ...tail
    ];
}

function firstDeclaration(tokens)
{
    return decode(tokens).instructions[0];
}

function assertRange(instruction, expected = {})
{
    assert.equal(instruction.tailTokens.length, 0);
    assert.deepEqual(instruction.declaration.bindingRange, {
        bindingModel: "sm5.1-range",
        rangeId: expected.rangeId ?? 7,
        lowerBound: expected.lowerBound ?? 3,
        upperBound: expected.upperBound ?? 5,
        unbounded: expected.unbounded ?? false,
        registerCount: Object.hasOwn(expected, "registerCount") ? expected.registerCount : 3,
        registerSpace: expected.registerSpace ?? 11
    });
    assert.equal(instruction.declaration.registerIndex, expected.lowerBound ?? 3);
}

test("SM5.1 declarations expose binding ranges and consume register spaces", () =>
{
    const cases = [
        { name: "dcl_sampler", tokens: declaration(90, 6, [ 11 ]) },
        { name: "dcl_resource", tokens: declaration(88, 7, [ RETURN_FLOAT4, 11 ], 3 << 11) },
        { name: "dcl_resource_raw", tokens: declaration(161, 7, [ 11 ]) },
        { name: "dcl_resource_structured", tokens: declaration(162, 7, [ 48, 11 ]), stride: 48 },
        { name: "dcl_unordered_access_view_typed", tokens: declaration(156, 30, [ RETURN_FLOAT4, 11 ], 3 << 11) },
        { name: "dcl_unordered_access_view_raw", tokens: declaration(157, 30, [ 11 ]) },
        { name: "dcl_unordered_access_view_structured", tokens: declaration(158, 30, [ 16, 11 ]), stride: 16 }
    ];

    for (const fixture of cases)
    {
        const instruction = firstDeclaration(fixture.tokens);
        assert.equal(instruction.opcodeName, fixture.name);
        assertRange(instruction);
        if (fixture.stride) assert.equal(instruction.declaration.structureStride, fixture.stride);
    }

    const cbuffer = firstDeclaration(declaration(89, 8, [ 64, 11 ]));
    assertRange(cbuffer);
    assert.equal(cbuffer.declaration.sizeInVec4, 64);
});

test("SM5.1 unbounded declarations preserve the sentinel without count overflow", () =>
{
    const tokens = [
        opcodeToken(90, 6),
        operandToken(6, [ 0, 0, 0 ]),
        19,
        4,
        0xffffffff,
        23
    ];
    assertRange(firstDeclaration(tokens), {
        rangeId: 19,
        lowerBound: 4,
        upperBound: 0xffffffff,
        unbounded: true,
        registerCount: null,
        registerSpace: 23
    });
});

test("SM5.1 executable resource operands expose fixed, dynamic and non-uniform references", () =>
{
    const relativeTemp = [ operandToken(0, [ 0 ]), 2 ];
    const instructions = [
        opcodeToken(54, 4), operandToken(7, [ 0, 0 ]), 7, 4,
        opcodeToken(54, 6), operandToken(7, [ 0, 3 ]), 7, 4, ...relativeTemp,
        opcodeToken(54, 5), operandToken(7, [ 0, 0 ], { extended: true }), 1 | (1 << 17), 7, 5,
        opcodeToken(54, 5), operandToken(8, [ 0, 0, 0 ]), 3, 1, 9
    ];
    const decoded = decode(instructions).instructions.slice(0, -1);

    assert.equal(decoded[0].operands[0].resourceReference.rangeId, 7);
    assert.equal(decoded[0].operands[0].resourceReference.absoluteIndex.values[0], 4);
    assert.equal(decoded[1].operands[0].resourceReference.absoluteIndex.values[0], 4);
    assert.equal(decoded[1].operands[0].resourceReference.absoluteIndex.relative.typeName, "temp");
    assert.equal(decoded[2].operands[0].resourceReference.nonUniform, true);
    assert.equal(decoded[3].operands[0].resourceReference.rangeId, 3);
    assert.equal(decoded[3].operands[0].resourceReference.bufferIndex.values[0], 1);
    assert.equal(decoded[3].operands[0].resourceReference.vectorOffset.values[0], 9);
});

test("malformed SM5.1 binding ranges fail with source-aware diagnostics", () =>
{
    const reversed = [
        opcodeToken(90, 6), operandToken(6, [ 0, 0, 0 ]), 7, 9, 3, 0
    ];
    assert.throws(() => decode(reversed), /upper bound below/i);

    const wrongDimension = [
        opcodeToken(90, 5), operandToken(6, [ 0, 0 ]), 7, 3, 0
    ];
    assert.throws(() => decode(wrongDimension), /3D binding-range operand/i);

    const missingSpace = [
        opcodeToken(90, 5), operandToken(6, [ 0, 0, 0 ]), 7, 3, 5
    ];
    assert.throws(() => decode(missingSpace), /truncated/i);
});
