// Source: trinity/trinityal/Tr2HalHelperStructures.h:27-48
import { CjsSchema, type } from "#schema";
//
// ONE FOLDER PER DONOR HEADER - see the sibling files for why.
//
// WAS NEVER PORTED. Carbon's comment calls it "Viewport for use with
// Tr2RenderContextAL", and the AL's viewport verbs were being passed loose
// objects instead, so nothing named the type or its defaults.
//
// THE TWO CONSTRUCTORS DIFFER, and the difference is Carbon's. The default one
// (`Tr2HalHelperStructures.h:33-35`) leaves EVERY field unset, so each field
// takes the neutral zero here. The `(width, height)` one (header 37-38) sets all
// six, so the depth range is 0..0 until the sized constructor or an assignment
// runs and 0..1 after it.


/**
 * The viewport a render context draws through.
 */
export class Tr2Viewport
{
  /** Carbon leaves it unset (`Tr2HalHelperStructures.h:33-35`). */
  m_x = 0;

  /** Carbon leaves it unset (`Tr2HalHelperStructures.h:33-35`). */
  m_y = 0;

  /** Carbon leaves it unset (`Tr2HalHelperStructures.h:33-35`). */
  m_width = 0;

  /** Carbon leaves it unset (`Tr2HalHelperStructures.h:33-35`). */
  m_height = 0;

  /**
   * Near depth. Carbon's sized constructor sets 0; with its default constructor
   * Carbon leaves it unset (`Tr2HalHelperStructures.h:33-35`).
   */
  m_minZ = 0;

  /**
   * Far depth. Carbon's sized constructor sets 1; with its default constructor
   * Carbon leaves it unset (`Tr2HalHelperStructures.h:33-35`).
   */
  m_maxZ = 0;

  /**
   * @param {number} [width] Width in pixels; omit for Carbon's default constructor.
   * @param {number} [height] Height in pixels.
   */
  constructor(width = undefined, height = undefined)
  {
    if (width === undefined && height === undefined) return;

    this.m_x = 0;
    this.m_y = 0;
    this.m_width = Number(width);
    this.m_height = Number(height);
    this.m_minZ = 0;
    this.m_maxZ = 1;
  }
}

CjsSchema.decorateField(Tr2Viewport, "m_x", type.float32);
CjsSchema.decorateField(Tr2Viewport, "m_y", type.float32);
CjsSchema.decorateField(Tr2Viewport, "m_width", type.float32);
CjsSchema.decorateField(Tr2Viewport, "m_height", type.float32);
CjsSchema.decorateField(Tr2Viewport, "m_minZ", type.float32);
CjsSchema.decorateField(Tr2Viewport, "m_maxZ", type.float32);
CjsSchema.blue.define(Tr2Viewport, { className: "Tr2Viewport" });
