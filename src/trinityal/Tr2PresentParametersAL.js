// Source: trinity/trinityal/Tr2AdapterStructures.h
import { CjsSchema, type } from "#schema";
import { Tr2DisplayModeInfo } from "./Tr2DisplayModeInfo.js";

/**
 * Native presentation value shape. Carbon declares no initializers
 * (`Tr2AdapterStructures.h:52-64`), so every scalar field takes its type's
 * neutral value; concrete owners apply their own defaults.
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
   * Requested number of swap-chain back buffers (native uint32_t). Carbon leaves it unset.
   * @type {number}
   */
  backBufferCount = 0;
  /**
   * Requested multisample type for the back buffer (native uint32_t). Carbon leaves it unset.
   * @type {number}
   */
  msaaType = 0;
  /**
   * Quality level for the requested multisample type (native uint32_t). Carbon leaves it unset.
   * @type {number}
   */
  msaaQuality = 0;
  /**
   * Back-buffer presentation policy (native Tr2RenderContextEnum::SwapEffect). Carbon leaves it unset.
   * @type {number}
   */
  swapEffect = 0;
  /**
   * Opaque target-window handle (native Tr2WindowHandle, an HWND pointer on Windows,
   * `Tr2WindowHandle.h:9`). Carbon leaves it unset.
   * @type {unknown}
   */
  outputWindow = null;
  /**
   * Whether presentation uses a window instead of fullscreen (native bool). Carbon leaves it unset.
   * @type {boolean}
   */
  windowed = false;
  /**
   * Whether device creation requests software rendering (native bool). Carbon leaves it unset.
   * @type {boolean}
   */
  software = false;
  /**
   * Presentation synchronization interval (native Tr2RenderContextEnum::PresentInterval). Carbon leaves it unset.
   * @type {number}
   */
  presentInterval = 0;
  /**
   * Whether variable-refresh-rate presentation is supported (native bool). Carbon leaves it unset.
   * @type {boolean}
   */
  variableRefreshRateSupported = false;
}

CjsSchema.decorateField(Tr2PresentParametersAL, "mode", type.rawStruct("Tr2DisplayModeInfo"));
CjsSchema.decorateField(Tr2PresentParametersAL, "backBufferCount", type.uint32);
CjsSchema.decorateField(Tr2PresentParametersAL, "msaaType", type.uint32);
CjsSchema.decorateField(Tr2PresentParametersAL, "msaaQuality", type.uint32);
CjsSchema.decorateField(Tr2PresentParametersAL, "swapEffect", type.int32);
CjsSchema.decorateField(Tr2PresentParametersAL, "outputWindow", type.unknown);
CjsSchema.decorateField(Tr2PresentParametersAL, "windowed", type.boolean);
CjsSchema.decorateField(Tr2PresentParametersAL, "software", type.boolean);
CjsSchema.decorateField(Tr2PresentParametersAL, "presentInterval", type.int32);
CjsSchema.decorateField(Tr2PresentParametersAL, "variableRefreshRateSupported", type.boolean);
CjsSchema.blue.define(Tr2PresentParametersAL, { className: "Tr2PresentParametersAL" });
