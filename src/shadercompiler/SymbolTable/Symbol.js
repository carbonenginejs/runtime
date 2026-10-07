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

    constructor()
    {
        this.packOffset.subComponent = -1;

        /** @type {CjsFxStdMap} */
        this.registerSpecifier = new CjsFxStdMap();

        /** @type {import("./SymbolAnnotation.js").SymbolAnnotation[]|null} */
        this.annotations = null;

        this.type = new Type();

        /** @type {import("../ASTNode/ASTNode.js").ASTNode|null} */
        this.definition = null;

        /** @type {((call: import("../ASTNode/ASTNode.js").ASTNode, argIndex: number) => Type)|null} */
        this.intrinsicType = null;

        // Specific to Metal shaders.
        this.addressSpace = Symbol.AddressSpace.None;

        this.resourceRefWrapped = false;

        this.used = false;
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
