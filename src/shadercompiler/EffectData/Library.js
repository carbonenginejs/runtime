import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/EffectData.h:758-785

import { StageData } from "./StageData.js";

/**
 * A ray-tracing library of a technique: Carbon's `Library`. As with
 * `StageInput`, `shaderData` holds the program and the writer derives
 * Carbon's `shaderSize` and `shaderDataStr`.
 */
export class Library
{
    payloadSize = 0;

    /** @type {string|Uint8Array|null} */
    shaderData = null;

    /** @type {import("./ShaderExport.js").ShaderExport[]} */
    exports = [];

    hitGroupName = "";

    globalInputs = new StageData();

    localInputs = new StageData();

    source = "";
}

CjsSchema.blue.define(Library, {
    className: "Library"
});
