import { CjsSchema } from "#schema";

// CarbonEngineJS original (no Carbon counterpart).
import { CjsBnkFormat } from "#resource/formats/bnk";
import { CjsAudioLibraryBuilderWwiseNodeBaseAncestry } from "./CjsAudioLibraryBuilderWwiseNodeBaseAncestry.js";
import { CjsAudioLibraryBuilderUtils, BUS_RTPC_PROPERTIES, BUS_MAX_NUM_INSTANCES_RTPC_PROPERTY } from "./CjsAudioLibraryBuilderUtils.js";

/** Owns Wwise Bus graph qualification, route interning, and projection. */
export class CjsAudioLibraryBuilderBusGraphConstructionSession
{
    _buses = null;

    _candidates = [];

    _effectsResult = null;

    _graphBuses = {};

    _graphEffects = {};

    _inspections = null;

    _musicAncestry = null;

    _musicInspections = null;

    _musicResult = null;

    _musicRoutes = {};

    _reachable = new Set();

    _routes = [];

    _sfxAncestry = null;

    _sfxResult = null;

    _sfxRoutes = {};

    /** Creates one construction session for already parsed Audio Buses. */
    constructor({ inspections, musicInspections, buses })
    {
        this._inspections = inspections;
        this._musicInspections = musicInspections;
        this._buses = buses;
    }

    /** Builds one deterministic plain Bus graph catalog. */
    Build()
    {
        this._ParseSources();
        this._CollectCandidates();
        this._InternRoutes();
        this._CollectReachableBuses();
        this._ProjectBuses();

        return {
            schemaVersion: 1,
            buses: this._graphBuses,
            effects: Object.fromEntries(Object.entries(this._graphEffects)
                .sort(([ left ], [ right ]) => Number(left) - Number(right))),
            routes: this._routes,
            sfxRoutes: this._sfxRoutes,
            musicRoutes: this._musicRoutes,
        };
    }

    /** Parses and qualifies every source catalog used by Bus routing. */
    _ParseSources()
    {
        this._effectsResult = CjsBnkFormat.wwise.effectNodesFromBanks(
            this._inspections,
        );
        this._sfxResult = CjsBnkFormat.wwise.sfxNodesFromBanks(
            this._inspections,
        );
        this._musicResult = this._musicInspections.length
            ? CjsBnkFormat.wwise.musicNodesFromBanks(this._musicInspections)
            : {
                nodes: new Map(),
                diagnostics: { failed: [], unsupportedVersions: [] },
            };

        if (this._effectsResult.diagnostics.failed.length
            || this._effectsResult.diagnostics.unsupportedVersions.length
            || this._sfxResult.diagnostics.failed.length
            || this._sfxResult.diagnostics.unsupportedVersions?.length
            || this._musicResult.diagnostics.failed.length
            || this._musicResult.diagnostics.unsupportedVersions?.length)
        {
            throw new Error("Audio Bus graph qualification failed");
        }
        this._sfxAncestry = new CjsAudioLibraryBuilderWwiseNodeBaseAncestry(
            id => this._sfxResult.nodeBases.get(id),
        );
        this._musicAncestry = new CjsAudioLibraryBuilderWwiseNodeBaseAncestry(
            id => this._musicResult.nodes.get(id)?.nodeBase,
        );
    }

    /** Collects every routed SFX Sound and Music Track candidate. */
    _CollectCandidates()
    {
        for (const [ id, node ] of this._sfxResult.nodes)
        {
            if (node.type !== "sound") continue;
            const routing = CjsAudioLibraryBuilderUtils.createSfxBusRouting(
                this._sfxAncestry,
                id,
                this._buses,
            );

            if (!routing) continue;
            this._candidates.push({
                kind: "sfx",
                nodeId: String(id),
                route: {
                    ...routing,
                    ...CjsAudioLibraryBuilderUtils.createEffectiveNodeAuxRouting(id, this._sfxAncestry),
                },
            });
        }
        for (const [ id, node ] of this._musicResult.nodes)
        {
            if (node.type !== "music-track") continue;
            const routing = CjsAudioLibraryBuilderUtils.createMusicBusRouting(
                this._musicAncestry,
                id,
                this._buses,
            );

            if (!routing) continue;
            this._candidates.push({
                kind: "music",
                nodeId: String(id),
                route: {
                    ...routing,
                    ...CjsAudioLibraryBuilderUtils.createEffectiveNodeAuxRouting(id, this._musicAncestry),
                },
            });
        }
    }

    /** Interns identical routes and assigns stable indices by signature. */
    _InternRoutes()
    {
        const routesBySignature = new Map();

        for (const candidate of this._candidates)
        {
            const signature = JSON.stringify(candidate.route);

            if (!routesBySignature.has(signature))
            {
                routesBySignature.set(signature, candidate.route);
            }
            candidate.signature = signature;
        }
        const signatures = [ ...routesBySignature.keys() ].sort();
        const routeIndices = new Map(signatures.map((signature, index) => [
            signature,
            index,
        ]));

        this._routes = signatures.map(signature =>
            routesBySignature.get(signature));
        for (const candidate of this._candidates.sort((left, right) =>
            Number(left.nodeId) - Number(right.nodeId)))
        {
            const target = candidate.kind === "sfx"
                ? this._sfxRoutes
                : this._musicRoutes;

            target[candidate.nodeId] = routeIndices.get(candidate.signature);
        }
    }

    /** Finds the complete parent and auxiliary Bus closure for every route. */
    _CollectReachableBuses()
    {
        const pending = this._routes.flatMap(route => [
            ...route.busPathIds,
            ...(route.userAuxSends ?? []).map(send => send.targetBusId),
            route.reflectionsAuxSend?.targetBusId,
        ].filter(Boolean).map(Number));

        while (pending.length)
        {
            const busId = Number(pending.pop()) >>> 0;

            if (!busId || this._reachable.has(busId)) continue;
            const bus = this._buses.get(busId);

            if (!bus)
            {
                throw new Error(
                    `Audio Bus graph references missing bus ${busId}`,
                );
            }
            this._reachable.add(busId);
            const busAux = CreateAuthoredAuxRouting(
                bus,
                `Audio Bus ${busId}`,
            );

            pending.push(
                Number(bus.overrideBusId) >>> 0,
                ...(busAux.userAuxSends ?? [])
                    .map(send => Number(send.targetBusId)),
                Number(busAux.reflectionsAuxSend?.targetBusId) >>> 0,
            );
        }
    }

    /** Projects every reachable Bus and its qualified effect slots. */
    _ProjectBuses()
    {
        for (const busId of [ ...this._reachable ]
            .sort((left, right) => left - right))
        {
            const bus = this._buses.get(busId);
            const aux = CreateAuthoredAuxRouting(
                bus,
                `Audio Bus ${busId}`,
            );
            const slots = this._ProjectEffectSlots(busId, bus);

            this._graphBuses[String(busId)] = {
                type: bus.type,
                ...(Number(bus.overrideBusId) >>> 0
                    ? {
                        parentBusId: String(
                            Number(bus.overrideBusId) >>> 0,
                        ),
                    }
                    : {}),
                channelConfig: { ...bus.channelConfig },
                properties: [ ...(bus.properties ?? []) ]
                    .map(property => ({
                        id: Number(property.id),
                        rawValue: Number(property.rawValue) >>> 0,
                    }))
                    .sort((left, right) => left.id - right.id),
                positioning: {
                    flags: Number(bus.positioning?.flags) || 0,
                    overrideParent: Boolean(
                        bus.positioning?.overrideParent,
                    ),
                    listenerRelative: Boolean(
                        bus.positioning?.listenerRelative,
                    ),
                    pannerType: Number(bus.positioning?.pannerType) || 0,
                    positionType: Number(bus.positioning?.positionType) || 0,
                },
                hdr: {
                    flags: Number(bus.hdr?.flags) || 0,
                    enabled: Boolean(bus.hdr?.enabled),
                    exponentialRelease: Boolean(
                        bus.hdr?.exponentialRelease,
                    ),
                },
                auxFlags: Number(bus.aux?.flags) || 0,
                bypassAllEffects: Boolean(bus.fx?.bypassAll),
                ...(bus.busVolume === null || bus.busVolume === undefined
                    ? {}
                    : { busVolumeDb: Number(bus.busVolume) }),
                ...(bus.makeUpGain === null || bus.makeUpGain === undefined
                    ? {}
                    : { makeUpGainDb: Number(bus.makeUpGain) }),
                ...(bus.outputBusVolume === null
                    || bus.outputBusVolume === undefined
                    ? {}
                    : { outputBusVolumeDb: Number(bus.outputBusVolume) }),
                ...aux,
                effects: slots,
                requiresProcessing: this._CreateProcessingReasons(
                    bus,
                    aux,
                    slots,
                ),
            };
        }
    }

    /** Projects and registers one Bus's ordered effect slots. */
    _ProjectEffectSlots(busId, bus)
    {
        return [ ...(bus.fx?.slots ?? []) ]
            .sort((left, right) => left.index - right.index)
            .map(slot =>
            {
                if ((Number(slot.flags) & ~0x07) !== 0)
                {
                    throw new Error(
                        `Audio Bus ${busId} effect ${slot.fxId}`
                        + " has unsupported slot flags",
                    );
                }
                const effect = this._effectsResult.effects.get(slot.fxId);

                if (!effect)
                {
                    throw new Error(
                        `Audio Bus ${busId} effect ${slot.fxId} is missing`,
                    );
                }
                const expectsShareSet = effect.type === "effect-share-set";

                if (slot.shareSet !== expectsShareSet)
                {
                    throw new Error(
                        `Audio Bus ${busId} effect ${slot.fxId}`
                        + " has a mismatched ShareSet flag",
                    );
                }
                this._graphEffects[String(effect.id)] =
                    CjsAudioLibraryBuilderUtils.createPortableEffect(effect);
                return {
                    slotIndex: Number(slot.index),
                    effectId: String(effect.id),
                    bypass: Boolean(slot.bypass),
                    shareSet: Boolean(slot.shareSet),
                    rendered: Boolean(slot.rendered),
                };
            });
    }

    /** Classifies which authored Bus features require runtime processing. */
    _CreateProcessingReasons(bus, aux, slots)
    {
        const reasons = [];

        if (bus.type === "auxiliary-bus") reasons.push("auxiliary-bus");
        if (aux.userAuxSends?.length || aux.reflectionsAuxSend)
        {
            reasons.push("aux-sends");
        }
        if (aux.userAuxSends?.some(send => send.dynamic)
            || aux.reflectionsAuxSend?.dynamic)
        {
            reasons.push("dynamic-aux");
        }
        if (!bus.fx?.bypassAll && slots.some(slot => !slot.bypass))
        {
            reasons.push("effects");
        }
        if (bus.positioning?.listenerRelative) reasons.push("positioning");
        if (bus.hdr?.enabled) reasons.push("hdr");
        if (bus.rtpcs?.length)
        {
            const parameterIds = bus.rtpcs.map(rtpc =>
                Number(rtpc.parameterId));

            if (parameterIds.some(id => BUS_RTPC_PROPERTIES.has(id)))
            {
                reasons.push("rtpc");
            }
            if (parameterIds.includes(BUS_MAX_NUM_INSTANCES_RTPC_PROPERTY))
            {
                reasons.push("voice-limits");
            }
            if (parameterIds.some(id =>
                !BUS_RTPC_PROPERTIES.has(id)
                    && id !== BUS_MAX_NUM_INSTANCES_RTPC_PROPERTY))
            {
                reasons.push("unsupported-rtpc");
            }
        }
        if (bus.state?.properties?.length || bus.state?.groups?.length)
        {
            reasons.push("state");
        }
        if (bus.ducks?.length) reasons.push("ducking");

        return reasons.sort();
    }
}

function CreateAuthoredAuxRouting(value, label)
{
    const root = (Number(value.overrideBusId) >>> 0) === 0;
    const result = {
        ...(value.aux?.overrideUserAux || root
            ? { userAuxSends: CjsAudioLibraryBuilderUtils.createAuxSends(value, label) }
            : {}),
        ...(value.aux?.overrideReflectionsAux || root
            ? {
                reflectionsAuxSend: CjsAudioLibraryBuilderUtils.createReflectionsAuxSend(value, label),
            }
            : {}),
    };

    return result;
}

CjsSchema.meta.define(CjsAudioLibraryBuilderBusGraphConstructionSession, { className: "CjsAudioLibraryBuilderBusGraphConstructionSession" });
