// Source: trinity/trinity/Curves/TriEventKey.h
// Source: trinity/trinity/Curves/TriEventKey.cpp
// Source: trinity/trinity/Curves/TriEventKey_Blue.cpp
import { meta } from "#schema";


/**
 * One key of a TriEventCurve: a time in seconds plus either a named event string
 * or a callable and its arguments to invoke when the playhead crosses it.
 */
@meta.define({
  className: "TriEventKey",
  family: "curves"
})
export class TriEventKey
{
  /** Event time in seconds. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  time = 0;

  /** Native wide event string, persisted independently of the callable. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.wstring
  value = "";

  /** Host callable; JavaScript GC replaces native Py_XDECREF ownership. */
  @meta.blue.readwrite
  @meta.type.objectRef("PyObject")
  callable = null;

  /** Host callable arguments; runtime-only and owned through ordinary JS references. */
  @meta.blue.readwrite
  @meta.type.objectRef("PyObject")
  callableArgs = null;
}

// Native own query table; no inherited exposure chain.
meta.blue.interfaceTable({ interfaces: [ TriEventKey ], chainTo: null })(TriEventKey);
