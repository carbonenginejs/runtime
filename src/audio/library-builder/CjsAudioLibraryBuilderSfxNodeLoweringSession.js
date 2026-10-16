import { CjsSchema } from "#schema";

// CarbonEngineJS original (no Carbon counterpart).
import { PARAMETRIC_EQ_PLUGIN_ID, WWISE_DELAY_PLUGIN_ID, WWISE_COMPRESSOR_PLUGIN_ID, WWISE_PEAK_LIMITER_PLUGIN_ID, WWISE_FLANGER_PLUGIN_ID, WWISE_TREMOLO_PLUGIN_ID, WWISE_GUITAR_DISTORTION_PLUGIN_ID, WWISE_MATRIX_REVERB_PLUGIN_ID, WWISE_ROOMVERB_PLUGIN_ID, WWISE_METER_PLUGIN_ID, parseStaticParametricEqBytes, parseStaticWwiseDelayBytes, parseGraphSharedBusEffect, parseStaticWwiseFlangerBytes, parseStaticWwiseTremoloBytes, parseStaticWwiseGuitarDistortionBytes, parseStaticWwiseMatrixReverbBytes, parseStaticWwiseRoomVerbBytes, parseStaticWwiseMeterBytes } from "../internal/busEffects.js";
import { CjsAudioLibraryBuilderUtils, WWISE_SILENCE_SOURCE_PLUGIN_ID, SFX_INITIAL_DELAY_PROPERTY, SFX_VOLUME_PROPERTY, SFX_PITCH_PROPERTY, SFX_LOW_PASS_PROPERTY, SFX_HIGH_PASS_PROPERTY, SFX_IMMEDIATE_STATE_SYNC, SFX_FILTER_ACCUMULATION, SFX_ADDITIVE_ACCUMULATION, WWISE_PRIORITY_PROPERTY, BUS_MAX_NUM_INSTANCES_RTPC_PROPERTY, WWISE_EXCLUSIVE_ACCUMULATION, WWISE_FILTERING_OVER_TIME_RAMP } from "./CjsAudioLibraryBuilderUtils.js";

/** Owns recursive SFX node lowering, memoized summaries, and synthetic IDs. */
export class CjsAudioLibraryBuilderSfxNodeLoweringSession
{
    _active = new Set();

    _ancestry = null;

    _buses = null;

    _crossfadeFiniteSounds = new Set();

    _effects = null;

    _embeddedMedia = null;

    _media = null;

    _names = null;

    _nodes = {};

    _parsed = null;

    _projections = new Map();

    _syntheticID = 0xffffffff;

    _usedIDs = new Set();

    /** Creates one lowering session for a parsed Wwise SFX node graph. */
    constructor({
        parsed,
        effects,
        buses,
        names,
        media,
        embeddedMedia,
        ancestry,
    })
    {
        this._parsed = parsed;
        this._effects = effects;
        this._buses = buses;
        this._names = names;
        this._media = media;
        this._embeddedMedia = embeddedMedia;
        this._ancestry = ancestry;
        this._usedIDs = new Set(
            [ ...parsed.nodes.keys() ].map(value => String(value >>> 0)),
        );
    }

    /** Lowers one raw node once and returns its node and traversal summary. */
    Lower(rawID)
    {
        const id = String(Number(rawID) >>> 0);
        const existing = this._projections.get(id);

        if (existing)
        {
            return existing;
        }
        if (this._active.has(id))
        {
            throw new Error(`cycle at node ${id}`);
        }

        const source = this._parsed.nodes.get(Number(id));

        if (!source)
        {
            throw new Error(`missing typed node ${id}`);
        }

        this._active.add(id);

        try
        {
            const summary = {
                leaves: new Set(),
                childContainsContinuous: false,
                childContainsNonSwitchContinuous: false,
            };
            const lowerChild = childID =>
            {
                const child = this.Lower(childID);

                CjsAudioLibraryBuilderUtils.addSet(summary.leaves, child.leaves);
                summary.childContainsContinuous ||=
                    child.containsContinuous;
                summary.childContainsNonSwitchContinuous ||=
                    child.containsNonSwitchContinuous;
                return child.nodeId;
            };
            let lowered;

            if (source.type === "sound")
            {
                lowered = this._LowerSound(id, source, summary);
            }
            else if (source.type === "random"
                || source.type === "sequence")
            {
                lowered = this._LowerRandomSequence(
                    id,
                    source,
                    lowerChild,
                    summary,
                );
            }
            else if (source.type === "switch")
            {
                lowered = this._LowerSwitch(
                    id,
                    source,
                    lowerChild,
                    summary,
                );
            }
            else if (source.type === "layer")
            {
                lowered = this._LowerLayer(
                    id,
                    source,
                    lowerChild,
                );
            }
            else
            {
                throw new Error(`unsupported node type ${source.type}`);
            }

            const { node, neverCompletes = false } = lowered;

            Object.assign(
                node,
                CreateSfxNodeBasePlaybackProjection(
                    this._ancestry,
                    this._parsed.nodes,
                    id,
                    this._names,
                ),
                source.type === "sound"
                    ? CreateSfxSoundVoiceLimitProjection(
                        this._ancestry,
                        id,
                        this._buses,
                    )
                    : {},
            );
            this._nodes[id] = node;

            const projection = {
                nodeId: id,
                leaves: summary.leaves,
                containsContinuous:
                    summary.childContainsContinuous
                    || node.continuous !== undefined
                    || (source.type === "layer"
                        && source.continuousValidation
                        && neverCompletes),
                containsNonSwitchContinuous:
                    summary.childContainsNonSwitchContinuous
                    || (node.continuous !== undefined
                        && node.type !== "switch")
                    || (source.type === "layer"
                        && source.continuousValidation
                        && neverCompletes),
                neverCompletes,
            };

            this._projections.set(id, projection);
            return projection;
        }
        finally
        {
            this._active.delete(id);
        }
    }

    /** Aggregates event roots through this session's synthetic-ID allocator. */
    AggregateRoots(roots, force = false)
    {
        if (roots.length === 1 && !force)
        {
            return roots[0];
        }

        return {
            nodeId: this._Allocate({
                type: "parallel",
                children: roots,
            }),
        };
    }

    /** Returns the still-plain serialized node table owned by this session. */
    GetPlainNodes()
    {
        return this._nodes;
    }

    /** Lowers one codec or qualified Wwise Silence source. */
    _LowerSound(id, source, summary)
    {
        const mediaID = String(source.sourceId >>> 0);
        const loopCount = this._parsed.nodeBases
            ?.get(Number(id))
            ?.loopCount;
        const matchIds = CreateSfxMatchIds(this._ancestry, id);
        const routing = CjsAudioLibraryBuilderUtils.createSfxBusRouting(
            this._ancestry,
            id,
            this._buses,
        );

        if (source.pluginType === 1
            && !this._media[mediaID]
            && !this._embeddedMedia[mediaID])
        {
            throw new Error(
                `sound ${id} references unavailable media ${mediaID}`,
            );
        }
        const identity = {
            ...(matchIds.length > 1
                ? { matchIds }
                : {}),
            ...(routing ?? {}),
        };
        let node;

        if (source.pluginType === 1)
        {
            node = {
                type: "sound",
                mediaId: mediaID,
                ...identity,
                ...CreateSfxSoundEffectProjection(
                    this._ancestry,
                    this._effects,
                    this._names,
                    id,
                ),
                ...(loopCount === 0
                    ? { loop: true }
                    : Number.isSafeInteger(loopCount) && loopCount > 0
                        ? {
                            loop: false,
                            playCount: loopCount,
                        }
                        : this._crossfadeFiniteSounds.has(id)
                            ? { loop: false }
                            : {}),
            };
        }
        else if (source.pluginType === 2
            && source.pluginId === WWISE_SILENCE_SOURCE_PLUGIN_ID)
        {
            if (loopCount !== null && loopCount !== undefined)
            {
                throw new Error(`looping silence source ${id}`);
            }
            node = {
                type: "timed-silence",
                durationMs: ParseStaticWwiseSilenceDuration(
                    this._effects,
                    source,
                    id,
                ),
                ...identity,
            };
        }
        else
        {
            throw new Error(`source plug-in sound ${id}`);
        }
        summary.leaves.add(Number(id) >>> 0);
        return {
            node,
            neverCompletes: node.loop === true,
        };
    }

    /** Lowers one Random or Sequence container and its Continuous contract. */
    _LowerRandomSequence(id, source, lowerChild, summary)
    {
        if (source.restartBackward)
        {
            throw new Error(`reverse sequence ${id}`);
        }
        if (source.continuous
            && (source.loopModMin !== 0
                || source.loopModMax !== 0))
        {
            throw new Error(
                `randomized continuous loop count ${id}`,
            );
        }
        if (source.continuous && source.loopCount > 32767)
        {
            throw new Error(
                `continuous loop count exceeds 32767 at ${id}`,
            );
        }
        if (source.continuous
            && source.transitionMode !== 0
            && source.transitionMode !== 1
            && source.transitionMode !== 2
            && source.transitionMode !== 3
            && source.transitionMode !== 5)
        {
            throw new Error(
                `unsupported continuous transition ${source.transitionMode} at ${id}`,
            );
        }
        if (source.continuous
            && (source.transitionMode === 1
                || source.transitionMode === 2))
        {
            this._QualifyCrossfadeChildren(
                source.playlist.length
                    ? source.playlist.map(item => item.playId)
                    : source.children,
                id,
            );
        }
        if (source.continuous
            && source.transitionMode === 5
            && source.transitionTime
                + source.transitionTimeModMin < 21)
        {
            throw new Error(
                `continuous trigger rate below 21ms at ${id}`,
            );
        }

        const playlist = source.playlist.length
            ? source.playlist
            : source.children.map(playId => ({
                playId,
                weight: 1,
            }));
        const children = [];

        for (const item of playlist)
        {
            if (source.type === "random"
                && source.usingWeight
                && item.weight <= 0)
            {
                continue;
            }

            children.push({
                nodeId: lowerChild(item.playId),
                ...(source.type === "random" && source.usingWeight
                    ? { weight: item.weight }
                    : {}),
            });
        }

        if (!children.length)
        {
            throw new Error(`empty ${source.type} ${id}`);
        }
        // A Continuous Random cannot reach another selection when every
        // candidate is infinite. Wwiser applies the same all-looping-children
        // reduction: retain one authored Random choice and let its selected
        // child own the only live Continuous clock.
        const absorbsInfiniteChildren = source.type === "random"
            && source.continuous
            && source.loopCount === 0
            && source.transitionMode === 0
            && summary.childContainsContinuous
            && children.every(child =>
                this._projections.get(String(child.nodeId))
                    ?.neverCompletes === true);
        const nestedChild = children.length === 1
            ? this._nodes[String(children[0].nodeId)]
            : null;
        // Wwise hangar warnings use one bounded nested clock: an infinite
        // outer Sequence waits after physical completion of a finite,
        // reset-on-play Trigger Rate Sequence.
        const supportsNestedTriggerRateDelay =
            source.type === "sequence"
            && source.continuous
            && source.loopCount === 0
            && source.transitionMode === 3
            && Object.keys(children[0]).length === 1
            && nestedChild?.type === "sequence"
            && Object.keys(nestedChild).every(key => [
                "type",
                "scope",
                "children",
                "continuous",
            ].includes(key))
            && nestedChild.continuous?.loopCount === 1
            && nestedChild.continuous.transition === "trigger-rate"
            && nestedChild.continuous.resetPlaylistEachPlay !== false
            && nestedChild.children.every(child =>
                !this._projections.get(String(child.nodeId))
                    ?.containsContinuous);
        // Jita's level-three incidental branch uses the second bounded form:
        // an infinite single-child Random/Delay around a two-choice amplitude
        // Crossfade Sequence. Dynamic inner terms remain unsupported.
        const supportsNestedCrossfadeDelay =
            source.type === "random"
            && source.continuous
            && source.loopCount === 0
            && source.transitionMode === 3
            && source.randomMode === 0
            && source.resetPlaylistEachPlay
            && Object.keys(children[0]).length === 1
            && nestedChild?.type === "sequence"
            && Object.keys(nestedChild).every(key => [
                "type",
                "scope",
                "children",
                "continuous",
                "gainDb",
                "pitchCents",
                "lowPass",
                "highPass",
                "initialDelayMs",
            ].includes(key))
            && nestedChild.children.length === 2
            && nestedChild.continuous?.loopCount === 1
            && nestedChild.continuous.transition === "crossfade-amplitude"
            && nestedChild.continuous.resetPlaylistEachPlay === false
            && nestedChild.children.every(child =>
                !this._projections.get(String(child.nodeId))
                    ?.containsContinuous);

        if (source.continuous
            && summary.childContainsContinuous
            && !absorbsInfiniteChildren
            && !supportsNestedTriggerRateDelay
            && !supportsNestedCrossfadeDelay)
        {
            throw new Error(`nested continuous container ${id}`);
        }

        const neverCompletes = absorbsInfiniteChildren
            || (source.continuous && source.loopCount === 0);
        const node = {
            type: source.type,
            // Wwise applies Continuous playback per game object even when the
            // serialized container scope flag is global.
            scope: source.continuous
                ? "object"
                : source.global
                    ? "global"
                    : "object",
            children,
            ...(source.type === "random"
                ? {
                    mode: source.randomMode === 1
                        ? "shuffle"
                        : "random",
                    avoidRepeat: source.avoidRepeatCount,
                }
                : {}),
            ...(source.continuous && !absorbsInfiniteChildren
                ? {
                    continuous: {
                        loopCount: source.loopCount,
                        transition: source.transitionMode === 1
                            ? "crossfade-amplitude"
                            : source.transitionMode === 2
                                ? "crossfade-power"
                                : source.transitionMode === 3
                                    ? "delay"
                                    : source.transitionMode === 5
                                        ? "trigger-rate"
                                        : "disabled",
                        ...(source.transitionMode === 1
                            || source.transitionMode === 2
                            || source.transitionMode === 3
                            || source.transitionMode === 5
                            ? {
                                transitionMs: source.transitionTime,
                                ...(source.transitionTimeModMin !== 0
                                    || source.transitionTimeModMax !== 0
                                    ? {
                                        transitionRangeMs: {
                                            min: source.transitionTimeModMin,
                                            max: source.transitionTimeModMax,
                                        },
                                    }
                                    : {}),
                            }
                            : {}),
                        ...(source.type === "sequence"
                            ? {
                                resetPlaylistEachPlay:
                                    source.resetPlaylistEachPlay,
                            }
                            : {}),
                    },
                }
                : {}),
        };

        return { node, neverCompletes };
    }

    /** Lowers one Step or qualified Continuous Switch container. */
    _LowerSwitch(id, source, lowerChild, summary)
    {
        const empty = source.groupType === 0
            && source.groupId === 0
            && source.defaultValueId === 0
            && !source.continuousValidation
            && !source.children.length
            && !source.assignments.length;

        if (empty)
        {
            // Wwise builds no playable gvalue map when Children and SwitchList
            // are both empty. Stale parameter records alone select no audio.
            return { node: { type: "silence" } };
        }
        if (source.continuousValidation
            && source.parameters.some(parameter =>
                parameter.firstOnly
                || parameter.continuePlayback
                || parameter.onSwitchMode !== 1))
        {
            throw new Error(`unsupported continuous switch ${id}`);
        }
        // Step switches choose once per post, so their default Stop mode is
        // dormant; only live-continuation flags or fades require the
        // unsupported continuous-switch scheduler.
        if (!source.continuousValidation
            && source.parameters.some(parameter =>
                parameter.firstOnly
                || parameter.continuePlayback
                || parameter.fadeOutMs !== 0
                || parameter.fadeInMs !== 0))
        {
            throw new Error(`transitioned switch ${id}`);
        }

        const scope = source.groupType === 1 ? "state" : "switch";
        const group = this._names.groups.get(
            `${scope}:${source.groupId}`,
        );

        if (!group?.name)
        {
            throw new Error(
                `unnamed ${scope} group ${source.groupId}`,
            );
        }

        const cases = {};
        let defaultChild = null;
        const transitions = {};
        const parameters = new Map(source.parameters.map(
            parameter => [
                Number(parameter.childId) >>> 0,
                parameter,
            ],
        ));

        for (const assignment of source.assignments)
        {
            const valueName = group.values.get(assignment.valueId);

            if (!valueName)
            {
                throw new Error(
                    `unnamed ${scope} value ${assignment.valueId}`,
                );
            }
            const childIDs = assignment.childIds.map(childID =>
            {
                const child = lowerChild(childID);

                if (source.continuousValidation)
                {
                    const parameter = parameters.get(
                        Number(childID) >>> 0,
                    );

                    if (!parameter)
                    {
                        throw new Error(
                            `missing continuous switch parameter ${childID} at ${id}`,
                        );
                    }
                    transitions[child] = {
                        fadeOutMs: parameter.fadeOutMs,
                        fadeInMs: parameter.fadeInMs,
                    };
                }
                return child;
            });
            const child = this._Aggregate(childIDs);

            cases[valueName] = { nodeId: child };
            if (assignment.valueId === source.defaultValueId)
            {
                defaultChild = child;
            }
        }

        if (!Object.keys(cases).length)
        {
            throw new Error(`empty switch ${id}`);
        }
        if (defaultChild === null)
        {
            defaultChild = this._Aggregate([]);
        }
        if (source.continuousValidation
            && summary.childContainsNonSwitchContinuous)
        {
            throw new Error(
                `nested non-switch continuous container ${id}`,
            );
        }

        return {
            node: {
                type: "switch",
                scope,
                group: group.name,
                cases,
                default: { nodeId: defaultChild },
                ...(source.continuousValidation
                    ? { continuous: { transitions } }
                    : {}),
            },
        };
    }

    /** Lowers one Layer container and its qualified gain/RTPC associations. */
    _LowerLayer(id, source, lowerChild)
    {
        // A Layer controls only children named by its association list. An
        // associated Continuous Layer is approximated only when every direct
        // child is proven infinite: all children are pre-started and run
        // until Stop, with gain and property RTPC curves applied live, instead
        // of Wwise starting and stopping them at region boundaries (phase,
        // voice count and acquisition cost can differ).
        const associatedContinuous = source.continuousValidation
            && source.layers.some(layer => layer.associations.length);
        const children = source.children.map(nodeId => ({
            nodeId: lowerChild(nodeId),
        }));
        const associatedChildIDs = new Set(source.layers.flatMap(
            layer => layer.associations
                .filter(association => association.points.length)
                .map(association =>
                    Number(association.childId) >>> 0),
        ));

        if (associatedContinuous
            && (source.layers.some(layer =>
                layer.associations.some(association =>
                    !association.points.length))
                || source.children.some(childID =>
                    !associatedChildIDs.has(
                        Number(childID) >>> 0,
                    ))))
        {
            throw new Error(
                `continuous layer ${id} has incomplete associations`,
            );
        }

        const finiteChildren = associatedContinuous
            ? source.children.filter(childID =>
                this._projections.get(
                    String(Number(childID) >>> 0),
                )?.neverCompletes !== true)
            : [];

        if (finiteChildren.length)
        {
            throw new Error(
                `continuous layer ${id} has finite child `
                + finiteChildren.map(value =>
                    Number(value) >>> 0).join(","),
            );
        }
        const childByID = new Map(
            source.children.map((childID, index) => [
                Number(childID) >>> 0,
                children[index],
            ]),
        );
        let curveCount = 0;

        for (const layer of source.layers)
        {
            const associations = layer.associations;

            if (!associations.length)
            {
                continue;
            }
            if (layer.controlType !== 0
                && associations.some(association =>
                    association.points.length))
            {
                throw new Error(
                    `unsupported layer control type ${layer.controlType}`,
                );
            }

            const parameter = associations.some(association =>
                association.points.length)
                ? this._names.parameters.get(
                    Number(layer.controlId) >>> 0,
                )
                : null;

            if (associations.some(association =>
                association.points.length) && !parameter)
            {
                throw new Error(
                    `unnamed game parameter ${layer.controlId}`,
                );
            }

            for (const association of associations)
            {
                const child = childByID.get(
                    Number(association.childId) >>> 0,
                );

                if (!child)
                {
                    throw new Error(
                        `missing layer child ${association.childId}`,
                    );
                }

                if (association.points.length)
                {
                    const points = association.points.map(point =>
                    {
                        if (point.to < 0 || point.to > 1)
                        {
                            throw new Error(
                                `invalid layer gain ${point.to}`,
                            );
                        }
                        return {
                            x: point.from,
                            gain: point.to,
                            interpolation: point.interpolation,
                        };
                    });

                    (child.gainCurves ??= []).push({
                        rtpc: parameter,
                        scope: "object",
                        points,
                    });
                    curveCount++;
                }

                for (const rtpc of layer.initialRtpcs)
                {
                    if (associatedContinuous
                        && Number(rtpc.parameterId)
                            === SFX_INITIAL_DELAY_PROPERTY)
                    {
                        throw new Error(
                            "continuous layer InitialDelay RTPC",
                        );
                    }
                    const curve = CjsAudioLibraryBuilderUtils.createSfxRtpcCurve(
                        rtpc,
                        this._names,
                    );

                    if (!curve)
                    {
                        throw new Error(
                            "unsupported layer RTPC property "
                            + `${rtpc.parameterId}`,
                        );
                    }
                    (child.rtpcCurves ??= []).push(curve);
                }
            }
        }

        if (!children.length)
        {
            throw new Error(`empty layer ${id}`);
        }

        return {
            node: {
                type: curveCount ? "blend" : "parallel",
                children,
            },
            // The approximation owns a persistent object-scoped session and
            // is stopped through ordinary ancestor match identities.
            neverCompletes: associatedContinuous,
        };
    }

    /** Allocates one collision-free synthetic node identity. */
    _Allocate(node)
    {
        while (this._syntheticID > 0
            && this._usedIDs.has(String(this._syntheticID)))
        {
            this._syntheticID--;
        }
        if (this._syntheticID === 0)
        {
            throw new Error("Audio SFX construction exhausted node identities");
        }

        const id = String(this._syntheticID--);

        this._usedIDs.add(id);
        this._nodes[id] = node;
        return id;
    }

    /** Aggregates zero, one, or several lowered child node identities. */
    _Aggregate(childIDs)
    {
        if (!childIDs.length)
        {
            return this._Allocate({ type: "silence" });
        }
        if (childIDs.length === 1)
        {
            return childIDs[0];
        }
        return this._Allocate({
            type: "parallel",
            children: childIDs.map(nodeId => ({ nodeId })),
        });
    }

    /** Qualifies every finite Sound reachable by one Crossfade container. */
    _QualifyCrossfadeChildren(rawIDs, containerID)
    {
        const pending = [ ...rawIDs ];
        const visited = new Set();
        const qualifiedSounds = new Set();

        while (pending.length)
        {
            const rawID = pending.pop();
            const id = Number(rawID) >>> 0;

            if (visited.has(id))
            {
                continue;
            }
            visited.add(id);

            const source = this._parsed.nodes.get(id);

            if (!source)
            {
                throw new Error(`missing typed node ${id}`);
            }
            if (source.type === "switch" || source.type === "layer")
            {
                throw new Error(
                    `crossfade container ${containerID} reaches `
                    + `${source.type} ${id}`,
                );
            }
            if ((source.type === "random"
                    || source.type === "sequence")
                && source.continuous)
            {
                throw new Error(
                    `nested continuous container ${id}`,
                );
            }
            if (source.type === "sound"
                && this._parsed.nodeBases?.get(id)?.loopCount === 0)
            {
                throw new Error(
                    `crossfade container ${containerID} reaches `
                    + `infinite sound ${id}`,
                );
            }
            if (source.type === "sound")
            {
                qualifiedSounds.add(String(id));
            }
            for (const childID of source.children ?? [])
            {
                pending.push(childID);
            }
        }
        for (const key of qualifiedSounds)
        {
            this._crossfadeFiniteSounds.add(key);
            if (this._nodes[key]?.type === "sound"
                && this._nodes[key].loop === undefined)
            {
                this._nodes[key].loop = false;
            }
        }
    }
}

function CreateSfxMatchIds(ancestry, rawID)
{
    const trace = ancestry.Trace(rawID);
    const result = trace.entries.map(entry => String(entry.id));

    // Match/Stop targeting intentionally keeps one unresolved parent ID so
    // authored hierarchy controls can still match a partially parsed graph.
    if (trace.terminal === "missing")
    {
        result.push(String(trace.terminalId));
    }

    return result;
}

/** Projects the Wwise Game Parameter filter forms the browser can reproduce. */
function ProjectSourceEffectControlTransition(names, controlID, ownerLabel)
{
    const transition = names.parameterTransitions.get(controlID);

    if (!transition
        || (transition.rampType === 0
            && transition.rampUpSeconds === 0
            && transition.rampDownSeconds === 0))
    {
        return undefined;
    }
    if (transition.rampType !== WWISE_FILTERING_OVER_TIME_RAMP
        || !(transition.rampUpSeconds > 0)
        || !(transition.rampDownSeconds > 0))
    {
        throw new Error(
            `${ownerLabel} has unsupported Game Parameter filtering`,
        );
    }
    return {
        type: "filtering-over-time",
        rampUpSeconds: transition.rampUpSeconds,
        rampDownSeconds: transition.rampDownSeconds,
    };
}

function ParseDynamicParametricEq(ownerLabel, slot, effect, names)
{
    if (Number(effect.bankVersion) !== 150
        || effect.media?.length
        || !effect.rtpcs?.length
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length)
    {
        throw new Error(
            `Wwise Parametric EQ ${effect.id} on ${ownerLabel} has unsupported controls`,
        );
    }
    const parsed = parseStaticParametricEqBytes(effect.parameterBlock, {
        effectId: effect.id,
        slotIndex: slot.index,
        label: `Wwise Parametric EQ ${effect.id} on ${ownerLabel}`,
        allowIndependentLfe: true,
    });
    // The numeric plug-in parameter ID is empirically pinned to the exact EVE
    // v150 corpus. It is not treated as a universal Audiokinetic enum.
    const definitions = new Map([
        [ 2, {
            bandIndex: 0,
            property: "frequencyHz",
            accumulation: WWISE_EXCLUSIVE_ACCUMULATION,
            scalings: new Set([ 3 ]),
        } ],
    ]);
    const enabledBands = new Set(parsed.bands.map(band => band.index));
    const targets = new Set();
    const rtpcCurves = effect.rtpcs.map(rtpc =>
    {
        const definition = definitions.get(Number(rtpc.parameterId));
        const controlID = Number(rtpc.controlId) >>> 0;
        const parameter = names.parameters.get(controlID);
        const target = definition
            ? `${definition.bandIndex}:${definition.property}`
            : "";

        if (Number(rtpc.controlType) !== 0
            || !definition
            || Number(rtpc.accumulation) !== definition.accumulation
            || !definition.scalings.has(Number(rtpc.scaling))
            || !enabledBands.has(definition.bandIndex)
            || targets.has(target)
            || !parameter
            || !rtpc.points?.length)
        {
            throw new Error(
                `Wwise Parametric EQ ${effect.id} on ${ownerLabel} has unsupported RTPC ${rtpc.curveId}`,
            );
        }
        targets.add(target);
        const defaultValue = names.parameterDefaults.get(controlID);
        const controlTransition = ProjectSourceEffectControlTransition(
            names,
            controlID,
            `Wwise Parametric EQ ${effect.id} on ${ownerLabel}`,
        );

        return {
            rtpc: parameter,
            scope: "object",
            bandIndex: definition.bandIndex,
            property: definition.property,
            accumulation: definition.accumulation
                === SFX_ADDITIVE_ACCUMULATION
                ? "additive"
                : "exclusive",
            scaling: Number(rtpc.scaling),
            ...(defaultValue === undefined ? {} : { defaultValue }),
            ...(controlTransition === undefined
                ? {}
                : { controlTransition }),
            points: rtpc.points.map(point => ({
                x: Number(point.from),
                value: Number(point.to),
                interpolation: Number(point.interpolation),
            })),
        };
    });

    return { ...parsed, rtpcCurves };
}

function ParseStaticWwiseDelay(ownerLabel, slot, effect)
{
    if (effect.media?.length
        || effect.rtpcs?.length
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length)
    {
        throw new Error(
            `Wwise Delay ${effect.id} on ${ownerLabel} is not static`,
        );
    }
    return parseStaticWwiseDelayBytes(effect.parameterBlock, {
        effectId: effect.id,
        slotIndex: slot.index,
        label: `Wwise Delay ${effect.id} on ${ownerLabel}`,
    });
}

function ParseStaticWwiseCompressor(ownerLabel, slot, effect)
{
    if (effect.media?.length
        || effect.rtpcs?.length
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length)
    {
        throw new Error(
            `Wwise Compressor ${effect.id} on ${ownerLabel} is not static`,
        );
    }
    const approximation = parseGraphSharedBusEffect(
        CjsAudioLibraryBuilderUtils.createPortableEffect(effect),
        effect.id,
        slot.index,
        { wwiseDynamics: "approximate-web-audio" },
    );

    // Keep host policy out of the portable library. The base record proves
    // that the explicit browser approximation could realize this complete
    // source chain; strict runtimes still omit the chain and play dry.
    return { ...approximation, type: "compressor" };
}

function ParseStaticWwisePeakLimiter(ownerLabel, slot, effect)
{
    if (effect.media?.length
        || effect.rtpcs?.length
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length)
    {
        throw new Error(
            `Wwise Peak Limiter ${effect.id} on ${ownerLabel} is not static`,
        );
    }
    const approximation = parseGraphSharedBusEffect(
        CjsAudioLibraryBuilderUtils.createPortableEffect(effect),
        effect.id,
        slot.index,
        { wwiseDynamics: "approximate-web-audio" },
    );

    return { ...approximation, type: "peak-limiter" };
}

function ParseStaticWwiseFlanger(ownerLabel, slot, effect)
{
    if (effect.media?.length
        || effect.rtpcs?.length
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length)
    {
        throw new Error(
            `Wwise Flanger ${effect.id} on ${ownerLabel} is not static`,
        );
    }
    return parseStaticWwiseFlangerBytes(effect.parameterBlock, {
        effectId: effect.id,
        slotIndex: slot.index,
        label: `Wwise Flanger ${effect.id} on ${ownerLabel}`,
    });
}

function ParseDynamicWwiseFlanger(ownerLabel, slot, effect, names)
{
    if (Number(effect.bankVersion) !== 150
        || effect.media?.length
        || effect.rtpcs?.length !== 1
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length !== 1)
    {
        throw new Error(
            `Wwise Flanger ${effect.id} on ${ownerLabel} has unsupported controls`,
        );
    }
    const parsed = parseStaticWwiseFlangerBytes(effect.parameterBlock, {
        effectId: effect.id,
        slotIndex: slot.index,
        label: `Wwise Flanger ${effect.id} on ${ownerLabel}`,
    });
    const rtpc = effect.rtpcs[0];
    const property = effect.propertyValues[0];
    const controlID = Number(rtpc.controlId) >>> 0;
    const parameter = names.parameters.get(controlID);
    const defaultValue = names.parameterDefaults.get(controlID);
    const transition = names.parameterTransitions.get(controlID);
    const builtInParameter = names.parameterBuiltIns.get(controlID);

    // ParamID/property ID 1 is corpus-pinned to Wet/Dry Mix for these exact
    // EVE-v150 Flangers. The STMG binding, rather than a controlType-4
    // Modulator, makes ship_Distance a voice-local built-in distance source.
    if (parameter !== "ship_Distance"
        || defaultValue !== 0
        || transition?.rampType !== 0
        || transition.rampUpSeconds !== 0
        || transition.rampDownSeconds !== 0
        || builtInParameter !== 1
        || Number(rtpc.controlType) !== 0
        || Number(rtpc.parameterId) !== 1
        || Number(rtpc.accumulation) !== SFX_ADDITIVE_ACCUMULATION
        || Number(rtpc.scaling) !== 0
        || !rtpc.points?.length
        || Number(property.propertyId) !== 1
        || Number(property.accumulation) !== SFX_ADDITIVE_ACCUMULATION
        || Number(property.value) !== parsed.wetDryMixPercent)
    {
        throw new Error(
            `Wwise Flanger ${effect.id} on ${ownerLabel} has unsupported distance control`,
        );
    }
    let previous = -Infinity;
    const points = rtpc.points.map((point, index) =>
    {
        const x = Number(point.from);
        const value = Number(point.to);
        const interpolation = Number(point.interpolation);

        if (!Number.isFinite(x)
            || !Number.isFinite(value)
            || x < previous
            || !Number.isSafeInteger(interpolation)
            || interpolation < 0
            || interpolation > 9)
        {
            throw new Error(
                `Wwise Flanger ${effect.id} on ${ownerLabel} has invalid distance point ${index}`,
            );
        }
        previous = x;
        return { x, value, interpolation };
    });

    return {
        ...parsed,
        wetDryMixRtpcCurve: {
            rtpc: parameter,
            scope: "object",
            controlSource: "built-in-distance",
            property: "wetDryMixPercent",
            accumulation: "additive",
            scaling: 0,
            defaultValue,
            points,
        },
    };
}

function ParseStaticWwiseTremolo(ownerLabel, slot, effect)
{
    if (effect.media?.length
        || effect.rtpcs?.length
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length)
    {
        throw new Error(
            `Wwise Tremolo ${effect.id} on ${ownerLabel} is not static`,
        );
    }
    return parseStaticWwiseTremoloBytes(effect.parameterBlock, {
        effectId: effect.id,
        slotIndex: slot.index,
        label: `Wwise Tremolo ${effect.id} on ${ownerLabel}`,
        bankVersion: effect.bankVersion,
    });
}

function ParseDynamicWwiseTremolo(ownerLabel, slot, effect, names)
{
    if (Number(effect.bankVersion) !== 150
        || effect.media?.length
        || (effect.rtpcs?.length !== 1 && effect.rtpcs?.length !== 2)
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length !== 1)
    {
        throw new Error(
            `Wwise Tremolo ${effect.id} on ${ownerLabel} has unsupported controls`,
        );
    }
    const parsed = parseStaticWwiseTremoloBytes(effect.parameterBlock, {
        effectId: effect.id,
        slotIndex: slot.index,
        label: `Wwise Tremolo ${effect.id} on ${ownerLabel}`,
        bankVersion: effect.bankVersion,
    });
    const property = effect.propertyValues[0];
    const controlIds = new Set(effect.rtpcs.map(rtpc =>
        Number(rtpc.controlId) >>> 0));
    const controlID = [ ...controlIds ][0];
    const parameter = names.parameters.get(controlID);
    const transition = names.parameterTransitions.get(controlID);
    const defaultValue = names.parameterDefaults.get(controlID);
    const singleDepthControl = effect.rtpcs.length === 1;
    const targets = new Map([
        [ 1, {
            property: "modulationDepthPercent",
            accumulation: SFX_ADDITIVE_ACCUMULATION,
            scaling: 0,
        } ],
        [ 2, {
            property: "modulationFrequencyHz",
            accumulation: WWISE_EXCLUSIVE_ACCUMULATION,
            scaling: 3,
        } ],
    ]);

    // ParamIDs 1 and 2 are empirically pinned to Depth and Frequency in the
    // exact EVE-v150 corpus. They are not universal Audiokinetic plug-in enums.
    if (controlIds.size !== 1
        || parameter !== "booster_intensity"
        || defaultValue !== 0
        || transition?.rampType !== WWISE_FILTERING_OVER_TIME_RAMP
        || transition.rampUpSeconds !== 2
        || transition.rampDownSeconds !== 2
        || parsed.waveform !== "sine"
        || (singleDepthControl
            && !IsExactSingleDepthWwiseTremolo(
                parsed,
                effect.parameterBlock,
            ))
        || Number(property.propertyId) !== 1
        || Number(property.accumulation) !== SFX_ADDITIVE_ACCUMULATION
        || Number(property.value) !== parsed.modulationDepthPercent)
    {
        throw new Error(
            `Wwise Tremolo ${effect.id} on ${ownerLabel} has unsupported filtered control`,
        );
    }
    const seen = new Set();
    const rtpcCurves = effect.rtpcs.map(rtpc =>
    {
        const target = targets.get(Number(rtpc.parameterId));

        if (!target
            || seen.has(target.property)
            || Number(rtpc.controlType) !== 0
            || Number(rtpc.accumulation) !== target.accumulation
            || Number(rtpc.scaling) !== target.scaling
            || !rtpc.points?.length)
        {
            throw new Error(
                `Wwise Tremolo ${effect.id} on ${ownerLabel} has unsupported RTPC`,
            );
        }
        seen.add(target.property);
        return {
            rtpc: parameter,
            scope: "object",
            property: target.property,
            accumulation: target.accumulation
                === SFX_ADDITIVE_ACCUMULATION
                ? "additive"
                : "exclusive",
            scaling: target.scaling,
            ...(defaultValue === undefined ? {} : { defaultValue }),
            controlTransition: {
                type: "filtering-over-time",
                rampUpSeconds: transition.rampUpSeconds,
                rampDownSeconds: transition.rampDownSeconds,
            },
            points: rtpc.points.map(point => ({
                x: Number(point.from),
                value: Number(point.to),
                interpolation: Number(point.interpolation),
            })),
        };
    });

    if (!seen.has("modulationDepthPercent")
        || (!singleDepthControl
            && !seen.has("modulationFrequencyHz")))
    {
        throw new Error(
            `Wwise Tremolo ${effect.id} on ${ownerLabel} is missing an RTPC target`,
        );
    }
    return { ...parsed, rtpcCurves };
}

/** Identifies the one exact EVE-v150 single-Depth filtered Tremolo preset. */
function IsExactSingleDepthWwiseTremolo(parsed, bytes)
{
    const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
    );

    return parsed.modulationDepthPercent === Math.fround(72.6)
        && parsed.modulationFrequencyHz === Math.fround(0.24)
        && view.getFloat32(12, true) === 35
        && view.getFloat32(16, true) === 50
        && parsed.phaseOffsetDegrees === 53
        && parsed.phaseMode === "random"
        && parsed.phaseSpreadDegrees === 55
        && parsed.outputGainDb === 0
        && parsed.processCenter
        && parsed.processLfe;
}

function ParseStaticWwiseGuitarDistortion(ownerLabel, slot, effect)
{
    if (effect.media?.length
        || effect.rtpcs?.length
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length)
    {
        throw new Error(
            `Wwise Guitar Distortion ${effect.id} on ${ownerLabel} is not static`,
        );
    }
    return parseStaticWwiseGuitarDistortionBytes(effect.parameterBlock, {
        effectId: effect.id,
        slotIndex: slot.index,
        label: `Wwise Guitar Distortion ${effect.id} on ${ownerLabel}`,
        bankVersion: effect.bankVersion,
    });
}

function ParseDynamicWwiseGuitarDistortion(ownerLabel, slot, effect, names)
{
    if (Number(effect.bankVersion) !== 150
        || effect.media?.length
        || effect.rtpcs?.length !== 1
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length !== 1)
    {
        throw new Error(
            `Wwise Guitar Distortion ${effect.id} on ${ownerLabel} has unsupported controls`,
        );
    }
    const parsed = parseStaticWwiseGuitarDistortionBytes(
        effect.parameterBlock,
        {
            effectId: effect.id,
            slotIndex: slot.index,
            label: `Wwise Guitar Distortion ${effect.id} on ${ownerLabel}`,
            bankVersion: effect.bankVersion,
        },
    );
    const rtpc = effect.rtpcs[0];
    const property = effect.propertyValues[0];
    const controlID = Number(rtpc.controlId) >>> 0;
    const parameter = names.parameters.get(controlID);

    // ParamID 61 is empirically pinned to Drive in the exact EVE-v150 corpus.
    // It is not treated as a universal Audiokinetic plug-in enum.
    if (Number(rtpc.controlType) !== 0
        || Number(rtpc.parameterId) !== 61
        || Number(rtpc.accumulation) !== SFX_ADDITIVE_ACCUMULATION
        || Number(rtpc.scaling) !== 0
        || Number(property.propertyId) !== 61
        || Number(property.accumulation) !== SFX_ADDITIVE_ACCUMULATION
        || Number(property.value) !== parsed.drivePercent
        || !parameter
        || !rtpc.points?.length)
    {
        throw new Error(
            `Wwise Guitar Distortion ${effect.id} on ${ownerLabel} has unsupported Drive RTPC`,
        );
    }
    const defaultValue = names.parameterDefaults.get(controlID);
    const controlTransition = ProjectSourceEffectControlTransition(
        names,
        controlID,
        `Wwise Guitar Distortion ${effect.id} on ${ownerLabel}`,
    );

    return {
        ...parsed,
        driveRtpcCurve: {
            rtpc: parameter,
            scope: "object",
            accumulation: "additive",
            scaling: 0,
            ...(defaultValue === undefined ? {} : { defaultValue }),
            ...(controlTransition === undefined
                ? {}
                : { controlTransition }),
            points: rtpc.points.map(point => ({
                x: Number(point.from),
                value: Number(point.to),
                interpolation: Number(point.interpolation),
            })),
        },
    };
}

function ParseStaticWwiseMeter(ownerLabel, slot, effect)
{
    if (effect.media?.length
        || effect.rtpcs?.length
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length)
    {
        throw new Error(
            `Wwise Meter ${effect.id} on ${ownerLabel} is not static`,
        );
    }
    return parseStaticWwiseMeterBytes(effect.parameterBlock, {
        effectId: effect.id,
        slotIndex: slot.index,
        label: `Wwise Meter ${effect.id} on ${ownerLabel}`,
        bankVersion: effect.bankVersion,
    });
}

function ParseStaticWwiseMatrixReverb(ownerLabel, slot, effect)
{
    if (effect.media?.length
        || effect.rtpcs?.length
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length)
    {
        throw new Error(
            `Wwise Matrix Reverb ${effect.id} on ${ownerLabel} is not static`,
        );
    }
    return parseStaticWwiseMatrixReverbBytes(effect.parameterBlock, {
        effectId: effect.id,
        slotIndex: slot.index,
        label: `Wwise Matrix Reverb ${effect.id} on ${ownerLabel}`,
        bankVersion: effect.bankVersion,
    });
}

function ParseStaticWwiseRoomVerb(ownerLabel, slot, effect)
{
    if (effect.media?.length
        || effect.rtpcs?.length
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length)
    {
        throw new Error(
            `Wwise RoomVerb ${effect.id} on ${ownerLabel} is not static`,
        );
    }
    return parseStaticWwiseRoomVerbBytes(effect.parameterBlock, {
        effectId: effect.id,
        slotIndex: slot.index,
        label: `Wwise RoomVerb ${effect.id} on ${ownerLabel}`,
        bankVersion: effect.bankVersion,
    });
}

/**
 * Reads the exact static v150 Wwise Silence source shape used by EVE. The
 * Sound's source ID references a CAkFxCustom object; its empty inline source
 * block is not permission to substitute the plug-in's default duration.
 */
function ParseStaticWwiseSilenceDuration(effects, source, rawId)
{
    const soundId = Number(rawId) >>> 0;
    const effect = effects?.get(Number(source.sourceId) >>> 0);

    if (!effect
        || effect.type !== "effect-custom"
        || effect.pluginId !== WWISE_SILENCE_SOURCE_PLUGIN_ID
        || effect.pluginId !== source.pluginId
        || effect.media?.length
        || effect.rtpcs?.length
        || effect.state?.properties?.length
        || effect.state?.groups?.length
        || effect.propertyValues?.length)
    {
        throw new Error(`unsupported Wwise Silence source ${soundId}`);
    }
    const bytes = effect.parameterBlock;

    if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 12)
    {
        throw new Error(
            `Wwise Silence source ${soundId} requires 12 static parameter bytes`,
        );
    }
    const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
    );
    const durationSeconds = view.getFloat32(0, true);
    const randomizedMinus = view.getFloat32(4, true);
    const randomizedPlus = view.getFloat32(8, true);

    if (!Number.isFinite(durationSeconds)
        || durationSeconds <= 0
        || randomizedMinus !== 0
        || randomizedPlus !== 0)
    {
        throw new Error(
            `Wwise Silence source ${soundId} is not a static positive duration`,
        );
    }
    return durationSeconds * 1000;
}

/**
 * Projects the first complete supported static override in a Sound's NodeBase
 * ancestry. Wwise's FX override replaces the inherited list, so an explicit
 * empty override clears the chain. Except for the exact admitted EVE-v150 EQ
 * frequency and Guitar Distortion Drive RTPCs, dynamic controls, unsupported
 * plug-ins, and unsafe independent LFE routing keep the documented dry
 * approximation. Static source EQ may retain `processLfe:false`; decoded
 * multichannel voices reject the complete chain at realization time.
 * Wwise Harmonizer is one such unsupported plug-in: Web Audio has no
 * duration-preserving pitch shifter, and `playbackRate` would change the
 * source duration, so a chain containing it stays dry.
 */
function CreateSfxSoundEffectProjection(ancestry, effects, names, rawId)
{
    const soundId = Number(rawId) >>> 0;
    let ownerId = 0;
    let fx = null;

    for (const { id: currentId, nodeBase, parentId } of ancestry
        .Trace(soundId).entries)
    {
        const candidate = nodeBase.fx;

        if (!candidate
            || (candidate.overrideParentRaw !== 0
                && candidate.overrideParentRaw !== 1)
            || (candidate.bypassAllRaw !== 0
                && candidate.bypassAllRaw !== 1)
            || candidate.bypassAll)
        {
            return {};
        }
        if (candidate.overrideParentRaw === 1 || parentId === 0)
        {
            ownerId = currentId;
            fx = candidate;
            break;
        }
    }
    if (!fx) return {};
    const slots = [ ...(fx.slots ?? []) ]
        .sort((left, right) => left.index - right.index);
    const seen = new Set();
    const chain = [];

    try
    {
        for (const slot of slots)
        {
            const slotIndex = Number(slot.index);
            const flags = Number(slot.flags);

            if (!Number.isSafeInteger(slotIndex)
                || slotIndex < 0
                || slotIndex > 3
                || seen.has(slotIndex)
                || !Number.isSafeInteger(flags)
                || (flags & ~0x07) !== 0)
            {
                return {};
            }
            seen.add(slotIndex);
            if (slot.bypass || slot.rendered) continue;
            const effect = effects?.get(slot.fxId);

            if (!effect
                || slot.shareSet !== (effect.type === "effect-share-set"))
            {
                return {};
            }
            if (effect.pluginId === PARAMETRIC_EQ_PLUGIN_ID)
            {
                const ownerLabel = `NodeBase ${ownerId} inherited by Sound ${soundId}`;

                chain.push(effect.rtpcs?.length
                    ? ParseDynamicParametricEq(
                        ownerLabel,
                        slot,
                        effect,
                        names,
                    )
                    : CjsAudioLibraryBuilderUtils.parseStaticParametricEq(
                        ownerLabel,
                        slot,
                        effect,
                        { allowIndependentLfe: true },
                    ));
            }
            else if (effect.pluginId === WWISE_DELAY_PLUGIN_ID)
            {
                chain.push(ParseStaticWwiseDelay(
                    `NodeBase ${ownerId} inherited by Sound ${soundId}`,
                    slot,
                    effect,
                ));
            }
            else if (effect.pluginId === WWISE_COMPRESSOR_PLUGIN_ID)
            {
                chain.push(ParseStaticWwiseCompressor(
                    `NodeBase ${ownerId} inherited by Sound ${soundId}`,
                    slot,
                    effect,
                ));
            }
            else if (effect.pluginId === WWISE_PEAK_LIMITER_PLUGIN_ID)
            {
                chain.push(ParseStaticWwisePeakLimiter(
                    `NodeBase ${ownerId} inherited by Sound ${soundId}`,
                    slot,
                    effect,
                ));
            }
            else if (effect.pluginId === WWISE_FLANGER_PLUGIN_ID)
            {
                const ownerLabel = `NodeBase ${ownerId} inherited by Sound ${soundId}`;

                chain.push(effect.rtpcs?.length
                    ? ParseDynamicWwiseFlanger(
                        ownerLabel,
                        slot,
                        effect,
                        names,
                    )
                    : ParseStaticWwiseFlanger(
                        ownerLabel,
                        slot,
                        effect,
                    ));
            }
            else if (effect.pluginId === WWISE_TREMOLO_PLUGIN_ID)
            {
                const ownerLabel = `NodeBase ${ownerId} inherited by Sound ${soundId}`;

                chain.push(effect.rtpcs?.length
                    ? ParseDynamicWwiseTremolo(
                        ownerLabel,
                        slot,
                        effect,
                        names,
                    )
                    : ParseStaticWwiseTremolo(
                        ownerLabel,
                        slot,
                        effect,
                    ));
            }
            else if (effect.pluginId === WWISE_GUITAR_DISTORTION_PLUGIN_ID)
            {
                const ownerLabel = `NodeBase ${ownerId} inherited by Sound ${soundId}`;

                chain.push(effect.rtpcs?.length
                    ? ParseDynamicWwiseGuitarDistortion(
                        ownerLabel,
                        slot,
                        effect,
                        names,
                    )
                    : ParseStaticWwiseGuitarDistortion(
                        ownerLabel,
                        slot,
                        effect,
                    ));
            }
            else if (effect.pluginId === WWISE_MATRIX_REVERB_PLUGIN_ID)
            {
                chain.push(ParseStaticWwiseMatrixReverb(
                    `NodeBase ${ownerId} inherited by Sound ${soundId}`,
                    slot,
                    effect,
                ));
            }
            else if (effect.pluginId === WWISE_ROOMVERB_PLUGIN_ID)
            {
                chain.push(ParseStaticWwiseRoomVerb(
                    `NodeBase ${ownerId} inherited by Sound ${soundId}`,
                    slot,
                    effect,
                ));
            }
            else if (effect.pluginId === WWISE_METER_PLUGIN_ID)
            {
                chain.push(ParseStaticWwiseMeter(
                    `NodeBase ${ownerId} inherited by Sound ${soundId}`,
                    slot,
                    effect,
                ));
            }
            else
            {
                return {};
            }
        }
    }
    catch
    {
        return {};
    }
    return chain.length ? { sourceEffects: chain } : {};
}

// Wwise's complete voice arbiter combines hierarchy, bus, project, priority,
// and virtual-voice policy. Project only the one EVE Sound shape whose local
// reject-newest result remains determinate after resolving those authored
// ancestors. Everything broader stays absent from the portable graph.
function CreateSfxSoundVoiceLimitProjection(ancestry, rawID, buses)
{
    const id = Number(rawID) >>> 0;
    const trace = ancestry.Trace(id);
    const nodeBase = trace.entries[0]?.nodeBase;
    const advanced = nodeBase?.advanced;

    if (!nodeBase
        || advanced?.flags !== 0x09
        || advanced.maxInstances !== 1
        || !(buses instanceof Map)
        || trace.terminal !== "root")
    {
        return {};
    }

    const chain = trace.entries.map(entry => entry.nodeBase);

    const virtualOwner = chain.find(value =>
        value.advanced?.overrideVirtualVoiceBehavior)
        ?? chain.at(-1);

    if (virtualOwner?.advanced?.belowThresholdBehavior !== 0)
    {
        return {};
    }

    const priorityPath = [];

    for (const current of chain)
    {
        priorityPath.push(current);
        if (current.priority?.overrideParent)
        {
            break;
        }
    }
    if (priorityPath.some(current =>
        (current.ranges ?? []).some(range =>
            Number(range.id) === WWISE_PRIORITY_PROPERTY)
        || (current.rtpcs ?? []).some(rtpc =>
            Number(rtpc.parameterId) === WWISE_PRIORITY_PROPERTY)
        || (current.state?.groups ?? []).some(group =>
            (group.states ?? []).some(state =>
                (state.values ?? []).some(value =>
                    Number(value.propertyId) === WWISE_PRIORITY_PROPERTY)))))
    {
        return {};
    }

    const routing = CjsAudioLibraryBuilderUtils.createSfxBusRouting(ancestry, id, buses);

    if (!routing?.busPathIds?.length
        || routing.busPathIds.some(rawBusID =>
        {
            const bus = buses.get(Number(rawBusID) >>> 0);

            return !bus
                || Number(bus.policy?.maxInstances) > 0
                || (bus.rtpcs ?? []).some(rtpc =>
                    Number(rtpc.parameterId)
                        === BUS_MAX_NUM_INSTANCES_RTPC_PROPERTY);
        }))
    {
        return {};
    }

    return {
        voiceLimit: {
            counterId: String(id),
            scope: "game-object",
            maxInstances: 1,
            behavior: "reject-newest",
        },
    };
}

function CreateSfxNodeBasePlaybackProjection(
    ancestry,
    playableNodes,
    rawID,
    names,
)
{
    const chain = [];
    const trace = ancestry.Trace(rawID);

    for (const { nodeBase, parentId } of trace.entries)
    {
        chain.push(nodeBase);

        if (!parentId || playableNodes.has(parentId))
        {
            break;
        }
    }

    let gainDb = 0;
    let pitchCents = 0;
    let lowPass = 0;
    let highPass = 0;
    let initialDelayMs = 0;
    const gainDbRanges = [];
    const pitchCentsRanges = [];
    const lowPassRanges = [];
    const highPassRanges = [];
    const initialDelayRangesMs = [];
    const rtpcCurves = [];
    const stateProperties = [];

    for (const nodeBase of chain.reverse())
    {
        for (const property of nodeBase.properties ?? [])
        {
            const value = Number(property.floatValue);

            if (!Number.isFinite(value))
            {
                continue;
            }
            if (property.id === SFX_VOLUME_PROPERTY)
            {
                gainDb += value;
            }
            else if (property.id === SFX_PITCH_PROPERTY)
            {
                pitchCents += value;
            }
            else if (property.id === SFX_LOW_PASS_PROPERTY)
            {
                lowPass += value;
            }
            else if (property.id === SFX_HIGH_PASS_PROPERTY)
            {
                highPass += value;
            }
            else if (property.id === SFX_INITIAL_DELAY_PROPERTY)
            {
                initialDelayMs += value * 1000;
            }
        }

        for (const range of nodeBase.ranges ?? [])
        {
            const min = Number(range.minFloat);
            const max = Number(range.maxFloat);

            if (!Number.isFinite(min) || !Number.isFinite(max))
            {
                continue;
            }

            if (range.id === SFX_VOLUME_PROPERTY)
            {
                gainDbRanges.push({ min, max });
            }
            else if (range.id === SFX_PITCH_PROPERTY)
            {
                pitchCentsRanges.push({ min, max });
            }
            else if (range.id === SFX_LOW_PASS_PROPERTY)
            {
                lowPassRanges.push({ min, max });
            }
            else if (range.id === SFX_HIGH_PASS_PROPERTY)
            {
                highPassRanges.push({ min, max });
            }
            else if (range.id === SFX_INITIAL_DELAY_PROPERTY)
            {
                initialDelayRangesMs.push({
                    min: min * 1000,
                    max: max * 1000,
                });
            }
        }

        for (const rtpc of nodeBase.rtpcs ?? [])
        {
            const curve = CjsAudioLibraryBuilderUtils.createSfxRtpcCurve(rtpc, names);

            if (curve)
            {
                rtpcCurves.push(curve);
            }
        }

        for (const group of nodeBase.state?.groups ?? [])
        {
            const activeStates = group.states?.filter(state =>
                state.values?.length) ?? [];

            if (!activeStates.length)
            {
                continue;
            }

            const namedGroup = names.groups.get(
                `state:${Number(group.groupId) >>> 0}`,
            );
            const definitions = new Map(
                (nodeBase.state?.properties ?? []).map(property => [
                    Number(property.propertyId),
                    property,
                ]),
            );
            const cases = {};

            if (group.syncType !== SFX_IMMEDIATE_STATE_SYNC
                || !namedGroup?.name)
            {
                throw new Error(
                    group.syncType !== SFX_IMMEDIATE_STATE_SYNC
                        ? `non-Immediate state group ${group.groupId}`
                        : `unnamed state group ${group.groupId}`,
                );
            }

            const supported = activeStates.every(state =>
                state.values.every(value =>
                    IsSupportedSfxStateValue(value, definitions)));

            if (!supported)
            {
                continue;
            }

            for (const state of activeStates)
            {
                const stateName = namedGroup.values.get(
                    Number(state.stateId) >>> 0,
                );
                let stateGainDb = 0;
                let statePitchCents = 0;
                let stateLowPass = 0;
                let stateHighPass = 0;

                if (!stateName)
                {
                    throw new Error(
                        `unnamed state value ${state.stateId}`,
                    );
                }

                for (const value of state.values)
                {
                    const propertyID = Number(value.propertyId);

                    if (propertyID === SFX_VOLUME_PROPERTY)
                    {
                        stateGainDb += Number(value.value);
                    }
                    else
                    {
                        if (propertyID === SFX_PITCH_PROPERTY)
                        {
                            statePitchCents += Number(value.value);
                        }
                        else if (propertyID === SFX_LOW_PASS_PROPERTY)
                        {
                            stateLowPass += Number(value.value);
                        }
                        else
                        {
                            stateHighPass += Number(value.value);
                        }
                    }
                }
                if (stateGainDb !== 0
                    || statePitchCents !== 0
                    || stateLowPass !== 0
                    || stateHighPass !== 0)
                {
                    cases[stateName] = {
                        ...(stateGainDb === 0 ? {} : {
                            gainDb: stateGainDb,
                        }),
                        ...(statePitchCents === 0 ? {} : {
                            pitchCents: statePitchCents,
                        }),
                        ...(stateLowPass === 0 ? {} : {
                            lowPass: stateLowPass,
                        }),
                        ...(stateHighPass === 0 ? {} : {
                            highPass: stateHighPass,
                        }),
                    };
                }
            }

            if (Object.keys(cases).length)
            {
                stateProperties.push({
                    group: namedGroup.name,
                    cases,
                });
            }
        }
    }

    return {
        ...(gainDb === 0 ? {} : { gainDb }),
        ...(gainDbRanges.length ? { gainDbRanges } : {}),
        ...(pitchCents === 0 ? {} : { pitchCents }),
        ...(pitchCentsRanges.length ? { pitchCentsRanges } : {}),
        ...(lowPass === 0 ? {} : { lowPass }),
        ...(lowPassRanges.length ? { lowPassRanges } : {}),
        ...(highPass === 0 ? {} : { highPass }),
        ...(highPassRanges.length ? { highPassRanges } : {}),
        ...(initialDelayMs === 0 ? {} : { initialDelayMs }),
        ...(initialDelayRangesMs.length
            ? { initialDelayRangesMs }
            : {}),
        ...(rtpcCurves.length ? { rtpcCurves } : {}),
        ...(stateProperties.length
            ? { stateProperties }
            : {}),
    };
}

function IsSupportedSfxStateValue(value, definitions)
{
    const propertyID = Number(value.propertyId);
    const definition = definitions.get(propertyID);
    const isFilter = propertyID === SFX_LOW_PASS_PROPERTY
        || propertyID === SFX_HIGH_PASS_PROPERTY;

    return Boolean(definition)
        && (propertyID === SFX_VOLUME_PROPERTY
            || propertyID === SFX_PITCH_PROPERTY
            || isFilter)
        && definition.accumulation === (
            isFilter
                ? SFX_FILTER_ACCUMULATION
                : SFX_ADDITIVE_ACCUMULATION
        );
}

CjsSchema.meta.define(CjsAudioLibraryBuilderSfxNodeLoweringSession, { className: "CjsAudioLibraryBuilderSfxNodeLoweringSession" });
