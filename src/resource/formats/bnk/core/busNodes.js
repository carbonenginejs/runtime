// Exact Wwise v150 Audio Bus and Auxiliary Bus decoding. The HIRC payload
// supplied by inspect() starts after the object id. Records preserve authored
// routing, bus policy, ducking, effect references, metadata, RTPCs, and state
// without assigning runtime mixing or plug-in semantics.

import {
    boundedCount,
    finite,
    readAux,
    readInitialRtpcs,
    readPositioning,
    readStateChunk,
    WwiseCursor,
} from "./nodeBase.js";

const SUPPORTED_VERSION = 150;
const AUDIO_BUS_TYPE = 8;
const AUXILIARY_BUS_TYPE = 18;
const BUS_VOLUME_PROPERTY_ID = 0x04;
const MAKE_UP_GAIN_PROPERTY_ID = 0x05;
const OUTPUT_BUS_VOLUME_PROPERTY_ID = 0x0d;
const FINITE_GAIN_PROPERTY_IDS = new Set([
    BUS_VOLUME_PROPERTY_ID,
    MAKE_UP_GAIN_PROPERTY_ID,
    OUTPUT_BUS_VOLUME_PROPERTY_ID,
]);

/**
 * Decodes one complete v150 Audio or Auxiliary Bus body.
 *
 * @param {Uint8Array} payload Entry payload view from `inspect()`.
 * @param {object} [options] Bank-version qualification.
 * @returns {object|null} Typed bus body, or null when it is invalid.
 */
export function parseBusNode(
    payload,
    { bankVersion = SUPPORTED_VERSION } = {},
)
{
    if (!(payload instanceof Uint8Array)
        || Number(bankVersion) !== SUPPORTED_VERSION
        || payload.byteLength < 5)
    {
        return null;
    }

    try
    {
        const cursor = new WwiseCursor(payload);
        const overrideBusId = cursor.u32();
        let outputDeviceId = null;

        if (overrideBusId === 0)
        {
            outputDeviceId = cursor.u32();
        }

        const propertyCount = boundedCount(
            cursor.u8(),
            cursor.remaining,
            5,
            255,
        );
        const ids = [];
        const seen = new Set();
        const properties = [];

        for (let index = 0; index < propertyCount; index++)
        {
            ids.push(cursor.u8());
        }

        for (const id of ids)
        {
            if (seen.has(id)) return null;
            seen.add(id);

            const rawValue = cursor.u32();
            const valueBytes = new ArrayBuffer(4);
            const valueView = new DataView(valueBytes);

            valueView.setUint32(0, rawValue, true);
            const floatValue = valueView.getFloat32(0, true);

            if (FINITE_GAIN_PROPERTY_IDS.has(id)
                && !Number.isFinite(floatValue))
            {
                return null;
            }

            properties.push({ id, rawValue, floatValue });
        }

        const prefixByteLength = cursor.at;
        const positioning = readPositioning(cursor);
        const aux = readAux(cursor);
        const policyFlags = cursor.u8();
        const maxInstances = cursor.u16();
        const channelConfigRaw = cursor.u32();
        const hdrFlags = cursor.u8();
        const recoveryTime = cursor.s32();
        const maxDuckVolume = finite(cursor.f32());
        const ducks = ReadDucks(cursor);
        const fx = ReadEffects(cursor);
        const metadata = ReadMetadata(cursor);
        const rtpcs = readInitialRtpcs(cursor);
        const state = readStateChunk(cursor);

        if (cursor.remaining !== 0) return null;

        const gainValue = id => properties.find(
            property => property.id === id,
        )?.floatValue ?? null;

        return {
            overrideBusId,
            outputDeviceId,
            properties,
            busVolume: gainValue(BUS_VOLUME_PROPERTY_ID),
            makeUpGain: gainValue(MAKE_UP_GAIN_PROPERTY_ID),
            outputBusVolume: gainValue(OUTPUT_BUS_VOLUME_PROPERTY_ID),
            prefixByteLength,
            positioning,
            aux,
            policy: {
                flags: policyFlags,
                killNewest: Boolean(policyFlags & 0x01),
                useVirtualBehavior: Boolean(policyFlags & 0x02),
                ignoreParentMaxInstances: Boolean(policyFlags & 0x04),
                backgroundMusic: Boolean(policyFlags & 0x08),
                maxInstances,
            },
            channelConfig: {
                raw: channelConfigRaw,
                channelCount: channelConfigRaw & 0xff,
                configType: (channelConfigRaw >>> 8) & 0x0f,
                channelMask: channelConfigRaw >>> 12,
            },
            hdr: {
                flags: hdrFlags,
                enabled: Boolean(hdrFlags & 0x01),
                exponentialRelease: Boolean(hdrFlags & 0x02),
            },
            recoveryTime,
            maxDuckVolume,
            ducks,
            fx,
            metadata,
            rtpcs,
            state,
            byteLength: cursor.at,
        };
    }
    catch
    {
        return null;
    }
}

function ReadDucks(cursor)
{
    const count = boundedCount(cursor.u32(), cursor.remaining, 18, 65535);
    const ducks = [];

    for (let index = 0; index < count; index++)
    {
        const busId = cursor.u32();
        const volume = finite(cursor.f32());
        const fadeOutTime = cursor.s32();
        const fadeInTime = cursor.s32();
        const curve = cursor.u8();
        const targetPropertyId = cursor.u8();

        if (curve > 9)
        {
            throw new RangeError("invalid v150 Wwise duck curve");
        }

        ducks.push({
            busId,
            volume,
            fadeOutTime,
            fadeInTime,
            curve,
            targetPropertyId,
        });
    }

    return ducks;
}

function ReadEffects(cursor)
{
    const count = boundedCount(cursor.u8(), cursor.remaining, 6, 255);
    const bypassAllRaw = count ? cursor.u8() : 0;
    const slots = [];

    for (let index = 0; index < count; index++)
    {
        const slot = cursor.u8();
        const fxId = cursor.u32();
        const flags = cursor.u8();

        slots.push({
            index: slot,
            fxId,
            flags,
            bypass: Boolean(flags & 0x01),
            shareSet: Boolean(flags & 0x02),
        });
    }

    return {
        bypassAllRaw,
        bypassAll: Boolean(bypassAllRaw),
        slots,
    };
}

function ReadMetadata(cursor)
{
    const count = boundedCount(cursor.u8(), cursor.remaining, 6, 255);
    const slots = [];

    for (let index = 0; index < count; index++)
    {
        const slot = cursor.u8();
        const fxId = cursor.u32();
        const shareSetRaw = cursor.u8();

        slots.push({
            index: slot,
            fxId,
            shareSetRaw,
            shareSet: Boolean(shareSetRaw),
        });
    }

    return { slots };
}

/**
 * Decodes every v150 Audio and Auxiliary Bus across inspected banks.
 *
 * @param {Array<object>|object} inspections Related `CjsBnkFormat.inspect()` results.
 * @returns {{buses: Map<number, object>, diagnostics: object}} Typed bus catalog and failures.
 */
export function busNodesFromBanks(inspections)
{
    const banks = Array.isArray(inspections) ? inspections : [ inspections ];
    const buses = new Map();
    const failed = [];
    const duplicates = [];
    const unsupportedVersions = [];
    let parsed = 0;

    for (const inspection of banks)
    {
        const bank = inspection?.source || "";
        const bankVersion = Number(inspection?.bankVersion) >>> 0;

        if (bankVersion !== SUPPORTED_VERSION)
        {
            unsupportedVersions.push({ bank, version: bankVersion });
            continue;
        }

        for (const entry of inspection?.hirc ?? [])
        {
            if (entry.type !== AUDIO_BUS_TYPE
                && entry.type !== AUXILIARY_BUS_TYPE)
            {
                continue;
            }

            const decoded = parseBusNode(entry.payload, { bankVersion });
            const type = entry.type === AUDIO_BUS_TYPE
                ? "audio-bus"
                : "auxiliary-bus";

            if (!decoded)
            {
                failed.push({
                    bank,
                    version: bankVersion,
                    type,
                    id: entry.id,
                    reason: "invalid v150 bus body",
                });
                continue;
            }
            if (buses.has(entry.id))
            {
                duplicates.push({
                    id: entry.id,
                    previousBank: buses.get(entry.id).bank,
                    bank,
                });
            }

            parsed++;
            buses.set(entry.id, {
                id: entry.id,
                bank,
                type,
                ...decoded,
            });
        }
    }

    return {
        buses,
        diagnostics: {
            parsed,
            failed,
            duplicates,
            unsupportedVersions,
        },
    };
}
