import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/EffectData.h:10
// Source: trinity/shadercompiler/EffectData.h:811-854

import { CjsFxStdMap } from "../CjsFxStdMap.js";

/**
 * Carbon's `DATA_VERSION`: the effect container version the compiler writes.
 */
export const DATA_VERSION = 15;

/**
 * One permutation's compiled effect: Carbon's `EffectData`.
 *
 * `annotations` maps a parameter name to its `ParameterAnnotation`; Carbon
 * saves them sorted by name. Carbon's `pdbs` (debug databases from the D3D
 * compilers) have no counterpart, as no D3D compiler runs here.
 *
 * Serialisation is the runtime's: `@carbonenginejs/runtime`'s Carbon effect
 * writer ports `EffectData::Save` and the container assembly of
 * `ShaderCompiler.cpp`, so the compiler hands it these records instead of
 * porting the writer a second time.
 */
export class EffectData
{
    /** @type {import("./Technique.js").Technique[]} */
    techniques = [];

    /** @type {CjsFxStdMap} parameter name to `ParameterAnnotation` */
    annotations = new CjsFxStdMap();
}

CjsSchema.blue.define(EffectData, {
    className: "EffectData"
});
