// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";

/** EveSOFDataHullBoosterItem (eve) - generated from schema shapeHash 8b21bdcd.... */
@type.define({ className: "EveSOFDataHullBoosterItem", family: "eve" })
export class EveSOFDataHullBoosterItem extends CjsModel
{

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @io.persist
  @type.mat4
  transform = mat4.create();

  /** m_functionality (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  functionality = vec4.fromValues(0, 1, 1, 1);

  /** m_hasTrail (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  hasTrail = true;

  /** m_atlasIndex0 (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  atlasIndex0 = 0;

  /** m_atlasIndex1 (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  atlasIndex1 = 0;

  /** m_lightScale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lightScale = 1;

}
