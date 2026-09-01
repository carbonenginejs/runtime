// Source: trinity/trinity/Shader/Tr2EffectStateManager.h:104
//   `typedef std::map<Tr2RenderContextEnum::RenderState, uint32_t> Tr2RenderStateSetup`
//   registered by Tr2EffectStateManager::RegisterRenderStateSetup (:118), whose
//   returned handle is what Tr2Pass stores in `renderStates`.
//
// Carbon keeps a setup raw and replays it onto a D3D device. Neither of our
// backends is D3D, so the setup is interpreted here instead - once, so two
// backends cannot disagree about what a Carbon render-state id means.
//
// Every Carbon vocabulary it reads comes from #consts/render-context rather
// than being re-declared here. One object, however many names: a second frozen
// copy of the same members drifts silently. The ids in particular are a trap -
// RS_SCISSORTESTENABLE (174) exists in D3D9 and in ccpwgl but NOT in Carbon,
// whose enum jumps 173 straight to 175.
//
// Generic members are named generically; anything true of only one backend is
// named for that backend. `GetWebgpuRecipe` is a projection, not an override of
// anything: no polymorphism dispatches on it, and a WebGL sibling returns a
// different shape because WebGPU folds state into a pipeline at creation while
// WebGL mutates it per draw.
import {
  BlendMode,
  BlendOperation,
  ColorWriteEnable,
  CompareFunc,
  CullMode,
  FillMode,
  RenderState
} from "#consts/render-context";
import { float32FromBits } from "#utils/bytes";

/**
 * The render states this class interprets, by Carbon id.
 *
 * A subset with intent, taken from the shared table rather than hand-typed:
 * these are the states a draw needs. Everything else Carbon declares is
 * retained uninterpreted under `unhandled`.
 */
const RS = Object.freeze({
  ZENABLE: RenderState.RS_ZENABLE,
  FILLMODE: RenderState.RS_FILLMODE,
  ZWRITEENABLE: RenderState.RS_ZWRITEENABLE,
  ALPHATESTENABLE: RenderState.RS_ALPHATESTENABLE,
  SRCBLEND: RenderState.RS_SRCBLEND,
  DESTBLEND: RenderState.RS_DESTBLEND,
  CULLMODE: RenderState.RS_CULLMODE,
  ZFUNC: RenderState.RS_ZFUNC,
  ALPHAREF: RenderState.RS_ALPHAREF,
  ALPHAFUNC: RenderState.RS_ALPHAFUNC,
  ALPHABLENDENABLE: RenderState.RS_ALPHABLENDENABLE,
  COLORWRITEENABLE: RenderState.RS_COLORWRITEENABLE,
  BLENDOP: RenderState.RS_BLENDOP,
  SLOPESCALEDEPTHBIAS: RenderState.RS_SLOPESCALEDEPTHBIAS,
  BLENDFACTOR: RenderState.RS_BLENDFACTOR,
  SRGBWRITEENABLE: RenderState.RS_SRGBWRITEENABLE,
  DEPTHBIAS: RenderState.RS_DEPTHBIAS,
  SEPARATEALPHABLENDENABLE: RenderState.RS_SEPARATEALPHABLENDENABLE,
  SRCBLENDALPHA: RenderState.RS_SRCBLENDALPHA,
  DESTBLENDALPHA: RenderState.RS_DESTBLENDALPHA,
  BLENDOPALPHA: RenderState.RS_BLENDOPALPHA
});

const INTERPRETED = new Set(Object.values(RS));

/**
 * Carbon comparison values to neutral spellings.
 *
 * The spelling is backend-neutral on purpose. WebGPU wants `less-equal` and
 * WebGL wants `LEQUAL`; deciding either here would bake a backend into a shared
 * property.
 */
const COMPARE = Object.freeze({
  [CompareFunc.CMP_NEVER]: "never",
  [CompareFunc.CMP_LESS]: "less",
  [CompareFunc.CMP_EQUAL]: "equal",
  [CompareFunc.CMP_LESSEQUAL]: "lessEqual",
  [CompareFunc.CMP_GREATER]: "greater",
  [CompareFunc.CMP_NOTEQUAL]: "notEqual",
  [CompareFunc.CMP_GREATEREQUAL]: "greaterEqual",
  [CompareFunc.CMP_ALWAYS]: "always"
});

/** Carbon blend modes to neutral spellings. */
const BLEND_FACTOR = Object.freeze({
  [BlendMode.BM_ZERO]: "zero",
  [BlendMode.BM_ONE]: "one",
  [BlendMode.BM_SRCCOLOR]: "srcColor",
  [BlendMode.BM_INVSRCCOLOR]: "invSrcColor",
  [BlendMode.BM_SRCALPHA]: "srcAlpha",
  [BlendMode.BM_INVSRCALPHA]: "invSrcAlpha",
  [BlendMode.BM_DESTALPHA]: "destAlpha",
  [BlendMode.BM_INVDESTALPHA]: "invDestAlpha",
  [BlendMode.BM_DESTCOLOR]: "destColor",
  [BlendMode.BM_INVDESTCOLOR]: "invDestColor",
  [BlendMode.BM_SRCALPHASAT]: "srcAlphaSat",
  [BlendMode.BM_BOTHSRCALPHA]: "bothSrcAlpha",
  [BlendMode.BM_BOTHINVSRCALPHA]: "bothInvSrcAlpha",
  [BlendMode.BM_BLENDFACTOR]: "blendFactor",
  [BlendMode.BM_INVBLENDFACTOR]: "invBlendFactor"
});

/**
 * Carbon blend operations to neutral spellings.
 *
 * `BO_DISABLE` is a real Carbon member, not enum-width padding, so it maps
 * rather than throwing. A setup that authors it is not blending, whatever
 * ALPHABLENDENABLE says.
 */
const BLEND_OP = Object.freeze({
  [BlendOperation.BO_DISABLE]: "disable",
  [BlendOperation.BO_ADD]: "add",
  [BlendOperation.BO_SUBTRACT]: "subtract",
  [BlendOperation.BO_REVSUBTRACT]: "revSubtract",
  [BlendOperation.BO_MIN]: "min",
  [BlendOperation.BO_MAX]: "max"
});

/**
 * Carbon cull modes to neutral spellings, named by the winding DISCARDED.
 *
 * D3D names the winding to cull; a modern API names the face. The two agree
 * only once a front-face winding is chosen, and that belongs to the backend
 * projection rather than to the authored setup.
 */
const CULL = Object.freeze({
  [CullMode.CULLMODE_NONE]: "none",
  [CullMode.CULLMODE_CW]: "cw",
  [CullMode.CULLMODE_CCW]: "ccw"
});

/** Carbon fill modes to neutral spellings. */
const FILL = Object.freeze({
  [FillMode.FM_POINT]: "point",
  [FillMode.FM_WIREFRAME]: "wireframe",
  [FillMode.FM_SOLID]: "solid"
});

/**
 * Carbon's inverted-depth-test override, as a neutral mapping.
 *
 * `Tr2EffectStateManager::SetInvertedDepthTest` (Tr2EffectStateManager.cpp:834)
 * installs an RS_ZFUNC override table that swaps the ordered comparisons and
 * leaves the order-free ones alone. This is the same table in our spelling.
 */
const INVERTED_COMPARE = Object.freeze({
  never: "never",
  less: "greater",
  equal: "equal",
  lessEqual: "greaterEqual",
  greater: "less",
  notEqual: "notEqual",
  greaterEqual: "lessEqual",
  always: "always"
});

/**
 * Carbon's inverted-cull override, as a neutral mapping.
 *
 * `Tr2EffectStateManager::SetInvertedCullMode` (Tr2EffectStateManager.cpp:815)
 * installs an RS_CULLMODE override that swaps the two windings and leaves
 * `none` alone.
 */
const INVERTED_CULL = Object.freeze({ none: "none", cw: "ccw", ccw: "cw" });

/** Neutral comparison spellings to WebGPU's. */
const WEBGPU_COMPARE = Object.freeze({
  never: "never",
  less: "less",
  equal: "equal",
  lessEqual: "less-equal",
  greater: "greater",
  notEqual: "not-equal",
  greaterEqual: "greater-equal",
  always: "always"
});

/**
 * Neutral blend factors to WebGPU's.
 *
 * `bothSrcAlpha` and `bothInvSrcAlpha` are absent: they are D3D9 fixed-function
 * modes that set the source and destination factors together, and WebGPU has no
 * equivalent. They fail rather than being approximated.
 */
const WEBGPU_BLEND_FACTOR = Object.freeze({
  zero: "zero",
  one: "one",
  srcColor: "src",
  invSrcColor: "one-minus-src",
  srcAlpha: "src-alpha",
  invSrcAlpha: "one-minus-src-alpha",
  destAlpha: "dst-alpha",
  invDestAlpha: "one-minus-dst-alpha",
  destColor: "dst",
  invDestColor: "one-minus-dst",
  srcAlphaSat: "src-alpha-saturated",
  blendFactor: "constant",
  invBlendFactor: "one-minus-constant"
});

/**
 * Neutral blend equations to WebGPU's.
 *
 * `disable` is absent: WebGPU expresses "not blending" by omitting the blend
 * member, so a disabled operation is resolved before this table is consulted.
 */
const WEBGPU_BLEND_OP = Object.freeze({
  add: "add",
  subtract: "subtract",
  revSubtract: "reverse-subtract",
  min: "min",
  max: "max"
});

/**
 * Depth-format mantissa widths, for the WebGPU bias conversion.
 *
 * A UNORM depth buffer's smallest increment is `1 / (2^bits - 1)`, so a float
 * bias multiplies by that many units. `depth32float` has no fixed increment -
 * WebGPU defines the unit as format-dependent and implementation-chosen there -
 * so a float bias cannot be converted exactly and is refused.
 */
const WEBGPU_DEPTH_UNORM_BITS = Object.freeze({
  depth16unorm: 16,
  depth24plus: 24,
  "depth24plus-stencil8": 24
});

/**
 * WebGPU front-face winding, stated once.
 *
 * Carbon runs D3D's default rasterizer state, in which a clockwise winding is
 * the front face. Every WebGPU cull decision is relative to this.
 */
const WEBGPU_FRONT_FACE = "cw";

/**
 * Authored values a setup inherits when it sets nothing.
 *
 * These are the D3D defaults Carbon inherits, named through the shared
 * vocabulary rather than repeated as numbers.
 */
const DEFAULT_DEPTH_COMPARE = CompareFunc.CMP_LESSEQUAL;
const DEFAULT_CULL = CullMode.CULLMODE_CCW;
const DEFAULT_FILL = FillMode.FM_SOLID;
const DEFAULT_SRC_BLEND = BlendMode.BM_ONE;
const DEFAULT_DEST_BLEND = BlendMode.BM_ZERO;
const DEFAULT_BLEND_OP = BlendOperation.BO_ADD;
const DEFAULT_ALPHA_FUNC = CompareFunc.CMP_ALWAYS;
const DEFAULT_COLOR_WRITE = ColorWriteEnable.COLORWRITEENABLE_RED
  | ColorWriteEnable.COLORWRITEENABLE_GREEN
  | ColorWriteEnable.COLORWRITEENABLE_BLUE
  | ColorWriteEnable.COLORWRITEENABLE_ALPHA;

/**
 * Looks a value up in a mapping table, failing on an unmapped one.
 *
 * A silently substituted default here is a wrong draw with no error, which is
 * the expensive failure mode.
 *
 * @param {object} table Mapping table.
 * @param {string|number} value Value to map.
 * @param {string} message Failure message, already naming what was being mapped.
 * @returns {string} Mapped value.
 */
function mapOrFail(table, value, message)
{
  const mapped = table[value];
  if (mapped === undefined) throw new RangeError(message);
  return mapped;
}

/**
 * Splits a Carbon colour-write mask into channel flags.
 *
 * @param {number} value Raw mask.
 * @returns {object} Per-channel flags.
 */
function colorWriteMask(value)
{
  return {
    red: (value & ColorWriteEnable.COLORWRITEENABLE_RED) !== 0,
    green: (value & ColorWriteEnable.COLORWRITEENABLE_GREEN) !== 0,
    blue: (value & ColorWriteEnable.COLORWRITEENABLE_BLUE) !== 0,
    alpha: (value & ColorWriteEnable.COLORWRITEENABLE_ALPHA) !== 0
  };
}

/**
 * Splits a D3DCOLOR blend constant into normalised channels.
 *
 * @param {number} value Raw ARGB colour.
 * @returns {object} Normalised channels.
 */
function blendConstant(value)
{
  const unsigned = value >>> 0;
  return {
    r: ((unsigned >>> 16) & 0xff) / 255,
    g: ((unsigned >>> 8) & 0xff) / 255,
    b: (unsigned & 0xff) / 255,
    a: ((unsigned >>> 24) & 0xff) / 255
  };
}

/**
 * Translates one blend component into WebGPU's vocabulary.
 *
 * @param {{src:string,dst:string,op:string}} component Neutral factors.
 * @returns {object} WebGPU blend component.
 */
function webgpuBlendComponent(component)
{
  return {
    srcFactor: mapOrFail(
      WEBGPU_BLEND_FACTOR,
      component.src,
      `WebGPU has no blend factor equivalent for Carbon's "${component.src}"`
    ),
    dstFactor: mapOrFail(
      WEBGPU_BLEND_FACTOR,
      component.dst,
      `WebGPU has no blend factor equivalent for Carbon's "${component.dst}"`
    ),
    operation: mapOrFail(
      WEBGPU_BLEND_OP,
      component.op,
      `WebGPU has no blend operation equivalent for Carbon's "${component.op}"`
    )
  };
}

/** One pass's registered set of render states, interpreted. */
export class Tr2RenderStateSetup
{

  /** Depth test, write, comparison, and the two bias terms. */
  depth = {
    test: true,
    write: true,
    compare: "lessEqual",
    bias: 0,
    slopeScaledBias: 0
  };

  /** Winding that is discarded: `none`, `cw` or `ccw`. */
  cull = "ccw";

  /** Rasterizer fill: `solid`, `wireframe` or `point`. */
  fill = "solid";

  /** Blend factors and equation, or null when the setup does not blend. */
  blend = null;

  /** Per-channel colour write flags. */
  colorWrite = { red: true, green: true, blue: true, alpha: true };

  /** Comparison and reference, or null when the setup does not alpha test. */
  alphaTest = null;

  /** Whether the setup writes sRGB-encoded colour. */
  srgbWrite = false;

  /**
   * Authored states this class does not interpret, retained verbatim.
   *
   * Stencil, fog, the fixed-function lighting states and point sprites land
   * here rather than being dropped, so a consumer that meets one can assert on
   * it instead of silently rendering without it. Nothing in the current draw
   * path authors them.
   */
  unhandled = [];

  // The shared vocabularies, aliased rather than re-declared: one object with a
  // class-scoped name, which is what enum placement requires.

  /** @see CompareFunc */
  static CompareFunc = CompareFunc;

  /** @see BlendMode */
  static BlendMode = BlendMode;

  /** @see BlendOperation */
  static BlendOperation = BlendOperation;

  /** @see CullMode */
  static CullMode = CullMode;

  /** @see FillMode */
  static FillMode = FillMode;

  /** @see ColorWriteEnable */
  static ColorWriteEnable = ColorWriteEnable;

  /**
   * Interprets one reflected pass's authored render states.
   *
   * `depth.test` folds D3D's ZENABLE, including `D3DZB_USEW` (2), which enables
   * the test; the W-buffer distinction has no modern equivalent and no
   * consumer.
   *
   * The two bias values are reinterpreted float bits, not integers. Carbon
   * stores them as raw uint32 patterns like every other float-valued render
   * state.
   *
   * @param {{renderStateValues?: Array<{state:number,value:number}>}} pass Reflected pass.
   * @returns {Tr2RenderStateSetup} Interpreted setup.
   */
  static fromPass(pass)
  {
    const authored = new Map();
    for (const entry of pass?.renderStateValues ?? [])
    {
      authored.set(Number(entry.state), Number(entry.value));
    }

    const read = (id, fallback) => (authored.has(id) ? authored.get(id) : fallback);
    const mapState = (table, id, fallback, name) =>
    {
      const value = read(id, fallback);
      return mapOrFail(
        table,
        value,
        `Carbon render state ${name} has no mapping for value ${value}`
      );
    };

    const setup = new this();

    setup.depth = {
      test: read(RS.ZENABLE, 1) !== 0,
      write: read(RS.ZWRITEENABLE, 1) !== 0,
      compare: mapState(COMPARE, RS.ZFUNC, DEFAULT_DEPTH_COMPARE, "RS_ZFUNC"),
      bias: float32FromBits(read(RS.DEPTHBIAS, 0)),
      slopeScaledBias: float32FromBits(read(RS.SLOPESCALEDEPTHBIAS, 0))
    };
    setup.cull = mapState(CULL, RS.CULLMODE, DEFAULT_CULL, "RS_CULLMODE");
    setup.fill = mapState(FILL, RS.FILLMODE, DEFAULT_FILL, "RS_FILLMODE");
    setup.colorWrite = colorWriteMask(read(RS.COLORWRITEENABLE, DEFAULT_COLOR_WRITE));
    setup.srgbWrite = read(RS.SRGBWRITEENABLE, 0) !== 0;

    if (read(RS.ALPHABLENDENABLE, 0) !== 0)
    {
      const srcBlend = read(RS.SRCBLEND, DEFAULT_SRC_BLEND);
      const destBlend = read(RS.DESTBLEND, DEFAULT_DEST_BLEND);
      const blendOp = read(RS.BLENDOP, DEFAULT_BLEND_OP);
      const color = {
        src: mapState(BLEND_FACTOR, RS.SRCBLEND, DEFAULT_SRC_BLEND, "RS_SRCBLEND"),
        dst: mapState(BLEND_FACTOR, RS.DESTBLEND, DEFAULT_DEST_BLEND, "RS_DESTBLEND"),
        op: mapState(BLEND_OP, RS.BLENDOP, DEFAULT_BLEND_OP, "RS_BLENDOP")
      };
      // BO_DISABLE means the setup is not blending, however ALPHABLENDENABLE reads.
      if (color.op !== "disable")
      {
        setup.blend = {
          color,
          alpha: read(RS.SEPARATEALPHABLENDENABLE, 0) !== 0
            ? {
              src: mapState(BLEND_FACTOR, RS.SRCBLENDALPHA, srcBlend, "RS_SRCBLENDALPHA"),
              dst: mapState(BLEND_FACTOR, RS.DESTBLENDALPHA, destBlend, "RS_DESTBLENDALPHA"),
              op: mapState(BLEND_OP, RS.BLENDOPALPHA, blendOp, "RS_BLENDOPALPHA")
            }
            : { ...color },
          constant: authored.has(RS.BLENDFACTOR)
            ? blendConstant(authored.get(RS.BLENDFACTOR))
            : null
        };
      }
    }

    if (read(RS.ALPHATESTENABLE, 0) !== 0)
    {
      setup.alphaTest = {
        compare: mapState(COMPARE, RS.ALPHAFUNC, DEFAULT_ALPHA_FUNC, "RS_ALPHAFUNC"),
        ref: read(RS.ALPHAREF, 0)
      };
    }

    for (const [ state, value ] of authored)
    {
      if (!INTERPRETED.has(state)) setup.unhandled.push({ state, value });
    }
    setup.unhandled.sort((left, right) => left.state - right.state);

    return setup;
  }

  /**
   * A canonical string identifying this exact set of states.
   *
   * Carbon gives a registered setup a handle through
   * `RegisterRenderStateSetup` and reuses it across passes; this is that
   * handle's portable equivalent. It is the canonical serialization rather than
   * a hash, so two different setups cannot collide - a setup is small enough to
   * make that affordable, for the same reason the WebGPU pipeline cache
   * serializes its recipes exactly.
   *
   * Uninterpreted states take part, so two passes that differ only in a state
   * nothing reads are not treated as one.
   *
   * @returns {string} Canonical identity.
   */
  Key()
  {
    return JSON.stringify([
      this.depth.test,
      this.depth.write,
      this.depth.compare,
      this.depth.bias,
      this.depth.slopeScaledBias,
      this.cull,
      this.fill,
      this.blend && [
        this.blend.color.src, this.blend.color.dst, this.blend.color.op,
        this.blend.alpha.src, this.blend.alpha.dst, this.blend.alpha.op,
        this.blend.constant && [
          this.blend.constant.r,
          this.blend.constant.g,
          this.blend.constant.b,
          this.blend.constant.a
        ]
      ],
      [ this.colorWrite.red, this.colorWrite.green, this.colorWrite.blue, this.colorWrite.alpha ],
      this.alphaTest && [ this.alphaTest.compare, this.alphaTest.ref ],
      this.srgbWrite,
      this.unhandled.map(entry => [ entry.state, entry.value ])
    ]);
  }

  /**
   * Projects this setup into WebGPU pipeline state.
   *
   * The return is the state half of a pipeline recipe, not a whole recipe: the
   * caller owns topology, vertex buffer layouts and target formats, and merges
   * `primitive` and `depthStencil` into its recipe and `target` into the entry
   * of `fragment.targets` this pass writes.
   *
   * `depthStencil` is null when there is no depth attachment, because a WebGPU
   * pipeline may not declare depth state without one. Pass `depthFormat` as
   * null to say so; a setup that authored a depth bias then fails rather than
   * losing it silently.
   *
   * `invertedDepthTest` and `invertedCullMode` are Carbon's two render-state
   * overrides, which it installs on the state manager rather than authoring per
   * pass - reversed depth and mirrored rendering respectively. They belong here
   * rather than on the setup because the same registered setup is drawn both
   * ways. Applying one changes the projection, and therefore the caller's
   * pipeline cache key, which is what keeps the two variants distinct.
   *
   * Alpha test is returned untranslated. It is not pipeline state in WebGPU -
   * the compiled shader already discards - so the caller is handed the authored
   * intent instead of having it dropped here.
   *
   * @param {object} [options] Properties the authored setup cannot know.
   * @param {string|null} [options.depthFormat] Depth attachment format, or null when there is none.
   * @param {boolean} [options.invertedDepthTest] Apply Carbon's RS_ZFUNC override.
   * @param {boolean} [options.invertedCullMode] Apply Carbon's RS_CULLMODE override.
   * @returns {object} WebGPU pipeline state plus the untranslated authored intent.
   */
  GetWebgpuRecipe(options = {})
  {
    const depthFormat = options.depthFormat === undefined ? "depth24plus" : options.depthFormat;

    if (this.fill !== "solid")
    {
      throw new RangeError(`WebGPU cannot rasterize Carbon fill mode "${this.fill}"`);
    }

    const cull = options.invertedCullMode ? INVERTED_CULL[this.cull] : this.cull;
    const compare = options.invertedDepthTest
      ? INVERTED_COMPARE[this.depth.compare]
      : this.depth.compare;

    const hasBias = this.depth.bias !== 0 || this.depth.slopeScaledBias !== 0;
    if (depthFormat === null && (this.depth.test || this.depth.write || hasBias))
    {
      throw new Error("pass authors depth state but no depth attachment was supplied");
    }

    let depthBias = 0;
    if (this.depth.bias !== 0)
    {
      const bits = WEBGPU_DEPTH_UNORM_BITS[depthFormat];
      if (bits === undefined)
      {
        throw new RangeError(
          `Carbon's fractional depth bias cannot be converted for depth format "${depthFormat}"`
        );
      }
      depthBias = Math.round(this.depth.bias * (2 ** bits - 1));
    }

    // The channel bits are the same in both vocabularies, so the mask is rebuilt
    // through the shared flags rather than through literals.
    const writeMask = (this.colorWrite.red ? ColorWriteEnable.COLORWRITEENABLE_RED : 0)
      | (this.colorWrite.green ? ColorWriteEnable.COLORWRITEENABLE_GREEN : 0)
      | (this.colorWrite.blue ? ColorWriteEnable.COLORWRITEENABLE_BLUE : 0)
      | (this.colorWrite.alpha ? ColorWriteEnable.COLORWRITEENABLE_ALPHA : 0);

    return {
      primitive: {
        cullMode: cull === "none" ? "none" : (cull === WEBGPU_FRONT_FACE ? "front" : "back"),
        frontFace: WEBGPU_FRONT_FACE
      },
      depthStencil: depthFormat === null
        ? null
        : {
          format: depthFormat,
          depthWriteEnabled: this.depth.write,
          // A disabled depth test is expressed as an always-passing compare,
          // which is what WebGPU offers; there is no separate enable.
          depthCompare: this.depth.test
            ? mapOrFail(
              WEBGPU_COMPARE,
              compare,
              `WebGPU has no depth comparison equivalent for Carbon's "${compare}"`
            )
            : "always",
          ...(hasBias
            ? { depthBias, depthBiasSlopeScale: this.depth.slopeScaledBias, depthBiasClamp: 0 }
            : {})
        },
      target: {
        writeMask,
        ...(this.blend
          ? {
            blend: {
              color: webgpuBlendComponent(this.blend.color),
              alpha: webgpuBlendComponent(this.blend.alpha)
            }
          }
          : {})
      },
      // Set only when the setup authored one; the caller applies it per render pass.
      blendConstant: this.blend?.constant ?? null,
      alphaTest: this.alphaTest,
      unhandled: this.unhandled
    };
  }

}
