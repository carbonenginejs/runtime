import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../../npm/dist/global/math/mat4.js";
import { quat } from "../../../npm/dist/global/math/quat.js";

function close(actual, expected, message)
{
    for (let i = 0; i < expected.length; i++)
    {
        assert.ok(Math.abs(actual[i] - expected[i]) < 1e-6, `${message}: [${i}] ${actual[i]} != ${expected[i]}`);
    }
}

test("decomposeCarbon reads a scaled rotation through the trace branch (Quaternion.cpp:13-21)", () =>
{
    const matrix = mat4.fromRotationTranslationScale(mat4.create(),
        quat.setAxisAngle(quat.create(), [ 0, 0, 1 ], Math.PI / 2), [ 4, 5, 6 ], [ 2, 3, 4 ]);
    const rotation = quat.create(), translation = new Float32Array(3), scale = new Float32Array(3);
    assert.equal(mat4.decomposeCarbon(matrix, rotation, translation, scale), matrix);
    close(scale, [ 2, 3, 4 ], "scale");
    close(translation, [ 4, 5, 6 ], "translation");
    close(rotation, quat.setAxisAngle(quat.create(), [ 0, 0, 1 ], Math.PI / 2), "rotation");
});

test("decomposeCarbon takes the largest-diagonal branch for a half turn (Quaternion.cpp:22-40)", () =>
{
    const matrix = mat4.fromXRotation(mat4.create(), Math.PI);
    const rotation = quat.create();
    mat4.decomposeCarbon(matrix, rotation, new Float32Array(3), new Float32Array(3));
    close(rotation, [ 1, 0, 0, 0 ], "rotation");
});

test("decomposeCarbon keeps positive scale on a mirrored basis, as Carbon's Decompose does (Matrix.cpp:231-244)", () =>
{
    const matrix = mat4.fromScaling(mat4.create(), [ -2, 3, 4 ]);
    const carbonScale = new Float32Array(3), signedScale = new Float32Array(3);
    mat4.decomposeCarbon(matrix, quat.create(), new Float32Array(3), carbonScale);
    mat4.decomposeSigned(matrix, quat.create(), new Float32Array(3), signedScale);
    close(carbonScale, [ 2, 3, 4 ], "Carbon scale");
    close(signedScale, [ -2, 3, 4 ], "signed scale");
});

test("decomposeCarbon gives the identity rotation when any scale is zero (Matrix.cpp:251-254)", () =>
{
    const matrix = mat4.fromRotationTranslationScale(mat4.create(),
        quat.setAxisAngle(quat.create(), [ 0, 1, 0 ], 1), [ 0, 0, 0 ], [ 1, 0, 1 ]);
    const rotation = quat.fromValues(9, 9, 9, 9), scale = new Float32Array(3);
    mat4.decomposeCarbon(matrix, rotation, new Float32Array(3), scale);
    close(rotation, [ 0, 0, 0, 1 ], "rotation");
    close(scale, [ 1, 0, 1 ], "scale");
});

test("mat4.decompose stays gl-matrix's stock function", () =>
{
    const matrix = mat4.fromRotationTranslationScale(mat4.create(), quat.create(), [ 1, 2, 3 ], [ 2, 2, 2 ]);
    const rotation = quat.create(), translation = new Float32Array(3), scale = new Float32Array(3);
    mat4.decompose(rotation, translation, scale, matrix);
    close(translation, [ 1, 2, 3 ], "translation");
    close(scale, [ 2, 2, 2 ], "scale");
});
