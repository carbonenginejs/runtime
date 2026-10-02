// Source: trinity/trinityal/Tr2AdapterStructures.h
import { Tr2DisplayModeInfo } from "./Tr2DisplayModeInfo.js";

/**
 * Native presentation value shape. Deterministic zero/false defaults adapt
 * Carbon's uninitialized aggregate; concrete owners apply their own defaults.
 * The mode is owned per instance. No backend or window is created here.
 */
export class Tr2PresentParametersAL
{
  /**
   * Owned display-mode record supplying resolution, refresh rate and pixel format.
   * @type {Tr2DisplayModeInfo}
   */
  mode = new Tr2DisplayModeInfo();
  /**
   * Requested number of swap-chain back buffers (native uint32_t).
   * @type {number}
   */
  backBufferCount = 0;
  /**
   * Requested multisample type for the back buffer (native uint32_t).
   * @type {number}
   */
  msaaType = 0;
  /**
   * Quality level for the requested multisample type (native uint32_t).
   * @type {number}
   */
  msaaQuality = 0;
  /**
   * Back-buffer presentation policy (native Tr2RenderContextEnum::SwapEffect).
   * @type {number}
   */
  swapEffect = 0;
  /**
   * Opaque target-window handle (native Tr2WindowHandle); JavaScript initializes it to zero.
   * @type {unknown}
   */
  outputWindow = 0;
  /**
   * Whether presentation uses a window instead of fullscreen (native bool).
   * @type {boolean}
   */
  windowed = false;
  /**
   * Whether device creation requests software rendering (native bool).
   * @type {boolean}
   */
  software = false;
  /**
   * Presentation synchronization interval (native Tr2RenderContextEnum::PresentInterval).
   * @type {number}
   */
  presentInterval = 0;
  /**
   * Whether variable-refresh-rate presentation is supported (native bool).
   * @type {boolean}
   */
  variableRefreshRateSupported = false;
}
