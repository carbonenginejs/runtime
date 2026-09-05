import test from "node:test";
import assert from "node:assert/strict";

import { DxbcGlslOperandFormatter } from "../../../../../src/resource/formats/webgl/core/glsl/DxbcGlslOperandFormatter.js";

/**
 * DXBC operand modifiers (neg/abs/absneg) are FLOAT operations applied to
 * the operand's value before the consuming instruction's typed read. The
 * emitted GLSL must therefore wrap the float expression in the modifier and
 * the modifier in the bitcast: `floatBitsToUint(abs(r0.x))`.
 *
 * The 5a5ef833 integer-preservation rework briefly inverted that ordering
 * through `sourceExpression(..., { as: "uint" })`, emitting
 * `abs(floatBitsToUint(r0.x))` - and `abs()` is undefined for genUType in
 * GLSL ES 3.00, a compile error on every shader whose if_nz/breakc condition
 * (or f16tof32 source) carries an abs modifier. The neg form stayed legal
 * but flipped the -0.0 edge: floatBitsToUint(-0.0) is 0x80000000 (nonzero)
 * while -floatBitsToUint(0.0) is 0. These tests pin the ordering.
 */

/**
 * Builds a decoded 4-component temp-register operand.
 *
 * @param {string} modifierName
 * @returns {object} Operand.
 */
function tempOperand(modifierName)
{
    return {
        type: 0,
        typeName: "temp",
        componentCount: 4,
        selectionModeName: "swizzle",
        swizzle: [ "x", "y", "z", "w" ],
        mask: "xyzw",
        modifierName,
        registerIndex: 0,
        indices: [ { dimension: 0, representation: 0, values: [ 0 ], relative: null } ]
    };
}

test("an abs modifier wraps the float expression, inside the uint bitcast", () =>
{
    const formatter = new DxbcGlslOperandFormatter();
    const text = formatter.sourceExpression(tempOperand("abs"), { destMask: "x", as: "uint" });
    assert.equal(text, "floatBitsToUint(abs(r0.x))");
});

test("a neg modifier stays inside the uint bitcast, preserving the -0.0 edge", () =>
{
    const formatter = new DxbcGlslOperandFormatter();
    const text = formatter.sourceExpression(tempOperand("neg"), { destMask: "x", as: "uint" });
    assert.equal(text, "floatBitsToUint((-r0.x))");
});

test("an absneg modifier stays inside the uint bitcast", () =>
{
    const formatter = new DxbcGlslOperandFormatter();
    const text = formatter.sourceExpression(tempOperand("absneg"), { destMask: "x", as: "uint" });
    assert.equal(text, "floatBitsToUint((-abs(r0.x)))");
});

test("modifiers still wrap plain float reads unchanged", () =>
{
    const formatter = new DxbcGlslOperandFormatter();
    const text = formatter.sourceExpression(tempOperand("abs"), { destMask: "x", as: "float" });
    assert.equal(text, "abs(r0.x)");
});

test("an unmodified uint read under integer preservation uses the raw companion", () =>
{
    const formatter = new DxbcGlslOperandFormatter({ integerTemps: true });
    const text = formatter.sourceExpression(tempOperand("none"), { destMask: "x", as: "uint" });
    assert.equal(text, "cjsBitsR0.x");
});

test("a float modifier forces the float register even under integer preservation", () =>
{
    // A modifier is a float operation, so the raw integer companion cannot
    // serve the read: the float register goes through the modifier and the
    // bitcast, exactly as without preservation.
    const formatter = new DxbcGlslOperandFormatter({ integerTemps: true });
    const text = formatter.sourceExpression(tempOperand("abs"), { destMask: "x", as: "uint" });
    assert.equal(text, "floatBitsToUint(abs(r0.x))");
});
