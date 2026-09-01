import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2RenderStateSetup } from "../../../npm/dist/resource/shader/index.js";

// Carbon render-state ids, spelled here so a test failure names the state.
const RS_ZENABLE = 7;
const RS_FILLMODE = 8;
const RS_ZWRITEENABLE = 14;
const RS_ALPHATESTENABLE = 15;
const RS_SRCBLEND = 19;
const RS_DESTBLEND = 20;
const RS_CULLMODE = 22;
const RS_ZFUNC = 23;
const RS_ALPHAREF = 24;
const RS_ALPHAFUNC = 25;
const RS_ALPHABLENDENABLE = 27;
const RS_STENCILENABLE = 52;
const RS_COLORWRITEENABLE = 168;
const RS_BLENDOP = 171;
const RS_SLOPESCALEDEPTHBIAS = 175;
const RS_BLENDFACTOR = 193;
const RS_DEPTHBIAS = 195;
const RS_SEPARATEALPHABLENDENABLE = 206;
const RS_SRCBLENDALPHA = 207;
const RS_DESTBLENDALPHA = 208;

/** Builds a pass-shaped object carrying only authored render states. */
function pass(entries)
{
  return { renderStateValues: entries.map(([ state, value ]) => ({ state, value })) };
}

/** Reinterprets a float as the uint32 bit pattern Carbon stores. */
function bitsOf(value)
{
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, value, true);
  return view.getUint32(0, true);
}

test("a pass that authors nothing inherits the D3D defaults", () =>
{
  const block = Tr2RenderStateSetup.fromPass(pass([]));

  assert.equal(block.depth.test, true);
  assert.equal(block.depth.write, true);
  assert.equal(block.depth.compare, "lessEqual");
  assert.equal(block.depth.bias, 0);
  assert.equal(block.depth.slopeScaledBias, 0);
  assert.equal(block.cull, "ccw");
  assert.equal(block.fill, "solid");
  assert.equal(block.blend, null);
  assert.equal(block.alphaTest, null);
  assert.deepEqual(block.colorWrite, { red: true, green: true, blue: true, alpha: true });
  assert.equal(block.srgbWrite, false);
  assert.deepEqual(block.unhandled, []);
});

test("a missing pass is treated as authoring nothing", () =>
{
  assert.equal(Tr2RenderStateSetup.fromPass(null).cull, "ccw");
  assert.equal(Tr2RenderStateSetup.fromPass({}).depth.compare, "lessEqual");
});

test("depth, cull and fill are read from the authored values", () =>
{
  const block = Tr2RenderStateSetup.fromPass(pass([
    [ RS_ZENABLE, 0 ],
    [ RS_ZWRITEENABLE, 0 ],
    [ RS_ZFUNC, 5 ],
    [ RS_CULLMODE, 1 ]
  ]));

  assert.equal(block.depth.test, false);
  assert.equal(block.depth.write, false);
  assert.equal(block.depth.compare, "greater");
  assert.equal(block.cull, "none");
});

test("D3DZB_USEW enables the depth test", () =>
{
  // The W-buffer distinction has no modern equivalent; only the enable survives.
  assert.equal(Tr2RenderStateSetup.fromPass(pass([ [ RS_ZENABLE, 2 ] ])).depth.test, true);
});

test("blending is absent unless ALPHABLENDENABLE is set", () =>
{
  // The factors are authored but the enable is not, which is how Carbon leaves
  // an opaque pass that shares an authored state block with a blended one.
  const block = Tr2RenderStateSetup.fromPass(pass([
    [ RS_SRCBLEND, 5 ],
    [ RS_DESTBLEND, 6 ]
  ]));

  assert.equal(block.blend, null);
});

test("an enabled blend mirrors the colour factors into alpha", () =>
{
  const block = Tr2RenderStateSetup.fromPass(pass([
    [ RS_ALPHABLENDENABLE, 1 ],
    [ RS_SRCBLEND, 5 ],
    [ RS_DESTBLEND, 6 ],
    [ RS_BLENDOP, 1 ]
  ]));

  assert.deepEqual(block.blend.color, { src: "srcAlpha", dst: "invSrcAlpha", op: "add" });
  assert.deepEqual(block.blend.alpha, { src: "srcAlpha", dst: "invSrcAlpha", op: "add" });
  assert.equal(block.blend.constant, null);
});

test("a separate alpha blend takes its own factors", () =>
{
  const block = Tr2RenderStateSetup.fromPass(pass([
    [ RS_ALPHABLENDENABLE, 1 ],
    [ RS_SRCBLEND, 5 ],
    [ RS_DESTBLEND, 6 ],
    [ RS_SEPARATEALPHABLENDENABLE, 1 ],
    [ RS_SRCBLENDALPHA, 2 ],
    [ RS_DESTBLENDALPHA, 1 ]
  ]));

  assert.deepEqual(block.blend.color, { src: "srcAlpha", dst: "invSrcAlpha", op: "add" });
  assert.deepEqual(block.blend.alpha, { src: "one", dst: "zero", op: "add" });
});

test("the blend constant is an ARGB D3DCOLOR normalised per channel", () =>
{
  const block = Tr2RenderStateSetup.fromPass(pass([
    [ RS_ALPHABLENDENABLE, 1 ],
    [ RS_BLENDFACTOR, 0xff804000 ]
  ]));

  assert.equal(block.blend.constant.a, 1);
  assert.equal(block.blend.constant.r, 128 / 255);
  assert.equal(block.blend.constant.g, 64 / 255);
  assert.equal(block.blend.constant.b, 0);
});

test("the colour write mask splits into channels", () =>
{
  const block = Tr2RenderStateSetup.fromPass(pass([ [ RS_COLORWRITEENABLE, 0b0101 ] ]));

  assert.deepEqual(block.colorWrite, { red: true, green: false, blue: true, alpha: false });
});

test("alpha test carries its comparison and reference", () =>
{
  const block = Tr2RenderStateSetup.fromPass(pass([
    [ RS_ALPHATESTENABLE, 1 ],
    [ RS_ALPHAFUNC, 5 ],
    [ RS_ALPHAREF, 128 ]
  ]));

  assert.deepEqual(block.alphaTest, { compare: "greater", ref: 128 });
});

test("depth bias is reinterpreted float bits, not an integer", () =>
{
  // A negative slope-scaled bias is the decal case, and reading the pattern as
  // an integer would give 3.2 billion rather than -1.5.
  const block = Tr2RenderStateSetup.fromPass(pass([
    [ RS_DEPTHBIAS, bitsOf(0.000015) ],
    [ RS_SLOPESCALEDEPTHBIAS, bitsOf(-1.5) ]
  ]));

  assert.ok(Math.abs(block.depth.bias - 0.000015) < 1e-9);
  assert.equal(block.depth.slopeScaledBias, -1.5);
});

test("an uninterpreted state is retained rather than dropped", () =>
{
  const block = Tr2RenderStateSetup.fromPass(pass([
    [ RS_STENCILENABLE, 1 ],
    [ RS_CULLMODE, 2 ]
  ]));

  assert.equal(block.cull, "cw");
  assert.deepEqual(block.unhandled, [ { state: RS_STENCILENABLE, value: 1 } ]);
});

test("an unmapped enum value fails rather than substituting a default", () =>
{
  assert.throws(
    () => Tr2RenderStateSetup.fromPass(pass([ [ RS_CULLMODE, 9 ] ])),
    /RS_CULLMODE has no mapping for value 9/
  );
  assert.throws(
    () => Tr2RenderStateSetup.fromPass(pass([ [ RS_ZFUNC, 0 ] ])),
    /RS_ZFUNC has no mapping for value 0/
  );
});

test("two passes authoring the same states share one key", () =>
{
  // Carbon gives a registered setup a 10-bit handle and reuses it across
  // passes; the key is that handle's portable equivalent, so authoring order
  // must not change it.
  const left = Tr2RenderStateSetup.fromPass(pass([
    [ RS_ALPHABLENDENABLE, 1 ],
    [ RS_CULLMODE, 1 ]
  ]));
  const right = Tr2RenderStateSetup.fromPass(pass([
    [ RS_CULLMODE, 1 ],
    [ RS_ALPHABLENDENABLE, 1 ]
  ]));

  assert.equal(left.Key(), right.Key());
});

test("a single differing state changes the key", () =>
{
  const opaque = Tr2RenderStateSetup.fromPass(pass([]));
  const noWrite = Tr2RenderStateSetup.fromPass(pass([ [ RS_ZWRITEENABLE, 0 ] ]));

  assert.notEqual(opaque.Key(), noWrite.Key());
});

test("an uninterpreted state still separates two keys", () =>
{
  // Two passes that draw identically but differ in a state nothing reads are
  // not the same setup, and collapsing them would lose the distinction the
  // moment something does read it.
  const plain = Tr2RenderStateSetup.fromPass(pass([ [ RS_CULLMODE, 1 ] ]));
  const stencilled = Tr2RenderStateSetup.fromPass(pass([
    [ RS_CULLMODE, 1 ],
    [ RS_STENCILENABLE, 1 ]
  ]));

  assert.notEqual(plain.Key(), stencilled.Key());
});

/** Projects authored render-state pairs through the setup into a WebGPU recipe. */
function webgpuOf(entries, options = undefined)
{
  return Tr2RenderStateSetup.fromPass(pass(entries)).GetWebgpuRecipe(options);
}

test("an unauthored setup projects to opaque back-face-culled depth state", () =>
{
  const recipe = webgpuOf([]);

  assert.deepEqual(recipe.primitive, { cullMode: "back", frontFace: "cw" });
  assert.equal(recipe.depthStencil.format, "depth24plus");
  assert.equal(recipe.depthStencil.depthWriteEnabled, true);
  assert.equal(recipe.depthStencil.depthCompare, "less-equal");
  assert.equal(recipe.depthStencil.depthBias, undefined);
  assert.equal(recipe.target.writeMask, 0xf);
  assert.equal(recipe.target.blend, undefined);
  assert.equal(recipe.blendConstant, null);
  assert.equal(recipe.alphaTest, null);
});

test("WebGPU cull mode is resolved against a clockwise front face", () =>
{
  // D3D names the winding to discard; WebGPU names the face. Carbon runs the
  // D3D default, so CULL_CW discards the front face.
  assert.equal(webgpuOf([ [ RS_CULLMODE, 1 ] ]).primitive.cullMode, "none");
  assert.equal(webgpuOf([ [ RS_CULLMODE, 2 ] ]).primitive.cullMode, "front");
  assert.equal(webgpuOf([ [ RS_CULLMODE, 3 ] ]).primitive.cullMode, "back");
});

test("Carbon's inverted cull override swaps the two windings", () =>
{
  // Tr2EffectStateManager::SetInvertedCullMode installs this as a global
  // RS_CULLMODE override, so the same registered setup draws both ways.
  assert.equal(
    webgpuOf([ [ RS_CULLMODE, 3 ] ], { invertedCullMode: true }).primitive.cullMode,
    "front"
  );
  assert.equal(
    webgpuOf([ [ RS_CULLMODE, 1 ] ], { invertedCullMode: true }).primitive.cullMode,
    "none"
  );
});

test("Carbon's inverted depth test swaps the ordered comparisons only", () =>
{
  assert.equal(
    webgpuOf([ [ RS_ZFUNC, 4 ] ], { invertedDepthTest: true }).depthStencil.depthCompare,
    "greater-equal"
  );
  assert.equal(
    webgpuOf([ [ RS_ZFUNC, 2 ] ], { invertedDepthTest: true }).depthStencil.depthCompare,
    "greater"
  );
  assert.equal(
    webgpuOf([ [ RS_ZFUNC, 3 ] ], { invertedDepthTest: true }).depthStencil.depthCompare,
    "equal"
  );
  assert.equal(
    webgpuOf([ [ RS_ZFUNC, 8 ] ], { invertedDepthTest: true }).depthStencil.depthCompare,
    "always"
  );
});

test("blend factors and equations translate to the WebGPU spellings", () =>
{
  const recipe = webgpuOf([
    [ RS_ALPHABLENDENABLE, 1 ],
    [ RS_SRCBLEND, 5 ],
    [ RS_DESTBLEND, 6 ]
  ]);

  assert.deepEqual(recipe.target.blend.color, {
    srcFactor: "src-alpha",
    dstFactor: "one-minus-src-alpha",
    operation: "add"
  });
  assert.deepEqual(recipe.target.blend.alpha, recipe.target.blend.color);
});

test("a D3D9-only blend factor fails rather than being approximated", () =>
{
  assert.throws(
    () => webgpuOf([ [ RS_ALPHABLENDENABLE, 1 ], [ RS_SRCBLEND, 12 ] ]),
    /no blend factor equivalent for Carbon's "bothSrcAlpha"/
  );
});

test("the colour write mask passes through as WebGPU channel bits", () =>
{
  assert.equal(webgpuOf([ [ RS_COLORWRITEENABLE, 0b0111 ] ]).target.writeMask, 0b0111);
});

test("depth bias converts into the depth format's integer units", () =>
{
  const recipe = webgpuOf(
    [
      [ RS_DEPTHBIAS, bitsOf(1 / (2 ** 24 - 1)) ],
      [ RS_SLOPESCALEDEPTHBIAS, bitsOf(-1.5) ]
    ],
    { depthFormat: "depth24plus" }
  );

  assert.equal(recipe.depthStencil.depthBias, 1);
  assert.equal(recipe.depthStencil.depthBiasSlopeScale, -1.5);
  assert.equal(recipe.depthStencil.depthBiasClamp, 0);
});

test("a slope-scaled bias alone needs no format conversion", () =>
{
  // The decal case: WebGPU takes the slope scale as a float, so a float depth
  // format is only refused when there is a constant bias to convert.
  const recipe = webgpuOf(
    [ [ RS_SLOPESCALEDEPTHBIAS, bitsOf(-1.5) ] ],
    { depthFormat: "depth32float" }
  );

  assert.equal(recipe.depthStencil.depthBias, 0);
  assert.equal(recipe.depthStencil.depthBiasSlopeScale, -1.5);
});

test("a float depth format cannot carry a fractional constant bias", () =>
{
  assert.throws(
    () => webgpuOf([ [ RS_DEPTHBIAS, bitsOf(0.0001) ] ], { depthFormat: "depth32float" }),
    /cannot be converted for depth format "depth32float"/
  );
});

test("a setup with no depth attachment omits depth state", () =>
{
  const recipe = webgpuOf([ [ RS_ZENABLE, 0 ], [ RS_ZWRITEENABLE, 0 ] ], { depthFormat: null });

  assert.equal(recipe.depthStencil, null);
});

test("depth state with no depth attachment fails rather than being dropped", () =>
{
  assert.throws(
    () => webgpuOf([ [ RS_ZWRITEENABLE, 1 ] ], { depthFormat: null }),
    /no depth attachment was supplied/
  );
});

test("a non-solid fill mode fails", () =>
{
  assert.throws(
    () => webgpuOf([ [ RS_FILLMODE, 2 ] ]),
    /cannot rasterize Carbon fill mode "wireframe"/
  );
});

test("a D3D9 state Carbon does not declare is left uninterpreted", () =>
{
  // RS_SCISSORTESTENABLE is 174 in D3D9 and in ccpwgl, but Carbon's
  // Tr2RenderContextEnum::RenderState jumps 173 -> 175, so 174 is a hole.
  // Interpreting it would invent a state a Carbon effect cannot author.
  const setup = Tr2RenderStateSetup.fromPass(pass([ [ 174, 1 ] ]));

  assert.deepEqual(setup.unhandled, [ { state: 174, value: 1 } ]);
});

test("BO_DISABLE means the setup is not blending", () =>
{
  // BO_DISABLE = 0 is a real Carbon BlendOperation member, not enum padding.
  // Reading it as an unmapped value would have thrown.
  const setup = Tr2RenderStateSetup.fromPass(pass([
    [ RS_ALPHABLENDENABLE, 1 ],
    [ RS_BLENDOP, 0 ]
  ]));

  assert.equal(setup.blend, null);
  assert.equal(setup.GetWebgpuRecipe().target.blend, undefined);
});

test("the shared vocabularies are aliased, not re-declared", () =>
{
  // One object, however many names. A second frozen copy with the same members
  // is a duplicate identity that drifts silently.
  assert.equal(Tr2RenderStateSetup.CompareFunc.CMP_LESSEQUAL, 4);
  assert.equal(Tr2RenderStateSetup.CullMode.CULLMODE_CCW, 3);
  assert.equal(Tr2RenderStateSetup.BlendOperation.BO_DISABLE, 0);
  assert.equal(Tr2RenderStateSetup.ColorWriteEnable.COLORWRITEENABLE_ALPHA, 8);
});
