import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { checkAccessorBodies } from "../../scripts/lib/carbon-accessor-bodies.js";

const available = fs.existsSync(process.env.CARBON_ROOT ?? "E:/carbonengine");

test("a getter and setter that only read and write one member pass", { skip: !available }, () =>
{
    const check = checkAccessorBodies("Tr2MeshArea", "IsReversed", "SetReversed");
    assert.equal(check.ok, true);
    assert.equal(check.member, "m_reversed");
    assert.equal(checkAccessorBodies("Tr2RuntimeInstanceData", "GetCount", null).ok, true);
});

test("a getter that forwards to another object, and a setter with a side effect, are refused", { skip: !available }, () =>
{
    const forwarded = checkAccessorBodies("Tr2ImageRes", "GetWidth", null);
    assert.equal(forwarded.ok, false);
    assert.match(forwarded.reasons[0], /does more than return one member/);
    const effect = checkAccessorBodies("Tr2RenderTarget", "GetName", "SetName");
    assert.equal(effect.ok, false);
    assert.match(effect.reasons.join(" "), /setter SetName does more/);
});
