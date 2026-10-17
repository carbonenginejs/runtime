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
// takes the neutral zero here and that is the JS constructor. The
// `(width, height)` one (header 37-40) sets all six and is
// `Tr2Viewport.create__WidthHeight`, so the depth range is 0..0 after the
// default constructor and 0..1 after the sized one.


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

  /** Near depth. Carbon leaves it unset (`Tr2HalHelperStructures.h:33-35`). */
  m_minZ = 0;

  /** Far depth. Carbon leaves it unset (`Tr2HalHelperStructures.h:33-35`). */
  m_maxZ = 0;

  /**
   * Carbon's sized constructor (`Tr2HalHelperStructures.h:37-40`): origin 0, 0,
   * the given size, and the depth range 0..1.
   *
   * @param {number} width Width in pixels.
   * @param {number} height Height in pixels.
   * @returns {Tr2Viewport} The viewport.
   */
  static create__WidthHeight(width, height)
  {
    const viewport = new Tr2Viewport();

    viewport.m_x = 0;
    viewport.m_y = 0;
    viewport.m_width = width;
    viewport.m_height = height;
    viewport.m_minZ = 0;
    viewport.m_maxZ = 1;

    return viewport;
  }
}

CjsSchema.decorateField(Tr2Viewport, "m_x", type.float32);
CjsSchema.decorateField(Tr2Viewport, "m_y", type.float32);
CjsSchema.decorateField(Tr2Viewport, "m_width", type.float32);
CjsSchema.decorateField(Tr2Viewport, "m_height", type.float32);
CjsSchema.decorateField(Tr2Viewport, "m_minZ", type.float32);
CjsSchema.decorateField(Tr2Viewport, "m_maxZ", type.float32);
CjsSchema.blue.define(Tr2Viewport, { className: "Tr2Viewport" });
