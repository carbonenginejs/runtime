// Source: resources/include/ResourceGroup.h
import { CallbackSettings } from "./CallbackSettings.js";
import { CjsSchema } from "#schema";

/** CarbonResources::ResourceGroupRemoveResourcesParams native parameter aggregate. */
export class ResourceGroupRemoveResourcesParams
{
    resourcesToRemove = null;
    errorIfResourceNotFound = true;
    callbackSettings = new CallbackSettings();
}

CjsSchema.blue.define(ResourceGroupRemoveResourcesParams, { className: "ResourceGroupRemoveResourcesParams", fields: {} });
