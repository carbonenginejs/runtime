import { CjsSchema } from "#schema";

// CarbonEngineJS original (no Carbon counterpart).
import { SFX_UNSUPPORTED_PLAY_ACTIONS, SFX_PLAY_ACTION, SFX_PLAY_EVENT_ACTION, SFX_STOP_ACTION_FAMILY, SFX_PAUSE_ACTION_FAMILY, SFX_RESUME_ACTION_FAMILY, CjsAudioLibraryBuilderUtils, SFX_SET_VOICE_PITCH_ACTION_FAMILY, SFX_RESET_VOICE_PITCH_ACTION_FAMILY, SFX_SET_VOICE_VOLUME_ACTION_FAMILY, SFX_RESET_VOICE_VOLUME_ACTION_FAMILY, SFX_SET_BUS_VOLUME_ACTION_FAMILY, SFX_RESET_BUS_VOLUME_ACTION_FAMILY, SFX_SET_VOICE_LOW_PASS_ACTION_FAMILY, SFX_RESET_VOICE_LOW_PASS_ACTION_FAMILY, SFX_SET_VOICE_HIGH_PASS_ACTION_FAMILY, SFX_RESET_VOICE_HIGH_PASS_ACTION_FAMILY, SFX_SET_GAME_PARAMETER_ACTION_FAMILY, SFX_RESET_GAME_PARAMETER_ACTION_FAMILY, SFX_SET_SWITCH_ACTION_FAMILY, SFX_SET_STATE_ACTION_FAMILY, SFX_BUS_VOLUME_ACTION_FORMS, SFX_VOICE_FILTER_ACTION_FORMS } from "./CjsAudioLibraryBuilderUtils.js";
import { CjsAudioLibraryBuilderWwiseNodeBaseAncestry } from "./CjsAudioLibraryBuilderWwiseNodeBaseAncestry.js";

/** Owns recursive SFX event lowering, publication, and diagnostics. */
export class CjsAudioLibraryBuilderSfxEventLoweringSession
{
    _activeEvents = new Set();

    _approximatedEvents = [];

    _buses = null;

    _eventNames = null;

    _events = {};

    _leavesByEvent = new Map();

    _loweredEvents = new Map();

    _musicNodeIds = null;

    _names = null;

    _nodeSession = null;

    _omittedEvents = [];

    _parsed = null;

    _programs = {};

    _stopTargetsByEvent = new Map();

    /** Creates one lowering session for a parsed Wwise SFX event graph. */
    constructor({
        parsed,
        buses,
        eventNames,
        musicNodeIds,
        names,
        nodeSession,
    })
    {
        this._parsed = parsed;
        this._buses = buses;
        this._eventNames = eventNames;
        this._musicNodeIds = musicNodeIds;
        this._names = names;
        this._nodeSession = nodeSession;
    }

    /** Lowers and publishes every named event in deterministic ID order. */
    LowerNamedEvents()
    {
        for (const [ eventID ] of [ ...this._parsed.events.entries() ]
            .sort(([ left ], [ right ]) => left - right))
        {
            const name = this._eventNames.get(eventID >>> 0);

            if (!name)
            {
                continue;
            }

            try
            {
                this._PublishNamedEvent(
                    eventID,
                    name,
                    this._LowerEvent(eventID),
                );
            }
            catch (error)
            {
                this._omittedEvents.push({
                    id: eventID,
                    name,
                    reason: error.message,
                });
            }
        }

        return {
            events: this._events,
            programs: this._programs,
            leavesByEvent: this._leavesByEvent,
            stopTargetsByEvent: this._stopTargetsByEvent,
            omittedEvents: this._omittedEvents,
            approximatedEvents: this._approximatedEvents,
        };
    }

    /** Lowers one event once, preserving authored action order. */
    _LowerEvent(rawID)
    {
        const eventID = Number(rawID) >>> 0;

        if (this._loweredEvents.has(eventID))
        {
            return this._loweredEvents.get(eventID);
        }
        if (this._activeEvents.has(eventID))
        {
            throw new Error(`Play-Event cycle at event ${eventID}`);
        }

        const event = this._parsed.events.get(eventID);

        if (!event)
        {
            throw new Error(`missing Play-Event target ${eventID}`);
        }

        const result = {
            roots: [],
            leaves: new Set(),
            stopTargets: new Set(),
            setters: [],
            program: [],
            unsupportedActions: [],
            approximatedActions: [],
        };

        this._activeEvents.add(eventID);

        try
        {
            this._ApplyAuthoredActions(event, result);
            this._FinalizeEvent(eventID, result);
            this._loweredEvents.set(eventID, result);
            return result;
        }
        finally
        {
            this._activeEvents.delete(eventID);
        }
    }

    /** Applies every authored event action to one plain working result. */
    _ApplyAuthoredActions(event, result)
    {
        for (const actionID of event.actionIds)
        {
            const action = this._parsed.actions.get(actionID);

            if (!action)
            {
                throw new Error(`missing action ${actionID}`);
            }
            if (SFX_UNSUPPORTED_PLAY_ACTIONS.has(action.actionType))
            {
                throw new Error(
                    `unsupported play action 0x${action.actionType.toString(16)}`,
                );
            }
            if (action.actionType === SFX_PLAY_ACTION)
            {
                this._ApplyPlay(result, event, actionID, action);
            }
            else if (action.actionType === SFX_PLAY_EVENT_ACTION)
            {
                this._ApplyPlayEvent(result, action);
            }
            else if ([
                SFX_STOP_ACTION_FAMILY,
                SFX_PAUSE_ACTION_FAMILY,
                SFX_RESUME_ACTION_FAMILY,
            ].includes((action.actionType >> 8) & 0xff))
            {
                const family = (action.actionType >> 8) & 0xff;
                const kind = family === SFX_STOP_ACTION_FAMILY
                    ? "stop"
                    : family === SFX_PAUSE_ACTION_FAMILY
                        ? "pause"
                        : "resume";
                const playbackControl = CjsAudioLibraryBuilderUtils.readSfxPlaybackControlAction(
                    action,
                    kind,
                );

                result.program.push(playbackControl);
                if (kind === "stop"
                    && playbackControl.mode === "element")
                {
                    result.stopTargets.add(
                        Number(playbackControl.targetId) >>> 0,
                    );
                }
            }
            else if (((action.actionType >> 8) & 0xff)
                === SFX_SET_VOICE_PITCH_ACTION_FAMILY
                || ((action.actionType >> 8) & 0xff)
                === SFX_RESET_VOICE_PITCH_ACTION_FAMILY)
            {
                const voicePitch = ReadSfxVoicePitchAction(
                    action,
                    this._parsed,
                );

                if (voicePitch)
                {
                    result.program.push(voicePitch);
                }
            }
            else if (((action.actionType >> 8) & 0xff)
                === SFX_SET_VOICE_VOLUME_ACTION_FAMILY
                || ((action.actionType >> 8) & 0xff)
                === SFX_RESET_VOICE_VOLUME_ACTION_FAMILY)
            {
                const voiceVolume = ReadSfxVoiceVolumeAction(
                    action,
                    this._parsed,
                    this._buses,
                );

                if (voiceVolume)
                {
                    result.program.push(voiceVolume);
                }
            }
            else if (((action.actionType >> 8) & 0xff)
                === SFX_SET_BUS_VOLUME_ACTION_FAMILY
                || ((action.actionType >> 8) & 0xff)
                === SFX_RESET_BUS_VOLUME_ACTION_FAMILY)
            {
                result.program.push(ReadSfxBusVolumeAction(action));
            }
            else if ([
                SFX_SET_VOICE_LOW_PASS_ACTION_FAMILY,
                SFX_RESET_VOICE_LOW_PASS_ACTION_FAMILY,
                SFX_SET_VOICE_HIGH_PASS_ACTION_FAMILY,
                SFX_RESET_VOICE_HIGH_PASS_ACTION_FAMILY,
            ].includes((action.actionType >> 8) & 0xff))
            {
                const voiceFilter = ReadSfxVoiceFilterAction(
                    action,
                    this._parsed,
                );

                if (voiceFilter)
                {
                    result.program.push(voiceFilter);
                }
            }
            else if (((action.actionType >> 8) & 0xff)
                === SFX_SET_GAME_PARAMETER_ACTION_FAMILY
                || ((action.actionType >> 8) & 0xff)
                === SFX_RESET_GAME_PARAMETER_ACTION_FAMILY)
            {
                result.program.push(
                    ReadSfxGameParameterAction(action, this._names),
                );
            }
            else if (((action.actionType >> 8) & 0xff)
                === SFX_SET_SWITCH_ACTION_FAMILY
                || ((action.actionType >> 8) & 0xff)
                === SFX_SET_STATE_ACTION_FAMILY)
            {
                const setter = ReadSfxSetterAction(action, this._names);

                result.setters.push(setter);
                result.program.push(setter);
            }
            else
            {
                result.unsupportedActions.push(action.actionType);
            }
        }
    }

    /** Applies one ordinary Play action or its bounded omission fallback. */
    _ApplyPlay(result, event, actionID, action)
    {
        if (this._musicNodeIds.has(Number(action.targetId) >>> 0))
        {
            return;
        }
        if (IsBoundedCrossfadeLayerSiblingFallback(
            this._parsed,
            event,
            actionID,
            action,
        ))
        {
            result.approximatedActions.push({
                actionId: Number(actionID) >>> 0,
                targetId: Number(action.targetId) >>> 0,
            });
            return;
        }

        const projection = this._nodeSession.Lower(action.targetId);
        const child = ReadSfxPlayActionChild(
            { nodeId: projection.nodeId },
            action,
            true,
        );

        result.roots.push(child);
        result.program.push({
            kind: "play",
            child,
        });
        CjsAudioLibraryBuilderUtils.addSet(result.leaves, projection.leaves);
    }

    /** Applies one recursive Play-Event action and merges its plain result. */
    _ApplyPlayEvent(result, action)
    {
        const nested = this._LowerEvent(action.targetId);
        const hasTiming = HasSfxPlayActionTiming(action, false);

        if (hasTiming
            && nested.program.some(value => value.kind !== "play"))
        {
            throw new Error(
                `scheduled Play-Event ${action.id} targets non-play actions`,
            );
        }
        const actionChild = ReadSfxPlayActionChild(
            nested.roots.length
                ? this._nodeSession.AggregateRoots(
                    nested.roots,
                    hasTiming,
                )
                : null,
            action,
            false,
        );

        if (actionChild)
        {
            result.roots.push(actionChild);
        }
        if (hasTiming)
        {
            if (actionChild)
            {
                result.program.push({
                    kind: "play",
                    child: actionChild,
                });
            }
        }
        else
        {
            result.program.push(...nested.program);
        }
        CjsAudioLibraryBuilderUtils.addSet(result.leaves, nested.leaves);
        CjsAudioLibraryBuilderUtils.addSet(result.stopTargets, nested.stopTargets);
        result.setters.push(...nested.setters);
        result.unsupportedActions.push(...nested.unsupportedActions);
        result.approximatedActions.push(...nested.approximatedActions);
    }

    /** Applies music-event filtering and derives the final Play roots. */
    _FinalizeEvent(eventID, result)
    {
        if (IsMusicEventName(this._eventNames.get(eventID)))
        {
            if (result.program.some(value =>
                value.kind === "set-bus-voice-volume"))
            {
                throw new Error(`music Bus Voice Volume event ${eventID}`);
            }
            result.program = result.program.filter(
                IsRetainedMusicSfxAction,
            );
            result.leaves.clear();
            result.stopTargets.clear();
            result.setters.length = 0;
            result.unsupportedActions.length = 0;
            result.approximatedActions.length = 0;
        }
        result.roots = result.program
            .filter(action => action.kind === "play")
            .map(action => action.child);
    }

    /** Publishes one successfully lowered named event and its diagnostics. */
    _PublishNamedEvent(eventID, name, result)
    {
        const {
            roots,
            leaves,
            stopTargets,
            program,
            unsupportedActions,
            approximatedActions,
        } = result;

        // Preserve the existing fail-open Stop relationship side effect when
        // later mixed-action validation rejects this named event.
        if (stopTargets.size)
        {
            this._stopTargetsByEvent.set(name, stopTargets);
        }

        const music = IsMusicEventName(name);
        const retainedProgram = music
            ? program.filter(IsRetainedMusicSfxAction)
            : program;
        const retainedUnsupportedActions = music
            ? []
            : unsupportedActions;

        if (!retainedProgram.length)
        {
            return;
        }
        if (retainedUnsupportedActions.length)
        {
            throw new Error(
                "mixed event actions "
                + retainedUnsupportedActions
                    .map(value => `0x${value.toString(16)}`)
                    .join(", "),
            );
        }
        if (roots.length && !music)
        {
            this._events[name] = roots;
            this._leavesByEvent.set(name, leaves);
        }
        this._programs[name] = retainedProgram;
        if (approximatedActions.length)
        {
            this._approximatedEvents.push({
                id: eventID,
                name,
                reason: "retained independent Play actions while omitting an unsupported Crossfade-to-Layer action",
                actions: approximatedActions,
            });
        }
    }
}

function HasSfxPlayActionTiming(action, includeFade)
{
    const details = action.action ?? action;

    return details.delayTimeMs !== undefined
        || details.delayRangeMs !== undefined
        || details.probability !== undefined
        || (includeFade
            && (details.transitionTimeMs !== undefined
                || details.transitionRangeMs !== undefined));
}

function IsPlainSfxPlayAction(action)
{
    const details = action?.action ?? action;

    return action?.actionType === SFX_PLAY_ACTION
        && details?.targetIsBus !== true
        && (details?.targetFlags ?? 0) === 0
        && !(details?.properties?.length)
        && !(details?.ranges?.length)
        && !HasSfxPlayActionTiming(action, true);
}

// EVE contains one invalid Wwise topology: an infinite, single-child
// amplitude Crossfade whose only child is a trackless Layer. Wwise does not
// support Blend children under Xfade. When that action has one wholly
// independent codec-Sound sibling, retain only the sibling rather than
// dropping the complete event or inventing multi-voice crossfade rules.
function IsBoundedCrossfadeLayerSiblingFallback(
    parsed,
    event,
    blockedActionID,
    action,
)
{
    if (event.actionIds.length !== 2 || !IsPlainSfxPlayAction(action))
    {
        return false;
    }

    const source = parsed.nodes.get(Number(action.targetId) >>> 0);
    const children = source?.children ?? [];
    const playlist = source?.playlist ?? [];
    const layer = children.length === 1
        ? parsed.nodes.get(Number(children[0]) >>> 0)
        : null;

    if (source?.type !== "random"
        || !source.continuous
        || !source.global
        || source.loopCount !== 0
        || source.loopModMin !== 0
        || source.loopModMax !== 0
        || source.transitionMode !== 1
        || source.transitionTime !== 7000
        || source.transitionTimeModMin !== 0
        || source.transitionTimeModMax !== 0
        || source.avoidRepeatCount !== 1
        || source.randomMode !== 0
        || source.usingWeight
        || !source.resetPlaylistEachPlay
        || children.length !== 1
        || playlist.length !== 1
        || (Number(playlist[0]?.playId) >>> 0)
            !== (Number(children[0]) >>> 0)
        || layer?.type !== "layer"
        || layer.continuousValidation
        || layer.layers.length
        || !layer.children.length
        || !layer.children.every(childID =>
        {
            const childID32 = Number(childID) >>> 0;
            const child = parsed.nodes.get(childID32);
            const childNodeBase = parsed.nodeBases?.get(childID32);

            return child?.type === "sound"
                && child.pluginType === 1
                && childNodeBase
                && childNodeBase.loopCount !== 0;
        }))
    {
        return false;
    }

    const siblingActionID = event.actionIds.find(candidateID =>
        (Number(candidateID) >>> 0)
            !== (Number(blockedActionID) >>> 0));
    const sibling = parsed.actions.get(Number(siblingActionID) >>> 0);
    const siblingSource = parsed.nodes.get(
        Number(sibling?.targetId) >>> 0,
    );
    const siblingNodeBase = parsed.nodeBases?.get(
        Number(sibling?.targetId) >>> 0,
    );

    return IsPlainSfxPlayAction(sibling)
        && siblingSource?.type === "sound"
        && siblingSource.pluginType === 1
        && siblingNodeBase
        && siblingNodeBase.loopCount !== 0
        && !layer.children.some(childID =>
            (Number(childID) >>> 0)
                === (Number(sibling.targetId) >>> 0));
}

function ReadSfxPlayActionChild(child, action, includeFade)
{
    if (!child)
    {
        return null;
    }

    const details = action.action ?? action;
    const result = { ...child };

    if (details.delayTimeMs !== undefined)
    {
        result.delayMs = Number(details.delayTimeMs);
    }
    if (details.delayRangeMs !== undefined)
    {
        result.delayRangeMs = {
            min: Number(details.delayRangeMs.min),
            max: Number(details.delayRangeMs.max),
        };
    }
    if (details.probability !== undefined)
    {
        result.probability = Number(details.probability);
    }
    if (includeFade
        && (details.transitionTimeMs !== undefined
            || details.transitionRangeMs !== undefined))
    {
        if (details.transitionTimeMs !== undefined)
        {
            result.fadeInMs = Number(details.transitionTimeMs);
        }
        if (details.transitionRangeMs !== undefined)
        {
            result.fadeInRangeMs = {
                min: Number(details.transitionRangeMs.min),
                max: Number(details.transitionRangeMs.max),
            };
        }
        result.fadeCurve = Number(details.fadeCurve ?? 4);
    }

    return result;
}

function ReadSfxVoiceVolumeAction(action, parsed, buses)
{
    const details = action.action;
    const actionType = Number(action.actionType) >>> 0;
    const family = (actionType >> 8) & 0xff;

    if (!details
        || (family !== SFX_SET_VOICE_VOLUME_ACTION_FAMILY
            && family !== SFX_RESET_VOICE_VOLUME_ACTION_FAMILY))
    {
        throw new Error(`untyped Voice Volume action ${action.id}`);
    }

    const targetId = Number(details.targetId) >>> 0;
    const targetFlags = Number(details.targetFlags ?? 0);

    if (details.actionMode !== "element"
        || (details.actionScope !== "game-object"
            && details.actionScope !== "global"))
    {
        throw new Error(
            `unsupported Voice Volume target mode ${action.id}`,
        );
    }
    if (!targetId)
    {
        throw new Error(
            `unresolved Voice Volume target ${targetId}`,
        );
    }
    const targetsBus = details.targetIsBus || (targetFlags & 0x01);

    if (targetsBus
        && (details.actionScope !== "game-object"
            || targetFlags !== 1
            || details.targetIsBus !== true
            || buses?.get(targetId)?.type !== "audio-bus"))
    {
        throw new Error(`unsupported bus Voice Volume action ${action.id}`);
    }
    if (!targetsBus && targetFlags !== 0)
    {
        throw new Error(
            `unsupported Voice Volume target flags ${targetFlags}`,
        );
    }
    if (!targetsBus && !parsed.nodeBases?.has(targetId))
    {
        return null;
    }

    const resetting = family === SFX_RESET_VOICE_VOLUME_ACTION_FAMILY;

    if (targetsBus
        && (resetting
            || details.valueMode !== "absolute"
            || Number(details.volumeRangeDb?.min ?? 0) !== 0
            || Number(details.volumeRangeDb?.max ?? 0) !== 0
            || details.delayRangeMs !== undefined
            || details.transitionRangeMs !== undefined
            || details.probability !== undefined
            || (details.exceptions?.length ?? 0) !== 0
            || !BusVoiceTargetIsOutputOnly(parsed, buses, targetId)))
    {
        throw new Error(`unsupported bus Voice Volume action ${action.id}`);
    }
    const result = {
        kind: targetsBus
            ? "set-bus-voice-volume"
            : resetting
                ? "reset-voice-volume"
                : "set-voice-volume",
        targetId: String(targetId),
        targetFlags,
        scope: details.actionScope,
        mode: "element",
        curve: Number(details.fadeCurve ?? 4),
    };

    if (!resetting)
    {
        if (details.valueMode !== "absolute"
            && details.valueMode !== "relative")
        {
            throw new Error(
                `unsupported Voice Volume value mode ${action.id}`,
            );
        }
        result.valueMode = details.valueMode;
        result.volumeDb = Number(details.volumeDb);
        result.volumeRangeDb = {
            min: Number(details.volumeRangeDb?.min ?? 0),
            max: Number(details.volumeRangeDb?.max ?? 0),
        };
    }

    if (details.delayTimeMs !== undefined)
    {
        result.delayMs = Number(details.delayTimeMs);
    }
    if (details.delayRangeMs !== undefined)
    {
        result.delayRangeMs = {
            min: Number(details.delayRangeMs.min),
            max: Number(details.delayRangeMs.max),
        };
    }
    if (details.transitionTimeMs !== undefined)
    {
        result.transitionMs = Number(details.transitionTimeMs);
    }
    if (details.transitionRangeMs !== undefined)
    {
        result.transitionRangeMs = {
            min: Number(details.transitionRangeMs.min),
            max: Number(details.transitionRangeMs.max),
        };
    }

    return result;
}

function BusVoiceTargetIsOutputOnly(parsed, buses, targetId)
{
    let used = false;
    const ancestry = new CjsAudioLibraryBuilderWwiseNodeBaseAncestry(
        id => parsed.nodeBases?.get(id),
    );

    for (const [ nodeId, node ] of parsed.nodes ?? [])
    {
        if (node.type !== "sound") continue;
        const path = CjsAudioLibraryBuilderUtils.createSfxBusRouting(
            ancestry,
            nodeId,
            buses,
        )?.busPathIds ?? [];

        if (!path.includes(String(targetId))) continue;
        used = true;
        if (path[0] !== String(targetId)) return false;
        const nodeAux = CjsAudioLibraryBuilderUtils.createEffectiveNodeAuxRouting(
            nodeId,
            ancestry,
        );

        if (nodeAux.userAuxSends?.length || nodeAux.reflectionsAuxSend)
        {
            return false;
        }
        for (const busId of path)
        {
            const aux = buses.get(Number(busId))?.aux;

            if (aux?.hasAux
                || aux?.auxIds?.some(id => Number(id) !== 0)
                || Number(aux?.reflectionsAuxBusId ?? 0) !== 0)
            {
                return false;
            }
        }
    }
    return used;
}

function ReadSfxVoicePitchAction(action, parsed)
{
    const details = action.action;
    const actionType = Number(action.actionType) >>> 0;
    const family = (actionType >> 8) & 0xff;

    if (!details
        || (family !== SFX_SET_VOICE_PITCH_ACTION_FAMILY
            && family !== SFX_RESET_VOICE_PITCH_ACTION_FAMILY))
    {
        throw new Error(`untyped Voice Pitch action ${action.id}`);
    }

    const targetId = Number(details.targetId) >>> 0;
    const targetFlags = Number(details.targetFlags ?? 0);

    if (details.actionMode !== "element"
        || (details.actionScope !== "game-object"
            && details.actionScope !== "global"))
    {
        throw new Error(
            `unsupported Voice Pitch target mode ${action.id}`,
        );
    }
    if (!targetId)
    {
        throw new Error(
            `unresolved Voice Pitch target ${targetId}`,
        );
    }
    if (details.targetIsBus || (targetFlags & 0x01))
    {
        throw new Error(`bus Voice Pitch action ${action.id}`);
    }
    if (targetFlags !== 0)
    {
        throw new Error(
            `unsupported Voice Pitch target flags ${targetFlags}`,
        );
    }
    if (!parsed.nodeBases?.has(targetId))
    {
        return null;
    }

    const resetting = family === SFX_RESET_VOICE_PITCH_ACTION_FAMILY;
    const result = {
        kind: resetting
            ? "reset-voice-pitch"
            : "set-voice-pitch",
        targetId: String(targetId),
        targetFlags,
        scope: details.actionScope,
        mode: "element",
        curve: Number(details.fadeCurve ?? 4),
    };

    if (!resetting)
    {
        if (details.valueMode !== "absolute"
            && details.valueMode !== "relative")
        {
            throw new Error(
                `unsupported Voice Pitch value mode ${action.id}`,
            );
        }
        result.valueMode = details.valueMode;
        result.pitchCents = Number(details.pitchCents);
        result.pitchRangeCents = {
            min: Number(details.pitchRangeCents?.min ?? 0),
            max: Number(details.pitchRangeCents?.max ?? 0),
        };
    }

    if (details.delayTimeMs !== undefined)
    {
        result.delayMs = Number(details.delayTimeMs);
    }
    if (details.delayRangeMs !== undefined)
    {
        result.delayRangeMs = {
            min: Number(details.delayRangeMs.min),
            max: Number(details.delayRangeMs.max),
        };
    }
    if (details.transitionTimeMs !== undefined)
    {
        result.transitionMs = Number(details.transitionTimeMs);
    }
    if (details.transitionRangeMs !== undefined)
    {
        result.transitionRangeMs = {
            min: Number(details.transitionRangeMs.min),
            max: Number(details.transitionRangeMs.max),
        };
    }

    return result;
}

function ReadSfxBusVolumeAction(action)
{
    const details = action.action;
    const actionType = Number(action.actionType) >>> 0;
    const form = SFX_BUS_VOLUME_ACTION_FORMS.get(actionType);
    const kind = form?.setting
        ? "set-bus-volume"
        : "reset-bus-volume";

    if (!details)
    {
        throw new Error(`untyped Bus Volume action ${action.id}`);
    }
    if (!form)
    {
        throw new Error(`unsupported Bus Volume alias ${action.id}`);
    }
    if (details.actionName !== kind)
    {
        throw new Error(`untyped Bus Volume action ${action.id}`);
    }
    if (details.actionType !== undefined
        && (Number(details.actionType) >>> 0) !== actionType)
    {
        throw new Error(`Bus Volume action type mismatch ${action.id}`);
    }
    if (details.actionScope !== form.scope
        || details.actionMode !== form.mode)
    {
        throw new Error(`Bus Volume scope/mode mismatch ${action.id}`);
    }
    if (details.probability !== undefined)
    {
        throw new Error(`probabilistic Bus Volume action ${action.id}`);
    }
    for (const field of [ "properties", "ranges" ])
    {
        if (details[field] === undefined)
        {
            continue;
        }
        const ids = Array.isArray(details[field])
            ? details[field].map(value => Number(value?.id))
            : null;

        if (!ids
            || ids.some(id => id !== 0x39 && id !== 0x3a)
            || new Set(ids).size !== ids.length)
        {
            throw new Error(`invalid Bus Volume ${field} ${action.id}`);
        }
    }
    if (!Array.isArray(details.exceptions))
    {
        throw new Error(`invalid Bus Volume exceptions ${action.id}`);
    }

    const targetId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
        details.targetId,
        `Bus Volume action ${action.id} targetId`,
    );
    const shallowTargetId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
        action.targetId,
        `Bus Volume action ${action.id} shallow targetId`,
    );
    const targetFlags = Number(details.targetFlags ?? 0);

    if (targetId !== shallowTargetId)
    {
        throw new Error(`Bus Volume target mismatch ${action.id}`);
    }
    if (form.mode === "element" ? !targetId : targetId !== 0)
    {
        throw new Error(`invalid Bus Volume target ${action.id}`);
    }
    if (details.targetIsBus !== true || targetFlags !== 1)
    {
        throw new Error(`invalid Bus Volume target flags ${action.id}`);
    }
    if (form.mode !== "all-except" && details.exceptions.length)
    {
        throw new Error(`unexpected Bus Volume exceptions ${action.id}`);
    }

    const exceptionIds = new Set();
    const exceptions = details.exceptions.map(exception =>
    {
        const exceptionId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
            exception.targetId,
            `Bus Volume action ${action.id} exception targetId`,
        );
        const exceptionFlags = Number(exception.targetFlags ?? 0);

        if (!exceptionId
            || exceptionIds.has(exceptionId)
            || exception.targetIsBus !== true
            || exceptionFlags !== 1)
        {
            throw new Error(`invalid Bus Volume exception ${action.id}`);
        }
        exceptionIds.add(exceptionId);
        return {
            targetId: String(exceptionId),
            targetFlags: exceptionFlags,
        };
    });
    const result = {
        kind,
        targetId: String(targetId),
        targetFlags,
        scope: form.scope,
        mode: form.mode,
        curve: Number(details.fadeCurve ?? 4),
        exceptions,
    };

    if (form.setting)
    {
        if (details.valueMode !== "absolute"
            && details.valueMode !== "relative")
        {
            throw new Error(
                `unsupported Bus Volume value mode ${action.id}`,
            );
        }
        result.valueMode = details.valueMode;
        result.busVolumeDb = Number(details.busVolumeDb);
        result.busVolumeRangeDb = {
            min: Number(details.busVolumeRangeDb?.min ?? 0),
            max: Number(details.busVolumeRangeDb?.max ?? 0),
        };
    }
    else if (details.valueMode !== undefined
        || details.busVolumeDb !== undefined
        || details.busVolumeRangeDb !== undefined)
    {
        throw new Error(`Bus Volume Reset carries a value ${action.id}`);
    }

    if (details.delayTimeMs !== undefined)
    {
        result.delayMs = Number(details.delayTimeMs);
    }
    if (details.delayRangeMs !== undefined)
    {
        result.delayRangeMs = {
            min: Number(details.delayRangeMs.min),
            max: Number(details.delayRangeMs.max),
        };
    }
    if (details.transitionTimeMs !== undefined)
    {
        result.transitionMs = Number(details.transitionTimeMs);
    }
    if (details.transitionRangeMs !== undefined)
    {
        result.transitionRangeMs = {
            min: Number(details.transitionRangeMs.min),
            max: Number(details.transitionRangeMs.max),
        };
    }
    return result;
}

function ReadSfxVoiceFilterAction(action, parsed)
{
    const details = action.action;
    const actionType = Number(action.actionType) >>> 0;
    const family = (actionType >> 8) & 0xff;
    const lowPass = family === SFX_SET_VOICE_LOW_PASS_ACTION_FAMILY
        || family === SFX_RESET_VOICE_LOW_PASS_ACTION_FAMILY;
    const setting = family === SFX_SET_VOICE_LOW_PASS_ACTION_FAMILY
        || family === SFX_SET_VOICE_HIGH_PASS_ACTION_FAMILY;
    const resetting = family === SFX_RESET_VOICE_LOW_PASS_ACTION_FAMILY
        || family === SFX_RESET_VOICE_HIGH_PASS_ACTION_FAMILY;
    const property = lowPass ? "lowPass" : "highPass";
    const rangeField = `${property}Range`;
    const kind = `${setting ? "set" : "reset"}-voice-${
        lowPass ? "low-pass" : "high-pass"
    }`;

    if (!details || (!setting && !resetting)
        || details.actionName !== kind)
    {
        throw new Error(`untyped Voice Filter action ${action.id}`);
    }
    const actionForm = SFX_VOICE_FILTER_ACTION_FORMS.get(
        actionType & 0xff,
    );

    if (!actionForm
        || (setting && actionForm.mode !== "element"))
    {
        throw new Error(`unsupported Voice Filter alias ${action.id}`);
    }
    if (details.actionType !== undefined
        && (Number(details.actionType) >>> 0) !== actionType)
    {
        throw new Error(`Voice Filter action type mismatch ${action.id}`);
    }
    const wrongProperty = lowPass ? "highPass" : "lowPass";

    if (details[wrongProperty] !== undefined
        || details[`${wrongProperty}Range`] !== undefined)
    {
        throw new Error(
            `Voice Filter action ${action.id} carries ${wrongProperty}`,
        );
    }
    if (details.probability !== undefined)
    {
        throw new Error(`probabilistic Voice Filter action ${action.id}`);
    }
    for (const field of [ "properties", "ranges" ])
    {
        if (details[field] === undefined)
        {
            continue;
        }
        const ids = Array.isArray(details[field])
            ? details[field].map(value => Number(value?.id))
            : null;

        if (!ids
            || ids.some(id => id !== 0x39 && id !== 0x3a)
            || new Set(ids).size !== ids.length)
        {
            throw new Error(
                `invalid Voice Filter ${field} ${action.id}`,
            );
        }
    }
    if (!Array.isArray(details.exceptions))
    {
        throw new Error(`invalid Voice Filter exceptions ${action.id}`);
    }

    const targetId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
        details.targetId,
        `Voice Filter action ${action.id} targetId`,
    );
    const shallowTargetId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
        action.targetId,
        `Voice Filter action ${action.id} shallow targetId`,
    );
    const targetFlags = Number(details.targetFlags ?? 0);
    const mode = details.actionMode;
    const scope = details.actionScope;
    const exceptions = details.exceptions;

    if (scope !== actionForm.scope || mode !== actionForm.mode)
    {
        throw new Error(`Voice Filter scope/mode mismatch ${action.id}`);
    }
    if (mode === "element" && !targetId)
    {
        throw new Error(`unresolved Voice Filter target ${action.id}`);
    }
    if (targetId !== shallowTargetId)
    {
        throw new Error(
            `Voice Filter target mismatch ${action.id}`,
        );
    }
    if (mode !== "element" && targetId !== 0)
    {
        throw new Error(
            `Voice Filter ${mode} target must be 0 ${action.id}`,
        );
    }
    if (details.targetIsBus || (targetFlags & 0x01))
    {
        throw new Error(`bus Voice Filter action ${action.id}`);
    }
    if (targetFlags !== 0)
    {
        throw new Error(
            `unsupported Voice Filter target flags ${targetFlags}`,
        );
    }
    if (mode !== "all-except" && exceptions.length)
    {
        throw new Error(
            `unexpected Voice Filter exceptions ${action.id}`,
        );
    }
    if (mode === "element" && !parsed.nodeBases?.has(targetId))
    {
        return null;
    }

    const exceptionIds = new Set();
    const normalizedExceptions = exceptions.map(exception =>
    {
        const exceptionFlags = Number(exception.targetFlags ?? 0);
        const exceptionId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
            exception.targetId,
            `Voice Filter action ${action.id} exception targetId`,
        );

        if (exception.targetIsBus || (exceptionFlags & 0x01)
            || exceptionFlags !== 0)
        {
            throw new Error(`bus Voice Filter exception ${action.id}`);
        }
        if (!exceptionId || exceptionIds.has(exceptionId))
        {
            throw new Error(
                `invalid Voice Filter exception ${action.id}`,
            );
        }
        exceptionIds.add(exceptionId);

        return {
            targetId: String(exceptionId),
            targetFlags: exceptionFlags,
        };
    });
    const result = {
        kind,
        targetId: String(targetId),
        targetFlags,
        scope,
        mode,
        curve: Number(details.fadeCurve ?? 4),
        exceptions: normalizedExceptions,
    };

    if (setting)
    {
        if (details.valueMode !== "absolute"
            && details.valueMode !== "relative")
        {
            throw new Error(
                `unsupported Voice Filter value mode ${action.id}`,
            );
        }
        result.valueMode = details.valueMode;
        result[property] = Number(details[property]);
        result[rangeField] = {
            min: Number(details[rangeField]?.min ?? 0),
            max: Number(details[rangeField]?.max ?? 0),
        };
    }
    else if (details.valueMode !== undefined
        || details.lowPass !== undefined
        || details.lowPassRange !== undefined
        || details.highPass !== undefined
        || details.highPassRange !== undefined)
    {
        throw new Error(`Voice Filter Reset carries a value ${action.id}`);
    }

    if (details.delayTimeMs !== undefined)
    {
        result.delayMs = Number(details.delayTimeMs);
    }
    if (details.delayRangeMs !== undefined)
    {
        result.delayRangeMs = {
            min: Number(details.delayRangeMs.min),
            max: Number(details.delayRangeMs.max),
        };
    }
    if (details.transitionTimeMs !== undefined)
    {
        result.transitionMs = Number(details.transitionTimeMs);
    }
    if (details.transitionRangeMs !== undefined)
    {
        result.transitionRangeMs = {
            min: Number(details.transitionRangeMs.min),
            max: Number(details.transitionRangeMs.max),
        };
    }

    return result;
}

function ReadSfxGameParameterAction(action, names)
{
    const details = action.action;
    const actionType = Number(action.actionType) >>> 0;
    const family = (actionType >> 8) & 0xff;
    const resetting = family === SFX_RESET_GAME_PARAMETER_ACTION_FAMILY;
    const expectedName = resetting
        ? "reset-game-parameter"
        : "set-game-parameter";

    if (!details
        || (family !== SFX_SET_GAME_PARAMETER_ACTION_FAMILY
            && family !== SFX_RESET_GAME_PARAMETER_ACTION_FAMILY)
        || details.actionName !== expectedName)
    {
        throw new Error(`untyped Game Parameter action ${action.id}`);
    }

    const targetId = Number(details.targetId) >>> 0;
    const targetFlags = Number(details.targetFlags ?? 0);

    if (details.actionMode !== "element"
        || (details.actionScope !== "game-object"
            && details.actionScope !== "global"))
    {
        throw new Error(
            `unsupported Game Parameter target mode ${action.id}`,
        );
    }
    if (!targetId
        || targetId !== (Number(action.targetId) >>> 0))
    {
        throw new Error(
            `unresolved Game Parameter target ${targetId}`,
        );
    }
    if (details.targetIsBus || targetFlags !== 0)
    {
        throw new Error(
            `unsupported Game Parameter target flags ${targetFlags}`,
        );
    }
    if (!Array.isArray(details.exceptions)
        || details.exceptions.length)
    {
        throw new Error(
            `unsupported Game Parameter exceptions ${action.id}`,
        );
    }
    if (!HasExactSfxGameParameterProperties(details.properties)
        || !HasExactSfxGameParameterProperties(details.ranges)
        || details.probability !== undefined)
    {
        throw new Error(
            `unsupported Game Parameter properties ${action.id}`,
        );
    }
    if (typeof details.bypassTransition !== "boolean")
    {
        throw new Error(
            `invalid Game Parameter bypass flag ${action.id}`,
        );
    }

    const rtpc = names.parameters.get(targetId);

    if (!rtpc)
    {
        throw new Error(`unnamed game parameter ${targetId}`);
    }

    const result = {
        kind: expectedName,
        rtpc,
        scope: details.actionScope,
        curve: Number(details.fadeCurve ?? 4),
        bypassTransition: details.bypassTransition,
    };
    const defaultValue = names.parameterDefaults.get(targetId);

    if (defaultValue === undefined)
    {
        throw new Error(
            `missing Game Parameter default ${targetId}`,
        );
    }
    else
    {
        result.defaultValue = defaultValue;
    }
    if (!resetting)
    {
        if (details.valueMode !== "absolute"
            && details.valueMode !== "relative")
        {
            throw new Error(
                `unsupported Game Parameter value mode ${action.id}`,
            );
        }
        const value = Number(details.gameParameterValue);
        const min = Number(details.gameParameterRange?.min);
        const max = Number(details.gameParameterRange?.max);

        if (!Number.isFinite(value)
            || !Number.isFinite(min)
            || !Number.isFinite(max)
            || min > max)
        {
            throw new Error(
                `invalid Game Parameter value ${action.id}`,
            );
        }
        result.valueMode = details.valueMode;
        result.gameParameterValue = value;
        result.gameParameterRange = { min, max };
    }
    else if (details.valueMode !== undefined
        || details.gameParameterValue !== undefined
        || details.gameParameterRange !== undefined)
    {
        throw new Error(
            `invalid Reset Game Parameter value ${action.id}`,
        );
    }
    for (const [ source, target ] of [
        [ "delayTimeMs", "delayMs" ],
        [ "transitionTimeMs", "transitionMs" ],
    ])
    {
        if (details[source] !== undefined)
        {
            result[target] = Number(details[source]);
        }
    }
    for (const [ source, target ] of [
        [ "delayRangeMs", "delayRangeMs" ],
        [ "transitionRangeMs", "transitionRangeMs" ],
    ])
    {
        if (details[source] !== undefined)
        {
            result[target] = {
                min: Number(details[source].min),
                max: Number(details[source].max),
            };
        }
    }

    return result;
}

function HasExactSfxGameParameterProperties(values)
{
    if (!Array.isArray(values))
    {
        return false;
    }
    const ids = values.map(value => Number(value?.id));

    return ids.every(id => id === 0x39 || id === 0x3a)
        && new Set(ids).size === ids.length;
}

function ReadSfxSetterAction(action, names)
{
    const family = (Number(action.actionType) >> 8) & 0xff;
    const scope = family === SFX_SET_SWITCH_ACTION_FAMILY
        ? "switch"
        : "state";
    const details = action.action ?? {};
    const { groupID, valueID } = CjsAudioLibraryBuilderUtils.readSetterActionIDs(
        details,
        action.payload,
        `${scope} setter action ${action.id}`,
    );
    const group = names.groups.get(`${scope}:${groupID}`);
    const value = group?.values.get(valueID);

    if (!group?.name)
    {
        throw new Error(`unnamed ${scope} group ${groupID}`);
    }
    if (!value)
    {
        throw new Error(`unnamed ${scope} value ${valueID}`);
    }

    const delayMs = CjsAudioLibraryBuilderUtils.readExactSetterDelay(details, {
        actionID: action.id,
        actionType: action.actionType,
        family,
        targetID: action.targetId ?? action.target,
        label: "setter action",
    });
    const result = {
        kind: scope,
        group: group.name,
        value,
    };

    if (delayMs !== undefined)
    {
        result.delayMs = delayMs;
    }
    return result;
}

function IsMusicEventName(name)
{
    return String(name).toLowerCase().startsWith("music_");
}

/** Cross-domain Wwise actions a music-named event must also send to SFX. */
function IsRetainedMusicSfxAction(action)
{
    return action.kind === "set-bus-volume"
        || action.kind === "reset-bus-volume"
        || ((action.kind === "pause" || action.kind === "resume")
            && action.scope === "game-object"
            && action.mode === "all"
            && action.targetId === "0"
            && Number(action.targetFlags) === 0
            && !action.exceptions?.length);
}

CjsSchema.meta.define(CjsAudioLibraryBuilderSfxEventLoweringSession, { className: "CjsAudioLibraryBuilderSfxEventLoweringSession" });
