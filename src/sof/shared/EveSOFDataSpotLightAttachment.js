import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { vec3 } from "#math/vec3";

/** Defines spotlight placement, intensity, saturation, cone angles, scales, noise, and profile data for an attachment. */
@be.define("EveSOFDataSpotLightAttachment")
@blue.inherit(IRoot)

export class EveSOFDataSpotLightAttachment
{

  /**
   * Color saturation applied to the attachment light.
   * Native m_saturation (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @blue.readwrite
  @blue.persist
  @type.float32
  saturation = 1;

  /**
   * Brightness multiplier applied to the attachment light.
   * Native m_intensity (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @blue.readwrite
  @blue.persist
  @type.float32
  intensity = 1;

  /**
   * Local translation of the light relative to its attachment.
   * Native m_translation (Vector3) [READWRITE, PERSIST]
   * @type {Float32Array}
   */
  @blue.readwrite
  @blue.persist
  @type.vec3
  translation = vec3.create();

  /**
   * Multiplier for the spotlight inner cone angle.
   * Native m_innerAngleMultiplier (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @blue.readwrite
  @blue.persist
  @type.float32
  innerAngleMultiplier = 0.5;

  /**
   * Multiplier for the spotlight outer cone angle.
   * Native m_outerAngleMultiplier (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @blue.readwrite
  @blue.persist
  @type.float32
  outerAngleMultiplier = 1;

  /**
   * Multiplier for the inner light radius.
   * Native m_innerScaleMultiplier (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @blue.readwrite
  @blue.persist
  @type.float32
  innerScaleMultiplier = 1;

  /**
   * Multiplier for the outer light radius.
   * Native m_outerScaleMultiplier (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @blue.readwrite
  @blue.persist
  @type.float32
  outerScaleMultiplier = 1;

  /**
   * Amplitude of light intensity noise.
   * Native m_noiseAmplitude (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @blue.readwrite
  @blue.persist
  @type.float32
  noiseAmplitude = 0;

  /**
   * Frequency of light intensity noise.
   * Native m_noiseFrequency (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @blue.readwrite
  @blue.persist
  @type.float32
  noiseFrequency = 1;

  /**
   * Number of octaves used for light intensity noise.
   * Native m_noiseOctaves (int32_t) [READWRITE, PERSIST]
   * @type {number}
   */
  @blue.readwrite
  @blue.persist
  @type.int32
  noiseOctaves = 1;

  /**
   * Profile path passed to the downstream light consumer; this record acquires no resource.
   * Native m_lightProfilePath (std::wstring) [READWRITE, PERSIST]
   * @type {string}
   */
  @blue.readwrite
  @blue.persist
  @type.wpath("Tr2LightProfileRes")
  lightProfilePath = "";

}

// Native IRoot record: concrete query identity with no exposure chain.
