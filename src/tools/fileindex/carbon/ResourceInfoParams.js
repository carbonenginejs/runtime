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

CjsSchema.decorateField(ResourceInfoParams, "relativePath", type.string);
CjsSchema.decorateField(ResourceInfoParams, "location", type.string);
CjsSchema.decorateField(ResourceInfoParams, "checksum", type.string);
CjsSchema.decorateField(ResourceInfoParams, "compressedSize", type.uint64);
CjsSchema.decorateField(ResourceInfoParams, "uncompressedSize", type.uint64);
CjsSchema.decorateField(ResourceInfoParams, "binaryOperation", type.uint32);
CjsSchema.decorateField(ResourceInfoParams, "prefix", type.string);
CjsSchema.meta.carbon("ResourceInfoParams")(ResourceInfoParams);
