// Source: math/include/AxisAlignedBox_inline.h and math/src/AxisAlignedBox.cpp
import { axisAlignedBox } from "./axisAlignedBox.js";
import { matrixFloat32 } from "./matrixFloat32.js";
import { vector3Float32 } from "./vector3Float32.js";

/** Internal float32 box kernels, pending complete precision-table selection. */
export const axisAlignedBoxFloat32 = { getCenter, growScalar, scale, transform, intersectsRay };

/**
 * Carbon: AxisAlignedBox::Center (math/include/AxisAlignedBox_inline.h:68-71)
 * Rounds each sum before halving it.
 * @param {Float32Array} out Receiving center; may overlap box.
 * @param {Float32Array} box Box.
 * @returns {Float32Array} out
 */
function getCenter(out, box)
{
    const f = Math.fround;
    const x = f(f(box[0] + box[3]) * 0.5);
    const y = f(f(box[1] + box[4]) * 0.5);
    const z = f(f(box[2] + box[5]) * 0.5);
    out[0] = x; out[1] = y; out[2] = z;
    return out;
}

/**
 * Carbon: AxisAlignedBox::Grow (math/include/AxisAlignedBox_inline.h:144-152)
 * Converts the scalar to float before growing the initialized box.
 * @param {Float32Array} box Mutable box.
 * @param {number} by Native float growth.
 * @returns {Float32Array} box
 */
function growScalar(box, by)
{
    if (!axisAlignedBox.isInitialized(box)) return box;
    const f = Math.fround;
    by = f(by);
    box[0] = f(box[0] - by); box[1] = f(box[1] - by); box[2] = f(box[2] - by);
    box[3] = f(box[3] + by); box[4] = f(box[4] + by); box[5] = f(box[5] + by);
    return box;
}

/**
 * Carbon: AxisAlignedBox::Scale (math/include/AxisAlignedBox_inline.h:154-162)
 * Scales min/max about the origin, preserving the initialized guard.
 * @param {Float32Array} box Mutable box.
 * @param {number} value Native float scale.
 * @returns {Float32Array} box
 */
function scale(box, value)
{
    if (!axisAlignedBox.isInitialized(box)) return box;
    const f = Math.fround;
    value = f(value);
    for (let i = 0; i < 6; i++) box[i] = f(box[i] * value);
    return box;
}

/**
 * Carbon: AxisAlignedBox::Transform (math/src/AxisAlignedBox.cpp:9-34)
 * Visits the eight native corners and bounds the rounded transformed positions.
 * @param {Float32Array} out Receiving box; may overlap box or m.
 * @param {Float32Array} box Box.
 * @param {Float32Array} m Carbon matrix.
 * @returns {Float32Array} out
 */
function transform(out, box, m)
{
    const x0 = box[0], y0 = box[1], z0 = box[2], x1 = box[3], y1 = box[4], z1 = box[5];
    if (!axisAlignedBox.isInitialized(box))
    {
        out[0] = x0; out[1] = y0; out[2] = z0;
        out[3] = x1; out[4] = y1; out[5] = z1;
        return out;
    }
    let minX = FLT_MAX, minY = FLT_MAX, minZ = FLT_MAX;
    let maxX = -FLT_MAX, maxY = -FLT_MAX, maxZ = -FLT_MAX;
    const pos = scratch.vec3_0;
    for (let i = 0; i < 8; i++)
    {
        pos[0] = i & 4 ? x1 : x0;
        pos[1] = i & 2 ? y1 : y0;
        pos[2] = i & 1 ? z1 : z0;
        matrixFloat32.transformCoord(pos, pos, m);
        if (pos[0] < minX) minX = pos[0];
        if (pos[1] < minY) minY = pos[1];
        if (pos[2] < minZ) minZ = pos[2];
        if (pos[0] > maxX) maxX = pos[0];
        if (pos[1] > maxY) maxY = pos[1];
        if (pos[2] > maxZ) maxZ = pos[2];
    }
    out[0] = minX; out[1] = minY; out[2] = minZ;
    out[3] = maxX; out[4] = maxY; out[5] = maxZ;
    return out;
}

/**
 * Carbon: AxisAlignedBox::Intersects (math/src/AxisAlignedBox.cpp:36-61)
 * Keeps native point-box write order and scalar reciprocal-length slabs.
 * @param {Float32Array} outIntersection Receiving intersection; untouched if uninitialized.
 * @param {Float32Array} box Box.
 * @param {Float32Array} ray Packed origin and direction.
 * @returns {boolean} Native intersection result.
 */
function intersectsRay(outIntersection, box, ray)
{
    if (!axisAlignedBox.isInitialized(box)) return false;
    const f = Math.fround;
    const temp = scratch.vec3_0;
    if (box[0] === box[3] && box[1] === box[4] && box[2] === box[5])
    {
        outIntersection[0] = box[0]; outIntersection[1] = box[1]; outIntersection[2] = box[2];
        temp[0] = f(box[0] - ray[0]); temp[1] = f(box[1] - ray[1]); temp[2] = f(box[2] - ray[2]);
        vector3Float32.normalize(temp, temp);
        temp[0] = f(temp[0] - ray[3]); temp[1] = f(temp[1] - ray[4]); temp[2] = f(temp[2] - ray[5]);
        return vector3Float32.lengthSq(temp) < 1e10;
    }
    const rx = ray[0], ry = ray[1], rz = ray[2], dx = ray[3], dy = ray[4], dz = ray[5];
    temp[0] = dx; temp[1] = dy; temp[2] = dz;
    const reciprocal = f(1 / vector3Float32.length(temp));
    const t0x = f(f(box[0] - rx) * reciprocal), t0y = f(f(box[1] - ry) * reciprocal), t0z = f(f(box[2] - rz) * reciprocal);
    const t1x = f(f(box[3] - rx) * reciprocal), t1y = f(f(box[4] - ry) * reciprocal), t1z = f(f(box[5] - rz) * reciprocal);
    const sx = t0x > t1x ? t1x : t0x, sy = t0y > t1y ? t1y : t0y, sz = t0z > t1z ? t1z : t0z;
    const bx = t0x < t1x ? t1x : t0x, by = t0y < t1y ? t1y : t0y, bz = t0z < t1z ? t1z : t0z;
    const syz = sy < sz ? sz : sy, byz = by > bz ? bz : by;
    const minT = sx < syz ? syz : sx, maxT = bx > byz ? byz : bx;
    outIntersection[0] = f(rx + f(minT * dx));
    outIntersection[1] = f(ry + f(minT * dy));
    outIntersection[2] = f(rz + f(minT * dz));
    return minT < maxT;
}

const FLT_MAX = 3.4028234663852886e38;
/** Private dirty scratch, written before read; synchronous, non-reentrant and never returned. */
const scratch = { vec3_0: new Float32Array(3) };

// Operation tables are immutable; numeric results and caller-owned outputs stay writable.
Object.freeze(axisAlignedBoxFloat32);
