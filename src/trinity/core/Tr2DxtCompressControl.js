// Source: trinity/trinity/Tr2DxtCompressor.h:40-67; cpp:926-977.
import { CjsSchema } from "#schema";

/** Carbon's completion/cancellation control for a single asynchronous encode. */
export class Tr2DxtCompressControl
{
    /** m_cancel, initially false. */
    _cancel = false;
    /** m_isDone, initially false. */
    _isDone = false;
    /** Browser replacement for the native scheduled task id. */
    _abortController = null;

    /**
     * Abort the owned worker; a browser AbortController replaces TaskSystem.CancelTask.
     *
     * @adapted
     */
    Cancel()
    {
        this._cancel = true;
        if (this._abortController) this._abortController.abort();
        this._isDone = true;
    }

    /**
     * Whether the task completed or was canceled (cpp:960-963).
     *
     * @implemented
     */
    IsDone()
    {
        return this._isDone;
    }

    /**
     * Return the native cancellation flag (cpp:968-971).
     *
     * @implemented
     */
    IsCanceling()
    {
        return this._cancel;
    }

    /**
     * Mark the task completed (cpp:974-977).
     *
     * @implemented
     */
    Done()
    {
        this._isDone = true;
    }
}

CjsSchema.meta.carbon("Tr2DxtCompressControl")(Tr2DxtCompressControl);
