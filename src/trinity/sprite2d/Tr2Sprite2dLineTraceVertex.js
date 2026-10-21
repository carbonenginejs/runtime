import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLineTrace.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dLineTraceVertex.json.).
import { type, blue } from "#schema";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";

/**
 * Stores one editable Sprite2D line-trace point's position, color, and optional name
 * (Tr2Sprite2dLineTrace.h:15-28; defaults Tr2Sprite2dLineTrace.cpp:10-14; exposure Tr2Sprite2dLineTrace_Blue.cpp:399-421).
 */
@be.define("Tr2Sprite2dLineTraceVertex")

@blue.inherit(IRoot)
export class Tr2Sprite2dLineTraceVertex
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_position (Vector2) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec2
  position = vec2.create();

  /** m_color (Color) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

}

// Native IRoot record exposes only its concrete interface.
