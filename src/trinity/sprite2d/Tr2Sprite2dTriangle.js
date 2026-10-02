// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPolygon.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dTriangle.json.).
import { meta } from "#schema";

/** Stores the three uint16 vertex indices of one Sprite2D polygon triangle. */
@meta.define({ className: "Tr2Sprite2dTriangle", family: "sprite2d" })
export class Tr2Sprite2dTriangle
{

  /** m_index[0] (uint16_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint16
  index0 = 0;

  /** m_index[1] (uint16_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint16
  index1 = 0;

  /** m_index[2] (uint16_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint16
  index2 = 0;

}

// Native IRoot record exposes only its concrete triangle interface.
meta.blue.interfaceTable({ interfaces: [Tr2Sprite2dTriangle], chainTo: null })(Tr2Sprite2dTriangle);
