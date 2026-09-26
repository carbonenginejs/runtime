// Tr2GpuStructuredBuffer's count comes from the created buffer
// (Tr2GpuStructuredBuffer.cpp:173-175), and a refused create keeps the buffer
// it had (cpp:118-123).
import test from "node:test";
import assert from "node:assert/strict";
import { Tr2GpuStructuredBuffer } from "../../npm/dist/trinity/core/device/Tr2GpuStructuredBuffer.js";
import { ALResult } from "../../npm/dist/trinityal/index.js";
import { StubContext } from "../support/stubContext.js";

const { CPU_WRITABLE } = Tr2GpuStructuredBuffer.CreationFlag;

test("GetCount is the created buffer's count, and 0 before one exists", () =>
{
  const buffer = new Tr2GpuStructuredBuffer();
  assert.equal(buffer.GetCount(), 0);

  assert.equal(buffer.Create(16, 4, CPU_WRITABLE, StubContext()), ALResult.S_OK);
  assert.equal(buffer.GetCount(), 16);
});

test("a zero-count create is refused and keeps the current buffer", () =>
{
  const context = StubContext();
  const buffer = new Tr2GpuStructuredBuffer();
  buffer.Create(16, 4, CPU_WRITABLE, context);
  const created = buffer.GetGpuBuffer(0);

  assert.equal(buffer.Create(0, 4, CPU_WRITABLE, context), ALResult.E_INVALIDARG);
  assert.equal(buffer.GetGpuBuffer(0), created, "the refused create leaves the buffer in place");
  assert.equal(buffer.GetCount(), 16);
});
