/**
 * GR2-shaped skeleton/animation conversion into CMF-native data.
 *
 * Input is the GR2 JSON shape emitted by the GR2 reader with curves already
 * decompressed to explicit `{ knots, controls, dimension, degree }` (enable
 * `decompressCurves` when reading); this module never parses packed Granny
 * curve data, keeping the MIT runtime free of the separate GR2 package.
 *
 * CMF curves support Step/Linear interpolation only, so Granny curves of
 * degree 2 are resampled (non-uniform quadratic B-spline evaluated via de
 * Boor) at a uniform rate; degree ≤ 1 knots/controls convert exactly.
 * Granny 3x3 scale/shear collapses to the vec3 diagonal (shear is dropped);
 * inverse bind matrices are rebuilt from the rest pose hierarchy in the
 * row-major, translation-in-elements-12..14 layout Granny uses.
 */

function convertError(message) {
  const error = new Error(`CMF gr2 convert: ${message}`);
  error.code = "CJS_FORMAT_WRITE_ERROR";
  return error;
}

/**
 * Test for a GR2-shaped skeleton (bones as objects with name/parentIndex).
 *
 * @param {object} skeleton Candidate skeleton.
 * @returns {boolean} True when GR2-shaped.
 */
function isGr2Skeleton(skeleton) {
  return !!skeleton && Array.isArray(skeleton.bones) && skeleton.bones.length > 0 && typeof skeleton.bones[0] === "object" && skeleton.bones[0] !== null && typeof skeleton.bones[0].name === "string";
}

/**
 * Test for a GR2-shaped animation (carries trackGroups).
 *
 * @param {object} animation Candidate animation.
 * @returns {boolean} True when GR2-shaped.
 */
function isGr2Animation(animation) {
  return !!animation && Array.isArray(animation.trackGroups);
}
function composeTrs(position, rotation, scale) {
  const [x, y, z, w] = rotation;
  const x2 = x + x,
    y2 = y + y,
    z2 = z + z;
  const xx = x * x2,
    xy = x * y2,
    xz = x * z2;
  const yy = y * y2,
    yz = y * z2,
    zz = z * z2;
  const wx = w * x2,
    wy = w * y2,
    wz = w * z2;
  const [sx, sy, sz] = scale;

  // row-major, row-vector convention: rows scaled, translation in 12..14
  return [(1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0, (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0, (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0, position[0], position[1], position[2], 1];
}
function multiplyMatrices(a, b) {
  // row-vector convention: result = a * b (a applied first)
  const out = new Array(16);
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      out[row * 4 + column] = a[row * 4] * b[column] + a[row * 4 + 1] * b[4 + column] + a[row * 4 + 2] * b[8 + column] + a[row * 4 + 3] * b[12 + column];
    }
  }
  return out;
}
function invertAffine(m) {
  // invert the 3x3 block, then the translation row
  const a = m[0],
    b = m[1],
    c = m[2],
    d = m[4],
    e = m[5],
    f = m[6],
    g = m[8],
    h = m[9],
    i = m[10];
  const coA = e * i - f * h,
    coB = f * g - d * i,
    coC = d * h - e * g;
  const det = a * coA + b * coB + c * coC;
  if (!det) throw convertError("rest pose matrix is singular");
  const r = 1 / det;
  const i00 = coA * r,
    i01 = (c * h - b * i) * r,
    i02 = (b * f - c * e) * r,
    i10 = coB * r,
    i11 = (a * i - c * g) * r,
    i12 = (c * d - a * f) * r,
    i20 = coC * r,
    i21 = (b * g - a * h) * r,
    i22 = (a * e - b * d) * r;
  const tx = m[12],
    ty = m[13],
    tz = m[14];
  return [i00, i01, i02, 0, i10, i11, i12, 0, i20, i21, i22, 0, -(tx * i00 + ty * i10 + tz * i20) + 0, -(tx * i01 + ty * i11 + tz * i21) + 0, -(tx * i02 + ty * i12 + tz * i22) + 0, 1];
}
function boneRestTransform(bone) {
  const scaleShear = bone.scaleShear || [1, 0, 0, 0, 1, 0, 0, 0, 1];
  return {
    position: (bone.position || [0, 0, 0]).slice(0, 3),
    rotation: (bone.orientation || [0, 0, 0, 1]).slice(0, 4),
    scale: [scaleShear[0], scaleShear[4], scaleShear[8]]
  };
}

/**
 * Convert a GR2-shaped skeleton into a CMF-native skeleton.
 *
 * @param {object} skeleton GR2 skeleton `{ name, bones: [{ name, parentIndex, position?, orientation?, scaleShear? }] }`.
 * @returns {object} CMF-native skeleton with rebuilt inverse bind matrices.
 */
function convertGr2Skeleton(skeleton) {
  const bones = skeleton.bones || [];
  const worldTransforms = new Array(bones.length);
  const restTransforms = new Array(bones.length);
  const parents = new Array(bones.length);
  for (let i = 0; i < bones.length; i++) {
    const bone = bones[i];
    const parentIndex = typeof bone.parentIndex === "number" ? bone.parentIndex : -1;
    if (parentIndex >= i && parentIndex !== 0xffffffff) {
      throw convertError(`bone ${i} (${bone.name}) has forward parent index ${parentIndex}`);
    }
    parents[i] = parentIndex < 0 || parentIndex === 0xffffffff ? 0xffffffff : parentIndex;
    const rest = boneRestTransform(bone);
    restTransforms[i] = rest;
    const local = composeTrs(rest.position, rest.rotation, rest.scale);
    worldTransforms[i] = parents[i] === 0xffffffff ? local : multiplyMatrices(local, worldTransforms[parents[i]]);
  }
  return {
    name: skeleton.name || "",
    bones: bones.map(bone => bone.name || ""),
    parents,
    restTransforms,
    invBindTransforms: worldTransforms.map(world => invertAffine(world)),
    boneMasks: []
  };
}
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
 * Evaluate a decoded Granny curve at `time` (clamped, non-cycling).
 *
 * Degree ≤ 0 steps, degree 1 lerps, degree 2 evaluates the non-uniform
 * quadratic B-spline via de Boor over the Granny knot convention, including
 * the reference evaluator's next-knot wrap at the final segment (the segment
 * after the last knot borrows the first knot advanced by `duration`).
 *
 * @param {object} curve Decoded curve `{ knots, controls, dimension, degree }`.
 * @param {number} time Sample time.
 * @param {Array<number>} out Output vector (dimension entries).
 * @param {number} [duration] Animation duration for the final-segment wrap;
 *   defaults to the last knot.
 * @returns {Array<number>} The `out` vector.
 */
function evaluateDecodedCurve(curve, time, out, duration = 0) {
  const {
    knots,
    controls,
    dimension
  } = curve;
  const count = knots.length;
  const controlCount = controls.length / dimension;
  const copy = index => {
    const clamped = Math.max(0, Math.min(controlCount - 1, index));
    for (let i = 0; i < dimension; i++) out[i] = controls[clamped * dimension + i];
    return out;
  };
  if (!count || controlCount <= 1 || (curve.degree | 0) <= 0) {
    return copy(count ? Math.min(findKnotIndex(knots, time), controlCount - 1) : 0);
  }

  // the reference evaluator does not clamp the sample time: past the last
  // knot the final segment extrapolates, and baked samples must match the
  // motion the GR2 runtime actually produces
  const knot = findKnotIndex(knots, time);
  if ((curve.degree | 0) === 1) {
    const k0 = knot === 0 ? 0 : knot - 1;
    const start = knots[k0];
    const end = knots[knot];
    const t = end !== start ? (time - start) / (end - start) : 0;
    for (let i = 0; i < dimension; i++) {
      out[i] = controls[k0 * dimension + i] * (1 - t) + controls[knot * dimension + i] * t;
    }
    return out;
  }

  // degree 2: de Boor for a quadratic over Granny's knot convention —
  // the segment ending at knots[knot] blends controls knot-2, knot-1, knot
  const wrapDuration = duration || knots[count - 1];
  const k2 = Math.max(0, knot - 2);
  const k1 = Math.max(0, knot - 1);
  const t2 = knots[k2];
  const t1 = knots[k1];
  const t0 = knots[knot];
  let tNext = knots[(knot + 1) % count];
  if (tNext < t0) tNext += wrapDuration;
  const d0 = t0 - t1;
  const d1a = t0 - t2;
  const d1b = tNext - t1;
  const l0 = d0 !== 0 ? (time - t1) / d0 : 0;
  const l1a = d1a !== 0 ? (time - t2) / d1a : 0;
  const l1b = d1b !== 0 ? (time - t1) / d1b : 0;
  const cI = l0 * l1b;
  const c2 = (1 - l0) * (1 - l1a);
  const c1 = 1 - c2 - cI;
  for (let i = 0; i < dimension; i++) {
    out[i] = c2 * controls[k2 * dimension + i] + c1 * controls[k1 * dimension + i] + cI * controls[knot * dimension + i];
  }
  return out;
}
function floatBytes(values) {
  return Array.from(new Uint8Array(new Float32Array(values).buffer));
}
function isIdentityValue(values, dimension) {
  const identity = [0, 0, 0, 1] ;
  if (!identity) return false;
  return values.every((value, index) => Math.abs(value - identity[index % 4]) < 1e-7);
}
function diagonalFromScaleShear(controls, knotIndex) {
  return [controls[knotIndex * 9], controls[knotIndex * 9 + 4], controls[knotIndex * 9 + 8]];
}
function requireDecoded(curve, track, kind) {
  if (!curve) return null;
  if (Array.isArray(curve.knots) && Array.isArray(curve.controls) && curve.dimension) {
    return curve;
  }
  if (typeof curve.format === "number" && curve.format !== undefined) {
    throw convertError(`track "${track}" ${kind} curve is not decoded — read the GR2 with decompressCurves enabled`);
  }
  return null;
}
function convertCurve(curve, targetDimension, duration, sampleRate) {
  const dimension = curve.dimension;
  const degree = curve.degree | 0;
  const knotCount = curve.knots.length;
  const controlCount = curve.controls.length / dimension;
  const extract = targetDimension === 3 && dimension === 9 ? index => diagonalFromScaleShear(curve.controls, index) : index => curve.controls.slice(index * dimension, index * dimension + targetDimension);
  if (knotCount <= 1 || controlCount <= 1) {
    const values = extract(0);
    return {
      valueDimension: targetDimension,
      interpolation: "Step",
      knotType: "Float32",
      valueType: "Float32",
      knotCount: 1,
      knots: floatBytes([curve.knots[0] ?? 0]),
      values: floatBytes(values),
      plainValues: values
    };
  }
  if (degree <= 1) {
    const values = [];
    for (let i = 0; i < knotCount; i++) values.push(...extract(i));
    return {
      valueDimension: targetDimension,
      interpolation: degree === 0 ? "Step" : "Linear",
      knotType: "Float32",
      valueType: "Float32",
      knotCount,
      knots: floatBytes(curve.knots),
      values: floatBytes(values),
      plainValues: values
    };
  }

  // degree 2: adaptive resample — seed with the original knots plus a
  // uniform grid, recursively subdividing each interval until linear
  // interpolation tracks the quadratic within `tolerance`; intervals that
  // never converge are true discontinuities and snap to one float32 ULP
  // before the jump knot
  const start = curve.knots[0];
  const end = Math.max(curve.knots[knotCount - 1], duration || 0);
  const span = Math.max(end - start, 0);
  const tolerance = 1e-3;
  const minStep = 4e-6;
  const maxDepth = 24;
  const seedTimes = new Set(curve.knots.map(knot => Math.min(Math.max(knot, start), end)));
  const gridCount = Math.max(1, Math.ceil(span * sampleRate));
  for (let i = 0; i <= gridCount; i++) seedTimes.add(start + span * i / gridCount);
  const seeds = [...seedTimes].sort((a, b) => a - b);
  const sample = new Array(dimension).fill(0);
  const evaluateAt = time => {
    evaluateDecodedCurve(curve, time, sample, duration);
    return targetDimension === 3 && dimension === 9 ? [sample[0], sample[4], sample[8]] : sample.slice(0, targetDimension);
  };
  const outTimes = [];
  const outValues = [];
  const emit = (time, value) => {
    outTimes.push(time);
    outValues.push(value);
  };
  const fitsLinear = (v0, v1, actual) => {
    for (let c = 0; c < targetDimension; c++) {
      if (Math.abs(actual[c] - (v0[c] + v1[c]) / 2) > tolerance) return false;
    }
    return true;
  };
  const refine = (t0, v0, t1, v1, depth) => {
    if (t1 - t0 <= minStep || depth >= maxDepth) {
      let differs = false;
      for (let c = 0; c < targetDimension; c++) {
        if (Math.abs(v0[c] - v1[c]) > tolerance) differs = true;
      }
      if (differs) {
        // discontinuity at the right endpoint (an original knot):
        // hold the left value until one float32 ULP before the jump
        const snapped = float32UlpBefore(t1);
        if (snapped > t0) emit(snapped, v0.slice());
      }
      return;
    }
    const mid = (t0 + t1) / 2;
    const vm = evaluateAt(mid);
    if (fitsLinear(v0, v1, vm)) return;
    refine(t0, v0, mid, vm, depth + 1);
    emit(mid, vm);
    refine(mid, vm, t1, v1, depth + 1);
  };
  let previousValue = evaluateAt(seeds[0]);
  emit(seeds[0], previousValue);
  for (let i = 1; i < seeds.length; i++) {
    const value = evaluateAt(seeds[i]);
    refine(seeds[i - 1], previousValue, seeds[i], value, 0);
    emit(seeds[i], value);
    previousValue = value;
  }
  const values = [];
  for (const entry of outValues) values.push(...entry);
  return {
    valueDimension: targetDimension,
    interpolation: "Linear",
    knotType: "Float32",
    valueType: "Float32",
    knotCount: outTimes.length,
    knots: floatBytes(outTimes),
    values: floatBytes(values),
    plainValues: values
  };
}
const ulpScratch = new Float32Array(1);
const ulpScratchBits = new Uint32Array(ulpScratch.buffer);
function float32UlpBefore(value) {
  if (!(value > 0)) return value;
  ulpScratch[0] = value;
  ulpScratchBits[0] -= 1;
  return ulpScratch[0];
}

/**
 * Convert a GR2-shaped animation into a CMF-native animation.
 *
 * @param {object} animation GR2 animation with decoded curves.
 * @param {object} [options] `sampleRate` (Hz, default 30) for degree-2 resampling.
 * @returns {object} CMF-native animation with channels and curves.
 */
function convertGr2Animation(animation, options = {}) {
  const sampleRate = options.sampleRate || 30;
  const duration = animation.duration || 0;
  const channels = [];
  const curves = [];
  const addChannel = (target, targetType, decoded, targetDimension) => {
    const converted = convertCurve(decoded, targetDimension, duration, sampleRate);
    // constant identity channels carry no information
    if (converted.knotCount === 1 && targetType === "BoneRotation" && isIdentityValue(converted.plainValues)) return;
    if (converted.knotCount === 1 && targetType === "BoneScale" && converted.plainValues.every(value => Math.abs(value - 1) < 1e-7)) return;
    delete converted.plainValues;
    channels.push({
      target,
      targetType,
      curveIndex: curves.length
    });
    curves.push(converted);
  };
  for (const trackGroup of animation.trackGroups || []) {
    for (const track of trackGroup.transformTracks || []) {
      const position = requireDecoded(track.position, track.name, "position");
      const orientation = requireDecoded(track.orientation, track.name, "orientation");
      const scaleShear = requireDecoded(track.scaleShear, track.name, "scaleShear");
      if (position) addChannel(track.name, "BonePosition", position, 3);
      if (orientation) addChannel(track.name, "BoneRotation", orientation, 4);
      if (scaleShear) addChannel(track.name, "BoneScale", scaleShear, 3);
    }
  }
  return {
    name: animation.name || "",
    channels,
    curves,
    duration
  };
}

/**
 * Convert any GR2-shaped skeletons/animations in a shared root, leaving
 * CMF-native ones untouched.
 *
 * GR2 files frequently carry their skeleton under `models[].skeleton` rather
 * than a root skeleton list; those are collected (deduplicated by name) when
 * the root list is empty. With exactly one skeleton, skinned meshes (those
 * with bone bindings) that declare no skeleton index are bound to it.
 *
 * @param {object} root Shared geometry root.
 * @param {object} [options] Conversion options (`sampleRate`).
 * @returns {object} Root with converted skeletons/animations.
 */
function convertGr2SkeletonsAndAnimations(root, options = {}) {
  let sourceSkeletons = root.skeletons || [];
  if (!sourceSkeletons.length && Array.isArray(root.models)) {
    const byName = new Map();
    for (const model of root.models) {
      const skeleton = model?.skeleton;
      if (skeleton && Array.isArray(skeleton.bones) && skeleton.bones.length && !byName.has(skeleton.name)) {
        byName.set(skeleton.name, skeleton);
      }
    }
    sourceSkeletons = [...byName.values()];
  }
  const skeletons = sourceSkeletons.map(skeleton => isGr2Skeleton(skeleton) ? convertGr2Skeleton(skeleton) : skeleton);
  const animations = (root.animations || []).map(animation => isGr2Animation(animation) ? convertGr2Animation(animation, options) : animation);
  let meshes = root.meshes;
  if (skeletons.length === 1 && Array.isArray(meshes)) {
    meshes = meshes.map(mesh => {
      if (mesh && (mesh.skeleton === null || mesh.skeleton === undefined) && (mesh.boneBindings || []).length) {
        return {
          ...mesh,
          skeleton: 0
        };
      }
      return mesh;
    });
  }
  return {
    ...root,
    meshes,
    skeletons,
    animations
  };
}

export { convertGr2Animation, convertGr2Skeleton, convertGr2SkeletonsAndAnimations, evaluateDecodedCurve, isGr2Animation, isGr2Skeleton };
//# sourceMappingURL=gr2Anim.js.map
