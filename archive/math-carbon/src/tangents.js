// Carbon cmf tangent-frame packing, ported literally from mesh
// (mesh/include/cmf/tangents.h, mesh/src/cmf/tangents.cpp).
// tangents.h is a home for free functions, so this module is a camelCase namespace
// (`tangents.packTangents`). Only its maths is here: GenerateTangents, CompressTangents and
// DecompressTangents rewrite a cmf::Mesh's buffers through its MemoryAllocator and
// BufferManager, and FlipTangentOptions/CompressionErrorMetrics are their parameters; they
// belong with a mesh port, not maths.
// JS has no fma: `fma( a, b, c )` is fround( a * b + c ). The float product is exact in a
// double, so only the double-then-float rounding of the sum can differ from one fused rounding.

import { Vector3 } from "./vector3.js";
import { Quaternion } from "./quaternion.js";

const f32 = Math.fround;
const XM_PI = f32(3.141592654);
const XM_2PI = f32(6.283185307);

/**
 * Carbon: cmf::TangentCompression (mesh/include/cmf/tangents.h:35-41)
 * @enum {number}
 */
export const TangentCompression = Object.freeze({
    /** Quaternion-based compression; cmf::Usage::PackedTangent */
    PackedTangent: 0,
    /** Angle-based compression; cmf::Usage::PackedTangentLegacy */
    PackedTangentLegacy: 1
});

/**
 * Carbon: cmf::PackTangents (tangents.cpp:440-447)
 * Packs an orthonormal tangent frame; anything but PackedTangent packs legacy, as Carbon.
 * @param {Float32Array} out - receives the packed Vector4
 * @param {number} compression - TangentCompression
 * @param {Float32Array} normal
 * @param {Float32Array} tangent
 * @param {Float32Array} bitangent
 * @returns {Float32Array} out
 */
export function packTangents(out, compression, normal, tangent, bitangent)
{
    if (compression === TangentCompression.PackedTangent)
    {
        return packTangentsQuaternion(out, normal, tangent, bitangent);
    }
    return packTangentsLegacy(out, normal, tangent, bitangent);
} // tangents.cpp:440

/**
 * Carbon: cmf::UnpackTangents (tangents.cpp:449-456)
 * Adapted: Carbon returns std::tuple<normal, tangent, bitangent>; JS writes the three
 * caller-owned vectors, in the tuple's order.
 * @param {Float32Array} normal - receives the normal
 * @param {Float32Array} tangent - receives the tangent
 * @param {Float32Array} bitangent - receives the bitangent
 * @param {number} compression - TangentCompression
 * @param {Float32Array} t - the packed Vector4
 */
export function unpackTangents(normal, tangent, bitangent, compression, t)
{
    if (compression === TangentCompression.PackedTangent)
    {
        unpackTangentsQuaternion(normal, tangent, bitangent, t);
        return;
    }
    unpackTangentsLegacy(normal, tangent, bitangent, t);
} // tangents.cpp:449

/**
 * Carbon: PackTangentsQuaternion (tangents.cpp:302-325, anonymous namespace)
 * The normalized quaternion of the TBN rows (tangent, bitangent, normal), kept with w >= 0
 * so unpacking can rebuild w; out.w carries the normal's sign.
 */
function packTangentsQuaternion(out, normal, tangent, bitangent)
{
    const { vec3_0, mat4_0, quat_0 } = scratch;
    Vector3.cross(vec3_0, tangent, bitangent);
    const flipNormal = Vector3.dot(normal, vec3_0) < 0.0;
    const sign = flipNormal ? -1.0 : 1.0;

    mat4_0.fill(0);
    for (let i = 0; i < 3; ++i)
    {
        mat4_0[i] = tangent[i];
        mat4_0[4 + i] = bitangent[i];
        mat4_0[8 + i] = flipNormal ? -normal[i] : normal[i];
    }
    mat4_0[15] = 1.0;

    Quaternion.rotationQuaternion__Matrix(quat_0, mat4_0);
    Quaternion.normalize(quat_0, quat_0);
    if (quat_0[3] < 0.0)
    {
        Quaternion.negate(quat_0, quat_0);
    }
    out[0] = quat_0[0];
    out[1] = quat_0[1];
    out[2] = quat_0[2];
    out[3] = sign;
    return out;
} // tangents.cpp:302

/**
 * Carbon: UnpackTangentsQuaternion (tangents.cpp:328-386, anonymous namespace)
 * Carbon's shader-ready form: w = sqrt( clamp( 1 - x^2 - y^2 - z^2, 0, 1 ) ) by an fma
 * chain, then the rotation-matrix rows, the normal times t.w.
 */
function unpackTangentsQuaternion(normal, tangent, bitangent, t)
{
    const x = t[0], y = t[1], z = t[2], sign = t[3];
    const x2 = f32(x * x), y2 = f32(y * y), z2 = f32(z * z);
    const w2 = Math.min(Math.max(fma(z, -z, fma(y, -y, fma(x, -x, 1.0))), 0.0), 1.0);
    const w = f32(Math.sqrt(w2));

    const xy = f32(f32(x * y) * 2.0), xz = f32(f32(x * z) * 2.0), yz = f32(f32(y * z) * 2.0);
    const xw = f32(f32(x * w) * 2.0), yw = f32(f32(y * w) * 2.0), zw = f32(f32(z * w) * 2.0);

    tangent[0] = fma(-2.0, y2, fma(-2.0, z2, 1.0));
    tangent[1] = xy + zw;
    tangent[2] = xz - yw;
    bitangent[0] = -zw + xy;
    bitangent[1] = fma(-2.0, x2, fma(-2.0, z2, 1.0));
    bitangent[2] = yz + xw;
    normal[0] = f32(yw + xz) * sign;
    normal[1] = f32(yz - xw) * sign;
    normal[2] = fma(-2.0, x2, fma(-2.0, y2, 1.0)) * sign;
} // tangents.cpp:328

/**
 * Carbon: Remap (tangents.cpp:389-392, anonymous namespace)
 * Maps [oldMin, oldMax] to [0, 1], clamped.
 */
function remap(x, oldMin, oldMax)
{
    return Math.min(Math.max(f32(f32(x - oldMin) / f32(oldMax - oldMin)), 0.0), 1.0);
}

/**
 * Carbon: PackTangentsLegacy (tangents.cpp:394-412, anonymous namespace)
 * Azimuth and polar angle of tangent and bitangent, the polar angles negated for a frame
 * of negative handedness, each remapped from [-pi, pi] to [0, 1]. A zero polar angle
 * cannot carry the sign, as in Carbon.
 */
function packTangentsLegacy(out, normal, tangent, bitangent)
{
    const { angles, vec3_0 } = scratch;
    angles[0] = Math.atan2(tangent[1], tangent[0]);
    angles[1] = Math.acos(Math.min(1.0, Math.max(-1.0, tangent[2])));
    angles[2] = Math.atan2(bitangent[1], bitangent[0]);
    angles[3] = Math.acos(Math.min(1.0, Math.max(-1.0, bitangent[2])));
    Vector3.cross(vec3_0, tangent, bitangent);
    if (Vector3.dot(normal, vec3_0) < 0)
    {
        angles[1] = -angles[1];
        angles[3] = -angles[3];
    }
    out[0] = remap(angles[0], -XM_PI, +XM_PI);
    out[1] = remap(angles[1], -XM_PI, +XM_PI);
    out[2] = remap(angles[2], -XM_PI, +XM_PI);
    out[3] = remap(angles[3], -XM_PI, +XM_PI);
    return out;
} // tangents.cpp:394

/**
 * Carbon: UnpackTangentsLegacy (tangents.cpp:415-436, anonymous namespace)
 * The normal is Cross( bitangent, tangent ), negated when both polar angles are positive.
 */
function unpackTangentsLegacy(normal, tangent, bitangent, t)
{
    const { angles } = scratch;
    for (let i = 0; i < 4; ++i)
    {
        angles[i] = f32(t[i] * XM_2PI) - XM_PI;
    }
    const sc0x = f32(Math.sin(angles[0])), sc0y = f32(Math.cos(angles[0]));
    const sc0z = f32(Math.sin(angles[1])), sc0w = f32(Math.cos(angles[1]));
    const sc1x = f32(Math.sin(angles[2])), sc1y = f32(Math.cos(angles[2]));
    const sc1z = f32(Math.sin(angles[3])), sc1w = f32(Math.cos(angles[3]));

    tangent[0] = sc0y * Math.abs(sc0z);
    tangent[1] = sc0x * Math.abs(sc0z);
    tangent[2] = sc0w;
    bitangent[0] = sc1y * Math.abs(sc1z);
    bitangent[1] = sc1x * Math.abs(sc1z);
    bitangent[2] = sc1w;
    Vector3.cross(normal, bitangent, tangent);
    if (angles[3] > 0 && angles[1] > 0)
    {
        Vector3.negate(normal, normal);
    }
} // tangents.cpp:415

/** fma( a, b, c ) in float: one rounding of the exact a * b + c, emulated as described above */
function fma(a, b, c)
{
    return f32(a * b + c);
}

const scratch = {
    vec3_0: new Float32Array(3),
    mat4_0: new Float32Array(16),
    quat_0: new Float32Array(4),
    angles: new Float32Array(4)
};
