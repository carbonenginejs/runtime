import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";
import { CjsCharacterVisemeFrame } from "./CjsCharacterVisemeFrame.js";
import { CjsCharacterVisemeSet } from "./CjsCharacterVisemeSet.js";

@type.define({ className: "CjsCharacterVisemeTimeline", family: "character" })
/** Backend-neutral timed viseme weights for speech or captured facial input. */
export class CjsCharacterVisemeTimeline extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.float32
    @io.persist
    duration = 0;

    @type.boolean
    @io.persist
    loop = false;

    @type.list("CjsCharacterVisemeFrame")
    @io.persist
    frames = [];

    /** Hydrates and validates a detached timeline. */
    static prepare(value, visemeSet = null)
    {
        const result = CjsCharacterVisemeTimeline.from(
            value instanceof CjsCharacterVisemeTimeline ? value.GetValues() : value || {}
        );

        return CjsCharacterVisemeTimeline.validate(result, visemeSet);
    }

    /** Validates one hydrated timeline without clamping or renaming controls. */
    static validate(result, visemeSet = null)
    {
        if (!(result instanceof CjsCharacterVisemeTimeline))
        {
            throw new TypeError("Character viseme timeline validation requires a CjsCharacterVisemeTimeline");
        }

        const duration = Number(result.duration);
        if (!Number.isFinite(duration) || duration < 0)
        {
            throw new TypeError("Character viseme timeline duration must be finite and non-negative");
        }
        if (result.loop && duration <= 0)
        {
            throw new RangeError("A looping character viseme timeline requires a positive duration");
        }

        let previousTime = -Infinity;
        for (let i = 0; i < result.frames.length; i++)
        {
            const frame = result.frames[i];
            if (!(frame instanceof CjsCharacterVisemeFrame))
            {
                throw new TypeError(`Character viseme timeline frame ${i} was not hydrated`);
            }

            const time = Number(frame.time);
            if (!Number.isFinite(time) || time < 0 || time > duration)
            {
                throw new RangeError(`Character viseme timeline frame ${i} is outside its duration`);
            }
            if (time <= previousTime)
            {
                throw new RangeError("Character viseme timeline frame times must be strictly increasing");
            }

            const weights = CjsCharacterVisemeTimeline.#prepareWeights(frame.weights);
            if (visemeSet)
            {
                CjsCharacterVisemeSet.validateWeights(visemeSet, weights);
            }

            frame.time = time;
            frame.weights = weights;
            previousTime = time;
        }

        result.duration = duration;
        return result;
    }

    /** Samples detached linearly interpolated weights at one timeline time. */
    static sample(value, time, { loop = null } = {})
    {
        const timeline = value instanceof CjsCharacterVisemeTimeline
            ? CjsCharacterVisemeTimeline.validate(value)
            : CjsCharacterVisemeTimeline.prepare(value);
        const frames = timeline.frames;
        const requestedTime = Number(time);

        if (!Number.isFinite(requestedTime))
        {
            throw new TypeError("Character viseme sample time must be finite");
        }
        if (frames.length === 0) return new Map();

        const shouldLoop = loop === null ? timeline.loop : !!loop;
        let localTime = requestedTime;
        if (shouldLoop)
        {
            if (timeline.duration <= 0)
            {
                throw new RangeError("A looping character viseme sample requires a positive duration");
            }
            localTime = ((localTime % timeline.duration) + timeline.duration) % timeline.duration;
        }
        else
        {
            localTime = Math.max(0, Math.min(timeline.duration, localTime));
        }

        if (localTime <= frames[0].time) return new Map(frames[0].weights);
        const last = frames[frames.length - 1];
        if (localTime >= last.time) return new Map(last.weights);

        let rightIndex = 1;
        while (rightIndex < frames.length && frames[rightIndex].time < localTime) rightIndex++;

        const left = frames[rightIndex - 1];
        const right = frames[rightIndex];
        const span = right.time - left.time;
        const amount = span > 0 ? (localTime - left.time) / span : 0;
        return CjsCharacterVisemeTimeline.#interpolateWeights(left.weights, right.weights, amount);
    }

    /** Samples a timeline and creates a normal character-control layer. */
    static createControlLayer(value, visemeSet, time, options = {})
    {
        const timeline = value instanceof CjsCharacterVisemeTimeline
            ? CjsCharacterVisemeTimeline.validate(value, visemeSet)
            : CjsCharacterVisemeTimeline.prepare(value, visemeSet);

        return CjsCharacterVisemeSet.createControlLayer(
            visemeSet,
            CjsCharacterVisemeTimeline.sample(timeline, time),
            options
        );
    }

    /**
     * Converts frame weights to a validated map while preserving exact viseme
     * IDs.
     */
    static #prepareWeights(value)
    {
        const entries = value instanceof Map
            ? value.entries()
            : value && typeof value === "object" && !Array.isArray(value)
                ? Object.entries(value)
                : null;

        if (!entries)
        {
            throw new TypeError("Character viseme frame weights must be a map or object");
        }

        const result = new Map();
        for (const [ rawName, rawWeight ] of entries)
        {
            const name = CjsCharacterVisemeSet.normalizeID(rawName);
            const weight = Number(rawWeight);
            if (!Number.isFinite(weight))
            {
                throw new TypeError(`Character viseme frame weight "${name}" must be finite`);
            }
            if (result.has(name))
            {
                throw new Error(`Character viseme frame contains duplicate id "${name}"`);
            }
            result.set(name, weight);
        }
        return result;
    }

    /** Linearly blends the union of two weight maps and omits zero results. */
    static #interpolateWeights(left, right, amount)
    {
        const result = new Map();
        const names = new Set([ ...left.keys(), ...right.keys() ]);

        for (const name of names)
        {
            const a = left.get(name) ?? 0;
            const b = right.get(name) ?? 0;
            const weight = a + (b - a) * amount;
            if (weight !== 0) result.set(name, weight);
        }

        return result;
    }
}
