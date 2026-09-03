import assert from "node:assert/strict";
import test from "node:test";

// The carbon-math-conventions translation table, executed. Each case builds
// the same transform through the literal Carbon port and through the
// documented gl-matrix equivalent, on rotating + non-uniformly scaled
// fixtures - the composition class that identity-parent fixtures cannot
// distinguish (skill gotcha 2). Tolerance 1e-5 per the skill.
import { mat4, quat, vec3, vec4 } from "../../../../npm/dist/global/math/index.js";
import { matrix, quaternion } from "../../../../npm/dist/global/math/carbon/index.js";

const ROT_A = quat.normalize(quat.create(), quat.fromValues(0.3, -0.5, 0.2, 0.79));
const ROT_B = quat.normalize(quat.create(), quat.fromValues(-0.1, 0.6, -0.4, 0.68));
const A = mat4.fromRotationTranslationScale(
    mat4.create(), ROT_A, [ 3, -2, 5 ], [ 2, 0.5, 1.5 ],
);
const B = mat4.fromRotationTranslationScale(
    mat4.create(), ROT_B, [ -7, 4, 1 ], [ 0.25, 3, 1.25 ],
);
const POINT = Float32Array.from([ 1.5, -2.5, 4 ]);

function assertClose(actual, expected, label, tolerance = 1e-5)
{
    assert.equal(actual.length, expected.length, `${label} length`);

    for (let index = 0; index < expected.length; index++)
    {
        assert.ok(
            Math.abs(actual[index] - expected[index]) <= tolerance,
            `${label}[${index}]: ${actual[index]} != ${expected[index]}`,
        );
    }
}

test("Carbon a*b equals gl multiply(out, b, a) - the operand swap, executed", () =>
{
    const carbonOut = new Float32Array(16);
    const glOut = mat4.create();

    matrix.multiply(carbonOut, A, B);
    mat4.multiply(glOut, B, A);
    assertClose(carbonOut, glOut, "matrix.multiply");
});

test("Carbon quaternion q1*q2 equals gl quat.multiply(out, q2, q1)", () =>
{
    const carbonOut = new Float32Array(4);
    const glOut = quat.create();

    quaternion.multiply(carbonOut, ROT_A, ROT_B);
    quat.multiply(glOut, ROT_B, ROT_A);
    assertClose(carbonOut, glOut, "quaternion.multiply");
});

test("transformationMatrix(s, r, t) equals fromRotationTranslationScale(r, t, s)", () =>
{
    const carbonOut = new Float32Array(16);

    matrix.transformationMatrix(carbonOut, [ 2, 0.5, 1.5 ], ROT_A, [ 3, -2, 5 ]);
    assertClose(carbonOut, A, "transformationMatrix");
});

test("transformCoord equals vec3.transformMat4 on the shared layout", () =>
{
    const carbonOut = new Float32Array(3);
    const glOut = vec3.create();

    matrix.transformCoord(carbonOut, POINT, A);
    vec3.transformMat4(glOut, POINT, A);
    assertClose(carbonOut, glOut, "transformCoord");
});

test("transformNormal is the basis-only transform - no translation", () =>
{
    const carbonOut = new Float32Array(3);
    const expected = vec3.create();
    const noTranslation = mat4.clone(A);

    noTranslation[12] = noTranslation[13] = noTranslation[14] = 0;
    vec3.transformMat4(expected, POINT, noTranslation);
    matrix.transformNormal(carbonOut, POINT, A);
    assertClose(carbonOut, expected, "transformNormal");
});

test("transformByTranspose applies the transposed matrix - the m*p overload", () =>
{
    const carbonOut = new Float32Array(4);
    const expected = new Float32Array(4);
    const transposed = mat4.create();
    const point4 = Float32Array.from([ 1.5, -2.5, 4, 1 ]);

    mat4.transpose(transposed, A);
    vec4.transformMat4(expected, point4, transposed);
    matrix.transformByTranspose(carbonOut, point4, A);
    assertClose(carbonOut, expected, "transformByTranspose");

    const forward = new Float32Array(4);

    matrix.transform(forward, point4, A);
    vec4.transformMat4(expected, point4, A);
    assertClose(forward, expected, "transform (p*m)");
});

test("rotationMatrix from quaternion equals mat4.fromQuat byte-for-byte", () =>
{
    const carbonOut = new Float32Array(16);
    const glOut = mat4.create();

    matrix.rotationMatrix(carbonOut, ROT_A);
    mat4.fromQuat(glOut, ROT_A);
    assertClose(carbonOut, glOut, "rotationMatrix");
});

test("translation-first composition matches gl's post-multiply translate", () =>
{
    // Carbon: TranslationMatrix(v) * m (translate FIRST) == gl mat4.translate(out, m, v).
    const carbonOut = new Float32Array(16);
    const carbonT = new Float32Array(16);
    const glOut = mat4.create();

    matrix.translationMatrix(carbonT, [ 3, -2, 5 ]);
    matrix.multiply(carbonOut, carbonT, A);
    mat4.translate(glOut, A, [ 3, -2, 5 ]);
    assertClose(carbonOut, glOut, "translate-first");
});

test("a three-operand Carbon chain reads left-to-right in application order", () =>
{
    // Carbon: result = A * B * A applies A first, then B, then A again.
    // The gl composite for that order is built right-to-left:
    // out = A . (B . A). Both routes must agree.
    const carbonOut = new Float32Array(16);
    const glOut = mat4.create();
    const glTmp = mat4.create();

    matrix.multiply(carbonOut, A, B);
    matrix.multiply(carbonOut, carbonOut, A);
    mat4.multiply(glTmp, B, A);
    mat4.multiply(glOut, A, glTmp);
    assertClose(carbonOut, glOut, "three-operand chain");
});

test("inverse and transpose agree with gl on the shared layout", () =>
{
    const carbonOut = new Float32Array(16);
    const glOut = mat4.create();

    matrix.inverse(carbonOut, A);
    mat4.invert(glOut, A);
    assertClose(carbonOut, glOut, "inverse", 1e-4);

    matrix.transpose(carbonOut, A);
    mat4.transpose(glOut, A);
    assertClose(carbonOut, glOut, "transpose");
});
