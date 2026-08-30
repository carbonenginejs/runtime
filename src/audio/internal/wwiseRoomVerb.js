export const WWISE_ROOMVERB_PLUGIN_ID = 0x00760003;

const WWISE_ROOMVERB_BANK_VERSION = 150;
const WWISE_ROOMVERB_BYTES = 186;
const WWISE_ROOMVERB_MODES = new Set([
    "strict",
    "approximate-web-audio",
]);
const ROOMVERB_PATTERNS = new Set([ 5, 8, 9, 11, 23 ]);
const ROOMVERB_QUALITIES = new Set([ 8, 12, 16 ]);
const FILTER_INSERTS = Object.freeze([
    "off",
    "early-reflections",
    "reverb",
    "early-reflections-and-reverb",
]);
const FILTER_CURVES = Object.freeze([
    "lowshelf",
    "peaking",
    "highshelf",
]);
const LEVEL_MIN_DB = Math.fround(-96.3);
const TUNING_FINGERPRINT = Object.freeze({
    densityDelayMinSeconds: 0.008,
    densityDelayMaxSeconds: 0.05,
    densityDelayRandomPercent: 2,
    roomShapeMin: Math.fround(0.1),
    roomShapeMax: Math.fround(0.8),
    diffusionDelayScalePercent: 66,
    diffusionDelayMaxSeconds: 0.015,
    diffusionDelayRandomPercent: 5,
    dcFilterCutFrequencyHz: 40,
    reverbUnitInputDelaySeconds: 0.1,
    reverbUnitInputDelayRandomPercent: 50,
});
const IMPULSE_CACHE = new WeakMap();

/** Validates the independent host policy for Wwise RoomVerb realization. */
export function normalizeWwiseRoomVerbMode(value = "strict")
{
    const mode = String(value);

    if (!WWISE_ROOMVERB_MODES.has(mode))
    {
        throw new TypeError(
            `Unsupported Wwise RoomVerb realization mode: ${mode}`,
        );
    }
    return mode;
}

/**
 * Decodes pinned wwiser's exact static v150 Wwise RoomVerb parameter block.
 *
 * The first browser slice deliberately admits only the audited EVE tuning
 * fingerprint and mono/stereo-compatible channel levels. Every other field is
 * retained so an approximation never silently invents missing authoring data.
 */
export function parseStaticWwiseRoomVerbBytes(
    bytes,
    {
        effectId,
        slotIndex,
        label = `Wwise RoomVerb ${effectId}`,
        bankVersion = WWISE_ROOMVERB_BANK_VERSION,
    } = {},
)
{
    if (Number(bankVersion) !== WWISE_ROOMVERB_BANK_VERSION
        || !(bytes instanceof Uint8Array)
        || bytes.byteLength !== WWISE_ROOMVERB_BYTES)
    {
        throw new TypeError(`${label} has an unsupported parameter block`);
    }
    const reader = new WwiseRoomVerbReader(bytes);
    const decayTimeSeconds = reader.F32();
    const hfDampingRatio = reader.F32();
    const diffusionPercent = reader.F32();
    const stereoWidthDegrees = reader.F32();
    const filters = [ 0, 1, 2 ].map(index => ({
        index,
        gainDb: reader.F32(),
        frequencyHz: reader.F32(),
        q: reader.F32(),
    }));
    const decoded = {
        effectId: String(effectId),
        slotIndex: Number(slotIndex),
        type: "roomverb",
        decayTimeSeconds,
        hfDampingRatio,
        diffusionPercent,
        stereoWidthDegrees,
        toneFilters: filters,
        frontLevelDb: reader.F32(),
        rearLevelDb: reader.F32(),
        centerLevelDb: reader.F32(),
        lfeLevelDb: reader.F32(),
        dryLevelDb: reader.F32(),
        earlyReflectionsLevelDb: reader.F32(),
        reverbLevelDb: reader.F32(),
        earlyReflectionsEnabled: reader.Bool(),
        earlyReflectionsPattern: reader.U32(),
        reverbDelaySeconds: reader.F32() / 1000,
        roomSizePercent: reader.F32(),
        earlyReflectionsFrontBackDelaySeconds: reader.F32() / 1000,
        densityPercent: reader.F32(),
        roomShapePercent: reader.F32(),
        reverbUnitCount: reader.U32(),
        toneControlsEnabled: reader.Bool(),
    };

    for (const filter of filters)
    {
        filter.insert = FILTER_INSERTS[reader.U32()];
        filter.filterType = FILTER_CURVES[reader.U32()];
    }
    Object.assign(decoded, {
        inputCenterLevelDb: reader.F32(),
        inputLfeLevelDb: reader.F32(),
        densityDelayMinSeconds: reader.F32() / 1000,
        densityDelayMaxSeconds: reader.F32() / 1000,
        densityDelayRandomPercent: reader.F32(),
        roomShapeMin: reader.F32(),
        roomShapeMax: reader.F32(),
        diffusionDelayScalePercent: reader.F32(),
        diffusionDelayMaxSeconds: reader.F32() / 1000,
        diffusionDelayRandomPercent: reader.F32(),
        dcFilterCutFrequencyHz: reader.F32(),
        reverbUnitInputDelaySeconds: reader.F32() / 1000,
        reverbUnitInputDelayRandomPercent: reader.F32(),
    });
    reader.AssertComplete(label);

    return normalizeWwiseRoomVerbEffect(decoded, label);
}

/** Validates and freezes one portable static RoomVerb record. */
export function normalizeWwiseRoomVerbEffect(effect, label)
{
    if (!effect || typeof effect !== "object" || Array.isArray(effect))
    {
        throw new TypeError(`${label} must be an object`);
    }
    const normalized = {
        effectId: String(effect.effectId),
        slotIndex: Integer(effect.slotIndex, 0, 3, `${label} slotIndex`),
        type: "roomverb",
        decayTimeSeconds: Finite(
            effect.decayTimeSeconds, 0.2, 10, `${label} decayTimeSeconds`,
        ),
        hfDampingRatio: Finite(
            effect.hfDampingRatio, 0.5, 10, `${label} hfDampingRatio`,
        ),
        diffusionPercent: Finite(
            effect.diffusionPercent, 0, 100, `${label} diffusionPercent`,
        ),
        stereoWidthDegrees: Finite(
            effect.stereoWidthDegrees, 0, 180,
            `${label} stereoWidthDegrees`,
        ),
        toneFilters: NormalizeFilters(effect.toneFilters, label),
        frontLevelDb: Finite(
            effect.frontLevelDb, LEVEL_MIN_DB, 0, `${label} frontLevelDb`,
        ),
        rearLevelDb: Finite(
            effect.rearLevelDb, LEVEL_MIN_DB, 0, `${label} rearLevelDb`,
        ),
        centerLevelDb: Finite(
            effect.centerLevelDb, LEVEL_MIN_DB, 0, `${label} centerLevelDb`,
        ),
        lfeLevelDb: Finite(
            effect.lfeLevelDb, LEVEL_MIN_DB, 0, `${label} lfeLevelDb`,
        ),
        dryLevelDb: Finite(
            effect.dryLevelDb, LEVEL_MIN_DB, 0, `${label} dryLevelDb`,
        ),
        earlyReflectionsLevelDb: Finite(
            effect.earlyReflectionsLevelDb, LEVEL_MIN_DB, 0,
            `${label} earlyReflectionsLevelDb`,
        ),
        reverbLevelDb: Finite(
            effect.reverbLevelDb, LEVEL_MIN_DB, 0,
            `${label} reverbLevelDb`,
        ),
        earlyReflectionsEnabled: BooleanValue(
            effect.earlyReflectionsEnabled,
            `${label} earlyReflectionsEnabled`,
        ),
        earlyReflectionsPattern: MemberInteger(
            effect.earlyReflectionsPattern,
            ROOMVERB_PATTERNS,
            `${label} earlyReflectionsPattern`,
        ),
        reverbDelaySeconds: Finite(
            effect.reverbDelaySeconds, 0, 1,
            `${label} reverbDelaySeconds`,
        ),
        roomSizePercent: Finite(
            effect.roomSizePercent, -100, 100,
            `${label} roomSizePercent`,
        ),
        earlyReflectionsFrontBackDelaySeconds: Finite(
            effect.earlyReflectionsFrontBackDelaySeconds, 0, 0.1,
            `${label} earlyReflectionsFrontBackDelaySeconds`,
        ),
        densityPercent: Finite(
            effect.densityPercent, 0, 100, `${label} densityPercent`,
        ),
        roomShapePercent: Finite(
            effect.roomShapePercent, 0, 100, `${label} roomShapePercent`,
        ),
        reverbUnitCount: MemberInteger(
            effect.reverbUnitCount,
            ROOMVERB_QUALITIES,
            `${label} reverbUnitCount`,
        ),
        toneControlsEnabled: BooleanValue(
            effect.toneControlsEnabled,
            `${label} toneControlsEnabled`,
        ),
        inputCenterLevelDb: Finite(
            effect.inputCenterLevelDb, LEVEL_MIN_DB, 0,
            `${label} inputCenterLevelDb`,
        ),
        inputLfeLevelDb: Finite(
            effect.inputLfeLevelDb, LEVEL_MIN_DB, 0,
            `${label} inputLfeLevelDb`,
        ),
        ...NormalizeTunings(effect, label),
    };

    RequireAuditedChannelShape(normalized, label);
    RequireTuningFingerprint(normalized, label);
    return normalized;
}

/**
 * Builds or reuses deterministic early/late impulse responses before any live
 * voice nodes are allocated. Wwise's proprietary ER tables and late algorithm
 * are unavailable; these buffers are explicitly procedural approximations.
 */
export function prepareWwiseRoomVerbApproximation(
    context,
    effect,
    channelCount = 1,
)
{
    const channels = Integer(
        channelCount,
        1,
        2,
        "Wwise RoomVerb sourceChannelCount",
    );
    const sampleRate = Number(context?.sampleRate);

    if (typeof context?.createBuffer !== "function"
        || !Number.isFinite(sampleRate)
        || sampleRate <= 0)
    {
        throw new TypeError(
            "AudioContext.createBuffer and sampleRate are required for Wwise RoomVerb",
        );
    }
    let cache = IMPULSE_CACHE.get(context);

    if (!cache)
    {
        cache = new Map();
        IMPULSE_CACHE.set(context, cache);
    }
    return {
        early: effect.earlyReflectionsEnabled
            && effect.earlyReflectionsLevelDb > -96
            ? GetCachedImpulse(
                cache,
                EarlyImpulseKey(effect, channels, sampleRate),
                () => CreateEarlyImpulse(
                    context,
                    effect,
                    channels,
                    sampleRate,
                ),
            )
            : null,
        late: GetCachedImpulse(
            cache,
            LateImpulseKey(effect, channels, sampleRate),
            () => CreateLateImpulse(context, effect, channels, sampleRate),
        ),
    };
}

/** Creates the live nodes for one prepared procedural RoomVerb stage. */
export function createWwiseRoomVerbApproximation(
    context,
    effect,
    prepared,
)
{
    const input = context.createGain();
    const dry = context.createGain();
    const output = context.createGain();
    const nodes = [ input, dry, output ];

    SetParam(dry.gain, DbToGain(effect.dryLevelDb));
    input.connect(dry);
    dry.connect(output);

    if (prepared.early)
    {
        const convolver = context.createConvolver();
        const gain = context.createGain();
        const filtered = AppendToneFilters(
            context,
            convolver,
            effect,
            "early-reflections",
            nodes,
        );

        convolver.normalize = false;
        convolver.buffer = prepared.early;
        SetParam(gain.gain, DbToGain(effect.earlyReflectionsLevelDb));
        input.connect(convolver);
        filtered.connect(gain);
        gain.connect(output);
        nodes.push(convolver, gain);
    }

    const dcFilter = context.createBiquadFilter();
    const preDelay = effect.reverbDelaySeconds > 0
        ? context.createDelay(1)
        : null;
    const convolver = context.createConvolver();
    const gain = context.createGain();
    const lateInput = preDelay ?? convolver;

    dcFilter.type = "highpass";
    SetParam(dcFilter.frequency, effect.dcFilterCutFrequencyHz);
    SetParam(dcFilter.Q, Math.SQRT1_2);
    convolver.normalize = false;
    convolver.buffer = prepared.late;
    SetParam(
        gain.gain,
        DbToGain(effect.reverbLevelDb + effect.frontLevelDb),
    );
    input.connect(dcFilter);
    dcFilter.connect(lateInput);
    if (preDelay)
    {
        SetParam(preDelay.delayTime, effect.reverbDelaySeconds);
        preDelay.connect(convolver);
    }
    const filtered = AppendToneFilters(
        context,
        convolver,
        effect,
        "reverb",
        nodes,
    );

    filtered.connect(gain);
    gain.connect(output);
    nodes.push(dcFilter);
    if (preDelay) nodes.push(preDelay);
    nodes.push(convolver, gain);
    return { input, output, nodes };
}

function CreateEarlyImpulse(context, effect, channels, sampleRate)
{
    const scale = 2 ** (effect.roomSizePercent / 100);
    const baseSeconds = [ 0.0067, 0.0119, 0.0181, 0.0277, 0.0391, 0.0539 ];
    const random = CreateRandom(effect.earlyReflectionsPattern ^ 0x73e2a91d);
    const taps = baseSeconds.map((seconds, index) => ({
        seconds: seconds * scale * (0.9 + random() * 0.2),
        gain: (index % 3 === 1 ? -1 : 1) * Math.exp(-index / 2.4),
    }));
    const length = Math.max(2, Math.ceil(
        (Math.max(...taps.map(tap => tap.seconds)) + 0.002) * sampleRate,
    ));
    const buffer = context.createBuffer(channels, length, sampleRate);
    const width = effect.stereoWidthDegrees / 180;

    for (let channel = 0; channel < channels; channel++)
    {
        const data = buffer.getChannelData(channel);
        const channelRandom = CreateRandom(
            effect.earlyReflectionsPattern
                ^ ((channel + 1) * 0x9e3779b1),
        );

        for (const tap of taps)
        {
            const spread = channels === 1
                ? 1
                : 1 + (channelRandom() - 0.5) * width * 0.12;
            const index = Math.min(
                data.length - 1,
                Math.round(tap.seconds * spread * sampleRate),
            );

            data[index] += tap.gain / Math.sqrt(taps.length);
        }
    }
    return buffer;
}

function CreateLateImpulse(context, effect, channels, sampleRate)
{
    const length = Math.max(
        2,
        Math.ceil(effect.decayTimeSeconds * sampleRate),
    );
    const buffer = context.createBuffer(channels, length, sampleRate);
    const commonRandom = CreateRandom(LateImpulseSeed(effect));
    const independentMix = Math.sin(
        effect.stereoWidthDegrees / 180 * Math.PI / 2,
    );
    const commonMix = Math.cos(
        effect.stereoWidthDegrees / 180 * Math.PI / 2,
    );
    const common = new Float32Array(length);

    for (let index = 0; index < length; index++)
    {
        common[index] = commonRandom() * 2 - 1;
    }
    for (let channel = 0; channel < channels; channel++)
    {
        const data = buffer.getChannelData(channel);
        const random = CreateRandom(LateImpulseSeed(effect) ^ (channel + 1));
        let damped = 0;

        for (let index = 0; index < length; index++)
        {
            const time = index / sampleRate;
            const position = time / effect.decayTimeSeconds;
            const envelope = 10 ** (-3 * position);
            const cutoff = Math.max(
                500,
                sampleRate / 2 * 2 ** (
                    -4 * (effect.hfDampingRatio - 0.5) / 9.5 * position
                ),
            );
            const alpha = Math.exp(-2 * Math.PI * cutoff / sampleRate);
            const independent = random() * 2 - 1;
            const noise = channels === 1
                ? common[index]
                : commonMix * common[index] + independentMix * independent;

            damped = (1 - alpha) * noise + alpha * damped;
            data[index] = damped * envelope
                * effect.diffusionPercent / 100
                * (0.25 + 0.75 * effect.densityPercent / 100);
        }
        AddRoomModes(data, effect, sampleRate, channel);
        NormalizeImpulse(data, effect.reverbUnitCount);
    }
    return buffer;
}

function AddRoomModes(data, effect, sampleRate, channel)
{
    const random = CreateRandom(
        LateImpulseSeed(effect) ^ 0x51ed270b ^ channel,
    );
    const density = effect.densityPercent / 100;
    const shape = effect.roomShapeMin
        + (effect.roomShapeMax - effect.roomShapeMin)
            * effect.roomShapePercent / 100;
    const divergence = 1 - shape;
    const range = effect.densityDelayMaxSeconds
        - effect.densityDelayMinSeconds;
    const modalGain = (1 - effect.diffusionPercent / 200)
        / Math.sqrt(effect.reverbUnitCount);

    for (let unit = 0; unit < effect.reverbUnitCount; unit++)
    {
        const centered = effect.densityDelayMinSeconds
            + range * (0.5 + (random() - 0.5) * divergence);
        const jitter = 1 + (random() - 0.5)
            * effect.densityDelayRandomPercent / 100;
        const period = Math.max(1 / sampleRate, centered * jitter
            * (1.25 - 0.5 * density));
        const onset = effect.reverbUnitInputDelaySeconds * (
            1 + (random() - 0.5)
                * effect.reverbUnitInputDelayRandomPercent / 100
        );
        const sign = unit % 2 ? -1 : 1;

        for (let time = onset; time < effect.decayTimeSeconds; time += period)
        {
            const index = Math.round(time * sampleRate);

            if (index >= data.length) break;
            data[index] += sign * modalGain
                * 10 ** (-3 * time / effect.decayTimeSeconds);
        }
    }
}

function AppendToneFilters(context, input, effect, target, nodes)
{
    let output = input;

    if (!effect.toneControlsEnabled) return output;
    for (const band of effect.toneFilters)
    {
        if (band.gainDb === 0
            || (band.insert !== target
                && band.insert !== "early-reflections-and-reverb"))
        {
            continue;
        }
        const filter = context.createBiquadFilter();

        filter.type = band.filterType;
        SetParam(filter.gain, band.gainDb);
        SetParam(filter.frequency, band.frequencyHz);
        SetParam(filter.Q, band.q);
        output.connect(filter);
        output = filter;
        nodes.push(filter);
    }
    return output;
}

function NormalizeFilters(value, label)
{
    if (!Array.isArray(value) || value.length !== 3)
    {
        throw new TypeError(`${label} toneFilters must contain three bands`);
    }
    return value.map((filter, index) =>
    {
        if (!filter || typeof filter !== "object" || Array.isArray(filter))
        {
            throw new TypeError(`${label} toneFilters[${index}] is invalid`);
        }
        return {
            index: Integer(
                filter.index,
                index,
                index,
                `${label} toneFilters[${index}] index`,
            ),
            filterType: Member(
                filter.filterType,
                FILTER_CURVES,
                `${label} toneFilters[${index}] filterType`,
            ),
            gainDb: Finite(
                filter.gainDb,
                -32,
                32,
                `${label} toneFilters[${index}] gainDb`,
            ),
            frequencyHz: Finite(
                filter.frequencyHz,
                20,
                20000,
                `${label} toneFilters[${index}] frequencyHz`,
            ),
            q: Finite(
                filter.q,
                0.1,
                10,
                `${label} toneFilters[${index}] q`,
            ),
            insert: Member(
                filter.insert,
                FILTER_INSERTS,
                `${label} toneFilters[${index}] insert`,
            ),
        };
    });
}

function NormalizeTunings(effect, label)
{
    return {
        densityDelayMinSeconds: Finite(
            effect.densityDelayMinSeconds, 0, 1,
            `${label} densityDelayMinSeconds`,
        ),
        densityDelayMaxSeconds: Finite(
            effect.densityDelayMaxSeconds, 0, 1,
            `${label} densityDelayMaxSeconds`,
        ),
        densityDelayRandomPercent: Finite(
            effect.densityDelayRandomPercent, 0, 100,
            `${label} densityDelayRandomPercent`,
        ),
        roomShapeMin: Finite(
            effect.roomShapeMin, 0, 1, `${label} roomShapeMin`,
        ),
        roomShapeMax: Finite(
            effect.roomShapeMax, 0, 1, `${label} roomShapeMax`,
        ),
        diffusionDelayScalePercent: Finite(
            effect.diffusionDelayScalePercent, 0, 100,
            `${label} diffusionDelayScalePercent`,
        ),
        diffusionDelayMaxSeconds: Finite(
            effect.diffusionDelayMaxSeconds, 0, 1,
            `${label} diffusionDelayMaxSeconds`,
        ),
        diffusionDelayRandomPercent: Finite(
            effect.diffusionDelayRandomPercent, 0, 100,
            `${label} diffusionDelayRandomPercent`,
        ),
        dcFilterCutFrequencyHz: Finite(
            effect.dcFilterCutFrequencyHz, 20, 20000,
            `${label} dcFilterCutFrequencyHz`,
        ),
        reverbUnitInputDelaySeconds: Finite(
            effect.reverbUnitInputDelaySeconds, 0, 1,
            `${label} reverbUnitInputDelaySeconds`,
        ),
        reverbUnitInputDelayRandomPercent: Finite(
            effect.reverbUnitInputDelayRandomPercent, 0, 100,
            `${label} reverbUnitInputDelayRandomPercent`,
        ),
    };
}

function RequireAuditedChannelShape(effect, label)
{
    if (effect.frontLevelDb !== 0
        || effect.rearLevelDb !== 0
        || effect.centerLevelDb !== 0
        || effect.lfeLevelDb > -96
        || effect.inputLfeLevelDb > -96)
    {
        throw new TypeError(`${label} has unsupported RoomVerb channel levels`);
    }
}

function RequireTuningFingerprint(effect, label)
{
    for (const [ property, expected ] of Object.entries(TUNING_FINGERPRINT))
    {
        if (Math.fround(effect[property]) !== Math.fround(expected))
        {
            throw new TypeError(
                `${label} has unsupported RoomVerb ${property}`,
            );
        }
    }
    if (effect.densityDelayMinSeconds > effect.densityDelayMaxSeconds
        || effect.roomShapeMin > effect.roomShapeMax)
    {
        throw new TypeError(`${label} has invalid RoomVerb tuning ranges`);
    }
}

function GetCachedImpulse(cache, key, create)
{
    let buffer = cache.get(key);

    if (!buffer)
    {
        buffer = create();
        cache.set(key, buffer);
    }
    return buffer;
}

function EarlyImpulseKey(effect, channels, sampleRate)
{
    return JSON.stringify([
        "early",
        channels,
        sampleRate,
        effect.earlyReflectionsPattern,
        effect.roomSizePercent,
        effect.stereoWidthDegrees,
    ]);
}

function LateImpulseKey(effect, channels, sampleRate)
{
    return JSON.stringify([
        "late",
        channels,
        sampleRate,
        effect.decayTimeSeconds,
        effect.hfDampingRatio,
        effect.diffusionPercent,
        effect.stereoWidthDegrees,
        effect.densityPercent,
        effect.roomShapePercent,
        effect.reverbUnitCount,
        effect.densityDelayMinSeconds,
        effect.densityDelayMaxSeconds,
        effect.densityDelayRandomPercent,
        effect.roomShapeMin,
        effect.roomShapeMax,
        effect.reverbUnitInputDelaySeconds,
        effect.reverbUnitInputDelayRandomPercent,
    ]);
}

function LateImpulseSeed(effect)
{
    let seed = 2166136261;
    const text = LateImpulseKey(effect, 0, 0);

    for (let index = 0; index < text.length; index++)
    {
        seed ^= text.charCodeAt(index);
        seed = Math.imul(seed, 16777619);
    }
    return seed >>> 0;
}

function CreateRandom(seed)
{
    let state = Number(seed) >>> 0 || 0x6d2b79f5;

    return () =>
    {
        state += 0x6d2b79f5;
        let value = state;

        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
}

function NormalizeImpulse(data, quality)
{
    let energy = 0;

    for (const value of data) energy += value * value;
    const scale = energy > 0
        ? Math.min(1, Math.sqrt(quality / 8 / energy))
        : 1;

    for (let index = 0; index < data.length; index++)
    {
        data[index] *= scale;
    }
}

/** Sequential little-endian reader for one exact v150 RoomVerb payload. */
class WwiseRoomVerbReader
{
    #view;
    #offset = 0;

    /** Wraps one already length-qualified RoomVerb byte block. */
    constructor(bytes)
    {
        this.#view = new DataView(
            bytes.buffer,
            bytes.byteOffset,
            bytes.byteLength,
        );
    }

    /** Reads the next little-endian float32. */
    F32()
    {
        const value = this.#view.getFloat32(this.#offset, true);

        this.#offset += 4;
        return value;
    }

    /** Reads the next little-endian uint32. */
    U32()
    {
        const value = this.#view.getUint32(this.#offset, true);

        this.#offset += 4;
        return value;
    }

    /** Reads the next strict Wwise byte boolean. */
    Bool()
    {
        const value = this.#view.getUint8(this.#offset++);

        if (value !== 0 && value !== 1)
        {
            throw new TypeError(`Invalid Wwise RoomVerb boolean: ${value}`);
        }
        return value === 1;
    }

    /** Verifies that the declared layout consumed the whole payload. */
    AssertComplete(label)
    {
        if (this.#offset !== this.#view.byteLength)
        {
            throw new TypeError(`${label} has trailing RoomVerb parameters`);
        }
    }
}

function Finite(value, min, max, label)
{
    const number = Number(value);

    if (!Number.isFinite(number) || number < min || number > max)
    {
        throw new TypeError(`${label} must be from ${min} to ${max}`);
    }
    return number;
}

function Integer(value, min, max, label)
{
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < min || number > max)
    {
        throw new TypeError(`${label} must be an integer from ${min} to ${max}`);
    }
    return number;
}

function MemberInteger(value, values, label)
{
    const number = Number(value);

    if (!Number.isSafeInteger(number) || !values.has(number))
    {
        throw new TypeError(`${label} is unsupported: ${value}`);
    }
    return number;
}

function Member(value, values, label)
{
    const text = String(value);

    if (!values.includes(text))
    {
        throw new TypeError(`${label} is unsupported: ${text}`);
    }
    return text;
}

function BooleanValue(value, label)
{
    if (typeof value !== "boolean")
    {
        throw new TypeError(`${label} must be boolean`);
    }
    return value;
}

function DbToGain(value)
{
    return value <= -96 ? 0 : 10 ** (value / 20);
}

function SetParam(parameter, value)
{
    if (parameter) parameter.value = value;
}
