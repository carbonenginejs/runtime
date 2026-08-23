// Source: trinity/trinity/UI/Tr2PresentParameters.h
// Hand-maintained from Carbon source; Trinity owns the graph class and engines realize live state.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2PresentParameters (ui) - generated from schema shapeHash 0f696098.... */
@type.define({ className: "Tr2PresentParameters", family: "ui" })
export class Tr2PresentParameters extends CjsModel
{

  /** software (unknown) [READWRITE, ENUM] */
  @io.readwrite
  @type.boolean
  software = false;

  /** mode.width (unknown) [READWRITE] */
  @io.readwrite
  @type.uint32
  backBufferWidth = 0;

  /** mode.height (unknown) [READWRITE] */
  @io.readwrite
  @type.uint32
  backBufferHeight = 0;

  /** windowed (unknown) [READWRITE] */
  @io.readwrite
  @type.boolean
  windowed = false;

}
