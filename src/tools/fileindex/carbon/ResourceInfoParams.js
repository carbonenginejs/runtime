// Source: resources/src/ResourceInfo/ResourceInfo.h:217-234
import { CjsSchema } from "#schema";

/** CarbonResources::ResourceInfoParams, preserving native aggregate defaults. */
export class ResourceInfoParams
{
    relativePath = "";
    location = "";
    checksum = "";
    compressedSize = 0n;
    uncompressedSize = 0n;
    binaryOperation = 0;
    prefix = "";
}

CjsSchema.define(ResourceInfoParams, { className: "ResourceInfoParams", carbon: "ResourceInfoParams", family: "tools", fields: {} });
