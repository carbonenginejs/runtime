import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/EffectData.h:689-717

import { StageData } from "./StageData.js";

/**
 * One shader stage of a pass: Carbon's `StageInput`.
 *
 * Carbon keeps the compiled program as a string-table handle
 * (`shaderDataStr`) and its byte count (`shaderSize`); here `shaderData` holds
 * the program itself, text or bytes, and the writer derives both. `source` is
 * the generated code, which Carbon keeps for testing and does not save.
 */
export class StageInput extends StageData
{
    /** An `InputStageType` value. */
    type = 0;

    /** @type {string|Uint8Array|null} */
    shaderData = null;

    threadGroupSize = [0, 0, 0];

    /** @type {import("./PipelineInputDescription.js").PipelineInputDescription[]} */
    pipelineInputs = [];

    source = "";

    // Source: trinity/shadercompiler/EffectData.h:14-22

    /**
     * Carbon's `InputStageType`. Carbon notes these values must match the
     * corresponding Trinity enum.
     */
    static InputStageType = Object.freeze({
        VERTEX_STAGE: 0,
        PIXEL_STAGE: 1,
        COMPUTE_STAGE: 2,
        GEOMETRY_STAGE: 3,
        HULL_STAGE: 4,
        DOMAIN_STAGE: 5
    });
}

CjsSchema.blue.define(StageInput, {
    className: "StageInput"
});
