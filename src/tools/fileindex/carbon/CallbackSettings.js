// Source: resources/include/ResourceGroup.h
import { CjsSchema, type } from "#schema";

/** `CarbonResources::CallbackSettings` - the status callback and how deeply nested scopes report. */
export class CallbackSettings
{
    /** @type {((type: number, progress: number, overall: number, size: number, level: number, info: string) => void)|null} */
    statusCallback = null;

    /** Deepest nesting level that reports; -1 reports every level. */
    verbosityLevel = -1;
}

CjsSchema.decorateField(CallbackSettings, "verbosityLevel", type.int32);
CjsSchema.meta.carbon("CallbackSettings")(CallbackSettings);
