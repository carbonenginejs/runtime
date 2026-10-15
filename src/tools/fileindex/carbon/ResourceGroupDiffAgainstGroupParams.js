// Source: resources/include/ResourceGroup.h
import { CallbackSettings } from "./CallbackSettings.js";
import { CjsSchema } from "#schema";

/** CarbonResources::ResourceGroupDiffAgainstGroupParams native parameter aggregate. */
export class ResourceGroupDiffAgainstGroupParams
{
    resourceGroupToDiffAgainst = null;
    additions = null;
    subtractions = null;
    callbackSettings = new CallbackSettings();
}

CjsSchema.blue.define(ResourceGroupDiffAgainstGroupParams, { className: "ResourceGroupDiffAgainstGroupParams", fields: {} });
