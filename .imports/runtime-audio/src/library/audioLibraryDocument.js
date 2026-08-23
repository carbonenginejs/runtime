import {
    normalizeSfxGraph,
    ValidateStateTransitions,
    validateSfxGraph,
} from "./sfxGraph.js";
import { indexBusDuckingCatalog } from "../internal/busDucking.js";
import { indexBusEffectCatalog } from "../internal/busEffects.js";
import {
    assertBusGraphRouteProjection,
    normalizeBusGraphCatalog,
} from "../internal/busGraph.js";

const AUDIO_LIBRARY_SCHEMA = "carbonenginejs.audioLibrary";
const AUDIO_LIBRARY_VERSION = 2;

/** Validates one complete plain audio-library document. */
export function validateAudioLibraryDocument(value)
{
    RequireRecord(value, "Audio library");

    if (value.schema !== AUDIO_LIBRARY_SCHEMA)
    {
        throw new TypeError(
            `Unsupported audio-library schema: ${value.schema}`,
        );
    }

    if (value.schemaVersion !== AUDIO_LIBRARY_VERSION)
    {
        throw new TypeError(
            `Unsupported audio-library schema version: ${value.schemaVersion}`,
        );
    }

    const metadata = RequireRecord(
        value.metadata,
        "Audio library metadata",
    );

    RequireRecord(metadata.Events, "Audio library metadata.Events");
    RequireRecord(metadata.SoundBanks, "Audio library metadata.SoundBanks");
    RequireRecord(metadata.WemFileIDs, "Audio library metadata.WemFileIDs");
    RequireRecord(value.media, "Audio library media");
    RequireRecord(value.banks, "Audio library banks");

    ValidateEventMetadata(metadata.Events);
    ValidateBanks(value.banks);
    ValidateEmbeddedMedia(value.embeddedMedia, value.banks);
    ValidateEventMedia(
        value.eventMedia,
        value.eventMediaLanguage,
        value.media,
        value.embeddedMedia ?? {},
    );
    let normalizedSfx = null;

    if (value.sfx !== undefined)
    {
        validateSfxGraph(
            value.sfx,
            value.media,
            value.embeddedMedia ?? {},
        );
        normalizedSfx = normalizeSfxGraph(
            value.sfx,
            value.media,
            value.embeddedMedia ?? {},
        );
        for (const eventName of SfxEventNames(value.sfx))
        {
            if (!metadata.Events[eventName])
            {
                throw new TypeError(
                    `Audio library SFX event ${eventName} has no metadata event`,
                );
            }
        }
    }
    ValidateMusic(
        value.music,
        value.media,
        value.embeddedMedia ?? {},
    );
    ValidateBusRtpcs(value.busRtpcs);
    ValidateBusStates(value.busStates);
    const busDucking = indexBusDuckingCatalog(value.busDucking);
    indexBusEffectCatalog(value.busEffects);
    const usesBusVoiceVolume = Object.values(
        normalizedSfx?.programs ?? {},
    ).some(actions => actions.some(action =>
        action.kind === "set-bus-voice-volume"));

    if (usesBusVoiceVolume && value.busGraph === undefined)
    {
        throw new TypeError(
            "Audio library Bus-target Voice Volume requires a Bus graph",
        );
    }
    if (value.busGraph !== undefined)
    {
        const busGraph = normalizeBusGraphCatalog(
            value.busGraph,
            value.embeddedMedia ?? {},
        );

        ValidateBusGraphControlCatalogs(
            busGraph,
            value.busRtpcs,
            value.busStates,
            busDucking,
        );
        ValidateBusGraphConsumers(busGraph, normalizedSfx, value.music);
        ValidateBusGraphVoiceVolumeActionRoutes(
            busGraph,
            normalizedSfx,
        );
        ValidateBusGraphVolumeActionRisk(busGraph, normalizedSfx);
    }

    return true;
}

function ValidateBusGraphVoiceVolumeActionRoutes(busGraph, sfx)
{
    const targets = new Set(
        Object.values(sfx?.programs ?? {}).flatMap(actions => actions
            .filter(action => action.kind === "set-bus-voice-volume")
            .map(action => String(action.targetId))),
    );

    for (const targetId of targets)
    {
        if (busGraph.buses[targetId]?.type !== "audio-bus")
        {
            throw new TypeError(
                `Audio library Bus-target Voice Volume ${targetId} must target an Audio Bus`,
            );
        }
        for (const [ nodeId, node ] of Object.entries(sfx?.nodes ?? {}))
        {
            if (node?.type !== "sound"
                || !node.busPathIds?.map(String).includes(targetId))
            {
                continue;
            }
            const route = busGraph.routes[busGraph.sfxRoutes[nodeId]];
            const wetRoute = route.userAuxSends.length
                || route.reflectionsAuxSend
                || route.busPathIds.some(busId =>
                {
                    const bus = busGraph.buses[busId];

                    return bus.userAuxSends.length
                        || bus.reflectionsAuxSend;
                });

            if (wetRoute)
            {
                throw new TypeError(
                    `Audio library Bus-target Voice Volume ${targetId} cannot use an Aux route`,
                );
            }
        }
        for (const routeIndex of Object.values(busGraph.musicRoutes))
        {
            if (busGraph.routes[routeIndex].busPathIds.includes(targetId))
            {
                throw new TypeError(
                    `Audio library Bus-target Voice Volume ${targetId} cannot affect music`,
                );
            }
        }
    }
}

function ValidateBusGraphVolumeActionRisk(busGraph, sfx)
{
    const buses = busGraph.buses ?? {};
    const busIds = Object.keys(buses);

    for (const actions of Object.values(sfx?.programs ?? {}))
    {
        for (const action of actions)
        {
            if (action?.kind !== "set-bus-volume"
                && action?.kind !== "reset-bus-volume")
            {
                continue;
            }
            const excluded = new Set(
                (action.exceptions ?? []).map(value => String(value.targetId)),
            );
            const targets = action.mode === "element"
                ? [ String(action.targetId) ]
                : busIds.filter(busId =>
                    action.mode !== "all-except" || !excluded.has(busId));

            for (const busId of targets)
            {
                if (!buses[busId]) continue;
                if (buses[busId].busVolumeActionControlled !== true)
                {
                    throw new TypeError(
                        `Audio Bus graph omits Bus Volume action control for bus ${busId}`,
                    );
                }
                if (action.kind !== "set-bus-volume") continue;
                const maximum = Number(action.busVolumeDb)
                    + Number(action.busVolumeRangeDb?.max ?? 0);
                const mayIncrease = action.valueMode === "absolute"
                    || !Number.isFinite(maximum)
                    || maximum > 0;

                if (mayIncrease && buses[busId].busVolumeMayIncrease !== true)
                {
                    throw new TypeError(
                        `Audio Bus graph omits volume-increase risk for bus ${busId}`,
                    );
                }
            }
        }
    }
}

function ValidateBusGraphControlCatalogs(
    busGraph,
    busRtpcs,
    busStates,
    busDucking,
)
{
    const rtpcBuses = busRtpcs?.buses ?? {};
    const stateBuses = busStates?.buses ?? {};

    for (const [ busId, bus ] of Object.entries(busGraph.buses ?? {}))
    {
        const reasons = new Set(bus.requiresProcessing ?? []);
        const hasRtpcs = Object.hasOwn(rtpcBuses, busId);
        const hasStates = Object.hasOwn(stateBuses, busId);
        const hasDucking = busDucking.has(busId);

        if ((reasons.has("rtpc") && !hasRtpcs)
            || (hasRtpcs
                && !reasons.has("rtpc")
                && !reasons.has("unsupported-rtpc")))
        {
            throw new TypeError(
                `Audio Bus graph RTPC catalog disagrees for bus ${busId}`,
            );
        }
        if (reasons.has("state") !== hasStates)
        {
            throw new TypeError(
                `Audio Bus graph State catalog disagrees for bus ${busId}`,
            );
        }
        if (reasons.has("ducking") !== hasDucking)
        {
            throw new TypeError(
                `Audio Bus graph ducking catalog disagrees for bus ${busId}`,
            );
        }
    }
}

function ValidateBusGraphConsumers(busGraph, sfx, music)
{
    if (sfx)
    {
        for (const [ nodeId, node ] of Object.entries(sfx.nodes ?? {}))
        {
            if (node?.type !== "sound" || node.outputBusId === undefined)
            {
                continue;
            }
            const routeIndex = busGraph.sfxRoutes[nodeId];

            if (routeIndex === undefined)
            {
                throw new TypeError(`Audio Bus graph omits routed SFX Sound ${nodeId}`);
            }
            assertBusGraphRouteProjection(
                busGraph.routes[routeIndex],
                node,
                `Audio Bus graph SFX route ${nodeId}`,
            );
        }
    }
    if (music)
    {
        for (const [ nodeId, node ] of Object.entries(music.nodes ?? {}))
        {
            if (node?.type !== "music-track" || node.outputBusId === undefined)
            {
                continue;
            }
            const routeIndex = busGraph.musicRoutes[nodeId];

            if (routeIndex === undefined)
            {
                throw new TypeError(`Audio Bus graph omits routed music track ${nodeId}`);
            }
            assertBusGraphRouteProjection(
                busGraph.routes[routeIndex],
                {
                    outputBusId: node.outputBusId,
                    busPathIds: (node.busPathIds ?? []).map(id =>
                        String(Number(id) >>> 0)),
                    ...(node.authoredBusVolumeDb === undefined
                        ? {}
                        : { authoredBusVolumeDb: Number(node.authoredBusVolumeDb) }),
                    ...(node.authoredBusMakeUpGainDb === undefined
                        ? {}
                        : { authoredBusMakeUpGainDb: Number(node.authoredBusMakeUpGainDb) }),
                    ...(node.authoredOutputBusVolumeDb === undefined
                        ? {}
                        : { authoredOutputBusVolumeDb: Number(node.authoredOutputBusVolumeDb) }),
                },
                `Audio Bus graph music route ${nodeId}`,
            );
        }
    }
}

function ValidateBusStates(value)
{
    if (value === undefined)
    {
        return;
    }

    const catalog = RequireRecord(value, "Audio library busStates");

    if (catalog.schemaVersion !== 1 && catalog.schemaVersion !== 2)
    {
        throw new TypeError(
            `Unsupported audio bus State schema version: ${catalog.schemaVersion}`,
        );
    }
    const legacy = catalog.schemaVersion === 1;

    if (legacy
        && (catalog.property !== "bus-volume"
            || catalog.accumulation !== "additive"
            || catalog.unit !== "db"))
    {
        throw new TypeError(
            "Audio library busStates must contain additive Bus Volume dB values",
        );
    }

    if (!Array.isArray(catalog.stateTransitions)
        || !catalog.stateTransitions.length)
    {
        throw new TypeError(
            "Audio library busStates must have State transitions",
        );
    }
    ValidateStateTransitions(
        catalog.stateTransitions,
        "Audio library busStates stateTransitions",
    );
    const transitionGroups = new Map(catalog.stateTransitions.map(group => [
        String(group.groupId),
        group,
    ]));
    const referencedTransitionGroups = new Set();
    let usesFilters = false;

    const buses = RequireRecord(
        catalog.buses,
        "Audio library busStates buses",
    );

    for (const [ rawBusId, groups ] of Object.entries(buses))
    {
        const busId = NormalizePositiveID(
            rawBusId,
            `Audio library busStates bus ${rawBusId}`,
        );

        if (String(busId) !== String(rawBusId))
        {
            throw new TypeError(
                `Audio library busStates has non-canonical bus id ${rawBusId}`,
            );
        }
        if (!Array.isArray(groups) || !groups.length)
        {
            throw new TypeError(
                `Audio library busStates bus ${rawBusId} must have groups`,
            );
        }

        const groupIds = new Set();
        const groupNames = new Set();

        for (const [ index, groupValue ] of groups.entries())
        {
            const label = `Audio library busStates bus ${rawBusId}`
                + ` group ${index}`;
            const group = RequireRecord(groupValue, label);
            const groupId = NormalizePositiveID(
                group.groupId,
                `${label} id`,
            );
            const groupName = String(group.group ?? "").trim();
            const normalizedGroupName = groupName.toLowerCase();
            const syncType = Number(group.syncType);
            const effectiveSyncType = Number(group.effectiveSyncType);

            if (String(groupId) !== String(group.groupId)
                || groupIds.has(groupId))
            {
                throw new TypeError(`${label} has an invalid or duplicate id`);
            }
            groupIds.add(groupId);
            if (!groupName || groupNames.has(normalizedGroupName))
            {
                throw new TypeError(`${label} has an invalid or duplicate name`);
            }
            groupNames.add(normalizedGroupName);
            if (!Number.isSafeInteger(syncType)
                || syncType < 0
                || syncType > 9)
            {
                throw new TypeError(`${label} syncType must be from 0 to 9`);
            }
            if (effectiveSyncType !== 0)
            {
                throw new TypeError(`${label} effectiveSyncType must be 0`);
            }
            const transitionGroup = transitionGroups.get(String(groupId));

            if (!transitionGroup
                || String(transitionGroup.group ?? "").trim().toLowerCase()
                    !== normalizedGroupName)
            {
                throw new TypeError(
                    `${label} must match its State transition group`,
                );
            }
            referencedTransitionGroups.add(String(groupId));
            if (!Array.isArray(group.states) || !group.states.length)
            {
                throw new TypeError(`${label} must have states`);
            }

            const stateIds = new Set();
            const stateNames = new Set();

            for (const [ stateIndex, stateValue ] of group.states.entries())
            {
                const stateLabel = `${label} state ${stateIndex}`;
                const state = RequireRecord(stateValue, stateLabel);
                const stateId = NormalizePositiveID(
                    state.stateId,
                    `${stateLabel} id`,
                );
                const stateName = String(state.state ?? "").trim();
                const normalizedStateName = stateName.toLowerCase();

                if (String(stateId) !== String(state.stateId)
                    || stateIds.has(stateId))
                {
                    throw new TypeError(
                        `${stateLabel} has an invalid or duplicate id`,
                    );
                }
                stateIds.add(stateId);
                if (!stateName || stateNames.has(normalizedStateName))
                {
                    throw new TypeError(
                        `${stateLabel} has an invalid or duplicate name`,
                    );
                }
                stateNames.add(normalizedStateName);
                const fields = [
                    [ "gainDb", -200, 200 ],
                    [ "pitchCents", -2400, 2400 ],
                    [ "lowPass", -100, 100 ],
                    [ "highPass", -100, 100 ],
                ].filter(([ field ]) => state[field] !== undefined);

                if (legacy && (fields.length !== 1 || fields[0][0] !== "gainDb"))
                {
                    throw new TypeError(
                        `${stateLabel} must contain one Bus Volume value`,
                    );
                }
                if (!legacy && !fields.length)
                {
                    throw new TypeError(
                        `${stateLabel} must contain a Bus State property`,
                    );
                }
                for (const [ field, minimum, maximum ] of fields)
                {
                    const number = Number(state[field]);

                    if (!Number.isFinite(number))
                    {
                        throw new TypeError(`${stateLabel} ${field} must be finite`);
                    }
                    if (number < minimum || number > maximum)
                    {
                        throw new TypeError(
                            `${stateLabel} ${field} must be from ${minimum} to ${maximum}`,
                        );
                    }
                    usesFilters ||= field === "lowPass" || field === "highPass";
                }

                const transitionState = transitionGroup.states?.find(entry =>
                    String(entry.stateId) === String(stateId));

                if (!transitionState
                    || String(transitionState.state).trim().toLowerCase()
                        !== normalizedStateName)
                {
                    throw new TypeError(
                        `${stateLabel} must match its State transition value`,
                    );
                }
            }
        }
    }
    if (referencedTransitionGroups.size !== transitionGroups.size)
    {
        throw new TypeError(
            "Audio library busStates has unreferenced State transitions",
        );
    }
    if (!legacy
        && catalog.filterBehavior !== undefined
        && catalog.filterBehavior !== "additive")
    {
        throw new TypeError(
            "Audio library busStates has unsupported filter behavior",
        );
    }
    if (!legacy && usesFilters && catalog.filterBehavior !== "additive")
    {
        throw new TypeError(
            "Audio library busStates filters must use additive behavior",
        );
    }
}

function ValidateBusRtpcs(value)
{
    if (value === undefined)
    {
        return;
    }

    const catalog = RequireRecord(value, "Audio library busRtpcs");

    if (catalog.schemaVersion !== 1 && catalog.schemaVersion !== 2)
    {
        throw new TypeError(
            `Unsupported audio bus RTPC schema version: ${catalog.schemaVersion}`,
        );
    }

    const buses = RequireRecord(
        catalog.buses,
        "Audio library busRtpcs buses",
    );

    for (const [ rawBusId, curves ] of Object.entries(buses))
    {
        const busId = NormalizePositiveID(
            rawBusId,
            `Audio library busRtpcs bus ${rawBusId}`,
        );

        if (String(busId) !== String(rawBusId))
        {
            throw new TypeError(
                `Audio library busRtpcs has non-canonical bus id ${rawBusId}`,
            );
        }
        if (!Array.isArray(curves) || !curves.length)
        {
            throw new TypeError(
                `Audio library busRtpcs bus ${rawBusId} must have curves`,
            );
        }

        const curveIds = new Set();

        for (const [ index, curveValue ] of curves.entries())
        {
            const label = `Audio library busRtpcs bus ${rawBusId}`
                + ` curve ${index}`;
            const curve = RequireRecord(curveValue, label);
            const curveId = NormalizePositiveID(curve.curveId, `${label} id`);

            if (curveIds.has(curveId))
            {
                throw new TypeError(`${label} duplicates curve ${curveId}`);
            }
            curveIds.add(curveId);

            if (catalog.schemaVersion === 1
                && curve.property !== undefined)
            {
                throw new TypeError(
                    `${label} version 1 cannot declare a property`,
                );
            }
            if (catalog.schemaVersion === 2
                && curve.property !== "voice-volume"
                && curve.property !== "bus-volume")
            {
                throw new TypeError(
                    `${label} property must be voice-volume or bus-volume`,
                );
            }

            if (typeof curve.rtpc !== "string" || !curve.rtpc.trim())
            {
                throw new TypeError(`${label} rtpc must be a name`);
            }
            if (!Number.isFinite(Number(curve.defaultValue)))
            {
                throw new TypeError(`${label} defaultValue must be finite`);
            }
            if (Number(curve.scaling) !== 2)
            {
                throw new TypeError(`${label} scaling must be 2`);
            }
            if (!Array.isArray(curve.points) || !curve.points.length)
            {
                throw new TypeError(`${label} must have points`);
            }

            let previous = -Infinity;

            for (const [ pointIndex, pointValue ] of curve.points.entries())
            {
                const point = RequireRecord(
                    pointValue,
                    `${label} point ${pointIndex}`,
                );
                const x = Number(point.x);
                const output = Number(point.value);
                const interpolation = Number(point.interpolation);

                if (!Number.isFinite(x)
                    || !Number.isFinite(output)
                    || output < -1
                    || output > 1)
                {
                    throw new TypeError(
                        `${label} point ${pointIndex} must have finite x`
                        + " and a value from -1 to 1",
                    );
                }
                if (x < previous)
                {
                    throw new TypeError(`${label} points must be ordered`);
                }
                if (!Number.isSafeInteger(interpolation)
                    || interpolation < 0
                    || interpolation > 9)
                {
                    throw new TypeError(
                        `${label} point ${pointIndex} interpolation must be`
                        + " a Wwise curve value from 0 to 9",
                    );
                }
                previous = x;
            }
        }
    }
}

function ValidateEventMetadata(events)
{
    for (const [ name, event ] of Object.entries(events))
    {
        RequireRecord(event, `Audio library metadata event ${name}`);

        if (event.is2D !== undefined
            && event.is2D !== 0
            && event.is2D !== 1)
        {
            throw new TypeError(
                `Audio library metadata event ${name} is2D must be 0 or 1`,
            );
        }

        if (event.maxRadiusAttenuation !== undefined
            && (!Number.isFinite(event.maxRadiusAttenuation)
                || event.maxRadiusAttenuation < 0))
        {
            throw new TypeError(
                `Audio library metadata event ${name} maxRadiusAttenuation must be a non-negative finite number`,
            );
        }
    }
}

function SfxEventNames(sfx)
{
    return new Set([
        ...Object.keys(sfx?.events ?? {}),
        ...Object.keys(sfx?.programs ?? {}),
    ]);
}

/**
 * Validates and returns an immutable detached audio-library document.
 *
 * Applications may obtain the input through an API, a packaged module, a
 * download, or the optional library builder. Runtime-audio never discovers
 * or acquires those inputs.
 */
export function installAudioLibraryDocument(value)
{
    validateAudioLibraryDocument(value);
    const normalized = {
        ...value,
        ...(value.sfx === undefined
            ? {}
            : { sfx: normalizeSfxGraph(
                value.sfx,
                value.media,
                value.embeddedMedia ?? {},
            ) }),
        ...(value.busGraph === undefined
            ? {}
            : { busGraph: normalizeBusGraphCatalog(
                value.busGraph,
                value.embeddedMedia ?? {},
            ) }),
    };

    if (normalized.sfx)
    {
        normalized.metadata = NormalizeSfxLoopMetadata(
            value.metadata,
            normalized.sfx,
        );
    }

    return CloneJSONValue(normalized, "audio library");
}

function NormalizeSfxLoopMetadata(metadata, sfx)
{
    const events = {
        ...metadata.Events,
    };

    for (const [ eventName, roots ] of Object.entries(sfx.events))
    {
        const source = events[eventName];
        const fallback = Boolean(source.isLoop);
        const mayLoop = roots.some(root =>
            ChildMayLoop(root, sfx.nodes, fallback, new Set()));

        events[eventName] = {
            ...source,
            isLoop: mayLoop ? 1 : 0,
        };
    }

    return {
        ...metadata,
        Events: events,
    };
}

function ChildMayLoop(child, nodes, fallback, active)
{
    const id = String(Number(
        child && typeof child === "object" ? child.nodeId : child,
    ) >>> 0);
    const node = nodes[id];

    if (!node || active.has(id))
    {
        return false;
    }
    if (node.type === "sound")
    {
        if (node.playCount !== undefined)
        {
            return false;
        }
        return node.loop === undefined ? fallback : node.loop;
    }
    if (node.type === "silence" || node.type === "timed-silence")
    {
        return false;
    }

    const next = new Set(active);

    next.add(id);

    if (node.type === "switch")
    {
        return [
            ...Object.values(node.cases),
            ...(node.default === undefined ? [] : [ node.default ]),
        ].some(value => ChildMayLoop(value, nodes, fallback, next));
    }

    return node.children.some(value =>
        ChildMayLoop(value, nodes, fallback, next));
}

function ValidateBanks(banks)
{
    for (const [ sourceID, bank ] of Object.entries(banks))
    {
        RequireRecord(bank, `Audio library bank ${sourceID}`);

        const bankID = NormalizeUnsignedID(
            bank.bankID,
            `Audio library bank ${sourceID} bankID`,
        );
        const languageID = NormalizeUnsignedID(
            bank.languageID,
            `Audio library bank ${sourceID} languageID`,
        );
        const expected = `${bankID}:${languageID}`;

        if (sourceID !== expected || String(bank.sourceID ?? "") !== expected)
        {
            throw new TypeError(
                `Audio library bank identity must be ${expected}: ${sourceID}`,
            );
        }
    }
}

function ValidateEmbeddedMedia(embeddedMedia, banks)
{
    if (embeddedMedia === undefined)
    {
        return;
    }

    RequireRecord(embeddedMedia, "Audio library embeddedMedia");

    for (const [ mediaID, value ] of Object.entries(embeddedMedia))
    {
        NormalizePositiveID(
            mediaID,
            `Audio library embedded media ${mediaID}`,
        );

        const records = Array.isArray(value) ? value : [ value ];

        if (!records.length)
        {
            throw new TypeError(
                `Audio library embedded media ${mediaID} has no sources`,
            );
        }

        for (const record of records)
        {
            RequireRecord(
                record,
                `Audio library embedded media ${mediaID}`,
            );

            if (!banks[String(record.bank ?? "")])
            {
                throw new TypeError(
                    `Audio library embedded media ${mediaID} references unknown bank ${record.bank}`,
                );
            }

            NormalizeNonNegativeInteger(
                record.offset,
                `Audio library embedded media ${mediaID} offset`,
            );
            NormalizePositiveInteger(
                record.byteLength,
                `Audio library embedded media ${mediaID} byteLength`,
            );
        }
    }
}

function ValidateEventMedia(eventMedia, language, media, embeddedMedia)
{
    if (eventMedia === undefined)
    {
        return;
    }

    RequireRecord(eventMedia, "Audio library eventMedia");
    NormalizeLanguage(language ?? "");

    for (const [ eventName, values ] of Object.entries(eventMedia))
    {
        if (!Array.isArray(values))
        {
            throw new TypeError(
                `Audio library eventMedia.${eventName} must be an array`,
            );
        }

        const ids = values.map(value => NormalizePositiveID(
            value,
            `Audio library eventMedia.${eventName}`,
        ));

        if (new Set(ids).size !== ids.length)
        {
            throw new TypeError(
                `Audio library eventMedia.${eventName} has duplicate sources`,
            );
        }

        for (const id of ids)
        {
            if (!media[id] && !embeddedMedia[id])
            {
                throw new TypeError(
                    `Audio library eventMedia.${eventName} references missing source ${id}`,
                );
            }
        }
    }
}

function ValidateMusic(music, media, embeddedMedia)
{
    if (music === undefined)
    {
        return;
    }

    RequireRecord(music, "Audio library music");

    if (music.schemaVersion !== 1)
    {
        throw new TypeError(
            `Unsupported audio music schema version: ${music.schemaVersion}`,
        );
    }

    if (!Array.isArray(music.banks))
    {
        throw new TypeError("Audio library music banks must be an array");
    }

    const nodes = RequireRecord(
        music.nodes,
        "Audio library music nodes",
    );
    const bankNames = music.banks.map(NormalizeBankName);

    if (new Set(bankNames).size !== bankNames.length)
    {
        throw new TypeError("Audio library music banks must be unique");
    }

    for (const [ id, node ] of Object.entries(nodes))
    {
        const canonicalID = NormalizePositiveID(
            id,
            `Audio library music node ${id}`,
        );

        if (id !== canonicalID)
        {
            throw new TypeError(
                `Audio library music node ${id} must use canonical ID ${canonicalID}`,
            );
        }
        RequireRecord(node, `Audio library music node ${id}`);

        if (!bankNames.includes(NormalizeBankName(node.bank)))
        {
            throw new TypeError(
                `Audio library music node ${id} references unknown bank ${node.bank}`,
            );
        }

        ValidateMusicBusRouting(node, id);

        for (const childID of node.children ?? [])
        {
            if (!nodes[NormalizePositiveID(
                childID,
                `Audio library music node ${id} child`,
            )])
            {
                throw new TypeError(
                    `Audio library music node ${id} references missing child ${childID}`,
                );
            }
        }

        if (node.type === "music-track")
        {
            ValidateMusicTrackRtpcCurves(node.rtpcCurves, id);
            for (const source of node.sources ?? [])
            {
                const sourceID = NormalizePositiveID(
                    source.sourceId,
                    `Audio library music track ${id} source`,
                );

                if (!media[sourceID] && !embeddedMedia[sourceID])
                {
                    throw new TypeError(
                        `Audio library music track ${id} references missing source ${sourceID}`,
                    );
                }
            }
        }
        else if (node.rtpcCurves !== undefined)
        {
            throw new TypeError(
                `Audio library music node ${id} RTPC curves are track-only`,
            );
        }
    }

    for (const field of [ "eventTargets", "eventStops" ])
    {
        const table = RequireRecord(
            music[field],
            `Audio library music ${field}`,
        );

        for (const [ name, values ] of Object.entries(table))
        {
            if (!Array.isArray(values))
            {
                throw new TypeError(
                    `Audio library music ${field}.${name} must be an array`,
                );
            }

            for (const value of values)
            {
                const id = NormalizePositiveID(
                    value,
                    `Audio library music ${field}.${name}`,
                );

                if (!nodes[id])
                {
                    throw new TypeError(
                        `Audio library music ${field}.${name} references missing node ${id}`,
                    );
                }
            }
        }
    }

    const switchSetters = RequireRecord(
        music.switchSetters,
        "Audio library music switchSetters",
    );

    for (const [ name, setters ] of Object.entries(switchSetters))
    {
        if (!Array.isArray(setters))
        {
            throw new TypeError(
                `Audio library music switchSetters.${name} must be an array`,
            );
        }
        const keys = setters.map((value, index) =>
        {
            const label = `Audio library music switchSetters.${name}[${index}]`;
            const setter = RequireRecord(value, label);

            if (setter.kind !== "switch" && setter.kind !== "state")
            {
                throw new TypeError(
                    `${label} kind must be switch or state`,
                );
            }
            for (const field of [
                "delayRangeMs",
                "probability",
                "transitionMs",
                "transitionTimeMs",
                "transitionRangeMs",
                "properties",
                "ranges",
            ])
            {
                if (setter[field] !== undefined)
                {
                    throw new TypeError(
                        `${label} ${field} is unsupported`,
                    );
                }
            }
            const groupId = NormalizeNonNegativeInteger(
                setter.groupId,
                `${label} groupId`,
            );
            const targetId = NormalizeNonNegativeInteger(
                setter.targetId,
                `${label} targetId`,
            );
            const delayMs = Number(setter.delayMs ?? 0);

            if (!Number.isFinite(delayMs) || delayMs < 0)
            {
                throw new TypeError(
                    `${label} delayMs must be a non-negative finite number`,
                );
            }
            return `${setter.kind}:${groupId}:${targetId}:${delayMs}`;
        });

        if (new Set(keys).size !== keys.length)
        {
            throw new TypeError(
                `Audio library music switchSetters.${name} has duplicate setters`,
            );
        }
    }

    ValidateMusicPrograms(
        music.programs,
        nodes,
        music.eventTargets,
        music.eventStops,
        music.switchSetters,
    );
}

function ValidateMusicPrograms(
    programs,
    nodes,
    eventTargets,
    eventStops,
    switchSetters,
)
{
    if (programs === undefined)
    {
        return;
    }
    RequireRecord(programs, "Audio library music programs");
    const roots = new Set(
        Object.values(eventTargets ?? {}).flat().map(value =>
            NormalizeUnsignedID(
                value,
                "Audio library music event target",
            )),
    );

    for (const [ name, actions ] of Object.entries(programs))
    {
        if (eventTargets?.[name]?.length
            || eventStops?.[name]?.length
            || switchSetters?.[name]?.length)
        {
            throw new TypeError(
                `Audio library music programs.${name} has an ordered action mix`,
            );
        }
        if (!Array.isArray(actions) || !actions.length)
        {
            throw new TypeError(
                `Audio library music programs.${name} must be non-empty`,
            );
        }
        for (let index = 0; index < actions.length; index++)
        {
            const label = `Audio library music programs.${name}[${index}]`;
            const action = RequireRecord(actions[index], label);
            const expectedFlags = action.kind === "pause" ? 7 : 6;
            const targetId = NormalizeUnsignedID(
                action.targetId,
                `${label} targetId`,
            );
            const curve = NormalizeNonNegativeInteger(
                action.curve,
                `${label} curve`,
            );
            const transitionMs = Number(action.transitionMs);
            const unsupported = [
                "delayMs",
                "delayRangeMs",
                "transitionRangeMs",
                "probability",
            ].some(field => action[field] !== undefined);

            if (![ "pause", "resume" ].includes(action.kind)
                || action.scope !== "game-object"
                || ![ "element", "all" ].includes(action.mode)
                || Number(action.targetFlags) !== 0
                || Number(action.actionFlags) !== expectedFlags
                || !Array.isArray(action.exceptions)
                || action.exceptions.length
                || curve > 9
                || !Number.isFinite(transitionMs)
                || transitionMs < 0
                || unsupported)
            {
                throw new TypeError(`${label} is unsupported`);
            }
            if ((action.mode === "element"
                    && (!nodes[targetId] || !roots.has(targetId)))
                || (action.mode === "all" && targetId !== "0"))
            {
                throw new TypeError(`${label} has an invalid target`);
            }
        }
    }
}

function ValidateMusicBusRouting(node, id)
{
    const hasOutput = node.outputBusId !== undefined;
    const hasPath = node.busPathIds !== undefined;
    const hasAuthored = node.authoredBusVolumeDb !== undefined;
    const hasMakeUp = node.authoredBusMakeUpGainDb !== undefined;
    const hasOutputVolume = node.authoredOutputBusVolumeDb !== undefined;

    if (node.type !== "music-track"
        && (hasOutput || hasPath || hasAuthored || hasMakeUp || hasOutputVolume))
    {
        throw new TypeError(
            `Audio library music node ${id} bus routing is track-only`,
        );
    }

    if (!hasOutput)
    {
        if (hasPath || hasAuthored || hasMakeUp || hasOutputVolume)
        {
            throw new TypeError(
                `Audio library music node ${id} bus routing requires outputBusId`,
            );
        }
        return;
    }

    const outputBusId = NormalizePositiveID(
        node.outputBusId,
        `Audio library music node ${id} outputBusId`,
    );

    if (!Array.isArray(node.busPathIds) || !node.busPathIds.length)
    {
        throw new TypeError(
            `Audio library music node ${id} busPathIds must be non-empty`,
        );
    }

    const path = node.busPathIds.map((value, index) =>
        NormalizePositiveID(
            value,
            `Audio library music node ${id} busPathIds ${index}`,
        ));

    if (path[0] !== outputBusId || new Set(path).size !== path.length)
    {
        throw new TypeError(
            `Audio library music node ${id} has invalid busPathIds`,
        );
    }
    if (hasAuthored && !Number.isFinite(Number(node.authoredBusVolumeDb)))
    {
        throw new TypeError(
            `Audio library music node ${id} authoredBusVolumeDb must be finite`,
        );
    }
    if (hasMakeUp && !Number.isFinite(Number(node.authoredBusMakeUpGainDb)))
    {
        throw new TypeError(
            `Audio library music node ${id} authoredBusMakeUpGainDb must be finite`,
        );
    }
    if (hasOutputVolume
        && !Number.isFinite(Number(node.authoredOutputBusVolumeDb)))
    {
        throw new TypeError(
            `Audio library music node ${id} authoredOutputBusVolumeDb must be finite`,
        );
    }
}

function ValidateMusicTrackRtpcCurves(curves, id)
{
    if (curves === undefined)
    {
        return;
    }
    if (!Array.isArray(curves) || !curves.length)
    {
        throw new TypeError(
            `Audio library music track ${id} rtpcCurves must be non-empty`,
        );
    }

    for (let index = 0; index < curves.length; index++)
    {
        const label = `Audio library music track ${id} rtpcCurves ${index}`;
        const curve = RequireRecord(curves[index], label);

        if (curve.property !== "volume")
        {
            throw new TypeError(`${label} property must be volume`);
        }
        if (typeof curve.rtpc !== "string" || !curve.rtpc.trim())
        {
            throw new TypeError(`${label} rtpc must be a name`);
        }
        if (curve.scope !== "global")
        {
            throw new TypeError(`${label} scope must be global`);
        }
        if (Number(curve.scaling) !== 2)
        {
            throw new TypeError(`${label} scaling must be 2`);
        }
        if (curve.defaultValue !== undefined
            && !Number.isFinite(Number(curve.defaultValue)))
        {
            throw new TypeError(`${label} defaultValue must be finite`);
        }
        if (!Array.isArray(curve.points) || !curve.points.length)
        {
            throw new TypeError(`${label} must have points`);
        }

        let previous = -Infinity;

        for (let pointIndex = 0;
            pointIndex < curve.points.length;
            pointIndex++)
        {
            const pointLabel = `${label} point ${pointIndex}`;
            const point = RequireRecord(curve.points[pointIndex], pointLabel);
            const x = Number(point.x);
            const value = Number(point.value);
            const interpolation = Number(point.interpolation ?? 4);

            if (!Number.isFinite(x) || x < previous)
            {
                throw new TypeError(
                    `${pointLabel} x must be finite and non-decreasing`,
                );
            }
            if (!Number.isFinite(value) || value < -1 || value > 1)
            {
                throw new TypeError(
                    `${pointLabel} value must be between -1 and 1`,
                );
            }
            if (!Number.isSafeInteger(interpolation)
                || interpolation < 0
                || interpolation > 9)
            {
                throw new TypeError(
                    `${pointLabel} interpolation must be from 0 to 9`,
                );
            }
            previous = x;
        }
    }
}

function RequireRecord(value, label)
{
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(`${label} must be an object`);
    }

    return value;
}

function NormalizeUnsignedID(value, label)
{
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 0 || number > 0xffffffff)
    {
        throw new TypeError(`${label} must be an unsigned 32-bit integer`);
    }

    return String(number >>> 0);
}

function NormalizePositiveID(value, label)
{
    const id = NormalizeUnsignedID(value, label);

    if (id === "0")
    {
        throw new TypeError(`${label} must be greater than zero`);
    }

    return id;
}

function NormalizeNonNegativeInteger(value, label)
{
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 0)
    {
        throw new TypeError(`${label} must be a non-negative integer`);
    }

    return number;
}

function NormalizePositiveInteger(value, label)
{
    const number = NormalizeNonNegativeInteger(value, label);

    if (number === 0)
    {
        throw new TypeError(`${label} must be greater than zero`);
    }

    return number;
}

function NormalizeLanguage(value)
{
    const language = String(value ?? "")
        .trim()
        .replaceAll("_", "-")
        .toLowerCase();

    if (language
        && !/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/u.test(language))
    {
        throw new TypeError(`Invalid audio language tag: ${value}`);
    }

    return language;
}

function NormalizeBankName(value)
{
    const name = String(value ?? "")
        .trim()
        .replaceAll("\\", "/")
        .split("/")
        .pop()
        .toLowerCase();

    if (!name)
    {
        throw new TypeError("Audio library bank name is required");
    }

    return name;
}

function CloneJSONValue(value, label)
{
    if (value === null
        || typeof value === "string"
        || typeof value === "boolean")
    {
        return value;
    }

    if (typeof value === "number")
    {
        if (!Number.isFinite(value))
        {
            throw new TypeError(`${label} contains a non-finite number`);
        }

        return value;
    }

    if (Array.isArray(value))
    {
        return Object.freeze(value.map((entry, index) =>
            CloneJSONValue(entry, `${label}[${index}]`)));
    }

    if (!value || typeof value !== "object")
    {
        throw new TypeError(`${label} contains a non-JSON value`);
    }

    const result = {};

    for (const key of Object.keys(value))
    {
        result[key] = CloneJSONValue(value[key], `${label}.${key}`);
    }

    return Object.freeze(result);
}
