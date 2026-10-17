// Source: trinity/trinityal/Tr2AdapterStructures.h
import { CjsSchema, type } from "#schema";

/**
 * Native display-mode value shape. Carbon declares no initializers
 * (`Tr2AdapterStructures.h:17-26`), so every field takes its type's neutral value.
 * This is a plain AL record with storage metadata and no Blue query interfaces.
 */
export class Tr2DisplayModeInfo
{
  /**
   * Horizontal display-mode resolution in pixels (native uint32_t). Carbon leaves it unset.
   * @type {number}
   */
  width = 0;
  /**
   * Vertical display-mode resolution in pixels (native uint32_t). Carbon leaves it unset.
   * @type {number}
   */
  height = 0;
  /**
   * Numerator of the display refresh rate in hertz (native uint32_t). Carbon leaves it unset.
   * @type {number}
   */
  refreshRateNumerator = 0;
  /**
   * Denominator of the display refresh rate in hertz (native uint32_t). Carbon leaves it unset.
   * @type {number}
   */
  refreshRateDenominator = 0;
  /**
   * Pixel format of the display mode (native Tr2RenderContextEnum::PixelFormat). Carbon leaves it unset.
   * @type {number}
   */
  format = 0;
  /**
   * Progressive or interlaced scanline order (native Tr2RenderContextEnum::ScanlineOrdering). Carbon leaves it unset.
   * @type {number}
   */
  scanlineOrdering = 0;
  /**
   * Display-mode scaling policy (native Tr2RenderContextEnum::DisplayScaling). Carbon leaves it unset.
   * @type {number}
   */
  scaling = 0;
}

CjsSchema.decorateField(Tr2DisplayModeInfo, "width", type.uint32);
CjsSchema.decorateField(Tr2DisplayModeInfo, "height", type.uint32);
CjsSchema.decorateField(Tr2DisplayModeInfo, "refreshRateNumerator", type.uint32);
CjsSchema.decorateField(Tr2DisplayModeInfo, "refreshRateDenominator", type.uint32);
CjsSchema.decorateField(Tr2DisplayModeInfo, "format", type.uint32);
CjsSchema.decorateField(Tr2DisplayModeInfo, "scanlineOrdering", type.int32);
CjsSchema.decorateField(Tr2DisplayModeInfo, "scaling", type.int32);
CjsSchema.blue.define(Tr2DisplayModeInfo, { className: "Tr2DisplayModeInfo" });
