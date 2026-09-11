// Source: trinity/trinityal/Tr2HalHelperStructures.h:27-48
//
// ONE FOLDER PER DONOR HEADER - see the sibling files for why.
//
// WAS NEVER PORTED. Carbon's comment calls it "Viewport for use with
// Tr2RenderContextAL", and the AL's viewport verbs were being passed loose
// objects instead, so nothing named the type or its defaults.
//
// THE TWO CONSTRUCTORS DIFFER, and the difference is Carbon's. The default one
// leaves EVERY field uninitialised - C++ gives a `float` member no value, so a
// default-constructed viewport holds garbage until someone assigns it. The
// `(width, height)` one sets all six. JavaScript cannot express "uninitialised",
// so the fields read zero here; the depth range is therefore 0..0 rather than
// Carbon's 0..1 until the sized constructor or an assignment runs, which is the
// one behaviour a caller could tell apart.


/**
 * The viewport a render context draws through.
 */
export class Tr2Viewport
{
  m_x = 0;

  m_y = 0;

  m_width = 0;

  m_height = 0;

  /**
   * Near depth. Carbon's sized constructor sets 0; its default constructor leaves
   * this uninitialised, which JavaScript cannot reproduce.
   */
  m_minZ = 0;

  /** Far depth. Carbon's sized constructor sets 1. */
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
