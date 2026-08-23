import test from "node:test";
import assert from "node:assert/strict";

import CjsDxbcFormat from "../../../../../src/resource/formats/dxbc/CjsDxbcFormat.js";
import { DxbcContainer } from "../../../../../src/resource/formats/dxbc/core/container.js";
import { DxbcInstructionDecoder } from "../../../../../src/resource/formats/dxbc/core/decoder.js";
import { DxbcShaderProgram } from "../../../../../src/resource/formats/dxbc/core/program.js";
import { buildContainer, buildShex, opcodeToken, operandToken } from "./synthetic.js";

const RET = 62;
const DCL_TGSM_RAW = 159;
const DCL_TGSM_STRUCTURED = 160;
const SYNC = 190;

function buildComputeDxbc(instructionTokens, minor = 0)
{
    const payload = buildShex([ ...instructionTokens, opcodeToken(RET, 1) ], {
        programType: 5,
        major: 5,
        minor
    });
    return buildContainer([ { fourCC: "SHEX", payload } ]);
}

function decode(instructionTokens, minor = 0)
{
    const bytes = buildComputeDxbc(instructionTokens, minor);
    const source = `synthetic-compute-sm5.${minor}`;
    const container = new DxbcContainer().Read(bytes, { source });
    const program = new DxbcShaderProgram().Read(container.getChunk("SHEX"), { source });
    return new DxbcInstructionDecoder().Decode(program, { source });
}

function tgsmOperand(registerIndex, options = {})
{
    return [
        operandToken(options.type ?? 31, options.representations ?? [ 0 ]) | (options.tokenBits ?? 0),
        registerIndex
    ];
}

test("SM5.0 and SM5.1 thread-group shared-memory declarations expose their complete payloads", () =>
{
    for (const minor of [ 0, 1 ])
    {
        const tokens = [
            opcodeToken(DCL_TGSM_RAW, 4),
            ...tgsmOperand(2),
            64,
            opcodeToken(DCL_TGSM_STRUCTURED, 5),
            ...tgsmOperand(7),
            16,
            9
        ];
        const [ raw, structured ] = decode(tokens, minor).instructions;

        assert.equal(raw.opcodeName, "dcl_thread_group_shared_memory_raw");
        assert.deepEqual(raw.declaration, {
            registerIndex: 2,
            byteCount: 64
        });
        assert.equal(raw.tailTokens.length, 0);

        assert.equal(structured.opcodeName, "dcl_thread_group_shared_memory_structured");
        assert.deepEqual(structured.declaration, {
            registerIndex: 7,
            structureStride: 16,
            structureCount: 9
        });
        assert.equal(structured.tailTokens.length, 0);
    }
});

test("sync exposes a stable numeric mask and canonical names without reporting saturation", () =>
{
    const expectedNames = [
        "threads_in_group",
        "thread_group_shared_memory",
        "thread_group_uav_memory",
        "global_uav_memory"
    ];

    for (const minor of [ 0, 1 ])
    {
        const instructions = [ 0, 3, 15 ].map((flags) =>
            opcodeToken(SYNC, 1) | (flags << 11));
        const decoded = decode(instructions, minor).instructions.slice(0, -1);

        assert.equal(decoded[0].syncFlags, 0);
        assert.deepEqual(decoded[0].syncFlagNames, []);
        assert.equal(decoded[1].syncFlags, 3);
        assert.deepEqual(decoded[1].syncFlagNames, expectedNames.slice(0, 2));
        assert.equal(decoded[2].syncFlags, 15);
        assert.deepEqual(decoded[2].syncFlagNames, expectedNames);
        assert.equal(decoded[2].saturate, false);
        assert.equal(decoded[2].preciseMask, "");

        const unknown = decode([
            opcodeToken(SYNC, 1) | (0x10 << 11),
            opcodeToken(SYNC, 1) | (0x13 << 11)
        ], minor).instructions;
        assert.equal(unknown[0].syncFlags, 0x10);
        assert.deepEqual(unknown[0].syncFlagNames, []);
        assert.equal(unknown[1].syncFlags, 0x13);
        assert.deepEqual(unknown[1].syncFlagNames, expectedNames.slice(0, 2));
    }
});

test("public JSON output retains compute shared-memory and sync metadata", () =>
{
    const json = CjsDxbcFormat.read(buildComputeDxbc([
        opcodeToken(DCL_TGSM_STRUCTURED, 5),
        ...tgsmOperand(0),
        4,
        64,
        opcodeToken(SYNC, 1) | (3 << 11)
    ]), { source: "synthetic-compute-json" });
    const [ declaration, sync ] = json.instructions;

    assert.deepEqual(declaration.declaration, {
        registerIndex: 0,
        structureStride: 4,
        structureCount: 64
    });
    assert.equal(sync.syncFlags, 3);
    assert.deepEqual(sync.syncFlagNames, [
        "threads_in_group",
        "thread_group_shared_memory"
    ]);
});

test("thread-group shared-memory declarations reject malformed structural payloads", () =>
{
    const cases = [
        {
            tokens: [ opcodeToken(DCL_TGSM_RAW, 3), ...tgsmOperand(0) ],
            message: /payload is truncated/i
        },
        {
            tokens: [ opcodeToken(DCL_TGSM_STRUCTURED, 4), ...tgsmOperand(0), 16 ],
            message: /payload is truncated/i
        },
        {
            tokens: [ opcodeToken(DCL_TGSM_RAW, 4), ...tgsmOperand(0, { type: 0 }), 16 ],
            message: /must use a thread-group shared-memory operand/i
        },
        {
            tokens: [ opcodeToken(DCL_TGSM_RAW, 4), ...tgsmOperand(0, { tokenBits: 2 }), 16 ],
            message: /must not select components/i
        },
        {
            tokens: [ opcodeToken(DCL_TGSM_RAW, 4), ...tgsmOperand(0, { tokenBits: 4 }), 16 ],
            message: /must be unmodified/i
        },
        {
            tokens: [ opcodeToken(DCL_TGSM_RAW, 4), ...tgsmOperand(0, { tokenBits: 1 << 25 }), 16 ],
            message: /must be unmodified/i
        },
        {
            tokens: [
                opcodeToken(DCL_TGSM_RAW, 5),
                operandToken(31, [ 0 ], { extended: true }),
                1 | (1 << 6),
                0,
                16
            ],
            message: /must be unmodified/i
        },
        {
            tokens: [ opcodeToken(DCL_TGSM_RAW, 3), operandToken(31), 16 ],
            message: /must use a 1D register operand/i
        },
        {
            tokens: [
                opcodeToken(DCL_TGSM_RAW, 6),
                operandToken(31, [ 3 ]),
                0,
                operandToken(0, [ 0 ]),
                1,
                16
            ],
            message: /register index must be an immediate32 value/i
        },
        {
            tokens: [ opcodeToken(DCL_TGSM_RAW, 4), ...tgsmOperand(0), 6 ],
            message: /byteCount must be a positive multiple of 4/i
        },
        {
            tokens: [ opcodeToken(DCL_TGSM_RAW, 4), ...tgsmOperand(0), 0 ],
            message: /byteCount must be a positive multiple of 4/i
        },
        {
            tokens: [ opcodeToken(DCL_TGSM_STRUCTURED, 5), ...tgsmOperand(0), 14, 2 ],
            message: /structureStride must be a positive multiple of 4/i
        },
        {
            tokens: [ opcodeToken(DCL_TGSM_STRUCTURED, 5), ...tgsmOperand(0), 4, 0 ],
            message: /structureCount must be positive/i
        },
        {
            tokens: [ opcodeToken(SYNC, 2) | (3 << 11), 0 ],
            message: /must not contain extensions, operands, or reserved controls/i
        },
        {
            tokens: [ (opcodeToken(SYNC, 2) | (3 << 11) | 0x80000000) >>> 0, 0 ],
            message: /must not contain extensions, operands, or reserved controls/i
        },
        {
            tokens: [ opcodeToken(SYNC, 1) | (3 << 11) | (1 << 19) ],
            message: /must not contain extensions, operands, or reserved controls/i
        },
        {
            tokens: [ opcodeToken(SYNC, 1) | (3 << 11) | (1 << 23) ],
            message: /must not contain extensions, operands, or reserved controls/i
        }
    ];

    for (const fixture of cases)
    {
        assert.throws(() => decode(fixture.tokens), fixture.message);
    }
});

test("known and unknown declarations retain unconsumed payloads as tail tokens", () =>
{
    const marker = 0xdecafbad;
    const structured = decode([
        opcodeToken(DCL_TGSM_STRUCTURED, 6),
        ...tgsmOperand(3),
        4,
        5,
        marker
    ]).instructions[0];
    assert.deepEqual(structured.tailTokens, [ marker ]);

    const DCL_STREAM = 143;
    const unknown = decode([
        opcodeToken(DCL_STREAM, 3),
        0x12345678,
        marker
    ]).instructions[0];
    assert.equal(unknown.declaration, null);
    assert.deepEqual(unknown.operands, []);
    assert.deepEqual(unknown.tailTokens, [ 0x12345678, marker ]);
});
