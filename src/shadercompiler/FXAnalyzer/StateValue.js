import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/FXAnalyzer.h:24-28

/**
 * A named constant a state assignment may use, such as `CLAMP`: Carbon's
 * `StateValue`.
 */
export class StateValue
{
    /** @type {string} Carbon leaves it unset. */
    name = "";

    /** @type {number} Carbon's `unsigned`. Carbon leaves it unset. */
    value = 0;
}

CjsSchema.blue.define(StateValue, {
    className: "StateValue"
});
