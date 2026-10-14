// Source: trinity/trinity/trinity.cpp:200-296
//
// Trinity's start-up. Carbon runs it once when the trinity module loads
// (StartDLL, trinity.cpp:298-304); here the orchestrator calls it once, after
// the Blue services are installed and before anything renders or measures text.
import { Tr2VariableStore } from "./core/variable/Tr2VariableStore.js";
import { Tr2Renderer } from "./core/Tr2Renderer.js";
import { Tr2FontManager } from "./font/Tr2FontManager.js";
import { TriVariableContentType } from "./generated/trinityCore/enums.js";
import { noise } from "../global/math/noise.js";

/** Whether InitializeTrinity has run in this realm. */
let initialized = false;

/**
 * Carbon `InitializeTrinity` (trinity.cpp:200-296).
 *
 * Ported: the global `BlitOriginal`, `BlitCurrent` and `g_texelSize` variables
 * (:204-206), the font manager (:290, which registers it for Blue ticks), the
 * renderer's global variables (:292), and the Perlin noise warm-up (:295).
 *
 * Not ported, each because nothing here consumes it: `TrinityALCrashes`
 * (no crash reporter); parallel encoding (:216-242, Metal and DX12 only); the
 * start-up arguments `upscalingDebug`, `deviceDebug`, `dred`, `gpuMarkers`,
 * `gpuTimers`, `bindlessRendering` and `gdpr` (:244-284), which set D3D device
 * flags and globals this port does not have; the Granny allocator (:286-288).
 *
 * Carbon runs it once, as the module's entry point (StartDLL); a second call
 * here does nothing, so the first font manager stays the only one.
 */
export function InitializeTrinity()
{
  if (initialized) return;
  initialized = true;

  // trinity.cpp:204-206.
  const store = Tr2VariableStore.globalStore();
  store.RegisterVariableInternal("BlitOriginal", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, null);
  store.RegisterVariableInternal("BlitCurrent", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, null);
  store.RegisterVariableInternal("g_texelSize", TriVariableContentType.TRIVARIABLE_FLOAT4, [ 0, 0, 0, 0 ]);

  Tr2FontManager.initialize();

  Tr2Renderer.initialize();

  // Carbon builds the noise table here before other threads call it; ours is
  // built when noise.js loads, so this call only matches the order.
  noise.carbonPerlin1D(0.0, 1.0, 1.0, 1);
}
