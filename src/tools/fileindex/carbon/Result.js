// Source: resources/include/Enums.h
import { ResultType } from "./enums.js";
import { CjsSchema, type } from "#schema";

/** CarbonResources::Result: the native status code and optional diagnostic. */
export class Result
{
    type = ResultType.SUCCESS;
    info = "";

    /**
     * Aggregate initialization expressed as constructor arguments.
     *
     * @param {number} [type] ResultType enum value.
     * @param {string} [info] Status or error message.
     */
    constructor(type = ResultType.SUCCESS, info = "")
    {
        this.type = type;
        this.info = info;
    }
}

CjsSchema.blue.define(Result, { className: "Result", fields: {
        type: [type.int32, type.enum(ResultType)],
        info: [type.string]
    } });
