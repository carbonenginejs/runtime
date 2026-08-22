import assert from "node:assert/strict";
import test from "node:test";
// Decorated classes require the build transform - test the consumer output.
import { CjsFormat, CjsResourceProbe } from "../npm/dist/index.js";

class TestFormat extends CjsFormat
{
  static id = "test-proof";
  static mediaTypes = Object.freeze([ "data" ]);
  static extensions = Object.freeze([ ".proof" ]);
  static outputs = CjsFormat.defineOutputs({
    payload: { default: true, decoded: true }
  });

  static inspect(input)
  {
    if (input?.[0] !== 0x42) throw new TypeError("not a proof payload");
    return { byteLength: input.byteLength };
  }

  static read(input)
  {
    this.inspect(input);
    if (input[1] === 0xff)
    {
      const error = new Error("decoder rejected the payload");
      error.code = "TEST_DECODE_REJECTED";
      error.offset = 1;
      throw error;
    }
    return { value: input[1] };
  }
}

test("getSupport is synchronous advice and never fabricates verification", () =>
{
  const report = TestFormat.getSupport(new Uint8Array([ 0x42, 7 ]));
  assert.equal(report.recognized, true);
  assert.equal(report.output, "payload");
  assert.equal(report.supported, true);
  assert.equal(report.verified, false);
  assert.equal(report.capability.decoded, true);
});

test("verifySupport proves an exact output through the real async read path", async () =>
{
  const report = await TestFormat.verifySupport(new Uint8Array([ 0x42, 7 ]), { emit: "payload" });
  assert.equal(report.supported, true);
  assert.equal(report.verified, true);
  assert.equal(report.capability.verified, true);
});

test("verifySupport returns the decoder error and output-specific failure", async () =>
{
  const report = await TestFormat.verifySupport(new Uint8Array([ 0x42, 0xff ]), { emit: "payload" });
  assert.equal(report.supported, false);
  assert.equal(report.verified, true);
  assert.equal(report.error.code, "TEST_DECODE_REJECTED");
  assert.equal(report.error.details.offset, 1);
  assert.equal(report.capability.verified, true);
});

test("undeclared outputs fail without pretending a decoder ran", async () =>
{
  const report = await TestFormat.verifySupport(new Uint8Array([ 0x42, 7 ]), { emit: "other" });
  assert.equal(report.supported, false);
  assert.equal(report.verified, true);
  assert.equal(report.error.code, "CJS_FORMAT_OUTPUT_UNDECLARED");
});

test("CjsResourceProbe normalizes the plain report at the resource boundary", () =>
{
  const probe = CjsResourceProbe.from(TestFormat.getSupport(new Uint8Array([ 0x42, 7 ])));
  assert.equal(probe.recognized, true);
  assert.equal(probe.canUseSelected(), true);
  assert.equal(probe.canUseSelected({ verified: true }), false);
  assert.equal(probe.canUse("payload"), true);
});
