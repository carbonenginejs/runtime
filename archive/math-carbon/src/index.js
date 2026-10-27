// Carbon math, ported. Every function carries Carbon's name (camelCased),
// Carbon's argument order after the leading `out`, and donor algorithms/branches.
// Scalar arithmetic uses double intermediates; float storage boundaries alone
// do not establish native float arithmetic parity.
//
// Storage is plain Float32Array in Carbon's row-major flat order, which is
// byte-identical to gl-matrix's column-major layout: element _rc sits at
// [(r-1)*4 + (c-1)], basis rows X/Y/Z at [0..2]/[4..6]/[8..10], translation
// at [12..14]. Values produced here are therefore valid gl-matrix values and
// vice versa; only the composition conventions differ (Carbon is row-vector,
// v' = v * M, compositions read left-to-right in application order).
//
// This module changes no existing code. It delegates to one production module:
// triMath takes std::mt19937 from global/math/random.js, the one port of that engine.
//
// Carbon header homes for free functions are camelCase namespaces: triMath is
// trinity/trinity/Include/TriMath.h (its one class, TriPerlinNoise, included), triUtil
// TriUtil.h, and boundingBox, boundingSphere and matrixUtils the trinity Utilities headers
// of those names (MatrixUtils.h's Float4x3 struct is a class).

export * from "./matrix.js";
export * from "./quaternion.js";
export * from "./vector2.js";
export * from "./vector3.js";
export * from "./vector4.js";
export * from "./plane.js";
export * from "./sphere.js";
export * from "./axisAlignedBox.js";
export * from "./axisAlignedEllipsoid.js";
export * from "./ray.js";
export * from "./color.js";
export * from "./float16.js";
export * as triMath from "./triMath.js";
export * as triUtil from "./triUtil.js";
export * as boundingBox from "./boundingBox.js";
export * as boundingSphere from "./boundingSphere.js";
export * as matrixUtils from "./matrixUtils.js";
export { Float4x3 } from "./matrixUtils.js";
export * as tangents from "./tangents.js";

export { initializeMath } from "./initialize.js";
