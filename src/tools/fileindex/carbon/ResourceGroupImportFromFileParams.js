// Source: resources/include/ResourceGroup.h
import { CallbackSettings } from "./CallbackSettings.js";
import { CjsSchema } from "#schema";

/** Native import parameters plus the host-owned reader adaptation. */
export class ResourceGroupImportFromFileParams
{
    filename = "";
    callbackSettings = new CallbackSettings();
    /**
     * Caller-owned file reader; runtime performs no filesystem discovery.
     * @type {((filename: string) => (string|Uint8Array|Promise<string|Uint8Array>))|null}
     */
    read = null;
}

CjsSchema.define(ResourceGroupImportFromFileParams, { className: "ResourceGroupImportFromFileParams", carbon: "ResourceGroupImportFromFileParams", family: "tools", fields: {} });
