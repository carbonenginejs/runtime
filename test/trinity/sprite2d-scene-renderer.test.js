// Tr2Sprite2dScene renderer methods ported 2026-10-12: PrepareTriangleVerts, the layer
// stack (StartLayer/EndLayer), FlashDefaultTexture, the colour-space properties and the
// sRGB handling around embedded jobs. Every expected value is derived from the donor,
// E:\carbonengine\trinity\trinity\Sprite2d\Tr2Sprite2dScene.cpp, at the cited lines.
import assert from "node:assert/strict";
import test from "node:test";
import { Tr2Sprite2dScene, Tr2Sprite2dD3DVertex, Tr2Sprite2dVertexBase } from "../../npm/dist/trinity/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/context/Tr2RenderContext.js";

const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-5, `${label}: ${actual} vs ${expected}`);

/** Direct-draw mirrors as Carbon's OnPrepareResources sizes them (cpp:1247-1277), plus the root stacks (cpp:2382-2390). */
function storage(scene)
{
  scene._vertexBytes = new Uint8Array(scene.maxSpriteCount * 4 * 88);
  scene._vertexView = new DataView(scene._vertexBytes.buffer);
  scene._indexData = new Uint32Array(scene.maxSpriteCount * 6);
  scene._PrepareStacksBeforeRender();
}

/** An atlas-texture stand-in: ready, with a fixed window (x, y, scale x, scale y). */
function texture(window = [0.25, 0.5, 0.5, 0.25])
{
  const al = { GetWidth: () => 128, GetHeight: () => 64 };
  return {
    GetTexture: () => al, GetRenderTarget: () => null, IsGood: () => true,
    GetTextureWindow: out => { for (let i = 0; i < 4; i++) out[i] = window[i]; },
    GetTextureWidth: () => 128, GetTextureHeight: () => 64
  };
}

/** Swaps the main-thread context's state manager (and optional members) for the test body. */
function withMainContext(overrides, body)
{
  const main = Tr2RenderContext_GetMainThreadRenderContext();
  const saved = Object.keys(overrides).map(key => [key, Object.getOwnPropertyDescriptor(main, key)]);
  Object.assign(main, overrides);
  try { return body(main); }
  finally
  {
    for (const [key, descriptor] of saved)
    {
      if (descriptor) Object.defineProperty(main, key, descriptor);
      else delete main[key];
    }
  }
}

function sourceVertex(position, color, uv0, uv1)
{
  const vertex = new Tr2Sprite2dVertexBase();
  vertex.position.set(position);
  vertex.color.set(color);
  vertex.texCoord[0].set(uv0);
  vertex.texCoord[1].set(uv1);
  return vertex;
}

test("PrepareTriangleVerts writes Carbon's fields: colour product, transformed windowed UVs, packed blend", () =>
{
  const scene = new Tr2Sprite2dScene();

  scene.SetSpriteEffect(32); // TR2_SFX_COPY: one texture (cpp:1814-1816)
  scene.SetTexture(0, texture(), 0);
  // Row-vector texture transform, rotated and non-uniformly scaled: row 1 = (0, 2), row 2 = (-3, 0), translation (0.1, 0.2).
  const matrix = new Float32Array([0, 2, 0, 0, -3, 0, 0, 0, 0, 0, 1, 0, 0.1, 0.2, 0, 1]);
  scene.SetTextureTransform(0, matrix);
  scene.SetColor([0.5, 0.25, 1, 0.5]);
  scene.SetBlendmode(2);
  scene.SetSpriteTarget(3);
  scene.SetGlowBrightness(1.5);
  scene.SetTileMode(0x18 | 0x01);

  const source = [sourceVertex([1, 2, 3], [0.2, 0.4, 0.6, 0.8], [0.25, 0.5], [7, 7])];
  const dest = [new Tr2Sprite2dD3DVertex()];
  dest[0].texCoord[1].set([9, 9]);
  dest[0].transformIndex = 7;
  dest[0].outlineThreshold = 0.75;
  Object.assign(dest[0].clipRect, { left: 1, top: 2, right: 3, bottom: 4 });

  assert.equal(scene.PrepareTriangleVerts(dest, source, 32, 1), true);
  const out = dest[0];

  // cpp:948-950 copies the position.
  assert.deepEqual(Array.from(out.position), [1, 2, 3]);
  // cpp:952-955: source colour times m_color, per channel.
  [0.2 * 0.5, 0.4 * 0.25, 0.6 * 1, 0.8 * 0.5].forEach((value, i) => near(out.color[i], value, "color" + i));
  // cpp:962-970: uv = Transform( Vector4( 0.25, 0.5, 0, 1 ), m ) = (0.25*0 + 0.5*-3 + 0.1, 0.25*2 + 0.5*0 + 0.2)
  // = (-1.4, 0.7), then uv * window.zw + window.xy = (-1.4*0.5 + 0.25, 0.7*0.25 + 0.5) = (-0.45, 0.675).
  near(out.texCoord[0][0], -0.45, "u");
  near(out.texCoord[0][1], 0.675, "v");
  // cpp:957 converts only the textures the effect uses; texCoord[1], the clip and outline keep their values.
  assert.deepEqual(Array.from(out.texCoord[1]), [9, 9]);
  assert.deepEqual([out.clipRect.left, out.clipRect.top, out.clipRect.right, out.clipRect.bottom], [1, 2, 3, 4]);
  assert.equal(out.outlineThreshold, 0.75);
  // cpp:986-991 and ITr2Sprite2dRenderer.h:120-123: PackBlendMode(2, 3) = 2 | 3 << 3 = 26; SetTileMode masks to TILE_X|TILE_Y = 0x18.
  near(out.glowBrightness, 1.5, "glow");
  assert.equal(out.blendMode, 26);
  assert.equal(out.spriteEffect, 32);
  assert.equal(out.tileMode, 0x18);
  assert.equal(out.transformIndex, 0);
});

test("PrepareTriangleVerts refuses unready textures and copies raw UVs when anti-aliased", () =>
{
  const scene = new Tr2Sprite2dScene();

  // cpp:929-933 with TexturesReady (cpp:811-826): a needed texture that is not good stops the call.
  scene.SetSpriteEffect(32);
  const notReady = { ...texture(), IsGood: () => false };
  scene.SetTexture(0, notReady, 0);
  const dest = [new Tr2Sprite2dD3DVertex()];
  assert.equal(scene.PrepareTriangleVerts(dest, [sourceVertex([5, 5, 5], [1, 1, 1, 1], [0, 0], [0, 0])], 32, 1), false);
  assert.deepEqual(Array.from(dest[0].position), [0, 0, 0]);

  // TR2_SFX_FILL_AA uses no texture (cpp:1809-1821) and cpp:980-984 copies both source UVs untouched.
  scene.SetSpriteEffect(1);
  assert.equal(scene.PrepareTriangleVerts(dest, [sourceVertex([5, 5, 5], [1, 1, 1, 1], [0.3, 0.6], [1.5, -2])], 32, 1), true);
  near(dest[0].texCoord[0][0], 0.3, "aa u0");
  near(dest[0].texCoord[0][1], 0.6, "aa v0");
  near(dest[0].texCoord[1][0], 1.5, "aa u1");
  near(dest[0].texCoord[1][1], -2, "aa v1");
});

test("prepared triangles submit with the composed transform, offset indices and the transformed clip", () =>
{
  const scene = new Tr2Sprite2dScene();
  storage(scene);

  // Parent: rotation by 30 degrees with non-uniform scale (2, 0.5) and translation (10, 20), row-vector bytes.
  const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
  const parent = new Float32Array([2 * c, 2 * s, 0, 0, -0.5 * s, 0.5 * c, 0, 0, 0, 0, 1, 0, 10, 20, 0, 1]);
  scene.PushTransform(parent);
  scene.PushClipRectangle(0, 0, 4, 6);
  scene.PushTranslation([3, -1]);

  const dest = [new Tr2Sprite2dD3DVertex(), new Tr2Sprite2dD3DVertex(), new Tr2Sprite2dD3DVertex()];
  const source = [sourceVertex([0, 0, 0.5], [1, 1, 1, 1], [0, 0], [0, 0]), sourceVertex([1, 0, 0.5], [1, 1, 1, 1], [0, 0], [0, 0]), sourceVertex([0, 1, 0.5], [1, 1, 1, 1], [0, 0], [0, 0])];
  assert.equal(scene.PrepareTriangleVerts(dest, source, 32, 3), true);

  scene.RenderTriangleVerts(dest, 3, [0, 1, 2], 3);
  scene.RenderTriangleVerts(dest, 3, [2, 1, 0], 3);

  // CopyIndicesWithOffset (cpp:2498-2509) adds the vertex offset: 0 for the first batch, 3 for the second.
  assert.deepEqual(Array.from(scene._indexData.slice(0, 6)), [0, 1, 2, 5, 4, 3]);

  // ProcessVertices (cpp:1851-1858, 1892-1898): a matrix top takes the next palette slot, and the
  // vertex positions stay local. PushTranslation under a matrix stores TranslationMatrix(t) * parent
  // (cpp:410-411), so in Carbon's row-vector convention a local point p lands at (p + t) * parent.
  const view = scene._vertexView;
  assert.equal(view.getUint8(64), 1);
  assert.equal(view.getUint8(88 + 64), 1); // one palette slot per call, shared by its vertices
  assert.equal(view.getUint8(3 * 88 + 64), 2);
  near(view.getFloat32(0, true), 0, "local x");
  near(view.getFloat32(8, true), 0.5, "2D context keeps the source z");
  const stored = scene._transformArray[1];
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [2.5, -4]])
  {
    const px = x + 3, py = y - 1;
    const expectedX = px * parent[0] + py * parent[4] + parent[12];
    const expectedY = px * parent[1] + py * parent[5] + parent[13];
    near(x * stored[0] + y * stored[4] + stored[12], expectedX, "palette x");
    near(x * stored[1] + y * stored[5] + stored[13], expectedY, "palette y");
  }

  // PushClipRectangle under a matrix (cpp:589-643): the four corners go through the row-vector
  // transform and the clip is their axis-aligned bounds, intersected with the root clip.
  const corners = [[0, 0], [4, 0], [4, 6], [0, 6]].map(([x, y]) => [x * parent[0] + y * parent[4] + parent[12], x * parent[1] + y * parent[5] + parent[13]]);
  const bounds = [Math.min(...corners.map(p => p[0])), Math.min(...corners.map(p => p[1])), Math.max(...corners.map(p => p[0])), Math.max(...corners.map(p => p[1]))];
  bounds.forEach((value, i) => near(view.getFloat32(44 + i * 4, true), value, "clip" + i));

  scene.PopTranslation(); scene.PopClipRectangle(); scene.PopTransform();
  assert.equal(scene.GetMaxIndexCountPerDrawCall(), 1024 * 6); // cpp:2188-2191
  assert.equal(scene.GetMaxVertexCountPerDrawCall(), 1024 * 4); // cpp:2183-2186
});

test("layers set the stacks aside, nest, and restore them while drawing each layer as a quad", () =>
{
  const calls = [];
  const esm = {
    PushRenderTarget__TextureAL: target => calls.push(["push", target]),
    PopRenderTarget: () => calls.push(["pop"]),
    ApplyIndexBuffer() {}, ApplyStreamSource() {}
  };

  withMainContext({ GetEffectStateManager: () => esm }, () =>
  {
    const scene = new Tr2Sprite2dScene();
    storage(scene);
    scene.is2dRender = false;
    scene._is2dRenderContext = false;
    scene.displayWidth = 300;
    scene.displayHeight = 200;

    const outerTransforms = scene._transformStack, outerClips = scene._clipStack;
    const outer = { GetWidth: () => 64, GetHeight: () => 32 }, inner = { GetWidth: () => 16, GetHeight: () => 8 };

    // StartLayer (cpp:1593-1630): 2D context, target pushed, viewport (w, h, 0, 1), stacks set
    // aside and replaced by an empty transform stack and a clip of the target's extent.
    scene.StartLayer(outer);
    assert.equal(scene._is2dRenderContext, true);
    assert.deepEqual(calls, [["push", outer]]);
    assert.deepEqual(Array.from(scene._viewportSizeValue), [64, 32, 0, 1]);
    assert.equal(scene._stackOfStacks.length, 1);
    assert.equal(scene._stackOfStacks[0].transformStack, outerTransforms);
    assert.equal(scene._stackOfStacks[0].clipStack, outerClips);
    assert.equal(scene._stackOfStacks[0].renderTargetWrapper.GetRenderTarget(), outer);
    assert.equal(scene._transformStack.length, 0);
    assert.deepEqual([scene.GetClipRectangle().left, scene.GetClipRectangle().top, scene.GetClipRectangle().right, scene.GetClipRectangle().bottom], [0, 0, 64, 32]);

    const layerTransforms = scene._transformStack, layerClips = scene._clipStack;
    scene.StartLayer(inner);
    assert.equal(scene._stackOfStacks.length, 2);
    assert.deepEqual([scene.GetClipRectangle().right, scene.GetClipRectangle().bottom], [16, 8]);

    // EndLayer (cpp:1632-1684) of the nested layer: target popped, the outer layer's stacks are
    // back, the context stays 2D because a layer is still open, and the layer is drawn as a quad
    // from (x, y) with s_layerIndices { 0, 1, 3, 3, 1, 2 } under the outer layer's clip.
    scene.EndLayer(2, 3, 10, 5, null);
    assert.deepEqual(calls.at(-1), ["pop"]);
    assert.equal(scene._stackOfStacks.length, 1);
    assert.equal(scene._transformStack, layerTransforms);
    assert.equal(scene._clipStack, layerClips);
    assert.equal(scene._is2dRenderContext, true);
    assert.equal(scene._texture[0].GetRenderTarget(), inner);
    assert.deepEqual(Array.from(scene._indexData.slice(0, 6)), [0, 1, 3, 3, 1, 2]);
    const view = scene._vertexView;
    // PrepareSpriteVerts corners (cpp:852-857): pos, pos + (w, 0), pos + (w, h), pos + (0, h).
    [[2, 3], [12, 3], [12, 8], [2, 8]].forEach(([x, y], i) =>
    {
      near(view.getFloat32(i * 88, true), x, "corner x" + i);
      near(view.getFloat32(i * 88 + 4, true), y, "corner y" + i);
    });
    [0, 0, 64, 32].forEach((value, i) => near(view.getFloat32(44 + i * 4, true), value, "layer clip" + i));
    // DetermineViewportSize (cpp:2313-2334) republishes the scene size with z = is2dRender (0).
    assert.deepEqual(Array.from(scene._viewportSizeValue), [300, 200, 0, 1]);

    // Closing the last layer restores the scene's own stacks and its 3D context (cpp:1677-1681).
    scene.EndLayer(0, 0, 1, 1, null);
    assert.equal(scene._stackOfStacks.length, 0);
    assert.equal(scene._transformStack, outerTransforms);
    assert.equal(scene._clipStack, outerClips);
    assert.equal(scene._is2dRenderContext, false);
    assert.deepEqual(calls.map(call => call[0]), ["push", "push", "pop", "pop"]);
  });
});

test("an EndLayer whose PrepareSpriteVerts fails draws an all-zero quad, even after a successful EndLayer", () =>
{
  const esm = { PushRenderTarget__TextureAL() {}, PopRenderTarget() {}, ApplyIndexBuffer() {}, ApplyStreamSource() {} };

  withMainContext({ GetEffectStateManager: () => esm }, () =>
  {
    const scene = new Tr2Sprite2dScene();
    storage(scene);

    // Record the vertices EndLayer hands to RenderTriangleVerts (cpp:1673), then draw them as usual.
    const drawn = [];
    const render = scene.RenderTriangleVerts.bind(scene);
    scene.RenderTriangleVerts = (vertices, vertexCount, indices, indexCount) =>
    {
      drawn.push(vertices.slice(0, vertexCount).map(v => ({ position: Array.from(v.position), color: Array.from(v.color) })));
      render(vertices, vertexCount, indices, indexCount);
    };

    const target = { GetWidth: () => 64, GetHeight: () => 32 };

    // A successful EndLayer: no texture is needed (effect 0), so PrepareSpriteVerts writes the
    // corners pos, pos + (w, 0), pos + (w, h), pos + (0, h) (cpp:852-857) at depth 0.
    scene.StartLayer(target);
    scene.EndLayer(2, 3, 10, 5, null);
    assert.deepEqual(drawn[0].map(v => v.position), [[2, 3, 0], [12, 3, 0], [12, 8, 0], [2, 8, 0]]);

    // TR2_SFX_TWO_TEXTURES (64) needs two textures (SetSpriteEffect, cpp:1814-1821); the secondary
    // one is not good, so TexturesReady fails and PrepareSpriteVerts returns false before writing
    // (cpp:836-840). EndLayer ignores that and draws its fresh stack array
    // `Tr2Sprite2dD3DVertex vertices[4]` (cpp:1669-1673), whose Vector3 and Color members
    // zero-construct (math/include/Vector3_inline.h:5-9, Color_inline.h:6-12): all positions and
    // colours are 0, not the previous layer's quad.
    scene.SetSpriteEffect(64);
    const notReady = { ...texture(), IsGood: () => false };
    scene.StartLayer(target);
    scene.EndLayer(4, 5, 6, 7, { Apply: (renderer, index) => renderer.SetTexture(index, notReady, 0) });
    assert.equal(drawn.length, 2);
    for (const vertex of drawn[1])
    {
      assert.deepEqual(vertex.position, [0, 0, 0]);
      assert.deepEqual(vertex.color, [0, 0, 0, 0]);
    }
  });
});

test("FlashDefaultTexture writes the next grey level into the 2x2 default texture", () =>
{
  const scene = new Tr2Sprite2dScene();
  const data = new Uint8Array(16);
  let unlocks = 0;
  scene._defaultTexture = { LockBuffer: () => ({ data, pitch: 8 }), UnlockBuffer: () => { unlocks++; } };

  // Off by default (cpp:2224): nothing is locked.
  scene._FlashDefaultTexture();
  assert.equal(unlocks, 0);

  // cpp:2226-2247: pixel = 0xff000000 | f << 16 | f << 8 | f, little-endian bytes f, f, f, 0xff,
  // written to both pixels of both rows; f starts at 0 and steps by 5 modulo 255.
  scene.defaultTextureUpdates = true;
  scene._FlashDefaultTexture();
  assert.deepEqual(Array.from(data), [0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]);
  scene._FlashDefaultTexture();
  assert.deepEqual(Array.from(data), [5, 5, 5, 255, 5, 5, 5, 255, 5, 5, 5, 255, 5, 5, 5, 255]);
  scene._defaultTextureFlash = 250;
  scene._FlashDefaultTexture();
  assert.equal(scene._defaultTextureFlash, 0);
  assert.equal(unlocks, 3);
});

test("colour-space Blue properties set the ubershader options and sRGB writes around embedded jobs", () =>
{
  const scene = new Tr2Sprite2dScene();

  // Tr2Sprite2dScene_Blue.cpp:229-239: two MAP_PROPERTY pairs; defaults false and true (cpp:121-122).
  assert.deepEqual(CjsSchema.getSchema(Tr2Sprite2dScene).properties.map(p => p.name), ["useLinearColorSpace", "gammaCorrectText"]);
  assert.equal(scene.useLinearColorSpace, false);
  assert.equal(scene.gammaCorrectText, true);

  // SetUseLinearColorSpace (cpp:2636-2647) sets COLOR_SPACE on both ubershaders;
  // SetGammaCorrectText (cpp:2648-2652) sets FONT_GAMMACORRECT on the 2D one only.
  scene.useLinearColorSpace = true;
  scene.gammaCorrectText = false;
  assert.equal(scene.ubershader2d.GetOption("COLOR_SPACE"), "COLOR_SPACE_LINEAR");
  assert.equal(scene.ubershader3d.GetOption("COLOR_SPACE"), "COLOR_SPACE_LINEAR");
  assert.equal(scene.ubershader2d.GetOption("FONT_GAMMACORRECT"), "DISABLED");
  assert.equal(scene.ubershader3d.GetOption("FONT_GAMMACORRECT"), "");

  // RunJobHelper (cpp:2139-2175): sRGB writes (RS_SRGBWRITEENABLE = 194) go off for the job and back on after.
  const calls = [];
  const esm = {};
  for (const name of ["EndManagedRendering", "PopDepthStencilBuffer", "PushRenderTarget__TextureAL", "PushViewport", "PopViewport", "PopRenderTarget", "PushDepthStencilBuffer__TextureAL", "BeginManagedRendering", "ApplyStandardStates", "ApplyVertexDeclaration"])
    esm[name] = () => calls.push(name);
  withMainContext({ GetEffectStateManager: () => esm, SetRenderState: (state, value) => calls.push(`srgb${state}=${value}`) }, () =>
  {
    scene._realTime = 11; scene._simTime = 13;
    scene.RunJobHelper({ Run(real, sim) { calls.push(`job${real},${sim}`); } });
  });
  assert.deepEqual(calls, ["EndManagedRendering", "srgb194=0", "PopDepthStencilBuffer", "PushRenderTarget__TextureAL", "PushViewport", "job11,13", "PopViewport", "PopRenderTarget", "PushDepthStencilBuffer__TextureAL", "BeginManagedRendering", "ApplyStandardStates", "srgb194=1", "ApplyVertexDeclaration"]);
});
