import {
    createWwiseMatrixReverbApproximation,
    normalizeWwiseReverbMode,
} from "./wwiseMatrixReverb.js";

export const PARAMETRIC_EQ_PLUGIN_ID = 0x00690003;
export const WWISE_DELAY_PLUGIN_ID = 0x006a0003;
export const WWISE_COMPRESSOR_PLUGIN_ID = 0x006c0003;
export const WWISE_PEAK_LIMITER_PLUGIN_ID = 0x006e0003;
export const WWISE_MATRIX_REVERB_PLUGIN_ID = 0x00730003;
export const WWISE_FLANGER_PLUGIN_ID = 0x007d0003;
export const WWISE_GUITAR_DISTORTION_PLUGIN_ID = 0x007e0003;
export const WWISE_TREMOLO_PLUGIN_ID = 0x00830003;
export const WWISE_METER_PLUGIN_ID = 0x00810003;
const WWISE_METER_BANK_VERSION = 150;
const WWISE_TREMOLO_BANK_VERSION = 150;
const WWISE_GUITAR_DISTORTION_BANK_VERSION = 150;
const WWISE_MATRIX_REVERB_BANK_VERSION = 150;
const WWISE_MATRIX_REVERB_DELAY_COUNTS = new Set([ 4, 8, 12, 16 ]);

const WWISE_DYNAMICS_MODES = new Set([
    "strict",
    "approximate-web-audio",
]);
const WWISE_MODULATION_MODES = new Set([
    "strict",
    "approximate-web-audio",
]);
const WWISE_DISTORTION_MODES = new Set([
    "strict",
    "approximate-web-audio",
]);
const REALIZABLE_EFFECT_TYPES = new Set([
    "meter",
    "meter-omission",
    "compressor",
    "compressor-approximation",
    "peak-limiter",
    "peak-limiter-approximation",
    "delay",
    "flanger",
    "flanger-approximation",
    "tremolo",
    "tremolo-approximation",
    "guitar-distortion",
    "guitar-distortion-approximation",
    "matrix-reverb",
    "matrix-reverb-approximation",
    "parametric-eq",
]);
const WWISE_METER_FEEDBACK_MODES = new Set([
    "strict",
    "omit-telemetry",
]);
const WWISE_VOICE_LIMIT_MODES = new Set([
    "strict",
    "ignore",
]);

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
const DYNAMICS_THRESHOLD_MIN = Math.fround(-96.3);
const DYNAMICS_THRESHOLD_MAX = 0;
const DYNAMICS_RATIO_MIN = 1;
const DYNAMICS_RATIO_MAX = 50;
const COMPRESSOR_TIME_MIN = 0;
const COMPRESSOR_TIME_MAX = 2;
const WEB_AUDIO_DYNAMICS_TIME_MAX = 1;
const WEB_AUDIO_DYNAMICS_RATIO_MAX = 20;
const WEB_AUDIO_DYNAMICS_LOOKAHEAD = 0.006;
const PEAK_LIMITER_LOOKAHEAD_MIN = 0.001;
const PEAK_LIMITER_LOOKAHEAD_MAX = 0.02;
const PEAK_LIMITER_RELEASE_MIN = 0.001;
const PEAK_LIMITER_RELEASE_MAX = 5;
const DYNAMICS_OUTPUT_GAIN_MIN = -24;
const DYNAMICS_OUTPUT_GAIN_MAX = 24;
const FLANGER_DELAY_SECONDS_MIN = 0.0002;
const FLANGER_DELAY_SECONDS_MAX = 0.1;
const FLANGER_LEVEL_MIN = -1;
const FLANGER_LEVEL_MAX = 1;
const MODULATION_PERCENT_MIN = 0;
const MODULATION_PERCENT_MAX = 100;
const MODULATION_FREQUENCY_MIN = Math.fround(0.02);
const MODULATION_FREQUENCY_MAX = 20000;
const METER_MAX_TIME = 10;
const METER_MINIMUM_MIN = Math.fround(-96.3);
const METER_MINIMUM_MAX = 0;
const METER_MAXIMUM_MIN = Math.fround(-96.3);
const METER_MAXIMUM_MAX = 12;
const MATRIX_REVERB_TIME_MIN = 0.1;
const MATRIX_REVERB_TIME_MAX = 10;
const MATRIX_REVERB_HF_RATIO_MIN = 0.5;
const MATRIX_REVERB_HF_RATIO_MAX = 10;
const MATRIX_REVERB_LEVEL_MIN = Math.fround(-96.3);
const MATRIX_REVERB_LEVEL_MAX = 0;
const MATRIX_REVERB_PRE_DELAY_MIN = 0;
const MATRIX_REVERB_PRE_DELAY_MAX = 1;
const GUITAR_DISTORTION_CURVE_SAMPLES = 4096;
const GUITAR_DISTORTION_FILTER_TYPES = Object.freeze([
    "lowshelf",
    "peaking",
    "highshelf",
    "lowpass",
    "highpass",
    "bandpass",
    "notch",
]);
const GUITAR_DISTORTION_TYPES = Object.freeze([
    "none",
    "overdrive",
    "heavy",
    "fuzz",
    "clip",
]);

/** Validates the host policy for authored Wwise dynamics realization. */
export function normalizeWwiseDynamicsMode(value = "strict")
{
    const mode = String(value);

    if (!WWISE_DYNAMICS_MODES.has(mode))
    {
        throw new TypeError(
            `Unsupported Wwise dynamics realization mode: ${mode}`,
        );
    }
    return mode;
}

/** Validates the host policy for authored Wwise modulation realization. */
export function normalizeWwiseModulationMode(value = "strict")
{
    const mode = String(value);

    if (!WWISE_MODULATION_MODES.has(mode))
    {
        throw new TypeError(
            `Unsupported Wwise modulation realization mode: ${mode}`,
        );
    }
    return mode;
}

/** Validates the host policy for authored Wwise distortion realization. */
export function normalizeWwiseDistortionMode(value = "strict")
{
    const mode = String(value);

    if (!WWISE_DISTORTION_MODES.has(mode))
    {
        throw new TypeError(
            `Unsupported Wwise distortion realization mode: ${mode}`,
        );
    }
    return mode;
}

export { normalizeWwiseReverbMode };

/** Validates the host policy for observable Wwise Meter telemetry. */
export function normalizeWwiseMeterFeedbackMode(value = "strict")
{
    const mode = String(value);

    if (!WWISE_METER_FEEDBACK_MODES.has(mode))
    {
        throw new TypeError(
            `Unsupported Wwise Meter feedback mode: ${mode}`,
        );
    }
    return mode;
}

/** Validates host policy for the dynamic MaxNumInstances RTPC barrier. */
export function normalizeWwiseVoiceLimitMode(value = "strict")
{
    const mode = String(value);

    if (!WWISE_VOICE_LIMIT_MODES.has(mode))
    {
        throw new TypeError(
            `Unsupported Wwise voice-limit mode: ${mode}`,
        );
    }
    return mode;
}

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
        const effects = normalizeStaticParametricEqChain(
            rawEffects,
            `Audio Bus effect bus ${busId}`,
        );

        result.set(busId, effects);
    }
    return result;
}

/** Validates one ordered, static Parametric-EQ-only effect chain. */
export function normalizeStaticParametricEqChain(value, ownerLabel)
{
    return NormalizeStaticWwiseEffectChain(value, ownerLabel, false);
}

/** Validates one ordered static effect chain supported on a source voice. */
export function normalizeStaticSourceEffectChain(value, ownerLabel)
{
    return NormalizeStaticWwiseEffectChain(value, ownerLabel, true);
}

function NormalizeStaticWwiseEffectChain(value, ownerLabel, allowSourceEffects)
{
    if (!Array.isArray(value) || !value.length)
    {
        throw new TypeError(`${ownerLabel} must have effects`);
    }
    const slots = new Set();
    const effects = value.map((rawEffect, effectIndex) =>
    {
        const label = `${ownerLabel} effect ${effectIndex}`;
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
        if (allowSourceEffects && effect.type === "delay")
        {
            if (effect.processLfe !== true)
            {
                throw new TypeError(
                    `${label} processLfe must be true until independent LFE routing is supported`,
                );
            }
            if (typeof effect.feedbackEnabled !== "boolean")
            {
                throw new TypeError(`${label} feedbackEnabled must be boolean`);
            }
            return Object.freeze({
                effectId,
                slotIndex,
                type: "delay",
                delayTimeSeconds: BoundedFinite(
                    effect.delayTimeSeconds,
                    DELAY_TIME_MIN,
                    DELAY_TIME_MAX,
                    `${label} delayTimeSeconds`,
                ),
                feedbackPercent: BoundedFinite(
                    effect.feedbackPercent,
                    DELAY_PERCENT_MIN,
                    DELAY_PERCENT_MAX,
                    `${label} feedbackPercent`,
                ),
                wetDryMixPercent: BoundedFinite(
                    effect.wetDryMixPercent,
                    DELAY_PERCENT_MIN,
                    DELAY_PERCENT_MAX,
                    `${label} wetDryMixPercent`,
                ),
                outputGainDb: BoundedFinite(
                    effect.outputGainDb,
                    DELAY_OUTPUT_GAIN_MIN,
                    DELAY_OUTPUT_GAIN_MAX,
                    `${label} outputGainDb`,
                ),
                feedbackEnabled: effect.feedbackEnabled,
                processLfe: true,
            });
        }
        if (allowSourceEffects && effect.type === "compressor")
        {
            if (effect.processLfe !== true || effect.channelLink !== true)
            {
                throw new TypeError(
                    `${label} requires unsupported independent dynamics channels`,
                );
            }
            return Object.freeze({
                effectId,
                slotIndex,
                type: "compressor",
                thresholdDb: BoundedFinite(
                    effect.thresholdDb,
                    DYNAMICS_THRESHOLD_MIN,
                    DYNAMICS_THRESHOLD_MAX,
                    `${label} thresholdDb`,
                ),
                ratio: BoundedFinite(
                    effect.ratio,
                    DYNAMICS_RATIO_MIN,
                    DYNAMICS_RATIO_MAX,
                    `${label} ratio`,
                ),
                attackSeconds: BoundedFinite(
                    effect.attackSeconds,
                    Number.MIN_VALUE,
                    WEB_AUDIO_DYNAMICS_TIME_MAX,
                    `${label} attackSeconds`,
                ),
                releaseSeconds: BoundedFinite(
                    effect.releaseSeconds,
                    COMPRESSOR_TIME_MIN,
                    WEB_AUDIO_DYNAMICS_TIME_MAX,
                    `${label} releaseSeconds`,
                ),
                outputGainDb: BoundedFinite(
                    effect.outputGainDb,
                    DYNAMICS_OUTPUT_GAIN_MIN,
                    DYNAMICS_OUTPUT_GAIN_MAX,
                    `${label} outputGainDb`,
                ),
                processLfe: true,
                channelLink: true,
            });
        }
        if (allowSourceEffects && effect.type === "peak-limiter")
        {
            if (effect.processLfe !== true || effect.channelLink !== true)
            {
                throw new TypeError(
                    `${label} requires unsupported independent dynamics channels`,
                );
            }
            return Object.freeze({
                effectId,
                slotIndex,
                type: "peak-limiter",
                thresholdDb: BoundedFinite(
                    effect.thresholdDb,
                    DYNAMICS_THRESHOLD_MIN,
                    DYNAMICS_THRESHOLD_MAX,
                    `${label} thresholdDb`,
                ),
                ratio: BoundedFinite(
                    effect.ratio,
                    DYNAMICS_RATIO_MIN,
                    DYNAMICS_RATIO_MAX,
                    `${label} ratio`,
                ),
                lookaheadSeconds: BoundedFinite(
                    effect.lookaheadSeconds,
                    PEAK_LIMITER_LOOKAHEAD_MIN,
                    PEAK_LIMITER_LOOKAHEAD_MAX,
                    `${label} lookaheadSeconds`,
                ),
                releaseSeconds: BoundedFinite(
                    effect.releaseSeconds,
                    PEAK_LIMITER_RELEASE_MIN,
                    WEB_AUDIO_DYNAMICS_TIME_MAX,
                    `${label} releaseSeconds`,
                ),
                outputGainDb: BoundedFinite(
                    effect.outputGainDb,
                    DYNAMICS_OUTPUT_GAIN_MIN,
                    DYNAMICS_OUTPUT_GAIN_MAX,
                    `${label} outputGainDb`,
                ),
                processLfe: true,
                channelLink: true,
            });
        }
        if (allowSourceEffects && effect.type === "flanger")
        {
            if (typeof effect.lfoEnabled !== "boolean"
                || typeof effect.processCenter !== "boolean"
                || typeof effect.processLfe !== "boolean")
            {
                throw new TypeError(
                    `${label} Flanger flags must be boolean`,
                );
            }
            return Object.freeze({
                effectId,
                slotIndex,
                type: "flanger",
                delayTimeSeconds: BoundedFinite(
                    effect.delayTimeSeconds,
                    FLANGER_DELAY_SECONDS_MIN,
                    FLANGER_DELAY_SECONDS_MAX,
                    `${label} delayTimeSeconds`,
                ),
                blend: BoundedFinite(
                    effect.blend,
                    0,
                    1,
                    `${label} blend`,
                ),
                feedforward: BoundedFinite(
                    effect.feedforward,
                    FLANGER_LEVEL_MIN,
                    FLANGER_LEVEL_MAX,
                    `${label} feedforward`,
                ),
                feedback: BoundedFinite(
                    effect.feedback,
                    FLANGER_LEVEL_MIN,
                    FLANGER_LEVEL_MAX,
                    `${label} feedback`,
                ),
                modulationDepthPercent: BoundedFinite(
                    effect.modulationDepthPercent,
                    MODULATION_PERCENT_MIN,
                    MODULATION_PERCENT_MAX,
                    `${label} modulationDepthPercent`,
                ),
                modulationFrequencyHz: BoundedFinite(
                    effect.modulationFrequencyHz,
                    MODULATION_FREQUENCY_MIN,
                    MODULATION_FREQUENCY_MAX,
                    `${label} modulationFrequencyHz`,
                ),
                outputGainDb: BoundedFinite(
                    effect.outputGainDb,
                    DYNAMICS_OUTPUT_GAIN_MIN,
                    DYNAMICS_OUTPUT_GAIN_MAX,
                    `${label} outputGainDb`,
                ),
                wetDryMixPercent: BoundedFinite(
                    effect.wetDryMixPercent,
                    MODULATION_PERCENT_MIN,
                    MODULATION_PERCENT_MAX,
                    `${label} wetDryMixPercent`,
                ),
                lfoEnabled: effect.lfoEnabled,
                processCenter: effect.processCenter,
                processLfe: effect.processLfe,
            });
        }
        if (allowSourceEffects && effect.type === "tremolo")
        {
            if (typeof effect.processCenter !== "boolean"
                || typeof effect.processLfe !== "boolean")
            {
                throw new TypeError(
                    `${label} Tremolo flags must be boolean`,
                );
            }
            return Object.freeze({
                effectId,
                slotIndex,
                type: "tremolo",
                modulationDepthPercent: BoundedFinite(
                    effect.modulationDepthPercent,
                    MODULATION_PERCENT_MIN,
                    MODULATION_PERCENT_MAX,
                    `${label} modulationDepthPercent`,
                ),
                modulationFrequencyHz: BoundedFinite(
                    effect.modulationFrequencyHz,
                    MODULATION_FREQUENCY_MIN,
                    MODULATION_FREQUENCY_MAX,
                    `${label} modulationFrequencyHz`,
                ),
                outputGainDb: BoundedFinite(
                    effect.outputGainDb,
                    DYNAMICS_OUTPUT_GAIN_MIN,
                    DYNAMICS_OUTPUT_GAIN_MAX,
                    `${label} outputGainDb`,
                ),
                processCenter: effect.processCenter,
                processLfe: effect.processLfe,
            });
        }
        if (allowSourceEffects && effect.type === "guitar-distortion")
        {
            const preEqBands = NormalizeGuitarDistortionBands(
                effect.preEqBands,
                `${label} preEqBands`,
            );
            const postEqBands = NormalizeGuitarDistortionBands(
                effect.postEqBands,
                `${label} postEqBands`,
            );
            const distortionType = String(effect.distortionType ?? "");

            if (distortionType !== "overdrive"
                && distortionType !== "heavy")
            {
                throw new TypeError(
                    `${label} has unsupported distortionType ${distortionType}`,
                );
            }
            return Object.freeze({
                effectId,
                slotIndex,
                type: "guitar-distortion",
                preEqBands,
                postEqBands,
                distortionType,
                drivePercent: BoundedFinite(
                    effect.drivePercent,
                    0,
                    100,
                    `${label} drivePercent`,
                ),
                tonePercent: BoundedFinite(
                    effect.tonePercent,
                    0,
                    100,
                    `${label} tonePercent`,
                ),
                rectificationPercent: BoundedFinite(
                    effect.rectificationPercent,
                    0,
                    100,
                    `${label} rectificationPercent`,
                ),
                outputGainDb: BoundedFinite(
                    effect.outputGainDb,
                    DYNAMICS_OUTPUT_GAIN_MIN,
                    DYNAMICS_OUTPUT_GAIN_MAX,
                    `${label} outputGainDb`,
                ),
                wetDryMixPercent: BoundedFinite(
                    effect.wetDryMixPercent,
                    100,
                    100,
                    `${label} wetDryMixPercent`,
                ),
            });
        }
        if (allowSourceEffects && effect.type === "matrix-reverb")
        {
            if (effect.processLfe !== true
                || effect.delayLengthsMode !== "default"
                || !WWISE_MATRIX_REVERB_DELAY_COUNTS.has(
                    Number(effect.numberOfDelays),
                ))
            {
                throw new TypeError(
                    `${label} has unsupported Matrix Reverb routing`,
                );
            }
            return Object.freeze({
                effectId,
                slotIndex,
                type: "matrix-reverb",
                reverbTimeSeconds: BoundedFinite(
                    effect.reverbTimeSeconds,
                    MATRIX_REVERB_TIME_MIN,
                    MATRIX_REVERB_TIME_MAX,
                    `${label} reverbTimeSeconds`,
                ),
                hfRatio: BoundedFinite(
                    effect.hfRatio,
                    MATRIX_REVERB_HF_RATIO_MIN,
                    MATRIX_REVERB_HF_RATIO_MAX,
                    `${label} hfRatio`,
                ),
                numberOfDelays: Number(effect.numberOfDelays),
                dryLevelDb: BoundedFinite(
                    effect.dryLevelDb,
                    MATRIX_REVERB_LEVEL_MIN,
                    MATRIX_REVERB_LEVEL_MAX,
                    `${label} dryLevelDb`,
                ),
                wetLevelDb: BoundedFinite(
                    effect.wetLevelDb,
                    MATRIX_REVERB_LEVEL_MIN,
                    MATRIX_REVERB_LEVEL_MAX,
                    `${label} wetLevelDb`,
                ),
                preDelaySeconds: BoundedFinite(
                    effect.preDelaySeconds,
                    MATRIX_REVERB_PRE_DELAY_MIN,
                    MATRIX_REVERB_PRE_DELAY_MAX,
                    `${label} preDelaySeconds`,
                ),
                processLfe: true,
                delayLengthsMode: "default",
            });
        }
        if (allowSourceEffects && effect.type === "meter")
        {
            if (typeof effect.infiniteHold !== "boolean")
            {
                throw new TypeError(`${label} infiniteHold must be boolean`);
            }
            const mode = String(effect.mode ?? "");
            const scope = String(effect.scope ?? "");
            const minimum = BoundedFinite(
                effect.minimum,
                METER_MINIMUM_MIN,
                METER_MINIMUM_MAX,
                `${label} minimum`,
            );
            const maximum = BoundedFinite(
                effect.maximum,
                METER_MAXIMUM_MIN,
                METER_MAXIMUM_MAX,
                `${label} maximum`,
            );

            if (mode !== "peak" && mode !== "rms")
            {
                throw new TypeError(`${label} has unsupported mode ${mode}`);
            }
            if (scope !== "global" && scope !== "game-object")
            {
                throw new TypeError(`${label} has unsupported scope ${scope}`);
            }
            if (effect.applyDownstreamVolume !== false)
            {
                throw new TypeError(
                    `${label} requires unsupported downstream-volume feedback`,
                );
            }
            if (minimum > maximum)
            {
                throw new TypeError(`${label} minimum exceeds maximum`);
            }
            return Object.freeze({
                effectId,
                slotIndex,
                type: "meter",
                attack: BoundedFinite(
                    effect.attack,
                    0,
                    METER_MAX_TIME,
                    `${label} attack`,
                ),
                release: BoundedFinite(
                    effect.release,
                    0,
                    METER_MAX_TIME,
                    `${label} release`,
                ),
                minimum,
                maximum,
                hold: BoundedFinite(
                    effect.hold,
                    0,
                    METER_MAX_TIME,
                    `${label} hold`,
                ),
                infiniteHold: effect.infiniteHold,
                mode,
                scope,
                applyDownstreamVolume: false,
                gameParameterId: BoundedInteger(
                    effect.gameParameterId,
                    0,
                    0xffffffff,
                    `${label} gameParameterId`,
                ),
            });
        }
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

    return Object.freeze(effects);
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

    return createWwiseEffectChain(context, effects);
}

/** Creates one ordered browser effect chain from normalized portable records. */
export function createWwiseEffectChain(
    context,
    effects,
    {
        wwiseDynamics = "strict",
        wwiseModulation = "strict",
        wwiseDistortion = "strict",
        wwiseReverb = "strict",
        wwiseMeterFeedback = "strict",
    } = {},
)
{
    if (!Array.isArray(effects) || !effects.length) return null;
    const dynamicsMode = normalizeWwiseDynamicsMode(wwiseDynamics);
    const modulationMode = normalizeWwiseModulationMode(wwiseModulation);
    const distortionMode = normalizeWwiseDistortionMode(wwiseDistortion);
    const reverbMode = normalizeWwiseReverbMode(wwiseReverb);
    const meterFeedbackMode = normalizeWwiseMeterFeedbackMode(
        wwiseMeterFeedback,
    );

    // A source effect override is one ordered authored unit. In strict mode,
    // preserve the existing audible dry fallback by omitting the complete
    // chain instead of applying only the non-dynamics siblings.
    const sourceDynamics = effects.filter(effect =>
        effect.type === "compressor" || effect.type === "peak-limiter");
    const dynamicsEffects = effects.filter(effect =>
        effect.type === "compressor"
        || effect.type === "compressor-approximation"
        || effect.type === "peak-limiter"
        || effect.type === "peak-limiter-approximation");
    const sourceDelays = effects.filter(effect => effect.type === "delay");
    const sourceEqualizers = effects.filter(effect =>
        effect.type === "parametric-eq");
    const sourceFlangers = effects.filter(effect => effect.type === "flanger");
    const sourceTremolos = effects.filter(effect => effect.type === "tremolo");
    const flangerEffects = effects.filter(effect =>
        effect.type === "flanger"
        || effect.type === "flanger-approximation");
    const tremoloEffects = effects.filter(effect =>
        effect.type === "tremolo"
        || effect.type === "tremolo-approximation");
    const hasSourceModulation = sourceFlangers.length > 0
        || sourceTremolos.length > 0;
    const hasModulation = flangerEffects.length > 0
        || tremoloEffects.length > 0;
    const sourceDistortions = effects.filter(effect =>
        effect.type === "guitar-distortion");
    const sourceMeters = effects.filter(effect => effect.type === "meter");
    const distortionEffects = effects.filter(effect =>
        effect.type === "guitar-distortion"
        || effect.type === "guitar-distortion-approximation");
    const sourceReverbs = effects.filter(effect =>
        effect.type === "matrix-reverb");
    const reverbEffects = effects.filter(effect =>
        effect.type === "matrix-reverb"
        || effect.type === "matrix-reverb-approximation");

    for (const effect of effects)
    {
        if (!REALIZABLE_EFFECT_TYPES.has(effect.type))
        {
            throw new TypeError(`Unsupported shared Bus effect ${effect.type}`);
        }
    }

    if (sourceDynamics.length && dynamicsMode === "strict")
    {
        return null;
    }
    if (hasSourceModulation && modulationMode === "strict")
    {
        return null;
    }
    if (sourceDistortions.length && distortionMode === "strict")
    {
        return null;
    }
    if (sourceReverbs.length && reverbMode === "strict")
    {
        return null;
    }
    if (sourceMeters.some(effect =>
        effect.applyDownstreamVolume !== false))
    {
        return null;
    }
    if (meterFeedbackMode === "strict"
        && sourceMeters.some(effect => effect.gameParameterId !== 0))
    {
        return null;
    }
    const needsGain = dynamicsEffects.length > 0
        || sourceDelays.length > 0
        || hasModulation
        || reverbEffects.length > 0
        || distortionEffects.some(effect => effect.outputGainDb !== 0)
        || sourceEqualizers.some(effect => effect.outputGainDb !== 0);
    const needsDelay = sourceDelays.length > 0
        || reverbEffects.length > 0
        || flangerEffects.length > 0
        || dynamicsEffects.some(effect =>
            (effect.type === "peak-limiter"
                || effect.type === "peak-limiter-approximation")
            && effect.lookaheadSeconds > WEB_AUDIO_DYNAMICS_LOOKAHEAD);
    const needsBiquad = sourceEqualizers.some(effect => effect.bands.length);
    const needsReverbBiquad = reverbEffects.length > 0;
    const needsDistortionBiquad = distortionEffects.some(effect =>
        effect.preEqBands.length || effect.postEqBands.length);
    const needsOscillator = tremoloEffects.some(effect =>
        effect.modulationDepthPercent > 0)
        || flangerEffects.some(effect =>
            effect.lfoEnabled && effect.modulationDepthPercent > 0);

    if (needsGain && typeof context?.createGain !== "function")
    {
        return null;
    }
    if (needsDelay && typeof context?.createDelay !== "function")
    {
        return null;
    }
    if ((needsBiquad || needsDistortionBiquad || needsReverbBiquad)
        && typeof context?.createBiquadFilter !== "function")
    {
        return null;
    }
    if (dynamicsEffects.length
        && typeof context?.createDynamicsCompressor !== "function")
    {
        return null;
    }
    if (tremoloEffects.some(effect =>
        !effect.processCenter || !effect.processLfe))
    {
        return null;
    }
    if (needsOscillator && typeof context?.createOscillator !== "function")
    {
        return null;
    }
    if (distortionEffects.length
        && typeof context?.createWaveShaper !== "function")
    {
        return null;
    }
    const realizedEffects = effects.map(effect =>
        effect.type === "compressor"
            ? RequireApproximateDynamics(
                effect,
                "compressor-approximation",
            )
            : effect.type === "peak-limiter"
                ? RequireApproximateDynamics(
                    effect,
                    "peak-limiter-approximation",
                )
            : effect.type === "flanger"
                ? { ...effect, type: "flanger-approximation" }
            : effect.type === "tremolo"
                ? { ...effect, type: "tremolo-approximation" }
            : effect.type === "guitar-distortion"
                ? { ...effect, type: "guitar-distortion-approximation" }
            : effect.type === "matrix-reverb"
                ? { ...effect, type: "matrix-reverb-approximation" }
            : effect.type === "meter"
                ? {
                    ...effect,
                    type: "meter-omission",
                    telemetryOmitted: effect.gameParameterId !== 0,
                }
            : effect);
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

    for (const effect of realizedEffects)
    {
        if (effect.type === "meter-omission") continue;
        if (effect.type === "compressor-approximation"
            || effect.type === "peak-limiter-approximation")
        {
            const stage = CreateWwiseDynamicsApproximation(context, effect);

            if (output) output.connect(stage.input);
            else input = stage.input;
            output = stage.output;
            nodes.push(...stage.nodes);
            continue;
        }
        if (effect.type === "delay")
        {
            const stage = CreateWwiseDelayStage(context, effect);

            if (output) output.connect(stage.input);
            else input = stage.input;
            output = stage.output;
            nodes.push(...stage.nodes);
            continue;
        }
        if (effect.type === "flanger-approximation")
        {
            const stage = CreateWwiseFlangerApproximation(context, effect);

            if (output) output.connect(stage.input);
            else input = stage.input;
            output = stage.output;
            nodes.push(...stage.nodes);
            continue;
        }
        if (effect.type === "tremolo-approximation")
        {
            const stage = CreateWwiseTremoloApproximation(context, effect);

            if (output) output.connect(stage.input);
            else input = stage.input;
            output = stage.output;
            nodes.push(...stage.nodes);
            continue;
        }
        if (effect.type === "guitar-distortion-approximation")
        {
            const stage = CreateWwiseGuitarDistortionApproximation(
                context,
                effect,
            );

            if (output) output.connect(stage.input);
            else input = stage.input;
            output = stage.output;
            nodes.push(...stage.nodes);
            continue;
        }
        if (effect.type === "matrix-reverb-approximation")
        {
            const stage = createWwiseMatrixReverbApproximation(
                context,
                effect,
            );

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
            const filter = CreateBiquadFilter(context, band);

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

/** Creates the bounded browser approximation of static Wwise distortion. */
function CreateWwiseGuitarDistortionApproximation(context, effect)
{
    const shaper = context.createWaveShaper();
    const curve = new Float32Array(GUITAR_DISTORTION_CURVE_SAMPLES);
    const driveDivisor = effect.distortionType === "heavy" ? 8 : 12;
    const drive = 1 + effect.drivePercent / driveDivisor;
    const normalizer = Math.tanh(drive);
    const rectification = effect.rectificationPercent / 100;

    // wwiser proves the parameter record, not Audiokinetic's proprietary
    // Heavy transfer law. This normalized tanh curve is intentionally our
    // stable approximation and never participates in strict playback.
    for (let index = 0; index < curve.length; index++)
    {
        const input = index * 2 / (curve.length - 1) - 1;

        const shaped = Math.tanh(drive * input) / normalizer;

        curve[index] = (1 - rectification) * shaped
            + rectification * Math.abs(shaped);
    }
    shaper.curve = curve;
    shaper.oversample = "4x";
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

    for (const band of effect.preEqBands)
    {
        append(CreateBiquadFilter(context, band));
    }
    append(shaper);

    for (const band of effect.postEqBands)
    {
        append(CreateBiquadFilter(context, band));
    }
    if (effect.outputGainDb !== 0)
    {
        const gain = context.createGain();

        SetParam(gain.gain, 10 ** (effect.outputGainDb / 20));
        append(gain);
    }
    return { input, output, nodes };
}

function CreateBiquadFilter(context, band)
{
    const filter = context.createBiquadFilter();
    const nyquist = Number(context.sampleRate) / 2;

    filter.type = band.filterType;
    SetParam(filter.frequency, Number.isFinite(nyquist) && nyquist > 0
        ? Math.min(band.frequencyHz, nyquist)
        : band.frequencyHz);
    SetParam(filter.Q, band.q);
    SetParam(filter.gain, band.gainDb);
    return filter;
}

/** Creates a static, all-channel browser approximation of Wwise Flanger. */
function CreateWwiseFlangerApproximation(context, effect)
{
    const input = context.createGain();
    const delayRange = effect.delayTimeSeconds
        * effect.modulationDepthPercent / 100;
    const delay = context.createDelay(effect.delayTimeSeconds + delayRange);
    const dry = context.createGain();
    const blend = context.createGain();
    const feedforward = context.createGain();
    const feedback = context.createGain();
    const wet = context.createGain();
    const output = context.createGain();
    const mix = effect.wetDryMixPercent / 100;
    const nodes = [
        input,
        delay,
        dry,
        blend,
        feedforward,
        feedback,
        wet,
        output,
    ];

    SetParam(delay.delayTime, effect.delayTimeSeconds);
    SetParam(dry.gain, 1 - mix);
    SetParam(blend.gain, effect.blend);
    SetParam(feedforward.gain, effect.feedforward);
    SetParam(
        feedback.gain,
        Math.max(-0.999, Math.min(0.999, effect.feedback)),
    );
    SetParam(wet.gain, mix);
    SetParam(output.gain, 10 ** (effect.outputGainDb / 20));
    input.connect(dry);
    dry.connect(output);
    input.connect(blend);
    blend.connect(wet);
    input.connect(delay);
    delay.connect(feedforward);
    feedforward.connect(wet);
    delay.connect(feedback);
    feedback.connect(delay);
    wet.connect(output);

    if (effect.lfoEnabled && delayRange > 0)
    {
        const depth = context.createGain();
        const oscillator = context.createOscillator();

        oscillator.type = "sine";
        SetParam(oscillator.frequency, effect.modulationFrequencyHz);
        SetParam(depth.gain, delayRange);
        oscillator.connect(depth);
        depth.connect(delay.delayTime);
        nodes.push(depth, oscillator);
    }
    return { input, output, nodes };
}

/** Creates a static, all-channel browser approximation of Wwise Tremolo. */
function CreateWwiseTremoloApproximation(context, effect)
{
    const input = context.createGain();
    const output = context.createGain();
    const depth = effect.modulationDepthPercent / 100;
    const nodes = [ input, output ];

    // Wwise describes a unipolar sine carrier. A bipolar Web Audio oscillator
    // reaches the same [1-depth, 1] range around this constant midpoint.
    SetParam(input.gain, 1 - depth / 2);
    SetParam(output.gain, 10 ** (effect.outputGainDb / 20));
    input.connect(output);

    if (depth > 0)
    {
        const modulation = context.createGain();
        const oscillator = context.createOscillator();

        oscillator.type = "sine";
        SetParam(oscillator.frequency, effect.modulationFrequencyHz);
        SetParam(modulation.gain, depth / 2);
        oscillator.connect(modulation);
        modulation.connect(input.gain);
        nodes.push(modulation, oscillator);
    }
    return { input, output, nodes };
}

/**
 * Creates an explicitly approximate browser dynamics stage.
 *
 * DynamicsCompressorNode has a fixed 6 ms lookahead, a 20:1 ratio ceiling,
 * mandatory automatic makeup, and browser-defined detector/envelope behavior.
 * The post gain cancels the specified hard-knee makeup before applying Wwise's
 * authored output gain. A Peak Limiter receives only the additional delay
 * needed to reach an authored lookahead longer than Web Audio's fixed delay.
 */
function CreateWwiseDynamicsApproximation(context, effect)
{
    if (typeof context?.createDynamicsCompressor !== "function"
        || typeof context?.createGain !== "function")
    {
        throw new TypeError(
            "DynamicsCompressorNode and GainNode support is required for approximate Wwise dynamics",
        );
    }
    const dynamics = context.createDynamicsCompressor();
    const ratio = Math.min(effect.ratio, WEB_AUDIO_DYNAMICS_RATIO_MAX);
    const makeupDb = -0.6 * effect.thresholdDb * (1 - 1 / ratio);
    const gain = context.createGain();
    const nodes = [ dynamics ];

    SetParam(dynamics.threshold, effect.thresholdDb);
    SetParam(dynamics.knee, 0);
    SetParam(dynamics.ratio, ratio);
    SetParam(
        dynamics.attack,
        effect.type === "peak-limiter-approximation"
            ? 0
            : effect.attackSeconds,
    );
    SetParam(dynamics.release, effect.releaseSeconds);
    dynamics.connect(gain);
    SetParam(gain.gain, 10 ** ((effect.outputGainDb - makeupDb) / 20));
    nodes.push(gain);
    let output = gain;

    if (effect.type === "peak-limiter-approximation"
        && effect.lookaheadSeconds > WEB_AUDIO_DYNAMICS_LOOKAHEAD)
    {
        if (typeof context?.createDelay !== "function")
        {
            throw new TypeError(
                "DelayNode support is required to approximate Wwise Peak Limiter lookahead",
            );
        }
        const delaySeconds = effect.lookaheadSeconds
            - WEB_AUDIO_DYNAMICS_LOOKAHEAD;
        const delay = context.createDelay(delaySeconds);

        SetParam(delay.delayTime, delaySeconds);
        gain.connect(delay);
        output = delay;
        nodes.push(delay);
    }
    return { input: dynamics, output, nodes };
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
    return parseStaticWwiseDelayBytes(
        RequireStaticGraphEffect(
            effect,
            WWISE_DELAY_PLUGIN_ID,
            18,
            label,
            "Wwise Delay",
        ),
        { effectId, slotIndex, label },
    );
}

/** Decodes one source-proven static v150 Wwise Delay parameter block. */
export function parseStaticWwiseDelayBytes(
    bytes,
    {
        effectId,
        slotIndex,
        label = `Wwise Delay ${effectId}`,
    } = {},
)
{
    if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 18)
    {
        throw new TypeError(`${label} has an unsupported parameter block`);
    }
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

/** Decodes the pinned-wwiser static v150 Wwise Flanger parameter block. */
export function parseStaticWwiseFlangerBytes(
    bytes,
    {
        effectId,
        slotIndex,
        label = `Wwise Flanger ${effectId}`,
    } = {},
)
{
    if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 59)
    {
        throw new TypeError(`${label} has an unsupported parameter block`);
    }
    const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
    );
    const delayTimeMs = view.getFloat32(0, true);
    const blend = view.getFloat32(4, true);
    const feedforward = view.getFloat32(8, true);
    const feedback = view.getFloat32(12, true);
    const modulationDepthPercent = view.getFloat32(16, true);
    const modulationFrequencyHz = view.getFloat32(20, true);
    const waveform = view.getUint32(24, true);
    const smoothingPercent = view.getFloat32(28, true);
    const pwmPercent = view.getFloat32(32, true);
    const phaseOffsetDegrees = view.getFloat32(36, true);
    const phaseMode = view.getUint32(40, true);
    const phaseSpreadDegrees = view.getFloat32(44, true);
    const outputGainDb = view.getFloat32(48, true);
    const wetDryMixPercent = view.getFloat32(52, true);
    const lfoEnabledRaw = view.getUint8(56);
    const processCenterRaw = view.getUint8(57);
    const processLfeRaw = view.getUint8(58);

    if (!Number.isFinite(delayTimeMs)
        || delayTimeMs < FLANGER_DELAY_SECONDS_MIN * 1000
        || delayTimeMs > FLANGER_DELAY_SECONDS_MAX * 1000
        || !Number.isFinite(blend)
        || blend < 0
        || blend > 1
        || !Number.isFinite(feedforward)
        || feedforward < FLANGER_LEVEL_MIN
        || feedforward > FLANGER_LEVEL_MAX
        || !Number.isFinite(feedback)
        || feedback < FLANGER_LEVEL_MIN
        || feedback > FLANGER_LEVEL_MAX
        || !Number.isFinite(modulationDepthPercent)
        || modulationDepthPercent < MODULATION_PERCENT_MIN
        || modulationDepthPercent > MODULATION_PERCENT_MAX
        || !Number.isFinite(modulationFrequencyHz)
        || modulationFrequencyHz < MODULATION_FREQUENCY_MIN
        || modulationFrequencyHz > MODULATION_FREQUENCY_MAX
        || waveform !== 0
        || !Number.isFinite(smoothingPercent)
        || smoothingPercent < MODULATION_PERCENT_MIN
        || smoothingPercent > MODULATION_PERCENT_MAX
        || !Number.isFinite(pwmPercent)
        || pwmPercent < MODULATION_PERCENT_MIN
        || pwmPercent > MODULATION_PERCENT_MAX
        || phaseOffsetDegrees !== 0
        || phaseMode !== 0
        || phaseSpreadDegrees !== 0
        || !Number.isFinite(outputGainDb)
        || outputGainDb < DYNAMICS_OUTPUT_GAIN_MIN
        || outputGainDb > DYNAMICS_OUTPUT_GAIN_MAX
        || !Number.isFinite(wetDryMixPercent)
        || wetDryMixPercent < MODULATION_PERCENT_MIN
        || wetDryMixPercent > MODULATION_PERCENT_MAX
        || lfoEnabledRaw > 1
        || processCenterRaw > 1
        || processLfeRaw > 1)
    {
        throw new TypeError(`${label} has invalid Wwise Flanger parameters`);
    }
    return {
        effectId: String(effectId),
        slotIndex: Number(slotIndex),
        type: "flanger",
        delayTimeSeconds: delayTimeMs / 1000,
        blend,
        feedforward,
        feedback,
        modulationDepthPercent,
        modulationFrequencyHz,
        outputGainDb,
        wetDryMixPercent,
        lfoEnabled: lfoEnabledRaw === 1,
        processCenter: processCenterRaw === 1,
        processLfe: processLfeRaw === 1,
    };
}

/** Qualifies and decodes one static source-local Wwise Flanger graph record. */
export function parseGraphStaticWwiseFlanger(effect, effectId, slotIndex)
{
    const label = `Audio Bus graph effect ${effectId}`;

    return parseStaticWwiseFlangerBytes(
        RequireStaticGraphEffect(
            effect,
            WWISE_FLANGER_PLUGIN_ID,
            59,
            label,
            "Wwise Flanger",
        ),
        { effectId, slotIndex, label },
    );
}

/**
 * Decodes the empirical EVE-v150 Wwise Tremolo parameter block.
 *
 * Pinned wwiser identifies the plug-in and shows the corresponding modulation
 * and phase sequence inside Flanger, but does not decode Tremolo's own 38-byte
 * record. The EVE corpus supports this version- and shape-bounded inference.
 */
export function parseStaticWwiseTremoloBytes(
    bytes,
    {
        effectId,
        slotIndex,
        label = `Wwise Tremolo ${effectId}`,
        bankVersion = WWISE_TREMOLO_BANK_VERSION,
    } = {},
)
{
    if (Number(bankVersion) !== WWISE_TREMOLO_BANK_VERSION
        || !(bytes instanceof Uint8Array)
        || bytes.byteLength !== 38)
    {
        throw new TypeError(`${label} has an unsupported parameter block`);
    }
    const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
    );
    const modulationDepthPercent = view.getFloat32(0, true);
    const modulationFrequencyHz = view.getFloat32(4, true);
    const waveform = view.getUint32(8, true);
    const smoothingPercent = view.getFloat32(12, true);
    const pwmPercent = view.getFloat32(16, true);
    const phaseOffsetDegrees = view.getFloat32(20, true);
    const phaseMode = view.getUint32(24, true);
    const phaseSpreadDegrees = view.getFloat32(28, true);
    const outputGainDb = view.getFloat32(32, true);
    const processCenterRaw = view.getUint8(36);
    const processLfeRaw = view.getUint8(37);

    if (!Number.isFinite(modulationDepthPercent)
        || modulationDepthPercent < MODULATION_PERCENT_MIN
        || modulationDepthPercent > MODULATION_PERCENT_MAX
        || !Number.isFinite(modulationFrequencyHz)
        || modulationFrequencyHz < MODULATION_FREQUENCY_MIN
        || modulationFrequencyHz > MODULATION_FREQUENCY_MAX
        || waveform !== 0
        || !Number.isFinite(smoothingPercent)
        || smoothingPercent < MODULATION_PERCENT_MIN
        || smoothingPercent > MODULATION_PERCENT_MAX
        || !Number.isFinite(pwmPercent)
        || pwmPercent < MODULATION_PERCENT_MIN
        || pwmPercent > MODULATION_PERCENT_MAX
        || phaseOffsetDegrees !== 0
        || phaseMode !== 0
        || phaseSpreadDegrees !== 0
        || !Number.isFinite(outputGainDb)
        || outputGainDb < DYNAMICS_OUTPUT_GAIN_MIN
        || outputGainDb > DYNAMICS_OUTPUT_GAIN_MAX
        || processCenterRaw !== 1
        || processLfeRaw !== 1)
    {
        throw new TypeError(`${label} has invalid Wwise Tremolo parameters`);
    }
    return {
        effectId: String(effectId),
        slotIndex: Number(slotIndex),
        type: "tremolo",
        modulationDepthPercent,
        modulationFrequencyHz,
        outputGainDb,
        processCenter: processCenterRaw === 1,
        processLfe: processLfeRaw === 1,
    };
}

/** Qualifies one empirical static source-local EVE-v150 Tremolo record. */
export function parseGraphStaticWwiseTremolo(effect, effectId, slotIndex)
{
    const label = `Audio Bus graph effect ${effectId}`;

    return parseStaticWwiseTremoloBytes(
        RequireStaticGraphEffect(
            effect,
            WWISE_TREMOLO_PLUGIN_ID,
            38,
            label,
            "Wwise Tremolo",
        ),
        { effectId, slotIndex, label },
    );
}

/** Decodes one source-proven static v150 Wwise Matrix Reverb block. */
export function parseStaticWwiseMatrixReverbBytes(
    bytes,
    {
        effectId,
        slotIndex,
        label = `Wwise Matrix Reverb ${effectId}`,
        bankVersion = WWISE_MATRIX_REVERB_BANK_VERSION,
    } = {},
)
{
    if (Number(bankVersion) !== WWISE_MATRIX_REVERB_BANK_VERSION
        || !(bytes instanceof Uint8Array)
        || bytes.byteLength !== 29)
    {
        throw new TypeError(`${label} has an unsupported parameter block`);
    }
    const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
    );
    const reverbTimeSeconds = view.getFloat32(0, true);
    const hfRatio = view.getFloat32(4, true);
    const numberOfDelays = view.getUint32(8, true);
    const dryLevelDb = view.getFloat32(12, true);
    const wetLevelDb = view.getFloat32(16, true);
    const preDelaySeconds = view.getFloat32(20, true);
    const processLfeRaw = view.getUint8(24);
    const delayLengthsModeRaw = view.getUint32(25, true);

    if (!Number.isFinite(reverbTimeSeconds)
        || reverbTimeSeconds < MATRIX_REVERB_TIME_MIN
        || reverbTimeSeconds > MATRIX_REVERB_TIME_MAX
        || !Number.isFinite(hfRatio)
        || hfRatio < MATRIX_REVERB_HF_RATIO_MIN
        || hfRatio > MATRIX_REVERB_HF_RATIO_MAX
        || !WWISE_MATRIX_REVERB_DELAY_COUNTS.has(numberOfDelays)
        || !Number.isFinite(dryLevelDb)
        || dryLevelDb < MATRIX_REVERB_LEVEL_MIN
        || dryLevelDb > MATRIX_REVERB_LEVEL_MAX
        || !Number.isFinite(wetLevelDb)
        || wetLevelDb < MATRIX_REVERB_LEVEL_MIN
        || wetLevelDb > MATRIX_REVERB_LEVEL_MAX
        || !Number.isFinite(preDelaySeconds)
        || preDelaySeconds < MATRIX_REVERB_PRE_DELAY_MIN
        || preDelaySeconds > MATRIX_REVERB_PRE_DELAY_MAX
        || processLfeRaw !== 1
        || delayLengthsModeRaw !== 0)
    {
        throw new TypeError(
            `${label} has unsupported Wwise Matrix Reverb parameters`,
        );
    }
    return {
        effectId: String(effectId),
        slotIndex: Number(slotIndex),
        type: "matrix-reverb",
        reverbTimeSeconds,
        hfRatio,
        numberOfDelays,
        dryLevelDb,
        wetLevelDb,
        preDelaySeconds,
        processLfe: true,
        delayLengthsMode: "default",
    };
}

/** Qualifies the static source-local v150 Wwise Matrix Reverb subset. */
export function parseGraphStaticWwiseMatrixReverb(
    effect,
    effectId,
    slotIndex,
)
{
    const label = `Audio Bus graph effect ${effectId}`;

    return parseStaticWwiseMatrixReverbBytes(
        RequireStaticGraphEffect(
            effect,
            WWISE_MATRIX_REVERB_PLUGIN_ID,
            29,
            label,
            "Wwise Matrix Reverb",
        ),
        { effectId, slotIndex, label, bankVersion: effect.bankVersion },
    );
}

/**
 * Decodes the source-proven static v150 Guitar Distortion layout used by EVE.
 *
 * Pinned wwiser proves the six EQ-band records and trailing distortion fields.
 * It does not reveal the proprietary Heavy transfer curve, so the portable
 * record remains inert unless the host explicitly selects an approximation.
 */
export function parseStaticWwiseGuitarDistortionBytes(
    bytes,
    {
        effectId,
        slotIndex,
        label = `Wwise Guitar Distortion ${effectId}`,
        bankVersion = WWISE_GUITAR_DISTORTION_BANK_VERSION,
    } = {},
)
{
    if (Number(bankVersion) !== WWISE_GUITAR_DISTORTION_BANK_VERSION
        || !(bytes instanceof Uint8Array)
        || bytes.byteLength !== 126)
    {
        throw new TypeError(`${label} has an unsupported parameter block`);
    }
    const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
    );
    let offset = 0;
    const readBand = index =>
    {
        const filterType = view.getUint32(offset, true);
        const gainDb = view.getFloat32(offset + 4, true);
        const frequencyHz = view.getFloat32(offset + 8, true);
        const q = view.getFloat32(offset + 12, true);
        const enabledRaw = view.getUint8(offset + 16);

        offset += 17;
        if (filterType > 6
            || !Number.isFinite(gainDb)
            || !Number.isFinite(frequencyHz)
            || frequencyHz <= 0
            || !Number.isFinite(q)
            || q <= 0
            || enabledRaw > 1)
        {
            throw new TypeError(
                `${label} has invalid Wwise Guitar Distortion EQ parameters`,
            );
        }
        return {
            index,
            filterType,
            gainDb,
            frequencyHz,
            q,
            enabled: enabledRaw === 1,
        };
    };
    const preEq = Array.from({ length: 3 }, (_, index) => readBand(index));
    const postEq = Array.from({ length: 3 }, (_, index) => readBand(index));
    const distortionType = view.getUint32(offset, true);
    const drivePercent = view.getFloat32(offset + 4, true);
    const tonePercent = view.getFloat32(offset + 8, true);
    const rectificationPercent = view.getFloat32(offset + 12, true);
    const outputGainDb = view.getFloat32(offset + 16, true);
    const wetDryMixPercent = view.getFloat32(offset + 20, true);
    const activePreEq = preEq.filter(band => band.enabled);
    const activePostEq = postEq.filter(band => band.enabled);

    if ((distortionType !== 1 && distortionType !== 2)
        || !Number.isFinite(drivePercent)
        || drivePercent < 0
        || drivePercent > 100
        || !Number.isFinite(tonePercent)
        || tonePercent < 0
        || tonePercent > 100
        || !Number.isFinite(rectificationPercent)
        || rectificationPercent < 0
        || rectificationPercent > 100
        || !Number.isFinite(outputGainDb)
        || outputGainDb < DYNAMICS_OUTPUT_GAIN_MIN
        || outputGainDb > DYNAMICS_OUTPUT_GAIN_MAX
        || wetDryMixPercent !== 100)
    {
        throw new TypeError(
            `${label} has unsupported Wwise Guitar Distortion parameters`,
        );
    }
    const portableBand = band => ({
        index: band.index,
        filterType: GUITAR_DISTORTION_FILTER_TYPES[band.filterType],
        gainDb: band.gainDb,
        frequencyHz: band.frequencyHz,
        q: band.q,
    });
    return {
        effectId: String(effectId),
        slotIndex: Number(slotIndex),
        type: "guitar-distortion",
        preEqBands: activePreEq.map(portableBand),
        postEqBands: activePostEq.map(portableBand),
        distortionType: GUITAR_DISTORTION_TYPES[distortionType],
        drivePercent,
        tonePercent,
        rectificationPercent,
        outputGainDb,
        wetDryMixPercent,
    };
}

/** Qualifies the bounded static source-local v150 Guitar Distortion record. */
export function parseGraphStaticWwiseGuitarDistortion(
    effect,
    effectId,
    slotIndex,
)
{
    const label = `Audio Bus graph effect ${effectId}`;

    return parseStaticWwiseGuitarDistortionBytes(
        RequireStaticGraphEffect(
            effect,
            WWISE_GUITAR_DISTORTION_PLUGIN_ID,
            126,
            label,
            "Wwise Guitar Distortion",
        ),
        { effectId, slotIndex, label, bankVersion: effect.bankVersion },
    );
}

/**
 * Decodes one source-proven static v150 Wwise Peak Limiter parameter block.
 *
 * Strict policy keeps the decoded record outside browser playback. The
 * explicit approximation policy may adapt it, but Web Audio's native
 * DynamicsCompressorNode cannot reproduce Wwise's variable lookahead, peak
 * detector, channel linking, or release behavior.
 */
export function parseGraphStaticWwisePeakLimiter(effect, effectId, slotIndex)
{
    const label = `Audio Bus graph effect ${effectId}`;
    const bytes = RequireStaticGraphEffect(
        effect,
        WWISE_PEAK_LIMITER_PLUGIN_ID,
        22,
        label,
        "Wwise Peak Limiter",
    );
    const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
    );
    const thresholdDb = view.getFloat32(0, true);
    const ratio = view.getFloat32(4, true);
    const lookaheadSeconds = view.getFloat32(8, true);
    const releaseSeconds = view.getFloat32(12, true);
    const outputGainDb = view.getFloat32(16, true);
    const processLfeRaw = view.getUint8(20);
    const channelLinkRaw = view.getUint8(21);

    if (!Number.isFinite(thresholdDb)
        || thresholdDb < DYNAMICS_THRESHOLD_MIN
        || thresholdDb > DYNAMICS_THRESHOLD_MAX
        || !Number.isFinite(ratio)
        || ratio < DYNAMICS_RATIO_MIN
        || ratio > DYNAMICS_RATIO_MAX
        || !Number.isFinite(lookaheadSeconds)
        || lookaheadSeconds < PEAK_LIMITER_LOOKAHEAD_MIN
        || lookaheadSeconds > PEAK_LIMITER_LOOKAHEAD_MAX
        || !Number.isFinite(releaseSeconds)
        || releaseSeconds < PEAK_LIMITER_RELEASE_MIN
        || releaseSeconds > PEAK_LIMITER_RELEASE_MAX
        || !Number.isFinite(outputGainDb)
        || outputGainDb < DYNAMICS_OUTPUT_GAIN_MIN
        || outputGainDb > DYNAMICS_OUTPUT_GAIN_MAX
        || processLfeRaw > 1
        || channelLinkRaw > 1)
    {
        throw new TypeError(
            `${label} has invalid Wwise Peak Limiter parameters`,
        );
    }
    return {
        effectId: String(effectId),
        slotIndex: Number(slotIndex),
        type: "peak-limiter",
        thresholdDb,
        ratio,
        lookaheadSeconds,
        releaseSeconds,
        outputGainDb,
        processLfe: processLfeRaw === 1,
        channelLink: channelLinkRaw === 1,
    };
}

/**
 * Decodes the empirically corroborated static v150 Wwise Compressor layout.
 *
 * Unlike the Peak Limiter layout, this field order is not yet source-proven by
 * the pinned wwiser tree. It is retained only to drive the explicit Web Audio
 * approximation and remains outside strict shared-bus admission.
 */
export function parseGraphStaticWwiseCompressor(effect, effectId, slotIndex)
{
    const label = `Audio Bus graph effect ${effectId}`;
    const bytes = RequireStaticGraphEffect(
        effect,
        WWISE_COMPRESSOR_PLUGIN_ID,
        22,
        label,
        "Wwise Compressor",
    );
    const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
    );
    const thresholdDb = view.getFloat32(0, true);
    const ratio = view.getFloat32(4, true);
    const attackSeconds = view.getFloat32(8, true);
    const releaseSeconds = view.getFloat32(12, true);
    const outputGainDb = view.getFloat32(16, true);
    const processLfeRaw = view.getUint8(20);
    const channelLinkRaw = view.getUint8(21);

    if (!Number.isFinite(thresholdDb)
        || thresholdDb < DYNAMICS_THRESHOLD_MIN
        || thresholdDb > DYNAMICS_THRESHOLD_MAX
        || !Number.isFinite(ratio)
        || ratio < DYNAMICS_RATIO_MIN
        || ratio > DYNAMICS_RATIO_MAX
        || !Number.isFinite(attackSeconds)
        || attackSeconds < COMPRESSOR_TIME_MIN
        || attackSeconds > COMPRESSOR_TIME_MAX
        || !Number.isFinite(releaseSeconds)
        || releaseSeconds < COMPRESSOR_TIME_MIN
        || releaseSeconds > COMPRESSOR_TIME_MAX
        || !Number.isFinite(outputGainDb)
        || outputGainDb < DYNAMICS_OUTPUT_GAIN_MIN
        || outputGainDb > DYNAMICS_OUTPUT_GAIN_MAX
        || processLfeRaw > 1
        || channelLinkRaw > 1)
    {
        throw new TypeError(
            `${label} has invalid Wwise Compressor parameters`,
        );
    }
    return {
        effectId: String(effectId),
        slotIndex: Number(slotIndex),
        type: "compressor",
        thresholdDb,
        ratio,
        attackSeconds,
        releaseSeconds,
        outputGainDb,
        processLfe: processLfeRaw === 1,
        channelLink: channelLinkRaw === 1,
    };
}

/** Decodes one static v150 Wwise Meter parameter block. */
export function parseStaticWwiseMeterBytes(
    bytes,
    {
        effectId,
        slotIndex,
        label = `Wwise Meter effect ${effectId}`,
        bankVersion = WWISE_METER_BANK_VERSION,
    } = {},
)
{
    if (Number(bankVersion) !== WWISE_METER_BANK_VERSION)
    {
        throw new TypeError(
            `${label} requires Wwise bank version ${WWISE_METER_BANK_VERSION}`,
        );
    }
    if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 28)
    {
        throw new TypeError(`${label} has invalid Wwise Meter parameters`);
    }
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
    if (applyDownstreamVolumeRaw !== 0)
    {
        throw new TypeError(`${label} has observable Wwise Meter feedback`);
    }
    return {
        effectId: String(effectId),
        slotIndex: Number(slotIndex),
        type: "meter",
        attack,
        release,
        minimum,
        maximum,
        hold,
        infiniteHold: infiniteHoldRaw === 1,
        mode: modeRaw === 0 ? "peak" : "rms",
        scope: scopeRaw === 0 ? "global" : "game-object",
        applyDownstreamVolume: false,
        gameParameterId,
    };
}

/**
 * Decodes a v150 Wwise Meter whose signal path is transparent. Telemetry may
 * be omitted only through explicit policy when it could feed the authored graph.
 */
export function parseGraphFeedbackFreeMeter(
    effect,
    effectId,
    slotIndex,
    { wwiseMeterFeedback = "strict" } = {},
)
{
    const label = `Audio Bus graph effect ${effectId}`;
    const bytes = RequireStaticGraphEffect(
        effect,
        WWISE_METER_PLUGIN_ID,
        28,
        label,
        "Wwise Meter",
    );
    const meter = parseStaticWwiseMeterBytes(bytes, {
        effectId,
        slotIndex,
        label,
    });
    const feedbackMode = normalizeWwiseMeterFeedbackMode(
        wwiseMeterFeedback,
    );

    if (meter.gameParameterId !== 0 && feedbackMode !== "omit-telemetry")
    {
        throw new TypeError(`${label} has observable Wwise Meter feedback`);
    }
    return {
        ...meter,
        type: "meter-omission",
        telemetryOmitted: meter.gameParameterId !== 0,
    };
}

/** Decodes one effect admitted by the selected shared Bus realization policy. */
export function parseGraphSharedBusEffect(
    effect,
    effectId,
    slotIndex,
    {
        wwiseDynamics = "strict",
        wwiseMeterFeedback = "strict",
    } = {},
)
{
    const dynamicsMode = normalizeWwiseDynamicsMode(wwiseDynamics);
    const meterFeedbackMode = normalizeWwiseMeterFeedbackMode(
        wwiseMeterFeedback,
    );

    switch (effect?.pluginId)
    {
        case PARAMETRIC_EQ_PLUGIN_ID:
            return parseGraphStaticParametricEq(effect, effectId, slotIndex);
        case WWISE_DELAY_PLUGIN_ID:
            return parseGraphStaticWwiseDelay(effect, effectId, slotIndex);
        case WWISE_METER_PLUGIN_ID:
            return parseGraphFeedbackFreeMeter(effect, effectId, slotIndex, {
                wwiseMeterFeedback: meterFeedbackMode,
            });
        case WWISE_COMPRESSOR_PLUGIN_ID:
            if (dynamicsMode === "approximate-web-audio")
            {
                return RequireApproximateDynamics(
                    parseGraphStaticWwiseCompressor(
                        effect,
                        effectId,
                        slotIndex,
                    ),
                    "compressor-approximation",
                );
            }
            break;
        case WWISE_PEAK_LIMITER_PLUGIN_ID:
            if (dynamicsMode === "approximate-web-audio")
            {
                return RequireApproximateDynamics(
                    parseGraphStaticWwisePeakLimiter(
                        effect,
                        effectId,
                        slotIndex,
                    ),
                    "peak-limiter-approximation",
                );
            }
            break;
        default:
            break;
    }
    throw new TypeError(`Audio Bus graph effect ${effectId} is unsupported`);
}

function RequireApproximateDynamics(effect, type)
{
    if (effect.processLfe !== true || effect.channelLink !== true)
    {
        throw new TypeError(
            `Audio Bus graph effect ${effect.effectId} requires unsupported independent dynamics channels`,
        );
    }
    if ((type === "compressor-approximation"
            && (effect.attackSeconds === 0
                || effect.attackSeconds > WEB_AUDIO_DYNAMICS_TIME_MAX))
        || effect.releaseSeconds > WEB_AUDIO_DYNAMICS_TIME_MAX)
    {
        throw new TypeError(
            `Audio Bus graph effect ${effect.effectId} exceeds Web Audio dynamics timing limits`,
        );
    }
    return { ...effect, type };
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

function NormalizeGuitarDistortionBands(value, label)
{
    if (!Array.isArray(value) || value.length > 3)
    {
        throw new TypeError(`${label} must contain at most 3 entries`);
    }
    const indices = new Set();
    const bands = value.map((rawBand, offset) =>
    {
        const bandLabel = `${label} band ${offset}`;
        const band = RequireRecord(rawBand, bandLabel);
        const index = BoundedInteger(band.index, 0, 2, `${bandLabel} index`);

        if (indices.has(index))
        {
            throw new TypeError(`${bandLabel} duplicates index ${index}`);
        }
        indices.add(index);
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

    return Object.freeze(bands);
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

function BoundedFinite(value, min, max, label)
{
    const number = Number(value);

    if (!Number.isFinite(number) || number < min || number > max)
    {
        throw new TypeError(`${label} must be from ${min} to ${max}`);
    }
    return number;
}
