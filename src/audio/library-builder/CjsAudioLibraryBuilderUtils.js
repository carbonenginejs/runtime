// CarbonEngineJS original (no Carbon counterpart).
import { parseStaticParametricEqBytes } from "../internal/busEffects.js";

export const SFX_PLAY_ACTION = 0x0403;

export const SFX_PLAY_EVENT_ACTION = 0x2103;

export const SFX_STOP_ACTION_FAMILY = 0x01;

export const SFX_PAUSE_ACTION_FAMILY = 0x02;

export const SFX_RESUME_ACTION_FAMILY = 0x03;

export const SFX_SET_VOICE_PITCH_ACTION_FAMILY = 0x08;

export const SFX_RESET_VOICE_PITCH_ACTION_FAMILY = 0x09;

export const SFX_SET_VOICE_VOLUME_ACTION_FAMILY = 0x0a;

export const SFX_RESET_VOICE_VOLUME_ACTION_FAMILY = 0x0b;

export const SFX_SET_BUS_VOLUME_ACTION_FAMILY = 0x0c;

export const SFX_RESET_BUS_VOLUME_ACTION_FAMILY = 0x0d;

export const SFX_SET_VOICE_LOW_PASS_ACTION_FAMILY = 0x0e;

export const SFX_RESET_VOICE_LOW_PASS_ACTION_FAMILY = 0x0f;

export const SFX_SET_STATE_ACTION_FAMILY = 0x12;

export const SFX_SET_GAME_PARAMETER_ACTION_FAMILY = 0x13;

export const SFX_RESET_GAME_PARAMETER_ACTION_FAMILY = 0x14;

export const SFX_SET_SWITCH_ACTION_FAMILY = 0x19;

export const SFX_SET_VOICE_HIGH_PASS_ACTION_FAMILY = 0x20;

export const SFX_RESET_VOICE_HIGH_PASS_ACTION_FAMILY = 0x30;

export const SFX_VOICE_FILTER_ACTION_FORMS = new Map([
    [ 0x02, { scope: "global", mode: "element" } ],
    [ 0x03, { scope: "game-object", mode: "element" } ],
    [ 0x04, { scope: "global", mode: "all" } ],
    [ 0x05, { scope: "game-object", mode: "all" } ],
    [ 0x08, { scope: "global", mode: "all-except" } ],
    [ 0x09, { scope: "game-object", mode: "all-except" } ],
]);

export const SFX_BUS_VOLUME_ACTION_FORMS = new Map([
    [ 0x0c02, { setting: true, scope: "global", mode: "element" } ],
    [ 0x0c03, { setting: true, scope: "game-object", mode: "element" } ],
    [ 0x0d02, { setting: false, scope: "global", mode: "element" } ],
    [ 0x0d03, { setting: false, scope: "game-object", mode: "element" } ],
    [ 0x0d04, { setting: false, scope: "global", mode: "all" } ],
    [ 0x0d08, { setting: false, scope: "global", mode: "all-except" } ],
]);

export const SFX_UNSUPPORTED_PLAY_ACTIONS = new Set([ 0x0503 ]);

export const SFX_VOLUME_PROPERTY = 0;

export const SFX_PITCH_PROPERTY = 1;

export const SFX_LOW_PASS_PROPERTY = 2;

export const SFX_HIGH_PASS_PROPERTY = 3;

export const BUS_VOLUME_RTPC_PROPERTY = 4;

// Wwise v150 AkPropID::MaxNumInstances. This is scheduling policy, not DSP.
export const BUS_MAX_NUM_INSTANCES_RTPC_PROPERTY = 53;

export const BUS_RTPC_PROPERTIES = new Map([
    [ SFX_VOLUME_PROPERTY, "voice-volume" ],
    [ BUS_VOLUME_RTPC_PROPERTY, "bus-volume" ],
]);

export const SFX_INITIAL_DELAY_PROPERTY = 34;

export const WWISE_PRIORITY_PROPERTY = 0x06;

export const WWISE_OUTPUT_BUS_VOLUME_PROPERTY = 0x0d;

export const WWISE_USER_AUX_VOLUME_PROPERTY = 0x08;

export const WWISE_USER_AUX_LOW_PASS_PROPERTY = 0x10;

export const WWISE_USER_AUX_HIGH_PASS_PROPERTY = 0x14;

export const WWISE_REFLECTIONS_VOLUME_PROPERTY = 0x1a;

export const WWISE_SILENCE_SOURCE_PLUGIN_ID = 0x00650002;

export const SFX_ADDITIVE_ACCUMULATION = 2;

export const WWISE_EXCLUSIVE_ACCUMULATION = 1;

export const WWISE_FILTERING_OVER_TIME_RAMP = 2;

export const SFX_FILTER_ACCUMULATION = 6;

export const SFX_IMMEDIATE_STATE_SYNC = 0;

/** Shared conversion and validation helpers for audio-library construction. */
export class CjsAudioLibraryBuilderUtils
{
    /** Validates and reads the authored delay for a scheduled setter action. */
    static readExactSetterDelay(details, {
        actionID,
        actionType,
        family,
        targetID,
        label,
    })
    {
        const properties = details.properties;
        const ranges = details.ranges;
        const delayDefined = details.delayTimeMs !== undefined;
        const expectedName = family === SFX_SET_SWITCH_ACTION_FAMILY
            ? "set-switch"
            : "set-state";
        const unsupported = details.delayRangeMs !== undefined
            || details.probability !== undefined
            || details.transitionTimeMs !== undefined
            || details.transitionRangeMs !== undefined
            || (ranges !== undefined
                && (!Array.isArray(ranges) || ranges.length !== 0))
            || (properties !== undefined && !Array.isArray(properties))
            || (Array.isArray(properties)
                && properties.some(property => Number(property?.id) !== 0x39));

        if (unsupported)
        {
            throw new Error(`unsupported scheduled ${label} ${actionID}`);
        }
        if (!delayDefined)
        {
            if (properties?.length)
            {
                throw new Error(`incomplete scheduled ${label} ${actionID}`);
            }
            return undefined;
        }

        const delayMs = Number(details.delayTimeMs);
        const property = properties?.[0];
        const propertyValue = Number(property?.value);
        const rawPropertyValue = Number(property?.rawValue);

        if (!Number.isFinite(delayMs) || delayMs < 0
            || properties?.length !== 1
            || !Number.isFinite(propertyValue)
            || !Number.isFinite(rawPropertyValue)
            || propertyValue !== delayMs
            || rawPropertyValue !== delayMs
            || (Number(details.actionType) >>> 0)
                !== (Number(actionType) >>> 0)
            || details.actionName !== expectedName
            || Number(details.actionFamily) !== family
            || details.groupId === undefined
            || details.valueId === undefined
            || details.targetId === undefined
            || targetID === undefined
            || (Number(details.targetId) >>> 0)
                !== (Number(targetID) >>> 0))
        {
            throw new Error(`invalid scheduled ${label} ${actionID}`);
        }

        return delayMs;
    }

    /** Projects an authored playback-control action with its existing scope and timing. */
    static readSfxPlaybackControlAction(action, kind)
    {
        const details = action.action ?? action;
        const actionType = Number(action.actionType) >>> 0;
        const targetFlags = Number(details.targetFlags ?? 0);
        const actionFlags = Number(
            details.actionFlags ?? (kind === "pause" ? 7 : 6),
        );
        const mode = details.actionMode ?? CjsAudioLibraryBuilderUtils.sfxActionMode(actionType & 0xff);
        const scope = details.actionScope ?? CjsAudioLibraryBuilderUtils.sfxActionScope(actionType & 0xff);
        const targetId = Number(
            details.targetId ?? action.targetId,
        ) >>> 0;
        const exceptions = Array.isArray(details.exceptions)
            ? details.exceptions
            : [];

        const label = kind === "stop"
            ? "Stop"
            : kind === "pause"
                ? "Pause"
                : "Resume";

        if (details.targetIsBus || (targetFlags & 0x01))
        {
            throw new Error(`bus ${label} action ${action.id}`);
        }
        if (mode !== "element"
            && mode !== "all"
            && mode !== "all-except")
        {
            throw new Error(`unsupported ${label} mode ${mode}`);
        }
        if (scope !== "game-object" && scope !== "global")
        {
            throw new Error(`unsupported ${label} scope ${scope}`);
        }
        if (mode === "element" && targetId === 0)
        {
            throw new Error(`empty ${label} target ${action.id}`);
        }
        const expectedActionFlags = kind === "pause" ? 7 : 6;

        if (actionFlags !== expectedActionFlags)
        {
            throw new Error(
                `unsupported ${label} action flags ${actionFlags}`,
            );
        }

        const normalizedExceptions = exceptions.map(exception =>
        {
            const exceptionFlags = Number(exception.targetFlags ?? 0);

            if (exception.targetIsBus || (exceptionFlags & 0x01))
            {
                throw new Error(`bus ${label} exception ${action.id}`);
            }

            return {
                targetId: String(Number(exception.targetId) >>> 0),
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
            actionFlags,
            exceptions: normalizedExceptions,
        };

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
        if (details.probability !== undefined)
        {
            result.probability = Number(details.probability);
        }

        return result;
    }

    /** Decodes the element, all, or all-except action mode. */
    static sfxActionMode(value)
    {
        if (value === 0x02 || value === 0x03) return "element";
        if (value === 0x04 || value === 0x05) return "all";
        if (value === 0x08 || value === 0x09) return "all-except";
        return "unknown";
    }

    /** Decodes whether an action addresses global or game-object state. */
    static sfxActionScope(value)
    {
        if (value === 0x02 || value === 0x04 || value === 0x08)
        {
            return "global";
        }
        if (value === 0x03 || value === 0x05 || value === 0x09)
        {
            return "game-object";
        }
        return "unknown";
    }

    /** Resolves inherited user and reflection auxiliary sends along NodeBase ancestry. */
    static createEffectiveNodeAuxRouting(rawId, ancestry)
    {
        let userAuxSends;
        let reflectionsAuxSend;
        let userResolved = false;
        let reflectionsResolved = false;
        const trace = ancestry.Trace(rawId);

        for (const { id, nodeBase, parentId } of trace.entries)
        {
            const root = parentId === 0;

            // wwiser's AkAuxList applies a root object's authored list even when
            // the override bit is clear: there is no parent to inherit from. Only
            // a non-root child with override=0 defers to its parent.
            if (!userResolved && (nodeBase.aux?.overrideUserAux || root))
            {
                userAuxSends = CjsAudioLibraryBuilderUtils.createAuxSends(nodeBase, `Wwise NodeBase ${id}`);
                userResolved = true;
            }
            if (!reflectionsResolved
                && (nodeBase.aux?.overrideReflectionsAux || root))
            {
                reflectionsAuxSend = CjsAudioLibraryBuilderUtils.createReflectionsAuxSend(
                    nodeBase,
                    `Wwise NodeBase ${id}`,
                );
                reflectionsResolved = true;
            }
            if (userResolved && reflectionsResolved) break;
        }
        if ((!userResolved || !reflectionsResolved)
            && trace.terminal === "cycle")
        {
            throw new Error(
                `Wwise NodeBase aux ancestry cycle at ${trace.terminalId}`,
            );
        }

        return {
            ...(userAuxSends?.length ? { userAuxSends } : {}),
            ...(reflectionsAuxSend ? { reflectionsAuxSend } : {}),
        };
    }

    /** Projects authored auxiliary slots and their dynamic-control flags. */
    static createAuxSends(value, label)
    {
        if (!value.aux?.hasAux) return [];
        const result = [];

        for (let slotIndex = 0; slotIndex < 4; slotIndex++)
        {
            const targetBusId = Number(value.aux.auxIds?.[slotIndex]) >>> 0;

            if (!targetBusId) continue;
            result.push({
                slotIndex,
                targetBusId: String(targetBusId),
                gainDb: CjsAudioLibraryBuilderUtils.readAuxProperty(
                    value.properties,
                    WWISE_USER_AUX_VOLUME_PROPERTY + slotIndex,
                    0,
                    `${label} User Aux Send ${slotIndex} Volume`,
                ),
                lowPass: CjsAudioLibraryBuilderUtils.readAuxProperty(
                    value.properties,
                    WWISE_USER_AUX_LOW_PASS_PROPERTY + slotIndex,
                    0,
                    `${label} User Aux Send ${slotIndex} LPF`,
                    0,
                    100,
                ),
                highPass: CjsAudioLibraryBuilderUtils.readAuxProperty(
                    value.properties,
                    WWISE_USER_AUX_HIGH_PASS_PROPERTY + slotIndex,
                    0,
                    `${label} User Aux Send ${slotIndex} HPF`,
                    0,
                    100,
                ),
                dynamic: CjsAudioLibraryBuilderUtils.auxSlotHasDynamicControls(value, slotIndex),
            });
        }
        return result;
    }

    /** Projects one authored reflections auxiliary send when it has a target. */
    static createReflectionsAuxSend(value, label)
    {
        const targetBusId = Number(value.aux?.reflectionsAuxBusId) >>> 0;

        if (!targetBusId) return undefined;
        return {
            targetBusId: String(targetBusId),
            gainDb: CjsAudioLibraryBuilderUtils.readAuxProperty(
                value.properties,
                WWISE_REFLECTIONS_VOLUME_PROPERTY,
                0,
                `${label} Reflections Volume`,
            ),
            dynamic: CjsAudioLibraryBuilderUtils.reflectionsHaveDynamicControls(value),
        };
    }

    /** Reports range, RTPC, or state controls affecting one auxiliary slot. */
    static auxSlotHasDynamicControls(value, slotIndex)
    {
        const propertyIds = new Set([
            0x08 + slotIndex,
            0x10 + slotIndex,
            0x14 + slotIndex,
        ]);
        const parameterIds = new Set([
            0x27 + slotIndex,
            0x30 + slotIndex,
            0x34 + slotIndex,
        ]);

        return (value.ranges ?? []).some(range => propertyIds.has(Number(range.id)))
            || (value.rtpcs ?? []).some(control =>
                parameterIds.has(Number(control.parameterId)))
            || (value.state?.properties ?? []).some(property =>
                propertyIds.has(Number(property.propertyId)));
    }

    /** Reports range, RTPC, or state controls affecting reflection volume. */
    static reflectionsHaveDynamicControls(value)
    {
        return (value.ranges ?? []).some(range => Number(range.id) === 0x1a)
            || (value.rtpcs ?? []).some(control =>
                Number(control.parameterId) === 0x2f)
            || (value.state?.properties ?? []).some(property =>
                Number(property.propertyId) === 0x1a);
    }

    /** Reads one bounded auxiliary property, rejecting duplicate or invalid values. */
    static readAuxProperty(
        properties,
        propertyId,
        fallback,
        label,
        minimum = -200,
        maximum = 200,
    )
    {
        const matches = (properties ?? []).filter(property =>
            Number(property.id) === propertyId);

        if (matches.length > 1) throw new Error(`${label} is duplicated`);
        if (!matches.length) return fallback;
        const value = Number(matches[0].floatValue);

        if (!Number.isFinite(value) || value < minimum || value > maximum)
        {
            throw new Error(`${label} is invalid`);
        }
        return value;
    }

    /** Projects portable effect metadata and its encoded parameter bytes. */
    static createPortableEffect(effect)
    {
        const parameterBlock = effect.parameterBlock ?? new Uint8Array();

        return {
            type: effect.type,
            pluginId: Number(effect.pluginId) >>> 0,
            pluginType: Number(effect.pluginType),
            companyId: Number(effect.companyId),
            pluginClassId: Number(effect.pluginClassId),
            parameterByteLength: parameterBlock.byteLength,
            parametersBase64: CjsAudioLibraryBuilderUtils.bytesToBase64(parameterBlock),
            media: [ ...(effect.media ?? []) ]
                .map(media => ({
                    index: Number(media.index),
                    sourceId: String(Number(media.sourceId) >>> 0),
                }))
                .sort((left, right) => left.index - right.index),
            controls: {
                rtpcCount: effect.rtpcs?.length ?? 0,
                statePropertyCount: effect.state?.properties?.length ?? 0,
                stateGroupCount: effect.state?.groups?.length ?? 0,
                propertyValueCount: effect.propertyValues?.length ?? 0,
            },
            bankVersion: effect.bankVersion,
        };
    }

    /** Encodes the supplied bytes with the standard Base64 alphabet and padding. */
    static bytesToBase64(bytes)
    {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let result = "";

        for (let at = 0; at < bytes.byteLength; at += 3)
        {
            const first = bytes[at];
            const hasSecond = at + 1 < bytes.byteLength;
            const hasThird = at + 2 < bytes.byteLength;
            const second = hasSecond ? bytes[at + 1] : 0;
            const third = hasThird ? bytes[at + 2] : 0;
            const value = (first << 16) | (second << 8) | third;

            result += alphabet[(value >>> 18) & 0x3f];
            result += alphabet[(value >>> 12) & 0x3f];
            result += hasSecond ? alphabet[(value >>> 6) & 0x3f] : "=";
            result += hasThird ? alphabet[value & 0x3f] : "=";
        }
        return result;
    }

    /** Rejects dynamic EQ controls and parses the authored static parameter block. */
    static parseStaticParametricEq(
        ownerLabel,
        slot,
        effect,
        { allowIndependentLfe = false } = {},
    )
    {
        if (effect.media?.length
            || effect.rtpcs?.length
            || effect.state?.properties?.length
            || effect.state?.groups?.length
            || effect.propertyValues?.length)
        {
            throw new Error(
                `Wwise Parametric EQ ${effect.id} on ${ownerLabel} is not static`,
            );
        }
        return parseStaticParametricEqBytes(effect.parameterBlock, {
            effectId: effect.id,
            slotIndex: slot.index,
            label: `Wwise Parametric EQ ${effect.id} on ${ownerLabel}`,
            allowIndependentLfe,
        });
    }

    /** Resolves the first authored output bus along SFX ancestry. */
    static createSfxBusRouting(ancestry, rawID, buses)
    {
        for (const { id, nodeBase } of ancestry.Trace(rawID).entries)
        {
            const outputBusId = Number(nodeBase.overrideBusId) >>> 0;

            if (outputBusId)
            {
                return CjsAudioLibraryBuilderUtils.createBusRouting(
                    outputBusId,
                    buses,
                    CjsAudioLibraryBuilderUtils.readOutputBusVolume(nodeBase, id),
                );
            }
        }
        return null;
    }

    /** Resolves the first authored output bus along music ancestry. */
    static createMusicBusRouting(ancestry, rawID, buses)
    {
        for (const { id, nodeBase } of ancestry.Trace(rawID).entries)
        {
            const outputBusId = Number(nodeBase.overrideBusId) >>> 0;

            if (outputBusId)
            {
                return CjsAudioLibraryBuilderUtils.createBusRouting(
                    outputBusId,
                    buses,
                    CjsAudioLibraryBuilderUtils.readOutputBusVolume(nodeBase, id),
                );
            }
        }
        return null;
    }

    /** Reads a unique finite authored Output Bus Volume property. */
    static readOutputBusVolume(nodeBase, nodeID)
    {
        const properties = (nodeBase.properties ?? []).filter(property =>
            Number(property.id) === WWISE_OUTPUT_BUS_VOLUME_PROPERTY);

        if (properties.length > 1)
        {
            throw new Error(
                `Wwise NodeBase ${nodeID} has duplicate Output Bus Volume properties`,
            );
        }
        if (!properties.length)
        {
            return undefined;
        }

        const value = Number(properties[0].floatValue);

        if (!Number.isFinite(value))
        {
            throw new Error(
                `Wwise NodeBase ${nodeID} has invalid Output Bus Volume`,
            );
        }
        return value;
    }

    /** Builds the retained output-bus routing projection and authored gain fields. */
    static createBusRouting(
        rawOutputBusId,
        buses,
        authoredOutputBusVolumeDb = undefined,
    )
    {
        const outputBusId = String(Number(rawOutputBusId) >>> 0);

        if (authoredOutputBusVolumeDb !== undefined
            && !Number.isFinite(Number(authoredOutputBusVolumeDb)))
        {
            throw new Error("Wwise Output Bus Volume must be finite");
        }
        const outputBusVolumeDb = Number(authoredOutputBusVolumeDb) || 0;

        if (!(buses instanceof Map))
        {
            return {
                outputBusId,
                busPathIds: [ outputBusId ],
                ...(outputBusVolumeDb === 0
                    ? {}
                    : { authoredOutputBusVolumeDb: outputBusVolumeDb }),
            };
        }

        const busPathIds = [];
        const active = new Set();
        let current = Number(rawOutputBusId) >>> 0;
        let authoredBusVolumeDb = 0;
        let authoredBusMakeUpGainDb = 0;

        while (current)
        {
            if (active.has(current))
            {
                throw new Error(`Audio bus ancestry cycle at ${current}`);
            }
            active.add(current);

            const bus = buses.get(current);

            if (!bus)
            {
                throw new Error(`Audio bus ancestry is missing ${current}`);
            }

            busPathIds.push(String(current));
            if (bus.busVolume !== null && bus.busVolume !== undefined)
            {
                const value = Number(bus.busVolume);

                if (!Number.isFinite(value))
                {
                    throw new Error(`Audio bus ${current} has invalid Bus Volume`);
                }
                authoredBusVolumeDb += value;
            }
            if (bus.makeUpGain !== null && bus.makeUpGain !== undefined)
            {
                const value = Number(bus.makeUpGain);

                if (!Number.isFinite(value))
                {
                    throw new Error(`Audio bus ${current} has invalid Make-Up Gain`);
                }
                authoredBusMakeUpGainDb += value;
            }
            current = Number(bus.overrideBusId) >>> 0;
        }

        return {
            outputBusId,
            busPathIds,
            ...(authoredBusVolumeDb === 0
                ? {}
                : { authoredBusVolumeDb }),
            ...(authoredBusMakeUpGainDb === 0
                ? {}
                : { authoredBusMakeUpGainDb }),
            ...(outputBusVolumeDb === 0
                ? {}
                : { authoredOutputBusVolumeDb: outputBusVolumeDb }),
        };
    }

    /** Adds each supplied value to the target set. */
    static addSet(target, source)
    {
        for (const value of source ?? [])
        {
            target.add(value);
        }
    }

    /** Projects a supported SFX RTPC curve with its property and scaling rules. */
    static createSfxRtpcCurve(rtpc, names)
    {
        const propertyID = Number(rtpc.parameterId);
        const definitions = {
            [SFX_VOLUME_PROPERTY]: {
                property: "volume",
                accumulation: SFX_ADDITIVE_ACCUMULATION,
                scaling: 2,
            },
            [SFX_PITCH_PROPERTY]: {
                property: "pitch",
                accumulation: SFX_ADDITIVE_ACCUMULATION,
                scaling: 0,
            },
            [SFX_LOW_PASS_PROPERTY]: {
                property: "lowPass",
                accumulation: SFX_FILTER_ACCUMULATION,
                scaling: 0,
            },
            [SFX_HIGH_PASS_PROPERTY]: {
                property: "highPass",
                accumulation: SFX_FILTER_ACCUMULATION,
                scaling: 0,
            },
            [SFX_INITIAL_DELAY_PROPERTY]: {
                property: "initialDelay",
                accumulation: SFX_ADDITIVE_ACCUMULATION,
                scaling: 0,
            },
        };
        const definition = definitions[propertyID];

        if (Number(rtpc.controlType) !== 0 || !definition)
        {
            return null;
        }

        const controlID = Number(rtpc.controlId) >>> 0;
        const parameter = names.parameters.get(controlID);
        const defaultValue = names.parameterDefaults.get(controlID);

        if (!rtpc.points?.length)
        {
            throw new Error(
                `empty ${definition.property} RTPC curve ${rtpc.curveId}`,
            );
        }
        if (Number(rtpc.accumulation) !== definition.accumulation)
        {
            throw new Error(
                `unsupported RTPC accumulation ${rtpc.accumulation}`,
            );
        }
        if (Number(rtpc.scaling) !== definition.scaling)
        {
            throw new Error(
                `unsupported ${definition.property} RTPC scaling ${rtpc.scaling}`,
            );
        }
        if (!parameter)
        {
            throw new Error(
                `unnamed game parameter ${rtpc.controlId}`,
            );
        }

        let previous = -Infinity;
        const points = rtpc.points.map(point =>
        {
            const x = Number(point.from);
            const value = Number(point.to);
            const interpolation = Number(point.interpolation);

            if (!Number.isFinite(x) || !Number.isFinite(value))
            {
                throw new Error(
                    `non-finite RTPC curve ${rtpc.curveId}`,
                );
            }
            if (!Number.isSafeInteger(interpolation)
                || interpolation < 0
                || interpolation > 9)
            {
                throw new Error(
                    `invalid RTPC interpolation ${rtpc.curveId}`,
                );
            }
            if (x < previous)
            {
                throw new Error(
                    `unsorted RTPC curve ${rtpc.curveId}`,
                );
            }
            previous = x;
            return {
                x,
                value,
                interpolation,
            };
        });

        return {
            rtpc: parameter,
            scope: "object",
            property: definition.property,
            scaling: definition.scaling,
            ...(defaultValue === undefined
                ? {}
                : { defaultValue }),
            points,
        };
    }

    /** Validates the Wwise unsigned integer spelling and returns its numeric value. */
    static normalizeWwiseUint32(value, label)
    {
        const text = String(value);
        const number = Number(text);

        if (!/^(?:0|[1-9]\d*)$/u.test(text)
            || !Number.isSafeInteger(number)
            || number < 0
            || number > 0xffffffff)
        {
            throw new TypeError(`${label} must be uint32`);
        }
        return number >>> 0;
    }

    /** Validates an unsigned integer and returns its canonical decimal identifier. */
    static normalizeUnsignedID(value, label)
    {
        const numeric = Number(value);

        if (!Number.isSafeInteger(numeric) || numeric < 0 || numeric > 0xffffffff)
        {
            throw new TypeError(`${label} must be an unsigned 32-bit integer`);
        }

        return String(numeric >>> 0);
    }

    /** Retains one or multiple source records under the supplied key. */
    static addSourceRecord(table, key, record)
    {
        const current = table[key];

        if (current === undefined)
        {
            table[key] = record;
        }
        else if (Array.isArray(current))
        {
            current.push(record);
        }
        else
        {
            table[key] = [ current, record ];
        }
    }

    /** Returns a byte view for supported buffers and views, rejecting other values. */
    static toUint8Array(value)
    {
        if (value instanceof Uint8Array)
        {
            return value;
        }

        if (value instanceof ArrayBuffer)
        {
            return new Uint8Array(value);
        }

        if (ArrayBuffer.isView(value))
        {
            return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        }

        throw new TypeError("Audio media classification requires bytes");
    }

    /** Normalizes a bank path to its lowercase basename. */
    static bankSourceName(value)
    {
        const normalized = String(value ?? "").trim().replaceAll("\\", "/");

        return normalized.split("/").pop().toLowerCase();
    }

    /** Reads setter identifiers and rejects mismatches between typed fields and payload. */
    static readSetterActionIDs(action, rawPayload, label)
    {
        const hasTypedGroup = action?.groupId !== undefined;
        const hasTypedValue = action?.valueId !== undefined;

        if (hasTypedGroup !== hasTypedValue)
        {
            throw new Error(`${label} has incomplete typed fields`);
        }

        const payload = rawPayload instanceof Uint8Array
            ? rawPayload
            : null;
        let raw = null;

        if (payload?.byteLength >= 8)
        {
            const view = new DataView(
                payload.buffer,
                payload.byteOffset,
                payload.byteLength,
            );

            raw = {
                groupID: view.getUint32(payload.byteLength - 8, true),
                valueID: view.getUint32(payload.byteLength - 4, true),
            };
        }

        if (hasTypedGroup)
        {
            const typed = {
                groupID: Number(action.groupId) >>> 0,
                valueID: Number(action.valueId) >>> 0,
            };

            if (raw
                && (raw.groupID !== typed.groupID
                    || raw.valueID !== typed.valueID))
            {
                throw new Error(`${label} typed fields disagree with payload`);
            }
            return typed;
        }
        if (!raw)
        {
            throw new Error(`${label} has a truncated payload`);
        }
        return raw;
    }

    /** Returns entries from a metadata Map or plain object. */
    static metadataEntries(value, label)
    {
        if (value instanceof Map)
        {
            return value.entries();
        }
        if (value && typeof value === "object" && !Array.isArray(value))
        {
            return Object.entries(value);
        }

        throw new TypeError(`${label} must be an object or Map`);
    }
}
