// CarbonEngineJS original (no Carbon counterpart). Interactive-music engine:
// interprets the authored Wwise music graph produced in tools-core's complete
// audio-library build the way AK::MusicEngine would in the real client.
// Carbon's C++ contributes no musical intelligence (InitMusic is dead code);
// the game only posts events and sets switches/states, so this engine's fidelity
// target is the bank data, not Carbon code.
import { evaluateWwiseInterpolation } from "./internal/wwiseCurve.js";
import {
    evaluateWwiseRtpcCurve,
    wwiseDbRtpcValueToDb,
} from "./internal/wwiseRtpc.js";
import {
    evaluateBusRtpcGainDb,
    indexBusRtpcCatalog,
} from "./internal/busRtpc.js";
import {
    busStatePathUses,
    evaluateBusStateProperties,
    evaluateBusStateGainDb,
    indexBusStateCatalog,
} from "./internal/busState.js";
import { wwiseFilterPercentToHz } from "./internal/wwiseFilter.js";
import {
    createBusEffectChain,
    indexBusEffectCatalog,
} from "./internal/busEffects.js";

// v1 semantics (documented simplifications):
// - Segments chain at their exit cue; pre-entry clip audio plays when the
//   schedule allows (first segment starts at its entry cue "now").
// - Switch changes re-resolve the exact tree route and transition at the
//   rule's boundary: syncType 0 (Immediate) now, otherwise at the current
//   segment's exit cue, with the rule's fade times on source and destination
//   instance gains. Shared targets continue or restart according to their
//   switch container's Continue Playback flag.
// - Playlist groups preserve Wwise's sequence/random and continuous/step
//   modes, weighted standard/shuffle selection, repeat avoidance, and loop
//   randomization. Loop 0 = infinite. Transition segments bridge source and
//   destination with authored pre-entry/post-exit windows. Stingers and MIDI
//   tracks are not played.

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

/** Wwise FNV-1 (32-bit, lowercase) - the id hash for names. */
export function wwiseIdFromName(name)
{
    if (typeof name === "number") return name >>> 0;
    let hash = FNV_OFFSET;
    for (const char of String(name).toLowerCase())
    {
        hash = Math.imul(hash, FNV_PRIME) ^ char.charCodeAt(0);
        hash = hash >>> 0;
    }
    return hash >>> 0;
}

const DEFAULT_FADE_SECONDS = 1;
const SCHEDULE_HORIZON_SECONDS = 1.5;
const MAX_SCHEDULE_HORIZON_SECONDS = 60;
const DEFAULT_RENDER_QUANTUM_SECONDS = 128 / 48000;
const LINEAR_FADE_CURVE = 4;
const FADE_CURVE_SAMPLES = 65;

/** One Web Audio render quantum, used for coordinated future starts. */
function RenderQuantumSeconds(context)
{
    const sampleRate = Number(context?.sampleRate);

    return Number.isFinite(sampleRate) && sampleRate > 0
        ? 128 / sampleRate
        : DEFAULT_RENDER_QUANTUM_SECONDS;
}

function FadeDuration(fade)
{
    return Math.max(0, Number(fade?.transitionTime) || 0) / 1000;
}

function FadeOffset(fade)
{
    return (Number(fade?.fadeOffset) || 0) / 1000;
}

/** Lookahead needed to begin a playlist transition before its boundary. */
function PlaylistScheduleHorizon(node)
{
    let seconds = SCHEDULE_HORIZON_SECONDS;

    for (const rule of node?.rules ?? [])
    {
        seconds = Math.max(
            seconds,
            FadeDuration(rule?.src) - FadeOffset(rule?.src),
            -FadeOffset(rule?.dst),
        );
    }
    return Math.min(MAX_SCHEDULE_HORIZON_SECONDS, seconds);
}

/** Wwise AkCurveInterpolation sampled over normalized time. */
function FadeCurveValue(curve, progress)
{
    return evaluateWwiseInterpolation(curve, progress);
}

/** Schedules one linear or sampled Wwise interpolation on an AudioParam. */
function ScheduleFade(
    param,
    from,
    to,
    when,
    duration,
    curve,
    progress = 0,
)
{
    const startProgress = Math.max(0, Math.min(1, progress));
    const curveId = Number(curve);
    const startValue = from
        + (to - from) * FadeCurveValue(curveId, startProgress);

    if ("value" in param) param.value = startValue;
    if (!(duration > 0))
    {
        param.setValueAtTime?.(to, when);
        if ("value" in param) param.value = to;
        return to;
    }
    if (!Number.isInteger(curveId)
        || curveId === LINEAR_FADE_CURVE
        || typeof param.setValueCurveAtTime !== "function")
    {
        param.setValueAtTime?.(startValue, when);
        param.linearRampToValueAtTime?.(to, when + duration);
        return startValue;
    }

    const values = new Float32Array(FADE_CURVE_SAMPLES);

    for (let index = 0; index < values.length; index++)
    {
        const ratio = index / (values.length - 1);
        const sampleProgress = startProgress
            + (1 - startProgress) * ratio;

        values[index] = from
            + (to - from) * FadeCurveValue(curveId, sampleProgress);
    }
    param.setValueCurveAtTime(values, when, duration);
    return startValue;
}

function EvaluateFadeEnvelope(envelope, at)
{
    if (!envelope) return 1;
    const progress = envelope.duration <= 0
        ? 1
        : Math.max(0, Math.min(
            1,
            (at - envelope.start) / envelope.duration,
        ));

    return envelope.from + (envelope.to - envelope.from)
        * FadeCurveValue(envelope.curve, progress);
}

function HoldAudioParam(param, at, value)
{
    if (typeof param?.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(at);
    }
    else
    {
        param?.cancelScheduledValues?.(0);
    }
    param?.setValueAtTime?.(value, at);
    if (param && "value" in param) param.value = value;
}

function EvaluateBusVolumeState(state, at)
{
    if (!state) return 0;
    const duration = Number(state.duration) || 0;
    const progress = duration <= 0
        ? 1
        : Math.max(0, Math.min(
            1,
            ((Number(at) || 0) - state.startTime) / duration,
        ));

    if (progress <= 0) return state.fromDb;
    if (progress >= 1) return state.toDb;

    const from = 10 ** (state.fromDb / 20);
    const to = 10 ** (state.toDb / 20);
    const gain = from + (to - from) * evaluateWwiseInterpolation(
        state.curve,
        progress,
    );

    return 20 * Math.log10(Math.max(1e-10, gain));
}

function ScheduleMusicBusGain(
    param,
    states,
    busPathIds,
    trackRtpcCurves,
    authoredBusVolumeDb,
    authoredBusMakeUpGainDb,
    authoredOutputBusVolumeDb,
    context,
    busRtpcCatalog,
    readGlobalRtpc,
    readGlobalRtpcTransitionBoundaries,
    busStateCatalog,
    readGlobalStateWeights,
    readGlobalStateTransitionBoundaries,
    busDuckingController,
    sharedBusFaders = false,
)
{
    if (!param) return;
    const now = Number(context?.currentTime) || 0;
    const path = Array.isArray(busPathIds) ? busPathIds.map(String) : [];
    const baseDb = (sharedBusFaders ? 0 : Number(authoredBusVolumeDb) || 0)
        + (Number(authoredBusMakeUpGainDb) || 0)
        + (Number(authoredOutputBusVolumeDb) || 0);
    const evaluate = at =>
    {
        let db = baseDb;
        const seen = new Set();

        if (states instanceof Map)
        {
            for (const busId of path)
            {
                if (seen.has(busId)) continue;
                seen.add(busId);
                db += EvaluateBusVolumeState(states.get(busId), at);
            }
        }
        db += sharedBusFaders ? 0 : evaluateBusRtpcGainDb(
            busRtpcCatalog,
            path,
            readGlobalRtpc,
            at,
        );
        db += sharedBusFaders ? 0 : evaluateBusStateGainDb(
            busStateCatalog,
            path,
            readGlobalStateWeights,
            at,
        );
        db += EvaluateMusicTrackRtpcGainDb(
            trackRtpcCurves,
            readGlobalRtpc,
            at,
        );
        db += busDuckingController?.EvaluateGainDb?.(path, at) ?? 0;
        return 10 ** (db / 20);
    };
    const boundaries = [];

    if (states instanceof Map)
    {
        for (const busId of new Set(path))
        {
            const state = states.get(busId);
            const start = Number(state?.startTime);
            const end = start + Math.max(0, Number(state?.duration) || 0);

            if (Number.isFinite(start) && start > now) boundaries.push(start);
            if (Number.isFinite(end) && end > now) boundaries.push(end);
        }
    }
    if (typeof readGlobalRtpcTransitionBoundaries === "function")
    {
        boundaries.push(
            ...readGlobalRtpcTransitionBoundaries(now),
        );
    }
    if (typeof readGlobalStateTransitionBoundaries === "function")
    {
        boundaries.push(
            ...readGlobalStateTransitionBoundaries(now),
        );
    }
    boundaries.push(
        ...(busDuckingController?.TransitionBoundaries?.(path, now) ?? []),
    );
    boundaries.sort((left, right) => left - right);

    const uniqueBoundaries = [ ...new Set(boundaries) ];
    const startValue = evaluate(now);

    if (typeof param.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(now);
    }
    else
    {
        param.cancelScheduledValues?.(0);
    }
    param.setValueAtTime?.(startValue, now);
    if ("value" in param) param.value = startValue;

    let segmentStart = now;

    for (const segmentEnd of uniqueBoundaries)
    {
        if (typeof param.setValueCurveAtTime === "function")
        {
            const values = new Float32Array(FADE_CURVE_SAMPLES);

            for (let index = 0; index < values.length; index++)
            {
                const ratio = index / (values.length - 1);

                values[index] = evaluate(
                    segmentStart + (segmentEnd - segmentStart) * ratio,
                );
            }
            param.setValueCurveAtTime(
                values,
                segmentStart,
                segmentEnd - segmentStart,
            );
        }
        else
        {
            param.linearRampToValueAtTime?.(
                evaluate(segmentEnd),
                segmentEnd,
            );
        }
        segmentStart = segmentEnd;
    }
}

function EvaluateMusicTrackRtpcGainDb(curves, readGlobalRtpc, at)
{
    if (!Array.isArray(curves))
    {
        return 0;
    }

    let gainDb = 0;

    for (const curve of curves)
    {
        const current = typeof readGlobalRtpc === "function"
            ? readGlobalRtpc(curve.rtpc, at)
            : undefined;
        const input = current === undefined || current === null
            ? curve.defaultValue
            : Number(current);
        const output = evaluateWwiseRtpcCurve(
            curve.points,
            Number.isFinite(input) ? input : curve.points[0].x,
        );

        gainDb += wwiseDbRtpcValueToDb(output);
    }
    return gainDb;
}

function ScheduleMusicBusFilter(
    node,
    busPathIds,
    property,
    highPass,
    context,
    busStateCatalog,
    readGlobalStateWeights,
    readGlobalStateTransitionBoundaries,
)
{
    if (!node) return;
    const now = Number(context?.currentTime) || 0;
    const evaluate = at => wwiseFilterPercentToHz(
        evaluateBusStateProperties(
            busStateCatalog,
            busPathIds,
            readGlobalStateWeights,
            at,
        )[property],
        highPass,
    );
    const boundaries = typeof readGlobalStateTransitionBoundaries === "function"
        ? [ ...new Set(readGlobalStateTransitionBoundaries(now)) ]
            .map(Number)
            .filter(value => Number.isFinite(value) && value > now)
            .sort((left, right) => left - right)
        : [];
    const param = node.frequency;
    const startValue = evaluate(now);

    if (typeof param?.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(now);
    }
    else
    {
        param?.cancelScheduledValues?.(0);
    }
    param?.setValueAtTime?.(startValue, now);
    if (param && "value" in param) param.value = startValue;
    let segmentStart = now;

    for (const segmentEnd of boundaries)
    {
        if (typeof param?.setValueCurveAtTime === "function")
        {
            const values = new Float32Array(FADE_CURVE_SAMPLES);

            for (let index = 0; index < values.length; index++)
            {
                const ratio = index / (values.length - 1);

                values[index] = evaluate(
                    segmentStart + (segmentEnd - segmentStart) * ratio,
                );
            }
            param.setValueCurveAtTime(
                values,
                segmentStart,
                segmentEnd - segmentStart,
            );
        }
        else
        {
            param?.linearRampToValueAtTime?.(
                evaluate(segmentEnd),
                segmentEnd,
            );
        }
        segmentStart = segmentEnd;
    }
}

function segmentCues(segment)
{
    const positions = segment.markers.map(marker => marker.position).sort((a, b) => a - b);
    const entry = positions.length ? positions[0] : 0;
    const exit = positions.length > 1 ? positions[positions.length - 1] : segment.duration;
    return { entry, exit };
}

/**
 * Resolves Wwise music time settings at one hierarchy step.
 *
 * A root necessarily supplies the initial settings. Descendants inherit when
 * Override parent is disabled; graphs predating the explicit flag retain
 * their historical behavior by treating an absent flag as an override.
 */
function EffectiveMeter(inherited, node)
{
    const meter = node?.meter ?? null;

    if (!meter)
    {
        return inherited ?? null;
    }
    if (!inherited || node.meterOverride !== false)
    {
        return meter;
    }
    return inherited;
}

/** Weighted pick over playlist children honoring an avoid-repeat history. */
function pickWeighted(children, history, avoidRepeatCount, random)
{
    const avoided = new Set(history.slice(-Math.max(0, avoidRepeatCount)));
    let pool = children.filter(child => !avoided.has(child.item.playlistItemId));
    if (!pool.length) pool = children;
    let total = 0;
    for (const child of pool) total += child.item.weight || 1;
    let roll = random() * total;
    for (const child of pool)
    {
        roll -= child.item.weight || 1;
        if (roll <= 0) return child;
    }
    return pool[pool.length - 1];
}

/** Builds the nested playlist tree from the flat pre-order item list. */
function buildPlaylistTree(items)
{
    let index = 0;
    const build = () =>
    {
        const item = items[index++];
        const children = [];
        for (let i = 0; i < item.childCount; i++) children.push(build());
        return { item, children };
    };
    return build();
}

/**
 * Iterator over a playlist tree yielding segment ids. Sequence groups play
 * children in order; random groups pick weighted; loop counts honored
 * (0 = infinite). Returns null when the playlist is exhausted.
 */
function createPlaylistIterator(playlistNode, random)
{
    const root = buildPlaylistTree(playlistNode.playlist);
    const histories = new Map();
    const shufflePools = new Map();
    const sequencePositions = new Map();

    const selectRandom = node =>
    {
        const key = node.item.playlistItemId;
        const avoid = Math.max(
            Number(node.item.avoidRepeatCount) || 0,
            node.item.shuffle ? 1 : 0,
        );
        const history = histories.get(key) ?? [];
        let pool = node.children;

        if (node.item.shuffle)
        {
            let shuffle = shufflePools.get(key);

            if (!shuffle?.length)
            {
                shuffle = [ ...node.children ];
                shufflePools.set(key, shuffle);
            }
            pool = shuffle;
        }

        const child = pickWeighted(
            pool,
            history,
            avoid,
            random,
        );

        if (!child)
        {
            return null;
        }

        history.push(child.item.playlistItemId);
        while (history.length > avoid)
        {
            history.shift();
        }
        histories.set(key, history);

        if (node.item.shuffle)
        {
            const shuffle = shufflePools.get(key) ?? [];
            const index = shuffle.indexOf(child);

            if (index !== -1)
            {
                shuffle.splice(index, 1);
            }
        }
        return child;
    };

    const selectSequenceStep = node =>
    {
        const key = node.item.playlistItemId;
        const position = sequencePositions.get(key) ?? 0;
        const child = node.children[position % node.children.length];

        sequencePositions.set(key, position + 1);
        return child;
    };

    function* walk(node)
    {
        const loops = PlaylistLoopCount(node.item, random);

        for (let i = 0; i < loops; i++)
        {
            if (!node.children.length)
            {
                if (node.item.segmentId) yield node.item.segmentId;
                continue;
            }
            const type = node.item.rsType;

            if (type === 1)
            {
                const child = selectSequenceStep(node);

                yield* walk(child);
            }
            else if (type === 2)
            {
                for (let index = 0; index < node.children.length; index++)
                {
                    const child = selectRandom(node);

                    if (child)
                    {
                        yield* walk(child);
                    }
                }
            }
            else if (type === 3)
            {
                const child = selectRandom(node);

                if (child)
                {
                    yield* walk(child);
                }
            }
            else
            {
                for (const child of node.children)
                {
                    yield* walk(child);
                }
            }
        }
    }

    const generator = walk(root);
    return () =>
    {
        const next = generator.next();
        return next.done ? null : next.value;
    };
}

/** Samples one playlist item's authored loop count; zero remains infinite. */
function PlaylistLoopCount(item, random)
{
    const base = Math.trunc(Number(item.loop) || 0);

    if (base === 0)
    {
        return Infinity;
    }

    const minimum = Math.trunc(Number(item.loopMin) || 0);
    const maximum = Math.trunc(Number(item.loopMax) || 0);

    if (minimum === 0 && maximum === 0)
    {
        return Math.max(1, base);
    }

    const low = Math.min(minimum, maximum);
    const high = Math.max(minimum, maximum);
    const sampled = Number(random());
    const ratio = Number.isFinite(sampled)
        ? Math.max(0, Math.min(0.9999999999999999, sampled))
        : 0;
    const offset = low + Math.floor(ratio * (high - low + 1));

    return Math.max(1, base + offset);
}

/**
 * Walks one switch container's decision tree with the current group values.
 * The terminal tree-node index is retained because two authored paths may
 * deliberately select the same audio object with different continuation
 * semantics.
 */
function resolveSwitchStep(node, getValue)
{
    const depth = node.argumentGroups.length;
    let currentIndex = 0;
    let current = node.treeNodes[currentIndex];

    for (let level = 0; level < depth; level++)
    {
        const value = getValue(node.argumentGroups[level].groupId);
        const start = current.childrenIdx;
        const children = node.treeNodes.slice(
            start,
            start + current.childrenCount,
        );

        if (!children.length)
        {
            return { targetId: null, treeNodeIndex: currentIndex };
        }

        let offset = children.findIndex(child => child.key === value);

        if (offset === -1)
        {
            offset = children.findIndex(child => child.key === 0);
        }
        if (offset === -1)
        {
            return { targetId: null, treeNodeIndex: -1 };
        }

        currentIndex = start + offset;
        current = node.treeNodes[currentIndex];
    }
    return {
        targetId: current.audioNodeId || null,
        treeNodeIndex: currentIndex,
    };
}

/** True when two selected switch-container paths are identical. */
function RoutesEqual(left, right)
{
    if (left === right)
    {
        return true;
    }
    if (!Array.isArray(left)
        || !Array.isArray(right)
        || left.length !== right.length)
    {
        return false;
    }

    return left.every((entry, index) =>
        entry.containerId === right[index].containerId
        && entry.treeNodeIndex === right[index].treeNodeIndex);
}

/** Returns changed association owners in outer-to-inner route order. */
function ChangedRouteOwners(previous, next)
{
    const before = new Map(
        (previous ?? []).map(entry => [ entry.containerId, entry ]),
    );
    const after = new Map(
        (next ?? []).map(entry => [ entry.containerId, entry ]),
    );
    const ordered = [
        ...(next ?? []),
        ...(previous ?? []).filter(entry =>
            !after.has(entry.containerId)),
    ];
    const changed = [];

    for (const entry of ordered)
    {
        const left = before.get(entry.containerId);
        const right = after.get(entry.containerId);

        // Entered/left nested containers changed because an ancestor chose a
        // different association. The common changed ancestor owns the rule.
        if (!left || !right
            || left.treeNodeIndex === right.treeNodeIndex)
        {
            continue;
        }
        changed.push(right);
    }
    return changed;
}

/** Finds the container whose transition matrix owns a route change. */
function RouteTransitionOwner(previous, next)
{
    return ChangedRouteOwners(previous, next)[0]?.containerId ?? null;
}

/** Finds the outermost changed owner that disables Continue Playback. */
function RouteRestartOwner(previous, next)
{
    return ChangedRouteOwners(previous, next)
        .find(entry => entry.continuePlayback === false)
        ?.containerId ?? null;
}

/** Returns one switch container's directly selected association target. */
function RouteSelection(route, containerId)
{
    return (route ?? [])
        .find(entry => entry.containerId === containerId)
        ?.selectedTargetId ?? null;
}

/** One retained music clip whose disposable Web Audio source may be resumed. */
class CjsMusicEngineScheduledClip
{
    #acquireBuffer;

    #buffer = null;

    #context;

    #destination;

    #isLive;

    #getStopAt;

    #offsetSeconds;

    #pausedAt = null;

    #pausedDelay = 0;

    #pausedDuration = 0;

    #scheduledPauseAt = null;

    #scheduleDuck;

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
        this.#context = context;
        this.#destination = destination;
        this.#acquireBuffer = acquireBuffer;
        this.#isLive = isLive;
        this.#getStopAt = getStopAt;
        this.#scheduleDuck = scheduleDuck;
        this.#offsetSeconds = offsetSeconds;
        this.sourceId = sourceId;
        this.source = null;
        this.startCtx = startCtx;
        this.endCtx = endCtx;
        this.cancelled = false;
        this.failed = false;
        this.missed = false;
        this.ended = false;
        this.duckActivity = null;
        this.#BeginLoad(isPrepared);
    }

    #BeginLoad(isPrepared)
    {
        let acquired;

        try
        {
            acquired = this.#acquireBuffer();
        }
        catch
        {
            this.cancelled = true;
            this.failed = true;
            return;
        }
        if (isPrepared)
        {
            this.#AcceptBuffer(acquired);
            return;
        }
        Promise.resolve(acquired).then(buffer =>
            this.#AcceptBuffer(buffer)).catch(() =>
        {
            this.cancelled = true;
            this.failed = true;
        });
    }

    #AcceptBuffer(buffer)
    {
        if (!buffer)
        {
            this.cancelled = true;
            this.failed = true;
            return;
        }
        this.#buffer = buffer;
        if (this.#pausedAt === null)
        {
            this.#Realize();
        }
    }

    #Realize()
    {
        if (!this.#buffer || this.cancelled || this.ended
            || this.#pausedAt !== null || !this.#isLive())
        {
            return;
        }
        let when = this.startCtx;
        let offset = this.#offsetSeconds;
        const now = Number(this.#context?.currentTime) || 0;
        const stopAt = this.#getStopAt();
        const carrierStopAt = [ stopAt, this.#scheduledPauseAt ]
            .filter(value => value !== null)
            .reduce((minimum, value) => Math.min(minimum, value), Infinity);

        if (this.#scheduledPauseAt !== null
            && this.#scheduledPauseAt <= now)
        {
            this.#RetainAt(this.#scheduledPauseAt);
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
        const source = this.#context.createBufferSource();

        source.buffer = this.#buffer;
        source.connect(this.#destination);
        source.onended = () =>
        {
            const endedAt = Number(this.#context?.currentTime)
                || this.endCtx;
            const authoredStopAt = this.#getStopAt();

            if (this.#scheduledPauseAt !== null
                && this.#scheduledPauseAt < this.endCtx
                && (authoredStopAt === null
                    || this.#scheduledPauseAt < authoredStopAt)
                && endedAt >= this.#scheduledPauseAt)
            {
                source.onended = null;
                this.#RetainAt(this.#scheduledPauseAt);
                return;
            }

            if (endedAt <= this.startCtx)
            {
                this.duckActivity?.Cancel?.(endedAt);
            }
            else
            {
                this.duckActivity?.End?.(endedAt);
            }
            this.duckActivity = null;
            this.ended = true;
            source.onended = null;
            source.disconnect?.();
        };
        try
        {
            source.start(when, Math.max(0, offset), duration);
        }
        catch
        {
            source.onended = null;
            source.disconnect?.();
            this.cancelled = true;
            this.failed = true;
            return;
        }
        this.source = source;
        this.startCtx = when;
        this.endCtx = when + duration;
        this.#offsetSeconds = offset;
        this.duckActivity = this.#scheduleDuck(
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
            || this.#pausedAt !== null || this.endCtx <= pauseAt)
        {
            return;
        }
        this.#scheduledPauseAt = pauseAt;
        if (this.source)
        {
            const stopAt = this.#getStopAt();

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
        if (this.#scheduledPauseAt === null || this.#pausedAt !== null)
        {
            return;
        }
        this.#scheduledPauseAt = null;
        if (this.source)
        {
            const stopAt = this.#getStopAt();

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
        const carrierStopAt = this.#scheduledPauseAt === null
            ? stopAt
            : Math.min(stopAt, this.#scheduledPauseAt);

        try
        {
            this.source.stop(carrierStopAt);
        }
        catch
        {
            // already stopped
        }
    }

    #RetainAt(pauseAt)
    {
        if (this.#pausedAt !== null || this.cancelled || this.ended)
        {
            return;
        }
        const stopAt = this.#getStopAt();
        const effectiveEnd = stopAt === null
            ? this.endCtx
            : Math.min(this.endCtx, stopAt);

        if (effectiveEnd <= pauseAt)
        {
            if (this.source)
            {
                this.source.onended = null;
                this.source.disconnect?.();
                this.source = null;
            }
            this.duckActivity?.End?.(effectiveEnd);
            this.duckActivity = null;
            this.ended = true;
            return;
        }
        this.#pausedAt = pauseAt;
        this.#pausedDelay = Math.max(0, this.startCtx - pauseAt);
        const elapsed = Math.max(0, pauseAt - this.startCtx);

        this.#offsetSeconds += elapsed;
        this.#pausedDuration = effectiveEnd
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
            source.disconnect?.();
            this.source = null;
        }
        if (pauseAt <= this.startCtx)
        {
            this.duckActivity?.Cancel?.(pauseAt);
        }
        else
        {
            this.duckActivity?.End?.(pauseAt);
        }
        this.duckActivity = null;
    }

    /** Stops the carrier at a musical boundary and retains its logical window. */
    PauseAt(pauseAt)
    {
        if (this.cancelled || this.failed || this.missed || this.ended
            || this.#pausedAt !== null)
        {
            return;
        }
        this.#RetainAt(pauseAt);
    }

    /** Recreates the carrier at its retained offset on a shifted timeline. */
    ResumeAt(resumeAt)
    {
        if (this.#pausedAt === null || this.cancelled || this.ended)
        {
            return;
        }
        this.startCtx = resumeAt + this.#pausedDelay;
        this.endCtx = this.startCtx + this.#pausedDuration;
        this.#pausedAt = null;
        this.#scheduledPauseAt = null;
        this.#Realize();
    }

    /** Stops and disconnects this clip permanently. */
    Dispose()
    {
        this.cancelled = true;
        const now = Number(this.#context?.currentTime) || 0;

        if (now <= this.startCtx)
        {
            this.duckActivity?.Cancel?.(now);
        }
        else
        {
            this.duckActivity?.End?.(now);
        }
        this.duckActivity = null;
        if (this.source)
        {
            this.source.onended = null;
            this.source.disconnect?.();
            this.source = null;
        }
    }
}

/**
 * Owns the Web Audio sources, fade state, and route nodes for one scheduled
 * music segment.
 */
class CjsMusicEngineScheduledSegment
{
    #context;

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
        this.#context = context;
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
            context: this.#context,
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
                * FadeCurveValue(envelope.curve, progress);

            HoldAudioParam(envelope.param, pauseAt, value);
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
            ScheduleFade(
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
            this.#ScheduleEnvelope({
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

    #ScheduleEnvelope({
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
        ScheduleFade(
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
                    param.cancelScheduledValues?.(0);
                    param.setValueAtTime?.(param.value ?? 1, when);
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

                this.#ScheduleEnvelope({
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
            else if (when + duration <= (this.#context?.currentTime ?? 0))
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
            route.lowPassFilter?.disconnect?.();
            route.highPassFilter?.disconnect?.();
            route.gain?.disconnect?.();
            route.transitionGain?.disconnect?.();
            for (const node of route.busEffectNodes ?? [])
            {
                node.disconnect?.();
            }
        }
        this.routeGains.clear();
        this.gain?.disconnect?.();
    }
}

/** One posted music event's selection, scheduling, and transport state. */
class MusicInstance
{
    /** Creates the scheduling state for one posted music event. */
    constructor({ playingID, gameObjID, rootId, group, busVolumeStates })
    {
        this.playingID = playingID;
        this.gameObjID = gameObjID;
        this.rootId = rootId;
        this.group = group;
        this.busVolumeStates = busVolumeStates ?? null;
        this.key = Symbol(`music:${playingID}:${rootId}`);
        this.gain = null;
        this.routeMixerGains = new Map();
        this.resolvedTargetId = null;
        this.resolvedRoute = null;
        this.pendingTargetId = null;
        this.pendingRoute = null;
        this.unavailableTargetId = null;
        this.pendingGeneration = 0;
        this.nextSegmentPlan = null;
        this.nextSegmentPlayPreEntry = null;
        this.iterator = null;
        this.boundary = 0;
        this.scheduledThrough = 0;
        this.active = [];
        this.stopped = false;
        this.stopAt = null;
        this.finished = false;
        this.exhausted = false;
        this.trackSequencePositions = new Map();
        // Latest scheduled segment's musical timeline (for sync quantization):
        // { startCtx (ctx time of segment position 0), meter }.
        this.timeline = null;
        this.targetMeter = null;
        this.playlistPreviousSegmentId = null;
        this.playlistPreviousScheduled = null;
        // Browser transport state is deliberately separate from authored
        // Wwise play/stop actions. Web Audio cannot resume a stopped buffer,
        // so transport resumes by replaying this authored item.
        this.transportPaused = false;
        this.transportChoice = null;
        this.transportPendingChoice = null;
        this.transportGeneration = 0;
        this.authoredPauseDepth = 0;
        this.authoredPause = null;
        this.authoredOutputEnvelope = null;
        this.authoredReevaluate = false;
        this.authoredPrepared = null;
    }
}

/** Interactive-music engine over the extracted Wwise music graph. */
export class CjsMusicEngine
{
    #graph = null;

    #context = null;

    #loadMedia = null;

    #destination = null;

    #musicGain = null;

    #random = Math.random;

    #switchValues = new Map();

    #instances = new Map();

    #groups = new Map();

    #scheduledSetters = [];

    #buffers = new Map();

    #transportChoices = new Map();

    #nextScheduleId = 1;

    #epoch = 0;

    #busRtpcCatalog = new Map();

    #readGlobalRtpc = null;

    #readGlobalRtpcTransitionBoundaries = null;

    #busStateCatalog = new Map();

    #readGlobalStateWeights = null;

    #readGlobalStateTransitionBoundaries = null;

    #busDuckingController = null;

    #busEffectCatalog = new Map();

    #busGraphRuntime = null;

    #busMixer = null;

    #unsubscribeBusDucking = null;

    /** Creates a scheduler over an optional authored graph and Web Audio context. */
    constructor({
        graph,
        context,
        loadMedia,
        destination,
        random,
        busRtpcs,
        getGlobalRTPC,
        getGlobalRTPCTransitionBoundaries,
        busStates,
        getGlobalStatePropertyWeights,
        getGlobalStateTransitionBoundaries,
        busDuckingController,
        busEffects,
        busGraphRuntime,
        busMixer,
    } = {})
    {
        this.#graph = graph ?? null;
        this.#context = context ?? null;
        this.#loadMedia = loadMedia ?? null;
        this.#destination = destination ?? context?.destination ?? null;
        this.#busRtpcCatalog = indexBusRtpcCatalog(busRtpcs);
        this.#readGlobalRtpc = typeof getGlobalRTPC === "function"
            ? getGlobalRTPC
            : null;
        this.#readGlobalRtpcTransitionBoundaries =
            typeof getGlobalRTPCTransitionBoundaries === "function"
                ? getGlobalRTPCTransitionBoundaries
                : null;
        this.#busStateCatalog = indexBusStateCatalog(busStates);
        this.#readGlobalStateWeights =
            typeof getGlobalStatePropertyWeights === "function"
                ? getGlobalStatePropertyWeights
                : null;
        this.#readGlobalStateTransitionBoundaries =
            typeof getGlobalStateTransitionBoundaries === "function"
                ? getGlobalStateTransitionBoundaries
                : null;
        this.#busDuckingController = busDuckingController ?? null;
        this.#busEffectCatalog = indexBusEffectCatalog(busEffects);
        this.#busGraphRuntime = busGraphRuntime ?? null;
        this.#busMixer = busMixer ?? null;
        this.#unsubscribeBusDucking = this.#busDuckingController?.Subscribe?.(
            () => this.RefreshBusDucking(),
        ) ?? null;
        if (random) this.#random = random;
        if (this.#context && this.#destination)
        {
            // Music output bus: every instance routes through it so music
            // volume is controllable independently of effects.
            this.#musicGain = this.#context.createGain();
            this.#musicGain.connect(this.#destination);
        }
    }

    /** Returns the Web Audio gain feeding the configured music destination. */
    get musicGain()
    {
        return this.#musicGain;
    }

    /** Music-bus volume (0..1); effects are unaffected. */
    SetMusicVolume(value)
    {
        const gain = this.#musicGain?.gain;
        const volume = Math.max(0, Math.min(1, Number(value) || 0));

        if (gain && typeof gain === "object" && "value" in gain)
        {
            gain.value = volume;
        }
        this.#busMixer?.SetCategoryVolume?.("music", volume);
    }

    /**
     * Replaces the authored graph and optional loader. Active playback is
     * cancelled before the new graph becomes visible; stale async loads are
     * rejected by the engine epoch.
     */
    SetGraph(graph, { loadMedia = this.#loadMedia } = {})
    {
        this.StopAll(0);
        this.#epoch++;
        this.#graph = graph ?? null;
        this.#loadMedia = loadMedia ?? null;
        this.#switchValues.clear();
        this.#transportChoices.clear();
        this.ClearMedia();
        return this;
    }

    /** Stops every active music instance. */
    StopAll(fadeOutDuration = 0)
    {
        const ms = Number(fadeOutDuration);
        const seconds = Number.isFinite(ms) ? Math.max(0, ms) / 1000 : 0;
        for (const instance of [ ...this.#instances.values() ])
        {
            this.#StopInstance(instance, seconds);
        }
        for (const group of [ ...this.#groups.values() ])
        {
            this.#CancelScheduledSetters(group);
            this.#MaybeFinishGroup(group);
        }
    }

    /** Releases one decoded-buffer promise from the source cache. */
    ReleaseMedia(sourceId)
    {
        return this.#buffers.delete(sourceId);
    }

    /** Releases every decoded-buffer promise and returns the removed count. */
    ClearMedia()
    {
        const count = this.#buffers.size;
        this.#buffers.clear();
        return count;
    }

    /** Active decoded-media cache size. */
    GetCachedMediaCount()
    {
        return this.#buffers.size;
    }

    /** Cancels playback and releases graph-owned WebAudio/cache state. */
    Dispose()
    {
        this.StopAll(0);
        this.#epoch++;
        this.ClearMedia();
        this.#switchValues.clear();
        this.#transportChoices.clear();
        this.#unsubscribeBusDucking?.();
        this.#unsubscribeBusDucking = null;
        this.#busDuckingController = null;
        this.#busGraphRuntime = null;
        this.#busMixer = null;
        this.#musicGain?.disconnect?.();
        this.#musicGain = null;
        this.#graph = null;
        this.#loadMedia = null;
        this.#destination = null;
        this.#context = null;
    }

    /** True when this engine owns the event or one retained music program. */
    HandlesEvent(eventName)
    {
        if (!this.#graph) return false;
        return !!(this.#graph.eventTargets?.[eventName]
            || this.#graph.eventStops?.[eventName]
            || this.#graph.switchSetters?.[eventName]
            || this.#graph.programs?.[eventName]);
    }

    /**
     * Posts a music event under an externally allocated playing id.
     * Immediate setter events apply their values during the post. Fixed-delay
     * setters stay live on the AudioContext clock; play events start graph
     * playback. Returns true when the id stays live.
     */
    PostEvent(
        eventName,
        playingID,
        onFinished,
        { busVolumeStates = null, gameObjID = 3 } = {},
    )
    {
        this.#FinalizeDueAuthoredPauses(
            Number(this.#context?.currentTime) || 0,
        );
        this.#ApplyMusicProgram(
            this.#graph.programs?.[eventName],
            gameObjID,
        );
        const setters = this.#graph.switchSetters?.[eventName];
        const delayedSetters = [];
        if (setters)
        {
            const immediate = setters.filter((setter, actionIndex) =>
            {
                if (Number(setter.delayMs) > 0)
                {
                    delayedSetters.push({ setter, actionIndex });
                    return false;
                }
                return true;
            });

            if (immediate.length)
            {
                this.#ApplySetterBatch(immediate);
            }
        }
        const stops = this.#graph.eventStops?.[eventName];
        if (stops)
        {
            // Authored stop actions target the same root nodes play started.
            for (const instance of [ ...this.#instances.values() ])
            {
                if (stops.includes(instance.rootId))
                {
                    this.#StopInstance(instance, DEFAULT_FADE_SECONDS);
                }
            }
        }
        const targets = this.#graph.eventTargets?.[eventName];
        if (((!targets || !targets.length) && !delayedSetters.length)
            || !this.#context)
        {
            // Deferred so the caller can record the playing id before the
            // finished callback clears an immediate setter-only event.
            queueMicrotask(() => onFinished?.());
            return false;
        }
        const group = {
            playingID,
            onFinished,
            instances: new Set(),
            pendingSetters: delayedSetters.length,
            finished: false,
        };

        this.#groups.set(playingID, group);
        const postTime = Number(this.#context.currentTime) || 0;
        for (const { setter, actionIndex } of delayedSetters)
        {
            this.#scheduledSetters.push({
                playingID,
                actionIndex,
                actionTime: postTime + Number(setter.delayMs) / 1000,
                setter,
            });
        }
        this.#scheduledSetters.sort((left, right) =>
            left.actionTime - right.actionTime
            || left.playingID - right.playingID
            || left.actionIndex - right.actionIndex);
        for (const rootId of targets ?? [])
        {
            const instance = new MusicInstance({
                playingID,
                gameObjID,
                rootId,
                group,
                busVolumeStates,
            });

            instance.gain = this.#context.createGain();
            instance.gain.connect(this.#musicGain ?? this.#destination);
            group.instances.add(instance);
            this.#instances.set(instance.key, instance);
            this.#BeginInitialTarget(instance);
        }
        this.Process();
        return true;
    }

    /** Applies one ordered bank-authored Pause/Resume program. */
    #ApplyMusicProgram(program, gameObjID)
    {
        for (const action of program ?? [])
        {
            for (const instance of [ ...this.#instances.values() ])
            {
                if (instance.stopped
                    || Number(instance.gameObjID) !== Number(gameObjID)
                    || (action.mode === "element"
                        && String(instance.rootId) !== String(action.targetId)))
                {
                    continue;
                }
                if (action.kind === "pause")
                {
                    const wasPaused = instance.authoredPauseDepth > 0;

                    instance.authoredPauseDepth++;
                    if (!wasPaused)
                    {
                        this.#BeginAuthoredPause(instance, action);
                    }
                }
                else if (instance.authoredPauseDepth > 0)
                {
                    instance.authoredPauseDepth--;
                    if (instance.authoredPauseDepth === 0)
                    {
                        this.#ResumeAuthoredPause(instance, action);
                    }
                }
            }
        }
    }

    /** Starts an authored fade whose completion freezes the musical clock. */
    #BeginAuthoredPause(instance, action)
    {
        const now = Number(this.#context?.currentTime) || 0;
        const duration = Math.max(0, Number(action.transitionMs) || 0) / 1000;

        instance.authoredPause = {
            phase: duration > 0 ? "pausing" : "paused",
            pauseAt: now + duration,
        };
        this.#SetAuthoredOutputEnvelope(
            instance,
            0,
            duration,
            action.curve,
            now,
        );
        for (const scheduled of instance.active)
        {
            scheduled.SchedulePauseAt(instance.authoredPause.pauseAt);
        }
        // Pause fades run on the audio clock, so queue the musical timeline
        // through every source/fade that can become audible at the fade edge,
        // even if the browser's frame loop is throttled.
        this.#QueueThroughAuthoredPause(instance);
        if (duration <= 0)
        {
            this.#FreezeAuthoredPause(instance, now);
        }
    }

    /** Extends one pausing playlist through its exact audible lookahead. */
    #QueueThroughAuthoredPause(instance)
    {
        const pause = instance.authoredPause;

        if (pause?.phase !== "pausing") return;
        const targetNode = this.#graph.nodes[instance.resolvedTargetId];
        const scheduleHorizon = targetNode?.type === "music-playlist-container"
            ? PlaylistScheduleHorizon(targetNode)
            : SCHEDULE_HORIZON_SECONDS;
        const audibleHorizon = pause.pauseAt + scheduleHorizon;
        let remaining = 10000;
        while (instance.iterator !== null
            && !instance.exhausted
            && instance.boundary <= audibleHorizon
            && remaining-- > 0)
        {
            if (!this.#ScheduleNextSegment(instance)) break;
        }
    }

    /** Freezes source offsets and invalidates preparations at the fade edge. */
    #FreezeAuthoredPause(instance, pauseAt)
    {
        if (instance.authoredPause?.phase === "paused")
        {
            instance.authoredPause.pauseAt = pauseAt;
        }
        else if (instance.authoredPause?.phase === "pausing")
        {
            instance.authoredPause.phase = "paused";
            instance.authoredPause.pauseAt = pauseAt;
        }
        else
        {
            return;
        }
        for (const scheduled of instance.active)
        {
            scheduled.PauseAt(pauseAt);
        }
    }

    /** Cancels a pending freeze or resumes the retained timeline in place. */
    #ResumeAuthoredPause(instance, action)
    {
        const state = instance.authoredPause;

        if (!state) return;
        const now = Number(this.#context?.currentTime) || 0;
        const duration = Math.max(0, Number(action.transitionMs) || 0) / 1000;
        const frozen = state.phase === "paused";

        instance.authoredPause = null;
        if (frozen)
        {
            const delta = Math.max(0, now - state.pauseAt);

            instance.boundary += delta;
            if (instance.timeline)
            {
                instance.timeline.startCtx += delta;
            }
            if (Number.isFinite(instance.nextSegmentPlan?.scheduleFloor))
            {
                instance.nextSegmentPlan.scheduleFloor += delta;
            }
            for (const scheduled of instance.active)
            {
                scheduled.ResumeAt(now, state.pauseAt);
            }
        }
        else
        {
            for (const scheduled of instance.active)
            {
                scheduled.CancelScheduledPause();
            }
        }
        this.#SetAuthoredOutputEnvelope(
            instance,
            1,
            duration,
            action.curve,
            now,
        );
        const prepared = instance.authoredPrepared;

        instance.authoredPrepared = null;
        if (prepared)
        {
            prepared();
        }
        else if (frozen || instance.authoredReevaluate)
        {
            instance.authoredReevaluate = false;
            this.#ReevaluateInstance(instance);
        }
        this.Process();
    }

    /** Schedules the instance-level Wwise curve on every output topology. */
    #SetAuthoredOutputEnvelope(instance, to, duration, curve, now)
    {
        const from = EvaluateFadeEnvelope(instance.authoredOutputEnvelope, now);
        const envelope = {
            from,
            to,
            start: now,
            duration,
            curve: Number(curve),
        };

        instance.authoredOutputEnvelope = envelope;
        for (const param of this.#AuthoredOutputParams(instance))
        {
            HoldAudioParam(param, now, from);
            ScheduleFade(param, from, to, now, duration, curve);
        }
    }

    #AuthoredOutputParams(instance)
    {
        return [
            instance.gain?.gain,
            ...[ ...instance.routeMixerGains.values() ]
                .map(gain => gain.gain),
        ].filter(Boolean);
    }

    /** Applies the current authored output envelope to a lazily created route. */
    #ApplyAuthoredOutputEnvelope(instance, param)
    {
        const envelope = instance.authoredOutputEnvelope;

        if (!envelope) return;
        const now = Number(this.#context?.currentTime) || 0;
        const value = EvaluateFadeEnvelope(envelope, now);
        const end = envelope.start + envelope.duration;

        HoldAudioParam(param, now, value);
        if (end > now)
        {
            const progress = envelope.duration <= 0
                ? 1
                : (now - envelope.start) / envelope.duration;

            ScheduleFade(
                param,
                envelope.from,
                envelope.to,
                now,
                end - now,
                envelope.curve,
                progress,
            );
        }
    }

    /** Stops authored music; Wwise Break does not affect music objects. */
    ExecuteAction(action, playingID, fadeOutDuration = 1000)
    {
        if (action !== "stop")
        {
            return;
        }
        const group = this.#groups.get(playingID);
        if (!group)
        {
            return;
        }
        const ms = Number(fadeOutDuration);
        const seconds = Number.isFinite(ms) ? Math.max(0, ms) / 1000 : DEFAULT_FADE_SECONDS;
        this.#CancelScheduledSetters(group);
        for (const instance of [ ...group.instances ])
        {
            this.#StopInstance(instance, seconds);
        }
        this.#MaybeFinishGroup(group);
    }

    /** Capabilities for the browser transport over one live playing id. */
    GetTransportCapabilities(playingID)
    {
        const group = this.#groups.get(playingID);
        const states = [ ...(group?.instances ?? []) ]
            .filter(instance => !instance.stopped)
            .map(instance => this.#GetTransportState(instance));
        const active = states.length > 0;
        const choiceCount = states.reduce(
            (count, state) => Math.max(count, state.choices.length),
            0,
        );
        const preparing = active && states.some(state =>
            state.instance.transportPendingChoice !== null);
        const canSelect = active && states.every(state =>
            state.instance.pendingTargetId === null
            && state.instance.authoredPause === null
            && !(state.instance.transportPaused
                && state.instance.transportPendingChoice !== null));

        return {
            active,
            preparing,
            paused: active && states.every(state => state.instance.transportPaused),
            canPause: active && states.some(state =>
                state.instance.authoredPause === null
                && !state.instance.transportPaused && state.choice),
            canResume: active && states.some(state =>
                state.instance.authoredPause === null
                && state.instance.transportPaused && state.choice)
                && !preparing,
            canPrevious: canSelect
                && states.some(state => state.choices.length > 1),
            canNext: canSelect
                && states.some(state => state.choices.length > 1),
            canRandom: canSelect
                && states.some(state => state.choices.length > 1),
            choiceCount,
        };
    }

    /** Soft-pauses one playing id while retaining its authored item. */
    PauseTransport(playingID, fadeOutDuration = 30)
    {
        const group = this.#groups.get(playingID);
        const ms = Number(fadeOutDuration);
        const seconds = Number.isFinite(ms) ? Math.max(0, ms) / 1000 : 0.03;
        let changed = false;

        for (const instance of group?.instances ?? [])
        {
            if (instance.stopped || instance.transportPaused
                || instance.authoredPause !== null) continue;
            instance.transportGeneration++;
            instance.transportPendingChoice = null;
            instance.pendingGeneration++;
            instance.pendingTargetId = null;
            instance.pendingRoute = null;
            const state = this.#GetTransportState(instance);

            if (!state.choice) continue;
            instance.transportChoice = state.choice;
            instance.transportPaused = true;
            for (const scheduled of instance.active)
            {
                scheduled.FadeOut({
                    when: this.#context.currentTime,
                    duration: seconds,
                    override: true,
                });
            }
            changed = true;
        }
        return changed;
    }

    /** Resumes a soft-paused playing id at its retained authored item. */
    ResumeTransport(playingID)
    {
        const group = this.#groups.get(playingID);
        const queued = [];

        for (const instance of group?.instances ?? [])
        {
            if (instance.stopped || !instance.transportPaused
                || instance.authoredPause !== null) continue;
            const state = this.#GetTransportState(instance);
            const choice = instance.transportChoice ?? state.choice;

            if (!choice) continue;
            instance.transportPendingChoice = choice;
            queued.push({ instance, choice });
        }
        this.#QueueTransportGroup(queued, { resume: true });
        return queued.length > 0;
    }

    /** Moves within the current authored playlist/track selection. */
    StepTransport(playingID, direction)
    {
        const group = this.#groups.get(playingID);
        if ([ ...(group?.instances ?? []) ].some(instance =>
            !instance.stopped
            && (instance.authoredPause !== null
                || instance.pendingTargetId !== null
                || (instance.transportPaused
                    && instance.transportPendingChoice !== null))))
        {
            return false;
        }
        const delta = Number(direction) < 0 ? -1 : 1;
        const queued = [];
        let changed = false;

        for (const instance of group?.instances ?? [])
        {
            if (instance.stopped || instance.pendingTargetId !== null) continue;
            const state = this.#GetTransportState(instance);

            if (state.choices.length < 2) continue;
            const index = (state.index + delta + state.choices.length)
                % state.choices.length;
            const choice = state.choices[index];

            instance.transportChoice = choice;
            if (!instance.transportPaused)
            {
                instance.transportPendingChoice = choice;
                queued.push({ instance, choice });
            }
            changed = true;
        }
        this.#QueueTransportGroup(queued);
        return changed;
    }

    /** Chooses another item inside the current authored playlist/track. */
    RandomTransport(playingID)
    {
        const group = this.#groups.get(playingID);
        if ([ ...(group?.instances ?? []) ].some(instance =>
            !instance.stopped
            && (instance.authoredPause !== null
                || instance.pendingTargetId !== null
                || (instance.transportPaused
                    && instance.transportPendingChoice !== null))))
        {
            return false;
        }
        const queued = [];
        let changed = false;

        for (const instance of group?.instances ?? [])
        {
            if (instance.stopped || instance.pendingTargetId !== null) continue;
            const state = this.#GetTransportState(instance);

            if (state.choices.length < 2) continue;
            const offset = 1 + Math.floor(
                this.#random() * (state.choices.length - 1),
            );
            const choice = state.choices[
                (state.index + offset) % state.choices.length
            ];

            instance.transportChoice = choice;
            if (!instance.transportPaused)
            {
                instance.transportPendingChoice = choice;
                queued.push({ instance, choice });
            }
            changed = true;
        }
        this.#QueueTransportGroup(queued);
        return changed;
    }

    /** Switch/state input by name or id; music treats both as tree arguments. */
    SetSwitch(group, value)
    {
        this.#SetValue(wwiseIdFromName(group), wwiseIdFromName(value));
    }

    /** State input by name or id; states and switches share graph arguments. */
    SetState(group, value)
    {
        this.#SetValue(wwiseIdFromName(group), wwiseIdFromName(value));
    }

    /** Active instance count (introspection/tests). */
    GetPlayingCount()
    {
        return this.#groups.size;
    }

    /** Currently resolved target node id of an instance (introspection/tests). */
    GetResolvedTarget(playingID)
    {
        const group = this.#groups.get(playingID);

        return group
            ? [ ...group.instances ][0]?.resolvedTargetId ?? null
            : null;
    }

    /**
     * Scheduling tick: keeps every instance scheduled through the lookahead
     * horizon. Driven by the backend's RenderAudio (per-frame Process).
     */
    Process()
    {
        if (!this.#context) return;
        const now = this.#context.currentTime;
        this.#FinalizeDueAuthoredPauses(now);
        this.#ProcessScheduledSetters(now);
        for (const instance of [ ...this.#instances.values() ])
        {
            if (instance.stopped)
            {
                if (instance.stopAt === null || now >= instance.stopAt)
                {
                    this.#FinalizeInstance(instance);
                }
                continue;
            }
            if (instance.authoredPause?.phase === "paused")
            {
                continue;
            }
            this.#PruneScheduledSegments(instance, now);
            if (instance.transportPaused)
            {
                continue;
            }
            if (instance.iterator === null)
            {
                // Silent state (target resolves to nothing): stay alive and
                // idle until a switch/state change resumes the music.
                continue;
            }
            if (instance.exhausted)
            {
                this.#FinishExhaustedInstance(instance, now);
                continue;
            }
            const targetNode = this.#graph.nodes[instance.resolvedTargetId];
            const scheduleHorizon = targetNode?.type
                === "music-playlist-container"
                ? PlaylistScheduleHorizon(targetNode)
                : SCHEDULE_HORIZON_SECONDS;

            while (instance.boundary - now <= scheduleHorizon)
            {
                if (!this.#ScheduleNextSegment(instance)) break;
            }
            if (instance.exhausted
                && this.#FinishExhaustedInstance(instance, now))
            {
                continue;
            }
        }
    }

    /** Freezes music instances whose authored Pause fade has completed. */
    #FinalizeDueAuthoredPauses(now)
    {
        for (const instance of this.#instances.values())
        {
            const pause = instance.authoredPause;

            if (!instance.stopped && pause?.phase === "pausing"
                && pause.pauseAt <= now)
            {
                this.#FreezeAuthoredPause(instance, pause.pauseAt);
            }
        }
    }

    /** Applies all due fixed-delay music setters in stable authored order. */
    #ProcessScheduledSetters(now)
    {
        while (this.#scheduledSetters.length
            && this.#scheduledSetters[0].actionTime <= now)
        {
            const actionTime = this.#scheduledSetters[0].actionTime;
            const due = [];
            const touched = new Set();

            while (this.#scheduledSetters.length
                && this.#scheduledSetters[0].actionTime === actionTime)
            {
                const action = this.#scheduledSetters.shift();
                const group = this.#groups.get(action.playingID);

                if (!group || group.finished) continue;
                group.pendingSetters = Math.max(
                    0,
                    group.pendingSetters - 1,
                );
                due.push(action.setter);
                touched.add(group);
            }
            if (due.length)
            {
                this.#ApplySetterBatch(due);
            }
            for (const group of touched)
            {
                this.#MaybeFinishGroup(group);
            }
        }
    }

    /** Applies one setter batch and reevaluates each live instance once. */
    #ApplySetterBatch(setters)
    {
        for (const setter of setters)
        {
            this.#switchValues.set(
                setter.groupId >>> 0,
                setter.targetId >>> 0,
            );
        }
        for (const instance of this.#instances.values())
        {
            if (!instance.stopped && !instance.transportPaused
                && instance.authoredPause?.phase !== "paused")
            {
                this.#ReevaluateInstance(instance);
            }
            else if (!instance.stopped
                && instance.authoredPause?.phase === "paused")
            {
                instance.authoredReevaluate = true;
                instance.authoredPrepared = null;
                instance.pendingGeneration++;
                instance.pendingTargetId = null;
                instance.pendingRoute = null;
            }
        }
    }

    /** Cancels every pending setter owned by one playing id. */
    #CancelScheduledSetters(group)
    {
        if (!group || group.pendingSetters <= 0) return;
        this.#scheduledSetters = this.#scheduledSetters.filter(action =>
            action.playingID !== group.playingID);
        group.pendingSetters = 0;
    }

    /** Completes a music post after both instances and setters settle. */
    #MaybeFinishGroup(group)
    {
        if (!group || group.finished || group.instances.size
            || group.pendingSetters > 0)
        {
            return;
        }
        group.finished = true;
        this.#groups.delete(group.playingID);
        group.onFinished?.();
    }

    /**
     * Drops segment graphs whose audible window and callback grace period
     * passed, including outgoing audio retained by an authored-silence state.
     */
    #PruneScheduledSegments(instance, now)
    {
        instance.active = instance.active.filter(scheduled =>
        {
            const naturalEnd = scheduled.audibleEndCtx
                ?? scheduled.endCtx;
            const effectiveEnd = scheduled.fading
                ? Math.min(
                    scheduled.fadeEndCtx ?? naturalEnd,
                    naturalEnd,
                )
                : naturalEnd;
            const live = effectiveEnd === undefined
                || effectiveEnd + 2 > now;

            if (!live)
            {
                scheduled.Dispose();
            }
            return live;
        });
    }

    /**
     * Introspection for UIs: one entry per playing instance with the playing
     * branch, any switch target still preparing (media loading - the fade
     * deliberately waits for it), the last target rejected because none of
     * its prepared media loaded, a truthful lifecycle state, and realized,
     * audible, pending, failed, missed, and ended source counts for each
     * segment.
     */
    GetStatus()
    {
        const now = this.#context?.currentTime ?? 0;
        return [ ...this.#instances.values() ].map(instance =>
        {
            const segments = instance.active.map(scheduled =>
            {
                const pendingSources = scheduled.sources.filter(entry =>
                    !entry.source && !entry.cancelled).length;
                const realizedSources = scheduled.sources.filter(entry =>
                    entry.source).length;
                const failedSources = scheduled.sources.filter(entry =>
                    entry.failed).length;
                const missedSources = scheduled.sources.filter(entry =>
                    entry.missed).length;
                const endedSources = scheduled.sources.filter(entry =>
                    entry.ended).length;
                const audibleSources = scheduled.sources.filter(entry =>
                {
                    const end = scheduled.fading
                        ? Math.min(
                            entry.endCtx ?? Infinity,
                            scheduled.fadeEndCtx ?? Infinity,
                        )
                        : entry.endCtx ?? Infinity;

                    return Boolean(
                        entry.source
                        && !entry.ended
                        && (entry.startCtx ?? Infinity) <= now
                        && now < end,
                    );
                }).length;

                return {
                    segmentId: scheduled.segmentId,
                    // Stable identity for this scheduling (segment ids repeat
                    // in loops) and the resolved target it was scheduled
                    // under - UIs map targets back to the state/mood that
                    // selected them.
                    scheduleId: scheduled.scheduleId,
                    targetId: scheduled.targetId,
                    startCtx: scheduled.startCtx,
                    endCtx: scheduled.endCtx,
                    // Mix volume: the segment gain's instantaneous value
                    // (real AudioParams report mid-ramp values during
                    // crossfades).
                    volume: scheduled.gain?.gain?.value ?? 1,
                    fading: scheduled.fading,
                    fadeEndCtx: scheduled.fadeEndCtx,
                    scheduledSources: scheduled.sources.length,
                    realizedSources,
                    audibleSources,
                    pendingSources,
                    failedSources,
                    missedSources,
                    endedSources,
                    // Kept as a compact alias for existing status consumers.
                    pending: pendingSources,
                };
            });
            const totals = segments.reduce(
                (result, segment) =>
                {
                    result.scheduled += segment.scheduledSources;
                    result.realized += segment.realizedSources;
                    result.audible += segment.audibleSources;
                    result.pending += segment.pendingSources;
                    result.failed += segment.failedSources;
                    result.missed += segment.missedSources;
                    result.ended += segment.endedSources;
                    return result;
                },
                {
                    scheduled: 0,
                    realized: 0,
                    audible: 0,
                    pending: 0,
                    failed: 0,
                    missed: 0,
                    ended: 0,
                },
            );
            let state = "scheduled";

            if (instance.stopped)
            {
                state = "stopping";
            }
            else if (instance.transportPaused)
            {
                state = "paused";
            }
            else if (instance.authoredPause?.phase === "pausing")
            {
                state = "pausing";
            }
            else if (instance.authoredPause?.phase === "paused")
            {
                state = "paused";
            }
            else if (totals.audible)
            {
                state = totals.failed || totals.missed
                    ? "degraded"
                    : "playing";
            }
            else if (instance.pendingTargetId !== null || totals.pending)
            {
                state = "preparing";
            }
            else if (instance.unavailableTargetId !== null)
            {
                state = "unavailable";
            }
            else if (instance.iterator === null)
            {
                state = "silent";
            }
            else if (totals.failed || totals.missed)
            {
                state = "degraded";
            }

            return {
                playingID: instance.playingID,
                gameObjID: instance.gameObjID,
                rootId: instance.rootId,
                now,
                state,
                paused: instance.transportPaused
                    || instance.authoredPause?.phase === "paused",
                authoredPauseDepth: instance.authoredPauseDepth,
                stopped: instance.stopped,
                stopAt: instance.stopAt,
                resolvedTargetId: instance.resolvedTargetId,
                preparingTargetId: instance.pendingTargetId,
                unavailableTargetId: instance.unavailableTargetId,
                silent: state === "silent",
                boundary: instance.boundary,
                scheduledSources: totals.scheduled,
                realizedSources: totals.realized,
                audibleSources: totals.audible,
                pendingSources: totals.pending,
                failedSources: totals.failed,
                missedSources: totals.missed,
                endedSources: totals.ended,
                segments,
            };
        });
    }

    /** Stores one switch/state argument and reevaluates every live instance. */
    #SetValue(groupId, valueId)
    {
        this.#FinalizeDueAuthoredPauses(
            Number(this.#context?.currentTime) || 0,
        );
        this.#switchValues.set(groupId >>> 0, valueId >>> 0);
        for (const instance of this.#instances.values())
        {
            if (instance.stopped) continue;
            if (instance.authoredPause?.phase === "paused")
            {
                instance.authoredReevaluate = true;
                instance.authoredPrepared = null;
                instance.pendingGeneration++;
                instance.pendingTargetId = null;
                instance.pendingRoute = null;
                continue;
            }
            if (instance.transportPaused)
            {
                instance.transportGeneration++;
                instance.transportPendingChoice = null;
                instance.pendingGeneration++;
                instance.pendingTargetId = null;
                instance.pendingRoute = null;
                continue;
            }
            this.#ReevaluateInstance(instance);
        }
    }

    /** Returns one stored switch/state argument, defaulting to authored key zero. */
    #GetValue(groupId)
    {
        return this.#switchValues.get(groupId >>> 0) ?? 0;
    }

    /**
     * Prepares an initial target before starting its musical timeline.
     *
     * Switch roots remain alive when their initial branch is silent or
     * unavailable because a later setter can recover them. Direct targets
     * have no alternate branch and finish when their media cannot sound.
     */
    #BeginInitialTarget(instance)
    {
        const resolution = this.#ResolveTarget(instance.rootId);
        const target = resolution.targetId;
        const route = resolution.route;
        const targetMeter = resolution.meter;
        const root = this.#graph.nodes[instance.rootId];
        const ruleTarget = root?.type === "music-switch-container"
            ? RouteSelection(route, instance.rootId)
            : target;
        const rule = this.#FindRule(root, null, ruleTarget);
        const recoverable = root?.type === "music-switch-container";

        instance.boundary = this.#context.currentTime;
        instance.resolvedTargetId = null;
        instance.resolvedRoute = null;
        instance.iterator = null;
        instance.unavailableTargetId = null;

        if (!this.#graph.nodes[target])
        {
            instance.resolvedRoute = route;
            if (!recoverable)
            {
                queueMicrotask(() =>
                {
                    if (!instance.stopped)
                    {
                        this.#FinishInstance(instance);
                    }
                });
            }
            return;
        }

        const generation = ++instance.pendingGeneration;

        instance.pendingTargetId = target;
        instance.pendingRoute = route;
        this.#PrepareTransition(
            instance,
            target,
            rule,
            generation,
            targetMeter,
            EffectiveMeter(null, root),
        ).then(preparation =>
        {
            this.#FinalizeDueAuthoredPauses(
                Number(this.#context?.currentTime) || 0,
            );
            if (instance.stopped
                || instance.pendingGeneration !== generation)
            {
                return;
            }
            if (!preparation)
            {
                return;
            }
            const commit = () =>
            {
                if (instance.stopped
                    || instance.pendingGeneration !== generation)
                {
                    return;
                }
                instance.pendingTargetId = null;
                instance.pendingRoute = null;
                if (!preparation.available)
                {
                    instance.unavailableTargetId = target;
                    if (!recoverable)
                    {
                        this.#FinishInstance(instance);
                    }
                    return;
                }

                const when = this.#TransitionTime(instance, rule)
                    ?? instance.boundary;
                this.#TransitionInstance(
                    instance,
                    rule,
                    target,
                    route,
                    Math.max(when, this.#context.currentTime),
                    preparation,
                );
                this.#QueueThroughAuthoredPause(instance);
            };

            if (instance.authoredPause?.phase === "paused")
            {
                instance.authoredPrepared = commit;
            }
            else
            {
                commit();
            }
        }).catch(() =>
        {
            if (instance.stopped
                || instance.pendingGeneration !== generation)
            {
                return;
            }

            instance.pendingTargetId = null;
            instance.pendingRoute = null;
            instance.unavailableTargetId = target;
            if (!recoverable)
            {
                this.#FinishInstance(instance);
            }
        });
    }

    /**
     * Resolves through nested switch containers and retains the exact path.
     * A null target means authored silence, an unmatched path, or content
     * absent from the installed graph.
     */
    #ResolveTarget(rootId, getValue = groupId => this.#GetValue(groupId))
    {
        let currentId = rootId;
        const route = [];
        let meter = null;

        for (let hops = 0; hops < 8; hops++)
        {
            if (currentId === null)
            {
                return { targetId: null, route, meter };
            }
            const node = this.#graph.nodes[currentId];
            if (!node)
            {
                return { targetId: null, route, meter };
            }
            meter = EffectiveMeter(meter, node);
            if (node.type !== "music-switch-container")
            {
                return { targetId: currentId, route, meter };
            }

            const selected = resolveSwitchStep(node, getValue);

            route.push({
                containerId: currentId,
                treeNodeIndex: selected.treeNodeIndex,
                selectedTargetId: selected.targetId,
                continuePlayback: node.continuePlayback !== false,
                meter,
            });
            currentId = selected.targetId;
        }
        return { targetId: currentId, route, meter };
    }

    /**
     * Preview (no side effects): the playable target the given root would
     * resolve to if this setter event were posted on top of the CURRENT
     * switch/state values. Null = that state has nothing to play - UIs use
     * this to hide unavailable music options, which shift with state.
     */
    PreviewSwitchEvent(eventName, rootId)
    {
        if (!this.#graph) return null;
        const overlay = new Map(this.#switchValues);
        for (const setter of this.#graph.switchSetters?.[eventName] ?? [])
        {
            overlay.set(setter.groupId >>> 0, setter.targetId >>> 0);
        }
        return this.#ResolveTarget(
            rootId,
            groupId => overlay.get(groupId >>> 0) ?? 0,
        ).targetId;
    }

    /**
     * Switch/state change: if the tree now lands elsewhere, PREPARE the
     * destination's media first, then transition at the rule's sync point.
     * Fading the outgoing music before the incoming buffers exist would leave
     * a silence gap exactly as long as the fetch/decode - so the musical
     * transition is computed only once the destination can actually sound.
     */
    #ReevaluateInstance(instance)
    {
        // A newly authored switch/state decision supersedes any browser
        // transport choice that is still waiting on media.
        instance.transportGeneration++;
        instance.transportPendingChoice = null;
        const resolution = this.#ResolveTarget(instance.rootId);
        const target = resolution.targetId;
        const route = resolution.route;
        const targetMeter = resolution.meter;
        const sameTarget = target === instance.resolvedTargetId;
        const transitionOwnerId = RouteTransitionOwner(
            instance.resolvedRoute,
            route,
        );
        const restartOwnerId = RouteRestartOwner(
            instance.resolvedRoute,
            route,
        );

        if (sameTarget && RoutesEqual(route, instance.resolvedRoute))
        {
            // Switched back before a pending prepare landed - cancel it.
            instance.pendingTargetId = null;
            instance.pendingRoute = null;
            instance.unavailableTargetId = null;
            instance.pendingGeneration++;
            return;
        }
        if (sameTarget && restartOwnerId === null)
        {
            // The selected association changed, but every changed switch
            // container allows the shared object to continue its timeline.
            instance.resolvedRoute = route;
            instance.pendingTargetId = null;
            instance.pendingRoute = null;
            instance.unavailableTargetId = null;
            instance.pendingGeneration++;
            return;
        }
        if (instance.pendingTargetId !== null
            && target === instance.pendingTargetId
            && RoutesEqual(route, instance.pendingRoute))
        {
            return;
        }
        const rootNode = this.#graph.nodes[instance.rootId];
        const ruleOwnerId = sameTarget
            ? restartOwnerId
            : transitionOwnerId;
        const ruleNode = this.#graph.nodes[ruleOwnerId] ?? rootNode;
        const ruleFromId = ruleNode?.type === "music-switch-container"
            ? RouteSelection(instance.resolvedRoute, ruleOwnerId ?? instance.rootId)
            : instance.resolvedTargetId;
        const ruleToId = ruleNode?.type === "music-switch-container"
            ? RouteSelection(route, ruleOwnerId ?? instance.rootId)
            : target;
        const rule = this.#FindRule(
            ruleNode,
            ruleFromId,
            ruleToId,
        );
        const ruleMeter = (route ?? [])
            .find(entry => entry.containerId === ruleOwnerId)
            ?.meter
            ?? (instance.resolvedRoute ?? [])
                .find(entry => entry.containerId === ruleOwnerId)
                ?.meter
            ?? EffectiveMeter(null, ruleNode);
        if (target === null)
        {
            // The state resolves to nothing (authored silence, or content
            // absent from every shipped bank): fade out at the sync point
            // and stay alive - the next state change resumes the music.
            instance.pendingTargetId = null;
            instance.pendingRoute = null;
            instance.unavailableTargetId = null;
            instance.pendingGeneration++;
            const when = Math.max(
                this.#TransitionTime(instance, rule)
                    ?? this.#CurrentSegmentBoundary(instance),
                this.#context.currentTime,
            );
            const fadeSeconds = Math.max(0, (rule?.src.transitionTime ?? 0)) / 1000;
            for (const active of instance.active)
            {
                active.FadeOut({ when, duration: fadeSeconds });
            }
            instance.resolvedTargetId = null;
            instance.resolvedRoute = route;
            instance.iterator = null;
            return;
        }
        const generation = ++instance.pendingGeneration;
        instance.pendingTargetId = target;
        instance.pendingRoute = route;
        instance.unavailableTargetId = null;
        this.#PrepareTransition(
            instance,
            target,
            rule,
            generation,
            targetMeter,
            ruleMeter,
        ).then(preparation =>
        {
            this.#FinalizeDueAuthoredPauses(
                Number(this.#context?.currentTime) || 0,
            );
            if (instance.stopped || instance.pendingGeneration !== generation)
            {
                return;
            }
            if (!preparation)
            {
                return;
            }
            const commit = () =>
            {
                if (instance.stopped
                    || instance.pendingGeneration !== generation)
                {
                    return;
                }
                instance.pendingTargetId = null;
                instance.pendingRoute = null;
                if (!preparation.available)
                {
                    instance.unavailableTargetId = target;
                    return;
                }
                const when = this.#TransitionTime(instance, rule)
                    ?? this.#CurrentSegmentBoundary(instance);

                this.#TransitionInstance(
                    instance,
                    rule,
                    target,
                    route,
                    Math.max(when, this.#context.currentTime),
                    preparation,
                );
                this.#QueueThroughAuthoredPause(instance);
            };

            if (instance.authoredPause?.phase === "paused")
            {
                instance.authoredPrepared = commit;
            }
            else
            {
                commit();
            }
        });
    }

    /**
     * Creates and preloads the exact bridge and destination plans that will
     * later be scheduled. Sequence-track positions are projected on a clone
     * and are committed only if the transition itself commits.
     */
    #PrepareTransition(
        instance,
        targetId,
        rule,
        generation,
        targetMeter,
        ruleMeter,
    )
    {
        return this.#PrepareSelection(
            instance,
            targetId,
            rule?.transitionSegment?.segmentId ?? null,
            generation,
            targetMeter,
            ruleMeter,
        );
    }

    /**
     * Builds, preloads, and validates one exact selection transaction.
     * Cursor or switch-track drift during loading causes a fresh plan under
     * the same event generation; stale target/graph work returns null.
     */
    #PrepareSelection(
        instance,
        targetId,
        transitionSegmentId,
        generation,
        targetMeter,
        ruleMeter,
    )
    {
        const epoch = this.#epoch;
        const attempt = () =>
        {
            if (instance.stopped
                || instance.pendingGeneration !== generation
                || this.#epoch !== epoch)
            {
                return Promise.resolve(null);
            }

            const transaction = this.#CreateSelectionTransaction(
                instance,
            );
            // Bridge selections precede destination selections in the same
            // draft cursor transaction, matching their audible order.
            const transitionPlan = transitionSegmentId
                ? this.#CreatePlaybackPlan(
                    transitionSegmentId,
                    transaction,
                    EffectiveMeter(
                        ruleMeter,
                        this.#graph.nodes[transitionSegmentId],
                    ),
                )
                : null;
            const destinationPlan = this.#CreatePlaybackPlan(
                targetId,
                transaction,
                targetMeter,
            );
            const plans = [
                destinationPlan,
                ...(transitionSegmentId ? [ transitionPlan ] : []),
            ];

            return Promise.all(
                plans.map(plan => this.#PreparePlaybackPlan(plan)),
            ).then(results =>
            {
                if (instance.stopped
                    || instance.pendingGeneration !== generation
                    || this.#epoch !== epoch)
                {
                    return null;
                }
                if (!this.#ValidateSelectionTransaction(
                    instance,
                    transaction,
                ))
                {
                    return attempt();
                }

                return {
                    available: results.every(Boolean),
                    destinationPlan,
                    transitionPlan,
                    transaction,
                };
            });
        };

        return attempt();
    }

    /** Creates a draft over live sequence cursors and switch-track values. */
    #CreateSelectionTransaction(instance)
    {
        return {
            sequencePositions: new Map(
                instance.trackSequencePositions,
            ),
            sequenceBases: new Map(),
            sequenceAdvances: new Map(),
            switchValues: new Map(),
        };
    }

    /** True when no live cursor or switch dependency changed during loading. */
    #ValidateSelectionTransaction(instance, transaction)
    {
        for (const [ trackId, base ] of transaction.sequenceBases)
        {
            if ((instance.trackSequencePositions.get(trackId) ?? 0)
                !== base)
            {
                return false;
            }
        }
        for (const [ groupId, value ] of transaction.switchValues)
        {
            if (this.#GetValue(groupId) !== value)
            {
                return false;
            }
        }
        return true;
    }

    /** Reapplies live Bus Volume and filter state to scheduled routes. */
    RefreshBusVolumeGains()
    {
        for (const instance of this.#instances.values())
        {
            for (const scheduled of instance.active)
            {
                for (const route of scheduled.routeGains?.values?.() ?? [])
                {
                    ScheduleMusicBusGain(
                        route.gain.gain,
                        instance.busVolumeStates,
                        route.busPathIds,
                        route.trackRtpcCurves,
                        route.authoredBusVolumeDb,
                        route.authoredBusMakeUpGainDb,
                        route.authoredOutputBusVolumeDb,
                        this.#context,
                        this.#busRtpcCatalog,
                        this.#readGlobalRtpc,
                        this.#readGlobalRtpcTransitionBoundaries,
                        this.#busStateCatalog,
                        this.#readGlobalStateWeights,
                        this.#readGlobalStateTransitionBoundaries,
                        this.#busDuckingController,
                        route.sharedBusFaders,
                    );
                    ScheduleMusicBusFilter(
                        route.lowPassFilter,
                        route.busPathIds,
                        "lowPass",
                        false,
                        this.#context,
                        this.#busStateCatalog,
                        this.#readGlobalStateWeights,
                        this.#readGlobalStateTransitionBoundaries,
                    );
                    ScheduleMusicBusFilter(
                        route.highPassFilter,
                        route.busPathIds,
                        "highPass",
                        true,
                        this.#context,
                        this.#busStateCatalog,
                        this.#readGlobalStateWeights,
                        this.#readGlobalStateTransitionBoundaries,
                    );
                }
            }
        }
    }

    /** Reapplies dynamic Bus Volume RTPCs to every scheduled route. */
    RefreshBusRtpcs()
    {
        this.RefreshBusVolumeGains();
    }

    /** Reapplies dynamic Immediate Audio Bus States to scheduled routes. */
    RefreshBusStates()
    {
        this.RefreshBusVolumeGains();
    }

    /** Reapplies the shared SFX/music Audio Bus ducking envelopes. */
    RefreshBusDucking()
    {
        this.RefreshBusVolumeGains();
    }

    /** Atomically applies draft sequence advances after successful prepare. */
    #CommitSelectionTransaction(instance, transaction)
    {
        for (const [ trackId, advances ] of (
            transaction?.sequenceAdvances ?? []
        ))
        {
            const position = instance.trackSequencePositions.get(trackId)
                ?? 0;

            instance.trackSequencePositions.set(
                trackId,
                position + advances,
            );
        }
    }

    /**
     * Finishes an exhausted iterator after its authored exit boundary and
     * every still-live clip tail. Ended sources cannot extend the instance.
     */
    #FinishExhaustedInstance(instance, now)
    {
        const pending = instance.active.some(scheduled =>
            scheduled.sources.some(entry =>
                !entry.source && !entry.cancelled));
        const audibleEnd = instance.active.reduce(
            (end, scheduled) =>
            {
                for (const entry of scheduled.sources)
                {
                    if (!entry.source
                        || entry.cancelled
                        || entry.ended)
                    {
                        continue;
                    }
                    const naturalEnd = entry.endCtx
                        ?? scheduled.audibleEndCtx
                        ?? scheduled.endCtx;
                    const effectiveEnd = scheduled.fading
                        ? Math.min(
                            scheduled.fadeEndCtx ?? naturalEnd,
                            naturalEnd,
                        )
                        : naturalEnd;

                    end = Math.max(end, effectiveEnd ?? end);
                }
                return end;
            },
            instance.boundary,
        );

        if (pending || now < audibleEnd)
        {
            return false;
        }
        this.#FinishInstance(instance);
        return true;
    }

    /**
     * Creates one target iterator and consumes its first exact segment,
     * pinning every selected random/sequence/switch subtrack for scheduling.
     */
    #CreatePlaybackPlan(targetId, transaction, effectiveMeter = null)
    {
        const node = this.#graph.nodes[targetId];
        if (!node)
        {
            return null;
        }

        let iterator;

        if (node.type === "music-playlist-container")
        {
            iterator = createPlaylistIterator(node, this.#random);
        }
        else
        {
            let played = false;
            iterator = () => (played
                ? null
                : (played = true, targetId));
        }

        const segmentId = iterator();
        const segment = this.#graph.nodes[segmentId];
        const targetMeter = effectiveMeter
            ?? EffectiveMeter(null, node);
        const segmentMeter = node.type === "music-playlist-container"
            ? EffectiveMeter(targetMeter, segment)
            : targetMeter;
        const subTracks = new Map();

        if (segment?.type === "music-segment")
        {
            for (const trackId of segment.children)
            {
                const track = this.#graph.nodes[trackId];

                if (!track
                    || track.type !== "music-track"
                    || !track.clips.length)
                {
                    continue;
                }

                subTracks.set(
                    trackId,
                    this.#SelectSubTrack(
                        trackId,
                        track,
                        transaction.sequencePositions,
                        transaction,
                    ),
                );
            }
        }

        return {
            targetId,
            iterator,
            segmentId,
            targetMeter,
            segmentMeter,
            subTracks,
            preparedBuffers: new Map(),
        };
    }

    /** Preloads only the media selected by one pinned first-segment plan. */
    #PreparePlaybackPlan(plan)
    {
        if (!plan)
        {
            return Promise.resolve(false);
        }

        const segment = this.#graph.nodes[plan.segmentId];
        if (plan.segmentId === null || plan.segmentId === undefined)
        {
            return Promise.resolve(true);
        }
        if (!segment || segment.type !== "music-segment")
        {
            return Promise.resolve(false);
        }

        const sourceIds = new Set();

        for (const trackId of segment.children)
        {
            const track = this.#graph.nodes[trackId];
            const subTrack = plan.subTracks.get(trackId);

            if (!track || track.type !== "music-track")
            {
                continue;
            }
            for (const clip of track.clips ?? [])
            {
                if ((clip.trackId ?? 0) === subTrack)
                {
                    sourceIds.add(clip.sourceId);
                }
            }
        }

        if (!sourceIds.size)
        {
            // Authored empty timing segments are valid and may lead into
            // audible content later in the iterator.
            return Promise.resolve(true);
        }

        const ids = [ ...sourceIds ];

        return Promise.all(
            ids.map(sourceId =>
                this.#LoadBuffer(sourceId, null)),
        ).then(buffers =>
        {
            plan.preparedBuffers = new Map(
                ids.map((sourceId, index) => [
                    sourceId,
                    buffers[index],
                ]),
            );
            return buffers.some(Boolean);
        });
    }

    /** Enumerates authored segment and random/sequence subtrack choices. */
    #GetTransportChoices(instance)
    {
        const cached = this.#transportChoices.get(instance.resolvedTargetId);

        if (cached) return cached;
        const target = this.#graph?.nodes?.[instance.resolvedTargetId];
        const segmentIds = target?.type === "music-segment"
            ? [ instance.resolvedTargetId ]
            : target?.type === "music-playlist-container"
                ? (target.playlist ?? []).map(item => item.segmentId)
                : [];
        const choices = [];
        const seen = new Set();

        for (const segmentId of segmentIds)
        {
            const segment = this.#graph.nodes[segmentId];

            if (segment?.type !== "music-segment") continue;
            const selectableTracks = [];

            for (const trackId of segment.children ?? [])
            {
                const track = this.#graph.nodes[trackId];
                const count = Math.max(1, track?.subTrackCount || 1);

                if (track?.type !== "music-track"
                    || ![ 1, 2 ].includes(track.trackType)
                    || count < 2)
                {
                    continue;
                }
                selectableTracks.push({ trackId, count });
            }
            // Do not construct the Cartesian product. Real segments may layer
            // thousands of valid random-track combinations; the transport
            // only needs a bounded path that visits every individual track's
            // authored subtracks. Automatic playback keeps full Wwise choice.
            const variantCount = selectableTracks.reduce(
                (count, track) => Math.max(count, track.count),
                1,
            );
            const variants = Array.from(
                { length: variantCount },
                (_, variant) => new Map(selectableTracks.map(track => [
                    track.trackId,
                    variant % track.count,
                ])),
            );
            for (const subTracks of variants)
            {
                const choice = { segmentId, subTracks };
                const key = this.#TransportChoiceKey(choice);

                if (seen.has(key)) continue;
                seen.add(key);
                choices.push(choice);
            }
        }
        this.#transportChoices.set(instance.resolvedTargetId, choices);
        return choices;
    }

    /** Stable comparison key for one internal authored transport choice. */
    #TransportChoiceKey(choice)
    {
        return [
            choice?.segmentId,
            ...[ ...(choice?.subTracks ?? []) ]
                .map(([ trackId, subTrack ]) => `${trackId}=${subTrack}`),
        ].join("|");
    }

    /** Locates the audible/current scheduled item in the enumerated choices. */
    #GetTransportState(instance)
    {
        const choices = this.#GetTransportChoices(instance);
        let choice = instance.transportPendingChoice
            ?? (instance.transportPaused ? instance.transportChoice : null);

        if (!choice)
        {
            const now = this.#context?.currentTime ?? 0;
            const candidates = instance.active
                .filter(value => !value.disposed)
                .sort((left, right) => left.startCtx - right.startCtx)
                .filter(value => now < (
                    value.fading
                        ? Math.min(
                            value.fadeEndCtx
                                ?? value.audibleEndCtx
                                ?? value.endCtx,
                            value.audibleEndCtx ?? value.endCtx,
                        )
                        : value.audibleEndCtx ?? value.endCtx
                ));
            const scheduled = candidates
                .filter(value => value.startCtx <= now)
                .at(-1)
                ?? candidates.find(value => value.startCtx > now)
                ?? null;

            if (scheduled)
            {
                const subTracks = new Map(
                    [ ...scheduled.subTracks ].filter(([ trackId ]) =>
                    {
                        const track = this.#graph.nodes[trackId];

                        return track?.type === "music-track"
                            && [ 1, 2 ].includes(track.trackType)
                            && Math.max(1, track.subTrackCount || 1) > 1;
                    }),
                );
                choice = {
                    segmentId: scheduled.segmentId,
                    subTracks,
                };
            }
        }
        let index = choices.findIndex(value =>
            this.#TransportChoiceKey(value)
                === this.#TransportChoiceKey(choice));

        if (index < 0) index = 0;
        return {
            instance,
            choices,
            // Pause/resume retains the exact independently authored selection
            // even when it is outside the bounded UI traversal path.
            choice: choice ?? choices[index] ?? null,
            index,
        };
    }

    /** Preloads every changed layer, then commits them at one context time. */
    #QueueTransportGroup(selections, { resume = false } = {})
    {
        if (!selections.length) return;
        const entries = selections.map(({ instance, choice }) => ({
            instance,
            choice,
            generation: ++instance.transportGeneration,
            pendingGeneration: instance.pendingGeneration,
            targetId: instance.resolvedTargetId,
            plan: this.#CreateTransportPlan(instance, choice),
        }));

        if (entries.some(entry => !entry.plan))
        {
            for (const entry of entries)
            {
                entry.instance.transportPendingChoice = null;
            }
            return;
        }
        const current = entry => !entry.instance.stopped
            && entry.instance.transportPaused === resume
            && entry.instance.transportGeneration === entry.generation
            && entry.instance.pendingGeneration === entry.pendingGeneration
            && entry.instance.resolvedTargetId === entry.targetId;
        const clearPending = () =>
        {
            for (const entry of entries)
            {
                if (current(entry))
                {
                    entry.instance.transportPendingChoice = null;
                }
            }
        };
        Promise.all(entries.map(entry =>
            this.#PreparePlaybackPlan(entry.plan))).then(results =>
        {
            const valid = entries.every((entry, index) =>
                results[index] && current(entry));

            if (!valid)
            {
                clearPending();
                return;
            }
            const now = (this.#context?.currentTime ?? 0)
                + RenderQuantumSeconds(this.#context);
            for (const entry of entries)
            {
                if (resume) entry.instance.transportPaused = false;
                entry.instance.transportPendingChoice = null;
                entry.plan.scheduleFloor = now;
                this.#RestartTransportChoice(
                    entry.instance,
                    entry.choice,
                    entry.plan,
                    now,
                    false,
                );
            }
            this.Process();
            if (resume)
            {
                for (const entry of entries)
                {
                    this.#ReevaluateInstance(entry.instance);
                }
            }
        }).catch(clearPending);
    }

    /** Creates the pinned segment/subtrack plan for a transport selection. */
    #CreateTransportPlan(instance, choice)
    {
        const targetId = instance.resolvedTargetId;
        const target = this.#graph?.nodes?.[targetId];
        const segment = this.#graph?.nodes?.[choice.segmentId];

        if (!target || segment?.type !== "music-segment") return null;
        const targetMeter = EffectiveMeter(null, target);
        const subTracks = new Map(choice.subTracks);

        for (const trackId of segment.children ?? [])
        {
            const track = this.#graph.nodes[trackId];

            if (track?.type !== "music-track" || subTracks.has(trackId))
            {
                continue;
            }
            subTracks.set(
                trackId,
                track.trackType === 3
                    ? this.#SelectSubTrack(
                        trackId,
                        track,
                        new Map(instance.trackSequencePositions),
                    )
                    : 0,
            );
        }

        return {
            targetId,
            segmentId: choice.segmentId,
            targetMeter,
            segmentMeter: EffectiveMeter(targetMeter, segment),
            subTracks,
            preparedBuffers: new Map(),
        };
    }

    /** Restarts one live instance at an explicitly selected authored item. */
    #RestartTransportChoice(
        instance,
        choice,
        plan = this.#CreateTransportPlan(instance, choice),
        now = this.#context?.currentTime ?? 0,
        runProcess = true,
    )
    {
        const targetId = instance.resolvedTargetId;
        const target = this.#graph?.nodes?.[targetId];

        if (!target || !plan) return false;
        instance.pendingGeneration++;
        instance.pendingTargetId = null;
        instance.pendingRoute = null;
        instance.unavailableTargetId = null;
        for (const scheduled of instance.active)
        {
            scheduled.FadeOut({
                when: now,
                duration: 0.03,
                override: true,
            });
        }
        this.#ResolveInstanceTo(instance, targetId, now);
        if (target.type === "music-segment")
        {
            instance.iterator = () => null;
        }
        for (const [ trackId, subTrack ] of choice.subTracks)
        {
            const track = this.#graph.nodes[trackId];

            if (track?.type === "music-track" && track.trackType === 2)
            {
                instance.trackSequencePositions.set(trackId, subTrack + 1);
            }
        }
        instance.nextSegmentPlan = plan;
        instance.transportChoice = choice;
        instance.transportPendingChoice = null;
        this.#ScheduleNextSegment(instance);
        if (runProcess) this.Process();
        return true;
    }

    /**
     * Context time for a rule's transition sync point, quantized on the
     * current segment's musical timeline. AkSyncType: 0 Immediate,
     * 1 NextGrid, 2 NextBar, 3 NextBeat; cue-synced types return null and
     * transition at the segment boundary instead.
     */
    #TransitionTime(instance, rule)
    {
        const now = this.#context.currentTime;
        const syncType = rule?.src.syncType ?? 7;
        if (syncType === 0) return now;
        const timeline = this.#CurrentScheduledSegment(instance)?.timeline
            ?? instance.timeline;
        const meter = timeline?.meter;
        if (!meter || syncType > 3) return null;
        let periodMs;
        let offsetMs = 0;
        if (syncType === 1)
        {
            periodMs = meter.gridPeriod;
            offsetMs = meter.gridOffset;
        }
        else
        {
            const beatMs = meter.tempo > 0 ? 60000 / meter.tempo : 0;
            periodMs = syncType === 2 ? beatMs * Math.max(1, meter.beatsPerBar) : beatMs;
        }
        if (!(periodMs > 0)) return null;
        const positionMs = (now - timeline.startCtx) * 1000;
        const steps = Math.max(0, Math.ceil((positionMs - offsetMs) / periodMs));
        let when = timeline.startCtx + (offsetMs + steps * periodMs) / 1000;
        if (when <= now) when += periodMs / 1000;
        return when;
    }

    /**
     * Returns the segment whose authored entry/exit window contains now.
     *
     * Lookahead may already have queued later segments, so the last scheduled
     * segment is not necessarily the segment that owns the current sync point.
     */
    #CurrentScheduledSegment(instance)
    {
        const now = this.#context?.currentTime ?? 0;
        let current = null;

        for (const scheduled of instance.active)
        {
            if (scheduled.startCtx <= now
                && scheduled.endCtx > now
                && (!current || scheduled.startCtx >= current.startCtx))
            {
                current = scheduled;
            }
        }
        return current;
    }

    /** Returns the current segment exit without using the lookahead frontier. */
    #CurrentSegmentBoundary(instance)
    {
        return this.#CurrentScheduledSegment(instance)?.endCtx
            ?? instance.boundary;
    }

    /** Selects the bottom-most matching Wwise transition rule. */
    #FindRule(node, fromId, toId)
    {
        if (!node?.rules) return null;
        const match = (ids, id) =>
        {
            // Wwise's Nothing association is explicit ID zero. Any (-1)
            // matches concrete music objects, but never Nothing.
            if (id === null || id === undefined)
            {
                return ids.includes(0);
            }
            return ids.includes(-1) || ids.includes(Number(id) | 0);
        };
        // Wwise evaluates the transition matrix from bottom to top so that a
        // later, more-specific rule wins over an earlier Any-to-Any fallback.
        for (let index = node.rules.length - 1; index >= 0; index--)
        {
            const rule = node.rules[index];

            if (match(rule.srcIds, fromId) && match(rule.dstIds, toId))
            {
                return rule;
            }
        }
        return null;
    }

    /** Applies one authored rule and schedules its bridge and destination. */
    #TransitionInstance(
        instance,
        rule,
        target,
        route,
        when,
        preparation = null,
    )
    {
        this.#CommitSelectionTransaction(
            instance,
            preparation?.transaction,
        );
        // Faded segments STAY in `active` until their fade completes (the
        // prune in Process removes them) - they are still audible, and
        // status consumers must see both sides of a crossfade.
        for (const active of instance.active)
        {
            const atExitCue = Math.abs(active.endCtx - when) < 1e-6;
            const carriesPostExit = rule?.src?.playPostExit === true
                && atExitCue;

            this.#ApplySourceFade(
                active,
                when,
                rule?.src,
                carriesPostExit,
                atExitCue,
            );
        }
        instance.resolvedTargetId = target;
        instance.resolvedRoute = route;
        instance.unavailableTargetId = null;
        let destinationTime = when;
        const transition = rule?.transitionSegment;
        const transitionSegment = transition
            ? this.#graph.nodes[transition.segmentId]
            : null;

        if (transitionSegment?.type === "music-segment")
        {
            const { entry, exit } = segmentCues(transitionSegment);
            const transitionPlan = preparation?.transitionPlan;

            const scheduledTransition = this.#ScheduleSegmentClips(
                instance,
                transitionSegment,
                transition.segmentId,
                when,
                entry,
                exit,
                {
                    targetId: transition.segmentId,
                    playPreEntry: transition.playPreEntry,
                    playPostExit: transition.playPostExit,
                    meter: transitionPlan?.segmentMeter,
                    subTracks: transitionPlan?.subTracks,
                    preparedBuffers: transitionPlan?.preparedBuffers,
                },
            );
            destinationTime += Math.max(0.001, (exit - entry) / 1000);
            this.#ApplyFadeIn(
                scheduledTransition,
                when,
                transition.fadeIn,
            );
            if (FadeDuration(transition.fadeOut) > 0)
            {
                this.#ApplySourceFade(
                    scheduledTransition,
                    destinationTime,
                    transition.fadeOut,
                );
            }
        }

        this.#ResolveInstanceTo(
            instance,
            target,
            destinationTime,
            preparation?.destinationPlan,
        );
        instance.nextSegmentFadeIn = rule?.dst ?? null;
        instance.nextSegmentPlayPreEntry = rule?.dst?.playPreEntry ?? true;
        // The prepared first destination is always scheduled immediately,
        // even when its authored sync point is in the future. This makes the
        // transaction commit coincide with an actual pinned WebAudio source.
        this.#ScheduleNextSegment(instance);
        this.Process();
    }

    /** Re-primes an instance iterator at a resolved graph target and time. */
    #ResolveInstanceTo(instance, targetId, startTime, plan = null)
    {
        const node = this.#graph.nodes[targetId];
        if (!node)
        {
            // Nothing to play for this target: go silent, stay alive.
            instance.resolvedTargetId = null;
            instance.iterator = null;
            return;
        }
        if (plan?.targetId === targetId)
        {
            instance.iterator = plan.iterator;
            instance.nextSegmentPlan = plan;
            instance.targetMeter = plan.targetMeter;
        }
        else if (node.type === "music-playlist-container")
        {
            instance.iterator = createPlaylistIterator(node, this.#random);
            instance.nextSegmentPlan = null;
            instance.targetMeter = EffectiveMeter(null, node);
        }
        else
        {
            let played = false;
            instance.iterator = () => (played ? null : (played = true, targetId));
            instance.nextSegmentPlan = null;
            instance.targetMeter = EffectiveMeter(null, node);
        }
        instance.boundary = startTime;
        instance.exhausted = false;
        instance.playlistPreviousSegmentId = null;
        instance.playlistPreviousScheduled = null;
    }

    /** Schedules one more segment at the instance boundary. False = done/starved. */
    #ScheduleNextSegment(instance)
    {
        let segmentId;
        let subTracks = null;
        let preparedBuffers = null;
        let scheduleFloor = null;
        let meter = null;
        let playPreEntry = instance.nextSegmentPlayPreEntry ?? true;

        if (instance.nextSegmentPlan)
        {
            segmentId = instance.nextSegmentPlan.segmentId;
            subTracks = instance.nextSegmentPlan.subTracks;
            preparedBuffers = instance.nextSegmentPlan.preparedBuffers;
            scheduleFloor = instance.nextSegmentPlan.scheduleFloor ?? null;
            meter = instance.nextSegmentPlan.segmentMeter;
            instance.nextSegmentPlan = null;
        }
        else
        {
            segmentId = instance.iterator?.();
        }
        if (segmentId === null || segmentId === undefined)
        {
            // Playlist exhausted: finish once scheduled audio reaches the
            // final boundary (Process polls for it).
            instance.exhausted = true;
            return false;
        }
        const segment = this.#graph.nodes[segmentId];
        if (!segment || segment.type !== "music-segment")
        {
            return false;
        }
        const playlist = this.#graph.nodes[instance.resolvedTargetId];
        const playlistRule = playlist?.type === "music-playlist-container"
            && instance.playlistPreviousSegmentId !== null
            ? this.#FindRule(
                playlist,
                instance.playlistPreviousSegmentId,
                segmentId,
            )
            : null;

        if (playlistRule)
        {
            playPreEntry = playlistRule.dst?.playPreEntry ?? true;
        }
        meter ??= EffectiveMeter(instance.targetMeter, segment);
        const { entry, exit } = segmentCues(segment);
        const boundary = instance.boundary;
        instance.timeline = { startCtx: boundary - entry / 1000, meter };
        const scheduled = this.#ScheduleSegmentClips(
            instance,
            segment,
            segmentId,
            boundary,
            entry,
            exit,
            {
                meter,
                playPreEntry,
                subTracks,
                preparedBuffers,
                scheduleFloor,
            },
        );
        if (instance.nextSegmentFadeIn)
        {
            this.#ApplyFadeIn(
                scheduled,
                boundary,
                instance.nextSegmentFadeIn,
            );
            instance.nextSegmentFadeIn = null;
        }
        if (playlistRule)
        {
            this.#ApplySourceFade(
                instance.playlistPreviousScheduled,
                boundary,
                playlistRule.src,
                playlistRule.src?.playPostExit === true,
                true,
            );
            this.#ApplyFadeIn(
                scheduled,
                boundary,
                playlistRule.dst,
            );
        }
        instance.nextSegmentPlayPreEntry = null;
        instance.playlistPreviousSegmentId = segmentId;
        instance.playlistPreviousScheduled = scheduled;
        instance.boundary = boundary + Math.max(0.001, (exit - entry) / 1000);
        return true;
    }

    /** Creates one scheduled segment gain and queues all selected track clips. */
    #ScheduleSegmentClips(
        instance,
        segment,
        segmentId,
        boundary,
        entryCueMs,
        exitCueMs,
        {
            targetId = instance.resolvedTargetId,
            playPreEntry = true,
            playPostExit = true,
            meter = segment.meter,
            subTracks = null,
            preparedBuffers = null,
            scheduleFloor = null,
        } = {},
    )
    {
        // Each scheduled segment owns a gain so transitions can crossfade it
        // out without touching the incoming segment on the same instance.
        const gain = this.#context.createGain();

        gain.connect(instance.gain);
        const endCtx = boundary
            + Math.max(0.001, (exitCueMs - entryCueMs) / 1000);
        const scheduled = new CjsMusicEngineScheduledSegment({
            context: this.#context,
            gain,
            segmentId,
            scheduleId: this.#nextScheduleId++,
            targetId,
            startCtx: boundary,
            endCtx,
            timeline: {
                startCtx: boundary - entryCueMs / 1000,
                meter,
            },
        });
        instance.active.push(scheduled);
        for (const trackId of segment.children)
        {
            const track = this.#graph.nodes[trackId];
            if (!track || track.type !== "music-track" || !track.clips.length) continue;
            const subTrack = subTracks?.get(trackId)
                ?? this.#SelectSubTrack(
                    trackId,
                    track,
                    instance.trackSequencePositions,
                );
            scheduled.subTracks.set(trackId, subTrack);
            for (const clip of track.clips)
            {
                if ((clip.trackId ?? 0) !== subTrack) continue;
                this.#ScheduleClip(
                    instance,
                    scheduled,
                    trackId,
                    track,
                    clip,
                    boundary,
                    entryCueMs,
                    exitCueMs,
                    playPreEntry,
                    playPostExit,
                    preparedBuffers,
                    scheduleFloor,
                );
            }
        }
        if (instance.authoredPause?.phase === "pausing")
        {
            scheduled.SchedulePauseAt(instance.authoredPause.pauseAt);
        }
        return scheduled;
    }

    /** Selects the active subtrack for normal, random, or switch track modes. */
    #SelectSubTrack(
        trackId,
        track,
        sequencePositions,
        transaction = null,
    )
    {
        const count = Math.max(1, track.subTrackCount || 1);
        if (track.trackType === 1)
        {
            return Math.floor(this.#random() * count);
        }
        if (track.trackType === 2)
        {
            const position = sequencePositions.get(trackId) ?? 0;

            if (transaction)
            {
                if (!transaction.sequenceBases.has(trackId))
                {
                    transaction.sequenceBases.set(trackId, position);
                }
                transaction.sequenceAdvances.set(
                    trackId,
                    (transaction.sequenceAdvances.get(trackId) ?? 0) + 1,
                );
            }
            sequencePositions.set(trackId, position + 1);
            return position % count;
        }
        if (track.trackType === 3 && track.switchParams)
        {
            const value = this.#GetValue(track.switchParams.groupId);

            transaction?.switchValues.set(
                track.switchParams.groupId,
                value,
            );
            const index = track.switchParams.assoc.indexOf(value);
            if (index >= 0) return index;
            const fallback = track.switchParams.assoc.indexOf(track.switchParams.defaultSwitch);
            return fallback >= 0 ? fallback : 0;
        }
        return 0;
    }

    /** Loads and schedules one clip within its allowed pre/post-entry window. */
    #ScheduleClip(
        instance,
        scheduled,
        trackId,
        track,
        clip,
        boundary,
        entryCueMs,
        exitCueMs,
        playPreEntry,
        playPostExit,
        preparedBuffers,
        scheduleFloor,
    )
    {
        const context = this.#context;
        const clipStartMs = clip.playAt + clip.beginTrimOffset;
        const clipEndMs = clip.playAt + clip.srcDuration + clip.endTrimOffset;
        const audibleStartMs = playPreEntry
            ? clipStartMs
            : Math.max(clipStartMs, entryCueMs);
        const audibleEndMs = playPostExit
            ? clipEndMs
            : Math.min(clipEndMs, exitCueMs);
        if (audibleEndMs <= audibleStartMs) return;
        let when = boundary + (audibleStartMs - entryCueMs) / 1000;
        const initialOffsetMs = clip.beginTrimOffset
            + audibleStartMs
            - clipStartMs;
        let offsetMs = initialOffsetMs;
        const isPrepared = preparedBuffers?.has(clip.sourceId) === true;
        const now = scheduleFloor ?? context.currentTime;
        if (when < now)
        {
            offsetMs += (now - when) * 1000;
            when = now;
        }
        const durationMs = audibleEndMs
            - audibleStartMs
            - (offsetMs - initialOffsetMs);
        if (durationMs <= 0) return;
        scheduled.ScheduleClip({
            sourceId: clip.sourceId,
            startCtx: when,
            offsetMs,
            initialOffsetMs,
            audibleStartMs,
            audibleEndMs,
            isPrepared,
            // Qualified routes own segment-local fade lanes, which must exist
            // before loading starts and before a transition can target them.
            resolveDestination: () => this.#GetRouteGain(
                instance,
                scheduled,
                trackId,
                track,
            ),
            acquireBuffer: () =>
            {
                const epoch = this.#epoch;
                const prepared = isPrepared
                    ? preparedBuffers.get(clip.sourceId)
                    : this.#LoadBuffer(clip.sourceId, track);

                return {
                    prepared,
                    isLive: () => !instance.stopped && epoch === this.#epoch,
                };
            },
            scheduleDuck: (startCtx, endCtx) =>
                this.#busDuckingController?.ScheduleActivity?.(
                    track.busPathIds,
                    startCtx,
                    endCtx,
                ) ?? null,
        });
    }

    /** Gets or creates one scheduled track's pre-bus gain route. */
    #GetRouteGain(instance, scheduled, trackId, track)
    {
        const trackRtpcCurves = Array.isArray(track.rtpcCurves)
            ? track.rtpcCurves
            : [];
        const hasBusPath = Array.isArray(track.busPathIds)
            && track.busPathIds.length;

        if (!hasBusPath && !trackRtpcCurves.length)
        {
            return null;
        }
        const routeInput = hasBusPath
            ? this.#GetBusRouteGain(instance, scheduled, trackId, track)
            : scheduled.gain;

        if (!trackRtpcCurves.length)
        {
            return routeInput;
        }

        const key = `track:${trackId}`;

        if (scheduled.routeGains.has(key))
        {
            return scheduled.routeGains.get(key).input;
        }
        const gain = this.#context.createGain();
        const route = {
            input: gain,
            gain,
            busGraphRoute: null,
            busPathIds: [],
            trackRtpcCurves,
            authoredBusVolumeDb: 0,
            authoredBusMakeUpGainDb: 0,
            authoredOutputBusVolumeDb: 0,
            busEffectNodes: [],
            lowPassFilter: null,
            highPassFilter: null,
            transitionGain: null,
            sharedBusFaders: false,
        };

        gain.connect(routeInput);
        ScheduleMusicBusGain(
            gain.gain,
            instance.busVolumeStates,
            [],
            trackRtpcCurves,
            0,
            0,
            0,
            this.#context,
            this.#busRtpcCatalog,
            this.#readGlobalRtpc,
            this.#readGlobalRtpcTransitionBoundaries,
            this.#busStateCatalog,
            this.#readGlobalStateWeights,
            this.#readGlobalStateTransitionBoundaries,
            this.#busDuckingController,
        );
        scheduled.routeGains.set(key, route);
        return route.input;
    }

    /** Gets or creates one scheduled segment's shared Bus processing route. */
    #GetBusRouteGain(instance, scheduled, trackId, track)
    {
        const busPathIds = track.busPathIds.map(String);

        const authoredBusVolumeDb = Number(
            track.authoredBusVolumeDb ?? 0,
        );
        const authoredBusMakeUpGainDb = Number(
            track.authoredBusMakeUpGainDb ?? 0,
        );
        const authoredOutputBusVolumeDb = Number(
            track.authoredOutputBusVolumeDb ?? 0,
        );
        const busGraphRoute = this.#busGraphRuntime?.ResolveMusicRoute(
            trackId,
            {
                outputBusId: busPathIds[0],
                busPathIds,
                ...(track.authoredBusVolumeDb === undefined
                    ? {}
                    : { authoredBusVolumeDb }),
                ...(track.authoredBusMakeUpGainDb === undefined
                    ? {}
                    : { authoredBusMakeUpGainDb }),
                ...(track.authoredOutputBusVolumeDb === undefined
                    ? {}
                    : { authoredOutputBusVolumeDb }),
            },
        ) ?? null;
        const key = `${busGraphRoute?.index ?? "legacy"}:`
            + `${authoredBusVolumeDb}:${authoredBusMakeUpGainDb}:`
            + `${authoredOutputBusVolumeDb}:`
            + busPathIds.join("/");

        if (scheduled.routeGains.has(key))
        {
            return scheduled.routeGains.get(key).input;
        }

        const gain = this.#context.createGain();
        const lowPassFilter = busStatePathUses(
            this.#busStateCatalog,
            busPathIds,
            "lowPass",
        ) ? this.#context.createBiquadFilter?.() ?? null : null;
        const highPassFilter = busStatePathUses(
            this.#busStateCatalog,
            busPathIds,
            "highPass",
        ) ? this.#context.createBiquadFilter?.() ?? null : null;
        const mixerInput = busGraphRoute
            ? this.#busMixer?.GetInput?.(busGraphRoute, "music") ?? null
            : null;
        const busEffectChain = mixerInput
            ? null
            : createBusEffectChain(
                this.#context,
                this.#busEffectCatalog,
                busPathIds,
            );
        const transitionGain = mixerInput
            ? this.#context.createGain()
            : null;
        const instanceRouteGain = mixerInput
            ? this.#GetInstanceRouteGain(
                instance,
                busGraphRoute,
                mixerInput,
            )
            : null;
        const route = {
            input: lowPassFilter ?? highPassFilter ?? gain,
            gain,
            busGraphRoute,
            busPathIds,
            trackRtpcCurves: [],
            authoredBusVolumeDb,
            authoredBusMakeUpGainDb,
            authoredOutputBusVolumeDb,
            busEffectNodes: busEffectChain?.nodes ?? [],
            lowPassFilter,
            highPassFilter,
            transitionGain,
            sharedBusFaders: Boolean(mixerInput),
        };

        if (lowPassFilter)
        {
            lowPassFilter.type = "lowpass";
            lowPassFilter.Q.value = Math.SQRT1_2;
            lowPassFilter.connect(highPassFilter ?? gain);
        }
        if (highPassFilter)
        {
            highPassFilter.type = "highpass";
            highPassFilter.Q.value = Math.SQRT1_2;
            highPassFilter.connect(gain);
        }
        const routeDestination = transitionGain ?? scheduled.gain;

        transitionGain?.connect(instanceRouteGain);
        gain.connect(busEffectChain?.input ?? routeDestination);
        busEffectChain?.output?.connect(routeDestination);
        ScheduleMusicBusGain(
            gain.gain,
            instance.busVolumeStates,
            busPathIds,
            [],
            authoredBusVolumeDb,
            authoredBusMakeUpGainDb,
            authoredOutputBusVolumeDb,
            this.#context,
            this.#busRtpcCatalog,
            this.#readGlobalRtpc,
            this.#readGlobalRtpcTransitionBoundaries,
            this.#busStateCatalog,
            this.#readGlobalStateWeights,
            this.#readGlobalStateTransitionBoundaries,
            this.#busDuckingController,
            Boolean(mixerInput),
        );
        ScheduleMusicBusFilter(
            lowPassFilter,
            busPathIds,
            "lowPass",
            false,
            this.#context,
            this.#busStateCatalog,
            this.#readGlobalStateWeights,
            this.#readGlobalStateTransitionBoundaries,
        );
        ScheduleMusicBusFilter(
            highPassFilter,
            busPathIds,
            "highPass",
            true,
            this.#context,
            this.#busStateCatalog,
            this.#readGlobalStateWeights,
            this.#readGlobalStateTransitionBoundaries,
        );
        scheduled.routeGains.set(key, route);
        return route.input;
    }

    /** Gets one instance-local lane before a qualified shared music route. */
    #GetInstanceRouteGain(instance, busGraphRoute, mixerInput)
    {
        let gain = instance.routeMixerGains.get(busGraphRoute);

        if (gain)
        {
            return gain;
        }
        gain = this.#context.createGain();
        if (instance.stopped && gain.gain && "value" in gain.gain)
        {
            gain.gain.value = 0;
        }
        gain.connect(mixerInput);
        this.#ApplyAuthoredOutputEnvelope(instance, gain.gain);
        instance.routeMixerGains.set(busGraphRoute, gain);
        return gain;
    }

    /** Loads and retains one decoded music source, evicting failed results. */
    #LoadBuffer(sourceId, track)
    {
        if (this.#buffers.has(sourceId)) return this.#buffers.get(sourceId);
        const pending = Promise.resolve(this.#loadMedia?.(sourceId, track))
            .catch(() => null)
            .then(buffer =>
            {
                if (!buffer && this.#buffers.get(sourceId) === pending)
                {
                    this.#buffers.delete(sourceId);
                }
                return buffer;
            });
        this.#buffers.set(sourceId, pending);
        return pending;
    }

    /** Applies an authored fade-in relative to a segment's entry cue. */
    #ApplyFadeIn(scheduledSegment, entryTime, fade)
    {
        const duration = FadeDuration(fade);
        const params = scheduledSegment.GetGainParams();

        if (!(duration > 0) || !params.length)
        {
            return;
        }

        const start = entryTime + FadeOffset(fade);
        const end = start + duration;
        const now = this.#context?.currentTime ?? 0;

        if (end <= now)
        {
            for (const param of params)
            {
                if ("value" in param) param.value = 1;
            }
            return;
        }

        const effectiveStart = Math.max(start, now);
        const progress = Math.max(
            0,
            Math.min(1, (effectiveStart - start) / duration),
        );

        scheduledSegment.FadeIn({
            when: effectiveStart,
            duration: end - effectiveStart,
            curve: fade?.fadeCurve,
            progress,
        });
    }

    /** Applies an authored fade-out whose offset is relative to an exit cue. */
    #ApplySourceFade(
        scheduledSegment,
        exitTime,
        fade,
        allowPostExit = false,
        atExitCue = false,
    )
    {
        const duration = FadeDuration(fade);
        const offset = FadeOffset(fade);
        const effectiveOffset = atExitCue && !allowPostExit
            ? Math.min(offset, 0)
            : offset;

        if (!(duration > 0))
        {
            if (allowPostExit && offset === 0)
            {
                return;
            }
            const stopAt = exitTime + effectiveOffset;

            scheduledSegment.FadeOut({
                when: Math.max(stopAt, this.#context?.currentTime ?? 0),
                duration: 0,
            });
            return;
        }

        const end = exitTime + effectiveOffset;
        const start = end - duration;
        const now = this.#context?.currentTime ?? 0;

        if (end <= now)
        {
            scheduledSegment.FadeOut({ when: now, duration: 0 });
            return;
        }

        const effectiveStart = Math.max(start, now);
        const progress = Math.max(
            0,
            Math.min(1, (effectiveStart - start) / duration),
        );
        const startValue = 1
            - FadeCurveValue(fade?.fadeCurve, progress);

        scheduledSegment.FadeOut({
            when: effectiveStart,
            duration: end - effectiveStart,
            startValue,
            fadeCurve: fade?.fadeCurve,
            progress,
        });
    }

    /** Stops one live instance immediately or after an audible fade. */
    #StopInstance(instance, fadeSeconds)
    {
        if (instance.stopped) return;
        instance.stopped = true;
        const now = this.#context?.currentTime ?? 0;
        if (fadeSeconds > 0)
        {
            instance.gain?.gain?.linearRampToValueAtTime?.(0, now + fadeSeconds);
            for (const gain of instance.routeMixerGains.values())
            {
                gain.gain?.linearRampToValueAtTime?.(0, now + fadeSeconds);
            }
        }
        else if (instance.gain?.gain && "value" in instance.gain.gain)
        {
            instance.gain.gain.value = 0;
            for (const gain of instance.routeMixerGains.values())
            {
                if (gain.gain && "value" in gain.gain)
                {
                    gain.gain.value = 0;
                }
            }
        }
        for (const active of instance.active)
        {
            active.FadeOut({ when: now, duration: fadeSeconds });
        }
        if (fadeSeconds > 0)
        {
            instance.stopAt = now + fadeSeconds;
        }
        else
        {
            this.#FinalizeInstance(instance);
        }
    }

    /** Marks a naturally exhausted instance stopped and finalizes it. */
    #FinishInstance(instance)
    {
        if (instance.finished) return;
        instance.stopped = true;
        instance.stopAt = null;
        this.#FinalizeInstance(instance);
    }

    /** Removes one instance, disconnects its gain, and fires completion once. */
    #FinalizeInstance(instance)
    {
        if (instance.finished) return;
        instance.finished = true;
        this.#instances.delete(instance.key);
        for (const scheduled of instance.active)
        {
            scheduled.Dispose();
        }
        instance.active = [];
        instance.gain?.disconnect?.();
        for (const gain of instance.routeMixerGains.values())
        {
            gain.disconnect?.();
        }
        instance.routeMixerGains.clear();
        const group = instance.group;

        group?.instances.delete(instance);
        this.#MaybeFinishGroup(group);
    }
}
