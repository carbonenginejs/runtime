// Source: resources/include/Enums.h
import { ResultType } from "./enums.js";
import { CjsSchema } from "#schema";

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

CjsSchema.define(Result, { className: "Result", carbon: "Result", family: "tools", fields: {} });
