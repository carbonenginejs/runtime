/**
 * Granny animation-curve decompression helpers
 * `decodeCurve(curveJson, dimension)` takes a GR2 JSON curve object in the
 * shape emitted by PrintCurve2 and returns explicit knots and controls.
 */

/** Format id for raw float keyframes with implicit knots. */
const FORMAT_DA_KEYFRAMES_32F = 0;

/** Format id for uncompressed float knots and float controls. */
const FORMAT_DA_K32F_C32F = 1;

/** Format id for an identity transform curve. */
const FORMAT_DA_IDENTITY = 2;

/** Format id for a constant float control vector. */
const FORMAT_DA_CONSTANT_32F = 3;

/** Format id for a constant vec3 control. */
const FORMAT_D3_CONSTANT_32F = 4;

/** Format id for a constant quaternion control. */
const FORMAT_D4_CONSTANT_32F = 5;

/** Format id for uint16 DaK packed knots and controls. */
const FORMAT_DA_K16U_C16U = 6;

/** Format id for uint8 DaK packed knots and controls. */
const FORMAT_DA_K8U_C8U = 7;

/** Format id for uint16 normalized quaternion curves with 15-bit controls. */
const FORMAT_D4N_K16U_C15U = 8;

/** Format id for uint8 normalized quaternion curves with 7-bit controls. */
const FORMAT_D4N_K8U_C7U = 9;

/** Format id for uint16 vec3 position curves. */
const FORMAT_D3_K16U_C16U = 10;

/** Format id for uint8 vec3 position curves. */
const FORMAT_D3_K8U_C8U = 11;

/** Format id for uint16 uniform scale/shear curves. */
const FORMAT_D9I1_K16U_C16U = 12;

/** Format id for uint16 per-axis scale/shear curves. */
const FORMAT_D9I3_K16U_C16U = 13;

/** Format id for uint8 uniform scale/shear curves. */
const FORMAT_D9I1_K8U_C8U = 14;

/** Format id for uint8 per-axis scale/shear curves. */
const FORMAT_D9I3_K8U_C8U = 15;

/** Format id for float D3I1 line-parameterized vec3 curves. */
const FORMAT_D3I1_K32F_C32F = 16;

/** Format id for uint16 D3I1 line-parameterized vec3 curves. */
const FORMAT_D3I1_K16U_C16U = 17;

/** Format id for uint8 D3I1 line-parameterized vec3 curves. */
const FORMAT_D3I1_K8U_C8U = 18;

/**
 * Granny curve format ids keyed by descriptive uppercase names.
 */
const CURVE_FORMATS = Object.freeze({
  DA_KEYFRAMES_32F: FORMAT_DA_KEYFRAMES_32F,
  DA_K32F_C32F: FORMAT_DA_K32F_C32F,
  DA_IDENTITY: FORMAT_DA_IDENTITY,
  DA_CONSTANT_32F: FORMAT_DA_CONSTANT_32F,
  D3_CONSTANT_32F: FORMAT_D3_CONSTANT_32F,
  D4_CONSTANT_32F: FORMAT_D4_CONSTANT_32F,
  DA_K16U_C16U: FORMAT_DA_K16U_C16U,
  DA_K8U_C8U: FORMAT_DA_K8U_C8U,
  D4N_K16U_C15U: FORMAT_D4N_K16U_C15U,
  D4N_K8U_C7U: FORMAT_D4N_K8U_C7U,
  D3_K16U_C16U: FORMAT_D3_K16U_C16U,
  D3_K8U_C8U: FORMAT_D3_K8U_C8U,
  D9I1_K16U_C16U: FORMAT_D9I1_K16U_C16U,
  D9I3_K16U_C16U: FORMAT_D9I3_K16U_C16U,
  D9I1_K8U_C8U: FORMAT_D9I1_K8U_C8U,
  D9I3_K8U_C8U: FORMAT_D9I3_K8U_C8U,
  D3I1_K32F_C32F: FORMAT_D3I1_K32F_C32F,
  D3I1_K16U_C16U: FORMAT_D3I1_K16U_C16U,
  D3I1_K8U_C8U: FORMAT_D3I1_K8U_C8U
});

/**
 * Float32 rounding helper used to mirror the reference curve decoders.
 *
 * The reference implementation stores every decoded value into Float32Array
 * buffers, so this helper applies the same rounding at each write.
 */
const fr = Math.fround;

/**
 * Granny stores 1/knotScale as the top 16 bits of the float only
 * ("OneOverKnotScaleTrunc"). Reconstruct the float32.
 * @param {number} oneOverKnotScaleTrunc uint16
 * @returns {number}
 */
function knotScaleFromTrunc(oneOverKnotScaleTrunc) {
  const u = new Uint32Array([oneOverKnotScaleTrunc << 16]);
  return new Float32Array(u.buffer)[0];
}

/**
 * Expand the leading `count` entries of a knotsControls array into knots.
 * @param {ArrayLike<number>} knotsControls
 * @param {number} count
 * @param {number} scale divisor (1/knotScale)
 * @returns {number[]}
 */
function knotsFromControls(knotsControls, count, scale) {
  const out = new Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = fr(knotsControls[i] / scale);
  }
  return out;
}

/**
 * Knots via the truncated knot scale.
 *
 * @param {ArrayLike<number>} knotsControls Packed knot/control array.
 * @param {number} count Number of knots at the front of `knotsControls`.
 * @param {number} oneOverKnotScaleTrunc Truncated reciprocal knot scale.
 * @returns {number[]} Decoded knot times.
 */
function knotsFromControlsTrunc(knotsControls, count, oneOverKnotScaleTrunc) {
  return knotsFromControls(knotsControls, count, knotScaleFromTrunc(oneOverKnotScaleTrunc));
}

/**
 * Identity control vector for a track dimension.
 * @param {number} dimension 3 (position), 4 (quaternion) or 9 (mat3)
 * @returns {number[]}
 */
function identityControls(dimension) {
  switch (dimension) {
    case 3:
      return [0, 0, 0];
    case 4:
      return [0, 0, 0, 1];
    case 9:
      return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    default:
      throw new Error(`gr2reader: invalid curve dimension ${dimension}`);
  }
}

/**
 * Ensure a divisibility relation holds; throws with a descriptive error.
 *
 * @param {number} numerator Value expected to divide evenly.
 * @param {number} divisor Divisor to check against.
 * @param {string} what Human-readable operation name for the error message.
 * @returns {number} Exact quotient.
 * @throws {Error} If the quotient is not an integer.
 */
function exactDiv(numerator, divisor, what) {
  const v = numerator / divisor;
  if (!Number.isInteger(v)) {
    throw new Error(`gr2reader: curve ${what}: ${numerator} is not divisible by ${divisor}`);
  }
  return v;
}

/**
 * Decode raw keyframe controls with implicit knots `0..n-1`.
 *
 * @param {object} c Curve object with `controls` and optional `dimension`.
 * @param {number} dimension Fallback control-vector width.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeDaKeyframes32f(c, dimension) {
  const dim = c.dimension || dimension,
    controls = c.controls || [],
    count = exactDiv(controls.length, dim, "DaKeyframes32f controls/dimension"),
    knots = new Array(count);
  for (let i = 0; i < count; i++) {
    knots[i] = i;
  }
  return {
    knots,
    controls: controls.map(fr),
    dimension: dim
  };
}

/**
 * Decode uncompressed float knots and float controls.
 *
 * @param {object} c Curve object with `knots` and `controls`.
 * @param {number} dimension Fallback control-vector width when no knots exist.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeDaK32fC32f(c, dimension) {
  const knots = (c.knots || []).map(fr),
    controls = (c.controls || []).map(fr),
    dim = knots.length ? exactDiv(controls.length, knots.length, "DaK32fC32f controls/knots") : dimension;
  return {
    knots,
    controls,
    dimension: dim
  };
}

/**
 * Decode an identity transform curve for the requested track dimension.
 *
 * @param {object} c Curve object with optional `dimension`.
 * @param {number} dimension Fallback control-vector width.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeDaIdentity(c, dimension) {
  const dim = c.dimension || dimension;
  return {
    knots: [0],
    controls: identityControls(dim),
    dimension: dim
  };
}

/**
 * Decode a constant float control vector.
 *
 * @param {object} c Curve object with `controls`.
 * @param {number} dimension Fallback control-vector width.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeDaConstant32f(c, dimension) {
  const controls = (c.controls || []).map(fr);
  return {
    knots: [0],
    controls,
    dimension: controls.length || dimension
  };
}

/**
 * Decode a constant vec3 control.
 *
 * @param {object} c Curve object with optional `controls`.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeD3Constant32f(c) {
  const controls = (c.controls || [0, 0, 0]).slice(0, 3).map(fr);
  return {
    knots: [0],
    controls,
    dimension: 3
  };
}

/**
 * Decode a constant quaternion control.
 *
 * @param {object} c Curve object with optional `controls`.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeD4Constant32f(c) {
  const controls = (c.controls || [0, 0, 0, 1]).slice(0, 4).map(fr);
  return {
    knots: [0],
    controls,
    dimension: 4
  };
}

/**
 * Decode a DaK packed knot/control curve using uint16 payload values.
 *
 * @param {object} c Curve object with `knotsControls`, `controlScaleOffsets`,
 * and `oneOverKnotScaleTrunc`.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeDaK(c) {
  const so = c.controlScaleOffsets || [],
    kc = c.knotsControls || [],
    dim = exactDiv(so.length, 2, "DaK controlScaleOffsets/2"),
    count = exactDiv(kc.length, dim + 1, "DaK knotsControls/(dim+1)"),
    knots = knotsFromControlsTrunc(kc, count, c.oneOverKnotScaleTrunc),
    controls = new Array(count * dim);
  for (let i = 0; i < count; i++) {
    for (let x = 0; x < dim; x++) {
      controls[i * dim + x] = fr(kc[count + i * dim + x] * so[x] + so[dim + x]);
    }
  }
  return {
    knots,
    controls,
    dimension: dim
  };
}

/** Scale lookup table for D4n normalized quaternion controls. */
const D4N_SCALE_TABLE = new Float32Array([1.4142135, 0.70710677, 0.35355338, 0.35355338, 0.35355338, 0.17677669, 0.17677669, 0.17677669, -1.4142135, -0.70710677, -0.35355338, -0.35355338, -0.35355338, -0.17677669, -0.17677669, -0.17677669]);

/** Offset lookup table for D4n normalized quaternion controls. */
const D4N_OFFSET_TABLE = new Float32Array([-0.70710677, -0.35355338, -0.53033006, -0.17677669, 0.17677669, -0.17677669, -0.088388346, 0.0, 0.70710677, 0.35355338, 0.53033006, 0.17677669, -0.17677669, 0.17677669, 0.088388346, -0]);

/**
 * Decode one 16-bit control triple into a quaternion (matches ccpwgl
 * Gr2CurveDataD4nK16uC15u.GetQuatFromControl).
 *
 * @param {number[]} out Mutable quaternion output buffer.
 * @param {number} a First packed control value.
 * @param {number} b Second packed control value.
 * @param {number} c Third packed control value.
 * @param {ArrayLike<number>} scales Four scale values selected from the table.
 * @param {ArrayLike<number>} offsets Four offset values selected from the table.
 * @returns {number[]} The same `out` quaternion buffer.
 */
function quatFromControl16(out, a, b, c, scales, offsets) {
  const swizzle1 = (b & 0x8000) >> 14 | c >> 15,
    swizzle2 = swizzle1 + 1 & 3,
    swizzle3 = swizzle2 + 1 & 3,
    swizzle4 = swizzle3 + 1 & 3;
  const dataA = (a & 0x7fff) * scales[swizzle2] + offsets[swizzle2],
    dataB = (b & 0x7fff) * scales[swizzle3] + offsets[swizzle3],
    dataC = (c & 0x7fff) * scales[swizzle4] + offsets[swizzle4];
  let dataD = Math.sqrt(Math.max(0, 1 - (dataA * dataA + dataB * dataB + dataC * dataC)));
  if ((a & 0x8000) !== 0) dataD = -dataD;
  out[swizzle2] = fr(dataA);
  out[swizzle3] = fr(dataB);
  out[swizzle4] = fr(dataC);
  out[swizzle1] = fr(dataD);
  return out;
}

/** Scale-table multiplier for D4n 16-bit knot / 15-bit control curves. */
const D4N_SCALE_TABLE_MULTIPLIER_16 = 0.000030518509;

/**
 * Decode a D4n normalized quaternion curve using a supplied control decoder.
 *
 * @param {object} c Curve object with `knotsControls`, `scaleOffsetTableEntries`,
 * and `oneOverKnotScale`.
 * @param {Function} quatFromControl Function that expands one packed control
 * triple into a quaternion.
 * @param {number} scaleTableMultiplier Multiplier for selected scale table entries.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeD4n(c, quatFromControl, scaleTableMultiplier) {
  const kc = c.knotsControls || [],
    count = exactDiv(kc.length, 4, "D4n knotsControls/4"),
    knots = knotsFromControls(kc, count, c.oneOverKnotScale);
  const selector = c.scaleOffsetTableEntries >>> 0,
    scales = new Float32Array([D4N_SCALE_TABLE[selector >> 0 & 0x0f] * scaleTableMultiplier, D4N_SCALE_TABLE[selector >> 4 & 0x0f] * scaleTableMultiplier, D4N_SCALE_TABLE[selector >> 8 & 0x0f] * scaleTableMultiplier, D4N_SCALE_TABLE[selector >> 12 & 0x0f] * scaleTableMultiplier]),
    offsets = new Float32Array([D4N_OFFSET_TABLE[selector >> 0 & 0x0f], D4N_OFFSET_TABLE[selector >> 4 & 0x0f], D4N_OFFSET_TABLE[selector >> 8 & 0x0f], D4N_OFFSET_TABLE[selector >> 12 & 0x0f]]);
  const controls = new Array(count * 4),
    quat = [0, 0, 0, 1];
  for (let i = 0; i < count; i++) {
    quatFromControl(quat, kc[count + i * 3], kc[count + i * 3 + 1], kc[count + i * 3 + 2], scales, offsets);
    controls[i * 4] = quat[0];
    controls[i * 4 + 1] = quat[1];
    controls[i * 4 + 2] = quat[2];
    controls[i * 4 + 3] = quat[3];
  }
  return {
    knots,
    controls,
    dimension: 4
  };
}

/**
 * Decode a D4n curve using 16-bit knots and 15-bit quaternion controls.
 *
 * @param {object} c Curve object with packed quaternion data.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeD4nK16uC15u(c) {
  return decodeD4n(c, quatFromControl16, D4N_SCALE_TABLE_MULTIPLIER_16);
}

/** Scale-table multiplier for D4n 8-bit knot / 7-bit control curves. */
const D4N_SCALE_TABLE_MULTIPLIER_8 = 0.0078740157;

/**
 * Decode one 8-bit control triple into a quaternion.
 *
 * @param {number[]} out Mutable quaternion output buffer.
 * @param {number} a First packed control value.
 * @param {number} b Second packed control value.
 * @param {number} c Third packed control value.
 * @param {ArrayLike<number>} scales Four scale values selected from the table.
 * @param {ArrayLike<number>} offsets Four offset values selected from the table.
 * @returns {number[]} The same `out` quaternion buffer.
 */
function quatFromControl8(out, a, b, c, scales, offsets) {
  const swizzle1 = (b & 0x80) >> 6 | (c & 0x80) >> 7,
    swizzle2 = swizzle1 + 1 & 3,
    swizzle3 = swizzle2 + 1 & 3,
    swizzle4 = swizzle3 + 1 & 3;
  const dataA = (a & 0x7f) * scales[swizzle2] + offsets[swizzle2],
    dataB = (b & 0x7f) * scales[swizzle3] + offsets[swizzle3],
    dataC = (c & 0x7f) * scales[swizzle4] + offsets[swizzle4];
  let dataD = Math.sqrt(Math.max(0, 1 - (dataA * dataA + dataB * dataB + dataC * dataC)));
  if ((a & 0x80) !== 0) dataD = -dataD;
  out[swizzle2] = fr(dataA);
  out[swizzle3] = fr(dataB);
  out[swizzle4] = fr(dataC);
  out[swizzle1] = fr(dataD);
  return out;
}

/**
 * Decode a D4n curve using 8-bit knots and 7-bit quaternion controls.
 *
 * @param {object} c Curve object with packed quaternion data.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeD4nK8uC7u(c) {
  return decodeD4n(c, quatFromControl8, D4N_SCALE_TABLE_MULTIPLIER_8);
}

/**
 * Decode a D3K packed vec3 curve using uint16 payload values.
 *
 * @param {object} c Curve object with `knotsControls`, `controlScales`,
 * `controlOffsets`, and `oneOverKnotScaleTrunc`.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeD3K(c) {
  const kc = c.knotsControls || [],
    count = exactDiv(kc.length, 4, "D3K knotsControls/4"),
    knots = knotsFromControlsTrunc(kc, count, c.oneOverKnotScaleTrunc),
    scales = c.controlScales,
    offsets = c.controlOffsets,
    controls = new Array(count * 3);
  for (let i = 0; i < count; i++) {
    for (let x = 0; x < 3; x++) {
      controls[i * 3 + x] = fr(kc[count + i * 3 + x] * scales[x] + offsets[x]);
    }
  }
  return {
    knots,
    controls,
    dimension: 3
  };
}

/**
 * Decode a D9I1 uniform scale/shear curve.
 *
 * @param {object} c Curve object with `knotsControls`, scalar scale/offset
 * fields, and `oneOverKnotScaleTrunc`.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeD9I1(c) {
  const kc = c.knotsControls || [],
    count = exactDiv(kc.length, 2, "D9I1 knotsControls/2"),
    knots = knotsFromControlsTrunc(kc, count, c.oneOverKnotScaleTrunc);
  const scale = Array.isArray(c.controlScales) ? c.controlScales[0] : c.controlScale,
    offset = Array.isArray(c.controlOffsets) ? c.controlOffsets[0] : c.controlOffset,
    controls = new Array(count * 9).fill(0);
  for (let i = 0; i < count; i++) {
    const s = fr(kc[count + i] * scale + offset);
    controls[i * 9] = s;
    controls[i * 9 + 4] = s;
    controls[i * 9 + 8] = s;
  }
  return {
    knots,
    controls,
    dimension: 9
  };
}

/**
 * Decode a D9I3 per-axis scale/shear curve.
 *
 * @param {object} c Curve object with `knotsControls`, `controlScales`,
 * `controlOffsets`, and `oneOverKnotScaleTrunc`.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeD9I3(c) {
  const kc = c.knotsControls || [],
    count = exactDiv(kc.length, 4, "D9I3 knotsControls/4"),
    knots = knotsFromControlsTrunc(kc, count, c.oneOverKnotScaleTrunc),
    scales = c.controlScales,
    offsets = c.controlOffsets,
    controls = new Array(count * 9).fill(0);
  for (let i = 0; i < count; i++) {
    controls[i * 9] = fr(kc[count + i * 3] * scales[0] + offsets[0]);
    controls[i * 9 + 4] = fr(kc[count + i * 3 + 1] * scales[1] + offsets[1]);
    controls[i * 9 + 8] = fr(kc[count + i * 3 + 2] * scales[2] + offsets[2]);
  }
  return {
    knots,
    controls,
    dimension: 9
  };
}

/**
 * Expand one scalar per knot into vec3 controls for the D3I1 family.
 *
 * @param {ArrayLike<number>} kc Packed knots followed by scalar controls.
 * @param {number} count Number of knots and scalar controls.
 * @param {ArrayLike<number>} scales vec3 component scales.
 * @param {ArrayLike<number>} offsets vec3 component offsets.
 * @returns {number[]} Flat vec3 controls.
 */
function d3I1Controls(kc, count, scales, offsets) {
  const controls = new Array(count * 3);
  for (let i = 0; i < count; i++) {
    const v = kc[count + i];
    controls[i * 3] = fr(v * scales[0] + offsets[0]);
    controls[i * 3 + 1] = fr(v * scales[1] + offsets[1]);
    controls[i * 3 + 2] = fr(v * scales[2] + offsets[2]);
  }
  return controls;
}

/**
 * Decode a D3I1 curve with float knots and scalar float controls.
 *
 * @param {object} c Curve object with `knotsControls`, `controlScales`, and
 * `controlOffsets`.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeD3I1K32fC32f(c) {
  const kc = c.knotsControls || [],
    count = exactDiv(kc.length, 2, "D3I1K32f knotsControls/2"),
    knots = new Array(count);
  for (let i = 0; i < count; i++) {
    knots[i] = fr(kc[i]);
  }
  return {
    knots,
    controls: d3I1Controls(kc, count, c.controlScales, c.controlOffsets),
    dimension: 3
  };
}

/**
 * Decode a D3I1 curve with uint knots and scalar controls.
 *
 * @param {object} c Curve object with `knotsControls`, `controlScales`,
 * `controlOffsets`, and `oneOverKnotScaleTrunc`.
 * @returns {{knots: number[], controls: number[], dimension: number}} Decoded curve.
 */
function decodeD3I1u(c) {
  const kc = c.knotsControls || [],
    count = exactDiv(kc.length, 2, "D3I1 knotsControls/2"),
    knots = knotsFromControlsTrunc(kc, count, c.oneOverKnotScaleTrunc);
  return {
    knots,
    controls: d3I1Controls(kc, count, c.controlScales, c.controlOffsets),
    dimension: 3
  };
}

/**
 * Decode format 6, DaK16uC16u.
 *
 * @type {typeof decodeDaK}
 */
const decodeDaK16uC16u = decodeDaK;

/**
 * Decode format 7, DaK8uC8u.
 *
 * @type {typeof decodeDaK}
 */
const decodeDaK8uC8u = decodeDaK;

/**
 * Decode format 10, D3K16uC16u.
 *
 * @type {typeof decodeD3K}
 */
const decodeD3K16uC16u = decodeD3K;

/**
 * Decode format 11, D3K8uC8u.
 *
 * @type {typeof decodeD3K}
 */
const decodeD3K8uC8u = decodeD3K;

/**
 * Decode format 12, D9I1K16uC16u.
 *
 * @type {typeof decodeD9I1}
 */
const decodeD9I1K16uC16u = decodeD9I1;

/**
 * Decode format 14, D9I1K8uC8u.
 *
 * @type {typeof decodeD9I1}
 */
const decodeD9I1K8uC8u = decodeD9I1;

/**
 * Decode format 13, D9I3K16uC16u.
 *
 * @type {typeof decodeD9I3}
 */
const decodeD9I3K16uC16u = decodeD9I3;

/**
 * Decode format 15, D9I3K8uC8u.
 *
 * @type {typeof decodeD9I3}
 */
const decodeD9I3K8uC8u = decodeD9I3;

/**
 * Decode format 17, D3I1K16uC16u.
 *
 * @type {typeof decodeD3I1u}
 */
const decodeD3I1K16uC16u = decodeD3I1u;

/**
 * Decode format 18, D3I1K8uC8u.
 *
 * @type {typeof decodeD3I1u}
 */
const decodeD3I1K8uC8u = decodeD3I1u;

/**
 * Curve object as emitted inside GR2 JSON transform tracks.
 *
 * @typedef {object} CurveJson
 * @property {number} format Granny animation-curve format id.
 * @property {number} degree Curve degree from the Granny curve header.
 * @property {number[]} [knots] Explicit knot times when already decompressed.
 * @property {number[]} [controls] Explicit control values when already decoded.
 * @property {number} [dimension] Control vector width.
 * @property {string} [error] Emitter error marker for unsupported raw curves.
 */

/**
 * Explicit curve data returned by {@link decodeCurve}.
 *
 * controls is a flat array in knot-major order:
 * controls[knotIndex * dimension + componentIndex].
 *
 * @typedef {object} DecodedCurve
 * @property {number[]} knots Knot times, non-decreasing.
 * @property {number[]} controls Flat control values.
 * @property {number} degree Curve degree.
 * @property {number} dimension Control vector width.
 */

/**
 * Track dimension accepted by Granny transform curves.
 *
 * @typedef {1|3|4|9} TransformCurveDimension
 */

/**
 * Decoder table ordered by Granny curve format id.
 *
 * Each entry exposes the numeric format and the function used by
 * {@link decodeCurve}.
 */
const CURVE_DECODERS = Object.freeze([Object.freeze({
  format: FORMAT_DA_KEYFRAMES_32F,
  decode: decodeDaKeyframes32f
}), Object.freeze({
  format: FORMAT_DA_K32F_C32F,
  decode: decodeDaK32fC32f
}), Object.freeze({
  format: FORMAT_DA_IDENTITY,
  decode: decodeDaIdentity
}), Object.freeze({
  format: FORMAT_DA_CONSTANT_32F,
  decode: decodeDaConstant32f
}), Object.freeze({
  format: FORMAT_D3_CONSTANT_32F,
  decode: decodeD3Constant32f
}), Object.freeze({
  format: FORMAT_D4_CONSTANT_32F,
  decode: decodeD4Constant32f
}), Object.freeze({
  format: FORMAT_DA_K16U_C16U,
  decode: decodeDaK16uC16u
}), Object.freeze({
  format: FORMAT_DA_K8U_C8U,
  decode: decodeDaK8uC8u
}), Object.freeze({
  format: FORMAT_D4N_K16U_C15U,
  decode: decodeD4nK16uC15u
}), Object.freeze({
  format: FORMAT_D4N_K8U_C7U,
  decode: decodeD4nK8uC7u
}), Object.freeze({
  format: FORMAT_D3_K16U_C16U,
  decode: decodeD3K16uC16u
}), Object.freeze({
  format: FORMAT_D3_K8U_C8U,
  decode: decodeD3K8uC8u
}), Object.freeze({
  format: FORMAT_D9I1_K16U_C16U,
  decode: decodeD9I1K16uC16u
}), Object.freeze({
  format: FORMAT_D9I3_K16U_C16U,
  decode: decodeD9I3K16uC16u
}), Object.freeze({
  format: FORMAT_D9I1_K8U_C8U,
  decode: decodeD9I1K8uC8u
}), Object.freeze({
  format: FORMAT_D9I3_K8U_C8U,
  decode: decodeD9I3K8uC8u
}), Object.freeze({
  format: FORMAT_D3I1_K32F_C32F,
  decode: decodeD3I1K32fC32f
}), Object.freeze({
  format: FORMAT_D3I1_K16U_C16U,
  decode: decodeD3I1K16uC16u
}), Object.freeze({
  format: FORMAT_D3I1_K8U_C8U,
  decode: decodeD3I1K8uC8u
})]);
for (let i = 0; i < CURVE_DECODERS.length; i++) {
  if (CURVE_DECODERS[i].format !== i) {
    throw new Error(`gr2reader: curve decoder table corrupt at format ${i}`);
  }
}

/**
 * Decode a GR2 JSON curve object into explicit knots/controls.
 *
 * @param {CurveJson} curveJson Curve as emitted in GR2 JSON.
 * @param {TransformCurveDimension} dimension Track dimension: position = 3, orientation = 4, scaleShear = 9.
 * @returns {DecodedCurve} Explicit knots and flat control values.
 * @throws {Error} If the curve is missing a numeric format, the format is not
 * supported, or the decoded dimension conflicts with the requested dimension.
 */
function decodeCurve(curveJson, dimension) {
  if (!curveJson || typeof curveJson.format !== "number") {
    throw new Error("gr2reader: decodeCurve requires a curve object with a numeric format");
  }
  const dec = CURVE_DECODERS[curveJson.format];
  if (!dec) {
    throw new Error(`gr2reader: unsupported granny curve format ${curveJson.format}`);
  }
  const {
    knots,
    controls,
    dimension: dim
  } = dec.decode(curveJson, dimension);
  if (dimension && dim && dim !== dimension) {
    throw new Error(`gr2reader: curve format ${curveJson.format} decoded dimension ${dim} does not match track dimension ${dimension}`);
  }
  return {
    knots,
    controls,
    degree: curveJson.degree | 0,
    dimension: dim || dimension
  };
}

/**
 * Copy one decoded control point into an output buffer.
 *
 * @param {ArrayLike<number> & { [index: number]: number }} out Mutable output buffer.
 * @param {DecodedCurve} curve Decoded curve.
 * @param {number} index Control point index.
 * @returns {ArrayLike<number>} The same output buffer.
 */
function copyControl(out, curve, index) {
  const dim = curve.dimension,
    offset = index * dim;
  for (let i = 0; i < dim; i++) {
    out[i] = curve.controls[offset + i];
  }
  return out;
}

/**
 * Locate the first knot strictly greater than time, matching the existing
 * runtime curve evaluator's step/segment selection.
 *
 * @param {number[]} knots Decoded knot times.
 * @param {number} time Sample time.
 * @returns {number} Knot index.
 */
function findKnotIndex(knots, time) {
  let low = 0;
  let high = knots.length - 1;
  while (low < high) {
    const mid = low + high >> 1;
    if (knots[mid] > time) high = mid;else low = mid + 1;
  }
  return low;
}

/**
 * Sample Carbon's raw keyframed Granny curves (`DaKeyframes32f`).
 *
 * @param {ArrayLike<number> & { [index: number]: number }} out Mutable output buffer.
 * @param {DecodedCurve} curve Decoded curve.
 * @param {number} time Sample time.
 * @param {number} duration Animation duration.
 * @returns {ArrayLike<number>} The same output buffer.
 */
function sampleKeyframedCurve(out, curve, time, duration) {
  const count = curve.controls.length / curve.dimension;
  const frame = duration > 0 ? Math.trunc(count * time / duration) : 0;
  return copyControl(out, curve, Math.max(0, Math.min(count - 1, frame)));
}

/**
 * Sample a decoded degree-one curve.
 *
 * @param {ArrayLike<number> & { [index: number]: number }} out Mutable output buffer.
 * @param {DecodedCurve} curve Decoded curve.
 * @param {number} time Sample time.
 * @param {boolean} cycle Whether the owning track cycles.
 * @param {number} duration Animation duration.
 * @param {number} knot Selected knot index.
 * @returns {ArrayLike<number>} The same output buffer.
 */
function sampleLinearCurve(out, curve, time, cycle, duration, knot) {
  const knots = curve.knots,
    count = knots.length,
    dim = curve.dimension,
    knot0 = cycle ? (knot + count - 1) % count : knot === 0 ? 0 : knot - 1;
  let start = knots[knot0],
    end = knots[knot],
    localTime = time;
  if (cycle && end < start) {
    end += duration;
  }
  if (cycle && localTime < start) {
    localTime += duration;
  }
  const t = end !== start ? (localTime - start) / (end - start) : 0;
  const p0 = knot0 * dim;
  const p1 = knot * dim;
  for (let i = 0; i < dim; i++) {
    out[i] = curve.controls[p0 + i] * (1 - t) + curve.controls[p1 + i] * t;
  }
  return out;
}

/**
 * Sample the quadratic decoded curves emitted by modern Granny animation data.
 *
 * @param {ArrayLike<number> & { [index: number]: number }} out Mutable output buffer.
 * @param {DecodedCurve} curve Decoded curve.
 * @param {number} time Sample time.
 * @param {boolean} cycle Whether the owning track cycles.
 * @param {number} duration Animation duration.
 * @param {number} knot Selected knot index.
 * @returns {ArrayLike<number>} The same output buffer.
 */
function sampleQuadraticCurve(out, curve, time, cycle, duration, knot) {
  const knots = curve.knots,
    count = knots.length,
    dim = curve.dimension,
    k2 = cycle ? (knot + count - 2) % count : knot === 0 ? 0 : Math.max(0, knot - 2),
    k1 = cycle ? (knot + count - 1) % count : knot === 0 ? 0 : knot - 1;
  let ti2 = knots[k2],
    ti1 = knots[k1],
    ti = knots[knot],
    tiNext = knots[(knot + 1) % count],
    localTime = time;
  if (ti2 > ti) {
    ti += duration;
    tiNext += duration;
    localTime += duration;
  }
  if (ti1 > ti) {
    ti += duration;
    tiNext += duration;
    localTime += duration;
  }
  if (tiNext < ti) {
    tiNext += duration;
  }
  const d0 = ti - ti1,
    d1a = ti - ti2,
    d1b = tiNext - ti1,
    l0 = d0 !== 0 ? (localTime - ti1) / d0 : 0,
    l1a = d1a !== 0 ? (localTime - ti2) / d1a : 0,
    l1b = d1b !== 0 ? (localTime - ti1) / d1b : 0;
  let c2 = l1a + l0 - l0 * l1a;
  const ci = l0 * l1b,
    c1 = c2 - ci;
  c2 = 1 - c2;
  const p0 = k2 * dim,
    p1 = k1 * dim,
    p2 = knot * dim;
  for (let i = 0; i < dim; i++) {
    out[i] = c2 * curve.controls[p0 + i] + c1 * curve.controls[p1 + i] + ci * curve.controls[p2 + i];
  }
  return out;
}

/**
 * Sample a decoded Granny curve into a caller-provided output buffer.
 *
 * This works only on decoded `{ knots, controls, degree, dimension }` data.
 * Packed Granny curve parsing remains the responsibility of `decodeCurve`.
 *
 * @param {ArrayLike<number> & { [index: number]: number }} out Mutable output buffer.
 * @param {DecodedCurve} curve Decoded curve.
 * @param {number} time Sample time.
 * @param {boolean} [cycle=false] Whether the owning track cycles.
 * @param {number} [duration=0] Animation duration.
 * @param {{ keyframed?: boolean }} [options] Sampling options.
 * @returns {ArrayLike<number>} The same output buffer.
 */
function sampleDecodedCurve(out, curve, time, cycle = false, duration = 0, options = {}) {
  if (!curve || !curve.knots || !curve.controls || !curve.dimension) {
    return out;
  }
  const knots = curve.knots,
    count = knots.length,
    dim = curve.dimension,
    controlCount = curve.controls.length / dim;
  if (!count || !controlCount) {
    return out;
  }
  if (options.keyframed) {
    return sampleKeyframedCurve(out, curve, time, duration);
  }
  const knot = findKnotIndex(knots, time);
  if (curve.degree <= 0 || count === 1 || controlCount === 1) {
    return copyControl(out, curve, Math.min(knot, controlCount - 1));
  }
  if (curve.degree === 1) {
    return sampleLinearCurve(out, curve, time, cycle, duration || knots[count - 1], knot);
  }
  return sampleQuadraticCurve(out, curve, time, cycle, duration || knots[count - 1], knot);
}

/**
 * Decode the three curves of every transform track of a GR2 JSON object in
 * place. Adds knots, controls and dimension to each curve object; all raw
 * compressed fields are left untouched.
 *
 * @param {object} json GR2 JSON root object to mutate.
 * @returns {object} The same object, for chaining.
 */
function decompressAnimationCurves(json) {
  for (const anim of json.animations || []) {
    for (const tg of anim.trackGroups || []) {
      for (const tt of tg.transformTracks || []) {
        decorate(tt.orientation, 4);
        decorate(tt.position, 3);
        decorate(tt.scaleShear, 9);
      }
    }
  }
  return json;
}

/**
 * Decode and attach explicit curve data to a transform-track curve object.
 *
 * @param {CurveJson|undefined|null} curve Curve object to decorate in place.
 * @param {TransformCurveDimension} dimension Expected track dimension.
 * @returns {void}
 */
function decorate(curve, dimension) {
  if (!curve || typeof curve.format !== "number" || curve.error) return;
  const d = decodeCurve(curve, dimension);
  curve.knots = d.knots;
  curve.controls = d.controls;
  curve.dimension = d.dimension;
}

/**
 * Frozen convenience namespace for animation-curve decoding helpers.
 *
 * The same constants and functions are also exported directly from curves.js.
 */
const curves = Object.freeze({
  FORMAT_DA_KEYFRAMES_32F,
  FORMAT_DA_K32F_C32F,
  FORMAT_DA_IDENTITY,
  FORMAT_DA_CONSTANT_32F,
  FORMAT_D3_CONSTANT_32F,
  FORMAT_D4_CONSTANT_32F,
  FORMAT_DA_K16U_C16U,
  FORMAT_DA_K8U_C8U,
  FORMAT_D4N_K16U_C15U,
  FORMAT_D4N_K8U_C7U,
  FORMAT_D3_K16U_C16U,
  FORMAT_D3_K8U_C8U,
  FORMAT_D9I1_K16U_C16U,
  FORMAT_D9I3_K16U_C16U,
  FORMAT_D9I1_K8U_C8U,
  FORMAT_D9I3_K8U_C8U,
  FORMAT_D3I1_K32F_C32F,
  FORMAT_D3I1_K16U_C16U,
  FORMAT_D3I1_K8U_C8U,
  FORMATS: CURVE_FORMATS,
  DECODERS: CURVE_DECODERS,
  D4N_SCALE_TABLE,
  D4N_OFFSET_TABLE,
  D4N_SCALE_TABLE_MULTIPLIER_16,
  D4N_SCALE_TABLE_MULTIPLIER_8,
  decode: decodeCurve,
  decodeCurve,
  sample: sampleDecodedCurve,
  sampleDecodedCurve,
  decompress: decompressAnimationCurves,
  decompressAnimationCurves,
  knotScaleFromTrunc,
  knotsFromControls,
  knotsFromControlsTrunc,
  identityControls,
  exactDiv,
  decodeDaKeyframes32f,
  decodeDaK32fC32f,
  decodeDaIdentity,
  decodeDaConstant32f,
  decodeD3Constant32f,
  decodeD4Constant32f,
  decodeDaK,
  decodeDaK16uC16u,
  decodeDaK8uC8u,
  quatFromControl16,
  quatFromControl8,
  decodeD4n,
  decodeD4nK16uC15u,
  decodeD4nK8uC7u,
  decodeD3K,
  decodeD3K16uC16u,
  decodeD3K8uC8u,
  decodeD9I1,
  decodeD9I1K16uC16u,
  decodeD9I1K8uC8u,
  decodeD9I3,
  decodeD9I3K16uC16u,
  decodeD9I3K8uC8u,
  d3I1Controls,
  decodeD3I1K32fC32f,
  decodeD3I1u,
  decodeD3I1K16uC16u,
  decodeD3I1K8uC8u
});

export { CURVE_DECODERS, CURVE_FORMATS, D4N_OFFSET_TABLE, D4N_SCALE_TABLE, D4N_SCALE_TABLE_MULTIPLIER_16, D4N_SCALE_TABLE_MULTIPLIER_8, FORMAT_D3I1_K16U_C16U, FORMAT_D3I1_K32F_C32F, FORMAT_D3I1_K8U_C8U, FORMAT_D3_CONSTANT_32F, FORMAT_D3_K16U_C16U, FORMAT_D3_K8U_C8U, FORMAT_D4N_K16U_C15U, FORMAT_D4N_K8U_C7U, FORMAT_D4_CONSTANT_32F, FORMAT_D9I1_K16U_C16U, FORMAT_D9I1_K8U_C8U, FORMAT_D9I3_K16U_C16U, FORMAT_D9I3_K8U_C8U, FORMAT_DA_CONSTANT_32F, FORMAT_DA_IDENTITY, FORMAT_DA_K16U_C16U, FORMAT_DA_K32F_C32F, FORMAT_DA_K8U_C8U, FORMAT_DA_KEYFRAMES_32F, curves, d3I1Controls, decodeCurve, decodeD3Constant32f, decodeD3I1K16uC16u, decodeD3I1K32fC32f, decodeD3I1K8uC8u, decodeD3I1u, decodeD3K, decodeD3K16uC16u, decodeD3K8uC8u, decodeD4Constant32f, decodeD4n, decodeD4nK16uC15u, decodeD4nK8uC7u, decodeD9I1, decodeD9I1K16uC16u, decodeD9I1K8uC8u, decodeD9I3, decodeD9I3K16uC16u, decodeD9I3K8uC8u, decodeDaConstant32f, decodeDaIdentity, decodeDaK, decodeDaK16uC16u, decodeDaK32fC32f, decodeDaK8uC8u, decodeDaKeyframes32f, decompressAnimationCurves, exactDiv, fr, identityControls, knotScaleFromTrunc, knotsFromControls, knotsFromControlsTrunc, quatFromControl16, quatFromControl8, sampleDecodedCurve };
//# sourceMappingURL=curves.js.map
