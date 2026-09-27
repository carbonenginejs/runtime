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

CjsSchema.define(ResourceGroupRemoveResourcesParams, { className: "ResourceGroupRemoveResourcesParams", carbon: "ResourceGroupRemoveResourcesParams", family: "tools", fields: {} });
