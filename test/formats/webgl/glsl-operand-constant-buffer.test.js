import test from "node:test";
import assert from "node:assert/strict";

import { DxbcGlslOperandFormatter } from "../../../src/formats/webgl/core/glsl/DxbcGlslOperandFormatter.js";

/**
 * A constant-buffer operand is indexed either two- or three-dimensionally, and
 * both appear in the shipped corpus — measured across 152 shaders, 1,660 were 2D
 * and 1,747 were 3D.
 *
 *   2D: (register, row)             — shader model 5.0
 *   3D: (range id, register, row)   — shader model 5.1
 *
 * Read a 3D operand as though it were 2D and the range id becomes the register
 * and the register becomes the row. The range id is the ordinal of the
 * `dcl_constant_buffer` that introduced the binding, so it equals the register
 * only while a shader declares its buffers contiguously from zero — which is why
 * this survived: most shaders do, and those that do not simply failed to compile.
 *
 * Measured in a real WebGL2 context over 150 shipped effects, correcting it took
 * linked programs from 331/545 to 497/545.
 */

const formatter = new DxbcGlslOperandFormatter();

/**
 * Builds a decoded constant-buffer operand with the given index values.
 *
 * @param {number[]} values One value per index dimension.
 * @returns {object} Operand.
 */
function constantBufferOperand(values)
{
    return {
        type: 8,
        typeName: "constant_buffer",
        componentCount: 2,
        selectionModeName: "swizzle",
        swizzle: [ 0, 1, 2, 3 ],
        selected: [ 0, 1, 2, 3 ],
        mask: 0xf,
        modifierName: "none",
        indices: values.map((value, dimension) => ({
            dimension,
            representation: 0,
            values: [ value ],
            relative: null
        }))
    };
}

test("a 2D constant-buffer operand reads (register, row)", () =>
{
    const text = formatter.sourceExpression(
        constantBufferOperand([ 4, 9 ]),
        { destMask: "x", as: "float" }
    );

    assert.match(text, /\bcb4\b/);
    assert.match(text, /\[9\]/);
});

test("a 3D constant-buffer operand reads (register, row), skipping the range id", () =>
{
    // Range id 2, register 3, row 7 — the shape a shader declaring b0, b1, b3
    // produces for every reference to b3. Reading it as 2D yields cb2[3]: a slot
    // the shader never declared, and a row taken from the register number.
    const text = formatter.sourceExpression(
        constantBufferOperand([ 2, 3, 7 ]),
        { destMask: "x", as: "float" }
    );

    assert.match(text, /\bcb3\b/);
    assert.match(text, /\[7\]/);
    assert.doesNotMatch(text, /\bcb2\b/);
});

test("a 3D operand whose range id matches its register still reads the right row", () =>
{
    // The quiet half of the bug. The slot comes out right by coincidence, so
    // these shaders compiled and linked — while reading their rows from the
    // register number rather than from the row index.
    const text = formatter.sourceExpression(
        constantBufferOperand([ 1, 1, 12 ]),
        { destMask: "x", as: "float" }
    );

    assert.match(text, /\bcb1\b/);
    assert.match(text, /\[12\]/);
    assert.doesNotMatch(text, /\[1\]/);
});
