import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";

/** Defines a booster transform, functionality, trail, atlas, and light scale. */
@be.define("EveSOFDataHullBoosterItem")
@blue.inherit(IRoot)
export class EveSOFDataHullBoosterItem
{

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.mat4
  transform = mat4.create();

  /** m_functionality (Vector4) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec4
  functionality = vec4.fromValues(0, 1, 1, 1);

  /** m_hasTrail (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  hasTrail = true;

  /** m_atlasIndex0 (uint32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.uint32
  atlasIndex0 = 0;

  /** m_atlasIndex1 (uint32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.uint32
  atlasIndex1 = 0;

  /** m_lightScale (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  lightScale = 1;

}
