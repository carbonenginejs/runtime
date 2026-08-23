import {
    CJS_BLACK_EXTENSION,
    CJS_BLACK_FORMAT_ID,
    CJS_BLACK_FOURCC,
    CJS_BLACK_VERSION
} from "./blackConstants.js";
import {
    generatedAt as schemaGeneratedAt,
    schema as schemaName,
    version as schemaVersion
} from "./blackSchema.js";

export const extension = CJS_BLACK_EXTENSION;
export const formatId = CJS_BLACK_FORMAT_ID;
export const fourcc = CJS_BLACK_FOURCC;
export const formatVersion = CJS_BLACK_VERSION;
export const generatedAt = schemaGeneratedAt;
export const schema = schemaName;
export const version = schemaVersion;

export default Object.freeze({
    extension,
    formatId,
    formatVersion,
    fourcc,
    generatedAt,
    schema,
    version
});
