// Source: resources/src/StatusSettings.h:23-29
import { CjsSchema } from "#schema";
import { StatusProgressType } from "./enums.js";

/** `CarbonResources::StatusUpdate` - the last update a status scope reported. */
export class StatusUpdate
{
    statusProgressType = StatusProgressType.UNBOUNDED;

    progress = 0;

    percentageSizeOfJob = 0;

    info = "";
}

CjsSchema.define(StatusUpdate, { className: "StatusUpdate", carbon: "StatusUpdate", family: "tools", fields: {} });
