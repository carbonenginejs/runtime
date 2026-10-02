// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { mat4 } from "#math/mat4";

/** Stores a named hull locator and its transformation matrix. */
@meta.define({ className: "EveSOFDataHullLocator", family: "eve" })
export class EveSOFDataHullLocator
{

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.mat4
  transform = mat4.create();

}
