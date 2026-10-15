// Source: resources/src/StatusSettings.h:23-29
import { CjsSchema, type } from "#schema";
import { StatusProgressType } from "./enums.js";

/** `CarbonResources::StatusUpdate` - the last update a status scope reported. */
export class StatusUpdate
{
    statusProgressType = StatusProgressType.UNBOUNDED;

    progress = 0;

    percentageSizeOfJob = 0;

    info = "";
}

CjsSchema.blue.define(StatusUpdate, { className: "StatusUpdate", fields: {
        statusProgressType: [type.int32, type.enum(StatusProgressType)],
        progress: [type.float32],
        percentageSizeOfJob: [type.float32],
        info: [type.string]
    } });
