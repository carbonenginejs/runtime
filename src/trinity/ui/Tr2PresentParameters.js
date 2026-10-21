import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/UI/Tr2PresentParameters.h
// Source: trinity/trinity/UI/Tr2PresentParameters.cpp
// Source: trinity/trinity/UI/Tr2PresentParameters_Blue.cpp
import { meta, type, blue } from "#schema";
import { PresentInterval, SwapEffect } from "#consts/render-context";
import { Tr2PresentParametersAL } from "../../trinityal/Tr2PresentParametersAL.js";

/**
 * Native IRoot presentation record over AL storage. Width and height accessors
 * adapt Blue's nested member offsets to the existing JavaScript property path.
 * Its exposure table advertises no concrete or secondary query interfaces.
 */
@be.define("Tr2PresentParameters")

@blue.inherit(IRoot)
export class Tr2PresentParameters extends Tr2PresentParametersAL
{
  /**
   * Reads mode.width: Carbon's MAP_ATTRIBUTE("backBufferWidth", mode.width,
   * Be::READWRITE) (Tr2PresentParameters_Blue.cpp:13): an attribute over this
   * accessor onto the nested AL record.
   *
   * @returns {number} Back-buffer pixel width.
   */
  @blue.readwrite
  @type.uint32
  @meta.adapted
  get backBufferWidth()
  {
    return this.mode.width;
  }

  /** Writes mode.width. @param {number} value Back-buffer pixel width. */
  @meta.adapted
  set backBufferWidth(value)
  {
    this.mode.width = value;
  }

  /**
   * Reads mode.height: Carbon's MAP_ATTRIBUTE("backBufferHeight", mode.height,
   * Be::READWRITE) (Tr2PresentParameters_Blue.cpp:18): an attribute over this
   * accessor onto the nested AL record.
   *
   * @returns {number} Back-buffer pixel height.
   */
  @blue.readwrite
  @type.uint32
  @meta.adapted
  get backBufferHeight()
  {
    return this.mode.height;
  }

  /** Writes mode.height. @param {number} value Back-buffer pixel height. */
  @meta.adapted
  set backBufferHeight(value)
  {
    this.mode.height = value;
  }

  /** Native windowed member, initialized false by the UI constructor. */
  @blue.readwrite
  @type.boolean
  windowed = false;

  /** Native bool with the existing hardware/software chooser identity. */
  @blue.readwrite
  @type.boolean
  @type.enum("trinity.TriDevice.DeviceType")
  software = false;

  // Explicit values from the native UI constructor, not added Blue members.
  /**
   * Requested swap-chain back-buffer count (native uint32_t); the UI constructor sets zero.
   * @type {number}
   */
  backBufferCount = 0;
  /**
   * Requested multisample type (native uint32_t); the UI constructor sets zero.
   * @type {number}
   */
  msaaType = 0;
  /**
   * Multisample quality level (native uint32_t); the UI constructor sets zero.
   * @type {number}
   */
  msaaQuality = 0;
  /**
   * Native SwapEffect policy for presenting back buffers; the UI default is DISCARD.
   * @type {number}
   */
  swapEffect = SwapEffect.SWAP_EFFECT_DISCARD;
  /**
   * Opaque native Tr2WindowHandle identifying the output window. Carbon's
   * Tr2WindowHandle is an HWND pointer and the UI constructor assigns it 0, the
   * null pointer (Tr2PresentParameters.cpp:13), so the default is null.
   * @type {unknown}
   */
  outputWindow = null;
  /**
   * Native PresentInterval synchronization setting; the UI default is ONE refresh interval.
   * @type {number}
   */
  presentInterval = PresentInterval.PRESENT_INTERVAL_ONE;
}

