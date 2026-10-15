import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/FXAnalyzer.h:24-28

/**
 * A named constant a state assignment may use, such as `CLAMP`: Carbon's
 * `StateValue`.
 */
export class StateValue
{
    /** @type {string} */
    name = "";

    /** @type {number} Carbon's `unsigned`. */
    value = 0;
}

CjsSchema.blue.define(StateValue, {
    className: "StateValue"
});
