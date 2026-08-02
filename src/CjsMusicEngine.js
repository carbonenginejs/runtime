// CarbonEngineJS original (no Carbon counterpart). Interactive-music engine:
// interprets the authored Wwise music graph produced in tools-core's complete
// audio-library build the way AK::MusicEngine would in the real client.
// Carbon's C++ contributes no musical intelligence (InitMusic is dead code);
// the game only posts events and sets switches/states, so this engine's fidelity
// target is the bank data, not Carbon code.
import { evaluateWwiseInterpolation } from "./internal/wwiseCurve.js";
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
const LINEAR_FADE_CURVE = 4;
const FADE_CURVE_SAMPLES = 65;

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
)
{
    if (!param) return;
    const now = Number(context?.currentTime) || 0;
    const path = Array.isArray(busPathIds) ? busPathIds.map(String) : [];
    const baseDb = (Number(authoredBusVolumeDb) || 0)
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
        db += evaluateBusRtpcGainDb(
            busRtpcCatalog,
            path,
            readGlobalRtpc,
            at,
        );
        db += evaluateBusStateGainDb(
            busStateCatalog,
            path,
            readGlobalStateWeights,
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

/** One playing music instance: a posted event's active graph playback. */
class MusicInstance
{
    /** Creates the scheduling state for one posted music event. */
    constructor({ playingID, rootId, group, busVolumeStates })
    {
        this.playingID = playingID;
        this.rootId = rootId;
        this.group = group;
        this.busVolumeStates = busVolumeStates ?? null;
        this.key = Symbol(`music:${playingID}:${rootId}`);
        this.gain = null;
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

    #buffers = new Map();

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
        if (gain && typeof gain === "object" && "value" in gain)
        {
            gain.value = Math.max(0, Math.min(1, Number(value) || 0));
        }
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
        this.#unsubscribeBusDucking?.();
        this.#unsubscribeBusDucking = null;
        this.#busDuckingController = null;
        this.#busGraphRuntime = null;
        this.#musicGain?.disconnect?.();
        this.#musicGain = null;
        this.#graph = null;
        this.#loadMedia = null;
        this.#destination = null;
        this.#context = null;
    }

    /** True when this engine owns the event (play/stop target or switch/state setter). */
    HandlesEvent(eventName)
    {
        if (!this.#graph) return false;
        return !!(this.#graph.eventTargets?.[eventName]
            || this.#graph.eventStops?.[eventName]
            || this.#graph.switchSetters?.[eventName]);
    }

    /**
     * Posts a music event under an externally allocated playing id.
     * Setter events apply their switch/state values and finish immediately;
     * play events start graph playback. Returns true when the id stays live.
     */
    PostEvent(eventName, playingID, onFinished, { busVolumeStates = null } = {})
    {
        const setters = this.#graph.switchSetters?.[eventName];
        if (setters)
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
                if (!instance.stopped)
                {
                    this.#ReevaluateInstance(instance);
                }
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
        if (!targets || !targets.length || !this.#context)
        {
            // Deferred so the caller can record the playing id before the
            // finished callback clears it (setter events finish immediately).
            queueMicrotask(() => onFinished?.());
            return false;
        }
        const group = {
            playingID,
            onFinished,
            instances: new Set(),
            finished: false,
        };

        this.#groups.set(playingID, group);
        for (const rootId of targets)
        {
            const instance = new MusicInstance({
                playingID,
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
        for (const instance of [ ...group.instances ])
        {
            this.#StopInstance(instance, seconds);
        }
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
            this.#PruneScheduledSegments(instance, now);
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
                this.#DisposeScheduledSegment(scheduled);
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
                rootId: instance.rootId,
                now,
                state,
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
        this.#switchValues.set(groupId >>> 0, valueId >>> 0);
        for (const instance of this.#instances.values())
        {
            if (instance.stopped) continue;
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
            if (instance.stopped
                || instance.pendingGeneration !== generation)
            {
                return;
            }
            if (!preparation)
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
                this.#FadeOutSources(active, when, fadeSeconds);
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
            if (instance.stopped || instance.pendingGeneration !== generation)
            {
                return;
            }
            if (!preparation)
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
        let meter = null;
        let playPreEntry = instance.nextSegmentPlayPreEntry ?? true;

        if (instance.nextSegmentPlan)
        {
            segmentId = instance.nextSegmentPlan.segmentId;
            subTracks = instance.nextSegmentPlan.subTracks;
            preparedBuffers = instance.nextSegmentPlan.preparedBuffers;
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
        } = {},
    )
    {
        // Each scheduled segment owns a gain so transitions can crossfade it
        // out without touching the incoming segment on the same instance.
        const gain = this.#context.createGain();
        gain.connect(instance.gain);
        const scheduled = {
            sources: [],
            routeGains: new Map(),
            segmentId,
            scheduleId: this.#nextScheduleId++,
            targetId,
            gain,
            startCtx: boundary,
            endCtx: boundary + Math.max(0.001, (exitCueMs - entryCueMs) / 1000),
            audibleEndCtx: boundary
                + Math.max(0.001, (exitCueMs - entryCueMs) / 1000),
            timeline: {
                startCtx: boundary - entryCueMs / 1000,
                meter,
            },
            fading: false,
            fadeEndCtx: null
        };
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
                );
            }
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
        const now = context.currentTime;
        if (when < now)
        {
            offsetMs += (now - when) * 1000;
            when = now;
        }
        const durationMs = audibleEndMs
            - audibleStartMs
            - (offsetMs - initialOffsetMs);
        if (durationMs <= 0) return;
        const entry = {
            sourceId: clip.sourceId,
            source: null,
            startCtx: when,
            endCtx: when + durationMs / 1000,
            cancelled: false,
            failed: false,
            missed: false,
            ended: false,
            duckActivity: null,
        };
        scheduled.sources.push(entry);
        const epoch = this.#epoch;
        const prepared = preparedBuffers?.has(clip.sourceId)
            ? preparedBuffers.get(clip.sourceId)
            : this.#LoadBuffer(clip.sourceId, track);

        Promise.resolve(prepared).then(buffer =>
        {
            if (!buffer)
            {
                entry.cancelled = true;
                entry.failed = true;
                return;
            }
            if (entry.cancelled || instance.stopped || epoch !== this.#epoch)
            {
                return;
            }
            let resolvedWhen = when;
            let resolvedOffsetMs = offsetMs;
            if (resolvedWhen < context.currentTime)
            {
                resolvedOffsetMs += (context.currentTime - resolvedWhen) * 1000;
                resolvedWhen = context.currentTime;
            }
            const resolvedDurationMs = audibleEndMs
                - audibleStartMs
                - (resolvedOffsetMs - initialOffsetMs);
            if (resolvedDurationMs <= 0)
            {
                entry.cancelled = true;
                entry.missed = true;
                return;
            }
            if (scheduled.fading
                && scheduled.fadeEndCtx <= context.currentTime)
            {
                entry.cancelled = true;
                return;
            }
            scheduled.audibleEndCtx = Math.max(
                scheduled.audibleEndCtx,
                resolvedWhen + resolvedDurationMs / 1000,
            );
            const source = context.createBufferSource();
            source.buffer = buffer;
            const routeGain = this.#GetRouteGain(
                instance,
                scheduled,
                trackId,
                track,
            );

            source.connect(routeGain ?? scheduled.gain);
            source.onended = () =>
            {
                const endedAt = Number(context.currentTime) || entry.endCtx;

                if (endedAt <= entry.startCtx)
                {
                    entry.duckActivity?.Cancel?.(endedAt);
                }
                else
                {
                    entry.duckActivity?.End?.(endedAt);
                }
                entry.duckActivity = null;
                entry.ended = true;
                source.onended = null;
                source.disconnect?.();
            };
            try
            {
                source.start(
                    resolvedWhen,
                    Math.max(0, resolvedOffsetMs) / 1000,
                    resolvedDurationMs / 1000,
                );
            }
            catch (error)
            {
                source.onended = null;
                source.disconnect?.();
                throw error;
            }
            entry.source = source;
            entry.startCtx = resolvedWhen;
            entry.endCtx = resolvedWhen + resolvedDurationMs / 1000;
            entry.duckActivity = this.#busDuckingController
                ?.ScheduleActivity?.(
                    track.busPathIds,
                    entry.startCtx,
                    entry.endCtx,
                ) ?? null;
            if (scheduled.fading)
            {
                source.stop(scheduled.fadeEndCtx);
            }
        }).catch(() =>
        {
            entry.cancelled = true;
            entry.failed = true;
        });
    }

    /** Gets or creates the gain node for one scheduled music bus route. */
    #GetRouteGain(instance, scheduled, trackId, track)
    {
        if (!Array.isArray(track.busPathIds)
            || !track.busPathIds.length)
        {
            return null;
        }

        const authoredBusVolumeDb = Number(
            track.authoredBusVolumeDb ?? 0,
        );
        const authoredBusMakeUpGainDb = Number(
            track.authoredBusMakeUpGainDb ?? 0,
        );
        const authoredOutputBusVolumeDb = Number(
            track.authoredOutputBusVolumeDb ?? 0,
        );
        const busPathIds = track.busPathIds.map(String);
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
        const busEffectChain = createBusEffectChain(
            this.#context,
            this.#busEffectCatalog,
            busPathIds,
        );
        const route = {
            input: lowPassFilter ?? highPassFilter ?? gain,
            gain,
            busGraphRoute,
            busPathIds,
            authoredBusVolumeDb,
            authoredBusMakeUpGainDb,
            authoredOutputBusVolumeDb,
            busEffectNodes: busEffectChain?.nodes ?? [],
            lowPassFilter,
            highPassFilter,
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
        gain.connect(busEffectChain?.input ?? scheduled.gain);
        busEffectChain?.output?.connect(scheduled.gain);
        ScheduleMusicBusGain(
            gain.gain,
            instance.busVolumeStates,
            busPathIds,
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
        const param = scheduledSegment?.gain?.gain;

        if (!(duration > 0) || !param)
        {
            return;
        }

        const start = entryTime + FadeOffset(fade);
        const end = start + duration;
        const now = this.#context?.currentTime ?? 0;

        if (end <= now)
        {
            if ("value" in param) param.value = 1;
            return;
        }

        const effectiveStart = Math.max(start, now);
        const progress = Math.max(
            0,
            Math.min(1, (effectiveStart - start) / duration),
        );

        ScheduleFade(
            param,
            0,
            1,
            effectiveStart,
            end - effectiveStart,
            fade?.fadeCurve,
            progress,
        );
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

            this.#FadeOutSources(
                scheduledSegment,
                Math.max(stopAt, this.#context?.currentTime ?? 0),
                0,
            );
            return;
        }

        const end = exitTime + effectiveOffset;
        const start = end - duration;
        const now = this.#context?.currentTime ?? 0;

        if (end <= now)
        {
            this.#FadeOutSources(scheduledSegment, now, 0);
            return;
        }

        const effectiveStart = Math.max(start, now);
        const progress = Math.max(
            0,
            Math.min(1, (effectiveStart - start) / duration),
        );
        const startValue = 1
            - FadeCurveValue(fade?.fadeCurve, progress);

        this.#FadeOutSources(
            scheduledSegment,
            effectiveStart,
            end - effectiveStart,
            startValue,
            fade?.fadeCurve,
            progress,
        );
    }

    /** Fades a scheduled segment gain and stops loaded or future sources. */
    #FadeOutSources(
        scheduledSegment,
        when,
        fadeSeconds,
        startValue = null,
        fadeCurve = LINEAR_FADE_CURVE,
        progress = 0,
    )
    {
        // First fade wins: an already-fading segment keeps its earlier
        // schedule (its sources already have stops queued).
        if (scheduledSegment.fading) return;
        scheduledSegment.fading = true;
        scheduledSegment.fadeEndCtx = when + fadeSeconds;
        if (fadeSeconds > 0 && scheduledSegment.gain?.gain)
        {
            const param = scheduledSegment.gain.gain;
            const authored = startValue !== null;

            ScheduleFade(
                param,
                authored ? 1 : (param.value ?? 1),
                0,
                when,
                fadeSeconds,
                authored ? fadeCurve : LINEAR_FADE_CURVE,
                authored ? progress : 0,
            );
        }
        for (const entry of scheduledSegment.sources)
        {
            if (entry.source)
            {
                const stopAt = when + fadeSeconds;

                if (stopAt <= entry.startCtx)
                {
                    entry.duckActivity?.Cancel?.(stopAt);
                    entry.duckActivity = null;
                }
                else
                {
                    entry.duckActivity?.End?.(stopAt);
                }
                try
                {
                    entry.source.stop(stopAt);
                }
                catch
                {
                    // already stopped
                }
            }
            else if (when + fadeSeconds <= (this.#context?.currentTime ?? 0))
            {
                entry.cancelled = true;
            }
        }
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
        }
        else if (instance.gain?.gain && "value" in instance.gain.gain)
        {
            instance.gain.gain.value = 0;
        }
        for (const active of instance.active)
        {
            this.#FadeOutSources(active, now, fadeSeconds);
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

    /** Cancels and disconnects every node owned by one scheduled segment. */
    #DisposeScheduledSegment(scheduled)
    {
        if (scheduled.disposed) return;
        scheduled.disposed = true;
        for (const entry of scheduled.sources)
        {
            entry.cancelled = true;
            const now = Number(this.#context?.currentTime) || 0;

            if (now <= entry.startCtx)
            {
                entry.duckActivity?.Cancel?.(now);
            }
            else
            {
                entry.duckActivity?.End?.(now);
            }
            entry.duckActivity = null;
            if (entry.source)
            {
                entry.source.onended = null;
                entry.source.disconnect?.();
            }
        }
        for (const route of scheduled.routeGains?.values?.() ?? [])
        {
            route.lowPassFilter?.disconnect?.();
            route.highPassFilter?.disconnect?.();
            route.gain?.disconnect?.();
            for (const node of route.busEffectNodes ?? [])
            {
                node.disconnect?.();
            }
        }
        scheduled.routeGains?.clear?.();
        scheduled.gain?.disconnect?.();
    }

    /** Removes one instance, disconnects its gain, and fires completion once. */
    #FinalizeInstance(instance)
    {
        if (instance.finished) return;
        instance.finished = true;
        this.#instances.delete(instance.key);
        for (const scheduled of instance.active)
        {
            this.#DisposeScheduledSegment(scheduled);
        }
        instance.active = [];
        instance.gain?.disconnect?.();
        const group = instance.group;

        group?.instances.delete(instance);
        if (group && !group.instances.size && !group.finished)
        {
            group.finished = true;
            this.#groups.delete(group.playingID);
            group.onFinished?.();
        }
    }
}
