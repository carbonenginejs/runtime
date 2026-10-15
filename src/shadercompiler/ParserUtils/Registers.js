import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/ParserUtils.cpp:618-625
//
// Carbon declares this struct in an anonymous namespace of ParserUtils.cpp;
// it is not exported from the folder's index.

/**
 * The registers taken per class while assigning registers: Carbon's
 * `Registers`. Carbon's `std::set<int>` is only inserted into and tested
 * here, never iterated, so a `Set`'s order does not show.
 */
export class Registers
{
    /** @type {Set<number>} */
    b = new Set();

    /** @type {Set<number>} */
    t = new Set();

    /** @type {Set<number>} */
    s = new Set();

    /** @type {Set<number>} */
    u = new Set();

    /** @type {Set<number>} */
    spaces = new Set();
}

CjsSchema.blue.define(Registers, {
    className: "Registers"
});
