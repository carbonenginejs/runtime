// Source: trinity/trinity/Curves/TriEventKey.h
// Source: trinity/trinity/Curves/TriEventKey.cpp
import { CjsModel } from "#model";
import { edit, type } from "#schema";


/**
 * One key of a TriEventCurve: a time in seconds plus either a named event string
 * or a callable and its arguments to invoke when the playhead crosses it.
 */
@type.define({
  className: "TriEventKey",
  family: "curves"
})
export class TriEventKey extends CjsModel
{
  @edit.readwrite
  @type.objectRef("PyObject")
  callable = null;

  @edit.readwrite
  @type.objectRef("PyObject")
  callableArgs = null;

  @edit.readwrite
  @edit.persist
  @type.string
  value = "";

  @edit.readwrite
  @edit.persist
  @type.float32
  time = 0;
}
