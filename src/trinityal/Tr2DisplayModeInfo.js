// Source: trinity/trinityal/Tr2AdapterStructures.h

/**
 * Native display-mode value shape. Carbon leaves aggregate storage uninitialized;
 * JavaScript uses deterministic zero defaults until the caller supplies a mode.
 * This is a plain AL record, without Blue registration or query interfaces.
 */
export class Tr2DisplayModeInfo
{
  /**
   * Horizontal display-mode resolution in pixels (native uint32_t).
   * @type {number}
   */
  width = 0;
  /**
   * Vertical display-mode resolution in pixels (native uint32_t).
   * @type {number}
   */
  height = 0;
  /**
   * Numerator of the display refresh rate in hertz (native uint32_t).
   * @type {number}
   */
  refreshRateNumerator = 0;
  /**
   * Denominator of the display refresh rate in hertz (native uint32_t).
   * @type {number}
   */
  refreshRateDenominator = 0;
  /**
   * Pixel format of the display mode (native Tr2RenderContextEnum::PixelFormat).
   * @type {number}
   */
  format = 0;
  /**
   * Progressive or interlaced scanline order (native Tr2RenderContextEnum::ScanlineOrdering).
   * @type {number}
   */
  scanlineOrdering = 0;
  /**
   * Display-mode scaling policy (native Tr2RenderContextEnum::DisplayScaling).
   * @type {number}
   */
  scaling = 0;
}
