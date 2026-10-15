// Source: resources/include/ResourceGroup.h
import { CallbackSettings } from "./CallbackSettings.js";
import { CjsSchema } from "#schema";

/** CarbonResources::ResourceGroupMergeParams native parameter aggregate. */
export class ResourceGroupMergeParams
{
    resourceGroupToMerge = null;
    mergedResourceGroup = null;
    callbackSettings = new CallbackSettings();
}

CjsSchema.blue.define(ResourceGroupMergeParams, { className: "ResourceGroupMergeParams", fields: {} });
