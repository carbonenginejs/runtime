import test from "node:test";
import assert from "node:assert/strict";

import CjsDxbcFormat from "../../../../../src/resource/formats/dxbc/index.js";
import { disassembleInstructions, formatOperand } from "../../../../../src/resource/formats/dxbc/core/disassemble.js";
import { buildMinimalVertexDxbc } from "./synthetic.js";

test("disassembles a decoded payload from bytes", () =>
{
    const listing = CjsDxbcFormat.disassemble(buildMinimalVertexDxbc());
    const lines = listing.split("\n");

    assert.match(lines[0], /dcl_temps/);
    assert.match(listing, /^\s+0: ret$/m);
    assert.match(listing, /^\s+1: ret$/m);
});

test("accepts an already-decoded read result without decoding twice", () =>
{
    const decoded = CjsDxbcFormat.read(buildMinimalVertexDxbc(), { emit: CjsDxbcFormat.OUTPUT_RAW });

    assert.equal(
        CjsDxbcFormat.disassemble(decoded),
        CjsDxbcFormat.disassemble(decoded.decoder)
    );
    assert.equal(
        CjsDxbcFormat.disassemble(decoded),
        CjsDxbcFormat.disassemble(buildMinimalVertexDxbc())
    );
});

test("numbering counts executable instructions only", () =>
{
    const listing = CjsDxbcFormat.disassemble(buildMinimalVertexDxbc());
    const numbers = [ ...listing.matchAll(/^\s*(\d+): /gm) ].map((match) => Number(match[1]));

    assert.deepEqual(numbers, [ 0, 1 ]);
});

test("declarations can be omitted", () =>
{
    const listing = CjsDxbcFormat.disassemble(buildMinimalVertexDxbc(), { declarations: false });

    assert.ok(!listing.includes("dcl_temps"));
    assert.match(listing, /0: ret/);
});

// A destination mask selects source components by position, not by packing, so
// a listing that normalizes swizzles would hide exactly the class of mistake a
// translation review is looking for. Print what the tokens encode.
test("operands print modifiers, masks, and swizzles as encoded", () =>
{
    assert.equal(formatOperand({
        typeName: "temp",
        selectionModeName: "mask",
        mask: "xyw",
        indices: [ { values: [ 2 ] } ]
    }), "r[2].xyw");

    assert.equal(formatOperand({
        typeName: "temp",
        selectionModeName: "swizzle",
        swizzle: "xyxz",
        modifierName: "neg",
        indices: [ { values: [ 5 ] } ]
    }), "-r[5].xyxz");

    assert.equal(formatOperand({
        typeName: "temp",
        selectionModeName: "swizzle",
        swizzle: "xyzw",
        modifierName: "absneg",
        indices: [ { values: [ 3 ] } ]
    }), "-|r[3].xyzw|");

    assert.equal(formatOperand({
        typeName: "constant_buffer",
        selectionModeName: "swizzle",
        swizzle: "xyz",
        indices: [ { values: [ 2 ] }, { values: [ 8 ] } ]
    }), "cb[2][8].xyz");
});

test("immediate operands print both readings only when they differ usefully", () =>
{
    assert.equal(formatOperand({
        typeName: "immediate32",
        immediateValues: [ { uint32: 1073741824, float32: 2 }, { uint32: 0, float32: 0 } ]
    }), "l(2.0, 0.0)");

    assert.equal(formatOperand({
        typeName: "immediate32",
        immediateValues: [ { uint32: 4294967295, float32: NaN } ]
    }), "l(0xffffffff)");
});

test("relative addressing prints the inner operand", () =>
{
    assert.equal(formatOperand({
        typeName: "constant_buffer",
        selectionModeName: "swizzle",
        swizzle: "xyzw",
        indices: [
            { values: [ 1 ] },
            { values: [ 4 ], relative: { typeName: "temp", selectionModeName: "selected", selected: "x", indices: [ { values: [ 0 ] } ] } }
        ]
    }), "cb[1][r[0].x + 4].xyzw");
});

test("control-flow bodies indent and unwind", () =>
{
    const listing = disassembleInstructions({
        instructions: [
            { opcodeName: "if", operands: [] },
            { opcodeName: "mov", operands: [] },
            { opcodeName: "else", operands: [] },
            { opcodeName: "mov", operands: [] },
            { opcodeName: "endif", operands: [] },
            { opcodeName: "mov", operands: [] }
        ]
    }, { numbers: false });

    assert.deepEqual(listing.split("\n"), [
        "if",
        "  mov",
        "else",
        "  mov",
        "endif",
        "mov"
    ]);
});
