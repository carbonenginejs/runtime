// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";

/** Defines a booster transform, functionality, trail, atlas, and light scale. */
@meta.define({ className: "EveSOFDataHullBoosterItem", family: "eve" })
export class EveSOFDataHullBoosterItem
{

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.mat4
  transform = mat4.create();

  /** m_functionality (Vector4) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec4
  functionality = vec4.fromValues(0, 1, 1, 1);

  /** m_hasTrail (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  hasTrail = true;

  /** m_atlasIndex0 (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  atlasIndex0 = 0;

  /** m_atlasIndex1 (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  atlasIndex1 = 0;

  /** m_lightScale (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lightScale = 1;

}
