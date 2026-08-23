// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { EveSOFDataTexture } from "./EveSOFDataTexture.js";

/** EveSOFDataLogo (eve) - generated from schema shapeHash ce883998.... */
@type.define({ className: "EveSOFDataLogo", family: "eve" })
export class EveSOFDataLogo extends CjsModel
{

  /** m_textures (PEveSOFDataTextureVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataTexture")
  textures = [];

  /** Populates a logo configuration with this record's authored texture paths. */
  Assign(config = {})
  {
    config.textures = this.AssignTextures(config.textures);
    return config;
  }

  /** Writes every authored logo texture path into the supplied map. */
  AssignTextures(out = {})
  {
    for (const texture of this.textures) texture.Assign(out);
    return out;
  }

  /**
   * Merges a base logo's texture list with optional named overrides into a
   * reusable logo record.
   */
  static combine(base, overrides, out = null)
  {
    out ??= new this();
    if (!base) return out;
    EveSOFDataTexture.combineArrays(base.textures, overrides?.textures, out.textures);
    return out;
  }

}
