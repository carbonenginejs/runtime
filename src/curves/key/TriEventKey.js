// Source: E:\carbonengine\trinity\trinity\Curves\TriEventKey.h
// Source: E:\carbonengine\trinity\trinity\Curves\TriEventKey.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { io, type } from "@carbonenginejs/runtime-utils/schema";


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
  @io.readwrite
  @type.objectRef("PyObject")
  callable = null;

  @io.readwrite
  @type.objectRef("PyObject")
  callableArgs = null;

  @io.persist
  @type.string
  value = "";

  @io.persist
  @type.float32
  time = 0;
}
