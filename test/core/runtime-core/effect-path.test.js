import assert from "node:assert/strict";
import test from "node:test";
import { Tr2PlatformInfo } from "../../../npm/dist/core/index.js";
import { Tr2Effect } from "../../../npm/dist/trinity/shader/index.js";
import { normalizeResourcePath } from "../../../npm/dist/global/utils/path.js";

test("Tr2Effect.resolveEffectPath substitutes the platform name Carbon substitutes", () =>
{
    assert.equal(
        Tr2Effect.resolveEffectPath("res:/graphics/effect/space/quadv5.fx", { platformName: "webgpu" }),
        "res:/graphics/effect/space/quadv5.fx".replace("/effect/", "/effect.webgpu/").replace(".fx", ".sm_depth")
    );

    assert.equal(
        Tr2Effect.resolveEffectPath("RES:\\Graphics\\Effect\\Space\\QuadV5.fx", { platformName: "webgl", shaderModel: "medium" }),
        "res:/graphics/effect.webgl/space/quadv5.sm_hi"
    );
});

test("Tr2Effect.resolveEffectPath leaves an already-qualified tree alone", () =>
{
    // Substitution touches `/effect/` only, which is what lets a qualified path
    // override the configured default with no second mechanism - and it is how
    // CCP's own trees are reachable while testing.
    assert.equal(
        Tr2Effect.resolveEffectPath("res:/graphics/effect.gles2/space/quadv5.fx", { platformName: "webgl" }),
        "res:/graphics/effect.gles2/space/quadv5.sm_depth"
    );

    // A compiled path is already the answer.
    assert.equal(
        Tr2Effect.resolveEffectPath("res:/graphics/effect.webgpu/space/quadv5.sm_hi", { platformName: "webgpu" }),
        "res:/graphics/effect.webgpu/space/quadv5.sm_hi"
    );

    assert.equal(Tr2Effect.resolveEffectPath("", { platformName: "webgpu" }), "");
});

test("Tr2Effect.resolveEffectPath fails loudly rather than resolving to something unloadable", () =>
{
    // Without a platform name the substitution cannot happen, and a quiet
    // pass-through would surface much later as a missing resource.
    assert.throws(
        () => Tr2Effect.resolveEffectPath("res:/graphics/effect/space/quadv5.fx", {}),
        /platform name/
    );

    assert.throws(() => Tr2Effect.shaderModelSuffix("ultra"), RangeError);
});

test("Tr2Effect.shaderModelSuffix follows the tier policy, not the suffix spelling", () =>
{
    // .sm_depth is the HIGH tier and is not a depth-only shader; .sm_hi is
    // MEDIUM. Reading the names literally is what makes a texture-budget
    // measurement describe the wrong variant.
    assert.equal(Tr2Effect.shaderModelSuffix("high"), "sm_depth");
    assert.equal(Tr2Effect.shaderModelSuffix("medium"), "sm_hi");
    assert.equal(Tr2Effect.shaderModelSuffix("low"), "sm_lo");
    assert.equal(Tr2Effect.shaderModelSuffix("sm_depth"), "sm_depth");
});

test("normalizeResourcePath routes on one spelling", () =>
{
    assert.equal(
        normalizeResourcePath("RES:\\Graphics\\Effect\\Space\\QuadV5.fx"),
        "res:/graphics/effect/space/quadv5.fx"
    );
    assert.equal(normalizeResourcePath(null), "");
});

test("Tr2PlatformInfo resolves against its own platform name", async () =>
{
    const platform = await Tr2PlatformInfo.Detect({
        webgl: false,
        adapter: { info: {}, features: new Set(), limits: {} }
    });

    assert.equal(
        Tr2Effect.resolveEffectPath("res:/graphics/effect/space/quadv5.fx", { platformName: platform.platformName }),
        "res:/graphics/effect.webgpu/space/quadv5.sm_depth"
    );

    // No backend committed, no tree to resolve into.
    const none = await Tr2PlatformInfo.Detect({ gpu: null, webgl: false });
    assert.throws(() => Tr2Effect.resolveEffectPath("res:/graphics/effect/space/quadv5.fx", { platformName: none.platformName }));
});
