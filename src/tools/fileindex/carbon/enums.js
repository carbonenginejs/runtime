// Source: resources/include/Enums.h
import { Version } from "./Version.js";

/** CarbonResources::ResultType, with the native ordinal values. */
export const ResultType = Object.freeze({
    SUCCESS: 0,
    FAIL: 1,
    UNSUPPORTED_FILE_FORMAT: 2,
    FAILED_TO_OPEN_FILE: 3,
    MALFORMED_RESOURCE_INPUT: 4,
    FILE_TYPE_MISMATCH: 5,
    DOCUMENT_VERSION_UNSUPPORTED: 6,
    REQUIRED_RESOURCE_PARAMETER_NOT_SET: 7,
    FAILED_TO_OPEN_FILE_STREAM: 8,
    FAILED_TO_READ_FROM_STREAM: 9,
    FAILED_TO_WRITE_TO_STREAM: 10,
    FAILED_TO_DOWNLOAD_FILE: 11,
    FAILED_TO_CREATE_PATCH: 12,
    FAILED_TO_SAVE_FILE: 13,
    FAILED_TO_GENERATE_CHECKSUM: 14,
    FAILED_TO_GENERATE_RELATIVE_PATH_CHECKSUM: 15,
    FAILED_TO_COMPRESS_DATA: 16,
    PATCH_RESOURCE_LIST_MISSMATCH: 17,
    FAILED_TO_APPLY_PATCH: 18,
    UNEXPECTED_PATCH_CHECKSUM_RESULT: 19,
    UNEXPECTED_PATCH_DIFF_ENCOUNTERED: 20,
    FILE_NOT_FOUND: 21,
    FAILED_TO_RETRIEVE_CHUNK_DATA: 22,
    RESOURCE_VALUE_NOT_SET: 23,
    UNEXPECTED_END_OF_CHUNKS: 24,
    UNEXPECTED_CHUNK_CHECKSUM_RESULT: 25,
    FAILED_TO_SAVE_TO_STREAM: 26,
    INPUT_DIRECTORY_DOESNT_EXIST: 27,
    RESOURCE_TYPE_MISSMATCH: 28,
    MALFORMED_RESOURCE_GROUP: 29,
    MALFORMED_RESOURCE: 30,
    FAILED_TO_PARSE_YAML: 31,
    INVALID_CHUNK_SIZE: 32,
    RESOURCE_GROUP_NOT_SET: 33,
    RESOURCE_LIST_NOT_SET: 34,
    RESOURCE_NOT_FOUND: 35,
    REQUIRED_INPUT_PARAMETER_NOT_SET: 36,
    FAILED_TO_INITIALIZE_RESOURCE_FILTER: 37,
    INVALID_INPUT_PARAMETER: 38,
    PATCH_SIZE_EXCEEDED: 39
});

/** CarbonResources::StatusProgressType, with the native ordinal values. */
export const StatusProgressType = Object.freeze({
    UNBOUNDED: 0,
    PERCENTAGE: 1,
    WARNING: 2,
    START: 3,
    END: 4
});

/** CarbonResources::ResourceSourceType, with the native ordinal values. */
export const ResourceSourceType = Object.freeze({
    LOCAL_RELATIVE: 0,
    LOCAL_CDN: 1,
    REMOTE_CDN: 2
});

/** CarbonResources::ResourceDestinationType, with the native ordinal values. */
export const ResourceDestinationType = Object.freeze({
    LOCAL_RELATIVE: 0,
    LOCAL_CDN: 1,
    REMOTE_CDN: 2
});



/** `S_DOCUMENT_VERSION` (Enums.h:253): the highest document version this library reads and writes. */
export const S_DOCUMENT_VERSION = Object.freeze(new Version(0, 1, 0));

/** `S_CSV_DOCUMENT_VERSION` (Enums.h:255): the document version of the old CSV form. */
export const S_CSV_DOCUMENT_VERSION = Object.freeze(new Version(0, 0, 0));

/** `S_VALID_DOCUMENT_VERSIONS` (Enums.h:257-260). */
export const S_VALID_DOCUMENT_VERSIONS = Object.freeze([ S_CSV_DOCUMENT_VERSION, S_DOCUMENT_VERSION ]);
