import { CjsDxbcFormat } from '../../../dxbc/CjsDxbcFormat.js';
import { WebglReadError } from '../errors.js';
import { DxbcGlslOperandFormatter } from './DxbcGlslOperandFormatter.js';
import { DxbcGlslHelperRegistry } from './DxbcGlslHelpers.js';

const COMPONENTS = ["x", "y", "z", "w"];

/**
 * Map-style compute lowering caps simultaneous UAV writes to this many
 * fragment color outputs. WebGL2 only guarantees `MAX_DRAW_BUFFERS >= 4`
 * (real implementations commonly expose up to 8); a compute kernel that
 * writes more UAVs than fit in one draw call's attachment set (e.g. a
 * hierarchical mip-chain "Pack" pass writing 16 mip levels per dispatch)
 * cannot become a single map-style fragment pass at all.
 */
const MAX_MAP_STYLE_UAV_OUTPUTS = 8;

/**
 * GLSL sampler type per DXBC resource-dimension id (float return types; the
 * stripped-RDEF corpus reflects everything as float).
 */
/**
 * DXBC resource dimension for a cube map. Emulated addressing refuses it: a
 * cube coordinate is a direction, so a [0,1] range test is meaningless there.
 */
const CUBE_DIMENSION = 6;
const SAMPLER_TYPE_BY_DIMENSION = {
  2: "sampler2D",
  3: "sampler2D",
  5: "sampler3D",
  6: "samplerCube",
  8: "sampler2DArray"
};

/**
 * Shadow-sampler type per WebGL2-supported DXBC resource dimension.
 * Comparison sampling changes both the call signature and the uniform type;
 * keeping this separate from the ordinary sampler table guarantees shaders
 * without comparison opcodes retain their existing declarations verbatim.
 */
const SHADOW_SAMPLER_TYPE_BY_DIMENSION = {
  3: "sampler2DShadow",
  6: "samplerCubeShadow",
  8: "sampler2DArrayShadow"
};
const COMPARISON_SAMPLE_OPCODES = new Set(["sample_c", "sample_c_lz"]);
const NON_COMPARISON_TEXTURE_OPCODES = new Set(["sample", "sample_l", "sample_b", "sample_d", "gather4", "gather4_po", "ld", "ld_ms", "lod"]);

/**
 * Filtered-sample coordinate mask per resource dimension
 * (HLSLcc `TranslateTexCoord`, toGLSLInstruction.cpp:985-1031).
 */
/** GLSL symbol for the merged detail-map array. */
const DETAIL_MAP_ARRAY_SYMBOL = "sDetailArrayMap";
const COORD_MASK_BY_DIMENSION = {
  2: "x",
  3: "xy",
  5: "xyz",
  6: "xyz",
  7: "xy",
  8: "xyz",
  10: "xyzw"
};

/**
 * DXBC -> GLSL ES 3.00 emitter for vertex and pixel stages.
 *
 * Implements the lowering rules in `docs/dxbc-lowering/*.md`, which pin every
 * template to HLSLcc's `toGLSLInstruction.cpp`/`toGLSLDeclaration.cpp`.
 * Registers are stored as float vec4s with bitcasts at use sites, comparison
 * results are 0xFFFFFFFF/0 masks (never bools), and register-stable symbols
 * (`cb#.data[]`, `t#`, `in_SEMANTIC#`, `vs_SEMANTIC#`) form the ABI surface.
 *
 * Emitter-wide policy: Adreno-3xx driver hygiene from HLSLcc (per-component
 * bitwise splits, `op_not`, `uint(0)` literals, `uvecN()` ctor wraps) is NOT
 * ported; the target is ANGLE-backed WebGL2 and the plain spec-legal forms
 * are emitted instead.
 */
class DxbcGlslEmitter {
  /**
  * @param {object} [options] Emitter options.
  * @param {object} [options.profile] Target-runtime profile overrides.
  * @param {"array"|"std140"} [options.profile.constantBufferStyle] `uniform vec4 cbN[]`
  *   arrays for ccpwgl's uniform4fv path, or std140 blocks.
  * @param {Object.<number,number>} [options.profile.pixelConstantBufferRemap] Pixel-stage
  *   cb slot renames (ccpwgl keeps PS effect constants at cb7).
  * @param {function(number,string):string} [options.profile.samplerName] Texture uniform
  *   naming per register and stage.
  * @param {number} [options.profile.vertexStructuredCapacity] Element capacity for
  *   vertex-stage structured-buffer UBOs (bones; Carbon max is 69 joints).
  */
  constructor(options = {}) {
    this.helpers = new DxbcGlslHelperRegistry();
    this._defineHelpers();
    this.profile = {
      constantBufferStyle: "array",
      pixelConstantBufferRemap: {
        0: 7
      },
      samplerName: (register, stageName) => stageName === "vertex" ? `vs${register}` : `s${register}`,
      vertexStructuredCapacity: 69,
      dataTextureWidth: 2048,
      // Resource (t#) registers to lower to a compile-time zero instead of
      // declaring a sampler / structured-buffer texture for them. Empty by
      // default (no behavior change); the packager fills this with the
      // tiled-lighting resources (LightBuffer/LightIndexBuffer/
      // LightProfileArray) when `--stub-light-resources` is set, so the
      // fragment sampler count drops under MAX_TEXTURE_IMAGE_UNITS.
      stubResourceRegisters: [],
      // Resource (t#) registers whose declaration is dropped and whose
      // samples lower to `vec4(1.0)` rather than `vec4(0.0)`.
      //
      // Separate from `stubResourceRegisters` because the two are not
      // interchangeable: a stubbed sampler reads as zero, which is right
      // for a term that is added and wrong for one that is multiplied.
      // `LightProfileArray` is multiplied into a light's attenuation, so
      // stubbing it would drive every profiled light to black, whereas
      // 1.0 is exactly what the shader's own no-profile path yields.
      neutralResourceRegisters: [],
      lightConstantBuffer: null,
      lightPackedTexture: null,
      // Resource (t#) registers to merge into one `sampler2DArray`, in
      // layer order. Empty by default; the packager fills it from the
      // backend-neutral detail-map recogniser. Merging three 2D textures
      // into one array binding frees two texture units on shaders that
      // sit exactly on WebGL2's 16-unit limit.
      detailMapArrayRegisters: [],
      ...options.profile
    };
  }

  /**
  * Registers the GLSL helper functions this emitter's lowerings can require.
  * GLSL ES 3.00 has no `bitfieldExtract`/`bitfieldInsert`/`bitCount`/
  * `textureGather` (all ES 3.10+), so `ibfe`/`ubfe`/`bfi`/`countbits`/
  * `gather4` lower to these hand-written equivalents instead.
  */
  _defineHelpers() {
    // Texture address modes WebGL2 cannot express, emulated in the shader.
    //
    // WebGL2 does REPEAT, MIRRORED_REPEAT and CLAMP_TO_EDGE natively. It has
    // no CLAMP_TO_BORDER (that needs EXT_texture_border_clamp, absent on our
    // desktop contexts) and no MIRROR_ONCE. Only those two are done here.
    //
    // The mode is a RUNTIME value, per axis, read from the address buffer.
    // It cannot be baked: ccpwgl resolves sampler overrides after
    // translation and caches one translated GLSL per resource path across
    // every instance, so a compile-time mode is wrong for any object whose
    // override differs from the container - in both directions.
    //
    // Modes are the Trinity enum as stored: 1 wrap, 2 mirror, 3 clamp-edge,
    // 4 border, 5 mirror-once. **0 means "nothing to emulate"**, which is
    // what every failure produces - a zeroed buffer, an absent upload, a
    // texture the consumer did not know about. Carbon's enum starts at 1 and
    // no shipped sampler carries 0, so 0 cannot swallow a real mode.
    //
    // Two arities rather than one vec3 form: a 2D sample has no third
    // coordinate, and its sampler may still declare a W mode - eight shipped
    // samplers declare border on W - which must not be tested against a
    // component that does not exist.
    this.helpers.define("cjsAddressCoord", {
      source: ["vec2 cjsAddressCoord(vec2 uv, vec2 modes) {", "    if (int(modes.x) == 5) uv.x = clamp(abs(uv.x), 0.0, 1.0);", "    if (int(modes.y) == 5) uv.y = clamp(abs(uv.y), 0.0, 1.0);", "    return uv;", "}", "", "vec3 cjsAddressCoord(vec3 uv, vec3 modes) {", "    if (int(modes.x) == 5) uv.x = clamp(abs(uv.x), 0.0, 1.0);", "    if (int(modes.y) == 5) uv.y = clamp(abs(uv.y), 0.0, 1.0);", "    if (int(modes.z) == 5) uv.z = clamp(abs(uv.z), 0.0, 1.0);", "    return uv;", "}"].join("\n")
    });

    // Applied to the already sampled value, so it composes with every sample
    // form the emitter produces - texture, textureLod, textureGrad and the
    // bias variant - instead of needing an overload for each.
    //
    // The border colour is baked, not read from the buffer: Carbon's
    // AddSamplerOverride takes only U and V, so no override can change it.
    // It is NOT always transparent black - specialfx/cloud, cloudsimple and
    // volumetrichalfsphereglow use opaque white.
    //
    // Testing the post-transform coordinate is safe: an axis is either
    // mirror-once or border, never both, and mirror-once leaves other axes
    // untouched.
    this.helpers.define("cjsAddressBorder", {
      source: ["vec4 cjsAddressBorder(vec4 sampled, vec2 uv, vec2 modes, vec4 borderColor) {", "    if (int(modes.x) == 4 && (uv.x < 0.0 || uv.x > 1.0)) return borderColor;", "    if (int(modes.y) == 4 && (uv.y < 0.0 || uv.y > 1.0)) return borderColor;", "    return sampled;", "}", "", "vec4 cjsAddressBorder(vec4 sampled, vec3 uv, vec3 modes, vec4 borderColor) {", "    if (int(modes.x) == 4 && (uv.x < 0.0 || uv.x > 1.0)) return borderColor;", "    if (int(modes.y) == 4 && (uv.y < 0.0 || uv.y > 1.0)) return borderColor;", "    if (int(modes.z) == 4 && (uv.z < 0.0 || uv.z > 1.0)) return borderColor;", "    return sampled;", "}"].join("\n")
    });
    // D3D11 IBFE pseudocode: width = src0 & 0x1f, offset = src1 & 0x1f;
    // width == 0 -> 0; width + offset < 32 -> a left/right arithmetic-shift
    // pair that sign-extends from bit (width-1); else an arithmetic shift by
    // offset alone. `w`/`o` are masked to [0,31] first so no shift amount
    // here can ever reach 32 (GLSL shift-by-bit-width is undefined).
    this.helpers.define("hlslcc_ibfe", {
      source: ["int hlslcc_ibfe(int width, int offset, int value) {", "    int w = width & 31;", "    int o = offset & 31;", "    if (w == 0) return 0;", "    if (w + o < 32) {", "        return (value << (32 - w - o)) >> (32 - w);", "    }", "    return value >> o;", "}"].join("\n")
    });
    // Same shape as `hlslcc_ibfe` with logical (unsigned) shifts.
    this.helpers.define("hlslcc_ubfe", {
      source: ["uint hlslcc_ubfe(uint width, uint offset, uint value) {", "    uint w = width & 31u;", "    uint o = offset & 31u;", "    if (w == 0u) return 0u;", "    if (w + o < 32u) {", "        return (value << (32u - w - o)) >> (32u - w);", "    }", "    return value >> o;", "}"].join("\n")
    });
    // D3D11 BFI pseudocode: bits = (((1 << width) - 1) << offset);
    // ((insert << offset) & bits) | (base & ~bits). `w` is masked to [0,31]
    // (per-spec "width&31") so `1u << w` never shifts by 32.
    this.helpers.define("hlslcc_bfi", {
      source: ["uint hlslcc_bfi(uint width, uint offset, uint insert, uint base) {", "    uint w = width & 31u;", "    uint o = offset & 31u;", "    uint bits = ((1u << w) - 1u) << o;", "    return ((insert << o) & bits) | (base & ~bits);", "}"].join("\n")
    });
    // Parallel (SWAR) popcount over a 32-bit uint.
    this.helpers.define("hlslcc_countbits", {
      source: ["uint hlslcc_countbits(uint value) {", "    uint v = value;", "    v = v - ((v >> 1u) & 0x55555555u);", "    v = (v & 0x33333333u) + ((v >> 2u) & 0x33333333u);", "    v = (v + (v >> 4u)) & 0x0F0F0F0Fu;", "    return (v * 0x01010101u) >> 24u;", "}"].join("\n")
    });
    // GLSL ES 3.00 has no `textureGather` (ES 3.10+/desktop 4.0+ only, see
    // docs/dxbc-lowering/texture-sample.md section 5). Emulated with four
    // `texelFetch` taps at the bilinear neighborhood, matching D3D Gather4 /
    // GL textureGather's neighbor order (top-left, top-right, bottom-right,
    // bottom-left -> .x/.y/.z/.w), clamped to the texture's edge.
    this.helpers.define("hlslcc_textureGather4Emulated", {
      source: ["vec4 hlslcc_textureGather4Emulated(sampler2D samp, vec2 uv, int channel) {", "    ivec2 size = textureSize(samp, 0);", "    ivec2 maxCoord = size - ivec2(1);", "    vec2 texel = uv * vec2(size) - vec2(0.5);", "    ivec2 base = ivec2(floor(texel));", "    ivec2 c0 = clamp(base + ivec2(0, 1), ivec2(0), maxCoord);", "    ivec2 c1 = clamp(base + ivec2(1, 1), ivec2(0), maxCoord);", "    ivec2 c2 = clamp(base + ivec2(1, 0), ivec2(0), maxCoord);", "    ivec2 c3 = clamp(base + ivec2(0, 0), ivec2(0), maxCoord);", "    return vec4(", "        texelFetch(samp, c0, 0)[channel],", "        texelFetch(samp, c1, 0)[channel],", "        texelFetch(samp, c2, 0)[channel],", "        texelFetch(samp, c3, 0)[channel]", "    );", "}"].join("\n")
    });
    // texture2darray variant of the gather4 emulation (ASSAO-style passes
    // gather from the deinterleaved depth/AO slice arrays constantly).
    // Same four-tap bilinear neighborhood and neighbor order as the 2D
    // helper; the layer index rides in uvw.z and rounds to the nearest
    // slice, matching D3D's array-coordinate rounding for Gather4. Unlike
    // sampler2D (default lowp), sampler2DArray has NO default precision
    // in GLSL ES 3.00, so the parameter must be qualified explicitly.
    this.helpers.define("hlslcc_textureGather4ArrayEmulated", {
      source: ["vec4 hlslcc_textureGather4ArrayEmulated(mediump sampler2DArray samp, vec3 uvw, int channel) {", "    ivec2 size = textureSize(samp, 0).xy;", "    ivec2 maxCoord = size - ivec2(1);", "    int layer = int(uvw.z + 0.5);", "    vec2 texel = uvw.xy * vec2(size) - vec2(0.5);", "    ivec2 base = ivec2(floor(texel));", "    ivec2 c0 = clamp(base + ivec2(0, 1), ivec2(0), maxCoord);", "    ivec2 c1 = clamp(base + ivec2(1, 1), ivec2(0), maxCoord);", "    ivec2 c2 = clamp(base + ivec2(1, 0), ivec2(0), maxCoord);", "    ivec2 c3 = clamp(base + ivec2(0, 0), ivec2(0), maxCoord);", "    return vec4(", "        texelFetch(samp, ivec3(c0, layer), 0)[channel],", "        texelFetch(samp, ivec3(c1, layer), 0)[channel],", "        texelFetch(samp, ivec3(c2, layer), 0)[channel],", "        texelFetch(samp, ivec3(c3, layer), 0)[channel]", "    );", "}"].join("\n")
    });
  }

  /**
  * Translates one DXBC stage into GLSL ES 3.00 source.
  *
  * @param {ArrayBuffer|ArrayBufferView|Uint8Array} bytes DXBC container bytes.
  * @param {object} [options] Emit options.
  * @param {string} [options.source] Source name used in error details.
  * @returns {{source:string,stageName:string,inputs:object[],outputs:object[],bindings:object[],warnings:string[],computeFragment:(object|undefined)}}
  *   GLSL text plus the IO contract the packaging layer records; compute
  *   stages add a `computeFragment` host contract (thread group,
  *   dispatch-origin uniform, per-output UAV slice routing).
  */
  Emit(bytes, options = {}) {
    const sourceName = options.source || "memory";
    const raw = CjsDxbcFormat.read(bytes, {
      source: sourceName,
      emit: CjsDxbcFormat.OUTPUT_RAW
    });
    if (!raw.program) {
      throw new WebglReadError("DXBC container has no shader program chunk", {
        source: sourceName
      });
    }
    const program = raw.program;
    if (program.programTypeName !== "vertex" && program.programTypeName !== "pixel" && program.programTypeName !== "compute") {
      throw new WebglReadError("Only vertex, pixel, and compute stages target WebGL2", {
        source: sourceName,
        programTypeName: program.programTypeName
      });
    }
    const state = {
      sourceName,
      stageName: program.programTypeName,
      isPixel: program.programTypeName === "pixel",
      isCompute: program.programTypeName === "compute",
      decoder: raw.decoder,
      isgn: raw.inputSignature,
      osgn: raw.outputSignature,
      inputNames: new Map(),
      outputNames: new Map(),
      resourceDimensions: new Map(),
      resourceNames: new Map(),
      comparisonResources: this._analyzeComparisonResources(raw.decoder, sourceName),
      constantBufferNames: new Map(),
      structuredBuffers: new Map(),
      lightConstantBuffer: this._normalizeLightConstantBufferProfile(),
      lightConstantBufferDeclared: false,
      lightPackedTexture: this._normalizeLightPackedTextureProfile(),
      emulatedAddressing: this._normalizeEmulatedAddressingProfile(),
      addressBufferDeclared: false,
      lightPackedTextureDeclared: false,
      // Resource (t#) registers stubbed to a compile-time zero: their
      // declarations/bindings are dropped and every read of them lowers
      // to `uintBitsToFloat(0u)` (structured) / `vec4(0.0)` (sampled).
      stubbedResources: new Set(this.profile.stubResourceRegisters || []),
      // Resource (t#) registers dropped to a compile-time *one*: same
      // declaration handling as `stubbedResources`, but reads lower to
      // `vec4(1.0)` so a multiplied term degrades to neutral instead of
      // to black. See `neutralResourceRegisters` on the profile.
      neutralResources: new Set(this.profile.neutralResourceRegisters || []),
      // Resource register -> array layer for the merged detail maps, and
      // whether the one shared array declaration has been emitted yet.
      detailMapArrayLayers: new Map((this.profile.detailMapArrayRegisters || []).map((register, layer) => [register, layer])),
      detailMapArrayDeclared: false,
      inputMasks: new Map(),
      outputMasks: new Map(),
      bindings: [],
      declarationLines: [],
      earlyMainLines: [],
      bodyLines: [],
      indent: 1,
      warnings: [],
      inputs: [],
      outputs: [],
      icbName: "ImmCB_0",
      // Compute (map-style) state: workgroup size, UAV register->name map,
      // UAV declared-return-types (for the non-float-format warning),
      // the `_analyzeUavStores` pre-pass results (register->dimension,
      // register->slice plan, register->per-slice output names, running
      // output-location count), the dispatch-origin uniform name once
      // declared, and which of the four thread-id pseudo-inputs this
      // shader declares.
      threadGroup: null,
      uavNames: new Map(),
      uavReturnTypes: new Map(),
      uavDimensions: new Map(),
      uavSlicePlan: new Map(),
      uavSliceNames: new Map(),
      uavOutputCount: 0,
      dispatchOriginUniform: null,
      computeInputsUsed: {
        threadId: false,
        groupId: false,
        tig: false,
        flattened: false
      }
    };
    this.helpers.reset();
    if (state.isCompute) {
      this._assertMapStyleCompute(state);
      this._analyzeUavStores(state);
    }
    state.integerVertexInputs = new Map();
    state.formatter = new DxbcGlslOperandFormatter({
      // Populated during vertex-input declaration (the declaration loop
      // runs before any body emission, so the map is complete before the
      // first operand is formatted). Integer reads of these registers
      // value-convert instead of bitcast - see _declareVertexInput.
      integerInputs: state.integerVertexInputs,
      componentMap: operand => {
        if (operand.type === 1) return state.inputMasks.get(operand.registerIndex) || null;
        if (operand.type === 2) return state.outputMasks.get(operand.registerIndex) || null;
        return null;
      },
      names: {
        input: index => state.inputNames.get(index) || `v${index}`,
        output: index => state.outputNames.get(index) || `o${index}`,
        constantBuffer: slot => state.constantBufferNames.get(slot) || `cb${slot}`,
        constantBufferMember: this.profile.constantBufferStyle === "std140" ? "data" : "",
        resource: index => state.resourceNames.get(index) || `t${index}`,
        uav: index => state.uavNames.get(index) || `cjsUav${index}`,
        immediateConstantBuffer: state.icbName
      }
    });
    for (const instruction of state.decoder.instructions) {
      if (instruction.isDeclaration) {
        this._emitDeclaration(state, instruction);
      }
    }
    if (state.isCompute) {
      this._emitComputeInputPrelude(state);
    }
    // Pair-aware varyings: declare and zero-fill any varying register the
    // paired pixel stage reads but this vertex stage never declares (DX11
    // tolerates such signature mismatches; GLSL linking does not).
    if (!state.isPixel && !state.isCompute && Array.isArray(options.pairVaryings)) {
      for (const register of options.pairVaryings) {
        if (state.outputNames.has(register)) continue;
        const name = `vs_r${register}`;
        state.outputNames.set(register, name);
        state.declarationLines.push(`out vec4 ${name};`);
        state.outputs.push({
          register,
          name,
          width: 4,
          semanticName: null,
          semanticIndex: 0
        });
        state.warnings.push(`varying ${name} is read by the paired pixel stage but never produced; zero-filled`);
      }
    }
    this._zeroFillUnwrittenOutputs(state);
    for (const instruction of state.decoder.instructions) {
      if (!instruction.isDeclaration) {
        this._emitInstruction(state, instruction);
      }
    }
    if (state.indent !== 1) {
      throw new WebglReadError("Unbalanced control-flow blocks", {
        source: sourceName,
        indent: state.indent
      });
    }
    const result = {
      source: this._assemble(state),
      stageName: state.stageName,
      inputs: state.inputs,
      outputs: state.outputs,
      bindings: state.bindings,
      warnings: state.warnings
    };
    if (state.isCompute) {
      // Host contract for one map-style draw: viewport = target size,
      // `uavOutputs[i].location` = color attachment index, and `slice`
      // (when non-null) = the texture2darray layer to attach there via
      // framebufferTextureLayer. `threadGroup` documents the original
      // dispatch granularity (fragment execution does not need it).
      result.computeFragment = {
        threadGroup: state.threadGroup ? [...state.threadGroup] : null,
        dispatchOriginUniform: state.dispatchOriginUniform,
        uavOutputs: state.bindings.filter(binding => binding.kind === "uavTexture").map(binding => ({
          register: binding.registerIndex,
          slice: binding.slice,
          location: binding.location,
          glslName: binding.name
        }))
      };
    }
    return result;
  }

  /**
  * Normalizes the optional local-light constant-buffer lowering profile.
  *
  * @returns {object|null} Normalized profile, or null when disabled.
  */
  _normalizeLightConstantBufferProfile() {
    const profile = this.profile.lightConstantBuffer;
    if (!profile || typeof profile !== "object") return null;
    const indexRegister = Number(profile.indexRegister);
    const dataRegister = Number(profile.dataRegister);
    if (!Number.isInteger(indexRegister) || !Number.isInteger(dataRegister)) return null;
    return {
      indexRegister,
      dataRegister,
      profileRegister: Number.isInteger(Number(profile.profileRegister)) ? Number(profile.profileRegister) : null,
      registerIndex: Number.isInteger(Number(profile.registerIndex)) ? Number(profile.registerIndex) : 6,
      name: profile.name || `cb${Number.isInteger(Number(profile.registerIndex)) ? Number(profile.registerIndex) : 6}`,
      capacity: Number.isInteger(Number(profile.capacity)) ? Number(profile.capacity) : 40,
      listBase: Number.isInteger(Number(profile.listBase)) ? Number(profile.listBase) : 65536
    };
  }

  /**
  * Finds resources used by comparison-sample instructions before resource
  * declarations are emitted, so those declarations can use shadow sampler
  * types. A single GLSL uniform cannot be both a shadow and ordinary sampler;
  * reject that shape explicitly instead of producing invalid GLSL.
  *
  * @param {object} decoder Decoded DXBC instruction stream.
  * @param {string} sourceName Source name used in error details.
  * @returns {Map<number,Set<number>>} Resource register -> sampler registers.
  */
  _analyzeComparisonResources(decoder, sourceName) {
    const comparisonResources = new Map();
    const ordinaryResources = new Set();
    for (const instruction of decoder.instructions) {
      const resourceOperand = instruction.operands?.[2];
      if (!resourceOperand || !Number.isInteger(resourceOperand.registerIndex)) continue;
      if (COMPARISON_SAMPLE_OPCODES.has(instruction.opcodeName)) {
        const register = resourceOperand.registerIndex;
        const samplerRegister = instruction.operands?.[3]?.registerIndex;
        const samplers = comparisonResources.get(register) || new Set();
        if (Number.isInteger(samplerRegister)) samplers.add(samplerRegister);
        comparisonResources.set(register, samplers);
      } else if (NON_COMPARISON_TEXTURE_OPCODES.has(instruction.opcodeName)) {
        ordinaryResources.add(resourceOperand.registerIndex);
      }
    }
    for (const register of comparisonResources.keys()) {
      if (ordinaryResources.has(register)) {
        throw new WebglReadError("A resource sampled with comparison and non-comparison operations requires separate combined samplers", {
          source: sourceName,
          registerIndex: register
        });
      }
    }
    return comparisonResources;
  }

  /**
  * Normalizes the emulated-addressing profile.
  *
  * Keyed by RESOURCE register, not sampler register, because that is what
  * every layer we touch keys on: GL stores wrap state on the texture object,
  * ccpwgl keys overrides by texture name, and the emitted GLSL declares one
  * sampler uniform per resource. Only D3D treats the mode as a property of a
  * shared sampler - in `decalv5` five textures share one bordered sampler and
  * each can resolve to a different mode, which a sampler-keyed scheme cannot
  * represent.
  *
  * It arrives as a profile option because it CANNOT be discovered here: DXBC
  * carries no sampler state, which lives in the Carbon container wrapping it.
  * The caller also chooses the SUPERSET - listing a texture whose container
  * mode needs no emulation is deliberate and cheap, because the runtime mode
  * decides, and it is what lets an override correct a container that is wrong.
  *
  * Shape: `{ bufferRegister, textures: [{ registerIndex, borderColor }] }`.
  *
  * @returns {{bufferRegister:number, textures:Map<number,{color:number[]}>}|null}
  *   Null when disabled.
  */
  _normalizeEmulatedAddressingProfile() {
    const value = this.profile.emulatedAddressing;

    // Either input alone is a complete profile: `samplerModes` is the
    // ordinary case (container modes, mapped onto resources here), and
    // `textures` is for a caller gating something the container gives it no
    // reason to gate. Requiring both would reject the ordinary case.
    if (!value || typeof value !== "object") return null;
    if (!Array.isArray(value.textures) && !value.samplerModes) return null;
    const bufferRegister = Number(value.bufferRegister ?? 8);
    if (!Number.isInteger(bufferRegister) || bufferRegister < 0 || bufferRegister > 254) {
      throw new WebglReadError("Emulated-addressing buffer register must be an integer in 0..254", {
        bufferRegister: value.bufferRegister
      });
    }
    const colorOf = raw => {
      if (raw === undefined || raw === null) return [0, 0, 0, 0];
      if (!Array.isArray(raw) || raw.length !== 4) {
        throw new WebglReadError("Border colour must be four components", {
          color: raw
        });
      }
      const parsed = raw.map(Number);

      // A malformed colour must not become a plausible one: transparent
      // black is the common case, so silently defaulting to it would hide
      // the mistake in exactly the effects that differ from it.
      if (parsed.some(c => !Number.isFinite(c))) {
        throw new WebglReadError("Border colour components must be finite numbers", {
          color: raw
        });
      }
      return parsed;
    };

    // Container sampler modes, keyed by SAMPLER register. Supplied so the
    // emitter can derive which resources need a gate: only it knows, from
    // the DXBC, which resource is read through which sampler. The caller
    // knows the modes but not that mapping; the emitter knows the mapping
    // but not the modes, because DXBC carries no sampler state.
    const samplerModes = new Map();
    for (const [key, modes] of Object.entries(value.samplerModes ?? {})) {
      const registerIndex = Number(key);
      if (!Number.isInteger(registerIndex) || registerIndex < 0) continue;
      const axes = [modes?.u, modes?.v, modes?.w].map(Number);

      // Only the two modes WebGL2 cannot express need a gate. Everything
      // else is left to GL, so listing it would cost a branch for nothing.
      if (axes.some(m => m === 4 || m === 5)) {
        samplerModes.set(registerIndex, true);
      }
    }
    const textures = new Map();
    for (const entry of value.textures ?? []) {
      const registerIndex = Number.isInteger(entry) ? entry : Number(entry?.registerIndex);
      if (!Number.isInteger(registerIndex) || registerIndex < 0) {
        throw new WebglReadError("Emulated-addressing entries need an integer resource registerIndex", {
          entry
        });
      }
      textures.set(registerIndex, {
        color: colorOf(Number.isInteger(entry) ? null : entry?.borderColor)
      });
    }
    if (!textures.size && !samplerModes.size) return null;
    return {
      bufferRegister,
      textures,
      samplerModes,
      defaultColor: colorOf(value.borderColor)
    };
  }

  /**
  * Applies emulated address modes to one sample.
  *
  * Emits nothing for a texture the caller did not list, so a shader with no
  * emulated addressing is byte-identical to one emitted without the profile.
  *
  * @param {object} state Emit state.
  * @param {object} instruction Decoded texture instruction.
  * @param {string} call The GLSL sample expression built so far.
  * @param {string} coord The coordinate expression passed to that sample.
  * @param {string} coordMask Component mask of the coordinate.
  * @returns {string} The sample expression, addressed when the caller listed it.
  * @private
  */
  _applyEmulatedAddressing(state, instruction, call, coord, coordMask) {
    const profile = state.emulatedAddressing;
    if (!profile) return call;
    const resourceRegister = instruction.operands?.[2]?.registerIndex;
    if (!Number.isInteger(resourceRegister)) return call;

    // An explicit entry wins; otherwise derive from the sampler this
    // resource is read through. Deriving is the ordinary case - the caller
    // supplies container modes and the emitter maps them onto resources -
    // and the explicit list is for a caller that wants a texture gated the
    // container gives it no reason to gate. That is not redundant: a
    // sampler override can introduce an emulated mode the container never
    // declared, and overrides exist precisely to correct a wrong container.
    let entry = profile.textures.get(resourceRegister);
    if (!entry) {
      const samplerRegister = instruction.operands?.[3]?.registerIndex;
      if (!Number.isInteger(samplerRegister)) return call;
      if (!profile.samplerModes.has(samplerRegister)) return call;
      entry = {
        color: profile.defaultColor
      };
    }

    // A cube coordinate is a DIRECTION, not a texture coordinate, so a
    // [0,1] test has no meaning on it. Refuse rather than emit a test that
    // is silently nonsense - the caller must not list cube-target
    // resources. decalholev5's interior cube and cubetextureviewer are the
    // shipped cases that reach here.
    const dimension = state.resourceDimensions.get(resourceRegister);
    if (dimension === CUBE_DIMENSION) {
      // Reported and skipped, not fatal. `decalholev5` reads its interior
      // cube through a bordered sampler, so refusing would make a shipped
      // effect unbuildable over a mode that cannot apply to it anyway -
      // trading a missing border for no shader at all. Skipping silently
      // is the other wrong answer, so it goes in warnings.
      state.warnings.push(`emulated addressing skipped for cube resource t${resourceRegister}: ` + "a cube coordinate is a direction, so a [0,1] range test has no meaning");
      return call;
    }
    if (coordMask.length !== 2 && coordMask.length !== 3) {
      throw new WebglReadError("Emulated addressing supports two- and three-component sampling only", {
        source: state.sourceName,
        registerIndex: resourceRegister,
        coordMask
      });
    }
    const buffer = this._ensureAddressBuffer(state);
    const swizzle = coordMask.length === 2 ? "xy" : "xyz";
    const modes = `${buffer}[${resourceRegister}].${swizzle}`;
    const glslFloat = n => Number.isInteger(n) ? `${n}.0` : String(n);
    const color = entry.color.map(glslFloat).join(", ");

    // Mirror-once rewrites the coordinate BEFORE the fetch; border tests
    // after it. Both are emitted: an axis is only ever one of them, and the
    // unused one reads mode 0 or a native mode and does nothing.
    const coordHelper = this.helpers.require("cjsAddressCoord");
    const borderHelper = this.helpers.require("cjsAddressBorder");
    const addressedCoord = `${coordHelper}(${coord}, ${modes})`;
    const rewritten = call.split(coord).join(addressedCoord);
    return `${borderHelper}(${rewritten}, ${addressedCoord}, ${modes}, vec4(${color}))`;
  }

  /**
  * Declares the emulated-addressing constant buffer, once per shader.
  *
  * Sized to the highest listed resource register so the array stays compact,
  * the way Carbon emitters declare compact `cb` arrays. The register is
  * caller-chosen and defaults to 8: shipped effects declare only cb0-4, 6 and
  * 7, and ccpwgl already resolves `cb0`..`cb15` by name, so 8 needs no new
  * binding table.
  *
  * @param {object} state Emit state.
  * @returns {string} The buffer's GLSL name.
  * @private
  */
  _ensureAddressBuffer(state) {
    const {
      bufferRegister,
      textures
    } = state.emulatedAddressing;
    const name = `cb${bufferRegister}`;
    if (state.addressBufferDeclared) return name;

    // Two declarations of one cb name is a GLSL redefinition error that
    // nothing downstream checks, so catch it here, where the register is
    // still attributable to a caller's choice.
    //
    // Compared by NAME, not by register: `constantBufferNames` is keyed by
    // DXBC slot while the emitted name uses the remapped register, and on a
    // pixel stage slot 0 becomes `cb7`. Comparing register to slot would
    // miss exactly that case and emit two `cb7` declarations.
    if ([...state.constantBufferNames.values()].includes(name)) {
      throw new WebglReadError("Emulated-addressing buffer register collides with a declared constant buffer", {
        source: state.sourceName,
        bufferRegister
      });
    }

    // Sized from every resource the shader DECLARES, not from the addressed
    // set: with a derived set the addressed registers are not all known yet,
    // and the array is indexed by resource register, so it must be long
    // enough for any of them. DXBC puts declarations before instructions, so
    // resourceDimensions is complete by the first sample.
    const highest = Math.max(-1, ...state.resourceDimensions.keys(), ...textures.keys());
    const rows = highest + 1;
    if (rows < 1) {
      throw new WebglReadError("Emulated addressing found no declared resource to size its buffer", {
        source: state.sourceName
      });
    }
    state.constantBufferNames.set(bufferRegister, name);
    state.addressBufferDeclared = true;
    state.declarationLines.push(`uniform vec4 ${name}[${rows}];`);
    // An ordinary constantBuffer binding, deliberately with no extra fields.
    // `cjsSemantic` is reserved vocabulary for the local-light family and
    // the block writer throws on any other value, and the wire drops fields
    // it does not encode - so an invented one would vanish for every effect
    // loaded from bytes, which is exactly how the packed-light branch came
    // to be silently dead.
    //
    // The consumer identifies it by register instead: Carbon declares only
    // cb0-4, 6 and 7 across all 537 shipped effects, so a constant buffer at
    // 8 or above is ours. That is a convention, and it is written down in
    // the addressing contract rather than left to be inferred.
    state.bindings.push({
      kind: "constantBuffer",
      registerIndex: bufferRegister,
      name,
      sizeInVec4: rows,
      style: "array"
    });
    return name;
  }

  /**
  * Normalizes the optional packed local-light texture lowering profile.
  *
  * @returns {object|null} Normalized profile, or null when disabled.
  */
  _normalizeLightPackedTextureProfile() {
    const profile = this.profile.lightPackedTexture;
    if (!profile || typeof profile !== "object") return null;
    const indexRegister = Number(profile.indexRegister);
    const dataRegister = Number(profile.dataRegister);
    if (!Number.isInteger(indexRegister) || !Number.isInteger(dataRegister)) return null;
    return {
      indexRegister,
      dataRegister,
      profileRegister: Number.isInteger(Number(profile.profileRegister)) ? Number(profile.profileRegister) : null,
      registerIndex: Number.isInteger(Number(profile.registerIndex)) ? Number(profile.registerIndex) : indexRegister,
      name: profile.name || "cjsLocalLightTexture",
      dataTexelBase: Number.isInteger(Number(profile.dataTexelBase)) ? Number(profile.dataTexelBase) : 131072
    };
  }

  /**
  * Declares the packed local-light texture ABI used to replace the
  * LightIndexBuffer/LightBuffer/LightProfileArray trio with one RGBA32UI
  * data texture.
  *
  * @param {object} state Emit state.
  */
  _ensureLightPackedTexture(state) {
    const profile = state.lightPackedTexture;
    if (!profile || state.lightPackedTextureDeclared) return;
    state.lightPackedTextureDeclared = true;
    state.declarationLines.push(`uniform highp usampler2D ${profile.name};`);
    state.bindings.push({
      kind: "structuredTexture",
      registerIndex: profile.registerIndex,
      name: profile.name,
      strideBytes: 0,
      format: "RGBA32UI",
      width: this.profile.dataTextureWidth,
      cjsSemantic: "packedLocalLights",
      lightIndexRegister: profile.indexRegister,
      lightDataRegister: profile.dataRegister,
      lightProfileRegister: profile.profileRegister,
      dataTexelBase: profile.dataTexelBase
    });
  }

  /**
  * Declares the local-light constant-buffer ABI used to replace the two
  * tiled-light structured buffers without consuming sampler units.
  *
  * @param {object} state Emit state.
  */
  _ensureLightConstantBuffer(state) {
    const profile = state.lightConstantBuffer;
    if (!profile || state.lightConstantBufferDeclared) return;
    state.lightConstantBufferDeclared = true;
    const rows = 1 + profile.capacity * 3;
    state.constantBufferNames.set(profile.registerIndex, profile.name);
    state.declarationLines.push(`uniform vec4 ${profile.name}[${rows}];`, `uint cjsLocalLightCount() { return floatBitsToUint(${profile.name}[0].x); }`, "uint cjsLocalLightIndexLoad(int element) {", "    uint count = cjsLocalLightCount();", "    if (count == 0u) return 0u;", `    const int listBase = ${profile.listBase};`, "    if (element < listBase) return uint(listBase);", "    int local = element - listBase;", "    int node = local >> 1;", "    if (node < 0 || uint(node) >= count) return 0u;", "    if ((local & 1) == 0) return uint(node + 1);", "    uint next = uint(node + 1);", "    return next < count ? uint(listBase + int(next) * 2) : 0u;", "}", "vec4 cjsLocalLightRow(int lightIndex, int row) {", "    int i = lightIndex - 1;", "    if (i < 0 || uint(i) >= cjsLocalLightCount() || row < 0 || row >= 3) return vec4(0.0);", `    return ${profile.name}[1 + i * 3 + row];`, "}");
    state.bindings.push({
      kind: "constantBuffer",
      registerIndex: profile.registerIndex,
      name: profile.name,
      sizeInVec4: rows,
      style: "array",
      cjsSemantic: "localLights",
      capacityLights: profile.capacity,
      lightIndexRegister: profile.indexRegister,
      lightDataRegister: profile.dataRegister,
      lightProfileRegister: profile.profileRegister
    });
  }

  /**
  * Rejects compute shaders that need real compute-pipeline features (shared
  * memory, barriers, atomics, raw/structured/typed UAV reads) instead of the
  * "map-style" thread-per-fragment shape this emitter lowers. The message
  * intentionally contains "not supported" so packaging's kill-list
  * classifier regex (`/not supported|No GLSL lowering|unimplementable/i`)
  * routes these to the exclusion list rather than the failure list.
  *
  * @param {object} state Emit state.
  */
  _assertMapStyleCompute(state) {
    for (const instruction of state.decoder.instructions) {
      const name = instruction.opcodeName;
      const blocked = name.startsWith("dcl_thread_group_shared_memory") || name === "sync" || name.startsWith("atomic_") || name.startsWith("imm_atomic_") || name === "ld_uav_typed" || name === "store_raw" || name === "store_structured";
      if (blocked) {
        throw new WebglReadError("compute stage is not map-style; WebGL2 fragment lowering is not supported for this instruction", {
          source: state.sourceName,
          opcodeName: name,
          offset: instruction.offset
        });
      }
    }
  }

  /**
  * Pre-scans a map-style compute shader's `store_uav_typed` instructions and
  * builds a per-UAV slice plan before any declaration is emitted.
  *
  * Straight-line constant propagation only: the address registers ASSAO-style
  * Prepare passes build are `mov rX.<c>, l(k)` immediates, so the tracker
  * records the last constant written to each temp component and treats every
  * other write as dynamic. Each stored-to UAV register resolves to either
  * `{ kind: "single" }` (at most one store; the array-slice coordinate, when
  * present, is dropped — the host attaches the target layer via
  * `framebufferTextureLayer`) or `{ kind: "multiSlice", slices, sliceByOffset }`
  * (several stores at statically distinct texture2darray slices, each routed
  * to its own fragment output — the host attaches those layers as sequential
  * color attachments).
  *
  * Anything outside those two shapes cannot become one fragment pass, so the
  * throw messages deliberately contain "not supported" for packaging's
  * kill-list classifier (see `_assertMapStyleCompute`).
  *
  * @param {object} state Emit state.
  */
  _analyzeUavStores(state) {
    for (const instruction of state.decoder.instructions) {
      if (instruction.isDeclaration && instruction.opcodeName === "dcl_unordered_access_view_typed") {
        state.uavDimensions.set(instruction.declaration.registerIndex, instruction.declaration.resourceDimension);
      }
    }
    const constantTemps = new Map();
    const storesByUav = new Map();
    let controlFlowDepth = 0;
    for (const instruction of state.decoder.instructions) {
      if (instruction.isDeclaration) continue;
      const name = instruction.opcodeName;
      if (name === "if" || name === "loop" || name === "switch") {
        controlFlowDepth += 1;
        continue;
      }
      if (name === "endif" || name === "endloop" || name === "endswitch") {
        controlFlowDepth -= 1;
        continue;
      }
      if (name === "store_uav_typed") {
        const [uavOperand, addressOperand] = instruction.operands;
        const register = uavOperand.registerIndex;
        const isArray = state.uavDimensions.get(register) === 8;
        const stores = storesByUav.get(register) || [];
        stores.push({
          offset: instruction.offset,
          slice: isArray ? this._resolveSliceConstant(addressOperand, constantTemps) : null,
          isArray,
          controlFlowDepth
        });
        storesByUav.set(register, stores);
        continue;
      }
      this._trackTempConstants(instruction, constantTemps);
    }
    for (const [register, stores] of storesByUav) {
      if (stores.length <= 1) {
        state.uavSlicePlan.set(register, {
          kind: "single"
        });
        continue;
      }
      const throwNotMapStyle = shape => {
        throw new WebglReadError(`compute stage is not map-style; ${shape} are not supported by the WebGL2 emitter's fragment-output lowering`, {
          source: state.sourceName,
          registerIndex: register,
          storeCount: stores.length
        });
      };
      const slices = stores.map(store => store.slice);
      if (!stores[0].isArray) {
        throwNotMapStyle("multiple stores to one non-array UAV");
      }
      if (slices.some(slice => slice === null)) {
        throwNotMapStyle("multiple UAV stores with a dynamic array slice");
      }
      if (new Set(slices).size !== slices.length) {
        throwNotMapStyle("multiple UAV stores to the same array slice");
      }
      if (stores.some(store => store.controlFlowDepth > 0)) {
        throwNotMapStyle("multi-slice UAV stores inside divergent control flow");
      }
      state.uavSlicePlan.set(register, {
        kind: "multiSlice",
        slices: [...slices].sort((a, b) => a - b),
        sliceByOffset: new Map(stores.map(store => [store.offset, store.slice]))
      });
    }
  }

  /**
  * Updates the per-temp-component constant tracker for one instruction:
  * `mov rX.<mask>, l(...)` records each written component's immediate dword,
  * and any other write to a temp component invalidates it. Destination
  * operands are exactly the mask-selection temp operands (DXBC sources
  * always read through swizzle/select1), so this also handles multi-
  * destination opcodes like `sincos` and `udiv` conservatively.
  *
  * @param {object} instruction Decoded non-declaration instruction.
  * @param {Map<string, number>} constantTemps Constant tracker keyed `<register>.<component>`.
  */
  _trackTempConstants(instruction, constantTemps) {
    const source = instruction.operands[1];
    const isConstantMov = instruction.opcodeName === "mov" && !instruction.saturate && source?.type === 4 && source.modifierName === "none";
    for (const operand of instruction.operands) {
      if (operand.type !== 0 || operand.selectionModeName !== "mask" || operand.registerIndex === null) continue;
      for (const component of operand.mask || "xyzw") {
        const key = `${operand.registerIndex}.${component}`;
        if (isConstantMov && operand.mask) {
          const value = source.componentCount === 1 ? source.immediateValues[0] : source.immediateValues["xyzw".indexOf(component)];
          constantTemps.set(key, value.uint32 | 0);
        } else {
          constantTemps.delete(key);
        }
      }
    }
  }

  /**
  * Resolves the array-slice (z) component of a `store_uav_typed` address
  * operand to a compile-time constant, or null when it is dynamic.
  *
  * @param {object} addressOperand Decoded address operand.
  * @param {Map<string, number>} constantTemps Constant tracker keyed `<register>.<component>`.
  * @returns {number|null} Constant slice index, or null.
  */
  _resolveSliceConstant(addressOperand, constantTemps) {
    if (addressOperand.type === 4) {
      const value = addressOperand.componentCount === 1 ? addressOperand.immediateValues[0] : addressOperand.immediateValues[2];
      return value ? value.uint32 | 0 : null;
    }
    if (addressOperand.type !== 0) {
      return null;
    }
    const component = addressOperand.selectionModeName === "swizzle" && addressOperand.swizzle ? addressOperand.swizzle[2] : "z";
    const key = `${addressOperand.registerIndex}.${component}`;
    return constantTemps.has(key) ? constantTemps.get(key) : null;
  }

  /**
  * Allocates the next map-style UAV fragment-output location, enforcing the
  * `MAX_MAP_STYLE_UAV_OUTPUTS` attachment budget across single-output UAVs
  * and per-slice multi-output UAVs alike.
  *
  * @param {object} state Emit state.
  * @param {number} register UAV register index (error detail only).
  * @returns {number} Allocated output location.
  */
  _allocateUavOutputLocation(state, register) {
    const location = state.uavOutputCount;
    if (location >= MAX_MAP_STYLE_UAV_OUTPUTS) {
      throw new WebglReadError("compute stage is not map-style; too many simultaneous UAV writes are not supported by the WebGL2 emitter's fragment-output lowering", {
        source: state.sourceName,
        registerIndex: register,
        uavCount: location + 1
      });
    }
    state.uavOutputCount += 1;
    return location;
  }

  // ------------------------------------------------------------------
  // Declarations
  // ------------------------------------------------------------------

  /**
   * Emits one decoded DXBC declaration into the GLSL interface and manifest.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC declaration instruction.
   * @private
   */
  _emitDeclaration(state, instruction) {
    const declaration = instruction.declaration;
    switch (instruction.opcodeName) {
      case "dcl_global_flags":
        // layout(early_fragment_tests) is not GLSL ES 3.00; suppressed by design.
        break;
      case "dcl_temps":
        for (let index = 0; index < declaration.tempCount; index += 1) {
          state.declarationLines.push(`vec4 r${index};`);
        }
        break;
      case "dcl_indexable_temp":
        state.declarationLines.push(`vec${declaration.componentCount} x${declaration.registerIndex}[${declaration.registerCount}];`);
        break;
      case "dcl_constant_buffer":
        {
          const slot = declaration.registerIndex;
          const mapped = state.isPixel ? this.profile.pixelConstantBufferRemap[slot] ?? slot : slot;
          const name = `cb${mapped}`;
          state.constantBufferNames.set(slot, name);
          if (this.profile.constantBufferStyle === "std140") {
            state.declarationLines.push(`layout(std140) uniform ConstantBuffer${mapped} {`, `    vec4 data[${declaration.sizeInVec4}];`, `} ${name};`);
          } else {
            state.declarationLines.push(`uniform vec4 ${name}[${declaration.sizeInVec4}];`);
          }
          state.bindings.push({
            kind: "constantBuffer",
            registerIndex: slot,
            name,
            sizeInVec4: declaration.sizeInVec4,
            style: this.profile.constantBufferStyle
          });
          break;
        }
      case "dcl_sampler":
        break;
      case "dcl_resource":
        {
          const register = declaration.registerIndex;
          if (state.lightPackedTexture?.profileRegister === register) {
            this._ensureLightPackedTexture(state);
            state.resourceDimensions.set(register, declaration.resourceDimension);
            state.resourceNames.set(register, `s${register}`);
            break;
          }
          if (state.lightConstantBuffer?.profileRegister === register) {
            this._ensureLightConstantBuffer(state);
            state.resourceDimensions.set(register, declaration.resourceDimension);
            state.resourceNames.set(register, `s${register}`);
            break;
          }
          if (state.stubbedResources.has(register)) {
            // Stubbed tiled-lighting sampler (e.g. LightProfileArray):
            // drop the declaration + binding entirely; every sample of
            // this register lowers to vec4(0.0) in _textureSample.
            break;
          }
          if (state.neutralResources.has(register)) {
            // Same as the stub above, but its samples lower to
            // vec4(1.0). Dropping the declaration is what frees the
            // sampler unit; the substitution is what keeps the result
            // correct for a multiplied term.
            //
            // Nothing is recorded as a binding, because nothing is
            // bound. The pass's resource-transform section carries the
            // statement that this resource was dropped deliberately;
            // see `localLightProfileNeutralTransformFor`.
            break;
          }
          if (declaration.resourceDimension === 1) {
            // Buffer<> texel buffers (post-processing) become float data textures
            // read via width-wrapped texelFetch; no samplerBuffer in WebGL2.
            const name = `bt${register}`;
            state.resourceDimensions.set(register, 1);
            state.resourceNames.set(register, name);
            state.declarationLines.push(`uniform highp sampler2D ${name};`);
            state.bindings.push({
              kind: "bufferTexture",
              registerIndex: register,
              name,
              format: "RGBA32F",
              width: this.profile.dataTextureWidth,
              returnTypes: declaration.returnType?.returnTypeNames || null
            });
            break;
          }
          const comparisonSamplers = state.comparisonResources.get(register) || null;
          const samplerType = comparisonSamplers ? SHADOW_SAMPLER_TYPE_BY_DIMENSION[declaration.resourceDimension] : SAMPLER_TYPE_BY_DIMENSION[declaration.resourceDimension];
          if (!samplerType) {
            throw new WebglReadError(comparisonSamplers ? "Comparison sampling is not supported for this resource dimension by the WebGL2 emitter" : "Resource dimension is not supported by the WebGL2 emitter", {
              source: state.sourceName,
              dimensionName: declaration.resourceDimensionName
            });
          }
          if (state.detailMapArrayLayers.has(register)) {
            this._declareDetailArrayMap(state, register, declaration, comparisonSamplers);
            break;
          }
          const name = this.profile.samplerName(register, state.stageName);
          state.resourceDimensions.set(register, declaration.resourceDimension);
          state.resourceNames.set(register, name);
          state.declarationLines.push(`uniform mediump ${samplerType} ${name};`);
          state.bindings.push({
            kind: "resource",
            registerIndex: register,
            name,
            samplerType,
            dimensionName: declaration.resourceDimensionName,
            ...(comparisonSamplers ? {
              comparison: true,
              samplerRegisterIndices: [...comparisonSamplers].sort((a, b) => a - b)
            } : {})
          });
          break;
        }
      case "dcl_resource_structured":
        {
          const register = declaration.registerIndex;
          const strideBytes = declaration.structureStride || 4;
          const strideDwords = Math.max(1, strideBytes >> 2);
          if (state.lightPackedTexture?.indexRegister === register) {
            this._ensureLightPackedTexture(state);
            state.structuredBuffers.set(register, {
              kind: "lightIndexPacked",
              name: state.lightPackedTexture.name,
              strideDwords
            });
            break;
          }
          if (state.lightPackedTexture?.dataRegister === register) {
            this._ensureLightPackedTexture(state);
            state.structuredBuffers.set(register, {
              kind: "lightDataPacked",
              name: state.lightPackedTexture.name,
              strideDwords,
              dataTexelBase: state.lightPackedTexture.dataTexelBase
            });
            break;
          }
          if (state.lightConstantBuffer?.indexRegister === register) {
            this._ensureLightConstantBuffer(state);
            state.structuredBuffers.set(register, {
              kind: "lightIndexCb",
              name: state.lightConstantBuffer.name,
              strideDwords
            });
            break;
          }
          if (state.lightConstantBuffer?.dataRegister === register) {
            this._ensureLightConstantBuffer(state);
            state.structuredBuffers.set(register, {
              kind: "lightDataCb",
              name: state.lightConstantBuffer.name,
              strideDwords
            });
            break;
          }
          if (state.stubbedResources.has(register)) {
            // Stubbed tiled-lighting structured buffer (LightBuffer /
            // LightIndexBuffer): drop the usampler2D declaration + binding;
            // ld_structured reads of it lower to uintBitsToFloat(0u), which
            // zeroes the per-tile light count and makes the light loop dead.
            state.structuredBuffers.set(register, {
              kind: "stub",
              name: `sb${register}`,
              strideDwords
            });
            break;
          }
          if (state.isPixel) {
            // Pixel-stage structured buffers (light lists) become RGBA32UI data
            // textures: exact bits, no SSBO, resolution-scalable tile tables.
            const name = `sb${register}`;
            state.structuredBuffers.set(register, {
              kind: "texture",
              name,
              strideDwords
            });
            state.declarationLines.push(`uniform highp usampler2D ${name};`);
            state.bindings.push({
              kind: "structuredTexture",
              registerIndex: register,
              name,
              strideBytes,
              format: "RGBA32UI",
              width: this.profile.dataTextureWidth
            });
          } else {
            // Vertex-stage structured buffers (BoneTransforms) become dedicated
            // std140 UBOs sized to the profile capacity (Carbon max 69 joints).
            const name = `CjsSb${register}`;
            const capacity = this.profile.vertexStructuredCapacity;
            const rows = capacity * Math.ceil(strideDwords / 4);
            state.structuredBuffers.set(register, {
              kind: "ubo",
              name,
              strideDwords
            });
            state.declarationLines.push(`layout(std140) uniform ${name}Block {`, `    vec4 data[${rows}];`, `} ${name};`);
            state.bindings.push({
              kind: "structuredUbo",
              registerIndex: register,
              name,
              strideBytes,
              capacityElements: capacity
            });
          }
          break;
        }
      case "dcl_input":
        if (state.isCompute) {
          this._declareComputeInput(state, instruction);
        } else {
          this._declareVertexInput(state, instruction);
        }
        break;
      case "dcl_thread_group":
        state.threadGroup = [declaration.threadGroupX, declaration.threadGroupY, declaration.threadGroupZ];
        break;
      case "dcl_unordered_access_view_typed":
        {
          const register = declaration.registerIndex;
          const returnTypes = declaration.returnType?.returnTypeNames || null;
          const plan = state.uavSlicePlan.get(register);
          state.uavReturnTypes.set(register, returnTypes);
          if (plan?.kind === "multiSlice") {
            // Statically distinct texture2darray slices each become their
            // own fragment output; the host attaches the matching array
            // layers as sequential color attachments (slice order) via
            // framebufferTextureLayer.
            const sliceNames = new Map();
            for (const slice of plan.slices) {
              const name = `cjsUav${register}_s${slice}`;
              const location = this._allocateUavOutputLocation(state, register);
              sliceNames.set(slice, name);
              state.declarationLines.push(`layout(location = ${location}) out highp vec4 ${name};`);
              state.bindings.push({
                kind: "uavTexture",
                registerIndex: register,
                name,
                slice,
                location,
                returnTypes
              });
            }
            state.uavSliceNames.set(register, sliceNames);
            break;
          }
          const name = `cjsUav${register}`;
          const location = this._allocateUavOutputLocation(state, register);
          state.uavNames.set(register, name);
          state.declarationLines.push(`layout(location = ${location}) out highp vec4 ${name};`);
          state.bindings.push({
            kind: "uavTexture",
            registerIndex: register,
            name,
            slice: null,
            location,
            returnTypes
          });
          break;
        }
      case "dcl_input_ps":
      case "dcl_input_ps_siv":
      case "dcl_input_ps_sgv":
        this._declarePixelInput(state, instruction);
        break;
      case "dcl_input_sgv":
        this._declareSystemInput(state, instruction);
        break;
      case "dcl_output":
      case "dcl_output_siv":
        this._declareOutput(state, instruction);
        break;
      case "customdata":
        this._declareImmediateConstantBuffer(state, instruction);
        break;
      default:
        throw new WebglReadError("Declaration is not supported by the WebGL2 emitter", {
          source: state.sourceName,
          opcodeName: instruction.opcodeName
        });
    }
  }

  /**
   * Finds the signature element assigned to a register.
   *
   * @param {object|null} signature Decoded DXBC signature.
   * @param {number} registerIndex Register index.
   * @returns {object|null} Matching signature element.
   * @private
   */
  _signatureElement(signature, registerIndex) {
    return signature?.elements.find(element => element.registerIndex === registerIndex) || null;
  }

  /**
   * Declares one vertex input using its Carbon semantic identity.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded input declaration.
   * @private
   */
  _declareVertexInput(state, instruction) {
    const register = instruction.declaration.registerIndex;
    if (state.isPixel) {
      return this._declarePixelInput(state, instruction);
    }
    const element = this._signatureElement(state.isgn, register);
    if (!element) {
      throw new WebglReadError("Vertex input register has no ISGN row", {
        source: state.sourceName,
        register
      });
    }
    if (state.inputNames.has(register)) {
      return;
    }
    const name = `in_${element.semanticName}${element.semanticIndex}`;
    const width = this._maskWidth(element.mask);
    // Integer semantics are float-lowered: ccpwgl binds all attributes with
    // vertexAttribPointer, so uvec/ivec declarations would break linking.
    // Because they're uploaded as plain float VALUES (e.g. bone index 5.0,
    // not the bit pattern of int 5 - confirmed by the legacy skinned VS
    // which does `3.0 * attr.x`), an integer read of one must VALUE-convert
    // (`int(attr)`) rather than bitcast (`floatBitsToInt(attr)`, which would
    // yield garbage). Record integer-typed inputs so the formatter knows.
    if (element.componentTypeName === "uint32" || element.componentTypeName === "int32") {
      state.integerVertexInputs.set(register, element.componentTypeName === "uint32" ? "uint" : "int");
    }
    state.inputNames.set(register, name);
    state.inputMasks.set(register, this._maskChars(element.mask));
    state.declarationLines.push(`in highp ${this._vecType(width)} ${name};`);
    state.inputs.push({
      register,
      name,
      semanticName: element.semanticName,
      semanticIndex: element.semanticIndex,
      componentTypeName: element.componentTypeName,
      mask: element.mask
    });
  }

  /**
   * Declares one pixel-stage varying or system input.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded input declaration.
   * @private
   */
  _declarePixelInput(state, instruction) {
    const register = instruction.declaration.registerIndex;
    const declaration = instruction.declaration;
    if (instruction.opcodeName === "dcl_input_ps_siv" && declaration.systemValueName === "position") {
      state.inputNames.set(register, "hlslcc_FragCoord");
      state.earlyMainLines.push("vec4 hlslcc_FragCoord = vec4(gl_FragCoord.xyz, 1.0/gl_FragCoord.w);");
      return;
    }
    if (instruction.opcodeName === "dcl_input_ps_sgv" || instruction.opcodeName === "dcl_input_sgv") {
      return this._declareSystemInput(state, instruction);
    }
    if (state.inputNames.has(register)) {
      return;
    }
    const element = this._signatureElement(state.isgn, register);
    if (!element) {
      throw new WebglReadError("Pixel input register has no ISGN row", {
        source: state.sourceName,
        register
      });
    }
    // Varyings are internal VS<->PS wires: named by register and always vec4,
    // so packed registers (two semantics sharing one register) and partial
    // reads can never produce cross-stage name/type mismatches.
    const name = `vs_r${register}`;
    const flat = element.componentType === 1 || element.componentType === 2 || declaration.interpolationModeName === "constant";
    state.inputNames.set(register, name);
    state.declarationLines.push(`${flat ? "flat " : ""}in vec4 ${name};`);
    state.inputs.push({
      register,
      name,
      semanticName: element.semanticName,
      semanticIndex: element.semanticIndex,
      componentTypeName: element.componentTypeName,
      mask: element.mask
    });
  }

  /**
   * Maps a supported system-generated input to its GLSL expression.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded system-input declaration.
   * @private
   */
  _declareSystemInput(state, instruction) {
    const declaration = instruction.declaration;
    const register = declaration.registerIndex;
    switch (declaration.systemValueName) {
      case "is_front_face":
        state.inputNames.set(register, "vec4(uintBitsToFloat(gl_FrontFacing ? 0xffffffffu : 0u))");
        break;
      case "vertex_id":
        state.inputNames.set(register, "vec4(intBitsToFloat(gl_VertexID))");
        break;
      case "instance_id":
        state.inputNames.set(register, "vec4(intBitsToFloat(gl_InstanceID))");
        break;
      default:
        throw new WebglReadError("System-generated input is not supported by the WebGL2 emitter", {
          source: state.sourceName,
          systemValueName: declaration.systemValueName
        });
    }
  }

  /**
  * Records which compute pseudo-input(s) a `dcl_input` declaration exposes.
  * The actual GLSL (uniform + derived locals) is emitted once, after every
  * declaration has been seen, by `_emitComputeInputPrelude` — `dcl_input`
  * for a thread-id kind can appear before or after `dcl_thread_group` in the
  * bytecode stream, and the flattened/group-id forms need the workgroup
  * size regardless of declaration order.
  *
  * @param {object} state Emit state.
  * @param {object} instruction `dcl_input` instruction with a thread-id-kind operand.
  */
  _declareComputeInput(state, instruction) {
    const kind = instruction.declaration.operandTypeName;
    switch (kind) {
      case "input_thread_id":
        state.computeInputsUsed.threadId = true;
        break;
      case "input_thread_group_id":
        state.computeInputsUsed.groupId = true;
        break;
      case "input_thread_id_in_group":
        state.computeInputsUsed.tig = true;
        break;
      case "input_thread_id_in_group_flattened":
        state.computeInputsUsed.flattened = true;
        break;
      default:
        throw new WebglReadError("Compute input is not supported by the WebGL2 emitter", {
          source: state.sourceName,
          operandTypeName: kind
        });
    }
  }

  /**
  * Emits the shared `gl_FragCoord`-derived thread-id prelude for map-style
  * compute shaders: a `cjsDispatchOrigin` uniform (so a dispatch can be
  * tiled across more than one draw/viewport), then only the intermediate
  * and final locals this shader actually declared inputs for.
  *
  * @param {object} state Emit state.
  */
  _emitComputeInputPrelude(state) {
    const used = state.computeInputsUsed;
    if (!used.threadId && !used.groupId && !used.tig && !used.flattened) {
      return;
    }
    state.dispatchOriginUniform = "cjsDispatchOrigin";
    state.declarationLines.push("uniform ivec3 cjsDispatchOrigin;");
    state.bindings.push({
      kind: "dispatchUniform",
      name: "cjsDispatchOrigin"
    });
    state.earlyMainLines.push("ivec3 cjsThreadId = ivec3(ivec2(gl_FragCoord.xy), 0) + cjsDispatchOrigin;");
    if (used.threadId) {
      state.earlyMainLines.push("vec4 vThreadID = intBitsToFloat(ivec4(cjsThreadId, 0));");
    }
    if (used.groupId || used.tig || used.flattened) {
      const [nx, ny, nz] = this._threadGroupSizeOrThrow(state);
      state.earlyMainLines.push(`ivec3 cjsGroupId = cjsThreadId / ivec3(${nx}, ${ny}, ${nz});`);
      if (used.groupId) {
        state.earlyMainLines.push("vec4 vThreadGroupID = intBitsToFloat(ivec4(cjsGroupId, 0));");
      }
      if (used.tig || used.flattened) {
        state.earlyMainLines.push(`ivec3 cjsTig = cjsThreadId - cjsGroupId * ivec3(${nx}, ${ny}, ${nz});`);
        if (used.tig) {
          state.earlyMainLines.push("vec4 vThreadIDInGroup = intBitsToFloat(ivec4(cjsTig, 0));");
        }
        if (used.flattened) {
          state.earlyMainLines.push(`vec4 vThreadIDInGroupFlattened = intBitsToFloat(ivec4(cjsTig.z*${nx}*${ny} + cjsTig.y*${nx} + cjsTig.x, 0, 0, 0));`);
        }
      }
    }
  }

  /**
  * Reads the workgroup size recorded by `dcl_thread_group`, required to
  * split the flat thread id back into group id / id-in-group components.
  *
  * @param {object} state Emit state.
  * @returns {[number,number,number]} Workgroup size.
  */
  _threadGroupSizeOrThrow(state) {
    if (!Array.isArray(state.threadGroup)) {
      throw new WebglReadError("Compute shader reads a thread-group-relative input with no dcl_thread_group", {
        source: state.sourceName
      });
    }
    return state.threadGroup;
  }

  /**
   * Declares one stage output and records its backend identity.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded output declaration.
   * @private
   */
  _declareOutput(state, instruction) {
    const declaration = instruction.declaration;
    const register = declaration.registerIndex;
    if (instruction.opcodeName === "dcl_output_siv") {
      if (declaration.systemValueName === "position") {
        state.outputNames.set(register, "gl_Position");
        state.outputs.push({
          register,
          name: "gl_Position",
          semanticName: "SV_Position",
          semanticIndex: 0
        });
        return;
      }
      throw new WebglReadError("Output system value is not supported by the WebGL2 emitter", {
        source: state.sourceName,
        systemValueName: declaration.systemValueName
      });
    }
    if (state.outputNames.has(register)) {
      return;
    }
    const element = this._signatureElement(state.osgn, register);
    if (!element) {
      throw new WebglReadError("Output register has no OSGN row", {
        source: state.sourceName,
        register
      });
    }
    const width = this._maskWidth(element.mask);
    if (state.isPixel) {
      const name = `${element.semanticName}${element.semanticIndex}`;
      state.outputNames.set(register, name);
      state.outputMasks.set(register, this._maskChars(element.mask));
      state.declarationLines.push(`layout(location = ${element.semanticIndex}) out ${this._vecType(width)} ${name};`);
      state.outputs.push({
        register,
        name,
        width,
        semanticName: element.semanticName,
        semanticIndex: element.semanticIndex
      });
    } else {
      const name = `vs_r${register}`;
      state.outputNames.set(register, name);
      state.declarationLines.push(`out vec4 ${name};`);
      state.outputs.push({
        register,
        name,
        width: 4,
        semanticName: element.semanticName,
        semanticIndex: element.semanticIndex
      });
    }
  }

  /**
   * Materializes an immediate constant-buffer declaration.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded custom-data declaration.
   * @private
   */
  _declareImmediateConstantBuffer(state, instruction) {
    const rows = instruction.customData?.immediateConstantBuffer;
    if (!rows) {
      return;
    }
    const literals = rows.map(row => `vec4(${row.map(value => `uintBitsToFloat(0x${(value.uint32 >>> 0).toString(16)}u)`).join(", ")})`);
    state.declarationLines.push(`const vec4 ${state.icbName}[${rows.length}] = vec4[${rows.length}](`, ...literals.map((literal, index) => `    ${literal}${index < literals.length - 1 ? "," : ""}`), ");");
  }

  /**
   * Initializes paired vertex outputs that the source shader does not write.
   *
   * @param {object} state Mutable emission state.
   * @private
   */
  _zeroFillUnwrittenOutputs(state) {
    const written = new Set();
    for (const instruction of state.decoder.instructions) {
      if (instruction.isDeclaration) continue;
      for (const operand of instruction.operands) {
        if (operand.type === 2 && operand.registerIndex !== null) {
          written.add(operand.registerIndex);
        }
      }
    }
    for (const [register, name] of state.outputNames) {
      if (!written.has(register) && name !== "gl_Position") {
        const width = state.outputs.find(output => output.register === register)?.width || 4;
        state.earlyMainLines.push(`${name} = ${this._vecType(width)}(0.0);`);
        state.warnings.push(`output ${name} is declared but never written; zero-filled`);
      }
    }
  }

  // ------------------------------------------------------------------
  // Instructions
  // ------------------------------------------------------------------

  /**
   * Dispatches one decoded instruction to its GLSL lowering rule.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @private
   */
  _emitInstruction(state, instruction) {
    const lower = DxbcGlslEmitter.LOWERINGS[instruction.opcodeName];
    if (!lower) {
      throw new WebglReadError("No GLSL lowering for opcode", {
        source: state.sourceName,
        opcodeName: instruction.opcodeName,
        offset: instruction.offset
      });
    }
    lower.call(this, state, instruction);
  }

  /**
   * Appends one correctly indented line to the emitted function body.
   *
   * @param {object} state Mutable emission state.
   * @param {string} text GLSL source line.
   * @private
   */
  _line(state, text) {
    state.bodyLines.push(`${"    ".repeat(state.indent)}${text}`);
  }

  /**
   * Counts the active components in a DXBC mask.
   *
   * @param {number} mask DXBC component bit mask.
   * @returns {number} Active component count.
   * @private
   */
  _maskWidth(mask) {
    let width = 0;
    for (let bit = 0; bit < 4; bit += 1) {
      if (mask & 1 << bit) width += 1;
    }
    return width || 4;
  }

  /**
   * Converts a DXBC component bit mask to GLSL swizzle characters.
   *
   * @param {number} mask DXBC component bit mask.
   * @returns {string} GLSL component string.
   * @private
   */
  _maskChars(mask) {
    return COMPONENTS.filter((_, bit) => mask & 1 << bit).join("") || "xyzw";
  }

  /**
  * Builds the lvalue text for one register-space destination component,
  * remapped into the target variable's declared component space.
  */
  _destComponentRef(state, destOperand, target, component) {
    const remapped = state.formatter.remapComponents(destOperand, component);
    return `${target.ref}${remapped ? `.${remapped}` : ""}`;
  }

  /**
   * Formats a resolved destination reference and optional mask.
   *
   * @param {object} target Resolved destination.
   * @returns {string} GLSL lvalue text.
   * @private
   */
  _destText(target) {
    return `${target.ref}${target.mask ? `.${target.mask}` : ""}`;
  }

  /**
   * Selects the GLSL floating scalar or vector type for a width.
   *
   * @param {number} width Component width.
   * @returns {string} GLSL type name.
   * @private
   */
  _vecType(width) {
    return width === 1 ? "float" : `vec${width}`;
  }

  /**
  * Reads a source at the destination mask's width, wrapping in a matching
  * constructor so intrinsic arguments always type-check exactly.
  */
  _vecArg(state, operand, destMask, as = "float") {
    const expression = state.formatter.sourceExpression(operand, {
      destMask,
      as
    });
    if (destMask.length === 1) {
      return expression;
    }
    const ctor = {
      float: "vec",
      int: "ivec",
      uint: "uvec"
    }[as] + destMask.length;
    return `${ctor}(${expression})`;
  }

  /**
   * Resolves a destination operand and its register-space component mask.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @param {number} [operandIndex=0] Destination operand index.
   * @returns {{target: object|null, mask: string}} Destination and mask.
   * @private
   */
  _destMask(state, instruction, operandIndex = 0) {
    const target = state.formatter.destination(instruction.operands[operandIndex]);
    // `mask` stays in register space: source-swizzle pairing is positional
    // against the register components; `target.mask` carries the declared-space
    // display form used for lvalue text.
    return {
      target,
      mask: target?.registerMask || "xyzw"
    };
  }

  /**
   * Tests whether an operand produces one scalar component.
   *
   * @param {object} operand Decoded DXBC operand.
   * @returns {boolean} True when the source is scalar.
   * @private
   */
  _isScalarSource(operand) {
    return operand.selectionModeName === "select1" || operand.type === 4 && operand.componentCount === 1 || operand.componentCount === 1;
  }

  /**
   * Emits an assignment and applies instruction saturation when required.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @param {string} valueExpression GLSL right-hand expression.
   * @param {object} [options={}] Assignment formatting options.
   * @private
   */
  _assign(state, instruction, valueExpression, options = {}) {
    const statement = state.formatter.assignment(instruction.operands[0], valueExpression, options);
    if (statement) {
      this._line(state, statement);
      if (options.saturate === undefined && instruction.saturate) {
        const {
          target
        } = this._destMask(state, instruction);
        const text = this._destText(target);
        this._line(state, `${text} = clamp(${text}, 0.0, 1.0);`);
      }
    }
  }

  /**
   * Emits a width-correct floating binary infix operation.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @param {string} operator GLSL infix operator.
   * @private
   */
  _infixBinary(state, instruction, operator) {
    const {
      mask
    } = this._destMask(state, instruction);
    const a = state.formatter.sourceExpression(instruction.operands[1], {
      destMask: mask
    });
    const b = state.formatter.sourceExpression(instruction.operands[2], {
      destMask: mask
    });
    const width = Math.max(state.formatter.expressionWidth(instruction.operands[1], mask), state.formatter.expressionWidth(instruction.operands[2], mask));
    this._assignWidened(state, instruction, mask, `${a} ${operator} ${b}`, width === 1);
  }

  /**
   * Widens a scalar result when assigning it to a vector destination.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @param {string} mask Destination component mask.
   * @param {string} expression GLSL expression.
   * @param {boolean} rhsIsScalar Whether the expression is scalar.
   * @private
   */
  _assignWidened(state, instruction, mask, expression, rhsIsScalar) {
    const value = rhsIsScalar && mask.length > 1 ? `vec${mask.length}(${expression})` : expression;
    this._assign(state, instruction, value, {
      saturate: instruction.saturate
    });
  }

  /**
   * Emits a unary GLSL intrinsic with destination-width handling.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @param {string} glslName GLSL intrinsic name.
   * @private
   */
  _helperUnary(state, instruction, glslName) {
    const {
      mask
    } = this._destMask(state, instruction);
    const src = state.formatter.sourceExpression(instruction.operands[1], {
      destMask: mask
    });
    this._assignWidened(state, instruction, mask, `${glslName}(${src})`, state.formatter.expressionWidth(instruction.operands[1], mask) === 1);
  }

  /**
   * Emits a binary GLSL intrinsic with width-matched arguments.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @param {string} glslName GLSL intrinsic name.
   * @private
   */
  _helperBinary(state, instruction, glslName) {
    const {
      mask
    } = this._destMask(state, instruction);
    const a = this._vecArg(state, instruction.operands[1], mask);
    const b = this._vecArg(state, instruction.operands[2], mask);
    this._assign(state, instruction, `${glslName}(${a}, ${b})`, {
      saturate: instruction.saturate
    });
  }

  /**
   * Emits a dot product and replicates its scalar result when necessary.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @param {string} sourceMask Source component mask.
   * @private
   */
  _dotProduct(state, instruction, sourceMask) {
    const {
      mask
    } = this._destMask(state, instruction);
    const a = this._vecArg(state, instruction.operands[1], sourceMask);
    const b = this._vecArg(state, instruction.operands[2], sourceMask);
    const dot = `dot(${a}, ${b})`;
    this._assign(state, instruction, mask.length > 1 ? `vec${mask.length}(${dot})` : dot, {
      saturate: instruction.saturate
    });
  }

  /**
   * Emits scalar or vector comparison bits in the float register model.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @param {object} options Comparison options.
   * @param {string} options.intrinsic GLSL vector comparison intrinsic.
   * @param {string} options.operator GLSL scalar comparison operator.
   * @param {"float"|"int"|"uint"} options.as Operand interpretation.
   * @private
   */
  _comparison(state, instruction, {
    intrinsic,
    operator,
    as
  }) {
    const {
      mask
    } = this._destMask(state, instruction);
    if (mask.length === 1) {
      const a = state.formatter.sourceExpression(instruction.operands[1], {
        destMask: mask,
        as
      });
      const b = state.formatter.sourceExpression(instruction.operands[2], {
        destMask: mask,
        as
      });
      this._assign(state, instruction, `uintBitsToFloat((${a} ${operator} ${b}) ? 0xFFFFFFFFu : 0u)`);
      return;
    }
    const a = this._vecArg(state, instruction.operands[1], mask, as);
    const b = this._vecArg(state, instruction.operands[2], mask, as);
    this._assign(state, instruction, `uintBitsToFloat(uvec${mask.length}(${intrinsic}(${a}, ${b})) * 0xFFFFFFFFu)`);
  }

  /**
   * Emits an unsigned bitwise operation through register bitcasts.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @param {string} operator GLSL bitwise operator.
   * @private
   */
  _bitwiseBinary(state, instruction, operator) {
    const {
      mask
    } = this._destMask(state, instruction);
    const a = this._vecArg(state, instruction.operands[1], mask, "uint");
    const b = this._vecArg(state, instruction.operands[2], mask, "uint");
    this._assign(state, instruction, `uintBitsToFloat(${a} ${operator} ${b})`);
  }

  /**
   * Emits a signed or unsigned integer binary operation through bitcasts.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @param {string} operator GLSL integer operator.
   * @param {"int"|"uint"} [as="int"] Integer interpretation.
   * @private
   */
  _intBinary(state, instruction, operator, as = "int") {
    const {
      mask
    } = this._destMask(state, instruction);
    const a = this._vecArg(state, instruction.operands[1], mask, as);
    const b = this._vecArg(state, instruction.operands[2], mask, as);
    const wrap = as === "uint" ? "uintBitsToFloat" : "intBitsToFloat";
    this._assign(state, instruction, `${wrap}(${a} ${operator} ${b})`);
  }

  /**
   * Formats the DXBC zero or nonzero control-flow condition.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @returns {string} GLSL boolean expression.
   * @private
   */
  _condition(state, instruction) {
    const scalar = state.formatter.sourceExpression(instruction.operands[0], {
      destMask: "x"
    });
    const test = instruction.testBoolean === "nonzero" ? "!=" : "==";
    return `floatBitsToUint(${scalar}) ${test} 0u`;
  }

  /**
   * Emits component-wise conditional moves without aliasing destinations.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @private
   */
  _movc(state, instruction) {
    const destOperand = instruction.operands[0];
    const {
      target,
      mask
    } = this._destMask(state, instruction);
    if (!target) return;
    const aliases = instruction.operands.slice(1).some(operand => operand.type === destOperand.type && operand.registerIndex === destOperand.registerIndex);
    if (aliases) {
      this._line(state, "{");
      state.indent += 1;
      this._line(state, `vec4 hlslcc_movcTemp = ${target.ref};`);
    }
    for (const component of mask) {
      const condition = state.formatter.sourceExpression(instruction.operands[1], {
        destMask: component,
        as: "int"
      });
      const ifTrue = state.formatter.sourceExpression(instruction.operands[2], {
        destMask: component
      });
      const ifFalse = state.formatter.sourceExpression(instruction.operands[3], {
        destMask: component
      });
      const lvalue = aliases ? `hlslcc_movcTemp.${component}` : this._destComponentRef(state, destOperand, target, component);
      this._line(state, `${lvalue} = (${condition} != 0) ? ${ifTrue} : ${ifFalse};`);
    }
    if (aliases) {
      this._line(state, `${target.ref} = hlslcc_movcTemp;`);
      state.indent -= 1;
      this._line(state, "}");
    }
    if (instruction.saturate) {
      const text = this._destText(target);
      this._line(state, `${text} = clamp(${text}, 0.0, 1.0);`);
    }
  }

  /**
   * Emits the paired sine and cosine destinations in alias-safe order.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @private
   */
  _sincos(state, instruction) {
    const [sinDest, cosDest, angle] = instruction.operands;
    const emitOne = (destOperand, fn) => {
      if (destOperand.type === 13) return;
      const target = state.formatter.destination(destOperand);
      const mask = target.registerMask || "xyzw";
      const src = state.formatter.sourceExpression(angle, {
        destMask: mask
      });
      const call = state.formatter.expressionWidth(angle, mask) === 1 && mask.length > 1 ? `vec${mask.length}(${fn}(${src}))` : `${fn}(${src})`;
      const text = this._destText(target);
      this._line(state, `${text} = ${call};`);
      if (instruction.saturate) {
        this._line(state, `${text} = clamp(${text}, 0.0, 1.0);`);
      }
    };
    const sinAliasesAngle = sinDest.type === angle.type && sinDest.registerIndex === angle.registerIndex;
    if (sinAliasesAngle) {
      emitOne(cosDest, "cos");
      emitOne(sinDest, "sin");
    } else {
      emitOne(sinDest, "sin");
      emitOne(cosDest, "cos");
    }
  }

  /**
   * Declares the merged detail-map array, once, on the first member seen.
   *
   * Each member keeps its own entry in `resourceNames` pointing at the shared
   * array, so every existing reference site resolves to it without knowing a
   * merge happened. The declared dimension deliberately stays 2D: the layer is
   * appended to the coordinate at each sample site rather than read out of the
   * shader's own operand, which has no third component to give.
   *
   * @param {object} state Mutable emission state.
   * @param {number} register Resource register being declared.
   * @param {object} declaration Decoded resource declaration.
   * @param {Set<number>|null} comparisonSamplers Comparison samplers, when any.
   * @private
   */
  _declareDetailArrayMap(state, register, declaration, comparisonSamplers) {
    // A comparison-sampled or non-2D detail map is not the family the
    // recogniser promised, so refuse rather than emit a wrong declaration.
    if (comparisonSamplers || declaration.resourceDimension !== 3) {
      throw new WebglReadError("Detail-map array merging requires plain 2D textures without comparison sampling", {
        source: state.sourceName,
        register,
        dimensionName: declaration.resourceDimensionName
      });
    }
    state.resourceDimensions.set(register, declaration.resourceDimension);
    state.resourceNames.set(register, DETAIL_MAP_ARRAY_SYMBOL);
    if (state.detailMapArrayDeclared) return;
    state.detailMapArrayDeclared = true;
    state.declarationLines.push(`uniform mediump sampler2DArray ${DETAIL_MAP_ARRAY_SYMBOL};`);
    state.bindings.push({
      kind: "resource",
      registerIndex: register,
      name: DETAIL_MAP_ARRAY_SYMBOL,
      samplerType: "sampler2DArray",
      dimensionName: "texture2darray",
      arrayLayerCount: state.detailMapArrayLayers.size,
      mergedFrom: [...state.detailMapArrayLayers.keys()]
    });
  }

  /**
   * Returns the array layer a texture operand maps to, when it was merged.
   *
   * @param {object} state Mutable emission state.
   * @param {object} texOperand Texture resource operand.
   * @returns {number|null} Layer index, or null when the register was not merged.
   * @private
   */
  _detailMapArrayLayer(state, texOperand) {
    const layer = state.detailMapArrayLayers.get(texOperand.registerIndex);
    return layer === undefined ? null : layer;
  }

  /**
   * Refuses an operation that cannot be redirected at an array layer.
   *
   * Recognising the detail family proves the resources are mergeable; it does
   * not prove every *use* is. A texel fetch or a size query against a merged
   * register would silently mean something different once the register became
   * one layer of an array, so those fail the build instead.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @param {object} texOperand Texture resource operand.
   * @private
   */
  _rejectDetailArrayMapUse(state, instruction, texOperand) {
    if (!state.detailMapArrayLayers.has(texOperand.registerIndex)) return;
    throw new WebglReadError(`Detail map merged into an array is used by ${instruction.opcodeName}, ` + "which this emitter cannot redirect at an array layer", {
      source: state.sourceName,
      register: texOperand.registerIndex,
      opcodeName: instruction.opcodeName
    });
  }

  /**
   * Resolves and validates the declared dimension of a texture operand.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC instruction.
   * @param {object} texOperand Texture resource operand.
   * @returns {number} DXBC resource-dimension code.
   * @private
   */
  _resourceDimension(state, instruction, texOperand) {
    const dimension = state.resourceDimensions.get(texOperand.registerIndex);
    if (!dimension) {
      throw new WebglReadError("Texture instruction references an undeclared resource", {
        source: state.sourceName,
        register: texOperand.registerIndex,
        opcodeName: instruction.opcodeName
      });
    }
    return dimension;
  }

  /**
   * Emits a regular, LOD, bias, gradient, or comparison texture sample.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC texture instruction.
   * @param {object} [options={}] Sampling-mode operand indexes.
   * @param {number|null} [options.lodOperandIndex=null] Explicit LOD operand.
   * @param {number|null} [options.biasOperandIndex=null] LOD bias operand.
   * @param {number[]|null} [options.gradOperandIndexes=null] Gradient operands.
   * @param {number|null} [options.comparisonRefOperandIndex=null] Comparison reference operand.
   * @param {boolean} [options.forceLodZero=false] Whether to force the LOD-zero adaptation.
   * @private
   */
  _textureSample(state, instruction, {
    lodOperandIndex = null,
    biasOperandIndex = null,
    gradOperandIndexes = null,
    comparisonRefOperandIndex = null,
    forceLodZero = false
  } = {}) {
    const {
      mask
    } = this._destMask(state, instruction);
    const coordOperand = instruction.operands[1];
    const texOperand = instruction.operands[2];
    if (state.lightPackedTexture?.profileRegister === texOperand.registerIndex) {
      const oneSwizzle = [...mask].map(component => texOperand.swizzle ? texOperand.swizzle["xyzw".indexOf(component)] : component).join("");
      this._assign(state, instruction, `vec4(1.0).${oneSwizzle}`, {
        saturate: instruction.saturate
      });
      return;
    }
    if (state.lightConstantBuffer?.profileRegister === texOperand.registerIndex) {
      // The constant-buffer local-light path carries the light rows but
      // not the texture profile array. Treat profile lookups as neutral
      // attenuation so profile-enabled lights degrade to unprofiled lights
      // instead of costing another sampler unit.
      const oneSwizzle = [...mask].map(component => texOperand.swizzle ? texOperand.swizzle["xyzw".indexOf(component)] : component).join("");
      this._assign(state, instruction, `vec4(1.0).${oneSwizzle}`, {
        saturate: instruction.saturate
      });
      return;
    }
    if (state.stubbedResources.has(texOperand.registerIndex)) {
      // Stubbed tiled-lighting sampler (LightProfileArray): its declaration
      // was dropped, so lower the sample to a compile-time zero of the
      // destination width instead of referencing the missing sampler.
      const zeroSwizzle = [...mask].map(component => texOperand.swizzle ? texOperand.swizzle["xyzw".indexOf(component)] : component).join("");
      this._assign(state, instruction, `vec4(0.0).${zeroSwizzle}`, {
        saturate: instruction.saturate
      });
      return;
    }
    if (state.neutralResources.has(texOperand.registerIndex)) {
      // Neutralised sampler (LightProfileArray): its declaration was
      // dropped, and the value it fed is a multiplier, so lower to one.
      // The shader's own no-profile path leaves attenuation untouched,
      // which is what multiplying by 1.0 reproduces exactly.
      const oneSwizzle = [...mask].map(component => texOperand.swizzle ? texOperand.swizzle["xyzw".indexOf(component)] : component).join("");
      this._assign(state, instruction, `vec4(1.0).${oneSwizzle}`, {
        saturate: instruction.saturate
      });
      return;
    }
    const dimension = this._resourceDimension(state, instruction, texOperand);
    const coordMask = COORD_MASK_BY_DIMENSION[dimension];
    const detailLayer = this._detailMapArrayLayer(state, texOperand);
    const baseCoord = this._vecArg(state, coordOperand, coordMask);
    // A merged detail map keeps its 2D coordinate and gains the layer as a
    // literal third component; the register it came from is the layer.
    const coord = detailLayer === null ? baseCoord : `vec3(${baseCoord}, ${detailLayer}.0)`;
    const texName = state.formatter.registerReference(texOperand);
    const returnSwizzle = [...mask].map(component => texOperand.swizzle ? texOperand.swizzle["xyzw".indexOf(component)] : component).join("");
    if (comparisonRefOperandIndex !== null) {
      const reference = state.formatter.sourceExpression(instruction.operands[comparisonRefOperandIndex], {
        destMask: "x"
      });
      const comparisonCoord = `vec${coordMask.length + 1}(${coord}, ${reference})`;
      let comparisonCall;
      if (!forceLodZero) {
        comparisonCall = `texture(${texName}, ${comparisonCoord})`;
      } else if (dimension === 3) {
        comparisonCall = `textureLod(${texName}, ${comparisonCoord}, 0.0)`;
      } else if (dimension === 6) {
        comparisonCall = `textureGrad(${texName}, ${comparisonCoord}, vec3(0.0), vec3(0.0))`;
      } else if (dimension === 8) {
        comparisonCall = `textureGrad(${texName}, ${comparisonCoord}, vec2(0.0), vec2(0.0))`;
      } else {
        throw new WebglReadError("Comparison LOD-zero sampling is not supported for this resource dimension", {
          source: state.sourceName,
          opcodeName: instruction.opcodeName,
          dimension
        });
      }
      const value = mask.length === 1 ? comparisonCall : `vec${mask.length}(${comparisonCall})`;
      this._assign(state, instruction, value, {
        saturate: instruction.saturate
      });
      return;
    }
    let call;
    if (gradOperandIndexes !== null) {
      const gradMask = coordMask === "xyzw" ? "xyz" : coordMask;
      const gradX = this._vecArg(state, instruction.operands[gradOperandIndexes[0]], gradMask);
      const gradY = this._vecArg(state, instruction.operands[gradOperandIndexes[1]], gradMask);
      call = `textureGrad(${texName}, ${coord}, ${gradX}, ${gradY})`;
    } else if (lodOperandIndex !== null) {
      const lod = state.formatter.sourceExpression(instruction.operands[lodOperandIndex], {
        destMask: "x"
      });
      call = `textureLod(${texName}, ${coord}, ${lod})`;
    } else if (biasOperandIndex !== null) {
      const bias = state.formatter.sourceExpression(instruction.operands[biasOperandIndex], {
        destMask: "x"
      });
      call = `texture(${texName}, ${coord}, ${bias})`;
    } else {
      call = `texture(${texName}, ${coord})`;
    }
    call = this._applyEmulatedAddressing(state, instruction, call, coord, coordMask);
    this._assign(state, instruction, `${call}.${returnSwizzle}`, {
      saturate: instruction.saturate
    });
  }

  /**
   * Emits an integer-coordinate texel fetch for a declared resource.
   *
   * @param {object} state Mutable emission state.
   * @param {object} instruction Decoded DXBC load instruction.
   * @private
   */
  _texelFetch(state, instruction) {
    const {
      mask
    } = this._destMask(state, instruction);
    const coordOperand = instruction.operands[1];
    const texOperand = instruction.operands[2];
    this._rejectDetailArrayMapUse(state, instruction, texOperand);
    const dimension = this._resourceDimension(state, instruction, texOperand);
    const texName = state.formatter.registerReference(texOperand);
    const returnSwizzle = [...mask].map(component => texOperand.swizzle ? texOperand.swizzle["xyzw".indexOf(component)] : component).join("");
    let call;
    if (dimension === 1) {
      const index = state.formatter.sourceExpression(coordOperand, {
        destMask: "x",
        as: "int"
      });
      const widthMask = this.profile.dataTextureWidth - 1;
      const widthShift = Math.log2(this.profile.dataTextureWidth);
      call = `texelFetch(${texName}, ivec2((${index}) & ${widthMask}, (${index}) >> ${widthShift}), 0)`;
    } else {
      const coordMask = dimension === 5 || dimension === 8 ? "xyz" : "xy";
      const coord = this._vecArg(state, coordOperand, coordMask, "int");
      const mip = state.formatter.sourceExpression(coordOperand, {
        destMask: "w",
        as: "int"
      });
      call = `texelFetch(${texName}, ${coord}, ${mip})`;
    }
    this._assign(state, instruction, `${call}.${returnSwizzle}`, {
      saturate: instruction.saturate
    });
  }
}

/**
 * Per-opcode lowering table. Every rule cites its family spec in
 * `docs/dxbc-lowering/`; templates are HLSLcc-derived, see each doc.
 */
DxbcGlslEmitter.LOWERINGS = {
  // --- float-alu ---
  mov(state, instruction) {
    const {
      mask
    } = this._destMask(state, instruction);
    const src = state.formatter.sourceExpression(instruction.operands[1], {
      destMask: mask
    });
    this._assignWidened(state, instruction, mask, src, state.formatter.expressionWidth(instruction.operands[1], mask) === 1);
  },
  mad(state, instruction) {
    const {
      mask
    } = this._destMask(state, instruction);
    const a = state.formatter.sourceExpression(instruction.operands[1], {
      destMask: mask
    });
    const b = state.formatter.sourceExpression(instruction.operands[2], {
      destMask: mask
    });
    const c = state.formatter.sourceExpression(instruction.operands[3], {
      destMask: mask
    });
    const width = Math.max(...[1, 2, 3].map(index => state.formatter.expressionWidth(instruction.operands[index], mask)));
    this._assignWidened(state, instruction, mask, `${a} * ${b} + ${c}`, width === 1);
  },
  mul(state, instruction) {
    this._infixBinary(state, instruction, "*");
  },
  add(state, instruction) {
    this._infixBinary(state, instruction, "+");
  },
  div(state, instruction) {
    this._infixBinary(state, instruction, "/");
  },
  dp2(state, instruction) {
    this._dotProduct(state, instruction, "xy");
  },
  dp3(state, instruction) {
    this._dotProduct(state, instruction, "xyz");
  },
  dp4(state, instruction) {
    this._dotProduct(state, instruction, "xyzw");
  },
  max(state, instruction) {
    this._helperBinary(state, instruction, "max");
  },
  min(state, instruction) {
    this._helperBinary(state, instruction, "min");
  },
  sqrt(state, instruction) {
    this._helperUnary(state, instruction, "sqrt");
  },
  rsq(state, instruction) {
    this._helperUnary(state, instruction, "inversesqrt");
  },
  exp(state, instruction) {
    this._helperUnary(state, instruction, "exp2");
  },
  log(state, instruction) {
    this._helperUnary(state, instruction, "log2");
  },
  frc(state, instruction) {
    this._helperUnary(state, instruction, "fract");
  },
  round_ne(state, instruction) {
    this._helperUnary(state, instruction, "roundEven");
  },
  round_ni(state, instruction) {
    this._helperUnary(state, instruction, "floor");
  },
  round_pi(state, instruction) {
    this._helperUnary(state, instruction, "ceil");
  },
  round_z(state, instruction) {
    this._helperUnary(state, instruction, "trunc");
  },
  rcp(state, instruction) {
    const {
      mask
    } = this._destMask(state, instruction);
    const src = this._vecArg(state, instruction.operands[1], mask);
    const one = mask.length > 1 ? `vec${mask.length}(1.0)` : "1.0";
    this._assign(state, instruction, `${one} / ${src}`, {
      saturate: instruction.saturate
    });
  },
  sincos(state, instruction) {
    this._sincos(state, instruction);
  },
  // --- cmp-controlflow ---
  lt(state, instruction) {
    this._comparison(state, instruction, {
      intrinsic: "lessThan",
      operator: "<",
      as: "float"
    });
  },
  ge(state, instruction) {
    this._comparison(state, instruction, {
      intrinsic: "greaterThanEqual",
      operator: ">=",
      as: "float"
    });
  },
  eq(state, instruction) {
    this._comparison(state, instruction, {
      intrinsic: "equal",
      operator: "==",
      as: "float"
    });
  },
  ne(state, instruction) {
    this._comparison(state, instruction, {
      intrinsic: "notEqual",
      operator: "!=",
      as: "float"
    });
  },
  ilt(state, instruction) {
    this._comparison(state, instruction, {
      intrinsic: "lessThan",
      operator: "<",
      as: "int"
    });
  },
  ige(state, instruction) {
    this._comparison(state, instruction, {
      intrinsic: "greaterThanEqual",
      operator: ">=",
      as: "int"
    });
  },
  ieq(state, instruction) {
    this._comparison(state, instruction, {
      intrinsic: "equal",
      operator: "==",
      as: "int"
    });
  },
  ine(state, instruction) {
    this._comparison(state, instruction, {
      intrinsic: "notEqual",
      operator: "!=",
      as: "int"
    });
  },
  ult(state, instruction) {
    this._comparison(state, instruction, {
      intrinsic: "lessThan",
      operator: "<",
      as: "uint"
    });
  },
  uge(state, instruction) {
    this._comparison(state, instruction, {
      intrinsic: "greaterThanEqual",
      operator: ">=",
      as: "uint"
    });
  },
  and(state, instruction) {
    this._bitwiseBinary(state, instruction, "&");
  },
  or(state, instruction) {
    this._bitwiseBinary(state, instruction, "|");
  },
  xor(state, instruction) {
    this._bitwiseBinary(state, instruction, "^");
  },
  not(state, instruction) {
    const {
      mask
    } = this._destMask(state, instruction);
    const src = this._vecArg(state, instruction.operands[1], mask, "int");
    this._assign(state, instruction, `intBitsToFloat(~${src})`);
  },
  movc(state, instruction) {
    this._movc(state, instruction);
  },
  if(state, instruction) {
    this._line(state, `if (${this._condition(state, instruction)}) {`);
    state.indent += 1;
  },
  else(state) {
    state.indent -= 1;
    this._line(state, "} else {");
    state.indent += 1;
  },
  endif(state) {
    state.indent -= 1;
    this._line(state, "}");
  },
  loop(state) {
    this._line(state, "while(true){");
    state.indent += 1;
  },
  endloop(state) {
    state.indent -= 1;
    this._line(state, "}");
  },
  break(state) {
    this._line(state, "break;");
  },
  breakc(state, instruction) {
    this._line(state, `if (${this._condition(state, instruction)}) {break;}`);
  },
  continue(state) {
    this._line(state, "continue;");
  },
  continuec(state, instruction) {
    this._line(state, `if (${this._condition(state, instruction)}) {continue;}`);
  },
  switch(state, instruction) {
    const selector = state.formatter.sourceExpression(instruction.operands[0], {
      destMask: "x",
      as: "int"
    });
    this._line(state, `switch(${selector}){`);
    state.indent += 2;
  },
  case(state, instruction) {
    const label = instruction.operands[0].immediateValues[0].uint32 | 0;
    state.indent -= 1;
    this._line(state, `case ${label}:`);
    state.indent += 1;
  },
  default(state) {
    state.indent -= 1;
    this._line(state, "default:");
    state.indent += 1;
  },
  endswitch(state) {
    state.indent -= 2;
    this._line(state, "}");
  },
  ret(state) {
    this._line(state, "return;");
  },
  retc(state, instruction) {
    this._line(state, `if (${this._condition(state, instruction)}) {return;}`);
  },
  discard(state, instruction) {
    const scalar = state.formatter.sourceExpression(instruction.operands[0], {
      destMask: "x",
      as: "int"
    });
    const test = instruction.testBoolean === "nonzero" ? "!=" : "==";
    this._line(state, `if((${scalar})${test}0){discard;}`);
  },
  // --- integer-conv (corpus-common subset) ---
  iadd(state, instruction) {
    this._intBinary(state, instruction, "+");
  },
  imad(state, instruction) {
    const {
      mask
    } = this._destMask(state, instruction);
    const a = this._vecArg(state, instruction.operands[1], mask, "int");
    const b = this._vecArg(state, instruction.operands[2], mask, "int");
    const c = this._vecArg(state, instruction.operands[3], mask, "int");
    this._assign(state, instruction, `intBitsToFloat(${a} * ${b} + ${c})`);
  },
  imul(state, instruction) {
    if (instruction.operands[0].type !== 13) {
      throw new WebglReadError("imul with a live high-half destination is unimplementable in GLSL ES 3.00", {
        source: state.sourceName
      });
    }
    const destLow = instruction.operands[1];
    const mask = state.formatter.destination(destLow)?.registerMask || "xyzw";
    const a = this._vecArg(state, instruction.operands[2], mask, "int");
    const b = this._vecArg(state, instruction.operands[3], mask, "int");
    const statement = state.formatter.assignment(destLow, `intBitsToFloat(${a} * ${b})`);
    if (statement) this._line(state, statement);
  },
  ineg(state, instruction) {
    const {
      mask
    } = this._destMask(state, instruction);
    const src = this._vecArg(state, instruction.operands[1], mask, "int");
    this._assign(state, instruction, `intBitsToFloat(-${src})`);
  },
  imax(state, instruction) {
    this._intMinMax(state, instruction, "max", "int");
  },
  imin(state, instruction) {
    this._intMinMax(state, instruction, "min", "int");
  },
  umax(state, instruction) {
    this._intMinMax(state, instruction, "max", "uint");
  },
  umin(state, instruction) {
    this._intMinMax(state, instruction, "min", "uint");
  },
  ishl(state, instruction) {
    this._intBinary(state, instruction, "<<");
  },
  ishr(state, instruction) {
    this._intBinary(state, instruction, ">>");
  },
  ushr(state, instruction) {
    this._intBinary(state, instruction, ">>", "uint");
  },
  ftoi(state, instruction) {
    const {
      mask
    } = this._destMask(state, instruction);
    const src = this._vecArg(state, instruction.operands[1], mask);
    const type = mask.length > 1 ? `ivec${mask.length}` : "int";
    this._assign(state, instruction, `intBitsToFloat(${type}(${src}))`);
  },
  ftou(state, instruction) {
    const {
      mask
    } = this._destMask(state, instruction);
    const src = this._vecArg(state, instruction.operands[1], mask);
    const type = mask.length > 1 ? `uvec${mask.length}` : "uint";
    this._assign(state, instruction, `uintBitsToFloat(${type}(${src}))`);
  },
  itof(state, instruction) {
    const {
      mask
    } = this._destMask(state, instruction);
    const src = this._vecArg(state, instruction.operands[1], mask, "int");
    const type = mask.length > 1 ? `vec${mask.length}` : "float";
    this._assign(state, instruction, `${type}(${src})`, {
      saturate: instruction.saturate
    });
  },
  utof(state, instruction) {
    const {
      mask
    } = this._destMask(state, instruction);
    const src = this._vecArg(state, instruction.operands[1], mask, "uint");
    const type = mask.length > 1 ? `vec${mask.length}` : "float";
    this._assign(state, instruction, `${type}(${src})`, {
      saturate: instruction.saturate
    });
  },
  // --- texture-sample ---
  sample(state, instruction) {
    this._textureSample(state, instruction);
  },
  sample_c(state, instruction) {
    this._textureSample(state, instruction, {
      comparisonRefOperandIndex: 4
    });
  },
  sample_c_lz(state, instruction) {
    this._textureSample(state, instruction, {
      comparisonRefOperandIndex: 4,
      forceLodZero: true
    });
  },
  sample_l(state, instruction) {
    this._textureSample(state, instruction, {
      lodOperandIndex: 4
    });
  },
  sample_b(state, instruction) {
    this._textureSample(state, instruction, {
      biasOperandIndex: 4
    });
  },
  sample_d(state, instruction) {
    this._textureSample(state, instruction, {
      gradOperandIndexes: [4, 5]
    });
  },
  udiv(state, instruction) {
    // Quotient into operand 0, remainder into operand 1; either may be null.
    // Raw `/` and `%` match HLSLcc; divide-by-zero is GLSL-undefined (spec risk noted).
    const [quotient, remainder, a, b] = instruction.operands;
    for (const [destOperand, operator] of [[quotient, "/"], [remainder, "%"]]) {
      if (destOperand.type === 13) continue;
      const mask = state.formatter.destination(destOperand)?.registerMask || "xyzw";
      const left = this._vecArg(state, a, mask, "uint");
      const right = this._vecArg(state, b, mask, "uint");
      const statement = state.formatter.assignment(destOperand, `uintBitsToFloat(${left} ${operator} ${right})`);
      if (statement) this._line(state, statement);
    }
  },
  ld(state, instruction) {
    this._texelFetch(state, instruction);
  },
  deriv_rtx(state, instruction) {
    this._helperUnary(state, instruction, "dFdx");
  },
  deriv_rtx_coarse(state, instruction) {
    this._helperUnary(state, instruction, "dFdx");
  },
  deriv_rtx_fine(state, instruction) {
    this._helperUnary(state, instruction, "dFdx");
  },
  deriv_rty(state, instruction) {
    this._helperUnary(state, instruction, "dFdy");
  },
  deriv_rty_coarse(state, instruction) {
    this._helperUnary(state, instruction, "dFdy");
  },
  deriv_rty_fine(state, instruction) {
    this._helperUnary(state, instruction, "dFdy");
  },
  resinfo(state, instruction) {
    this._resinfo(state, instruction);
  },
  // --- memory-structured ---
  ld_structured(state, instruction) {
    this._ldStructured(state, instruction);
  },
  // --- integer-conv: half-float packing (skinned vertex data unpacking) ---
  f16tof32(state, instruction) {
    const {
      target,
      mask
    } = this._destMask(state, instruction);
    if (!target) return;
    for (const component of mask) {
      const src = state.formatter.sourceExpression(instruction.operands[1], {
        destMask: component
      });
      const lvalue = this._destComponentRef(state, instruction.operands[0], target, component);
      this._line(state, `${lvalue} = unpackHalf2x16(floatBitsToUint(${src}) & 0xffffu).x;`);
    }
  },
  f32tof16(state, instruction) {
    const {
      target,
      mask
    } = this._destMask(state, instruction);
    if (!target) return;
    for (const component of mask) {
      const src = state.formatter.sourceExpression(instruction.operands[1], {
        destMask: component
      });
      const lvalue = this._destComponentRef(state, instruction.operands[0], target, component);
      this._line(state, `${lvalue} = uintBitsToFloat(packHalf2x16(vec2(${src}, 0.0)) & 0xffffu);`);
    }
  },
  nop() {},
  // --- bitfield (GLSL ES 3.00 has no bitfieldExtract/Insert/bitCount; ES 3.10+ only) ---
  ibfe(state, instruction) {
    const helper = this.helpers.require("hlslcc_ibfe");
    const {
      target,
      mask
    } = this._destMask(state, instruction);
    if (!target) return;
    for (const component of mask) {
      const width = state.formatter.sourceExpression(instruction.operands[1], {
        destMask: component,
        as: "int"
      });
      const offset = state.formatter.sourceExpression(instruction.operands[2], {
        destMask: component,
        as: "int"
      });
      const src = state.formatter.sourceExpression(instruction.operands[3], {
        destMask: component,
        as: "int"
      });
      const lvalue = this._destComponentRef(state, instruction.operands[0], target, component);
      this._line(state, `${lvalue} = intBitsToFloat(${helper}(${width}, ${offset}, ${src}));`);
    }
  },
  ubfe(state, instruction) {
    const helper = this.helpers.require("hlslcc_ubfe");
    const {
      target,
      mask
    } = this._destMask(state, instruction);
    if (!target) return;
    for (const component of mask) {
      const width = state.formatter.sourceExpression(instruction.operands[1], {
        destMask: component,
        as: "uint"
      });
      const offset = state.formatter.sourceExpression(instruction.operands[2], {
        destMask: component,
        as: "uint"
      });
      const src = state.formatter.sourceExpression(instruction.operands[3], {
        destMask: component,
        as: "uint"
      });
      const lvalue = this._destComponentRef(state, instruction.operands[0], target, component);
      this._line(state, `${lvalue} = uintBitsToFloat(${helper}(${width}, ${offset}, ${src}));`);
    }
  },
  bfi(state, instruction) {
    const helper = this.helpers.require("hlslcc_bfi");
    const {
      target,
      mask
    } = this._destMask(state, instruction);
    if (!target) return;
    for (const component of mask) {
      const width = state.formatter.sourceExpression(instruction.operands[1], {
        destMask: component,
        as: "uint"
      });
      const offset = state.formatter.sourceExpression(instruction.operands[2], {
        destMask: component,
        as: "uint"
      });
      const insert = state.formatter.sourceExpression(instruction.operands[3], {
        destMask: component,
        as: "uint"
      });
      const base = state.formatter.sourceExpression(instruction.operands[4], {
        destMask: component,
        as: "uint"
      });
      const lvalue = this._destComponentRef(state, instruction.operands[0], target, component);
      this._line(state, `${lvalue} = uintBitsToFloat(${helper}(${width}, ${offset}, ${insert}, ${base}));`);
    }
  },
  countbits(state, instruction) {
    const helper = this.helpers.require("hlslcc_countbits");
    const {
      target,
      mask
    } = this._destMask(state, instruction);
    if (!target) return;
    for (const component of mask) {
      const src = state.formatter.sourceExpression(instruction.operands[1], {
        destMask: component,
        as: "uint"
      });
      const lvalue = this._destComponentRef(state, instruction.operands[0], target, component);
      this._line(state, `${lvalue} = uintBitsToFloat(${helper}(${src}));`);
    }
  },
  // --- texture-sample: gather4 (GLSL ES 3.00 has no textureGather; emulated via 4 texelFetch taps) ---
  gather4(state, instruction) {
    this._gather4(state, instruction);
  },
  // --- compute map-style: UAV write ---
  store_uav_typed(state, instruction) {
    // Map-style contract: the address operand's xy are assumed to equal the
    // current fragment's coordinate (the packaging pipeline only routes
    // map-style compute shaders through this lowering, where every UAV
    // write targets the invoking thread's own output texel) — they are
    // deliberately unread here. The z (array-slice) coordinate was resolved
    // by the `_analyzeUavStores` pre-pass: a multi-slice UAV routes each
    // store to its own per-slice fragment output, a single-store UAV drops
    // the slice entirely (the host attaches the target layer).
    const [uavOperand,, valueOperand] = instruction.operands;
    const target = state.formatter.destination(uavOperand);
    if (!target) return;
    const mask = target.registerMask || "xyzw";
    const value = this._vecArg(state, valueOperand, mask);
    // RGBA float render targets are assumed for every map-style UAV output;
    // uint/sint DXBC UAV formats still pass their bit patterns through as
    // float here (consistent with this emitter's float-vec4 register model),
    // so flag it as a warning rather than a hard failure.
    const returnTypes = state.uavReturnTypes.get(uavOperand.registerIndex);
    if (returnTypes && returnTypes.some(name => name === "uint" || name === "sint")) {
      state.warnings.push(`store_uav_typed at offset ${instruction.offset} targets a non-float UAV (${returnTypes.join(",")}); output is treated as an RGBA float render target`);
    }
    const plan = state.uavSlicePlan.get(uavOperand.registerIndex);
    if (plan?.kind === "multiSlice") {
      const slice = plan.sliceByOffset.get(instruction.offset);
      const sliceName = state.uavSliceNames.get(uavOperand.registerIndex).get(slice);
      this._line(state, `${sliceName}${target.mask ? `.${target.mask}` : ""} = ${value};`);
      return;
    }
    this._line(state, `${this._destText(target)} = ${value};`);
  }
};

/**
 * `ld_structured` lowering. Vertex UBO path reads `name.data[row]` vec4 rows;
 * pixel data-texture path reads RGBA32UI texels (4 dwords per texel, fixed
 * 2048-texel row width). 16-byte-aligned reads use one static channel per
 * component; unaligned reads fall back to per-dword dynamic addressing.
 */
DxbcGlslEmitter.prototype._ldStructured = function _ldStructured(state, instruction) {
  const target = state.formatter.destination(instruction.operands[0]);
  if (!target) return;
  const mask = target.registerMask || "xyzw";
  const resourceOperand = instruction.operands[3];
  const info = state.structuredBuffers.get(resourceOperand.registerIndex);
  if (!info) {
    throw new WebglReadError("ld_structured references an undeclared structured buffer", {
      source: state.sourceName,
      register: resourceOperand.registerIndex
    });
  }
  if (info.kind === "stub") {
    // Stubbed tiled-lighting buffer: every component reads a compile-time
    // zero. floatBitsToUint of this is 0u, so the per-tile light count is 0
    // and the surrounding light loop is dead (no live sb#/s# references).
    for (const component of mask) {
      this._line(state, `${this._destComponentRef(state, instruction.operands[0], target, component)} = uintBitsToFloat(0u);`);
    }
    return;
  }
  const offsetOperand = instruction.operands[2];
  if (offsetOperand.type !== 4) {
    throw new WebglReadError("ld_structured with a non-immediate byte offset is not supported", {
      source: state.sourceName,
      offset: instruction.offset
    });
  }
  const offsetDwords = offsetOperand.immediateValues[0].uint32 >> 2;
  const element = state.formatter.sourceExpression(instruction.operands[1], {
    destMask: "x",
    as: "int"
  });
  const swizzle = resourceOperand.swizzle || "xyzw";
  const widthMask = this.profile.dataTextureWidth - 1;
  const widthShift = Math.log2(this.profile.dataTextureWidth);
  const aligned = info.strideDwords % 4 === 0 && offsetDwords % 4 === 0;
  for (const component of mask) {
    const channel = swizzle["xyzw".indexOf(component)];
    const channelIndex = "xyzw".indexOf(channel);
    let value;
    if (info.kind === "lightIndexPacked") {
      const dword = `(${element}) * ${info.strideDwords} + ${offsetDwords + channelIndex}`;
      value = `uintBitsToFloat(texelFetch(${info.name}, ivec2(((${dword}) >> 2) & ${widthMask}, (${dword}) >> ${widthShift + 2}), 0)[(${dword}) & 3])`;
    } else if (info.kind === "lightDataPacked") {
      const dword = `(${element}) * ${info.strideDwords} + ${offsetDwords + channelIndex}`;
      const texel = `(${info.dataTexelBase} + ((${dword}) >> 2))`;
      value = `uintBitsToFloat(texelFetch(${info.name}, ivec2((${texel}) & ${widthMask}, (${texel}) >> ${widthShift}), 0)[(${dword}) & 3])`;
    } else if (info.kind === "lightIndexCb") {
      value = `uintBitsToFloat(cjsLocalLightIndexLoad(${element}))`;
    } else if (info.kind === "lightDataCb") {
      if (!aligned) {
        throw new WebglReadError("local-light constant-buffer lowering requires aligned light rows", {
          source: state.sourceName,
          offset: instruction.offset
        });
      }
      value = `cjsLocalLightRow(${element}, ${offsetDwords / 4}).${channel}`;
    } else if (info.kind === "ubo") {
      if (aligned) {
        const row = `(${element}) * ${info.strideDwords / 4}${offsetDwords ? ` + ${offsetDwords / 4}` : ""}`;
        value = `${info.name}.data[${row}].${channel}`;
      } else {
        const dword = `(${element}) * ${info.strideDwords} + ${offsetDwords + channelIndex}`;
        value = `${info.name}.data[(${dword}) >> 2][(${dword}) & 3]`;
      }
    } else if (aligned) {
      const texel = `(${element}) * ${info.strideDwords / 4}${offsetDwords ? ` + ${offsetDwords / 4}` : ""}`;
      value = `uintBitsToFloat(texelFetch(${info.name}, ivec2((${texel}) & ${widthMask}, (${texel}) >> ${widthShift}), 0).${channel})`;
    } else {
      const dword = `(${element}) * ${info.strideDwords} + ${offsetDwords + channelIndex}`;
      value = `uintBitsToFloat(texelFetch(${info.name}, ivec2(((${dword}) >> 2) & ${widthMask}, (${dword}) >> ${widthShift + 2}), 0)[(${dword}) & 3])`;
    }
    this._line(state, `${this._destComponentRef(state, instruction.operands[0], target, component)} = ${value};`);
  }
};

/**
 * `resinfo` lowering: width/height/depth via textureSize per live destination
 * component; the 4th (mip-count) channel has no WebGL2 equivalent and throws
 * only when a shader actually reads it.
 */
DxbcGlslEmitter.prototype._resinfo = function _resinfo(state, instruction) {
  const {
    target,
    mask
  } = this._destMask(state, instruction);
  if (!target) return;
  const mipExpression = state.formatter.sourceExpression(instruction.operands[1], {
    destMask: "x",
    as: "int"
  });
  const texOperand = instruction.operands[2];
  this._rejectDetailArrayMapUse(state, instruction, texOperand);
  const dimension = this._resourceDimension(state, instruction, texOperand);
  const axisCount = dimension === 5 || dimension === 8 ? 3 : 2;
  const returnType = instruction.resinfoReturnTypeName || "float";
  const sizeExpression = `textureSize(${state.formatter.registerReference(texOperand)}, ${mipExpression})`;
  for (const component of mask) {
    const destElem = "xyzw".indexOf(component);
    const channelChar = texOperand.swizzle ? texOperand.swizzle[destElem] : component;
    const channel = "xyzw".indexOf(channelChar);
    let value;
    if (channel >= 3) {
      throw new WebglReadError("resinfo mip-count component has no WebGL2 lowering", {
        source: state.sourceName,
        offset: instruction.offset
      });
    } else if (channel >= axisCount) {
      value = returnType === "uint" ? "uintBitsToFloat(0u)" : "0.0";
    } else {
      const axis = COMPONENTS[channel];
      if (returnType === "uint") {
        value = `uintBitsToFloat(uint(${sizeExpression}.${axis}))`;
      } else if (returnType === "rcpfloat") {
        value = `1.0 / float(${sizeExpression}.${axis})`;
      } else {
        value = `float(${sizeExpression}.${axis})`;
      }
    }
    this._line(state, `${this._destComponentRef(state, instruction.operands[0], target, component)} = ${value};`);
  }
};

/**
 * Shared int/uint min-max lowering used by imax/imin/umax/umin.
 */
DxbcGlslEmitter.prototype._intMinMax = function _intMinMax(state, instruction, fn, as) {
  const {
    mask
  } = this._destMask(state, instruction);
  const a = this._vecArg(state, instruction.operands[1], mask, as);
  const b = this._vecArg(state, instruction.operands[2], mask, as);
  const wrap = as === "uint" ? "uintBitsToFloat" : "intBitsToFloat";
  this._assign(state, instruction, `${wrap}(${fn}(${a}, ${b}))`);
};

/**
 * `gather4` lowering: fetches one channel from each of the four texels a
 * bilinear sample would blend, via the `hlslcc_textureGather4Emulated` /
 * `hlslcc_textureGather4ArrayEmulated` helpers (GLSL ES 3.00 has no
 * `textureGather`). Only 2D and 2D-array resources are supported — the
 * dimensions the AO/blur/FSR/CAS map-style corpus this lowering targets is
 * known to use (ASSAO gathers from its deinterleaved texture2darray slices).
 *
 * @param {object} state Emit state.
 * @param {object} instruction `gather4` instruction.
 */
DxbcGlslEmitter.prototype._gather4 = function _gather4(state, instruction) {
  const {
    mask
  } = this._destMask(state, instruction);
  const coordOperand = instruction.operands[1];
  const texOperand = instruction.operands[2];
  const samplerOperand = instruction.operands[3];
  const dimension = this._resourceDimension(state, instruction, texOperand);
  if (dimension !== 3 && dimension !== 8) {
    throw new WebglReadError("gather4 against this resource dimension is not supported by the WebGL2 emitter", {
      source: state.sourceName,
      dimensionName: texOperand.typeName,
      offset: instruction.offset
    });
  }
  // A merged detail map is declared 2D but sampled through an array, so the
  // array helper and the layered coordinate are selected by the merge rather
  // than by the declared dimension.
  const detailLayer = this._detailMapArrayLayer(state, texOperand);
  const asArray = dimension === 8 || detailLayer !== null;
  const helper = this.helpers.require(asArray ? "hlslcc_textureGather4ArrayEmulated" : "hlslcc_textureGather4Emulated");
  const baseCoord = this._vecArg(state, coordOperand, dimension === 8 ? "xyz" : "xy");
  const coord = detailLayer === null ? baseCoord : `vec3(${baseCoord}, ${detailLayer}.0)`;
  const texName = state.formatter.registerReference(texOperand);
  const channelLetter = this._gather4Channel(samplerOperand);
  const channelIndex = "xyzw".indexOf(channelLetter);
  const call = `${helper}(${texName}, ${coord}, ${channelIndex})`;
  this._assign(state, instruction, mask === "xyzw" ? call : `${call}.${mask}`, {
    saturate: instruction.saturate
  });
};

/**
 * Reads the gathered-channel selector `gather4`/`gather4_po` carry on their
 * sampler operand (a 1-component swizzle; red/`x` is the default when no
 * selection is encoded).
 *
 * @param {object} operand Decoded sampler operand.
 * @returns {string} Channel letter (`x`/`y`/`z`/`w`).
 */
DxbcGlslEmitter.prototype._gather4Channel = function _gather4Channel(operand) {
  if (operand.selectionModeName === "select1" && operand.selected) {
    return operand.selected;
  }
  if (operand.selectionModeName === "swizzle" && operand.swizzle) {
    return operand.swizzle[0];
  }
  return "x";
};

/**
 * Assembles the final GLSL text.
 */
DxbcGlslEmitter.prototype._assemble = function _assemble(state) {
  const lines = ["#version 300 es"];
  if (state.isPixel || state.isCompute) {
    lines.push("precision highp float;", "precision highp int;");
  }
  lines.push("", ...state.declarationLines);
  const helperSource = this.helpers.emit();
  if (helperSource) {
    lines.push("", helperSource);
  }
  // Vertex stages get the standard DX->GL depth-range fixup: EVE's
  // projection matrices are D3D-style (z_clip in [0, w]), so the raw
  // DXBC position would land in GL NDC [0, 1] instead of [-1, 1] —
  // halving depth precision and breaking every pixel-stage read of
  // SV_Position.z (gl_FragCoord.z) and depth-encoding technique against
  // the DX-convention values the shaders were compiled for. Remapping
  // z after the translated body runs makes depth output, clipping and
  // gl_FragCoord.z all match D3D semantics exactly. The body is wrapped
  // in a helper so early `ret` (return) statements cannot skip the
  // fixup.
  const writesPosition = [...state.outputNames.values()].includes("gl_Position");
  if (!state.isPixel && !state.isCompute && writesPosition) {
    lines.push("", "void dxbc_main() {");
    for (const early of state.earlyMainLines) {
      lines.push(`    ${early}`);
    }
    lines.push(...state.bodyLines, "}");
    lines.push("", "void main() {", "    dxbc_main();", "    gl_Position.z = 2.0 * gl_Position.z - gl_Position.w;", "}");
    return `${lines.join("\n")}\n`;
  }
  lines.push("", "void main() {");
  for (const early of state.earlyMainLines) {
    lines.push(`    ${early}`);
  }
  lines.push(...state.bodyLines, "}");
  return `${lines.join("\n")}\n`;
};

export { DxbcGlslEmitter };
//# sourceMappingURL=DxbcGlslEmitter.js.map
