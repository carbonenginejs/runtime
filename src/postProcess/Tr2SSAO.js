// Carbon source: trinity/trinity/Tr2SSAO.h
// Carbon source: trinity/trinity/Tr2SSAO.cpp
// Carbon source: trinity/trinity/Tr2SSAO_Blue.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { SSAOQuality } from "../generated/trinityCore/enums.js";


/**
 * Carbon's authored SSAO settings and quality controls.
 *
 * Physical CACAO/CORTAO allocation, compute dispatch, and filtering remain an
 * explicit engine obligation.
 */
@type.define({ className: "Tr2SSAO", family: "trinityCore" })
export class Tr2SSAO extends CjsModel
{
  @io.notify
  @io.readwrite
  @type.int32
  @type.enum("SSAOQuality")
  quality = SSAOQuality.HIGHEST;

  @io.notify
  @io.persist
  @type.boolean
  cortaoBentNormal = true;

  @io.persist
  @type.float32
  zoomLevel = 5;

  @io.persist
  @type.float32
  shadowClamp = 0.98;

  @io.persist
  @type.float32
  shadowPower = 2.6;

  @io.persist
  @type.float32
  shadowMultiplier = 1;

  @io.notify
  @io.readwrite
  @type.boolean
  cortaoBlur = true;

  @io.notify
  @io.persist
  @type.boolean
  cortaoEnabled = true;

  @io.persist
  @type.float32
  sharpness = 0.5;

  @io.readwrite
  @type.boolean
  enabled = true;

  @io.notify
  @io.readwrite
  @type.float32
  cortaoMipBias = -4;

  @io.notify
  @io.readwrite
  @type.float32
  cortaoMaxBlockerSearchRadius = 0.25;

  @io.notify
  @io.readwrite
  @type.float32
  cortaoRadius = 1e10;

  @io.notify
  @io.readwrite
  @type.float32
  cortaoStrength = 1;

  @io.notify
  @io.readwrite
  @type.boolean
  downsampled = false;

  @io.persist
  @type.float32
  radius = 6;

  /** Enables or disables Carbon's detail SSAO layer. */
  @carbon.method
  @impl.implemented
  Enable(enable)
  {
    this.enabled = Boolean(enable);
  }

  /** Selects the detail-layer quality and resolution policy. */
  @carbon.method
  @impl.implemented
  SetQuality(quality, downsampled)
  {
    this.quality = quality;
    this.downsampled = Boolean(downsampled);
  }

  /**
   * Filters the supplied depth/normal inputs into a physical SSAO texture.
   *
   * @throws {Error} Until an engine-owned realization contract is installed.
   */
  @carbon.method
  @impl.notImplemented
  Filter(_depthBuffer, _normalBuffer, _gpuResourcePool, _renderContext, _temporal)
  {
    throw new Error("Tr2SSAO.Filter requires an engine-owned SSAO realization contract");
  }

  static SSAOQuality = SSAOQuality;

}
