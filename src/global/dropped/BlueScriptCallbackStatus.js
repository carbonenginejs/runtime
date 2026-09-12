// Source: blueexposure/include/BlueScriptCallback.h
//   blueexposure/BlueScriptCallback.cpp
//
// DROPPED, and the reason is a platform one rather than a judgement call.
//
// Carbon returns this from every BlueScriptCallback::Call and CallVoid. It
// exists because a C++ caller cannot otherwise see that a Python callback
// raised: the status carries OK / CALL_ERROR / EXCEPTION alongside the captured
// PyObject* type, value and traceback, and lets the caller choose between
// MuteException and ReportException before the destructor reports it.
//
// JavaScript has ONE exception mechanism for both sides of that boundary. A
// throwing callback propagates to its caller unchanged, so there is nothing for
// a status object to carry and no decision for it to defer. CjsScriptCallback
// therefore returns the callback's own value, and records that divergence with
// @impl.reason on both call methods.
//
// WHAT WOULD BRING IT BACK: a caller that must SUPPRESS a failing callback
// rather than propagate it - Carbon's MuteException - or one that needs to
// report the failure somewhere other than the throw site. Neither exists here
// today. If one appears, this is a real port of the class below and not a flag
// on CjsScriptCallback.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Carbon's private `Status` enum; the whole state the class discriminates on. */
export const BLUE_SCRIPT_CALLBACK_STATUS = Object.freeze({
    OK: 0,
    CALL_ERROR: 1,
    EXCEPTION: 2
});

/** The call outcome Carbon returns from every script callback invocation; dropped because JavaScript propagates the exception itself. */
@type.define({ className: "BlueScriptCallbackStatus", carbon: "BlueScriptCallbackStatus", family: "blue" })
export class BlueScriptCallbackStatus extends CjsModel
{

    /** m_hasException (Status) - the OK / CALL_ERROR / EXCEPTION discriminator. */
    @type.uint32
    hasException = BLUE_SCRIPT_CALLBACK_STATUS.OK;

    /** m_muteException (bool) - set by MuteException(); suppresses the report. */
    @type.boolean
    muteException = false;

    /** m_exceptionReported (bool) - guards double reporting from the destructor. */
    @type.boolean
    exceptionReported = false;

    /** m_type (PyObject*) - captured exception type, BLUE_WITH_PYTHON only. */
    @type.unknown
    type = null;

    /** m_value (PyObject*) - captured exception value, BLUE_WITH_PYTHON only. */
    @type.unknown
    value = null;

    /** m_traceback (PyObject*) - captured traceback, BLUE_WITH_PYTHON only. */
    @type.unknown
    traceback = null;

}
