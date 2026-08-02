import {
    normalizeSfxGraph,
    ValidateStateTransitions,
    validateSfxGraph,
} from "./sfxGraph.js";
import { indexBusDuckingCatalog } from "../internal/busDucking.js";

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
    if (value.sfx !== undefined)
    {
        validateSfxGraph(
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
    indexBusDuckingCatalog(value.busDucking);

    return true;
}

function ValidateBusStates(value)
{
    if (value === undefined)
    {
        return;
    }

    const catalog = RequireRecord(value, "Audio library busStates");

    if (catalog.schemaVersion !== 1)
    {
        throw new TypeError(
            `Unsupported audio bus State schema version: ${catalog.schemaVersion}`,
        );
    }
    if (catalog.property !== "bus-volume"
        || catalog.accumulation !== "additive"
        || catalog.unit !== "db")
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
                if (!Number.isFinite(Number(state.gainDb)))
                {
                    throw new TypeError(`${stateLabel} gainDb must be finite`);
                }
                if (Number(state.gainDb) < -200
                    || Number(state.gainDb) > 200)
                {
                    throw new TypeError(
                        `${stateLabel} gainDb must be from -200 to 200`,
                    );
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
}

function ValidateBusRtpcs(value)
{
    if (value === undefined)
    {
        return;
    }

    const catalog = RequireRecord(value, "Audio library busRtpcs");

    if (catalog.schemaVersion !== 1)
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
    const normalized = value.sfx === undefined
        ? value
        : {
            ...value,
            sfx: normalizeSfxGraph(
                value.sfx,
                value.media,
                value.embeddedMedia ?? {},
            ),
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
    if (node.type === "silence")
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
        NormalizePositiveID(id, `Audio library music node ${id}`);
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

    RequireRecord(
        music.switchSetters,
        "Audio library music switchSetters",
    );
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
