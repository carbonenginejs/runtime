// Source: trinity/trinityal/stub/Tr2SwapChainALStub.cpp
// Source: trinity/trinityal/stub/Tr2SwapChainALStub.h
//
// A swap chain with no window behind it.
//
// It owns one back buffer, and `IsValid` is that back buffer's validity - so a
// swap chain that failed to allocate reports itself unusable rather than
// presenting into nothing.
//
// CARBON'S BACK BUFFER HERE IS 4x4, and that is not a placeholder someone
// forgot: the stub has no window to ask for a size, and a caller that needs a
// real size uses the render context's default back buffer, which is created
// from the present parameters. Transcribed as it stands, because inventing a
// size would make a headless test agree with a number nothing chose.

import { Tr2ALMemoryType, Tr2BaseDeviceResourceAL } from "./Tr2DeviceResourceAL.js";
import { ALResult } from "./ALResult.js";
import { Tr2BitmapDimensions } from "./Tr2BitmapDimensions.js";
import { Tr2TextureALStub } from "./Tr2TextureALStub.js";
import { PixelFormat, Tr2GpuUsage } from "../../../global/consts/renderContext/index.js";


/** Carbon's stub back-buffer size (`Tr2SwapChainALStub.cpp:27`). */
const STUB_BACK_BUFFER_SIZE = 4;


/**
 * A swap chain whose presents complete immediately.
 */
export class Tr2SwapChainALStub extends Tr2BaseDeviceResourceAL
{
  /** m_backBuffer */
  #backBuffer = new Tr2TextureALStub();

  /**
   * Creates the swap chain and its back buffer.
   *
   * @param {object} windowHandle The window to present into; ignored here.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  Create(windowHandle, renderContext)
  {
    if (!renderContext.IsValid()) return ALResult.E_INVALIDARG;

    this.#backBuffer.Destroy();
    this.#backBuffer = new Tr2TextureALStub();

    return this.#backBuffer.Create(
      Tr2BitmapDimensions.Texture2D(
        STUB_BACK_BUFFER_SIZE,
        STUB_BACK_BUFFER_SIZE,
        1,
        PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM
      ),
      { gpuUsage: Tr2GpuUsage.RENDER_TARGET },
      renderContext
    );
  }

  /** Releases the back buffer and leaves the device-resource registry. */
  Destroy()
  {
    this.#backBuffer.Destroy();
    this.#backBuffer = new Tr2TextureALStub();
    super.Destroy();
  }

  /**
   * Whether the chain can be presented.
   *
   * @returns {boolean} The back buffer's validity.
   */
  IsValid()
  {
    return this.#backBuffer.IsValid();
  }

  /**
   * The back buffer.
   *
   * @returns {Tr2TextureALStub} The texture.
   */
  GetBackBuffer()
  {
    return this.#backBuffer;
  }

  /**
   * Presents the back buffer. There is nothing to show, but the frame ended.
   *
   * @returns {number} An `ALResult` value.
   */
  Present()
  {
    return ALResult.S_OK;
  }

  /**
   * Back buffer width.
   *
   * @returns {number} Width in pixels.
   */
  GetWidth()
  {
    return this.#backBuffer.GetWidth();
  }

  /**
   * Back buffer height.
   *
   * @returns {number} Height in pixels.
   */
  GetHeight()
  {
    return this.#backBuffer.GetHeight();
  }

  /**
   * Which memory class this chain occupies.
   *
   * VIDEO, not managed - the one AL resource that says so, because a swap
   * chain's surfaces belong to the display rather than to the device heap.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_VIDEO;
  }

  /**
   * Names the chain for a debugger.
   *
   * @returns {number} An `ALResult` value; the stub keeps no name.
   */
  SetName()
  {
    return ALResult.S_OK;
  }
}
