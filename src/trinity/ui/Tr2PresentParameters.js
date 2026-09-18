// Source: trinity/trinity/UI/Tr2PresentParameters.h
// Hand-maintained from Carbon source. Unimplemented backend methods here are
// unported Carbon behaviour, not a boundary: Carbon holds its handles on this
// class and calls the AL from it.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Carries the software-device, back-buffer size, and windowed-mode values used when creating a rendering device. */
@type.define({ className: "Tr2PresentParameters", family: "ui" })
export class Tr2PresentParameters extends CjsModel
{

  /** software (unknown) [READWRITE, ENUM] */
  @edit.readwrite
  @type.boolean
  software = false;

  /** mode.width (unknown) [READWRITE] */
  @edit.readwrite
  @type.uint32
  backBufferWidth = 0;

  /** mode.height (unknown) [READWRITE] */
  @edit.readwrite
  @type.uint32
  backBufferHeight = 0;

  /** windowed (unknown) [READWRITE] */
  @edit.readwrite
  @type.boolean
  windowed = false;

}
