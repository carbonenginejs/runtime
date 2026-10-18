import { CjsSchema } from "#schema";

// CarbonEngineJS original (no Carbon counterpart).

/** One retained music clip whose disposable Web Audio source may be resumed. */
export class CjsMusicEngineScheduledClip
{
    _acquireBuffer;

    _buffer = null;

    _context;

    _destination;

    _isLive;

    _getStopAt;

    _offsetSeconds;

    _pausedAt = null;

    _pausedDelay = 0;

    _pausedDuration = 0;

    _scheduledPauseAt = null;

    _scheduleDuck;

    /** Retains one already-windowed clip and begins asynchronous realization. */
    constructor({
        context,
        sourceId,
        startCtx,
        endCtx,
        offsetSeconds,
        destination,
        acquireBuffer,
        isPrepared,
        isLive,
        getStopAt,
        scheduleDuck,
    })
    {
        this._context = context;
        this._destination = destination;
        this._acquireBuffer = acquireBuffer;
        this._isLive = isLive;
        this._getStopAt = getStopAt;
        this._scheduleDuck = scheduleDuck;
        this._offsetSeconds = offsetSeconds;
        this.sourceId = sourceId;
        this.source = null;
        this.startCtx = startCtx;
        this.endCtx = endCtx;
        this.cancelled = false;
        this.failed = false;
        this.missed = false;
        this.ended = false;
        this.duckActivity = null;
        this._BeginLoad(isPrepared);
    }

    /** Acquires the clip buffer and realizes it when playback is active. */
    _BeginLoad(isPrepared)
    {
        let acquired;

        try
        {
            acquired = this._acquireBuffer();
        }
        catch
        {
            this.cancelled = true;
            this.failed = true;
            return;
        }
        if (isPrepared)
        {
            this._AcceptBuffer(acquired);
            return;
        }
        Promise.resolve(acquired).then(buffer =>
            this._AcceptBuffer(buffer)).catch(() =>
        {
            this.cancelled = true;
            this.failed = true;
        });
    }

    /** Retains an acquired buffer or marks the clip as failed. */
    _AcceptBuffer(buffer)
    {
        if (!buffer)
        {
            this.cancelled = true;
            this.failed = true;
            return;
        }
        this._buffer = buffer;
        if (this._pausedAt === null)
        {
            this._Realize();
        }
    }

    /** Creates the Web Audio source for the clip's remaining schedule. */
    _Realize()
    {
        if (!this._buffer || this.cancelled || this.ended
            || this._pausedAt !== null || !this._isLive())
        {
            return;
        }
        let when = this.startCtx;
        let offset = this._offsetSeconds;
        const now = Number(this._context?.currentTime) || 0;
        const stopAt = this._getStopAt();
        const carrierStopAt = [ stopAt, this._scheduledPauseAt ]
            .filter(value => value !== null)
            .reduce((minimum, value) => Math.min(minimum, value), Infinity);

        if (this._scheduledPauseAt !== null
            && this._scheduledPauseAt <= now)
        {
            this._RetainAt(this._scheduledPauseAt);
            return;
        }

        if (stopAt !== null && stopAt <= now)
        {
            this.cancelled = true;
            return;
        }

        if (when < now)
        {
            offset += now - when;
            when = now;
        }
        const duration = this.endCtx - when;

        if (!(duration > 0))
        {
            this.cancelled = true;
            this.missed = true;
            return;
        }
        const source = this._context.createBufferSource();

        source.buffer = this._buffer;
        source.connect(this._destination);
        source.onended = () =>
        {
            const endedAt = Number(this._context?.currentTime)
                || this.endCtx;
            const authoredStopAt = this._getStopAt();

            if (this._scheduledPauseAt !== null
                && this._scheduledPauseAt < this.endCtx
                && (authoredStopAt === null
                    || this._scheduledPauseAt < authoredStopAt)
                && endedAt >= this._scheduledPauseAt)
            {
                source.onended = null;
                this._RetainAt(this._scheduledPauseAt);
                return;
            }

            if (endedAt <= this.startCtx)
            {
                this.duckActivity?.Cancel(endedAt);
            }
            else
            {
                this.duckActivity?.End(endedAt);
            }
            this.duckActivity = null;
            this.ended = true;
            source.onended = null;
            source.disconnect();
        };
        try
        {
            source.start(when, Math.max(0, offset), duration);
        }
        catch
        {
            source.onended = null;
            source.disconnect();
            this.cancelled = true;
            this.failed = true;
            return;
        }
        this.source = source;
        this.startCtx = when;
        this.endCtx = when + duration;
        this._offsetSeconds = offset;
        this.duckActivity = this._scheduleDuck(
            this.startCtx,
            this.endCtx,
        );
        if (Number.isFinite(carrierStopAt))
        {
            source.stop(carrierStopAt);
        }
    }

    /** Arms an audio-clock stop without freezing the logical clip early. */
    SchedulePauseAt(pauseAt)
    {
        if (this.cancelled || this.failed || this.missed || this.ended
            || this._pausedAt !== null || this.endCtx <= pauseAt)
        {
            return;
        }
        this._scheduledPauseAt = pauseAt;
        if (this.source)
        {
            const stopAt = this._getStopAt();

            try
            {
                this.source.stop(stopAt === null
                    ? pauseAt
                    : Math.min(stopAt, pauseAt));
            }
            catch
            {
                // already stopped
            }
        }
    }

    /** Replaces a scheduled pause stop with the clip's authored end. */
    CancelScheduledPause()
    {
        if (this._scheduledPauseAt === null || this._pausedAt !== null)
        {
            return;
        }
        this._scheduledPauseAt = null;
        if (this.source)
        {
            const stopAt = this._getStopAt();

            try
            {
                this.source.stop(stopAt ?? this.endCtx);
            }
            catch
            {
                // already stopped
            }
        }
    }

    /** Schedules an authored clip end without moving an armed Pause stop. */
    ScheduleStopAt(stopAt)
    {
        if (!this.source) return;
        const carrierStopAt = this._scheduledPauseAt === null
            ? stopAt
            : Math.min(stopAt, this._scheduledPauseAt);

        try
        {
            this.source.stop(carrierStopAt);
        }
        catch
        {
            // already stopped
        }
    }

    /** Retains the clip's playback position at an authored pause boundary. */
    _RetainAt(pauseAt)
    {
        if (this._pausedAt !== null || this.cancelled || this.ended)
        {
            return;
        }
        const stopAt = this._getStopAt();
        const effectiveEnd = stopAt === null
            ? this.endCtx
            : Math.min(this.endCtx, stopAt);

        if (effectiveEnd <= pauseAt)
        {
            if (this.source)
            {
                this.source.onended = null;
                this.source.disconnect();
                this.source = null;
            }
            this.duckActivity?.End(effectiveEnd);
            this.duckActivity = null;
            this.ended = true;
            return;
        }
        this._pausedAt = pauseAt;
        this._pausedDelay = Math.max(0, this.startCtx - pauseAt);
        const elapsed = Math.max(0, pauseAt - this.startCtx);

        this._offsetSeconds += elapsed;
        this._pausedDuration = effectiveEnd
            - Math.max(this.startCtx, pauseAt);
        if (this.source)
        {
            const source = this.source;

            source.onended = null;
            try
            {
                source.stop(pauseAt);
            }
            catch
            {
                // already stopped
            }
            source.disconnect();
            this.source = null;
        }
        if (pauseAt <= this.startCtx)
        {
            this.duckActivity?.Cancel(pauseAt);
        }
        else
        {
            this.duckActivity?.End(pauseAt);
        }
        this.duckActivity = null;
    }

    /** Stops the carrier at a musical boundary and retains its logical window. */
    PauseAt(pauseAt)
    {
        if (this.cancelled || this.failed || this.missed || this.ended
            || this._pausedAt !== null)
        {
            return;
        }
        this._RetainAt(pauseAt);
    }

    /** Recreates the carrier at its retained offset on a shifted timeline. */
    ResumeAt(resumeAt)
    {
        if (this._pausedAt === null || this.cancelled || this.ended)
        {
            return;
        }
        this.startCtx = resumeAt + this._pausedDelay;
        this.endCtx = this.startCtx + this._pausedDuration;
        this._pausedAt = null;
        this._scheduledPauseAt = null;
        this._Realize();
    }

    /** Stops and disconnects this clip permanently. */
    Dispose()
    {
        this.cancelled = true;
        const now = Number(this._context?.currentTime) || 0;

        if (now <= this.startCtx)
        {
            this.duckActivity?.Cancel(now);
        }
        else
        {
            this.duckActivity?.End(now);
        }
        this.duckActivity = null;
        if (this.source)
        {
            this.source.onended = null;
            this.source.disconnect();
            this.source = null;
        }
    }
}

CjsSchema.meta.define(CjsMusicEngineScheduledClip, { className: "CjsMusicEngineScheduledClip" });
