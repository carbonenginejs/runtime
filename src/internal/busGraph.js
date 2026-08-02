const BUS_TYPES = new Set([ "audio-bus", "auxiliary-bus" ]);
const EFFECT_TYPES = new Set([ "effect-custom", "effect-share-set" ]);
const PROCESSING_REASONS = new Set([
    "auxiliary-bus",
    "aux-sends",
    "ducking",
    "dynamic-aux",
    "effects",
    "hdr",
    "positioning",
    "rtpc",
    "state",
]);
const GAIN_PROPERTY_FIELDS = new Map([
    [ 0x04, "busVolumeDb" ],
    [ 0x05, "makeUpGainDb" ],
    [ 0x0d, "outputBusVolumeDb" ],
]);

/** Validates and normalizes one portable Wwise bus-topology catalog. */
export function normalizeBusGraphCatalog(value, embeddedMedia = {})
{
    const catalog = RequireRecord(value, "Audio Bus graph");

    if (catalog.schemaVersion !== 1)
    {
        throw new TypeError(
            `Unsupported audio bus graph schema version: ${catalog.schemaVersion}`,
        );
    }
    const rawEffects = RequireRecord(
        catalog.effects,
        "Audio Bus graph effects",
    );
    const effects = {};

    for (const rawEffectId of Object.keys(rawEffects).sort(CompareIds))
    {
        const effectId = CanonicalPositiveId(
            rawEffectId,
            `Audio Bus graph effect ${rawEffectId}`,
        );
        const raw = RequireRecord(
            rawEffects[rawEffectId],
            `Audio Bus graph effect ${effectId}`,
        );

        if (!EFFECT_TYPES.has(raw.type))
        {
            throw new TypeError(
                `Audio Bus graph effect ${effectId} has unsupported type ${raw.type}`,
            );
        }
        const parametersBase64 = CanonicalBase64(
            raw.parametersBase64,
            `Audio Bus graph effect ${effectId} parametersBase64`,
        );
        const parameterByteLength = NonNegativeInteger(
            raw.parameterByteLength,
            `Audio Bus graph effect ${effectId} parameterByteLength`,
        );

        if (Base64ByteLength(parametersBase64) !== parameterByteLength)
        {
            throw new TypeError(
                `Audio Bus graph effect ${effectId} parameter length does not match`,
            );
        }
        const media = NormalizeEffectMedia(
            raw.media ?? [],
            effectId,
            embeddedMedia,
        );
        const controls = RequireRecord(
            raw.controls,
            `Audio Bus graph effect ${effectId} controls`,
        );

        const pluginId = UnsignedInteger(
            raw.pluginId,
            `Audio Bus graph effect ${effectId} pluginId`,
        );
        const pluginType = BoundedInteger(
            raw.pluginType,
            0,
            0x0f,
            `Audio Bus graph effect ${effectId} pluginType`,
        );
        const companyId = BoundedInteger(
            raw.companyId,
            0,
            0x0fff,
            `Audio Bus graph effect ${effectId} companyId`,
        );
        const pluginClassId = BoundedInteger(
            raw.pluginClassId,
            0,
            0xffff,
            `Audio Bus graph effect ${effectId} pluginClassId`,
        );
        const packedPluginId = (
            (pluginClassId << 16)
            | (companyId << 4)
            | pluginType
        ) >>> 0;

        if (pluginId !== packedPluginId)
        {
            throw new TypeError(
                `Audio Bus graph effect ${effectId} has inconsistent plugin identity`,
            );
        }

        effects[effectId] = {
            type: raw.type,
            pluginId,
            pluginType,
            companyId,
            pluginClassId,
            parameterByteLength,
            parametersBase64,
            media,
            controls: {
                rtpcCount: NonNegativeInteger(
                    controls.rtpcCount,
                    `Audio Bus graph effect ${effectId} controls.rtpcCount`,
                ),
                statePropertyCount: NonNegativeInteger(
                    controls.statePropertyCount,
                    `Audio Bus graph effect ${effectId} controls.statePropertyCount`,
                ),
                stateGroupCount: NonNegativeInteger(
                    controls.stateGroupCount,
                    `Audio Bus graph effect ${effectId} controls.stateGroupCount`,
                ),
                propertyValueCount: NonNegativeInteger(
                    controls.propertyValueCount,
                    `Audio Bus graph effect ${effectId} controls.propertyValueCount`,
                ),
            },
        };
    }

    const rawBuses = RequireRecord(catalog.buses, "Audio Bus graph buses");
    const buses = {};

    for (const rawBusId of Object.keys(rawBuses).sort(CompareIds))
    {
        const busId = CanonicalPositiveId(
            rawBusId,
            `Audio Bus graph bus ${rawBusId}`,
        );
        const raw = RequireRecord(
            rawBuses[rawBusId],
            `Audio Bus graph bus ${busId}`,
        );

        if (!BUS_TYPES.has(raw.type))
        {
            throw new TypeError(
                `Audio Bus graph bus ${busId} has unsupported type ${raw.type}`,
            );
        }
        const parentBusId = raw.parentBusId === undefined
            ? undefined
            : CanonicalPositiveId(
                raw.parentBusId,
                `Audio Bus graph bus ${busId} parentBusId`,
            );

        if (parentBusId === busId)
        {
            throw new TypeError(`Audio Bus graph bus ${busId} parents itself`);
        }
        const channelConfig = RequireRecord(
            raw.channelConfig,
            `Audio Bus graph bus ${busId} channelConfig`,
        );
        const bus = {
            type: raw.type,
            ...(parentBusId === undefined ? {} : { parentBusId }),
            channelConfig: {
                raw: UnsignedInteger(
                    channelConfig.raw,
                    `Audio Bus graph bus ${busId} channelConfig.raw`,
                ),
                channelCount: BoundedInteger(
                    channelConfig.channelCount,
                    0,
                    0xff,
                    `Audio Bus graph bus ${busId} channelConfig.channelCount`,
                ),
                configType: BoundedInteger(
                    channelConfig.configType,
                    0,
                    0x0f,
                    `Audio Bus graph bus ${busId} channelConfig.configType`,
                ),
                channelMask: BoundedInteger(
                    channelConfig.channelMask,
                    0,
                    0xfffff,
                    `Audio Bus graph bus ${busId} channelConfig.channelMask`,
                ),
            },
            properties: NormalizeProperties(raw.properties ?? [], busId),
            positioning: NormalizePositioning(raw.positioning, busId),
            hdr: NormalizeHdr(raw.hdr, busId),
            auxFlags: BoundedInteger(
                raw.auxFlags,
                0,
                0xff,
                `Audio Bus graph bus ${busId} auxFlags`,
            ),
            bypassAllEffects: BooleanValue(
                raw.bypassAllEffects,
                `Audio Bus graph bus ${busId} bypassAllEffects`,
            ),
            userAuxSends: NormalizeAuxSends(
                raw.userAuxSends ?? [],
                `Audio Bus graph bus ${busId}`,
            ),
            effects: NormalizeEffectSlots(raw.effects ?? [], busId, effects),
            requiresProcessing: NormalizeProcessingReasons(
                raw.requiresProcessing ?? [],
                busId,
            ),
        };

        if (bus.channelConfig.raw !== (
            bus.channelConfig.channelCount
            | (bus.channelConfig.configType << 8)
            | (bus.channelConfig.channelMask << 12)
        ) >>> 0)
        {
            throw new TypeError(`Audio Bus graph bus ${busId} has inconsistent channel configuration`);
        }
        if (bus.positioning.overrideParent !== Boolean(bus.positioning.flags & 0x01)
            || bus.positioning.listenerRelative !== Boolean(bus.positioning.flags & 0x02)
            || bus.positioning.pannerType !== ((bus.positioning.flags >>> 2) & 0x03)
            || bus.positioning.positionType !== ((bus.positioning.flags >>> 5) & 0x03))
        {
            throw new TypeError(`Audio Bus graph bus ${busId} has inconsistent positioning flags`);
        }
        if (bus.hdr.enabled !== Boolean(bus.hdr.flags & 0x01)
            || bus.hdr.exponentialRelease !== Boolean(bus.hdr.flags & 0x02))
        {
            throw new TypeError(`Audio Bus graph bus ${busId} has inconsistent HDR flags`);
        }

        for (const field of [
            "busVolumeDb",
            "makeUpGainDb",
            "outputBusVolumeDb",
        ])
        {
            if (raw[field] !== undefined)
            {
                bus[field] = FiniteNumber(
                    raw[field],
                    `Audio Bus graph bus ${busId} ${field}`,
                );
            }
        }
        ValidateGainProperties(bus, busId);
        if (raw.reflectionsAuxSend !== undefined)
        {
            bus.reflectionsAuxSend = NormalizeReflectionSend(
                raw.reflectionsAuxSend,
                `Audio Bus graph bus ${busId}`,
            );
        }
        if (bus.userAuxSends.length && !(bus.auxFlags & 0x08))
        {
            throw new TypeError(`Audio Bus graph bus ${busId} aux flags do not enable its user sends`);
        }
        if (bus.userAuxSends.length
            && bus.parentBusId !== undefined
            && !(bus.auxFlags & 0x04))
        {
            throw new TypeError(`Audio Bus graph bus ${busId} does not override its inherited user sends`);
        }
        if (bus.reflectionsAuxSend
            && bus.parentBusId !== undefined
            && !(bus.auxFlags & 0x10))
        {
            throw new TypeError(`Audio Bus graph bus ${busId} aux flags do not enable reflections`);
        }
        ValidateRequiredProcessing(bus, busId);
        buses[busId] = bus;
    }

    ValidateBusReferences(buses);
    ValidateBusGraphCycles(buses);
    const routes = NormalizeRoutes(catalog.routes, buses);
    ValidateAuxTargets(buses, routes);
    const sfxRoutes = NormalizeRouteReferences(
        catalog.sfxRoutes,
        routes.length,
        "Audio Bus graph sfxRoutes",
    );
    const musicRoutes = NormalizeRouteReferences(
        catalog.musicRoutes,
        routes.length,
        "Audio Bus graph musicRoutes",
    );

    ValidateReferencedRoutes(routes, sfxRoutes, musicRoutes);
    ValidateReachableClosure(buses, routes);
    ValidateReferencedEffects(buses, effects);
    return {
        schemaVersion: 1,
        buses,
        effects,
        routes,
        sfxRoutes,
        musicRoutes,
    };
}

/** Rejects a consumer's dry-route projection when it disagrees with one catalog route. */
export function assertBusGraphRouteProjection(route, projection, label)
{
    const expected = RequireRecord(route, `${label} route`);
    const actual = RequireRecord(projection, `${label} projection`);
    const outputBusId = actual.outputBusId === undefined
        ? undefined
        : CanonicalPositiveId(actual.outputBusId, `${label} outputBusId`);
    const busPathIds = Array.isArray(actual.busPathIds)
        ? actual.busPathIds.map((id, index) =>
            CanonicalPositiveId(id, `${label} busPathIds ${index}`))
        : [];

    if (outputBusId !== expected.outputBusId
        || busPathIds.length !== expected.busPathIds.length
        || busPathIds.some((id, index) => id !== expected.busPathIds[index]))
    {
        throw new TypeError(`${label} dry route disagrees with the Audio Bus graph`);
    }
    for (const field of [
        "authoredBusVolumeDb",
        "authoredBusMakeUpGainDb",
        "authoredOutputBusVolumeDb",
    ])
    {
        const expectedHas = Object.hasOwn(expected, field);
        const actualHas = actual[field] !== undefined;

        if (expectedHas !== actualHas
            || (expectedHas && expected[field] !== Number(actual[field])))
        {
            throw new TypeError(`${label} ${field} disagrees with the Audio Bus graph`);
        }
    }
    return true;
}

function ValidateGainProperties(bus, busId)
{
    for (const [ propertyId, field ] of GAIN_PROPERTY_FIELDS)
    {
        const property = bus.properties.find(value => value.id === propertyId);
        const hasTypedValue = Object.hasOwn(bus, field);

        if (!property && !hasTypedValue) continue;
        if (!property || !hasTypedValue)
        {
            throw new TypeError(`Audio Bus graph bus ${busId} has inconsistent ${field} presence`);
        }
        const bytes = new ArrayBuffer(4);
        const view = new DataView(bytes);

        view.setUint32(0, property.rawValue, true);
        const decoded = view.getFloat32(0, true);

        if (!Number.isFinite(decoded) || decoded !== bus[field])
        {
            throw new TypeError(`Audio Bus graph bus ${busId} has inconsistent ${field}`);
        }
    }
}

function NormalizeEffectMedia(values, effectId, embeddedMedia)
{
    if (!Array.isArray(values))
    {
        throw new TypeError(`Audio Bus graph effect ${effectId} media must be an array`);
    }
    const indices = new Set();

    return values.map((raw, offset) =>
    {
        const label = `Audio Bus graph effect ${effectId} media ${offset}`;
        const value = RequireRecord(raw, label);
        const index = BoundedInteger(value.index, 0, 0xff, `${label} index`);
        const sourceId = CanonicalPositiveId(value.sourceId, `${label} sourceId`);

        if (indices.has(index)) throw new TypeError(`${label} duplicates index ${index}`);
        indices.add(index);
        if (!Object.hasOwn(embeddedMedia, sourceId))
        {
            throw new TypeError(`${label} references unavailable embedded media ${sourceId}`);
        }
        return { index, sourceId };
    }).sort((left, right) => left.index - right.index);
}

function NormalizeProperties(values, busId)
{
    if (!Array.isArray(values))
    {
        throw new TypeError(`Audio Bus graph bus ${busId} properties must be an array`);
    }
    const ids = new Set();

    return values.map((raw, offset) =>
    {
        const label = `Audio Bus graph bus ${busId} property ${offset}`;
        const value = RequireRecord(raw, label);
        const id = BoundedInteger(value.id, 0, 0xff, `${label} id`);

        if (ids.has(id)) throw new TypeError(`${label} duplicates id ${id}`);
        ids.add(id);
        return {
            id,
            rawValue: UnsignedInteger(value.rawValue, `${label} rawValue`),
        };
    }).sort((left, right) => left.id - right.id);
}

function NormalizePositioning(value, busId)
{
    const raw = RequireRecord(
        value,
        `Audio Bus graph bus ${busId} positioning`,
    );

    return {
        flags: BoundedInteger(raw.flags, 0, 0xff, `Audio Bus graph bus ${busId} positioning.flags`),
        overrideParent: BooleanValue(raw.overrideParent, `Audio Bus graph bus ${busId} positioning.overrideParent`),
        listenerRelative: BooleanValue(raw.listenerRelative, `Audio Bus graph bus ${busId} positioning.listenerRelative`),
        pannerType: BoundedInteger(raw.pannerType, 0, 3, `Audio Bus graph bus ${busId} positioning.pannerType`),
        positionType: BoundedInteger(raw.positionType, 0, 2, `Audio Bus graph bus ${busId} positioning.positionType`),
    };
}

function NormalizeHdr(value, busId)
{
    const raw = RequireRecord(value, `Audio Bus graph bus ${busId} hdr`);

    return {
        flags: BoundedInteger(raw.flags, 0, 0xff, `Audio Bus graph bus ${busId} hdr.flags`),
        enabled: BooleanValue(raw.enabled, `Audio Bus graph bus ${busId} hdr.enabled`),
        exponentialRelease: BooleanValue(raw.exponentialRelease, `Audio Bus graph bus ${busId} hdr.exponentialRelease`),
    };
}

function NormalizeAuxSends(values, label)
{
    if (!Array.isArray(values)) throw new TypeError(`${label} userAuxSends must be an array`);
    const slots = new Set();

    return values.map((raw, offset) =>
    {
        const sendLabel = `${label} userAuxSend ${offset}`;
        const value = RequireRecord(raw, sendLabel);
        const slotIndex = BoundedInteger(value.slotIndex, 0, 3, `${sendLabel} slotIndex`);

        if (slots.has(slotIndex)) throw new TypeError(`${sendLabel} duplicates slot ${slotIndex}`);
        slots.add(slotIndex);
        return {
            slotIndex,
            targetBusId: CanonicalPositiveId(value.targetBusId, `${sendLabel} targetBusId`),
            gainDb: FiniteNumber(value.gainDb, `${sendLabel} gainDb`),
            lowPass: BoundedFinite(value.lowPass, 0, 100, `${sendLabel} lowPass`),
            highPass: BoundedFinite(value.highPass, 0, 100, `${sendLabel} highPass`),
            dynamic: BooleanValue(value.dynamic, `${sendLabel} dynamic`),
        };
    }).sort((left, right) => left.slotIndex - right.slotIndex);
}

function NormalizeReflectionSend(raw, label)
{
    const value = RequireRecord(raw, `${label} reflectionsAuxSend`);

    return {
        targetBusId: CanonicalPositiveId(
            value.targetBusId,
            `${label} reflectionsAuxSend targetBusId`,
        ),
        gainDb: FiniteNumber(value.gainDb, `${label} reflectionsAuxSend gainDb`),
        dynamic: BooleanValue(value.dynamic, `${label} reflectionsAuxSend dynamic`),
    };
}

function NormalizeEffectSlots(values, busId, effects)
{
    if (!Array.isArray(values))
    {
        throw new TypeError(`Audio Bus graph bus ${busId} effects must be an array`);
    }
    const slots = new Set();

    return values.map((raw, offset) =>
    {
        const label = `Audio Bus graph bus ${busId} effect ${offset}`;
        const value = RequireRecord(raw, label);
        const slotIndex = BoundedInteger(value.slotIndex, 0, 3, `${label} slotIndex`);
        const effectId = CanonicalPositiveId(value.effectId, `${label} effectId`);

        if (slots.has(slotIndex)) throw new TypeError(`${label} duplicates slot ${slotIndex}`);
        slots.add(slotIndex);
        if (!effects[effectId]) throw new TypeError(`${label} references missing effect ${effectId}`);
        const shareSet = BooleanValue(value.shareSet, `${label} shareSet`);

        if (shareSet !== (effects[effectId].type === "effect-share-set"))
        {
            throw new TypeError(`${label} has a mismatched ShareSet flag`);
        }
        return {
            slotIndex,
            effectId,
            bypass: BooleanValue(value.bypass, `${label} bypass`),
            shareSet,
            rendered: BooleanValue(value.rendered, `${label} rendered`),
        };
    }).sort((left, right) => left.slotIndex - right.slotIndex);
}

function ValidateRequiredProcessing(bus, busId)
{
    const required = new Set();

    if (bus.type === "auxiliary-bus") required.add("auxiliary-bus");
    if (bus.userAuxSends.length || bus.reflectionsAuxSend) required.add("aux-sends");
    if (bus.userAuxSends.some(send => send.dynamic)
        || bus.reflectionsAuxSend?.dynamic)
    {
        required.add("dynamic-aux");
    }
    if (!bus.bypassAllEffects && bus.effects.some(slot => !slot.bypass))
    {
        required.add("effects");
    }
    if (bus.positioning.listenerRelative) required.add("positioning");
    if (bus.hdr.enabled) required.add("hdr");

    for (const reason of required)
    {
        if (!bus.requiresProcessing.includes(reason))
        {
            throw new TypeError(`Audio Bus graph bus ${busId} omits required processing reason ${reason}`);
        }
    }
}

function NormalizeProcessingReasons(values, busId)
{
    if (!Array.isArray(values))
    {
        throw new TypeError(`Audio Bus graph bus ${busId} requiresProcessing must be an array`);
    }
    const reasons = [ ...new Set(values.map(String)) ].sort();

    for (const reason of reasons)
    {
        if (!PROCESSING_REASONS.has(reason))
        {
            throw new TypeError(`Audio Bus graph bus ${busId} has unsupported processing reason ${reason}`);
        }
    }
    return reasons;
}

function NormalizeRoutes(values, buses)
{
    if (!Array.isArray(values)) throw new TypeError("Audio Bus graph routes must be an array");

    return values.map((raw, index) =>
    {
        const label = `Audio Bus graph route ${index}`;
        const value = RequireRecord(raw, label);
        const outputBusId = CanonicalPositiveId(value.outputBusId, `${label} outputBusId`);

        if (!Array.isArray(value.busPathIds) || !value.busPathIds.length)
        {
            throw new TypeError(`${label} busPathIds must be non-empty`);
        }
        const busPathIds = value.busPathIds.map((id, offset) =>
            CanonicalPositiveId(id, `${label} busPathIds ${offset}`));

        if (busPathIds[0] !== outputBusId)
        {
            throw new TypeError(`${label} busPathIds must start at outputBusId`);
        }
        for (let offset = 0; offset < busPathIds.length; offset++)
        {
            const bus = buses[busPathIds[offset]];

            if (!bus) throw new TypeError(`${label} references missing bus ${busPathIds[offset]}`);
            const expected = offset + 1 < busPathIds.length
                ? busPathIds[offset + 1]
                : undefined;

            if (bus.parentBusId !== expected)
            {
                throw new TypeError(`${label} busPathIds do not follow bus ancestry`);
            }
        }
        const route = {
            outputBusId,
            busPathIds,
            userAuxSends: NormalizeAuxSends(value.userAuxSends ?? [], label),
        };

        for (const field of [
            "authoredBusVolumeDb",
            "authoredBusMakeUpGainDb",
            "authoredOutputBusVolumeDb",
        ])
        {
            if (value[field] !== undefined)
            {
                route[field] = FiniteNumber(value[field], `${label} ${field}`);
            }
        }
        if (value.reflectionsAuxSend !== undefined)
        {
            route.reflectionsAuxSend = NormalizeReflectionSend(value.reflectionsAuxSend, label);
        }
        return route;
    });
}

function NormalizeRouteReferences(value, routeCount, label)
{
    const raw = RequireRecord(value, label);
    const result = {};

    for (const rawNodeId of Object.keys(raw).sort(CompareIds))
    {
        const nodeId = CanonicalPositiveId(rawNodeId, `${label} ${rawNodeId}`);
        result[nodeId] = BoundedInteger(raw[rawNodeId], 0, routeCount - 1, `${label} ${nodeId}`);
    }
    return result;
}

function ValidateReferencedRoutes(routes, sfxRoutes, musicRoutes)
{
    const referenced = new Set([
        ...Object.values(sfxRoutes),
        ...Object.values(musicRoutes),
    ]);

    for (let index = 0; index < routes.length; index++)
    {
        if (!referenced.has(index))
        {
            throw new TypeError(`Audio Bus graph has unreferenced route ${index}`);
        }
    }
}

function ValidateBusReferences(buses)
{
    for (const [ busId, bus ] of Object.entries(buses))
    {
        for (const targetId of [
            bus.parentBusId,
            ...bus.userAuxSends.map(send => send.targetBusId),
            bus.reflectionsAuxSend?.targetBusId,
        ].filter(Boolean))
        {
            if (!buses[targetId])
            {
                throw new TypeError(`Audio Bus graph bus ${busId} references missing bus ${targetId}`);
            }
        }
    }
}

function ValidateAuxTargets(buses, routes)
{
    const validate = (send, label) =>
    {
        if (buses[send.targetBusId]?.type !== "auxiliary-bus")
        {
            throw new TypeError(`${label} must target an auxiliary bus`);
        }
    };

    for (const [ busId, bus ] of Object.entries(buses))
    {
        for (const send of bus.userAuxSends)
        {
            validate(send, `Audio Bus graph bus ${busId} user Aux send`);
        }
        if (bus.reflectionsAuxSend)
        {
            validate(bus.reflectionsAuxSend, `Audio Bus graph bus ${busId} reflections send`);
        }
    }
    for (let index = 0; index < routes.length; index++)
    {
        for (const send of routes[index].userAuxSends)
        {
            validate(send, `Audio Bus graph route ${index} user Aux send`);
        }
        if (routes[index].reflectionsAuxSend)
        {
            validate(routes[index].reflectionsAuxSend, `Audio Bus graph route ${index} reflections send`);
        }
    }
}

function ValidateBusGraphCycles(buses)
{
    const visiting = new Set();
    const visited = new Set();
    const visit = busId =>
    {
        if (visiting.has(busId)) throw new TypeError(`Audio Bus graph cycle at ${busId}`);
        if (visited.has(busId)) return;
        visiting.add(busId);
        const bus = buses[busId];

        if (bus.parentBusId) visit(bus.parentBusId);
        visiting.delete(busId);
        visited.add(busId);
    };

    for (const busId of Object.keys(buses)) visit(busId);
}

function ValidateReachableClosure(buses, routes)
{
    const reachable = new Set();
    const pending = routes.flatMap(route => [
        route.outputBusId,
        ...route.userAuxSends.map(send => send.targetBusId),
        route.reflectionsAuxSend?.targetBusId,
    ].filter(Boolean));

    while (pending.length)
    {
        const busId = pending.pop();

        if (reachable.has(busId)) continue;
        const bus = buses[busId];

        if (!bus) throw new TypeError(`Audio Bus graph route references missing bus ${busId}`);
        reachable.add(busId);
        pending.push(...[
            bus.parentBusId,
            ...bus.userAuxSends.map(send => send.targetBusId),
            bus.reflectionsAuxSend?.targetBusId,
        ].filter(Boolean));
    }
    for (const busId of Object.keys(buses))
    {
        if (!reachable.has(busId)) throw new TypeError(`Audio Bus graph has unreachable bus ${busId}`);
    }
}

function ValidateReferencedEffects(buses, effects)
{
    const referenced = new Set(Object.values(buses)
        .flatMap(bus => bus.effects.map(slot => slot.effectId)));

    for (const effectId of Object.keys(effects))
    {
        if (!referenced.has(effectId))
        {
            throw new TypeError(`Audio Bus graph has unreferenced effect ${effectId}`);
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

function CanonicalPositiveId(value, label)
{
    const text = String(value);
    const number = Number(text);

    if (!Number.isSafeInteger(number) || number <= 0 || number > 0xffffffff || String(number) !== text)
    {
        throw new TypeError(`${label} must be a canonical positive id`);
    }
    return text;
}

function UnsignedInteger(value, label)
{
    return BoundedInteger(value, 0, 0xffffffff, label);
}

function NonNegativeInteger(value, label)
{
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 0)
    {
        throw new TypeError(`${label} must be a nonnegative integer`);
    }
    return number;
}

function BoundedInteger(value, min, max, label)
{
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < min || number > max)
    {
        throw new TypeError(`${label} must be from ${min} to ${max}`);
    }
    return number;
}

function FiniteNumber(value, label)
{
    const number = Number(value);

    if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite`);
    return number;
}

function BoundedFinite(value, min, max, label)
{
    const number = FiniteNumber(value, label);

    if (number < min || number > max) throw new TypeError(`${label} must be from ${min} to ${max}`);
    return number;
}

function BooleanValue(value, label)
{
    if (typeof value !== "boolean") throw new TypeError(`${label} must be boolean`);
    return value;
}

function CanonicalBase64(value, label)
{
    const text = String(value ?? "");

    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(text))
    {
        throw new TypeError(`${label} must be canonical base64`);
    }
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    if ((text.endsWith("==") && (alphabet.indexOf(text.at(-3)) & 0x0f) !== 0)
        || (text.endsWith("=")
            && !text.endsWith("==")
            && (alphabet.indexOf(text.at(-2)) & 0x03) !== 0))
    {
        throw new TypeError(`${label} must be canonical base64`);
    }
    return text;
}

function Base64ByteLength(value)
{
    if (!value.length) return 0;
    return value.length / 4 * 3
        - (value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0);
}

function CompareIds(left, right)
{
    return Number(left) - Number(right);
}
