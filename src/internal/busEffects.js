export const PARAMETRIC_EQ_PLUGIN_ID = 0x00690003;
export const WWISE_DELAY_PLUGIN_ID = 0x006a0003;
export const WWISE_METER_PLUGIN_ID = 0x00810003;

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
const DELAY_TIME_MIN = 0.001;
const DELAY_TIME_MAX = 1;
const DELAY_PERCENT_MIN = 0;
const DELAY_PERCENT_MAX = 100;
const DELAY_OUTPUT_GAIN_MIN = Math.fround(-96.3);
const DELAY_OUTPUT_GAIN_MAX = 0;
const METER_MAX_TIME = 10;
const METER_MINIMUM_MIN = Math.fround(-96.3);
const METER_MINIMUM_MAX = 0;
const METER_MAXIMUM_MIN = Math.fround(-96.3);
const METER_MAXIMUM_MAX = 12;

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
        if (effect.type === "meter-omission") continue;
        if (effect.type === "delay")
        {
            const stage = CreateWwiseDelayStage(context, effect);

            if (output) output.connect(stage.input);
            else input = stage.input;
            output = stage.output;
            nodes.push(...stage.nodes);
            continue;
        }
        if (effect.type !== "parametric-eq")
        {
            throw new TypeError(`Unsupported shared Bus effect ${effect.type}`);
        }
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

/** Creates one static Wwise Delay adaptation from Web Audio primitives. */
function CreateWwiseDelayStage(context, effect)
{
    if (typeof context?.createDelay !== "function"
        || typeof context?.createGain !== "function")
    {
        throw new TypeError(
            "AudioContext DelayNode and GainNode support is required for Wwise Delay",
        );
    }
    const input = context.createGain();
    const delay = context.createDelay(effect.delayTimeSeconds);
    const dry = context.createGain();
    const wet = context.createGain();
    const output = context.createGain();
    const mix = effect.wetDryMixPercent / 100;
    const nodes = [ input, delay, dry, wet, output ];

    SetParam(delay.delayTime, effect.delayTimeSeconds);
    SetParam(dry.gain, 1 - mix);
    SetParam(wet.gain, mix);
    SetParam(output.gain, 10 ** (effect.outputGainDb / 20));
    input.connect(dry);
    dry.connect(output);
    input.connect(delay);
    delay.connect(wet);
    wet.connect(output);
    if (effect.feedbackEnabled)
    {
        const feedback = context.createGain();

        SetParam(feedback.gain, effect.feedbackPercent / 100);
        delay.connect(feedback);
        feedback.connect(delay);
        nodes.push(feedback);
    }
    return { input, output, nodes };
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
    return parseStaticParametricEqBytes(
        RequireStaticGraphEffect(
            effect,
            PARAMETRIC_EQ_PLUGIN_ID,
            56,
            label,
            "Wwise Parametric EQ",
        ),
        { effectId, slotIndex, label },
    );
}

/** Decodes one source-proven static v150 Wwise Delay parameter block. */
export function parseGraphStaticWwiseDelay(effect, effectId, slotIndex)
{
    const label = `Audio Bus graph effect ${effectId}`;
    const bytes = RequireStaticGraphEffect(
        effect,
        WWISE_DELAY_PLUGIN_ID,
        18,
        label,
        "Wwise Delay",
    );
    const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
    );
    const delayTimeSeconds = view.getFloat32(0, true);
    const feedbackPercent = view.getFloat32(4, true);
    const wetDryMixPercent = view.getFloat32(8, true);
    const outputGainDb = view.getFloat32(12, true);
    const feedbackEnabledRaw = view.getUint8(16);
    const processLfeRaw = view.getUint8(17);

    if (!Number.isFinite(delayTimeSeconds)
        || delayTimeSeconds < DELAY_TIME_MIN
        || delayTimeSeconds > DELAY_TIME_MAX
        || !Number.isFinite(feedbackPercent)
        || feedbackPercent < DELAY_PERCENT_MIN
        || feedbackPercent > DELAY_PERCENT_MAX
        || !Number.isFinite(wetDryMixPercent)
        || wetDryMixPercent < DELAY_PERCENT_MIN
        || wetDryMixPercent > DELAY_PERCENT_MAX
        || !Number.isFinite(outputGainDb)
        || outputGainDb < DELAY_OUTPUT_GAIN_MIN
        || outputGainDb > DELAY_OUTPUT_GAIN_MAX
        || feedbackEnabledRaw > 1
        || processLfeRaw > 1)
    {
        throw new TypeError(`${label} has invalid Wwise Delay parameters`);
    }
    if (processLfeRaw !== 1)
    {
        throw new TypeError(
            `${label} requires unsupported independent LFE routing`,
        );
    }
    return {
        effectId: String(effectId),
        slotIndex: Number(slotIndex),
        type: "delay",
        delayTimeSeconds,
        feedbackPercent,
        wetDryMixPercent,
        outputGainDb,
        feedbackEnabled: feedbackEnabledRaw === 1,
        processLfe: true,
    };
}

/**
 * Decodes a v150 Wwise Meter whose omitted telemetry cannot feed back into the
 * authored graph. The Meter remains behaviorally unsupported but audio-neutral.
 */
export function parseGraphFeedbackFreeMeter(effect, effectId, slotIndex)
{
    const label = `Audio Bus graph effect ${effectId}`;
    const bytes = RequireStaticGraphEffect(
        effect,
        WWISE_METER_PLUGIN_ID,
        28,
        label,
        "Wwise Meter",
    );
    const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
    );
    const attack = view.getFloat32(0, true);
    const release = view.getFloat32(4, true);
    const minimum = view.getFloat32(8, true);
    const maximum = view.getFloat32(12, true);
    const hold = view.getFloat32(16, true);
    const infiniteHoldRaw = view.getUint8(20);
    const modeRaw = view.getUint8(21);
    const scopeRaw = view.getUint8(22);
    const applyDownstreamVolumeRaw = view.getUint8(23);
    const gameParameterId = view.getUint32(24, true);

    if (!Number.isFinite(attack)
        || attack < 0
        || attack > METER_MAX_TIME
        || !Number.isFinite(release)
        || release < 0
        || release > METER_MAX_TIME
        || !Number.isFinite(minimum)
        || minimum < METER_MINIMUM_MIN
        || minimum > METER_MINIMUM_MAX
        || !Number.isFinite(maximum)
        || maximum < METER_MAXIMUM_MIN
        || maximum > METER_MAXIMUM_MAX
        || minimum > maximum
        || !Number.isFinite(hold)
        || hold < 0
        || hold > METER_MAX_TIME
        || infiniteHoldRaw > 1
        || modeRaw > 1
        || scopeRaw > 1
        || applyDownstreamVolumeRaw > 1)
    {
        throw new TypeError(`${label} has invalid Wwise Meter parameters`);
    }
    if (applyDownstreamVolumeRaw !== 0 || gameParameterId !== 0)
    {
        throw new TypeError(`${label} has observable Wwise Meter feedback`);
    }
    return {
        effectId: String(effectId),
        slotIndex: Number(slotIndex),
        type: "meter-omission",
        attack,
        release,
        minimum,
        maximum,
        hold,
        infiniteHold: infiniteHoldRaw === 1,
        mode: modeRaw === 0 ? "peak" : "rms",
        scope: scopeRaw === 0 ? "global" : "game-object",
        applyDownstreamVolume: false,
        gameParameterId: 0,
    };
}

/** Decodes one effect admitted by the strict shared Bus mixer. */
export function parseGraphSharedBusEffect(effect, effectId, slotIndex)
{
    switch (effect?.pluginId)
    {
        case PARAMETRIC_EQ_PLUGIN_ID:
            return parseGraphStaticParametricEq(effect, effectId, slotIndex);
        case WWISE_DELAY_PLUGIN_ID:
            return parseGraphStaticWwiseDelay(effect, effectId, slotIndex);
        case WWISE_METER_PLUGIN_ID:
            return parseGraphFeedbackFreeMeter(effect, effectId, slotIndex);
        default:
            throw new TypeError(`Audio Bus graph effect ${effectId} is unsupported`);
    }
}

function RequireStaticGraphEffect(effect, pluginId, byteLength, label, kind)
{
    const controls = effect?.controls;

    if (!effect
        || (effect.type !== "effect-custom"
            && effect.type !== "effect-share-set")
        || effect.pluginId !== pluginId
        || effect.parameterByteLength !== byteLength
        || !Array.isArray(effect.media)
        || effect.media.length !== 0
        || !controls
        || controls.rtpcCount !== 0
        || controls.statePropertyCount !== 0
        || controls.stateGroupCount !== 0
        || controls.propertyValueCount !== 0)
    {
        throw new TypeError(`${label} is not a static ${kind}`);
    }
    const bytes = DecodeBase64(effect.parametersBase64, label);

    if (bytes.byteLength !== byteLength)
    {
        throw new TypeError(`${label} parameter length does not match`);
    }
    return bytes;
}

function DecodeBase64(value, label)
{
    const text = String(value ?? "");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    if (text.length % 4 !== 0
        || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u
            .test(text))
    {
        throw new TypeError(`${label} parametersBase64 is invalid`);
    }
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
    if ((text.endsWith("==")
            && (alphabet.indexOf(text[cleanLength - 1]) & 0x0f) !== 0)
        || (text.endsWith("=")
            && (alphabet.indexOf(text[cleanLength - 1]) & 0x03) !== 0))
    {
        throw new TypeError(`${label} parametersBase64 is not canonical`);
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
