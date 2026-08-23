import test from "node:test";
import assert from "node:assert/strict";

import CjsWebglFormat from "../../../src/formats/webgl/index.js";
import { buildTwoSamplerPixelDxbc } from "./synthetic.js";

/**
 * WebGL2 does REPEAT, MIRRORED_REPEAT and CLAMP_TO_EDGE natively. It has no
 * CLAMP_TO_BORDER (only under `EXT_texture_border_clamp`, which our desktop
 * contexts do not expose) and no MIRROR_ONCE, so those two are emulated here.
 *
 * The mode is read at RUNTIME from a constant buffer, because ccpwgl resolves
 * sampler overrides after translation and shares one translated GLSL across
 * every instance of an effect. Baking the container's mode would be wrong in
 * both directions: an override that adds border would do nothing, and one that
 * removes it would leave the test clamping against the override.
 *
 * Sampler registers 0 and 1, resource registers 5 and 6 — deliberately
 * different, so a resource-keyed implementation is distinguishable from a
 * sampler-keyed one.
 */

const DXBC = buildTwoSamplerPixelDxbc([ 0, 1 ], [ 5, 6 ]);
const addressing = (textures, extra = {}) => ({ textures, ...extra });

// The buffer is identified by REGISTER, not by a marker field. `cjsSemantic` is
// reserved vocabulary for the local-light family and the block writer throws on
// any other value, and the wire drops fields it does not encode - so an invented
// marker would vanish for every effect loaded from bytes. Carbon declares only
// cb0-4, 6 and 7 across all 537 shipped effects, so 8 and above is ours.
const CARBON_LAST_CB = 7;
const isAddressBuffer = (b) => b.kind === "constantBuffer" && b.registerIndex > CARBON_LAST_CB;

test("without the profile nothing is emitted", () =>
{
    const result = CjsWebglFormat.emitGlsl(DXBC, { source: "synthetic" });

    assert.doesNotMatch(result.source, /cjsAddress/u);
    assert.doesNotMatch(result.source, /cb8/u);
});

test("a shader whose textures are unlisted is byte-identical to one emitted without the profile", () =>
{
    // The cost argument rests on this: a shader that needs no emulation must
    // not pay for it, not even a helper definition or a buffer declaration.
    const off = CjsWebglFormat.emitGlsl(DXBC, { source: "synthetic" });
    const on = CjsWebglFormat.emitGlsl(DXBC, {
        source: "synthetic",
        emulatedAddressing: addressing([ { registerIndex: 11 } ])
    });

    assert.equal(on.source, off.source);
});

test("listing a texture the shader never samples declares no buffer", () =>
{
    // The buffer is declared lazily, at the first addressed sample. A caller
    // passing a superset - which is the intended usage, since it is what lets an
    // override correct a wrong container - must not force a cb8 onto shaders
    // that never touch those textures, or every consumer would have to upload
    // one for shaders that cannot read it.
    const off = CjsWebglFormat.emitGlsl(DXBC, { source: "synthetic" });
    const on = CjsWebglFormat.emitGlsl(DXBC, {
        source: "synthetic",
        emulatedAddressing: addressing([ { registerIndex: 2 }, { registerIndex: 9 } ])
    });

    assert.equal(on.source, off.source);
    assert.doesNotMatch(on.source, /cb8/u);
    assert.equal(on.bindings.filter(isAddressBuffer).length, 0);
});

test("the binding is the consumer's signal, present only when the buffer is", () =>
{
    // A consumer must upload cb8 if and only if this binding appears. Deciding
    // from the profile it passed in would upload to shaders that never declared
    // the buffer, and getUniformLocation returns null for those - a silent
    // no-op that looks like the upload worked.
    const unused = CjsWebglFormat.emitGlsl(DXBC, {
        source: "synthetic",
        emulatedAddressing: addressing([ { registerIndex: 9 } ])
    });
    const used = CjsWebglFormat.emitGlsl(DXBC, {
        source: "synthetic",
        emulatedAddressing: addressing([ { registerIndex: 6 } ])
    });

    const has = (r) => r.bindings.some(isAddressBuffer);

    assert.equal(has(unused), false, "no binding when nothing was addressed");
    assert.equal(has(used), true, "binding present when the buffer was declared");
    assert.equal(has(used), /uniform vec4 cb8\[/u.test(used.source), "binding tracks the declaration");
});

test("addressing is keyed by RESOURCE register, not sampler register", () =>
{
    // Five decal textures share one D3D sampler in decalv5 and can each resolve
    // to a different mode, so the sampler register cannot be the key. Resource 6
    // is listed; resource 5, which uses the other sampler, must be untouched.
    const result = CjsWebglFormat.emitGlsl(DXBC, {
        source: "synthetic",
        emulatedAddressing: addressing([ { registerIndex: 6 } ])
    });

    assert.match(result.source, /cjsAddressBorder\(texture\(s6,/u);
    assert.match(result.source, /^\s*\S+ = texture\(s5,/mu);
    assert.doesNotMatch(result.source, /cjsAddress\w+\(texture\(s5,/u);
});

test("the mode comes from the buffer at runtime, and only the colour is baked", () =>
{
    const result = CjsWebglFormat.emitGlsl(DXBC, {
        source: "synthetic",
        emulatedAddressing: addressing([ { registerIndex: 6, borderColor: [ 1, 1, 1, 1 ] } ])
    });

    // The register indexes the buffer; nothing about the mode is a literal.
    assert.match(result.source, /cb8\[6\]\.xy/u);
    assert.match(result.source, /vec4\(1\.0, 1\.0, 1\.0, 1\.0\)/u);
    assert.doesNotMatch(result.source, /cjsAddressBorder\([^;]*vec2\(1\.0, 1\.0\)/u);
});

test("zero means nothing to emulate, and the helpers say so", () =>
{
    // Every failure produces 0 - a zeroed buffer, an absent upload, a texture
    // the consumer did not know about. Carbon's enum starts at 1, so 0 cannot
    // swallow a real mode, and the shader must sample unchanged.
    const result = CjsWebglFormat.emitGlsl(DXBC, {
        source: "synthetic",
        emulatedAddressing: addressing([ { registerIndex: 6 } ])
    });

    assert.match(result.source, /int\(modes\.x\) == 4/u, "border is mode 4");
    assert.match(result.source, /int\(modes\.x\) == 5/u, "mirror-once is mode 5");
    assert.doesNotMatch(result.source, /int\(modes\.\w\) == 0/u, "0 is never tested for");
});

test("the buffer is declared once, sized to the highest listed register", () =>
{
    const result = CjsWebglFormat.emitGlsl(DXBC, {
        source: "synthetic",
        emulatedAddressing: addressing([ { registerIndex: 5 }, { registerIndex: 6 } ])
    });

    const declarations = result.source.match(/uniform vec4 cb8\[\d+\];/gu) ?? [];

    assert.equal(declarations.length, 1, "declared exactly once");
    assert.equal(declarations[0], "uniform vec4 cb8[7];", "sized to highest register + 1");
});

test("the buffer is announced on the bindings so a consumer can find it", () =>
{
    const result = CjsWebglFormat.emitGlsl(DXBC, {
        source: "synthetic",
        emulatedAddressing: addressing([ { registerIndex: 6 } ])
    });

    const binding = result.bindings.find(isAddressBuffer);

    assert.ok(binding, "binding is present");
    assert.equal(binding.kind, "constantBuffer");
    assert.equal(binding.registerIndex, 8);
    assert.equal(binding.name, "cb8");
    assert.equal(binding.sizeInVec4, 7);
});

test("the buffer register is caller-chosen", () =>
{
    const result = CjsWebglFormat.emitGlsl(DXBC, {
        source: "synthetic",
        emulatedAddressing: addressing([ { registerIndex: 6 } ], { bufferRegister: 9 })
    });

    assert.match(result.source, /uniform vec4 cb9\[7\];/u);
    assert.match(result.source, /cb9\[6\]\.xy/u);
});

test("colliding with a declared constant buffer is refused, not silently doubled", () =>
{
    // Two `uniform vec4 cbN[]` in one unit is a GLSL redefinition error that
    // nothing downstream checks, so it has to be caught where the register is
    // still attributable to a caller's choice.
    //
    // The fixture declares DXBC slot 0, which on a PIXEL stage is remapped to
    // the name `cb7`. So the collision is at 7, not 0 — comparing the caller's
    // register against the slot key would miss it and emit two `cb7`s.
    const withBuffer = buildTwoSamplerPixelDxbc([ 0, 1 ], [ 5, 6 ], 0);

    assert.match(
        CjsWebglFormat.emitGlsl(withBuffer, { source: "synthetic" }).source,
        /uniform vec4 cb7\[/u,
        "the fixture's slot 0 really does emit as cb7"
    );

    assert.throws(
        () => CjsWebglFormat.emitGlsl(withBuffer, {
            source: "synthetic",
            emulatedAddressing: addressing([ { registerIndex: 6 } ], { bufferRegister: 7 })
        }),
        /collides with a declared constant buffer/u
    );

    // ...and a non-colliding register on the same shader is still fine.
    assert.match(
        CjsWebglFormat.emitGlsl(withBuffer, {
            source: "synthetic",
            emulatedAddressing: addressing([ { registerIndex: 6 } ], { bufferRegister: 8 })
        }).source,
        /uniform vec4 cb8\[7\];/u
    );
});

test("a malformed border colour is refused, not defaulted", () =>
{
    // Defaulting would substitute transparent black - the common case - and so
    // hide the mistake precisely in the effects that differ from it.
    assert.throws(
        () => CjsWebglFormat.emitGlsl(DXBC, {
            source: "synthetic",
            emulatedAddressing: addressing([ { registerIndex: 6, borderColor: [ 1, "x", 1, 1 ] } ])
        }),
        /Border colour components must be finite numbers/u
    );
});

test("an entry without a resource register is refused", () =>
{
    assert.throws(
        () => CjsWebglFormat.emitGlsl(DXBC, {
            source: "synthetic",
            emulatedAddressing: addressing([ { borderColor: [ 0, 0, 0, 0 ] } ])
        }),
        /integer resource registerIndex/u
    );
});

test("the profile is rejected under a misspelled name", () =>
{
    // A silently ignored option presents as "border still does not work", which
    // is the failure this whole mechanism exists to remove.
    assert.throws(
        () => CjsWebglFormat.emitGlsl(DXBC, { source: "synthetic", emulatedAddressed: {} }),
        /unknown emitGlsl option/u
    );
});

test("a texture whose mode arrives at bind time is gated even when the container says wrap", () =>
{
    // The container declares pattern samplers as WRAP; Carbon applies the real
    // mode later through a sampler override (EveSOF.cpp:639). A container-only
    // rule emits no gate for them, and the override then degrades to edge -
    // which is exactly why border on patterns rendered as clamp-to-edge.
    //
    // Here the caller lists the texture explicitly, which is the mechanism the
    // packager uses for PatternMask*Map.
    const result = CjsWebglFormat.emitGlsl(DXBC, {
        source: "synthetic",
        emulatedAddressing: addressing([ { registerIndex: 6 } ])
    });

    // No sampler in this fixture declares an emulated mode at all.
    assert.match(result.source, /cjsAddressBorder\(texture\(s6,/u);
    assert.match(result.source, /uniform vec4 cb8\[/u);
});
