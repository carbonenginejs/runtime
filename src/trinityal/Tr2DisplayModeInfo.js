// Source: trinity/trinityal/Tr2AdapterStructures.h

/**
 * Native display-mode value shape. Carbon leaves aggregate storage uninitialized;
 * JavaScript uses deterministic zero defaults until the caller supplies a mode.
 * This is a plain AL record, without Blue registration or query interfaces.
 */
export class Tr2DisplayModeInfo
{
  width = 0;
  height = 0;
  refreshRateNumerator = 0;
  refreshRateDenominator = 0;
  format = 0;
  scanlineOrdering = 0;
  scaling = 0;
}
