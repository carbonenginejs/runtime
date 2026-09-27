// Source: resources/src/StatusSettings.h:17-21
import { CjsSchema } from "#schema";

/** `CarbonResources::StatusReturn` - overall progress and the scale a nested scope contributes. */
export class StatusReturn
{
    progress = 0;

    scale = 1;

    /**
     * @param {number} [progress=0] Overall progress, float32.
     * @param {number} [scale=1] Scale for a nested scope, float32.
     */
    constructor(progress = 0, scale = 1)
    {
        this.progress = Math.fround(progress);
        this.scale = Math.fround(scale);
    }
}

CjsSchema.define(StatusReturn, { className: "StatusReturn", carbon: "StatusReturn", family: "tools", fields: {} });
