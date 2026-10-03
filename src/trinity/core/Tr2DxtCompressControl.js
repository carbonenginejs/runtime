// Source: trinity/trinity/Tr2DxtCompressor.h:40-67; cpp:926-977.
import { CjsSchema, meta } from "#schema";

/** Carbon's completion/cancellation control for a single asynchronous encode. */
export class Tr2DxtCompressControl
{
    /** m_cancel, initially false. */
    _cancel = false;
    /** m_isDone, initially false. */
    _isDone = false;
    /** Browser replacement for the native scheduled task id. */
    _abortController = null;

    /** Abort the owned worker; a browser AbortController replaces TaskSystem.CancelTask. */
    Cancel()
    {
        this._cancel = true;
        if (this._abortController) this._abortController.abort();
        this._isDone = true;
    }

    /** Whether the task completed or was canceled (cpp:960-963). */
    IsDone()
    {
        return this._isDone;
    }

    /** Return the native cancellation flag (cpp:968-971). */
    IsCanceling()
    {
        return this._cancel;
    }

    /** Mark the task completed (cpp:974-977). */
    Done()
    {
        this._isDone = true;
    }
}

CjsSchema.define(Tr2DxtCompressControl, {
    className: "Tr2DxtCompressControl", carbon: "Tr2DxtCompressControl",
    methods: { Cancel: [meta.adapted], IsDone: [meta.implemented], IsCanceling: [meta.implemented], Done: [meta.implemented] }
});
