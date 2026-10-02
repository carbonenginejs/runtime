// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { EveSOFDataTexture } from "./EveSOFDataTexture.js";

/** Stores a logo texture set and supports assignment and composition with another logo value. */
@meta.define({ className: "EveSOFDataLogo", family: "eve" })
export class EveSOFDataLogo
{

  /** Named texture bindings assigned into the logo texture map; native m_textures is a READ/PERSIST pointer vector, retained as a JS array.
   * @type {EveSOFDataTexture[]}
   */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataTexture")
  textures = [];

  /** Populates a logo configuration with authored texture paths; a JS-only helper.
   * @param {object} [config={}] Reused logo configuration.
   * @returns {object} The supplied configuration.
   */
  @meta.ours
  Assign(config = {})
  {
    config.textures = this.AssignTextures(config.textures);
    return config;
  }

  /** Writes texture paths keyed by binding name; a JS-only helper.
   * @param {Object<string, string>} [out={}] Reused texture map.
   * @returns {Object<string, string>} The supplied map.
   */
  @meta.ours
  AssignTextures(out = {})
  {
    for (const texture of this.textures) texture.Assign(out);
    return out;
  }

  /**
   * Merges a base logo's texture list with optional named overrides into a
   * reusable logo record. This is a JS-only composition helper.
   * @param {EveSOFDataLogo|null} base Base texture bindings; null leaves the output unchanged.
   * @param {EveSOFDataLogo|null} overrides Optional named texture overrides.
   * @param {EveSOFDataLogo|null} [out=null] Reused output, or a new logo when null.
   * @returns {EveSOFDataLogo} The output logo.
   */
  @meta.ours
  static combine(base, overrides, out = null)
  {
    out ??= new this();
    if (!base) return out;
    EveSOFDataTexture.combineArrays(base.textures, overrides?.textures, out.textures);
    return out;
  }

}

// Native IRoot-only data exposes its own identity, with no lifecycle/update contract.
meta.blue.interfaceTable({ interfaces: [EveSOFDataLogo], chainTo: null })(EveSOFDataLogo);
