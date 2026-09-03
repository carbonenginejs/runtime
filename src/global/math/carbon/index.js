// Carbon math, ported. Every function carries Carbon's name (camelCased),
// Carbon's argument order after the leading `out`, and Carbon's arithmetic
// ported literally from e:\carbonengine\math - branch thresholds and epsilons
// included - so numerics match Carbon, not gl-matrix.
//
// Storage is plain Float32Array in Carbon's row-major flat order, which is
// byte-identical to gl-matrix's column-major layout: element _rc sits at
// [(r-1)*4 + (c-1)], basis rows X/Y/Z at [0..2]/[4..6]/[8..10], translation
// at [12..14]. Values produced here are therefore valid gl-matrix values and
// vice versa; only the composition conventions differ (Carbon is row-vector,
// v' = v * M, compositions read left-to-right in application order).
//
// This module changes no existing code and delegates to none of it.

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
