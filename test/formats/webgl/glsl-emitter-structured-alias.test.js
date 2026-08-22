import test from "node:test";
import assert from "node:assert/strict";

import CjsWebglFormat from "../../../src/formats/webgl/index.js";
import { buildAliasedStructuredLoadDxbc, buildStructuredBufferPixelDxbc } from "./synthetic.js";

/**
 * `ld_structured` reads its address operand ONCE and writes every masked
 * destination component from that single read. The emitter scalarises the write
 * into one GLSL assignment per component, so when the destination register is
 * also the address register, the assignments must not re-read the address - the
 * first one has already overwritten it.
 *
 * This is not a theoretical hazard. It is the shape of EVE's skinned
 * bone-matrix fetch: the address is `blendIndex + boneArrayBase`, the
 * destination is a matrix row, and the third row lands on the index register.
 * Before this was fixed, rows two and three indexed the bone buffer with a
 * matrix float - roughly 1e9 - instead of a bone index, in EVERY vertex body of
 * EVERY technique of every skinned hull shader. It showed as shadows that were
 * wrong on skinned geometry only, because the Shadow technique loads a single
 * bone matrix and that corrupt matrix IS its gl_Position, while the Main
 * technique loads two and the clean one drives the visible pose.
 *
 * `movc` in the same emitter has always guarded the identical aliasing hazard
 * with a scoped temporary; this instruction simply did not.
 */

/**
 * A self-clobber: an assignment to `rN.c` that also reads `rN.c` as its
 * address. Deliberately independent of how the buffer lowers - a structured
 * buffer becomes a UBO (`.data[...]`) or a data texture (`texelFetch(...)`)
 * depending on the backend block, and the hazard is identical in both.
 */
const SELF_CLOBBER = /(r\d+)\.([xyzw])\s*=.*floatBitsToInt\(\1\.\2\)/;

test("a structured load whose destination aliases its address reads the address once", () =>
{
    const { source } = CjsWebglFormat.emitGlsl(buildAliasedStructuredLoadDxbc(0, 48), { source: "synthetic" });

    const offending = source.split("\n").find(line => SELF_CLOBBER.test(line));
    assert.equal(
        offending,
        undefined,
        `no component may re-read the address register it has already written; got: ${offending}`
    );

    // The address is hoisted, and hoisted ONCE - one temporary shared by every
    // component, not one per component, which would be the same bug rewritten.
    const hoists = source.split("\n").filter(line => /int\s+cjsSbAddr\s*=/.test(line));
    assert.equal(hoists.length, 1, "the aliased address is hoisted exactly once");

    // All four components still load, and each reads the hoisted temporary.
    const loads = source.split("\n").filter(line => /^\s*r\d+\.[xyzw]\s*=/.test(line) && /cjsSbAddr/.test(line));
    assert.equal(loads.length, 4, "every masked component is still loaded, from the hoisted address");
});

test("a structured buffer that does not alias its address is emitted unchanged", () =>
{
    // The guard is conditional on purpose: a non-aliasing shader must emit
    // byte-identical GLSL, so the fix cannot churn the whole corpus.
    const { source } = CjsWebglFormat.emitGlsl(buildStructuredBufferPixelDxbc(5, 4), { source: "synthetic" });

    assert.doesNotMatch(source, /cjsSbAddr/, "no temporary is introduced where nothing aliases");
    assert.match(source, /uniform highp usampler2D sb5;/, "the structured buffer is still declared");
});
