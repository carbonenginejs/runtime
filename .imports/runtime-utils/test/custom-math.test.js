import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import * as box3 from "@carbonenginejs/runtime-utils/box3";
import * as curve from "@carbonenginejs/runtime-utils/curve";
import * as geometry from "@carbonenginejs/runtime-utils/geometry";
import * as is from "@carbonenginejs/runtime-utils/is";
import * as lne3 from "@carbonenginejs/runtime-utils/lne3";
import * as mat4 from "@carbonenginejs/runtime-utils/mat4";
import * as mesh from "@carbonenginejs/runtime-utils/mesh";
import * as num from "@carbonenginejs/runtime-utils/num";
import * as pln from "@carbonenginejs/runtime-utils/pln";
import * as quat from "@carbonenginejs/runtime-utils/quat";
import * as ray3 from "@carbonenginejs/runtime-utils/ray3";
import * as sph3 from "@carbonenginejs/runtime-utils/sph3";
import * as tangent from "@carbonenginejs/runtime-utils/tangent";
import * as tri3 from "@carbonenginejs/runtime-utils/tri3";
import { copyArrayLike } from "@carbonenginejs/runtime-utils/utils";
import * as vec3 from "@carbonenginejs/runtime-utils/vec3";
import * as vec4 from "@carbonenginejs/runtime-utils/vec4";
import { getShapeArea } from "../src/geometry/helpers/misc.js";
import { toJSON } from "../src/geometry/json.js";

function almostEqual(actual, expected, epsilon = 1e-6)
{
    assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${expected}, got ${actual}`);
}

function almostEqualArray(actual, expected, epsilon = 1e-6)
{
    assert.equal(actual.length, expected.length);
    for (let i = 0; i < actual.length; i++)
    {
        almostEqual(actual[i], expected[i], epsilon);
    }
}

function triangleArea2(positions, a, b, c)
{
    const
        ax = positions[b * 3] - positions[a * 3],
        ay = positions[b * 3 + 1] - positions[a * 3 + 1],
        az = positions[b * 3 + 2] - positions[a * 3 + 2],
        bx = positions[c * 3] - positions[a * 3],
        by = positions[c * 3 + 1] - positions[a * 3 + 1],
        bz = positions[c * 3 + 2] - positions[a * 3 + 2];

    return Math.hypot(
        ay * bz - az * by,
        az * bx - ax * bz,
        ax * by - ay * bx
    );
}

test("advertised primitive subpaths import independently", () =>
{
    for (const name of [ "box3", "tri3", "lne3", "pln", "ray3", "sph3" ])
    {
        const result = spawnSync(
            process.execPath,
            [ "--input-type=module", "-e", `await import("@carbonenginejs/runtime-utils/${name}")` ],
            { cwd: process.cwd(), encoding: "utf8" }
        );
        assert.equal(result.status, 0, `${name}: ${result.stderr}`);
    }
});

test("scalar comparisons, wrapping, bit reinterpretation, and masks are correct", () =>
{
    assert.equal(num.greaterThanEqual(1, 1), 1);
    assert.equal(num.greaterThanEqual(Infinity, Infinity), 1);
    assert.equal(num.greaterThanEqual(1, 1 + num.EPSILON / 2), 1);
    assert.equal(num.lessThanEqual(1, 1), 1);
    assert.equal(num.lessThanEqual(-Infinity, -Infinity), 1);
    assert.equal(num.lessThanEqual(1, 1 - num.EPSILON / 2), 1);
    assert.equal(num.normalizeInt(12, 10, 15), 12);
    assert.equal(num.normalizeInt(8, 10, 15), 13);
    assert.equal(num.normalizeInt(17, 10, 15), 12);
    assert.equal(num.dwordToFloat(0x7f800000), Infinity);
    assert.ok(Number.isNaN(num.dwordToFloat(0x7fc00000)));
    assert.equal(num.dwordToFloat(1), 2 ** -149);
    assert.equal(num.dwordToFloat(0xbf800000), -1);
    assert.ok(Object.is(num.dwordToFloat(0x80000000), -0));
    assert.deepEqual(
        [ 0x000000ff, 0x0000ff00, 0x00ff0000, -16777216 ].map(num.getLongWordOrder),
        [ 0, 1, 2, 3 ]
    );
    assert.equal(num.isPowerOfTwo(1024), true);
    assert.equal(num.isPowerOfTwo(-2147483648), false);
    assert.equal(num.isPowerOfTwo(4294967298), false);
    assert.equal(num.colorFromLinear(-0.1), 0);
});

test("half-float conversion handles finite limits, infinities, and NaN", () =>
{
    assert.equal(num.toHalfFloat(70000), 0x7c00);
    assert.equal(num.toHalfFloat(Infinity), 0x7c00);
    assert.equal(num.toHalfFloat(-Infinity), 0xfc00);
    assert.ok((num.toHalfFloat(NaN) & 0x03ff) !== 0);
    almostEqual(num.fromHalfFloat(num.toHalfFloat(1 / 3)), 1 / 3, 0.0002);
    assert.ok(num.toHalfFloat(70000) <= 0xffff);
});

test("quaternion unit-vector rotation is safe when output aliases input", () =>
{
    const from = new Float32Array([ 1, 0, 0, 0 ]);
    quat.fromUnitVectors(from, from, [ 0, 1, 0 ]);
    almostEqualArray(from, [ 0, 0, Math.SQRT1_2, Math.SQRT1_2 ]);
});

test("vec3.maxComponent reduces to the largest component, not a component-wise max", () =>
{
    assert.equal(vec3.maxComponent([ 1, 5, 3 ]), 5);
    assert.equal(vec3.maxComponent([ 7, 2, 2 ]), 7);
    assert.equal(vec3.maxComponent([ 0, 0, 9 ]), 9);

    // All-negative reduces to the least negative, not to zero.
    assert.equal(vec3.maxComponent([ -4, -1, -9 ]), -1);
    assert.equal(vec3.maxComponent(new Float32Array([ 0.25, 0.5, 0.125 ])), 0.5);

    // The distinction from gl-matrix's component-wise max, which is a vector.
    assert.equal(typeof vec3.maxComponent([ 1, 2, 3 ]), "number");
    assert.equal(vec3.max(vec3.create(), [ 1, 2, 3 ], [ 3, 2, 1 ]).length, 3);
});

test("matrix helpers preserve view, scale, projection, arc, and reflection invariants", () =>
{
    const
        eye = [ 1, 2, 3 ],
        center = [ 4, 3, 8 ],
        view = mat4.lookAtD3D(mat4.create(), eye, center, [ 0, 1, 0 ]),
        eyeView = vec3.transformMat4(vec3.create(), eye, view),
        centerView = vec3.transformMat4(vec3.create(), center, view);

    almostEqualArray(eyeView, [ 0, 0, 0 ]);
    almostEqual(centerView[0], 0);
    almostEqual(centerView[1], 0);
    assert.ok(centerView[2] > 0);

    for (const up of [ [ 0, 0, 0 ], [ 0, 0, 2 ] ])
    {
        const
            fallback = mat4.lookAtD3D(mat4.create(), [ 1, 2, 3 ], [ 1, 2, 4 ], up),
            fallbackEye = vec3.transformMat4(vec3.create(), [ 1, 2, 3 ], fallback),
            fallbackCenter = vec3.transformMat4(vec3.create(), [ 1, 2, 4 ], fallback);
        assert.ok(Array.from(fallback).every(Number.isFinite));
        almostEqualArray(fallbackEye, [ 0, 0, 0 ]);
        almostEqualArray(fallbackCenter, [ 0, 0, 1 ]);
    }

    const
        rotation = quat.setAxisAngle(quat.create(), [ 0, 0, 1 ], Math.PI / 4),
        scaled = mat4.fromRotationTranslationScale(mat4.create(), rotation, [ 0, 0, 0 ], [ 3, 1, 1 ]);

    almostEqual(mat4.maxScaleOnAxis(scaled), 3);

    const perspective = mat4.perspectiveGL(mat4.create(), Math.PI / 2, 1, 1, 10);
    almostEqual(perspective[0], 1);
    almostEqual(perspective[5], 1);
    almostEqual(vec3.transformMat4(vec3.create(), [ 0, 0, -1 ], perspective)[2], -1);
    almostEqualArray(mat4.arcFromForward(mat4.create(), [ 0, 0, 0 ]), mat4.create());

    const
        source = mat4.create(),
        lookA = mat4.setLookRotation(mat4.create(), source, [ 0, 0, 0 ], [ 0, -0.001, -0.9999995 ], [ 0, 1, 0 ]),
        lookB = mat4.setLookRotation(mat4.create(), source, [ 0, 0, 0 ], [ 0, -0.001, -0.9999995 ], [ 0, 1000, 0 ]);
    almostEqualArray(lookA, lookB);

    const
        reflected = mat4.fromRotationTranslationScale(
            mat4.create(),
            quat.setAxisAngle(quat.create(), [ 0, 1, 0 ], 0.7),
            [ 1, 2, 3 ],
            [ -2, 3, 4 ]
        ),
        outRotation = quat.create(),
        outTranslation = vec3.create(),
        outScale = vec3.create();

    mat4.decompose(reflected, outRotation, outTranslation, outScale);
    const recomposed = mat4.fromRotationTranslationScale(mat4.create(), outRotation, outTranslation, outScale);
    almostEqualArray(recomposed, reflected);

    mat4.decompose(
        mat4.fromRotationTranslationScale(mat4.create(), rotation, [ 1, 2, 3 ], [ 0, 2, 3 ]),
        outRotation,
        outTranslation,
        outScale
    );
    assert.ok(Array.from(outRotation).every(Number.isFinite));

    for (const oneAxisScale of [ [ -2, 0, 0 ], [ 0, -2, 0 ], [ 0, 0, -2 ] ])
    {
        const singular = mat4.fromRotationTranslationScale(
            mat4.create(),
            rotation,
            [ 1, 2, 3 ],
            oneAxisScale
        );
        mat4.decompose(singular, outRotation, outTranslation, outScale);
        almostEqualArray(
            mat4.fromRotationTranslationScale(mat4.create(), outRotation, outTranslation, outScale),
            singular
        );
    }
});

test("vec4 array helpers back the plane and sphere public exports", () =>
{
    const
        source = [ 9, 1, 2, 3, 4, 8 ],
        out = vec4.create(),
        target = [ 0, 0, 0, 0, 0, 0 ];

    assert.equal(vec4.setArray(out, source, 1), out);
    almostEqualArray(out, [ 1, 2, 3, 4 ]);
    assert.equal(vec4.toArray(out, target, 1), out);
    assert.deepEqual(target, [ 0, 1, 2, 3, 4, 0 ]);
    assert.equal(typeof pln.setArray, "function");
    assert.equal(typeof sph3.setArray, "function");
    assert.equal(typeof sph3.toArray, "function");
});

test("invalid hexadecimal colors are rejected", () =>
{
    assert.throws(() => vec3.fromHex(vec3.create(), "#gggggg"), TypeError);
    assert.throws(() => vec4.fromHex(vec4.create(), "#12xz"), TypeError);
});

test("box emptiness, transforms, plane intersection, and corners are correct", () =>
{
    const
        centered = box3.fromValues(-1, -1, -1, 1, 1, 1),
        transformed = box3.fromTransform(box3.create(), mat4.create(), 2),
        empty = box3.create();

    assert.equal(box3.isEmpty(centered), false);
    almostEqualArray(transformed, centered);

    const
        rotation = quat.setAxisAngle(quat.create(), [ 0, 0, 1 ], Math.PI * 0.5),
        transform = mat4.fromRotationTranslationScale(
            mat4.create(),
            rotation,
            [ 5, 6, 7 ],
            [ 2, 4, 6 ]
        ),
        transformedCentered = box3.transformMat4(box3.create(), centered, transform);
    almostEqualArray(transformedCentered, [ 1, 4, 1, 9, 8, 13 ]);

    assert.equal(box3.isEmpty(empty), true);
    assert.equal(box3.equals(empty, box3.create()), true);
    assert.deepEqual(Array.from(box3.getSize(vec3.create(), empty)), [ 0, 0, 0 ]);
    assert.equal(box3.radius(empty), 0);
    assert.deepEqual(box3.toPoints(empty), []);
    box3.addPoint(empty, empty, [ 5, 5, 5 ]);
    almostEqualArray(empty, [ 5, 5, 5, 5, 5, 5 ]);

    const
        disjoint = box3.intersect(
            box3.create(),
            box3.fromValues(0, 0, 0, 1, 1, 1),
            box3.fromValues(2, 2, 2, 3, 3, 3)
        ),
        valid = box3.fromValues(4, 5, 6, 7, 8, 9);
    assert.equal(box3.isEmpty(disjoint), true);
    almostEqualArray(box3.union(disjoint, disjoint, valid), valid);

    assert.equal(
        box3.intersectsPln(box3.fromValues(1, 0, 0, 3, 1, 1), [ 1, 0, 0, -2 ]),
        true
    );

    const points = box3.toPoints(box3.fromValues(1, 2, 3, 4, 5, 6));
    assert.equal(points.length, 8);
    for (const point of points)
    {
        assert.ok(point[0] === 1 || point[0] === 4);
        assert.ok(point[1] === 2 || point[1] === 5);
        assert.ok(point[2] === 3 || point[2] === 6);
    }
});

test("triangle area uses the complete cross product", () =>
{
    const triangle = tri3.fromVertices(
        tri3.create(),
        [ 0, 0, 4 ],
        [ 0, 0, 0 ],
        [ 2, 3, 0 ]
    );
    almostEqual(tri3.area(triangle), Math.sqrt(208) / 2);
});

test("line closest-point and projective transforms handle edge cases", () =>
{
    const
        line = lne3.fromStartEnd(lne3.create(), [ 0, 0, 0 ], [ 1, 0, 0 ]),
        closest = vec3.create();

    lne3.getClosestPointToPoint(closest, line, [ 2, 1, 0 ], false);
    almostEqualArray(closest, [ 2, 0, 0 ]);

    const pointLine = lne3.fromStartEnd(lne3.create(), [ 3, 4, 5 ], [ 3, 4, 5 ]);
    lne3.getClosestPointToPoint(closest, pointLine, [ 8, 9, 10 ], false);
    almostEqualArray(closest, [ 3, 4, 5 ]);

    const projective = new Float32Array([
        1, 0, 0, 1,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    lne3.transformMat4(line, line, projective);
    almostEqualArray(line, [ 0, 0, 0, 0.5, 0, 0 ]);
});

test("plane operations are scale invariant and ordinary misses return null", () =>
{
    const
        plane = new Float32Array([ 2, 0, 0, -2 ]),
        projected = vec3.create();

    almostEqual(pln.distanceToPoint(plane, [ 3, 1, 0 ]), 2);
    pln.getProjectedPoint(projected, plane, [ 3, 1, 0 ]);
    almostEqualArray(projected, [ 1, 1, 0 ]);
    assert.equal(pln.intersectsPositionRadius(plane, [ 2, 0, 0 ], 1), true);

    const transformed = pln.transformMat4(pln.create(), plane, mat4.create());
    almostEqualArray(transformed, [ 1, 0, 0, -1 ]);

    const
        zero = pln.create(),
        point = [ 2, 3, 4 ];
    assert.equal(pln.distanceToPoint(zero, point), 0);
    almostEqualArray(pln.getCoplanarPoint(vec3.create(), zero), [ 0, 0, 0 ]);
    almostEqualArray(pln.getProjectedPoint(vec3.create(), zero, point), point);
    almostEqualArray(pln.transformMat4(pln.create(), zero, mat4.create()), zero);

    const parallelLine = lne3.fromStartEnd(lne3.create(), [ 0, 0, 0 ], [ 1, 0, 0 ]);
    assert.equal(pln.getIntersectLne3(vec3.create(), [ 0, 1, 0, -1 ], parallelLine), null);
    assert.equal(pln.getIntersectStartEnd(vec3.create(), [ 0, 1, 0, -1 ], [ 0, 0, 0 ], [ 1, 0, 0 ]), null);
});

test("rays support non-unit directions and preserve origins on normalize failure", () =>
{
    const
        ray = new Float32Array([ 0, 0, 0, 2, 0, 0 ]),
        closest = ray3.getClosestPointToPoint(vec3.create(), ray, [ 1, 1, 0 ]),
        hit = ray3.getIntersectSph3(vec3.create(), ray, [ 5, 0, 0, 1 ]);

    almostEqualArray(closest, [ 1, 0, 0 ]);
    almostEqual(ray3.distance(ray, [ 1, 1, 0 ]), 1);
    almostEqualArray(hit, [ 4, 0, 0 ]);
    almostEqual(ray3.distancePln(ray, [ 1, 0, 0, -4 ]), 4);
    almostEqualArray(ray3.getIntersectPln(vec3.create(), ray, [ 1, 0, 0, -4 ]), [ 4, 0, 0 ]);
    almostEqualArray(ray3.get(vec3.create(), ray, 4), [ 4, 0, 0 ]);
    almostEqualArray(ray3.recast(ray3.create(), ray, 4), [ 4, 0, 0, 2, 0, 0 ]);
    almostEqualArray(ray3.from(ray3.create(), [ 1, 2, 3 ], [ 2, 0, 0 ]), [ 1, 2, 3, 1, 0, 0 ]);
    assert.equal(ray3.distancePln(ray, [ 0, 1, 0, -1 ]), null);
    assert.deepEqual(Array.from(ray3.create()), [ 0, 0, 0, 0, 0, 0 ]);

    const invalid = new Float32Array([ 1, 2, 3, 0, 0, 0 ]);
    assert.throws(() => ray3.normalize(invalid, invalid), /Normalization/);
    assert.deepEqual(Array.from(invalid), [ 1, 2, 3, 0, 0, 0 ]);
});

test("sphere emptiness, union, vector translation, and squared distances agree", () =>
{
    const
        empty = sph3.create(),
        pointSphere = sph3.fromPositionRadius(sph3.create(), [ 0, 0, 0 ], 0),
        sphere = sph3.fromPositionRadius(sph3.create(), [ 5, 0, 0 ], 2),
        union = sph3.create();

    assert.equal(sph3.isEmpty(empty), true);
    assert.equal(sph3.isEmpty(pointSphere), false);
    sph3.union(union, empty, sphere);
    almostEqualArray(union, sphere);
    almostEqualArray(sph3.fromTranslationRadius(sph3.create(), [ 1, 2, 3 ], 4), [ 1, 2, 3, 4 ]);
    almostEqual(sph3.squaredDistanceToPoint([ 0, 0, 0, 2 ], [ 5, 0, 0 ]), 9);
    almostEqual(sph3.squaredDistance([ 0, 0, 0, 1 ], [ 5, 0, 0, 1 ]), 9);
});

test("curve evaluation handles empty, linear, and first quadratic intervals", () =>
{
    const out = [ 99 ];
    assert.equal(curve.evaluate({ knots: [], controls: [], dimension: 1, degree: 1 }, 0, out), out);
    assert.deepEqual(out, [ 99 ]);

    curve.evaluate({ knots: [ 0, 1 ], controls: [ 0, 10 ], dimension: 1, degree: 1 }, 0.5, out, false, 1);
    almostEqual(out[0], 5);

    curve.evaluate({ knots: [ 0, 1, 2 ], controls: [ 0, 10, 20 ], dimension: 1, degree: 2 }, 0.5, out, false, 2);
    almostEqual(out[0], 1.25);

    curve.evaluate({ knots: [ 0, 1 ], controls: [ 0, 10 ], dimension: 1, degree: 1 }, 1.5, out, false, 2);
    almostEqual(out[0], 10);

    curve.evaluate({ knots: [ 1, 3 ], controls: [ 10, 30 ], dimension: 1, degree: 1 }, 4.5, out, true, 5);
    almostEqual(out[0], 20);
});

test("iterability, DNA, canvas safety, and deep equality predicates are boolean-correct", () =>
{
    assert.equal(is.isIterable([ 1, 2 ]), true);
    assert.equal(is.isIterable(new Set()), true);
    assert.equal(is.isIterable({}), false);
    assert.equal(is.isDNA("hull:faction:race"), true);
    assert.equal(is.isDNA("prefix hull:faction:race suffix"), false);
    assert.equal(is.isCanvas({}), false);
    assert.equal(is.isEqual({ a: 1, nested: { b: 2 } }, { a: 1, nested: { b: 2 } }), true);
    assert.equal(is.isEqual({ a: 1 }, { a: 2 }), false);
    assert.equal(is.isEqual(Object.assign(Object.create(null), { a: 1 }), Object.assign(Object.create(null), { a: 1 })), true);
});

test("overlapping array-like copies have memmove semantics", () =>
{
    const values = new Uint8Array([ 1, 2, 3, 4 ]);
    copyArrayLike(values.subarray(1), values.subarray(0, 3));
    assert.deepEqual(Array.from(values), [ 1, 1, 2, 3 ]);
    assert.deepEqual(copyArrayLike([], { length: Infinity }), []);
    assert.deepEqual(copyArrayLike([ 0, 0 ], "💩"), [ "\ud83d", "\udca9" ]);
});

test("polygon area and shape generation do not corrupt caller contours", () =>
{
    almostEqual(getShapeArea([ [ 0, 0 ], [ -3, -3 ], [ -2, -3 ] ]), 1.5);

    const shapes = [ {
        positions: [ [ 0, 0 ], [ 0, 1 ], [ 1, 0 ], [ 0, 0 ] ],
        holes: []
    } ];
    const original = structuredClone(shapes);
    geometry.createShape(shapes);
    assert.deepEqual(shapes, original);
});

test("mesh channel validation rejects malformed topology", () =>
{
    assert.throws(() => mesh.generateNormals([ 0, 0, 0 ], [ 0, 1, 2 ]), /Invalid vertex index/);
    assert.throws(() => mesh.generateNormals([ 0, 0, 0 ], [ 0, 0 ]), /complete triangles/);
    assert.throws(
        () => toJSON([ 0, 1, 2 ], [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ], [ 0, 0, 1, 0 ]),
        /channel lengths/
    );
    assert.throws(
        () => mesh.generateBiNormals([ 0, 0, 1, 0 ], [ 1, 0, 0, 0 ]),
        /complete xyz/
    );
    assert.throws(
        () => tangent.packTangentFrames([ 0, 0, 1, 0 ], [ 1, 0, 0, 0 ], [ 0, 1, 0, 0 ]),
        /complete xyz/
    );
    assert.throws(
        () => tangent.packTangentFrames([ 0, 0, 1 ], [ Infinity, 0, 0 ], [ 0, 1, 0 ]),
        /non-finite/
    );
    assert.deepEqual(
        tangent.packTangentFrames([ 0, 0, 1 ], [ 1, 0, 0 ], [ 1, 0, 0 ]),
        tangent.NULL_TANGENT_UNORM
    );
    assert.deepEqual(
        mesh.computeBoundsFromTriangles([ { vertices: [] } ]),
        { minBounds: [ 0, 0, 0 ], maxBounds: [ 0, 0, 0 ] }
    );
});

test("empty areas keep topology and large meshes select 32-bit indices", () =>
{
    const small = toJSON(
        [ 0, 1, 2 ],
        [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
        [ 0, 0, 1, 0, 0, 1 ],
        [ 0, 0, 1, 0, 0, 1, 0, 0, 1 ],
        []
    );
    assert.deepEqual(small.meshes[0].indices[0].faces, [ 0, 1, 2 ]);

    const large = geometry.createPlane({ widthSegments: 256, heightSegments: 256 });
    assert.equal(large.meshes[0].indices[0].bytesPerIndex, 4);

    const
        largeMesh = large.meshes[0],
        largeArea = largeMesh.indices[0];
    assert.throws(
        () => toJSON(
            largeArea.faces,
            largeMesh.vertex.position,
            largeMesh.vertex.texcoord0,
            largeMesh.vertex.normal,
            [ { start: 0, count: largeArea.count, bytesPerIndex: 2 } ],
            largeMesh.vertex.tangent
        ),
        /bytes per index/
    );
    assert.throws(
        () => toJSON(
            [ 0, 1, 2 ],
            [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
            [ 0, 0, 1, 0, 0, 1 ],
            [ 0, 0, 1, 0, 0, 1, 0, 0, 1 ],
            [ { start: 0, count: 3, bytesPerIndex: 3 } ],
            [ 1, 0, 0, 1, 0, 0, 1, 0, 0 ]
        ),
        /bytes per index/
    );
});

test("mirrored UVs preserve per-vertex tangent handedness", () =>
{
    const
        positions = [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
        normals = [ 0, 0, 1, 0, 0, 1, 0, 0, 1 ],
        uvs = [ 0, 0, -1, 0, 0, 1 ],
        indices = [ 0, 1, 2 ],
        tangents = mesh.generateTangents(positions, normals, uvs, indices),
        binormals = mesh.generateBiNormals(normals, tangents, { uvHandedness: "right" }),
        leftBinormals = mesh.generateBiNormals(normals, tangents, { uvHandedness: "left" }),
        stableFrame = mesh.generateTangentFrames(positions, normals, uvs, indices),
        copiedTangents = Array.from(stableFrame.tangents),
        copiedBinormals = mesh.generateBiNormals(normals, copiedTangents, {
            handedness: stableFrame.handedness
        });

    almostEqualArray(tangents, [ -1, 0, 0, -1, 0, 0, -1, 0, 0 ]);
    almostEqualArray(binormals, [ 0, 1, 0, 0, 1, 0, 0, 1, 0 ]);
    almostEqualArray(leftBinormals, [ 0, -1, 0, 0, -1, 0, 0, -1, 0 ]);
    almostEqualArray(copiedBinormals, binormals);
});

test("packed tangent polar frames retain their normal orientation", () =>
{
    for (const [ tangentVector, binormalVector, expectedNormal ] of [
        [ [ 0, 0, 1 ], [ 0, 1, 0 ], [ -1, 0, 0 ] ],
        [ [ 0, 0, 1 ], [ 0, 1, 0 ], [ 1, 0, 0 ] ],
        [ [ 1, 0, 0 ], [ 0, 0, 1 ], [ 0, -1, 0 ] ]
    ])
    {
        const
            packed = tangent.encodeTangentFrame(tangentVector, binormalVector, expectedNormal),
            quantized = packed.map(value => Math.round(value * 255) / 255),
            decoded = tangent.decodeTangentFrame(quantized);

        assert.ok(
            decoded.N[0] * expectedNormal[0] +
            decoded.N[1] * expectedNormal[1] +
            decoded.N[2] * expectedNormal[2] > 0.999
        );
    }
});

test("packed tangent goldens match runtime-resource GR2 shader inputs", () =>
{
    almostEqualArray(
        tangent.encodeTangentFrame([ 1, 0, 0 ], [ 0, 1, 0 ], [ 0, 0, 1 ]),
        [ 0.5, 0.75, 0.75, 0.75 ]
    );
    almostEqualArray(
        tangent.encodeTangentFrame([ 1, 0, 0 ], [ 0, -1, 0 ], [ 0, 0, 1 ]),
        [ 0.5, 0.25, 0.25, 0.75 ]
    );
});

test("geometry defaults are finite, nondegenerate, exported, and rebuildable", () =>
{
    const
        box = geometry.createBox({ widthSegments: 0 }),
        sphere = geometry.createSphere(),
        cone = geometry.createCone(),
        lathe = geometry.createLathe();

    assert.ok(box.meshes[0].vertex.position.every(Number.isFinite));
    assert.equal(box.factory, geometry.createBox);
    assert.equal(sphere.factory, geometry.createSphere);
    assert.equal(typeof geometry.createLathe, "function");

    for (const generated of [ cone, lathe ])
    {
        const
            positions = generated.meshes[0].vertex.position,
            faces = generated.meshes[0].indices[0].faces;

        for (let i = 0; i < faces.length; i += 3)
        {
            assert.ok(triangleArea2(positions, faces[i], faces[i + 1], faces[i + 2]) > 1e-12);
        }
    }

    const latheNormals = lathe.meshes[0].vertex.normal;
    for (let i = 0; i < latheNormals.length; i += 3)
    {
        almostEqual(Math.hypot(latheNormals[i], latheNormals[i + 1], latheNormals[i + 2]), 1);
    }
});

test("geometry factories reject non-finite or fully degenerate inputs", () =>
{
    assert.throws(() => geometry.createBox({ width: Infinity }), /Box dimensions/);
    assert.throws(() => geometry.createPlane({ height: 0 }), /Plane dimensions/);
    assert.throws(() => geometry.createCylinder({ height: 0 }), /cylinder dimensions/);
    assert.throws(() => geometry.createSphere({ radius: 0 }), /sphere dimensions/);
    assert.throws(() => geometry.createTorus({ tube: 0 }), /torus dimensions/);
    assert.throws(() => geometry.createLathe({ phiLength: 0 }), /lathe sweep/);
});
