import assert from "node:assert/strict";
import { test } from "node:test";

import { blue } from "../../npm/dist/blue/blue/index.js";
import { Tr2Effect, Tr2EffectRes } from "../../npm/dist/trinity/shader/index.js";
import { SetEffectPathDefaults } from "../../npm/dist/global/utils/effectPath.js";

// An authored /effect/ path is first looked for in the committed backend's own
// tree, through BePaths::FileExists (tools-core's composed index answers for
// the shader compiler's library); otherwise it resolves to the installed
// platform's tree, whose containers Tr2EffectRes translates.

Tr2EffectRes.CommitBackend({ source: "dx11", target: "webgpu", translator: { buildEffect() {} } });

/** Runs a body with BePaths answering FileExists from `files`, restoring after. */
function WithFiles(files, run)
{
  const previous = blue.paths;
  blue.paths = { FileExists: path => files.includes(path) };
  SetEffectPathDefaults({ platformName: "dx11", shaderModel: "high" });
  try { return run(); }
  finally
  {
    blue.paths = previous;
    SetEffectPathDefaults(null);
  }
}

test("a file in the backend's tree is used as stored", () =>
{
  const own = "res:/graphics/effect.webgpu/cjs/selection/selectionmask.sm_depth";

  WithFiles([ own ], () =>
  {
    assert.equal(Tr2Effect.convertEffectPath("res:/graphics/effect/cjs/selection/selectionmask.fx"), own);
  });
});

test("otherwise the path resolves to the platform's tree", () =>
{
  WithFiles([], () =>
  {
    assert.equal(Tr2Effect.convertEffectPath("res:/graphics/effect/managed/space/quad/quadv5.fx"),
      "res:/graphics/effect.dx11/managed/space/quad/quadv5.sm_depth");
  });
});

test("a path that names its tree, or an explicit platform, is never redirected", () =>
{
  const own = "res:/graphics/effect.webgpu/managed/space/quad/quadv5.sm_depth";

  WithFiles([ own ], () =>
  {
    assert.equal(Tr2Effect.convertEffectPath("res:/graphics/effect.dx11/managed/space/quad/quadv5.sm_depth"),
      "res:/graphics/effect.dx11/managed/space/quad/quadv5.sm_depth");
    assert.equal(Tr2Effect.convertEffectPath("res:/graphics/effect/managed/space/quad/quadv5.fx", { platformName: "dx11" }),
      "res:/graphics/effect.dx11/managed/space/quad/quadv5.sm_depth");
  });
});
