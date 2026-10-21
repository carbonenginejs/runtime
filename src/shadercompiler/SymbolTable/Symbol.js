import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/SymbolTable.h
// Source: trinity/shadercompiler/SymbolTable.cpp:70-89
//
// The class keeps Carbon's name, `Symbol`, which shadows JavaScript's global
// `Symbol` inside any module that imports it. Such a module reaches the
// built-in as `globalThis.Symbol`.

import { InlineString } from "../InlineString.js";
import { CjsFxStdMap } from "../CjsFxStdMap.js";
import { Type } from "../Type.js";
import { PackOffset } from "./PackOffset.js";

/**
 * A declared name: Carbon's `Symbol`.
 *
 * `registerSpecifier` maps a shader profile (`""` for every profile) to its
 * `RegisterSpecifier`, iterated in key order. `annotations` is an array of
 * `SymbolAnnotation`, or null. `intrinsicType` is set for built-in functions:
 * `(call, argIndex) => Type`, with `argIndex` -1 asking for the result type.
 */
export class Symbol
{
    name = new InlineString();

    semantic = new InlineString();

    isTypeName = false;

    isFunction = false;

    interpolationModifier = 0;

    packOffset = new PackOffset();

    /** Carbon's `registerSpecifier` (SymbolTable.h:73), by value. @type {CjsFxStdMap} */
    registerSpecifier = new CjsFxStdMap();

    /** Carbon's `annotations( nullptr )` (SymbolTable.cpp:75). @type {import("./SymbolAnnotation.js").SymbolAnnotation[]|null} */
    annotations = null;

    /** Carbon's `type` (SymbolTable.h:77), by value; the constructor sets it from token type 0. */
    type = new Type();

    /** Carbon's `definition( nullptr )` (SymbolTable.cpp:76). @type {import("../ASTNode/ASTNode.js").ASTNode|null} */
    definition = null;

    /**
     * Carbon's `intrinsicType( nullptr )` (SymbolTable.cpp:77).
     * @type {((call: import("../ASTNode/ASTNode.js").ASTNode, argIndex: number) => Type)|null}
     */
    intrinsicType = null;

    /** Carbon's `addressSpace( AddressSpace::None )` (SymbolTable.cpp:78). Specific to Metal shaders. */
    addressSpace = Symbol.AddressSpace.None;

    /** Carbon's `resourceRefWrapped( false )` (SymbolTable.cpp:79). */
    resourceRefWrapped = false;

    /** Carbon's `used( false )` (SymbolTable.cpp:80). */
    used = false;

    /** Initializes an unused symbol with empty type and register declarations. */
    constructor()
    {
        this.packOffset.subComponent = -1;

        // SymbolTable.cpp:89
        this.type.FromTokenType(0);
    }

    // Source: trinity/shadercompiler/SymbolTable.h

    /**
     * Carbon's `enum class AddressSpace`, used by the Metal writer.
     */
    static AddressSpace = Object.freeze({
        None: 0,
        Device: 1,
        Constant: 2,
        Thread: 3,
        Threadgroup: 4,
        Threadgroup_imageblock: 5,

        Constexpr: 6,
        RayData: 7
    });
}

CjsSchema.meta.carbon("Symbol")(Symbol);
