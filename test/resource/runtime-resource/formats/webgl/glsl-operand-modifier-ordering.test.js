import test from "node:test";
import assert from "node:assert/strict";

import { DxbcGlslOperandFormatter } from "../../../../../src/resource/formats/webgl/core/glsl/DxbcGlslOperandFormatter.js";

/**
 * Modifier placement on a typed read is PER MODIFIER, and both wrong
 * placements have broken shipped shaders:
 *
 * - `neg` on an integer read is DXBC integer negation - two's complement
 *   AFTER the reinterpret. `iadd r, -a, b` must emit
 *   `(-floatBitsToInt(a)) + ...`; the float-space form
 *   `floatBitsToInt((-a))` merely flips the sign bit and broke every
 *   lines3d instance offset (child line sets vanished, 2026-09-06).
 * - `abs`/`absneg` have no integer form in DXBC and appear on typed reads
 *   only as FLOAT modifiers (if_nz/breakc conditions, f16tof32 sources).
 *   They must wrap the float expression INSIDE the bitcast:
 *   `abs(floatBitsToUint(x))` is invalid GLSL ES 3.00 (abs is undefined
 *   for genUType) and failed the whole effect at compile (5a5ef833's
 *   integer-preservation rework emitted exactly that).
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

test("neg on an integer read is integer negation outside the bitcast", () =>
{
    const formatter = new DxbcGlslOperandFormatter();
    assert.equal(
        formatter.sourceExpression(tempOperand("neg"), { destMask: "x", as: "int" }),
        "(-floatBitsToInt(r0.x))"
    );
    assert.equal(
        formatter.sourceExpression(tempOperand("neg"), { destMask: "x", as: "uint" }),
        "(-floatBitsToUint(r0.x))"
    );
});

test("an abs modifier wraps the float expression, inside the uint bitcast", () =>
{
    const formatter = new DxbcGlslOperandFormatter();
    const text = formatter.sourceExpression(tempOperand("abs"), { destMask: "x", as: "uint" });
    assert.equal(text, "floatBitsToUint(abs(r0.x))");
});

test("an absneg modifier stays fully in float space inside the bitcast", () =>
{
    const formatter = new DxbcGlslOperandFormatter();
    const text = formatter.sourceExpression(tempOperand("absneg"), { destMask: "x", as: "uint" });
    assert.equal(text, "floatBitsToUint((-abs(r0.x)))");
});

test("modifiers still wrap plain float reads unchanged", () =>
{
    const formatter = new DxbcGlslOperandFormatter();
    assert.equal(formatter.sourceExpression(tempOperand("abs"), { destMask: "x", as: "float" }), "abs(r0.x)");
    assert.equal(formatter.sourceExpression(tempOperand("neg"), { destMask: "x", as: "float" }), "(-r0.x)");
});

test("an unmodified uint read under integer preservation uses the raw companion", () =>
{
    const formatter = new DxbcGlslOperandFormatter({ integerTemps: true });
    const text = formatter.sourceExpression(tempOperand("none"), { destMask: "x", as: "uint" });
    assert.equal(text, "cjsBitsR0.x");
});

test("integer neg negates the raw companion directly under preservation", () =>
{
    const formatter = new DxbcGlslOperandFormatter({ integerTemps: true });
    assert.equal(
        formatter.sourceExpression(tempOperand("neg"), { destMask: "x", as: "uint" }),
        "(-cjsBitsR0.x)"
    );
});

test("a float abs forces the float register even under integer preservation", () =>
{
    // abs is a float operation, so the raw integer companion cannot serve
    // the read: the float register goes through abs and the bitcast.
    const formatter = new DxbcGlslOperandFormatter({ integerTemps: true });
    const text = formatter.sourceExpression(tempOperand("abs"), { destMask: "x", as: "uint" });
    assert.equal(text, "floatBitsToUint(abs(r0.x))");
});

test("a raw move's modifiers are float sign-bit operations on the companion", () =>
{
    // movc r2.xyz, r3.x, r2.xyz, -r2.xyz: the mirrored-hull tangent handedness
    // select. Under integer companions movc copies bits, and its neg is DXBC's
    // FLOAT negate - a sign flip. Two's-complement negation of the bits turned
    // -1.0 into 4.0 and split every mirrored hull's shading (c0221bcf).
    const formatter = new DxbcGlslOperandFormatter({ integerTemps: true });
    const raw = { destMask: "x", as: "uint", rawMove: true };
    assert.equal(formatter.sourceExpression(tempOperand("neg"), raw), "(cjsBitsR0.x ^ 0x80000000u)");
    assert.equal(formatter.sourceExpression(tempOperand("abs"), raw), "(cjsBitsR0.x & 0x7FFFFFFFu)");
    assert.equal(formatter.sourceExpression(tempOperand("absneg"), raw), "(cjsBitsR0.x | 0x80000000u)");
    assert.equal(formatter.sourceExpression(tempOperand(undefined), raw), "cjsBitsR0.x");

    // The sign flip is exact on the bits: -1.0 back from 1.0.
    const bits = new Uint32Array(new Float32Array([ 1 ]).buffer)[0];
    assert.equal(new Float32Array(new Uint32Array([ (bits ^ 0x80000000) >>> 0 ]).buffer)[0], -1);

    // An integer instruction's neg is still two's complement.
    assert.equal(formatter.sourceExpression(tempOperand("neg"), { destMask: "x", as: "int" }), "(-int(cjsBitsR0.x))");
});
