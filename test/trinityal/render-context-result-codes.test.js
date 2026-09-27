// Every render-context verb Carbon declares as returning ALResult returns one,
// on every backend, and no caller tests one as a boolean.
//
// WHY BOTH HALVES. The verbs returned booleans until 2026-09-27. `S_OK` is 0,
// so a caller left behind that writes `if (!context.SetConstants(...))` reads
// every success as a failure, silently - and a backend left behind that
// returns `true` reads as a failure to every converted caller. The first half
// catches a backend, the second a caller.

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { CjsWebgpuRenderContextAL } from "../../npm/dist/trinityal/webgpu/internal.js";
import { Tr2RenderContextALWebgl2 } from "../../npm/dist/trinityal/webgl2/index.js";
import { FakeWebgl2 } from "./webgl2/fakeWebgl2.js";

/**
 * The verbs Carbon's render context returns an ALResult from
 * (`dx11/Tr2RenderContextDx11.h:78-190`, `stub/Tr2RenderContextStub.cpp`), with
 * arguments that reach a return without a device.
 */
const VERBS = [
  [ "SetStreamSource", 0, null, 0, 0 ],
  [ "SetIndices", null, 2 ],
  [ "SetTopology", 1 ],
  [ "SetVertexLayout", null ],
  [ "SetShaderProgram", null ],
  [ "SetResourceSet", null ],
  [ "SetConstants", { GetUsage: () => 0, GetSize: () => 0, GetMirror: () => new Uint8Array(0) }, 0, 0 ],
  [ "SetRenderState", 0, 0 ],
  [ "SetRenderStates", null ],
  [ "SetRenderTarget", 0, null ],
  [ "SetDepthStencil", null ],
  [ "PushRenderTarget", 0 ],
  [ "PopRenderTarget", 0 ],
  [ "PushDepthStencil" ],
  [ "PopDepthStencil" ],
  [ "SetViewport", { x: 0, y: 0, width: 1, height: 1 } ],
  [ "ClearUav" ],
  [ "CopySubBuffer" ],
  [ "DrawIndexedInstancedIndirect" ],
  [ "DrawInstancedIndirect" ],
  [ "RunComputeShaderIndirect" ],
  [ "DispatchRays" ],
  [ "UseResources" ],
  [ "UseAccelerationStructure" ],
  [ "GetGpuStateMarker" ],
  [ "GetGpuPageFaultResource" ],
  [ "CreateDevice" ]
];

/** Each backend that can be constructed without a device. */
const BACKENDS = [
  [ "stub", () => new Tr2RenderContextALStub() ],
  [ "webgpu", () => new CjsWebgpuRenderContextAL() ],
  [ "webgl2", () => new Tr2RenderContextALWebgl2({ gl: FakeWebgl2().gl }) ]
];

for (const [ backend, make ] of BACKENDS)
{
  test(`every ALResult verb on the ${backend} context returns a number`, () =>
  {
    for (const [ verb, ...args ] of VERBS)
    {
      const context = make();
      const result = context[verb](...args);
      assert.equal(typeof result, "number", `${backend} ${verb} returned ${typeof result} ${String(result)}`);
    }
  });
}

/** The verbs as a regular-expression alternation. */
const VERB_PATTERN = [ ...VERBS.map(([ verb ]) => verb), "Clear", "BeginScene", "EndScene", "Present",
  "DrawIndexedInstanced", "DrawInstanced", "DrawIndexedPrimitive", "DrawPrimitive", "DrawIndexedPrimitiveUP",
  "DrawPrimitiveUP", "RunComputeShader" ].join("|");

/**
 * A render-context verb whose result is negated, or tested as the condition
 * of a ternary or a logical operator, without `Failed`/`Succeeded` around it.
 * Receivers that are not render contexts but share a verb name are listed.
 */
const BOOLEAN_USE = new RegExp(String.raw`(!\s*|&&\s*|\|\|\s*)([\w$#.?]+)\.(${VERB_PATTERN})\(|([\w$#.?]+)\.(${VERB_PATTERN})\([^;]*\)\s*(\?|&&|\|\|)`, "u");
const NOT_A_RENDER_CONTEXT = /\b(esm|states|GetEffectStateManager\(\)|glows|trails|componentRegistry|documents|library|allocator|GetTriPoolAllocator\(\))\??\.$/u;

function* sourceFiles(directory)
{
  for (const name of readdirSync(directory))
  {
    const full = path.join(directory, name);
    if (statSync(full).isDirectory()) yield* sourceFiles(full);
    else if (name.endsWith(".js")) yield full;
  }
}

test("no caller tests a render-context verb's ALResult as a boolean", () =>
{
  const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");
  const offenders = [];

  for (const file of sourceFiles(source))
  {
    readFileSync(file, "utf8").split("\n").forEach((line, index) =>
    {
      if (/^\s*(\/\/|\*)/u.test(line)) return;
      const match = BOOLEAN_USE.exec(line);
      if (!match) return;

      const receiver = `${match[2] ?? match[4]}.`;
      if (NOT_A_RENDER_CONTEXT.test(receiver)) return;
      if (/\b(Failed|Succeeded)\(\s*$/u.test(line.slice(0, match.index + (match[1]?.length ?? 0)))) return;

      offenders.push(`${path.relative(source, file)}:${index + 1}: ${line.trim()}`);
    });
  }

  assert.deepEqual(offenders, [], "wrap each in Failed(...) or Succeeded(...)");
});
