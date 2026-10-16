import { CjsSchema } from "#schema";

// CarbonEngineJS original (no Carbon counterpart).
import { CjsMusicEngineScheduledClip } from "./CjsMusicEngineScheduledClip.js";
import { CjsMusicEngineFade, LINEAR_FADE_CURVE } from "./CjsMusicEngineFade.js";

/**
 * Owns the Web Audio sources, fade state, and route nodes for one scheduled
 * music segment.
 */
export class CjsMusicEngineScheduledSegment
{
    _context;

    /** Initializes one scheduled segment around its connected gain lane. */
    constructor({
        context,
        gain,
        segmentId,
        scheduleId,
        targetId,
        startCtx,
        endCtx,
        timeline,
    })
    {
        this._context = context;
        this.sources = [];
        this.routeGains = new Map();
        this.subTracks = new Map();
        this.segmentId = segmentId;
        this.scheduleId = scheduleId;
        this.targetId = targetId;
        this.gain = gain;
        this.startCtx = startCtx;
        this.endCtx = endCtx;
        this.audibleEndCtx = endCtx;
        this.timeline = timeline;
        this.envelopes = [];
        this.fading = false;
        this.fadeEndCtx = null;
        this.disposed = false;
    }

    /** Retains and asynchronously realizes one already-windowed clip. */
    ScheduleClip({
        sourceId,
        startCtx,
        offsetMs,
        initialOffsetMs,
        audibleStartMs,
        audibleEndMs,
        isPrepared,
        resolveDestination,
        acquireBuffer,
        scheduleDuck,
    })
    {
        const endCtx = startCtx
            + (audibleEndMs - audibleStartMs
                - (offsetMs - initialOffsetMs)) / 1000;
        // Route resolution deliberately follows insertion: callers may inspect
        // the retained failed scheduling attempt when a dependency throws.
        const destination = resolveDestination() ?? this.gain;
        const { prepared, isLive } = acquireBuffer();
        const entry = new CjsMusicEngineScheduledClip({
            context: this._context,
            sourceId,
            startCtx,
            endCtx,
            offsetSeconds: Math.max(0, offsetMs) / 1000,
            destination,
            acquireBuffer: () => prepared,
            isPrepared,
            isLive,
            getStopAt: () => this.fading ? this.fadeEndCtx : null,
            scheduleDuck,
        });

        this.sources.push(entry);
        this.audibleEndCtx = Math.max(this.audibleEndCtx, endCtx);
        return entry;
    }

    /** Arms audio-clock stops for a future authored pause boundary. */
    SchedulePauseAt(pauseAt)
    {
        for (const entry of this.sources)
        {
            entry.SchedulePauseAt(pauseAt);
        }
    }

    /** Cancels a future freeze when Resume arrives during the Pause fade. */
    CancelScheduledPause()
    {
        for (const entry of this.sources)
        {
            entry.CancelScheduledPause();
        }
    }

    /** Freezes every clip at one authored musical boundary. */
    PauseAt(pauseAt)
    {
        for (const envelope of this.envelopes)
        {
            const end = envelope.start + envelope.duration;

            if (envelope.duration <= 0 || end <= pauseAt)
            {
                continue;
            }
            const ratio = pauseAt <= envelope.start
                ? 0
                : Math.min(1, (pauseAt - envelope.start) / envelope.duration);
            const progress = envelope.progress
                + (1 - envelope.progress) * ratio;
            const value = envelope.from + (envelope.to - envelope.from)
                * CjsMusicEngineFade.fadeCurveValue(envelope.curve, progress);

            CjsMusicEngineFade.holdAudioParam(envelope.param, pauseAt, value);
            envelope.paused = {
                delay: Math.max(0, envelope.start - pauseAt),
                duration: end - Math.max(pauseAt, envelope.start),
                progress,
            };
        }
        for (const entry of this.sources)
        {
            entry.PauseAt(pauseAt);
        }
    }

    /** Shifts this segment and resumes each retained clip together. */
    ResumeAt(resumeAt, pauseAt)
    {
        const delta = resumeAt - pauseAt;

        this.startCtx += delta;
        this.endCtx += delta;
        this.audibleEndCtx += delta;
        if (this.timeline)
        {
            this.timeline.startCtx += delta;
        }
        if (this.fadeEndCtx !== null)
        {
            this.fadeEndCtx += delta;
        }
        for (const envelope of this.envelopes)
        {
            if (!envelope.paused) continue;
            envelope.start = resumeAt + envelope.paused.delay;
            envelope.duration = envelope.paused.duration;
            envelope.progress = envelope.paused.progress;
            envelope.paused = null;
            CjsMusicEngineFade.scheduleFade(
                envelope.param,
                envelope.from,
                envelope.to,
                envelope.start,
                envelope.duration,
                envelope.curve,
                envelope.progress,
            );
        }
        for (const entry of this.sources)
        {
            entry.ResumeAt(resumeAt);
        }
    }

    /** Returns each gain parameter participating in synchronized fades. */
    GetGainParams()
    {
        const params = [];
        const legacy = this.gain?.gain;

        if (legacy) params.push(legacy);
        for (const route of this.routeGains.values())
        {
            const param = route.transitionGain?.gain;

            if (param) params.push(param);
        }
        return params;
    }

    /** Retains and schedules one musical gain envelope. */
    FadeIn({ when, duration, curve, progress = 0 })
    {
        for (const param of this.GetGainParams())
        {
            this._ScheduleEnvelope({
                param,
                from: 0,
                to: 1,
                start: when,
                duration,
                curve,
                progress,
            });
        }
    }

    /** Records and schedules one authored music automation envelope. */
    _ScheduleEnvelope({
        param,
        from,
        to,
        start,
        duration,
        curve,
        progress = 0,
    })
    {
        this.envelopes.push({
            param,
            from,
            to,
            start,
            duration,
            curve,
            progress,
            paused: null,
        });
        CjsMusicEngineFade.scheduleFade(
            param,
            from,
            to,
            start,
            duration,
            curve,
            progress,
        );
    }

    /** Fades this segment and stops loaded or future sources. */
    FadeOut({
        when,
        duration,
        startValue = null,
        fadeCurve = LINEAR_FADE_CURVE,
        progress = 0,
        override = false,
    })
    {
        // Authored fades are first-wins. Explicit browser transport may only
        // shorten one, never extend its already scheduled audible lifetime.
        if (this.fading && !override) return;
        if (override && this.fadeEndCtx !== null)
        {
            duration = Math.max(
                0,
                Math.min(when + duration, this.fadeEndCtx) - when,
            );
            for (const param of this.GetGainParams())
            {
                if (typeof param.cancelAndHoldAtTime === "function")
                {
                    param.cancelAndHoldAtTime(when);
                }
                else
                {
                    param.cancelScheduledValues(0);
                    param.setValueAtTime(param.value ?? 1, when);
                }
            }
        }
        this.fading = true;
        this.fadeEndCtx = when + duration;
        if (duration > 0)
        {
            for (const param of this.GetGainParams())
            {
                const authored = startValue !== null;

                this._ScheduleEnvelope({
                    param,
                    from: authored ? 1 : (param.value ?? 1),
                    to: 0,
                    start: when,
                    duration,
                    curve: authored ? fadeCurve : LINEAR_FADE_CURVE,
                    progress: authored ? progress : 0,
                });
            }
        }
        for (const entry of this.sources)
        {
            if (entry.source)
            {
                const stopAt = when + duration;

                if (stopAt <= entry.startCtx)
                {
                    entry.duckActivity?.Cancel?.(stopAt);
                    entry.duckActivity = null;
                }
                else
                {
                    entry.duckActivity?.End?.(stopAt);
                }
                entry.ScheduleStopAt(stopAt);
            }
            else if (when + duration <= (this._context?.currentTime ?? 0))
            {
                entry.cancelled = true;
            }
        }
    }

    /** Cancels and disconnects every Web Audio node owned by this segment. */
    Dispose()
    {
        if (this.disposed) return;
        this.disposed = true;
        for (const entry of this.sources)
        {
            entry.Dispose();
        }
        for (const route of this.routeGains.values())
        {
            route.lowPassFilter?.disconnect();
            route.highPassFilter?.disconnect();
            route.gain?.disconnect();
            route.transitionGain?.disconnect();
            for (const node of route.busEffectNodes ?? [])
            {
                node.disconnect();
            }
        }
        this.routeGains.clear();
        this.gain?.disconnect();
    }
}

CjsSchema.meta.define(CjsMusicEngineScheduledSegment, { className: "CjsMusicEngineScheduledSegment" });
