// Source: trinity/trinity/Curves/TriEventKey.h
// Source: trinity/trinity/Curves/TriEventKey.cpp
// Source: trinity/trinity/Curves/TriEventKey_Blue.cpp
import { meta, types } from "#schema";


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
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  time = 0;

  /** Native wide event string, persisted independently of the callable. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.wstring
  value = "";

  /** Host callable; JavaScript GC replaces native Py_XDECREF ownership. */
  @meta.edit.readwrite
  @types.objectRef("PyObject")
  callable = null;

  /** Host callable arguments; runtime-only and owned through ordinary JS references. */
  @meta.edit.readwrite
  @types.objectRef("PyObject")
  callableArgs = null;
}

// Native own query table; no inherited exposure chain.
meta.carbon.interfaceTable({ interfaces: [ TriEventKey ], chainTo: null })(TriEventKey);
