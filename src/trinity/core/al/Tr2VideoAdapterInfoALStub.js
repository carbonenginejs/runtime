// Source: trinity/trinityal/stub/Tr2VideoAdapterInfoALStub.cpp
// Source: trinity/trinityal/stub/Tr2VideoAdapterInfoALStub.h
//
// What adapters exist, what they are called, and what display modes they offer.
//
// ALL STATIC, as Carbon has it: adapter enumeration happens before any device
// exists, so there is nothing to be an instance of.
//
// CARBON'S STUB ANSWERS WITH A PLAUSIBLE FICTION rather than refusing, and the
// values are transcribed rather than rounded off - one adapter called "stub",
// a 800x600 current mode, one available mode of 1920x1200, a 16384 maximum
// texture width, and every format supported. A caller that branches on adapter
// capability therefore takes its normal path instead of an error path that real
// hardware would never take.
//
// THE ODD CONSTANTS ARE CARBON'S AND ARE KEPT. The driver version
// 2533352100662421 and revision 163 look like noise; they are what the stub
// reports, and a port that tidied them would be inventing. The single available
// mode is also deliberately NOT the current mode - 1920x1200 against 800x600 -
// so a caller that confuses the two is caught.
//
// A BROWSER HAS NO ADAPTER ENUMERATION. WebGPU exposes one adapter through
// `requestAdapter` with no list and no display modes, so a real backend here
// answers a subset of this. That is a reason to keep the interface, not to skip
// it: the shape of the question is what the consumer already asks.

import { PixelFormat } from "../../../global/consts/renderContext/index.js";
import { ALResult } from "./ALResult.js";


/** Carbon's `DEFAULT_ADAPTER`. */
export const DEFAULT_ADAPTER = 0;

/** Carbon's display-mode scaling and scanline "unspecified". */
const UNSPECIFIED = 0;


/**
 * Adapter and display-mode enumeration.
 */
export class Tr2VideoAdapterInfoStub
{
  /**
   * How many adapters exist.
   *
   * @returns {object} `{ result, count }`.
   */
  static GetAdapterCount()
  {
    return { result: ALResult.S_OK, count: 1 };
  }

  /**
   * What one adapter is.
   *
   * @param {number} [_adapterIndex] Which adapter.
   * @returns {object} `{ result, info }`.
   */
  static GetAdapterInfo(_adapterIndex = DEFAULT_ADAPTER)
  {
    return {
      result: ALResult.S_OK,
      info: {
        driver: "stub",
        description: "Not an actual adapter.",
        deviceName: "stub",
        driverVersion: 2533352100662421,
        vendorID: 0,
        deviceID: 0,
        subSystemID: 0,
        revision: 163,
        deviceIdentifier: { data1: 0, data2: 0, data3: 0, data4: [ 0, 0, 0, 0, 0, 0, 0, 0 ] }
      }
    };
  }

  /**
   * The monitor an adapter drives.
   *
   * @param {number} [_adapterIndex] Which adapter.
   * @returns {object} `{ result, monitor }`; there is no monitor.
   */
  static GetAdapterMonitor(_adapterIndex = DEFAULT_ADAPTER)
  {
    return { result: ALResult.S_OK, monitor: null };
  }

  /**
   * The mode an adapter is currently in.
   *
   * @param {number} [_adapterIndex] Which adapter.
   * @returns {object} `{ result, mode }`.
   */
  static GetAdapterDisplayMode(_adapterIndex = DEFAULT_ADAPTER)
  {
    return {
      result: ALResult.S_OK,
      mode: {
        format: PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM,
        width: 800,
        height: 600,
        refreshRateNumerator: 1,
        refreshRateDenominator: 1,
        scaling: UNSPECIFIED,
        scanlineOrdering: UNSPECIFIED
      }
    };
  }

  /**
   * How many modes an adapter offers for a back-buffer format.
   *
   * @param {number} [_adapterIndex] Which adapter.
   * @param {number} [_backBufferFormat] A `PixelFormat`.
   * @returns {object} `{ result, count }`.
   */
  static GetAdapterModeCount(_adapterIndex = DEFAULT_ADAPTER, _backBufferFormat = 0)
  {
    return { result: ALResult.S_OK, count: 1 };
  }

  /**
   * One available mode.
   *
   * DELIBERATELY NOT THE CURRENT MODE. Carbon's stub reports 1920x1200 here
   * against the 800x600 it reports as current, which catches a caller that
   * treats the two as interchangeable.
   *
   * @param {number} [_adapterIndex] Which adapter.
   * @param {number} [_backBufferFormat] A `PixelFormat`.
   * @param {number} [_modeIndex] Which mode.
   * @returns {object} `{ result, mode }`.
   */
  static GetAdapterMode(_adapterIndex = DEFAULT_ADAPTER, _backBufferFormat = 0, _modeIndex = 0)
  {
    return {
      result: ALResult.S_OK,
      mode: {
        format: PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM,
        width: 1920,
        height: 1200,
        refreshRateNumerator: 1,
        refreshRateDenominator: 59,
        scaling: UNSPECIFIED,
        scanlineOrdering: UNSPECIFIED
      }
    };
  }

  /**
   * The widest texture an adapter can hold.
   *
   * @param {number} [_adapterIndex] Which adapter.
   * @returns {object} `{ result, maxWidth }`.
   */
  static GetAdapterMaxTextureWidth(_adapterIndex = DEFAULT_ADAPTER)
  {
    return { result: ALResult.S_OK, maxWidth: 16384 };
  }

  /**
   * Whether a format can be a back buffer.
   *
   * @param {number} [_adapterIndex] Which adapter.
   * @param {number} [_format] A `PixelFormat`.
   * @returns {boolean} True; the stub supports everything.
   */
  static SupportsBackBufferFormat(_adapterIndex = DEFAULT_ADAPTER, _format = 0)
  {
    return true;
  }

  /**
   * Whether a format can be a render target.
   *
   * @param {number} [_adapterIndex] Which adapter.
   * @param {number} [_format] A `PixelFormat`.
   * @returns {boolean} True; the stub supports everything.
   */
  static SupportsRenderTargetFormat(_adapterIndex = DEFAULT_ADAPTER, _format = 0)
  {
    return true;
  }

  /**
   * Whether two adapter indices name different adapters.
   *
   * @param {number} adapter1 One index.
   * @param {number} adapter2 The other.
   * @returns {boolean} Whether they differ.
   */
  static AreAdaptersDifferent(adapter1, adapter2)
  {
    return adapter1 !== adapter2;
  }

  /**
   * Re-reads adapter data after a device change.
   *
   * @returns {number} An `ALResult`.
   */
  static RefreshData()
  {
    return ALResult.S_OK;
  }
}
