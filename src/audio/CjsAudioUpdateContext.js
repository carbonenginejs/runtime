// CarbonEngineJS original (no Carbon counterpart). Normalizes the optional
// host-owned frame context while keeping browser audio scheduling on the
// AudioContext clock.

/**
 * Creates per-frame host timing for the audio composition.
 * @param {{now?: Function}} [options]
 * @returns {Object}
 */
export function createAudioUpdateContext({
    now = DefaultNowSeconds,
} = {})
{
    if (typeof now !== "function")
    {
        throw new TypeError("audio update-context now must be a function");
    }

    let initialized = false;
    return {
        time: 0,
        realTime: 0,
        deltaTime: 0,
        frame: 0,

        /** Simulation time in seconds. */
        GetTime()
        {
            return this.time;
        },

        /** Monotonic real time in seconds. */
        GetRealTime()
        {
            return this.realTime;
        },

        /** Seconds elapsed since the previous frame. */
        GetDeltaT()
        {
            return this.deltaTime;
        },

        /** Monotonic frame number. */
        GetFrame()
        {
            return this.frame;
        },

        /** Alias used by contexts that call simulation time currentTime. */
        get currentTime()
        {
            return this.time;
        },

        /** Alias used by engines that call the frame number frameCount. */
        get frameCount()
        {
            return this.frame;
        },

        /**
         * Copies a caller-owned context, or advances the standalone clock when
         * no context is supplied. Playback scheduling intentionally ignores it.
         */
        Update(source = null)
        {
            if (source !== null && source !== undefined)
            {
                const previousTime = this.time;
                const previousRealTime = this.realTime;
                const time = ReadContextNumber(
                    source,
                    "GetTime",
                    [ "time", "currentTime" ],
                );
                const realTime = ReadContextNumber(
                    source,
                    "GetRealTime",
                    [ "realTime" ],
                );
                const deltaTime = ReadContextNumber(
                    source,
                    "GetDeltaT",
                    [ "deltaTime", "deltaT" ],
                );
                const frame = ReadContextNumber(
                    source,
                    "GetFrame",
                    [ "frame", "frameCount", "frames" ],
                );

                this.time = time ?? previousTime;
                this.realTime = realTime ?? time ?? previousRealTime;
                this.deltaTime = deltaTime
                    ?? (initialized ? this.time - previousTime : 0);
                this.frame = frame ?? this.frame + 1;
                initialized = true;
                return this;
            }

            const current = Number(now());
            if (!Number.isFinite(current))
            {
                throw new TypeError(
                    "audio update-context now must return finite seconds",
                );
            }
            this.deltaTime = initialized
                ? Math.max(0, current - this.realTime)
                : 0;
            this.time = current;
            this.realTime = current;
            this.frame++;
            initialized = true;
            return this;
        },
    };
}

function ReadContextNumber(source, method, properties)
{
    let value;
    if (typeof source?.[method] === "function")
    {
        value = source[method]();
    }
    else
    {
        for (const property of properties)
        {
            if (source?.[property] !== undefined)
            {
                value = source[property];
                break;
            }
        }
    }
    if (value === undefined || value === null)
    {
        return null;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function DefaultNowSeconds()
{
    return (globalThis.performance?.now() ?? Date.now()) / 1000;
}
