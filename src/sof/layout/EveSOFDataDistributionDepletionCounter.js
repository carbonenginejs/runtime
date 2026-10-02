// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";

/** Stores a named integer counter used to deplete layout-distribution capacity deterministically. */
@meta.define({ className: "EveSOFDataDistributionDepletionCounter", family: "eve" })
export class EveSOFDataDistributionDepletionCounter
{

  /** m_value (int32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  value = 1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

}
