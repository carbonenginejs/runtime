import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/EffectData.h:719-742

import { CjsFxStdMap } from "../CjsFxStdMap.js";

/**
 * One pass of a technique: Carbon's `Pass`. `states` is Carbon's
 * `RenderStates`, render-state code to value, saved in code order.
 */
export class Pass
{
    /** @type {import("./StageInput.js").StageInput[]} */
    stages = [];

    /** @type {CjsFxStdMap} state code to value */
    states = new CjsFxStdMap();

    /**
     * Not in Carbon: the pass's WebGPU binding block (runtime
     * `writeBackendBlock`), written after the pass in a browser
     * container; null for Carbon's own targets.
     *
     * @type {Uint8Array|null}
     */
    backendBlock = null;
}

CjsSchema.blue.define(Pass, {
    className: "Pass"
});
