import assert from "node:assert/strict";
import test from "node:test";

import { mesh, num, quat, tangent, vec3 as rootVec3, vec4 as rootVec4, vertex } from "../../../npm/dist/index.js";
import { isArrayLike } from "../../../npm/dist/global/utils/is.js";
import { mesh as subMesh } from "../../../npm/dist/global/math/mesh.js";
import { carbonPerlin1D, createPerlinNoise1D, perlin1, perlin1D } from "../../../npm/dist/global/math/noise.js";
import { cubicHermite, cubicHermiteDerivative } from "../../../npm/dist/global/math/num.js";
import { tangent as subTangent } from "../../../npm/dist/global/math/tangent.js";
import { copyArrayLike, fillArrayLike } from "../../../npm/dist/global/math/utils.js";
import { cross, normalize, vec3 as vec3Container } from "../../../npm/dist/global/math/vec3.js";
import * as vec3 from "../../../npm/dist/global/math/vec3.js";
import * as vec4 from "../../../npm/dist/global/math/vec4.js";

const
    POSITIONS = [
        0, 0, 0,
        1, 0, 0,
        0, 1, 0
    ],
    UVS = [
        0, 0,
        1, 0,
        0, 1
    ],
    INDICES = [ 0, 1, 2 ];

function almostEqualArray(actual, expected, epsilon = 1e-6)
{
    assert.equal(actual.length, expected.length);
    for (let i = 0; i < actual.length; i++)
    {
        assert.ok(Math.abs(actual[i] - expected[i]) <= epsilon, `${i}: expected ${expected[i]}, got ${actual[i]}`);
    }
}

test("root and subpath imports expose individual methods and containers", () =>
{
    assert.equal(rootVec3.cross, cross);
    assert.equal(rootVec3.normalize, normalize);
    assert.equal(vec3.cross, cross);
    assert.equal(vec3.normalize, normalize);
    assert.equal(vec3.vec3, vec3Container);
    assert.equal(vec3Container.cross, cross);
    assert.equal(rootVec4.createLinear, vec4.createLinear);
    assert.equal(mesh.generateNormals, subMesh.generateNormals);
    assert.equal(tangent.packTangentFrames, subTangent.packTangentFrames);
    assert.equal(num.clamp(2, 0, 1), 1);
    assert.equal(num.cubicHermite, cubicHermite);
    assert.equal(num.cubicHermiteDerivative, cubicHermiteDerivative);
    assert.equal(cubicHermite(2, 3, 11, 5, 0), 2);
    assert.equal(cubicHermite(2, 3, 11, 5, 1), 11);
    assert.ok(Math.abs(cubicHermite(2, 3, 11, 5, 0.4) - 5.12) <= 1e-12);
    assert.equal(cubicHermiteDerivative(2, 3, 11, 5, 0), 3);
    assert.equal(cubicHermiteDerivative(2, 3, 11, 5, 1), 5);
    assert.ok(Math.abs(cubicHermiteDerivative(2, 3, 11, 5, 0.4) - 11) <= 1e-12);
    assert.equal(isArrayLike(new Float32Array(3), 3), true);
    assert.deepEqual(copyArrayLike([ 0, 0 ], [ 1, 2, 3 ]), [ 1, 2 ]);
    assert.deepEqual(fillArrayLike([ 0, 0 ], 4), [ 4, 4 ]);

    const
        out = [ 0, 0, 0 ],
        unit = [ 0, 0, 0 ];

    cross(out, [ 1, 0, 0 ], [ 0, 1, 0 ]);
    normalize(unit, [ 0, 0, 2 ]);
    assert.deepEqual(out, [ 0, 0, 1 ]);
    assert.deepEqual(unit, [ 0, 0, 1 ]);
});

test("mesh generates normals, tangents, and binormals", () =>
{
    const
        normals = mesh.generateNormals(POSITIONS, INDICES),
        tangents = mesh.generateTangents(POSITIONS, normals, UVS, INDICES),
        binormals = mesh.generateBiNormals(normals, tangents);

    almostEqualArray(normals, [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
    ]);
    almostEqualArray(tangents, [
        1, 0, 0,
        1, 0, 0,
        1, 0, 0
    ]);
    almostEqualArray(binormals, [
        0, 1, 0,
        0, 1, 0,
        0, 1, 0
    ]);
});

test("mesh writes triangle normals into caller-owned storage", () =>
{
    const out = new Float32Array(3);

    assert.equal(
        mesh.triangleNormalTo(out, [ 0, 0, 0 ], [ 1, 0, 0 ], [ 0, 1, 0 ]),
        out
    );
    assert.deepEqual([ ...out ], [ 0, 0, 1 ]);
});

test("vertex compatibility delegates to shared mesh math", () =>
{
    almostEqualArray(
        vertex.calculateTangents(INDICES, POSITIONS, UVS),
        mesh.generateTangents(POSITIONS, mesh.generateNormals(POSITIONS, INDICES), UVS, INDICES)
    );
});

test("quat creates Carbon yaw pitch roll rotations", () =>
{
    const out = quat.fromYawPitchRoll(quat.create(), 0.5, 0.6, 0.7);

    almostEqualArray(out, [
        0.350018859,
        0.123841502,
        0.248718783,
        0.894588768
    ]);
});

test("one-dimensional Perlin noise matches Carbon's seeded implementation", () =>
{
    const
        first = createPerlinNoise1D(0),
        second = createPerlinNoise1D(0),
        other = createPerlinNoise1D(1),
        expectedAtPointTwoOne = 0.0123161308593752;

    assert.ok(Math.abs(first.sample(0.21) - expectedAtPointTwoOne) <= 1e-15);
    assert.equal(second.sample(0.21), first.sample(0.21));
    assert.notEqual(other.sample(0.21), first.sample(0.21));
    assert.equal(carbonPerlin1D(0.21, 1.1, 2, 3), first.fractalSum(0.21, 3, 1 / 1.1, 2));
    assert.equal(typeof perlin1(0.21), "number");
    assert.equal(typeof perlin1D(0.21, 1.1, 2, 3), "number");
    assert.equal(first.fractalSum(3, -1), 0);
});

test("vec3 exposes reusable color-space transforms", () =>
{
    const
        srgb = [ 0.25, 0.5, 0.75 ],
        out = [ 9, 9, 9 ];

    assert.equal(vec3.linearFromSRGB(out, srgb), out);
    almostEqualArray(out, [
        num.linearFromSRGB(0.25),
        num.linearFromSRGB(0.5),
        num.linearFromSRGB(0.75)
    ]);

    assert.equal(vec3.linearToGamma(out, srgb), out);
    almostEqualArray(out, [
        num.linearToGamma(0.25),
        num.linearToGamma(0.5),
        num.linearToGamma(0.75)
    ]);

    assert.equal(vec3.gammaToLinear(out, srgb), out);
    almostEqualArray(out, [
        num.gammaToLinear(0.25),
        num.gammaToLinear(0.5),
        num.gammaToLinear(0.75)
    ]);

    assert.equal(vec3.srgbFromLinear(out, srgb), out);
    almostEqualArray(out, [
        num.srgbFromLinear(0.25),
        num.srgbFromLinear(0.5),
        num.srgbFromLinear(0.75)
    ]);
});

test("vec4 creates opaque linear colors", () =>
{
    almostEqualArray(vec4.createLinear(), [ 0, 0, 0, 1 ]);
});

test("tangent packs and decodes a GR2-style tangent frame", () =>
{
    const
        normals = mesh.generateNormals(POSITIONS, INDICES),
        tangents = mesh.generateTangents(POSITIONS, normals, UVS, INDICES),
        binormals = mesh.generateBiNormals(normals, tangents),
        packed = tangent.packTangentFrames(normals, tangents, binormals),
        decoded = tangent.decodeTangentFrame(packed.slice(0, 4));

    assert.equal(packed.length, 12);
    assert.equal(decoded.null, false);
    almostEqualArray(decoded.T, [ 1, 0, 0 ], 1e-5);
    almostEqualArray(decoded.B, [ 0, 1, 0 ], 1e-5);
    almostEqualArray(decoded.N, [ 0, 0, 1 ], 1e-5);
});
