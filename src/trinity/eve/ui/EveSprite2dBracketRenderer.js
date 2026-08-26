// Source: trinity/trinity/EveSprite2dBracketRenderer.h
// Source: trinity/trinity/EveSprite2dBracketRenderer.cpp
// Source: trinity/trinity/EveSprite2dBracketRenderer_Blue.cpp
// Promoted from generated source: Carbon derives this class from
// Tr2SpriteObject, so a CjsModel root silently discarded its sprite contract.
import { carbon, impl, io, type } from "#schema";
import { Tr2SpriteObject } from "../../generated/sprite2d/Tr2SpriteObject.js";


/**
 * Binds a bracket collection and icon atlas for rendering EVE UI markers in a
 * Sprite2D scene.
 */
@type.define({ className: "EveSprite2dBracketRenderer", family: "eve/ui" })
export class EveSprite2dBracketRenderer extends Tr2SpriteObject
{

  /** m_iconAtlas (Tr2AtlasTexturePtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2AtlasTexture")
  iconAtlas = null;

  /** m_brackets (PEveSprite2dBracketVector) [READ] */
  @io.read
  @type.list("EveSprite2dBracket")
  brackets = [];

  /** Carbon submits its own buffers directly rather than joining sprite vertices. */
  @carbon.method
  @impl.implemented
  GetVertexCount()
  {
    return 0;
  }

  /**
   * Builds and submits the bracket vertex/index buffers through the active
   * Sprite2D renderer. Buffer realization belongs to the selected engine.
   */
  @carbon.method
  @impl.notImplemented
  GatherSprites(_renderer)
  {
    throw new Error("EveSprite2dBracketRenderer.GatherSprites is not implemented in CarbonEngineJS.");
  }

  /** Carbon's bracket renderer is deliberately not point-pickable. */
  @carbon.method
  @impl.implemented
  PickPoint(_x, _y, _renderer)
  {
    return null;
  }

}
