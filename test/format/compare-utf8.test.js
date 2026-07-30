import test from "node:test";
import assert from "node:assert/strict";

import { compareUtf8 } from "../../src/format/compareUtf8.js";
import { compareAnnotationNames } from "../../src/format/carbonEffect/carbonEffectRecords.js";
import { compareTableBlobs } from "../../src/format/CjsStringTable.js";

test("compareUtf8 orders by unsigned UTF-8 byte", () =>
{
    assert.ok(compareUtf8("a", "b") < 0);
    assert.ok(compareUtf8("b", "a") > 0);
    assert.equal(compareUtf8("same", "same"), 0);
    assert.ok(compareUtf8("a", "ab") < 0);
    assert.ok(compareUtf8("", "a") < 0);
    assert.equal(compareUtf8("", ""), 0);
});

test("compareUtf8 sorts multi-byte sequences by byte, not by code unit", () =>
{
    // U+FF21 encodes as ef bc a1; U+00FF as c3 bf. By code unit 0x00ff < 0xff21,
    // by UTF-8 byte 0xc3 < 0xef — same direction here, so pick a case where the
    // orders genuinely diverge: a surrogate pair (U+1F600, f0 9f 98 80) against
    // U+FFFD (ef bf bd). Code units put the surrogate 0xD83D first; bytes put
    // 0xef first.
    assert.ok(compareUtf8("\u{1F600}", "�") > 0);
    assert.ok("\u{1F600}" < "�");
});

test("compareUtf8 differs from localeCompare exactly where it matters", () =>
{
    // Case. localeCompare treats it as a minor difference and puts "a" first;
    // bytes put "Z" (0x5a) before "a" (0x61). Technique names are capitalised and
    // generated symbols are not, so a mixed sort would reorder under locale rules.
    assert.ok(compareUtf8("Z", "a") < 0);
    assert.ok("Z".localeCompare("a") > 0);

    // Punctuation. Every binding identity we sort contains "-", ":" and "@", and
    // locale collation gives them variable weight rather than code-point order.
    const identities = [
        "sampled-resource:0:11@fragment",
        "sampled_resource:0:11@fragment",
        "sampledresource:0:11@fragment"
    ];
    const byBytes = identities.slice().sort(compareUtf8);
    assert.deepEqual(byBytes, [
        "sampled-resource:0:11@fragment",
        "sampled_resource:0:11@fragment",
        "sampledresource:0:11@fragment"
    ]);
    assert.notDeepEqual(identities.slice().sort((a, b) => a.localeCompare(b)), byBytes);
});

test("compareUtf8 is a strict total order over distinct strings", () =>
{
    const values = [ "", "a", "A", "ab", "aB", "b", "t1", "t11", "t2", "cb0", "s0", "u4_space2" ];
    for (const left of values)
    {
        for (const right of values)
        {
            const forward = Math.sign(compareUtf8(left, right));
            const backward = Math.sign(compareUtf8(right, left));
            assert.equal(forward + backward, 0, `${left} vs ${right} is not antisymmetric`);
            assert.equal(forward === 0, left === right, `${left} vs ${right}`);
        }
    }
});

test("the package's three byte comparators agree", () =>
{
    // compareAnnotationNames and compareTableBlobs both implement Carbon's
    // strcmp/memcmp order; compareUtf8 is the string-level form of the same rule.
    // If they ever disagree, arena offsets and annotation order disagree with each
    // other and a re-emit stops being byte-exact.
    const encoder = new TextEncoder();
    const values = [ "a", "ab", "b", "Z", "t1", "t11", "sampled-resource:0:11" ];
    for (const left of values)
    {
        for (const right of values)
        {
            assert.equal(
                Math.sign(compareUtf8(left, right)),
                Math.sign(compareAnnotationNames(left, right)),
                `${left} vs ${right}`
            );
            assert.equal(
                Math.sign(compareUtf8(left, right)),
                Math.sign(compareTableBlobs(encoder.encode(left), encoder.encode(right))),
                `${left} vs ${right}`
            );
        }
    }
});
