import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Curves/TriEventKey.h
// Source: trinity/trinity/Curves/TriEventKey.cpp
// Source: trinity/trinity/Curves/TriEventKey_Blue.cpp
import { type, blue } from "#schema";


/**
 * One key of a TriEventCurve: a time in seconds plus either a named event string
 * or a callable and its arguments to invoke when the playhead crosses it.
 */
@blue.inherit(IRoot)
@be.define("TriEventKey")
export class TriEventKey
{
  /** Event time in seconds. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  time = 0;

  /** Native wide event string, persisted independently of the callable. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.wstring
  value = "";

  /** Host callable; JavaScript GC replaces native Py_XDECREF ownership. */
  @blue.readwrite
  @type.rootRef("PyObject")
  callable = null;

  /** Host callable arguments; runtime-only and owned through ordinary JS references. */
  @blue.readwrite
  @type.rootRef("PyObject")
  callableArgs = null;
}

// Native own query table; no inherited exposure chain.

