import assert from "node:assert/strict";
import test from "node:test";
import { mat4, decomposeDirectX } from "../../../src/global/math/mat4.js";
import { quat } from "../../../src/global/math/quat.js";

function close(actual, expected, tolerance = 1e-5)
{
    assert.equal(actual.length, expected.length);
    for (let i = 0; i < actual.length; i++)
    {
        assert.ok(Math.abs(actual[i] - expected[i]) < tolerance, `${i}: ${actual[i]} versus ${expected[i]}`);
    }
}

// DirectXMathMatrix.inl:1023-1101: largest-axis sign, ranked basis repair,
// output writes before the SRT failure test; not Carbon Matrix.cpp Decompose.
test("DirectX decomposition round-trips rotated SRT and all reflected largest-axis choices", () =>
{
    const rotation = quat.fromValues(0.2, -0.3, 0.4, 0.8);
    quat.normalize(rotation, rotation);
    for (const [inputScale, expectedScale] of [
        [[2, 3, 4], [2, 3, 4]],
        [[-4, 2, 3], [-4, 2, 3]],
        [[-2, 4, 3], [2, -4, 3]],
        [[-2, 3, 4], [2, 3, -4]],
        [[-3, 3, 2], [-3, 3, 2]],
        [[-2, 3, 3], [2, -3, 3]],
        [[-3, 3, 3], [-3, 3, 3]]
    ])
    {
        // Exact ties use an axis-aligned input, avoiding authored float noise.
        const q = new Set(inputScale.map(Math.abs)).size < 3 ? quat.create() : rotation;
        const matrix = mat4.fromRotationTranslationScale(mat4.create(), q, [7, -8, 9], inputScale);
        const actualRotation = quat.create(), translation = new Float32Array(3), scale = new Float32Array(3);
        assert.equal(decomposeDirectX(matrix, actualRotation, translation, scale), true);
        close(scale, expectedScale);
        close(translation, [7, -8, 9]);
        close(mat4.fromRotationTranslationScale(mat4.create(), actualRotation, translation, scale), matrix);
    }
});

test("DirectX decomposition quaternion selection covers half-turn X, Y, Z and general rotation", () =>
{
    for (const q of [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0.5, 0.5, 0.5, 0.5]])
    {
        const matrix = mat4.fromRotationTranslationScale(mat4.create(), q, [0, 0, 0], [1, 2, 3]);
        const actual = quat.create(), translation = new Float32Array(3), scale = new Float32Array(3);
        assert.equal(mat4.decomposeDirectX(matrix, actual, translation, scale), true);
        close(actual, q);
    }
});

test("DirectX decomposition repairs every zero-axis combination before signing the scale", () =>
{
    const rotation = quat.create(), translation = new Float32Array(3), scale = new Float32Array(3);
    for (const [input, expected] of [
        [[0, 2, 3], [0, 2, -3]],
        [[2, 0, 3], [2, 0, 3]],
        [[2, 3, 0], [2, -3, 0]],
        [[0, 0, 3], [0, 0, 3]],
        [[0, 2, 0], [0, -2, 0]],
        [[2, 0, 0], [2, 0, 0]],
        [[0, 0, 0], [0, 0, 0]]
    ])
    {
        const matrix = mat4.fromScaling(mat4.create(), input);
        assert.equal(mat4.decomposeDirectX(matrix, rotation, translation, scale), true);
        close(scale, expected);
        close(mat4.fromRotationTranslationScale(mat4.create(), rotation, translation, scale), matrix);
    }
});

test("DirectX decomposition retains tiny scale magnitudes while repairing their directions", () =>
{
    const rotation = quat.create(), translation = new Float32Array(3), scale = new Float32Array(3);
    mat4.decomposeDirectX(mat4.fromScaling(mat4.create(), [0.000099, 2, 3]), rotation, translation, scale);
    close(scale, [0.000099, 2, -3]);
    mat4.decomposeDirectX(mat4.fromScaling(mat4.create(), [0.0001, 2, 3]), rotation, translation, scale);
    close(scale, [0.0001, 2, 3]);
    mat4.decomposeDirectX(mat4.fromScaling(mat4.create(), [0.000101, 2, 3]), rotation, translation, scale);
    close(scale, [0.000101, 2, 3]);
});

test("DirectX decomposition writes scale and translation but leaves rotation untouched on shear failure", () =>
{
    const matrix = mat4.create();
    matrix[4] = 1;
    matrix[12] = 9;
    const rotation = quat.fromValues(1, 2, 3, 4), translation = new Float32Array(3), scale = new Float32Array(3);
    assert.equal(mat4.decomposeDirectX(matrix, rotation, translation, scale), false);
    close(rotation, [1, 2, 3, 4]);
    close(translation, [9, 0, 0]);
    close(scale, [1, Math.SQRT2, 1]);
    assert.equal(mat4.decomposeDirectX(mat4.create(), rotation, translation, scale), true);
    close(rotation, [0, 0, 0, 1]);
    close(translation, [0, 0, 0]);
    close(scale, [1, 1, 1]);
});

test("the existing decompose keeps its distinct negative-X policy", () =>
{
    const matrix = mat4.fromScaling(mat4.create(), [-2, 3, 4]);
    const rotation = quat.create(), translation = new Float32Array(3), scale = new Float32Array(3);
    assert.equal(mat4.decomposeSigned(matrix, rotation, translation, scale), matrix);
    close(scale, [-2, 3, 4]);
    assert.equal(mat4.decomposeDirectX(matrix, rotation, translation, scale), true);
    close(scale, [2, 3, -4]);
});
