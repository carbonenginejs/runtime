// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLineTrace.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dLineTraceVertex.json.).
import { carbon, edit, type } from "#schema";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";

/** Stores one editable Sprite2D line-trace point's position, color, and optional name. */
@type.define({ className: "Tr2Sprite2dLineTraceVertex", family: "sprite2d" })
export class Tr2Sprite2dLineTraceVertex
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_position (Vector2) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.vec2
  position = vec2.create();

  /** m_color (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

}

// Native IRoot record exposes only its concrete interface.
carbon.interfaceTable({ interfaces: [Tr2Sprite2dLineTraceVertex], chainTo: null })(Tr2Sprite2dLineTraceVertex);
