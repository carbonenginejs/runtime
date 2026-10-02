// Source: trinity/trinityal/Tr2AdapterStructures.h
import { Tr2DisplayModeInfo } from "./Tr2DisplayModeInfo.js";

/**
 * Native presentation value shape. Deterministic zero/false defaults adapt
 * Carbon's uninitialized aggregate; concrete owners apply their own defaults.
 * The mode is owned per instance. No backend or window is created here.
 */
export class Tr2PresentParametersAL
{
  mode = new Tr2DisplayModeInfo();
  backBufferCount = 0;
  msaaType = 0;
  msaaQuality = 0;
  swapEffect = 0;
  outputWindow = 0;
  windowed = false;
  software = false;
  presentInterval = 0;
  variableRefreshRateSupported = false;
}
