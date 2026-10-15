// Source: resources/src/ResourceInfo/ResourceInfo.h:217-234
import { CjsSchema, type } from "#schema";

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

CjsSchema.blue.define(ResourceInfoParams, { className: "ResourceInfoParams", fields: {
        relativePath: [type.string],
        location: [type.string],
        checksum: [type.string],
        compressedSize: [type.uint64],
        uncompressedSize: [type.uint64],
        binaryOperation: [type.uint32],
        prefix: [type.string]
    } });
