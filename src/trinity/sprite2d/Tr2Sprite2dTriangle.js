import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPolygon.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dTriangle.json.).
import { type, blue } from "#schema";

/**
 * Stores the three uint16 vertex indices of one Sprite2D polygon triangle (Tr2Sprite2dPolygon.h:39-47; zero
 * constructor Tr2Sprite2dPolygon.cpp:202-207; exposure Tr2Sprite2dPolygon_Blue.cpp:538-558).
 * Adapted storage: Carbon keeps `uint16_t m_index[3]` and exposes its elements as `index0..2`; the schema
 * describes one field per exposed attribute, so the three elements are stored under their exposure names.
 */
@be.define("Tr2Sprite2dTriangle")

@blue.inherit(IRoot)
export class Tr2Sprite2dTriangle
{

  /** m_index[0] (uint16_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.uint16
  index0 = 0;

  /** m_index[1] (uint16_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.uint16
  index1 = 0;

  /** m_index[2] (uint16_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.uint16
  index2 = 0;

}

// Native IRoot record exposes only its concrete triangle interface.
