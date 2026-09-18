// Carbon source: trinity/trinity/Tr2SSAO.h
// Carbon source: trinity/trinity/Tr2SSAO.cpp
// Carbon source: trinity/trinity/Tr2SSAO_Blue.cpp
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
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
  @edit.notify
  @edit.readwrite
  @type.int32
  @type.enum("SSAOQuality")
  quality = SSAOQuality.HIGHEST;

  @edit.notify
  @edit.persist
  @type.boolean
  cortaoBentNormal = true;

  @edit.persist
  @type.float32
  zoomLevel = 5;

  @edit.persist
  @type.float32
  shadowClamp = 0.98;

  @edit.persist
  @type.float32
  shadowPower = 2.6;

  @edit.persist
  @type.float32
  shadowMultiplier = 1;

  @edit.notify
  @edit.readwrite
  @type.boolean
  cortaoBlur = true;

  @edit.notify
  @edit.persist
  @type.boolean
  cortaoEnabled = true;

  @edit.persist
  @type.float32
  sharpness = 0.5;

  @edit.readwrite
  @type.boolean
  enabled = true;

  @edit.notify
  @edit.readwrite
  @type.float32
  cortaoMipBias = -4;

  @edit.notify
  @edit.readwrite
  @type.float32
  cortaoMaxBlockerSearchRadius = 0.25;

  @edit.notify
  @edit.readwrite
  @type.float32
  cortaoRadius = 1e10;

  @edit.notify
  @edit.readwrite
  @type.float32
  cortaoStrength = 1;

  @edit.notify
  @edit.readwrite
  @type.boolean
  downsampled = false;

  @edit.persist
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
   * @throws {Error} Not ported yet; Carbon implements this on the class itself.
   */
  @carbon.method
  @impl.notImplemented
  Filter(_depthBuffer, _normalBuffer, _gpuResourcePool, _renderContext, _temporal)
  {
    throw new Error("Tr2SSAO.Filter is not ported yet.");
  }

  /**
   * Carbon Hash (Tr2SSAO.cpp:535): `n * (n ^ (n >> 15))` - the integer
   * bit-mix that decorrelates per-frame/per-pixel sampling. Static in
   * Carbon (a file-local-style helper on the class), uint32 wrap preserved
   * with imul.
   */
  static hash(n)
  {
    const value = n >>> 0;
    return Math.imul(value, value ^ (value >>> 15)) >>> 0;
  }

  static SSAOQuality = SSAOQuality;

}
