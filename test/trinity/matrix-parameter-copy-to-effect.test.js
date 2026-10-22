import assert from "node:assert/strict";
import test from "node:test";
import { Tr2Matrix4Parameter } from "../../npm/dist/trinity/shader/parameter/Tr2Matrix4Parameter.js";

test("Tr2Matrix4Parameter.CopyValueToEffect writes into the caller's destination", () =>
{
  const parameter = new Tr2Matrix4Parameter();
  for (let i = 0; i < 16; i++) parameter.value[i] = i + 1;
  const out = new Float32Array(16);
  parameter.CopyValueToEffect(0, out);
  assert.deepEqual(Array.from(out), Array.from(parameter.value));
});
