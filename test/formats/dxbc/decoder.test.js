import test from "node:test";
import assert from "node:assert/strict";

import { DxbcContainer } from "../../../src/formats/dxbc/core/container.js";
import { DxbcShaderProgram } from "../../../src/formats/dxbc/core/program.js";
import { DxbcInstructionDecoder } from "../../../src/formats/dxbc/core/decoder.js";
import { buildContainer, buildMinimalVertexDxbc, buildMinimalVertexShex, opcodeToken, versionToken } from "./synthetic.js";

function decodeMinimal()
{
    const container = new DxbcContainer().Read(buildMinimalVertexDxbc(), { source: "synthetic" });
    const program = new DxbcShaderProgram().Read(container.getChunk("SHEX"), { source: "synthetic" });
    return { program, decoder: new DxbcInstructionDecoder().Decode(program, { source: "synthetic" }) };
}

test("program header decodes stage and shader model", () =>
{
    const { program } = decodeMinimal();
    assert.equal(program.programTypeName, "vertex");
    assert.equal(program.majorVersion, 5);
    assert.equal(program.minorVersion, 0);
    assert.equal(program.lengthDwords, buildMinimalVertexShex().length / 4);
});

test("instructions decode with exact framing", () =>
{
    const { program, decoder } = decodeMinimal();
    const names = decoder.instructions.map((instruction) => instruction.opcodeName);
    assert.deepEqual(names, [ "dcl_temps", "ret", "ret" ]);

    const walked = decoder.instructions.reduce((sum, instruction) => sum + instruction.length, 0);
    assert.equal(walked + 2, program.lengthDwords);
});

test("framing mismatches throw instead of walking out of bounds", () =>
{
    const tokens = new Uint32Array([
        versionToken(1, 5, 0),
        3,
        opcodeToken(62, 9)   // ret claiming 9 dwords in a 3-dword program
    ]);
    const container = new DxbcContainer().Read(
        buildContainer([ { fourCC: "SHEX", payload: new Uint8Array(tokens.buffer.slice(0)) } ]),
        { source: "synthetic" }
    );
    const program = new DxbcShaderProgram().Read(container.getChunk("SHEX"), { source: "synthetic" });
    assert.throws(() => new DxbcInstructionDecoder().Decode(program, { source: "synthetic" }));
});
