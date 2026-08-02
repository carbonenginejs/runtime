export const PARAMETRIC_EQ_PLUGIN_ID = 0x00690003;

const FILTER_TYPE_NAMES = Object.freeze([
    "lowpass",
    "highpass",
    "bandpass",
    "notch",
    "lowshelf",
    "highshelf",
    "peaking",
]);

const FILTER_TYPES = Object.freeze(new Set(FILTER_TYPE_NAMES));

const MIN_GAIN_DB = -200;
const MAX_GAIN_DB = 200;

/** Validates and indexes one portable static Wwise bus-effect catalog. */
export function indexBusEffectCatalog(value)
{
    if (value === null || value === undefined)
    {
        return new Map();
    }
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError("Audio Bus effect catalog must be an object");
    }
    if (value.schemaVersion !== 1)
    {
        throw new TypeError(
            `Unsupported audio bus effect schema version: ${value.schemaVersion}`,
        );
    }
    const buses = RequireRecord(value.buses, "Audio Bus effect buses");
    const result = new Map();

    for (const [ rawBusId, rawEffects ] of Object.entries(buses))
    {
        const busId = CanonicalPositiveId(
            rawBusId,
            `Audio Bus effect bus ${rawBusId}`,
        );

        if (!Array.isArray(rawEffects) || !rawEffects.length)
        {
            throw new TypeError(
                `Audio Bus effect bus ${busId} must have effects`,
            );
        }
        const slots = new Set();
        const effects = rawEffects.map((rawEffect, effectIndex) =>
        {
            const label = `Audio Bus effect bus ${busId} effect ${effectIndex}`;
            const effect = RequireRecord(rawEffect, label);
            const effectId = CanonicalPositiveId(
                effect.effectId,
                `${label} id`,
            );
            const slotIndex = BoundedInteger(
                effect.slotIndex,
                0,
                3,
                `${label} slotIndex`,
            );

            if (slots.has(slotIndex))
            {
                throw new TypeError(`${label} duplicates slot ${slotIndex}`);
            }
            slots.add(slotIndex);
            if (effect.type !== "parametric-eq")
            {
                throw new TypeError(`${label} has unsupported type ${effect.type}`);
            }
            if (!Array.isArray(effect.bands) || effect.bands.length > 3)
            {
                throw new TypeError(`${label} bands must contain at most 3 entries`);
            }
            const bandIndices = new Set();
            const bands = effect.bands.map((rawBand, bandOffset) =>
            {
                const bandLabel = `${label} band ${bandOffset}`;
                const band = RequireRecord(rawBand, bandLabel);
                const index = BoundedInteger(
                    band.index,
                    0,
                    2,
                    `${bandLabel} index`,
                );

                if (bandIndices.has(index))
                {
                    throw new TypeError(`${bandLabel} duplicates index ${index}`);
                }
                bandIndices.add(index);
                const filterType = String(band.filterType ?? "");

                if (!FILTER_TYPES.has(filterType))
                {
                    throw new TypeError(
                        `${bandLabel} has unsupported filterType ${filterType}`,
                    );
                }
                return Object.freeze({
                    index,
                    filterType,
                    gainDb: FiniteGain(band.gainDb, `${bandLabel} gainDb`),
                    frequencyHz: PositiveFinite(
                        band.frequencyHz,
                        `${bandLabel} frequencyHz`,
                    ),
                    q: PositiveFinite(band.q, `${bandLabel} q`),
                });
            }).sort((left, right) => left.index - right.index);

            if (effect.processLfe !== true)
            {
                throw new TypeError(
                    `${label} processLfe must be true until independent LFE routing is supported`,
                );
            }
            return Object.freeze({
                effectId,
                slotIndex,
                type: "parametric-eq",
                bands: Object.freeze(bands),
                outputGainDb: FiniteGain(
                    effect.outputGainDb,
                    `${label} outputGainDb`,
                ),
                processLfe: true,
            });
        }).sort((left, right) => left.slotIndex - right.slotIndex);

        result.set(busId, Object.freeze(effects));
    }
    return result;
}

/** Creates a distributable static effect chain for one collapsed dry route. */
export function createBusEffectChain(context, indexedCatalog, busPathIds)
{
    if (!(indexedCatalog instanceof Map) || !indexedCatalog.size)
    {
        return null;
    }
    const effects = (busPathIds ?? []).flatMap(busId =>
        indexedCatalog.get(String(busId)) ?? []);

    if (!effects.length) return null;
    const nodes = [];
    let input = null;
    let output = null;

    const append = node =>
    {
        if (output) output.connect(node);
        else input = node;
        output = node;
        nodes.push(node);
    };

    for (const effect of effects)
    {
        for (const band of effect.bands)
        {
            if (typeof context?.createBiquadFilter !== "function")
            {
                throw new TypeError(
                    "AudioContext.createBiquadFilter is required for Wwise Parametric EQ",
                );
            }
            const filter = context.createBiquadFilter();
            const nyquist = Number(context.sampleRate) / 2;

            filter.type = band.filterType;
            SetParam(filter.frequency, Number.isFinite(nyquist) && nyquist > 0
                ? Math.min(band.frequencyHz, nyquist)
                : band.frequencyHz);
            SetParam(filter.Q, band.q);
            SetParam(filter.gain, band.gainDb);
            append(filter);
        }
        if (effect.outputGainDb !== 0)
        {
            if (typeof context?.createGain !== "function")
            {
                throw new TypeError(
                    "AudioContext.createGain is required for Wwise Parametric EQ output gain",
                );
            }
            const gain = context.createGain();

            SetParam(gain.gain, 10 ** (effect.outputGainDb / 20));
            append(gain);
        }
    }
    return input ? { input, output, nodes } : null;
}

/** Decodes one source-proven v150 Wwise Parametric EQ parameter block. */
export function parseStaticParametricEqBytes(
    bytes,
    {
        effectId,
        slotIndex,
        label = `Wwise Parametric EQ ${effectId}`,
    } = {},
)
{
    if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 56)
    {
        throw new TypeError(`${label} has an unsupported parameter block`);
    }
    const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
    );
    const bands = [];
    let at = 0;

    for (let index = 0; index < 3; index++)
    {
        const filterTypeId = view.getUint32(at, true);
        const gainDb = view.getFloat32(at + 4, true);
        const frequencyHz = view.getFloat32(at + 8, true);
        const q = view.getFloat32(at + 12, true);
        const enabledRaw = view.getUint8(at + 16);
        const filterType = FILTER_TYPE_NAMES[filterTypeId];

        if (!filterType
            || !Number.isFinite(gainDb)
            || gainDb < MIN_GAIN_DB
            || gainDb > MAX_GAIN_DB
            || !Number.isFinite(frequencyHz)
            || frequencyHz <= 0
            || !Number.isFinite(q)
            || q <= 0
            || enabledRaw > 1)
        {
            throw new TypeError(`${label} has invalid band ${index}`);
        }
        if (enabledRaw === 1)
        {
            bands.push({
                index,
                filterType,
                gainDb,
                frequencyHz,
                q,
            });
        }
        at += 17;
    }
    const outputGainDb = view.getFloat32(at, true);

    if (!Number.isFinite(outputGainDb)
        || outputGainDb < MIN_GAIN_DB
        || outputGainDb > MAX_GAIN_DB)
    {
        throw new TypeError(`${label} has invalid output gain`);
    }
    if (view.getUint8(at + 4) !== 1)
    {
        throw new TypeError(`${label} requires unsupported independent LFE routing`);
    }
    return {
        effectId: String(effectId),
        slotIndex: Number(slotIndex),
        type: "parametric-eq",
        bands,
        outputGainDb,
        processLfe: true,
    };
}

/** Qualifies and decodes one static Parametric EQ from a portable Bus graph. */
export function parseGraphStaticParametricEq(effect, effectId, slotIndex)
{
    const label = `Audio Bus graph effect ${effectId}`;
    const controls = effect?.controls;

    if (!effect
        || (effect.type !== "effect-custom"
            && effect.type !== "effect-share-set")
        || effect.pluginId !== PARAMETRIC_EQ_PLUGIN_ID
        || effect.parameterByteLength !== 56
        || !Array.isArray(effect.media)
        || effect.media.length !== 0
        || !controls
        || controls.rtpcCount !== 0
        || controls.statePropertyCount !== 0
        || controls.stateGroupCount !== 0
        || controls.propertyValueCount !== 0)
    {
        throw new TypeError(`${label} is not a static Wwise Parametric EQ`);
    }
    return parseStaticParametricEqBytes(
        DecodeBase64(effect.parametersBase64, label),
        { effectId, slotIndex, label },
    );
}

function DecodeBase64(value, label)
{
    const text = String(value ?? "");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const cleanLength = text.endsWith("==")
        ? text.length - 2
        : text.endsWith("=") ? text.length - 1 : text.length;
    const result = new Uint8Array(Math.floor(cleanLength * 6 / 8));
    let accumulator = 0;
    let bits = 0;
    let offset = 0;

    for (let index = 0; index < cleanLength; index++)
    {
        const valueIndex = alphabet.indexOf(text[index]);

        if (valueIndex < 0)
        {
            throw new TypeError(`${label} parametersBase64 is invalid`);
        }
        accumulator = (accumulator << 6) | valueIndex;
        bits += 6;
        if (bits >= 8)
        {
            bits -= 8;
            result[offset++] = (accumulator >>> bits) & 0xff;
        }
    }
    return result;
}

function SetParam(param, value)
{
    if (param && typeof param === "object" && "value" in param)
    {
        param.value = value;
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

    if (!Number.isSafeInteger(number)
        || number <= 0
        || number > 0xffffffff
        || String(number) !== text)
    {
        throw new TypeError(`${label} must be a canonical positive id`);
    }
    return text;
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

function FiniteGain(value, label)
{
    const number = Number(value);

    if (!Number.isFinite(number)
        || number < MIN_GAIN_DB
        || number > MAX_GAIN_DB)
    {
        throw new TypeError(
            `${label} must be from ${MIN_GAIN_DB} to ${MAX_GAIN_DB} dB`,
        );
    }
    return number;
}

function PositiveFinite(value, label)
{
    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0)
    {
        throw new TypeError(`${label} must be positive and finite`);
    }
    return number;
}
