import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_quality, _init_extra_quality, _init_lights, _init_extra_lights, _init_primaryIntensity, _init_extra_primaryIntensity, _init_secondaryIntensity, _init_extra_secondaryIntensity;

// Secondary lighting: light from one primary source reflected off "secondary
// light sources" - spheres with an albedo colour and a radius, optionally
// self-emissive. The result is a set of spherical-harmonic coefficients packed
// the way the shader reads them.
//
// The whole computation is CPU math over CPU state, so it ports whole. Carbon's
// DirectXMath estimate intrinsics (XMVector3LengthEst, XMVectorReciprocalEst)
// become exact operations here; the difference is far below the precision the
// packed coefficients carry.

const SQRT_PI = Math.sqrt(Math.PI);

/** Carbon s_cutoffRadiusRatio (cpp:14). */
const CUTOFF_RADIUS_RATIO = 0.045 * 7;

/** ShSolver<L1> pack coefficients. */
const L1_PACK_0 = 1 / (2 * SQRT_PI);
const L1_PACK_1 = Math.sqrt(3) / (3 * SQRT_PI);

/**
 * ShSolver<L1>::s_normalizationCoefficients. Carbon writes these as unevaluated
 * products; they are reproduced in the same form so every factor stays checkable
 * against the source instead of collapsing into an opaque literal.
 */
const L1_NORMALIZATION = Object.freeze([2 * SQRT_PI * 0.282094791773878140 * Math.sqrt(0.3141593e1), 2 / 3 * Math.sqrt(3 * Math.PI) * -0.4886025119029199 * (Math.sqrt(3) * Math.sqrt(0.3141593e1) / 2), 2 / 3 * Math.sqrt(3 * Math.PI) * 0.488602511902919920 * (Math.sqrt(3) * Math.sqrt(0.3141593e1) / 2), 2 / 3 * Math.sqrt(3 * Math.PI) * -0.4886025119029199 * (Math.sqrt(3) * Math.sqrt(0.3141593e1) / 2)]);

/** ShSolver<L2> pack coefficients. */
const L2_PACK_0 = 1 / (2 * SQRT_PI);
const L2_PACK_1 = Math.sqrt(3) / (3 * SQRT_PI);
const L2_PACK_2 = Math.sqrt(15) / (8 * SQRT_PI);
const L2_PACK_3 = Math.sqrt(5) / (16 * SQRT_PI);
const L2_PACK_4 = 0.5 * L2_PACK_2;

/** ShSolver<L2>::s_normalizationCoefficients. */
const L2_NORMALIZATION = Object.freeze([2 * SQRT_PI * 0.282094791773878140 * Math.sqrt(0.3141593e1), 2 / 3 * Math.sqrt(3 * Math.PI) * -0.4886025119029199 * (Math.sqrt(3) * Math.sqrt(0.3141593e1) / 2), 2 / 3 * Math.sqrt(3 * Math.PI) * 0.488602511902919920 * (Math.sqrt(3) * Math.sqrt(0.3141593e1) / 2), 2 / 3 * Math.sqrt(3 * Math.PI) * -0.4886025119029199 * (Math.sqrt(3) * Math.sqrt(0.3141593e1) / 2), 2 / 5 * Math.sqrt(5 * Math.PI) * 0.546274215296039590 * (-Math.sqrt(5) * Math.sqrt(0.3141593e1) / 2), 2 / 5 * Math.sqrt(5 * Math.PI) * -1.0925484305920792 * (-Math.sqrt(5) * Math.sqrt(0.3141593e1) / 2), 2 / 5 * Math.sqrt(5 * Math.PI) * -0.31539156525252005 * (-Math.sqrt(5) * Math.sqrt(0.3141593e1) / 2), 2 / 5 * Math.sqrt(5 * Math.PI) * -1.0925484305920792 * (-Math.sqrt(5) * Math.sqrt(0.3141593e1) / 2), 2 / 5 * Math.sqrt(5 * Math.PI) * 0.546274215296039590 * (-Math.sqrt(5) * Math.sqrt(0.3141593e1) / 2)]);

/**
 * Resolve a value Carbon holds by POINTER, so a source that changes after
 * registration is still read at its current value. A number is a snapshot; a
 * length-1 array is this repository's float-pointer convention; a function is
 * evaluated on every pass.
 */
function readFloat(value) {
  if (typeof value === "function") {
    return Number(value()) || 0;
  }
  if (typeof value === "number") {
    return value;
  }
  return Number(value?.[0]) || 0;
}

/**
 * Computes the spherical-harmonic coefficients that approximate secondary
 * lighting - a primary light reflected off nearby spheres - for any receiver
 * position in the scene.
 */
let _Tr2ShLightingManager;
new class extends _identity {
  static [class Tr2ShLightingManager extends CjsModel {
    static {
      ({
        e: [_init_quality, _init_extra_quality, _init_lights, _init_extra_lights, _init_primaryIntensity, _init_extra_primaryIntensity, _init_secondaryIntensity, _init_extra_secondaryIntensity, _initProto],
        c: [_Tr2ShLightingManager, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ShLightingManager",
        family: "trinityCore"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("Quality")], 16, "quality"], [[io, io.persist, void 0, type.list("Tr2PointLight")], 16, "lights"], [[io, io.persist, type, type.float32], 16, "primaryIntensity"], [[io, io.persist, type, type.float32], 16, "secondaryIntensity"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterSecondaryLightSource"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnregisterSecondaryLightSource"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateWithDirectionalLight"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSourceData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLighting"]], 0, void 0, CjsModel));
    }
    /** m_quality (Quality - enum Quality) [READWRITE, PERSIST, ENUM] */
    quality = (_initProto(this), _init_quality(this, 1));

    /** m_lights (PTr2PointLightVector) [READ, PERSIST] */
    lights = (_init_extra_quality(this), _init_lights(this, []));

    /** m_primaryIntensity (float) [READWRITE, PERSIST] */
    primaryIntensity = (_init_extra_lights(this), _init_primaryIntensity(this, 1));

    /** m_secondaryIntensity (float) [READWRITE, PERSIST] */
    secondaryIntensity = (_init_extra_primaryIntensity(this), _init_secondaryIntensity(this, 1));

    /** m_sunDirection - normalized, set through UpdateWithDirectionalLight. */
    #sunDirection = (_init_extra_secondaryIntensity(this), vec3.fromValues(0, 1, 0));

    /** m_sunColor. */
    #sunColor = vec3.create();

    /** m_sources - the registered secondary light sources, read live. */
    #sources = [];

    /** m_sourceData - the processed run UpdateSourceData rebuilds. */
    #sourceData = [];

    /**
     * Carbon's SH order. The generated shell carried a four-member
     * LOW/MEDIUM/HIGH/COUNT enum that belongs to a different class of the same
     * enum name; Carbon declares exactly two orders here
     * (Tr2ShLightingManager.h:34-38) and constructs at L2.
     */

    /** PACKED_COEFFICIENT_COUNT (h:51) - packed vec4s per receiver. */

    /**
     * Registers a sphere that reflects the primary light. Carbon stores POINTERS
     * and reads them on every pass, so the values must stay live here too: pass
     * the caller's own vectors rather than copies, and a length-1 array or a
     * getter for the radius.
     * @param {Float32Array} position - the sphere centre, read live
     * @param {Number|Array|Function} radius - the sphere radius, read live
     * @param {Float32Array} albedo - reflected colour
     * @param {Float32Array} emissive - self-emissive colour
     * @returns {Boolean} true once registered
     */
    RegisterSecondaryLightSource(position, radius, albedo, emissive) {
      this.#sources.push({
        position,
        radius,
        albedo,
        emissive
      });
      return true;
    }

    /**
     * Removes the source registered with this exact position vector; Carbon keys
     * the erase on the pointer, so identity is the match here too.
     * @param {Float32Array} position - the vector passed to the register call
     * @returns {Boolean} false when no source holds that vector
     */
    UnregisterSecondaryLightSource(position) {
      const index = this.#sources.findIndex(source => source.position === position);
      if (index === -1) {
        return false;
      }
      this.#sources.splice(index, 1);
      return true;
    }

    /**
     * Sets the primary light and rebuilds the processed source run (cpp:396-403).
     * @param {Float32Array} direction - primary light direction, normalized here
     * @param {Float32Array} color - primary light colour
     * @returns {Boolean} true
     */
    UpdateWithDirectionalLight(direction, color) {
      vec3.copy(this.#sunColor, color);
      vec3.normalize(this.#sunDirection, direction);
      this.UpdateSourceData();
      return true;
    }

    /**
     * Rebuilds the processed source run from the registered spheres and point
     * lights (cpp:355-394). A sphere with a non-positive radius contributes
     * nothing and is skipped; a point light contributes emissive only, and is
     * never culled by the caller's cutoff radius.
     * @returns {Number} the processed source count
     */
    UpdateSourceData() {
      this.#sourceData.length = 0;
      const maxLight = vec3.maxComponent(this.#sunColor);
      for (const source of this.#sources) {
        const radius = readFloat(source.radius);
        if (radius <= 0) {
          continue;
        }
        const albedo = vec3.scale(vec3.create(), source.albedo, this.secondaryIntensity);
        const emissive = vec3.scale(vec3.create(), source.emissive, this.secondaryIntensity);
        this.#sourceData.push({
          position: source.position,
          radius,
          albedo,
          cutoffMultiplier: 1,
          emissive,
          maxColorComponent: Math.max(vec3.maxComponent(albedo) * maxLight, vec3.maxComponent(emissive))
        });
      }
      for (const light of this.lights) {
        if (typeof light?.GetLight !== "function") {
          continue;
        }
        const position = vec3.create();
        const radius = [0];
        const color = [0, 0, 0, 0];
        light.GetLight(position, radius, color);
        const emissive = vec3.scale(vec3.create(), color, this.primaryIntensity);
        this.#sourceData.push({
          position,
          radius: readFloat(radius),
          albedo: vec3.create(),
          cutoffMultiplier: 0,
          emissive,
          maxColorComponent: vec3.maxComponent(emissive)
        });
      }
      return this.#sourceData.length;
    }

    /**
     * Evaluates the packed coefficients for one receiver (cpp:405-419).
     * @param {Float32Array} position - receiver position
     * @param {Number} intensity - overall scale, usually a distance fade
     * @param {Number} cutoffRadius - spheres smaller than this are skipped
     * @param {Float32Array} out - seven packed vec4s, 28 floats
     * @returns {Float32Array} out
     */
    GetLighting(position, intensity, cutoffRadius, out) {
      const order = this.quality === _Tr2ShLightingManager.Quality.L2 ? 3 : 2;
      return this.#CalculateSecondaryLighting(position, intensity, cutoffRadius, out, order);
    }

    /**
     * Carbon CalculateSecondaryLighting<Order> (cpp:305-352): accumulates every
     * visible source's contribution into `order * order` RGB coefficients, then
     * normalizes and packs them.
     * @param {Float32Array} position - receiver position
     * @param {Number} intensity - overall scale
     * @param {Number} cutoffRadius - sphere cull radius
     * @param {Float32Array} out - 28 floats
     * @param {Number} order - 2 for L1, 3 for L2
     * @returns {Float32Array} out
     */
    #CalculateSecondaryLighting(position, intensity, cutoffRadius, out, order) {
      const count = order * order;
      const sh = new Float64Array(count * 3);
      const basis = new Float64Array(count);
      const direction = _Tr2ShLightingManager.#directionScratch;
      for (const source of this.#sourceData) {
        if (source.radius < cutoffRadius * source.cutoffMultiplier) {
          continue;
        }
        vec3.subtract(direction, source.position, position);
        const distance = vec3.length(direction);
        const oneOverDistance = 1 / distance;
        vec3.scale(direction, direction, oneOverDistance);

        // Carbon's skip test reads the W LANE of vectors loaded as float4 from
        // packed struct members, so the values it actually compares are the
        // members that FOLLOW position and emissive in the struct: radius and
        // maxColorComponent (cpp:330-338). A source is skipped when its apparent
        // brightness falls below the cutoff ratio, when the receiver sits within
        // one unit of it, or when the distance is not finite.
        const apparentBrightness = source.radius * oneOverDistance * source.maxColorComponent;
        if (!Number.isFinite(distance) || apparentBrightness < CUTOFF_RADIUS_RATIO || distance < 1) {
          continue;
        }
        if (order === 3) {
          _Tr2ShLightingManager.#EvalSphericalLightL2(direction, distance, source.radius, basis);
        } else {
          _Tr2ShLightingManager.#EvalSphericalLightL1(direction, distance, source.radius, basis);
        }

        // The albedo term is lit by the primary light through a wrapped dot
        // product, so a sphere facing away still reflects a little; the emissive
        // term is added unlit.
        const dot = vec3.dot(this.#sunDirection, direction) * 0.5 + 0.5;
        for (let channel = 0; channel < 3; channel++) {
          const color = dot * source.albedo[channel] * this.#sunColor[channel] + source.emissive[channel];
          for (let index = 0; index < count; index++) {
            sh[index * 3 + channel] += basis[index] * color;
          }
        }
      }
      const normalization = order === 3 ? L2_NORMALIZATION : L1_NORMALIZATION;
      for (let index = 0; index < count; index++) {
        const scale = normalization[index] * intensity;
        sh[index * 3] *= scale;
        sh[index * 3 + 1] *= scale;
        sh[index * 3 + 2] *= scale;
      }
      return order === 3 ? _Tr2ShLightingManager.#PackL2(sh, out) : _Tr2ShLightingManager.#PackL1(sh, out);
    }

    /**
     * ShSolver<L1>::SHEvalSphericalLight (cpp:29-53): the solid angle a sphere of
     * `radius` subtends at `distance`, projected onto the four L1 basis
     * functions. A receiver inside the sphere sees the whole hemisphere.
     * @param {Float32Array} direction - unit direction to the source
     * @param {Number} distance - distance to the source centre
     * @param {Number} radius - source radius
     * @param {Float64Array} out - four basis values
     */

    /**
     * ShSolver<L2>::SHEvalSphericalLight (cpp:100-140): the same solid angle
     * against the nine L2 basis functions, through Carbon's cap integral.
     * @param {Float32Array} direction - unit direction to the source
     * @param {Number} distance - distance to the source centre
     * @param {Number} radius - source radius
     * @param {Float64Array} out - nine basis values
     */

    /**
     * ShSolver<L1>::PackCoefficients (cpp:62-72). L1 fills only the FIRST THREE
     * packed vec4s; Carbon leaves the remaining four untouched, so a caller that
     * wants them clear zeroes the destination first, as EveSpaceObject2 does.
     * @param {Float64Array} sh - normalized coefficients, RGB interleaved
     * @param {Float32Array} out - 28 floats
     * @returns {Float32Array} out
     */

    /**
     * ShSolver<L2>::PackCoefficients (cpp:148-169) - all seven vec4s, the last
     * carrying a constant 1 in its w lane.
     * @param {Float64Array} sh - normalized coefficients, RGB interleaved
     * @param {Float32Array} out - 28 floats
     * @returns {Float32Array} out
     */
  }];
  Quality = Object.freeze({
    L1: 0,
    L2: 1
  });
  PACKED_COEFFICIENT_COUNT = 7;
  #EvalSphericalLightL1(direction, distance, radius, out) {
    let o0 = 1;
    let o1 = 1;
    if (distance > radius) {
      o1 = radius / distance * (radius / distance);
      o0 = 1 - Math.sqrt(1 - o1);
    }
    out[0] = o0;
    out[1] = direction[1] * o1;
    out[2] = direction[2] * o1;
    out[3] = direction[0] * o1;
  }
  #EvalSphericalLightL2(direction, distance, radius, out) {
    let sinAngle = 1;
    let cosAngle = 0;
    if (distance > radius) {
      sinAngle = radius / distance;
      cosAngle = Math.sqrt(1 - sinAngle * sinAngle);
    }

    // ComputeCapInt (cpp:174-179).
    const cap0 = -cosAngle + 1;
    const cap1 = sinAngle * sinAngle;
    const cap2 = cosAngle * (cosAngle * cosAngle - 1);

    // EvalBasis (cpp:181-192).
    const x = direction[0];
    const y = direction[1];
    const z = direction[2];
    out[0] = 1 * cap0;
    out[1] = y * cap1;
    out[2] = z * cap1;
    out[3] = x * cap1;
    out[4] = (x * y + y * x) * cap2;
    out[5] = z * y * cap2;
    out[6] = (3 * (z * z) - 1) * cap2;
    out[7] = z * x * cap2;
    out[8] = (x * x - y * y) * cap2;
  }
  #PackL1(sh, out) {
    for (let channel = 0; channel < 3; channel++) {
      out[channel * 4] = -L1_PACK_1 * sh[3 * 3 + channel];
      out[channel * 4 + 1] = -L1_PACK_1 * sh[1 * 3 + channel];
      out[channel * 4 + 2] = L1_PACK_1 * sh[2 * 3 + channel];
      out[channel * 4 + 3] = L1_PACK_0 * sh[0 * 3 + channel];
    }
    return out;
  }
  #PackL2(sh, out) {
    for (let channel = 0; channel < 3; channel++) {
      out[channel * 4] = -L2_PACK_1 * sh[3 * 3 + channel];
      out[channel * 4 + 1] = -L2_PACK_1 * sh[1 * 3 + channel];
      out[channel * 4 + 2] = L2_PACK_1 * sh[2 * 3 + channel];
      out[channel * 4 + 3] = L2_PACK_0 * sh[0 * 3 + channel] - L2_PACK_3 * sh[6 * 3 + channel];
    }
    for (let channel = 0; channel < 3; channel++) {
      const base = (channel + 3) * 4;
      out[base] = L2_PACK_2 * sh[4 * 3 + channel];
      out[base + 1] = -L2_PACK_2 * sh[5 * 3 + channel];
      out[base + 2] = 3 * L2_PACK_3 * sh[6 * 3 + channel];
      out[base + 3] = -L2_PACK_2 * sh[7 * 3 + channel];
    }
    out[24] = L2_PACK_4 * sh[8 * 3];
    out[25] = L2_PACK_4 * sh[8 * 3 + 1];
    out[26] = L2_PACK_4 * sh[8 * 3 + 2];
    out[27] = 1;
    return out;
  }
  #directionScratch = vec3.create();
  constructor() {
    super(_Tr2ShLightingManager), _initClass();
  }
}();

export { _Tr2ShLightingManager as Tr2ShLightingManager };
//# sourceMappingURL=Tr2ShLightingManager.js.map
