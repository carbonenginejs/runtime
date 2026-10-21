import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/FXAnalyzer.h:15-20

/**
 * One component of a constant value: Carbon's `ExpressionValueElement`.
 *
 * Carbon declares the struct without initialisers and sets only the member
 * matching the value's type, so the other numeric member is indeterminate.
 * `undefined` stands for an indeterminate member here, and the evaluator
 * throws where Carbon would read one (Carbon known defect CE-75).
 * `stringValue` is a `std::string`, which starts empty.
 */
export class ExpressionValueElement
{
    /** @type {number|undefined} Carbon's `long`: 32 bits on Windows. */
    intValue = undefined;

    /** @type {number|undefined} Carbon's `double`. */
    floatValue = undefined;

    /** @type {string} */
    stringValue = "";

    /**
     * Returns a copy, as Carbon copies the struct.
     *
     * @returns {ExpressionValueElement} An independent element.
     */
    Copy()
    {
        const copy = new ExpressionValueElement();
        copy.intValue = this.intValue;
        copy.floatValue = this.floatValue;
        copy.stringValue = this.stringValue;
        return copy;
    }
}

CjsSchema.meta.carbon("ExpressionValueElement")(ExpressionValueElement);
