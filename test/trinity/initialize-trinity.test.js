import assert from "node:assert/strict";
import test from "node:test";

import { be } from "../../npm/dist/global/blue/index.js";
import { InitializeTrinity, Tr2FontMeasurer, Tr2VariableStore } from "../../npm/dist/trinity/index.js";
import { Tr2FontManager, g_fontManager } from "../../npm/dist/trinity/font/Tr2FontManager.js";

// trinity.cpp:200-296: the start-up the orchestrator runs once.

test("InitializeTrinity registers Trinity's globals, the font manager and the renderer variables", () =>
{
  Tr2FontManager.shutdown();
  assert.equal(g_fontManager, null);

  InitializeTrinity();

  const store = Tr2VariableStore.globalStore();
  for (const name of [ "BlitOriginal", "BlitCurrent", "g_texelSize", "Time", "WorldMat", "ViewMat", "ViewInvMat",
    "ProjectionMat", "ProjectionInvMat", "ViewProjectionMat", "FrustumPlane0", "FrustumPlane5" ])
  {
    assert.ok(store.FindVariable(name), `${name} is registered`);
  }

  assert.ok(g_fontManager, "the font manager exists (trinity.cpp:290)");
  assert.equal(be.os.IsRegisteredForTicks(g_fontManager), true, "and ticks (Tr2FontManager.cpp:65-70)");

  const manager = g_fontManager;
  InitializeTrinity();
  assert.equal(g_fontManager, manager, "a second call does nothing: Carbon runs it once, from StartDLL (trinity.cpp:298-304)");
  Tr2FontManager.shutdown();
  assert.equal(be.os.IsRegisteredForTicks(manager), false, "Shutdown unregisters it (cpp:76-84)");
  assert.throws(() => new Tr2FontMeasurer().AddText("text"), /call InitializeTrinity first/);
});
