import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Curves/TriEventKey.h
// Source: trinity/trinity/Curves/TriEventKey.cpp
// Source: trinity/trinity/Curves/TriEventKey_Blue.cpp
import { meta, type } from "#schema";


/**
 * One key of a TriEventCurve: a time in seconds plus either a named event string
 * or a callable and its arguments to invoke when the playhead crosses it.
 */
@be.inherit(IRoot)
@be.define("TriEventKey")
export class TriEventKey extends IRoot
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
  @be.mapAttribute(be.READWRITE)
  /** Carbon: m_callable (trinity/trinity/Curves/TriEventKey.h:22).
   * Adapted: Python values use ordinary JavaScript callables; they are not IRoot objects.
   */
  @meta.adapted
  @type.unknown
  callable = null;

  /** Host callable arguments; runtime-only and owned through ordinary JS references. */
  @be.mapAttribute(be.READWRITE)
  /** Carbon: m_callableArgs (trinity/trinity/Curves/TriEventKey.h:23).
   * Adapted: Python values use ordinary JavaScript argument arrays; they are not IRoot objects.
   */
  @meta.adapted
  @type.array("unknown")
  callableArgs = null;
}

// Native own query table; no inherited exposure chain.
