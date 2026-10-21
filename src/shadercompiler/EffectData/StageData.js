import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/EffectData.h:629-687

import { CjsFxStdMap } from "../CjsFxStdMap.js";
import { ParameterAnnotation } from "./ParameterAnnotation.js";

/**
 * What a stage binds: Carbon's `StageData`. Textures, samplers and UAVs are
 * keyed by register and saved in register order. `defaultValues` is the
 * packed default bytes of the constants; Carbon's `defaultValuesStr` is the
 * string-table handle the writer creates for them, so it has no field here.
 */
export class StageData
{
    /** @type {import("./RegisterInputDescription.js").RegisterInputDescription[]} */
    registerInputs = [];

    /** @type {import("./StaticSampler.js").StaticSampler[]} */
    staticSamplers = [];

    /** @type {import("./Constant.js").Constant[]} */
    constants = [];

    /** @type {Uint8Array} Carbon's `std::vector<BYTE>`. */
    defaultValues = new Uint8Array(0);

    /** @type {CjsFxStdMap} register to `Texture` */
    textures = new CjsFxStdMap();

    /** @type {CjsFxStdMap} register to `Sampler` */
    samplers = new CjsFxStdMap();

    /** @type {CjsFxStdMap} register to `Uav` */
    uavs = new CjsFxStdMap();

    annotations = new ParameterAnnotation();
}

CjsSchema.meta.carbon("StageData")(StageData);
