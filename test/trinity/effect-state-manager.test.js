import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2EffectStateManager } from "../../npm/dist/trinity/shader/index.js";

const VERTEX = 0;
const PIXEL = 1;

/** Builds a stage body from a byte list. */
function body(...bytes)
{
  return new Uint8Array(bytes);
}

/** Builds a pass-shaped object carrying authored render states. */
function pass(entries)
{
  return { renderStateValues: entries.map(([ state, value ]) => ({ state, value })) };
}

/** Isolates a test from registrations made by its neighbours. */
function reset()
{
  Tr2EffectStateManager.releaseDeviceResources();
}

test("the first registered shader is handle 0, not 1", () =>
{
  // Carbon returns the raw index and nothing is 1-based, so a consumer testing
  // a handle for truthiness would discard the first shader ever registered.
  reset();

  assert.equal(Tr2EffectStateManager.registerShader(VERTEX, body(1, 2, 3)), 0);
  assert.equal(Tr2EffectStateManager.registerShader(PIXEL, body(4, 5, 6)), 1);
});

test("identical bodies collapse to one handle", () =>
{
  reset();

  const first = Tr2EffectStateManager.registerShader(VERTEX, body(1, 2, 3));
  const second = Tr2EffectStateManager.registerShader(VERTEX, body(1, 2, 3));

  assert.equal(first, second);
  assert.equal(Tr2EffectStateManager.getShaderRecord(first).stageType, VERTEX);
});

test("the same body under a different stage type is a different shader", () =>
{
  reset();

  const vertex = Tr2EffectStateManager.registerShader(VERTEX, body(1, 2, 3));
  const pixel = Tr2EffectStateManager.registerShader(PIXEL, body(1, 2, 3));

  assert.notEqual(vertex, pixel);
});

test("bodies are compared by value, never by identity", () =>
{
  reset();

  const first = Tr2EffectStateManager.registerShader(VERTEX, body(9, 9, 9));
  const sameBytes = Tr2EffectStateManager.registerShader(VERTEX, body(9, 9, 9));
  const oneByteOff = Tr2EffectStateManager.registerShader(VERTEX, body(9, 9, 8));
  const shorter = Tr2EffectStateManager.registerShader(VERTEX, body(9, 9));

  assert.equal(first, sameBytes);
  assert.notEqual(first, oneByteOff);
  assert.notEqual(first, shorter);
});

test("only the sampler signature participates in shader dedupe", () =>
{
  // Carbon compares signature.samplers and nothing else, so two effects sharing
  // bytecode but declaring different registers collapse and the second
  // signature is discarded. Reproduced deliberately.
  reset();

  const samplers = new Map([ [ 0, { filter: "linear" } ] ]);
  const withRegisters = Tr2EffectStateManager.registerShader(
    VERTEX,
    body(7, 7),
    { samplers, registers: [ "a" ] }
  );
  const withOtherRegisters = Tr2EffectStateManager.registerShader(
    VERTEX,
    body(7, 7),
    { samplers, registers: [ "b", "c" ] }
  );
  const withOtherSamplers = Tr2EffectStateManager.registerShader(
    VERTEX,
    body(7, 7),
    { samplers: new Map([ [ 0, { filter: "point" } ] ]) }
  );

  assert.equal(withRegisters, withOtherRegisters);
  assert.notEqual(withRegisters, withOtherSamplers);
});

test("an absent body is refused rather than interned", () =>
{
  reset();

  assert.equal(Tr2EffectStateManager.registerShader(VERTEX, null), Tr2EffectStateManager.Unknown);
  assert.equal(Tr2EffectStateManager.registerShader(VERTEX, body()), Tr2EffectStateManager.Unknown);
});

test("a program is keyed on its exact ordered handle list", () =>
{
  reset();

  const vertex = Tr2EffectStateManager.registerShader(VERTEX, body(1));
  const pixel = Tr2EffectStateManager.registerShader(PIXEL, body(2));

  const program = Tr2EffectStateManager.registerShaderProgram([ vertex, pixel ]);

  assert.equal(Tr2EffectStateManager.registerShaderProgram([ vertex, pixel ]), program);
  // Order-sensitive: Carbon compares the vector elementwise.
  assert.notEqual(Tr2EffectStateManager.registerShaderProgram([ pixel, vertex ]), program);
  // Length-sensitive.
  assert.notEqual(Tr2EffectStateManager.registerShaderProgram([ vertex ]), program);
});

test("a program over an unregistered or sentinel handle is refused", () =>
{
  reset();

  const vertex = Tr2EffectStateManager.registerShader(VERTEX, body(1));

  assert.equal(
    Tr2EffectStateManager.registerShaderProgram([]),
    Tr2EffectStateManager.Unknown
  );
  assert.equal(
    Tr2EffectStateManager.registerShaderProgram([ vertex, 99 ]),
    Tr2EffectStateManager.Unknown
  );
  // The sentinel is caught by the same range check, not by a special case.
  assert.equal(
    Tr2EffectStateManager.registerShaderProgram([ Tr2EffectStateManager.Unknown ]),
    Tr2EffectStateManager.Unknown
  );
});

test("render-state handles start after the reserved built-in modes", () =>
{
  // Carbon seeds the table with RM_COUNT rendering-mode setups so handle i is
  // mode i. The slots are reserved here so those handles stay stable when the
  // mode state lists are ported.
  reset();

  const handle = Tr2EffectStateManager.registerRenderStateSetup(pass([ [ 22, 1 ] ]));

  assert.equal(handle, Tr2EffectStateManager.RenderingMode.RM_COUNT);
});

test("an unauthored setup interns to RM_ANY at handle 0", () =>
{
  reset();

  assert.equal(Tr2EffectStateManager.registerRenderStateSetup(pass([])), 0);
  assert.equal(Tr2EffectStateManager.registerRenderStateSetup(null), 0);
});

test("render-state setups are keyed on authored pairs, order-independently", () =>
{
  reset();

  const left = Tr2EffectStateManager.registerRenderStateSetup(pass([ [ 22, 1 ], [ 27, 1 ] ]));
  const right = Tr2EffectStateManager.registerRenderStateSetup(pass([ [ 27, 1 ], [ 22, 1 ] ]));
  const different = Tr2EffectStateManager.registerRenderStateSetup(pass([ [ 22, 2 ], [ 27, 1 ] ]));

  assert.equal(left, right);
  assert.notEqual(left, different);
});

test("a registered setup exposes its interpreted form", () =>
{
  reset();

  // RS_CULLMODE = 22, CULLMODE_NONE = 1.
  const handle = Tr2EffectStateManager.registerRenderStateSetup(pass([ [ 22, 1 ] ]));

  assert.equal(Tr2EffectStateManager.getRenderStateSetup(handle).cull, "none");
  // A reserved built-in slot has no ported state list yet.
  assert.equal(Tr2EffectStateManager.getRenderStateSetup(1), null);
});

test("vertex declarations delegate to the existing intern table", () =>
{
  const elements = [ { usage: 0, usageIndex: 0, type: "Float32", offset: 0 } ];

  const first = Tr2EffectStateManager.getVertexDeclarationHandle(elements);
  const again = Tr2EffectStateManager.getVertexDeclarationHandle(elements);

  assert.equal(first, again);
  assert.equal(typeof first, "number");
});

test("an out-of-range handle reads as null rather than throwing", () =>
{
  reset();

  assert.equal(Tr2EffectStateManager.getShaderRecord(0), null);
  assert.equal(Tr2EffectStateManager.getShaderProgramRecord(0), null);
  assert.equal(Tr2EffectStateManager.getShaderRecord(Tr2EffectStateManager.Unknown), null);
});

test("device loss clears the shader tables and truncates render states", () =>
{
  reset();

  Tr2EffectStateManager.registerShader(VERTEX, body(1));
  Tr2EffectStateManager.registerRenderStateSetup(pass([ [ 22, 1 ] ]));

  Tr2EffectStateManager.releaseDeviceResources();

  assert.equal(Tr2EffectStateManager.getShaderRecord(0), null);
  // Carbon truncates back to the built-in modes rather than emptying, so the
  // next registration lands on RM_COUNT again.
  assert.equal(
    Tr2EffectStateManager.registerRenderStateSetup(pass([ [ 27, 1 ] ])),
    Tr2EffectStateManager.RenderingMode.RM_COUNT
  );
});

test("the two sentinels are distinct and are not minus one", () =>
{
  assert.equal(Tr2EffectStateManager.Unknown, 0xFFFFFFFF);
  assert.equal(Tr2EffectStateManager.NullDeclaration, 0xFFFFFFFE);
  assert.notEqual(Tr2EffectStateManager.Unknown, Tr2EffectStateManager.NullDeclaration);
});

/** A minimal reflected pass carrying two stages in an explicit file order. */
function stagedPass(vertexBytes, pixelBytes, stageOrder = [ VERTEX, PIXEL ])
{
  const stage = bytes => ({ exists: true, shader: 0xFFFFFFFF, signature: null, sourceProgram: { bytes } });
  const stageInputs = [];
  stageInputs[VERTEX] = stage(vertexBytes);
  stageInputs[PIXEL] = stage(pixelBytes);
  return { stageInputs, stageOrder, renderStateValues: [], shaderProgram: 0, renderStates: 0 };
}

/** A shader-shaped object over one technique. */
function shaderOver(passes)
{
  return { GetEffect: () => ({ techniques: [ { passes } ] }), ProcessEffect() {} };
}

test("stamping assigns stage, program and render-state handles to every pass", () =>
{
  reset();

  const pass = stagedPass(body(1, 1), body(2, 2));
  Tr2EffectStateManager.registerShaderHandles(shaderOver([ pass ]));

  assert.equal(pass.stageInputs[VERTEX].shader, 0);
  assert.equal(pass.stageInputs[PIXEL].shader, 1);
  assert.equal(pass.shaderProgram, 0);
  assert.equal(pass.renderStates, 0);
  assert.notEqual(pass.stageInputs[VERTEX].shader, Tr2EffectStateManager.Unknown);
});

test("stamping is idempotent, so a rebuild does not grow the tables", () =>
{
  reset();

  const first = stagedPass(body(1, 1), body(2, 2));
  const second = stagedPass(body(1, 1), body(2, 2));

  Tr2EffectStateManager.registerShaderHandles(shaderOver([ first ]));
  Tr2EffectStateManager.registerShaderHandles(shaderOver([ second ]));

  assert.equal(second.stageInputs[VERTEX].shader, first.stageInputs[VERTEX].shader);
  assert.equal(second.shaderProgram, first.shaderProgram);
});

test("program members follow the pass's authored stage order, not stage type", () =>
{
  // The program key is order-sensitive and Carbon fills its array by position
  // while reading. Tr2Pass.stageOrder exists because that order is authored:
  // measured over the shipped corpus, some passes put geometry before pixel.
  reset();

  const forward = stagedPass(body(1), body(2), [ VERTEX, PIXEL ]);
  const reversed = stagedPass(body(1), body(2), [ PIXEL, VERTEX ]);

  Tr2EffectStateManager.registerShaderHandles(shaderOver([ forward ]));
  Tr2EffectStateManager.registerShaderHandles(shaderOver([ reversed ]));

  assert.notEqual(forward.shaderProgram, reversed.shaderProgram);
  assert.deepEqual(
    Tr2EffectStateManager.getShaderProgramRecord(reversed.shaderProgram).shaderHandles,
    [ ...Tr2EffectStateManager.getShaderProgramRecord(forward.shaderProgram).shaderHandles ].reverse()
  );
});

test("a stage with no body leaves the pass without a program", () =>
{
  reset();

  const pass = stagedPass(null, body(2));
  Tr2EffectStateManager.registerShaderHandles(shaderOver([ pass ]));

  // registerShader refuses the absent body, and the sentinel member then fails
  // the program's range check rather than interning a half-built program.
  assert.equal(pass.stageInputs[VERTEX].shader, Tr2EffectStateManager.Unknown);
  assert.equal(pass.shaderProgram, Tr2EffectStateManager.Unknown);
});

test("stamping makes the shader sort value non-zero", async () =>
{
  // The payoff: Tr2Shader.ProcessEffect packs the key from stage handles and
  // bails on 0xFFFFFFFF, so sortValue was permanently zero before registration
  // existed. Batch sorting degenerates without it.
  const { Tr2Shader } = await import("../../npm/dist/resource/shader/index.js");
  reset();

  const shader = new Tr2Shader();
  shader.effect.techniques = [ { passes: [ stagedPass(body(3, 3), body(4, 4)) ] } ];

  shader.ProcessEffect();
  assert.equal(shader.sortValue, 0);

  Tr2EffectStateManager.registerShaderHandles(shader);
  assert.notEqual(shader.sortValue, 0);
});
