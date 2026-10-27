import { describe, test } from "node:test";
import assert from "node:assert";
import { Quaternion, Matrix, tangents } from "../src/index.js";
import { packTangentsCarbon, unpackTangentsCarbon } from "../../../src/global/math/tangent.js";

// Carbon has no tests for these codecs; these check round trips and agreement with the
// independent production port in global/math/tangent.js.

function closeToArray(actual, expected, tolerance, message = "")
{
    for (let i = 0; i < expected.length; ++i)
    {
        assert.ok(Math.abs(actual[i] - expected[i]) <= tolerance, `${message}[${i}] expected ${expected[i]}, got ${actual[i]}`);
    }
}

const { PackedTangent, PackedTangentLegacy } = tangents.TangentCompression;

/** Orthonormal frames from rotations, half of them left-handed (normal negated) */
function frames()
{
    const out = [];
    for (let i = 0; i < 24; ++i)
    {
        const axis = new Float32Array([ Math.sin(i), Math.cos(i * 1.7), Math.sin(i * 0.3) + 0.2 ]);
        const q = Quaternion.rotationQuaternion__AxisAngle(new Float32Array(4), axis, 0.4 + i * 0.37);
        const m = Matrix.rotationMatrix__Quaternion(new Float32Array(16), q);
        const t = m.slice(0, 3), b = m.slice(4, 7), n = m.slice(8, 11);
        if (i % 2)
        {
            n[0] = -n[0];
            n[1] = -n[1];
            n[2] = -n[2];
        }
        out.push({ n, t, b });
    }
    return out;
}

describe("tangents", () =>
{
    for (const [ name, compression, tolerance ] of [ [ "PackedTangent", PackedTangent, 1e-5 ], [ "PackedTangentLegacy", PackedTangentLegacy, 1e-5 ] ])
    {
        test(`${name} round-trips orthonormal frames of both handednesses`, () =>
        {
            const packed = new Float32Array(4), n = new Float32Array(3), t = new Float32Array(3), b = new Float32Array(3);
            for (const frame of frames())
            {
                tangents.packTangents(packed, compression, frame.n, frame.t, frame.b);
                tangents.unpackTangents(n, t, b, compression, packed);
                closeToArray(t, frame.t, tolerance, "tangent");
                closeToArray(b, frame.b, tolerance, "bitangent");
                closeToArray(n, frame.n, tolerance, "normal");
            }
        });

        test(`${name} agrees with the production port`, () =>
        {
            const packed = new Float32Array(4), n = new Float32Array(3), t = new Float32Array(3), b = new Float32Array(3);
            for (const frame of frames())
            {
                tangents.packTangents(packed, compression, frame.n, frame.t, frame.b);
                closeToArray(packed, packTangentsCarbon(compression, frame.n, frame.t, frame.b), 1e-6, "packed");
                const [ pn, pt, pb ] = unpackTangentsCarbon(compression, packed);
                tangents.unpackTangents(n, t, b, compression, packed);
                closeToArray(n, pn, 1e-6, "normal");
                closeToArray(t, pt, 1e-6, "tangent");
                closeToArray(b, pb, 1e-6, "bitangent");
            }
        });
    }

    test("PackedTangent keeps w non-negative and stores the normal sign", () =>
    {
        const packed = new Float32Array(4);
        for (const [ i, frame ] of frames().entries())
        {
            tangents.packTangents(packed, PackedTangent, frame.n, frame.t, frame.b);
            assert.strictEqual(packed[3], i % 2 ? -1 : 1);
            assert.ok(packed[0] * packed[0] + packed[1] * packed[1] + packed[2] * packed[2] <= 1 + 1e-6);
        }
    });

    test("an unknown compression packs legacy, as Carbon's", () =>
    {
        const [ frame ] = frames();
        assert.deepStrictEqual(
            tangents.packTangents(new Float32Array(4), 7, frame.n, frame.t, frame.b),
            tangents.packTangents(new Float32Array(4), PackedTangentLegacy, frame.n, frame.t, frame.b));
    });
});
