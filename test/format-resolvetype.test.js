import assert from "node:assert/strict";
import test from "node:test";
// Decorated classes require the build transform - test the consumer output.
import { CjsFormat, CjsResourceProbe } from "../npm/dist/index.js";

// Shared resolveType seam (kb §5 content-verified type resolution): the base
// implementation is the zero-extra-work path - it delegates to isSupported()
// and never claims verification, so an unverified result can never change a
// route.

class UnprobedFormat extends CjsFormat
{
}

class ProbedFormat extends CjsFormat
{
  static isSupported(input, options = null)
  {
    return CjsResourceProbe.createSupported("probed", [
      { kind: "raw", codec: "anything", supported: true }
    ], { source: "buffer", ...options });
  }
}

test("CjsResourceProbe carries the verified flag, defaulting to declaration-derived", () =>
{
  const probe = new CjsResourceProbe({ format: "x", supported: "partial" });
  assert.equal(probe.verified, false, "probes are declaration-derived unless a resolver says otherwise");
  const verified = new CjsResourceProbe({ format: "x", verified: true });
  assert.equal(verified.verified, true);
});

test("the base resolveType delegates to isSupported and reports verified: false", async () =>
{
  const unprobed = await UnprobedFormat.resolveType(new Uint8Array(4));
  assert.ok(unprobed instanceof CjsResourceProbe);
  assert.equal(unprobed.verified, false);
  assert.equal(unprobed.supported, "none", "no probe implementation stays unsupported");

  const probed = await ProbedFormat.resolveType(new Uint8Array(4));
  assert.ok(probed instanceof CjsResourceProbe);
  assert.equal(probed.verified, false, "delegation never fabricates verification");
  assert.equal(probed.supported, "full");
  assert.equal(probed.canUseRaw(), true);
});
