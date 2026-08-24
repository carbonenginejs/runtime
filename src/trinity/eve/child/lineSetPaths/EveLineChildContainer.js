// Source: trinity/trinity/Eve/SpaceObject/Children/LineSetPaths/EveLineChildContainer.h
// Promoted from generated intake so its required IEveLineSetPath behavior remains explicit.
import { io, type } from "#schema";
import { IEveLineSetPath } from "./IEveLineSetPath.js";


/** Groups line-path children beneath a shared transform with naming and visibility state. */
@type.define({ className: "EveLineChildContainer", family: "eve/child/lineSetPaths", purpose: "Groups line-path children beneath an EveChildTransform with shared naming and visibility state." })
export class EveLineChildContainer extends IEveLineSetPath
{

  /** m_isVisible (bool) [READ] */
  @io.read
  @type.boolean
  isVisible = true;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_lines (PIEveLineSetPathVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveLineSetPath")
  lines = [];

}
