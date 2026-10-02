// Source: trinity/trinity/UI/Tr2PresentParameters.h
// Source: trinity/trinity/UI/Tr2PresentParameters.cpp
// Source: trinity/trinity/UI/Tr2PresentParameters_Blue.cpp
import { carbon, meta, impl, edit, type } from "#schema";
import { PresentInterval, SwapEffect } from "#consts/render-context";
import { Tr2PresentParametersAL } from "../../trinityal/Tr2PresentParametersAL.js";

/**
 * Native IRoot presentation record over AL storage. Width and height accessors
 * adapt Blue's nested member offsets to the existing JavaScript property path.
 * Its exposure table advertises no concrete or secondary query interfaces.
 */
@type.define({ className: "Tr2PresentParameters", family: "ui" })
export class Tr2PresentParameters extends Tr2PresentParametersAL
{
  /** Reads mode.width. @returns {number} Back-buffer pixel width. */
  @meta.property()
  @edit.readwrite
  @type.uint32
  @impl.adapted
  get backBufferWidth()
  {
    return this.mode.width;
  }

  /** Writes mode.width. @param {number} value Back-buffer pixel width. */
  @impl.adapted
  set backBufferWidth(value)
  {
    this.mode.width = value;
  }

  /** Reads mode.height. @returns {number} Back-buffer pixel height. */
  @meta.property()
  @edit.readwrite
  @type.uint32
  @impl.adapted
  get backBufferHeight()
  {
    return this.mode.height;
  }

  /** Writes mode.height. @param {number} value Back-buffer pixel height. */
  @impl.adapted
  set backBufferHeight(value)
  {
    this.mode.height = value;
  }

  /** Native windowed member, initialized false by the UI constructor. */
  @edit.readwrite
  @type.boolean
  windowed = false;

  /** Native bool with the existing hardware/software chooser identity. */
  @edit.readwrite
  @type.boolean
  @type.enum("trinity.TriDevice.DeviceType")
  software = false;

  // Explicit values from the native UI constructor, not added Blue members.
  backBufferCount = 0;
  msaaType = 0;
  msaaQuality = 0;
  swapEffect = SwapEffect.SWAP_EFFECT_DISCARD;
  outputWindow = 0;
  presentInterval = PresentInterval.PRESENT_INTERVAL_ONE;
}

carbon.interfaceTable({ interfaces: [], chainTo: null })(Tr2PresentParameters);
