import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/EffectData.h:599-626

import { CjsFxStdMap } from "../CjsFxStdMap.js";

/**
 * A parameter's annotations: Carbon's `ParameterAnnotation`, a map from
 * annotation name to `Annotation`. Carbon saves them sorted by name with
 * `strcmp`, which is this map's iteration order for ASCII names.
 */
export class ParameterAnnotation
{
    /** @type {CjsFxStdMap} name to `Annotation` */
    annotations = new CjsFxStdMap();
}

CjsSchema.blue.define(ParameterAnnotation, {
    className: "ParameterAnnotation"
});
