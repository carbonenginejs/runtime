import assert from "node:assert/strict";
import test from "node:test";
import {
    isInt8,
    isInt16,
    isInt32,
    isUint8,
    isUint16,
    isUint32
} from "../src/is.js";

const integerPredicates = [
    [ isInt8, -0x80, 0x7f ],
    [ isUint8, 0, 0xff ],
    [ isInt16, -0x8000, 0x7fff ],
    [ isUint16, 0, 0xffff ],
    [ isInt32, -0x80000000, 0x7fffffff ],
    [ isUint32, 0, 0xffffffff ]
];

test("integer predicates accept only numbers within their exact ranges", () =>
{
    for (const [ predicate, minimum, maximum ] of integerPredicates)
    {
        assert.equal(predicate(minimum), true);
        assert.equal(predicate(maximum), true);
        assert.equal(predicate(minimum - 1), false);
        assert.equal(predicate(maximum + 1), false);
        assert.equal(predicate(0.5), false);
        assert.equal(predicate(NaN), false);
        assert.equal(predicate(Infinity), false);
        assert.equal(predicate(String(maximum)), false);
        assert.equal(predicate(new Number(maximum)), false);
    }
});
