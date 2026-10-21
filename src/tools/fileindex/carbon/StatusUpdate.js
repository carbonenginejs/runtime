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

CjsSchema.decorateField(StatusUpdate, "statusProgressType", type.int32, type.enum(StatusProgressType));
CjsSchema.decorateField(StatusUpdate, "progress", type.float32);
CjsSchema.decorateField(StatusUpdate, "percentageSizeOfJob", type.float32);
CjsSchema.decorateField(StatusUpdate, "info", type.string);
CjsSchema.meta.carbon("StatusUpdate")(StatusUpdate);
