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
// JavaScript carries callback failures as thrown values. CjsScriptCallback returns
// the callback's value and documents exception propagation on Call and CallVoid.
// Controller and curve-set delivery sites catch/report failures to reproduce
// native report-and-continue behavior without changing that general call contract.
//
// This remains a non-exported, non-instantiable disposition record. Reconsider a
// live status object only if a consumer needs a deferred transferable call outcome
// rather than local try/catch; ordinary synchronous reporting does not require it.
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
