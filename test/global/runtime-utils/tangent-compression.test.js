import assert from "node:assert/strict";
import test from "node:test";

import {
    TangentCompression,
    decodeTangentFrame,
    packTangentsCarbon,
    packTangentsLegacyCarbon,
    packTangentsQuaternionCarbon,
    unpackTangentsCarbon,
    unpackTangentsLegacyCarbon
} from "@carbonenginejs/runtime/math/tangent";
import { quat } from "@carbonenginejs/runtime/math/quat";

/**
 * Carbon's two tangent packings (mesh/src/cmf/tangents.cpp): each round-trips
 * a frame of either handedness, and the legacy unpack agrees with the decoder
 * the gr2 reader uses.
 */

/** Orthonormal frames from rotations, half of them left-handed. */
function frames()
{
    const out = [];
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    for (let index = 0; index < 64; index++)
    {
        const q = quat.normalize([ 0, 0, 0, 1 ], [ random(), random(), random(), random() ]);
        const rotate = v => Array.from(quat.transformVec3 ? quat.transformVec3([], q, v) : rotateBy(q, v));
        const tangent = rotate([ 1, 0, 0 ]), bitangent = rotate([ 0, 1, 0 ]), normal = rotate([ 0, 0, 1 ]);
        out.push(index % 2 ? { normal: normal.map(value => -value), tangent, bitangent } : { normal, tangent, bitangent });
    }
    return out;
}

function rotateBy(q, v)
{
    const [ x, y, z, w ] = q;
    const uv = [ y * v[2] - z * v[1], z * v[0] - x * v[2], x * v[1] - y * v[0] ];
    const uuv = [ y * uv[2] - z * uv[1], z * uv[0] - x * uv[2], x * uv[1] - y * uv[0] ];
    return [ 0, 1, 2 ].map(axis => v[axis] + 2 * (w * uv[axis] + uuv[axis]));
}

const close = (actual, expected, message) => actual.forEach((value, axis) => assert.ok(Math.abs(value - expected[axis]) < 1e-5, `${message}: ${actual} vs ${expected}`));

test("both packings round-trip frames of either handedness", () =>
{
    for (const compression of [ TangentCompression.PackedTangent, TangentCompression.PackedTangentLegacy ])
    {
        for (const { normal, tangent, bitangent } of frames())
        {
            const [ n, t, b ] = unpackTangentsCarbon(compression, packTangentsCarbon(compression, normal, tangent, bitangent));
            close(n, normal, `normal, compression ${compression}`);
            close(t, tangent, `tangent, compression ${compression}`);
            close(b, bitangent, `bitangent, compression ${compression}`);
        }
    }
});

test("the quaternion packing keeps w non-negative and stores the normal's sign in w", () =>
{
    for (const [ index, { normal, tangent, bitangent } ] of frames().entries())
    {
        const packed = packTangentsQuaternionCarbon(normal, tangent, bitangent);
        assert.equal(packed[3], index % 2 ? -1 : 1);
        assert.ok(packed[0] ** 2 + packed[1] ** 2 + packed[2] ** 2 <= 1 + 1e-6);
    }
});

test("the legacy packing stays in [0, 1], negates both polar angles for a left-handed frame, and unpacks as the gr2 decoder does", () =>
{
    for (const [ index, { normal, tangent, bitangent } ] of frames().entries())
    {
        const packed = packTangentsLegacyCarbon(normal, tangent, bitangent);
        assert.ok(packed.every(value => value >= 0 && value <= 1));
        const polarSigns = [ packed[1] - 0.5, packed[3] - 0.5 ].map(Math.sign);
        assert.deepEqual(polarSigns, index % 2 ? [ -1, -1 ] : [ 1, 1 ]);
        const [ n, t, b ] = unpackTangentsLegacyCarbon(packed);
        const decoded = decodeTangentFrame(packed);
        close(n, decoded.N, "normal");
        close(t, decoded.T, "tangent");
        close(b, decoded.B, "bitangent");
    }
});

test("quat.fromRotationMatrixCarbon follows Carbon's branches, reading the matrix rows first", () =>
{
    const half = Math.SQRT1_2;
    // A half-turn about z: trace 0, so the largest-diagonal branch (z).
    assert.deepEqual(Array.from(quat.fromRotationMatrixCarbon([ 0, 0, 0, 1 ], [ -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ])), [ 0, 0, 1, 0 ]);
    // A quarter-turn about z, rows first: x -> y.
    const q = quat.fromRotationMatrixCarbon([ 0, 0, 0, 1 ], [ 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]);
    close(Array.from(q), [ 0, 0, half, half ], "quarter turn");
});
