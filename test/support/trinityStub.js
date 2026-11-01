// TEST HELPER, not a runtime API.
//
// Starts Trinity on the stub backend for a test that reads the device (the
// renderer's animation time and frame counter read `trinity.device`, which is
// null until a host starts Trinity). The main render context already drives the
// headless AL stub, so this builds the device the way CjsLibrary.AttachTrinity
// does and hands it to `trinity.Initialize`. Once per process: a second call
// returns the device already in place.
import { trinity, TriDevice, Tr2FontManager, Tr2Renderer } from "../../npm/dist/trinity/index.js";

/**
 * Starts Trinity with a backend-less device, once.
 *
 * @returns {TriDevice} `trinity.device`.
 */
export function InitializeTrinityStub()
{
  if (!trinity.device) trinity.Initialize({ device: new TriDevice(), fontManager: Tr2FontManager.initialize(), renderer: Tr2Renderer });
  return trinity.device;
}
