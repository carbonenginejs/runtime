// Source: resources/include/ResourceGroup.h
import { CallbackSettings } from "./CallbackSettings.js";
import { S_DOCUMENT_VERSION } from "./enums.js";
import { VersionInternal } from "./VersionInternal.js";
import { CjsSchema } from "#schema";

/** Native export parameters plus the host-owned writer adaptation. */
export class ResourceGroupExportToFileParams
{
    filename = "ResourceGroup.yaml";
    outputDocumentVersion = new VersionInternal(S_DOCUMENT_VERSION);
    callbackSettings = new CallbackSettings();
    /**
     * Caller-owned file writer; the caller owns directory creation.
     * @type {((filename: string, text: string) => (void|boolean|Promise<void|boolean>))|null}
     */
    write = null;
}

CjsSchema.define(ResourceGroupExportToFileParams, { className: "ResourceGroupExportToFileParams", carbon: "ResourceGroupExportToFileParams", family: "tools", fields: {} });
