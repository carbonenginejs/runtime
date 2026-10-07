// Source: trinity/shadercompiler/FXAnalyzer.h:39-45

/**
 * One assignable state: Carbon's `StateDescription`.
 *
 * Adapted: Carbon's `offset` is a byte offset into the blob the state writes
 * (`offsetof( Sampler, addressU )`). JavaScript objects have no byte layout,
 * so `field` names the property written instead. Carbon's render states write
 * offset 0 of a single `DWORD`; their `field` is `"value"`, and the blob
 * `{ value }` stands for that `DWORD` (see `GetStateValue`).
 */
export class StateDescription
{
    /** @type {string} */
    stateName = "";

    /** @type {number} A `StateValueType`. */
    type = 0;

    /** @type {import("./StateValue.js").StateValue[]|null} */
    stateValues = null;

    /** @type {string} Stands for Carbon's `offset`. */
    field = "";

    // Source: trinity/shadercompiler/FXAnalyzer.h:30-37

    /**
     * Carbon's `StateValueType`: how a state's value is written into its blob.
     */
    static StateValueType = Object.freeze({
        SVT_BYTE: 0,
        SVT_DWORD: 1,
        SVT_FLOAT: 2,
        SVT_BOOL: 3,
        SVT_COLOR: 4
    });
}
