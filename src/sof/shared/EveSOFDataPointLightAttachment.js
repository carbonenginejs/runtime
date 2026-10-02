// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, types } from "#schema";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Defines point-light placement, rotation, intensity, saturation, scale, noise, and profile data for an attachment. */
@meta.define({ className: "EveSOFDataPointLightAttachment", family: "eve" })
export class EveSOFDataPointLightAttachment
{

  /**
   * Color saturation applied to the attachment light.
   * Native m_saturation (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  saturation = 1;

  /**
   * Brightness multiplier applied to the attachment light.
   * Native m_intensity (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  intensity = 1;

  /**
   * Local translation of the light relative to its attachment.
   * Native m_translation (Vector3) [READWRITE, PERSIST]
   * @type {Float32Array}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.vec3
  translation = vec3.create();

  /**
   * Local orientation of the point light relative to its attachment.
   * Native m_rotation (Quaternion) [READWRITE, PERSIST]
   * @type {Float32Array}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.quat
  rotation = quat.create();

  /**
   * Multiplier for the inner light radius.
   * Native m_innerScaleMultiplier (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  innerScaleMultiplier = 1;

  /**
   * Multiplier for the outer light radius.
   * Native m_outerScaleMultiplier (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  outerScaleMultiplier = 2;

  /**
   * Amplitude of light intensity noise.
   * Native m_noiseAmplitude (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  noiseAmplitude = 0;

  /**
   * Frequency of light intensity noise.
   * Native m_noiseFrequency (float) [READWRITE, PERSIST]
   * @type {number}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  noiseFrequency = 1;

  /**
   * Number of octaves used for light intensity noise.
   * Native m_noiseOctaves (int32_t) [READWRITE, PERSIST]
   * @type {number}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.int32
  noiseOctaves = 1;

  /**
   * Profile path passed to the downstream light consumer; this record acquires no resource.
   * Native m_lightProfilePath (std::wstring) [READWRITE, PERSIST]
   * @type {string}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  lightProfilePath = "";

}

// Native IRoot record: concrete query identity with no exposure chain.
meta.carbon.interfaceTable({ interfaces: [EveSOFDataPointLightAttachment], chainTo: null })(EveSOFDataPointLightAttachment, { kind: "class" });
