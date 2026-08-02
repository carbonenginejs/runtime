const FILTER_TYPES = Object.freeze(new Set([
    "lowpass",
    "highpass",
    "bandpass",
    "notch",
    "lowshelf",
    "highshelf",
    "peaking",
]));

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
