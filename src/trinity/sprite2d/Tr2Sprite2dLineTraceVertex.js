// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLineTrace.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dLineTraceVertex.json.).
import { meta } from "#schema";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";

/** Stores one editable Sprite2D line-trace point's position, color, and optional name. */
@meta.define({ className: "Tr2Sprite2dLineTraceVertex", family: "sprite2d" })
export class Tr2Sprite2dLineTraceVertex
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_position (Vector2) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec2
  position = vec2.create();

  /** m_color (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  color = vec4.fromValues(1, 1, 1, 1);

}

// Native IRoot record exposes only its concrete interface.
meta.blue.interfaceTable({ interfaces: [Tr2Sprite2dLineTraceVertex], chainTo: null })(Tr2Sprite2dLineTraceVertex);
