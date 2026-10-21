// Source: resources/include/ResourceGroup.h
import { CallbackSettings } from "./CallbackSettings.js";
import { CjsSchema, type } from "#schema";

/** CarbonResources::ResourceGroupRemoveResourcesParams native parameter aggregate. */
export class ResourceGroupRemoveResourcesParams
{
    resourcesToRemove = null;
    errorIfResourceNotFound = true;
    callbackSettings = new CallbackSettings();
}

CjsSchema.decorateField(ResourceGroupRemoveResourcesParams, "errorIfResourceNotFound", type.boolean);
CjsSchema.meta.carbon("ResourceGroupRemoveResourcesParams")(ResourceGroupRemoveResourcesParams);
