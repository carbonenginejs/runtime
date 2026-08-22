import { CjsFsd64Binary } from "../core/CjsFsd64Binary.js";
import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";

const SECTIONS = Object.freeze([
    Object.freeze({ name: "Events", countOffset: 8 }),
    Object.freeze({ name: "SoundBanks", countOffset: 24 }),
    Object.freeze({ name: "WemFileIDs", countOffset: 40 }),
]);

/**
 * Reads res:/staticdata/audiometadata.fsdbinary.
 *
 * The container publishes three independent maps from one root, which is why
 * the schema's root is an OBJECT rather than a MAP. Each section's declared
 * count is verified against the records actually decoded.
 */
export class CjsFsd64SchemaAudioMetadata extends CjsFsd64SchemaReader
{
    Read(bytes)
    {
        return AssertCounts(bytes, super.Read(bytes), value => value.size);
    }

    ReadJSON(bytes)
    {
        return AssertCounts(bytes, super.ReadJSON(bytes), value => Object.keys(value).length);
    }

    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "audioMetadata",
        "schemaVersion": 1,
        "path": "res:/staticdata/audiometadata.fsdbinary",
        "schemaID": "3a621daaa060f8e03eddfe9fe94963b5",
        "container": {
            "type": "OBJECT",
            "headerSize": 48,
            "fields": [
                {
                    "name": "Events",
                    "type": "MAP",
                    "offset": 0,
                    "recordSize": 72,
                    "key": {
                        "type": "STRING",
                        "offset": 0
                    },
                    "fields": [
                        {
                            "name": "eventID",
                            "type": "UINT_64",
                            "offset": 8
                        },
                        {
                            "name": "eventsStoppedBy",
                            "type": "LIST",
                            "offset": 16,
                            "itemSize": 8,
                            "maximumCount": 256,
                            "item": {
                                "type": "STRING",
                                "offset": 0
                            }
                        },
                        {
                            "name": "playbackDuration",
                            "type": "OBJECT",
                            "offset": 24,
                            "fields": [
                                {
                                    "name": "playbackDurationType",
                                    "type": "STRING",
                                    "offset": 0
                                },
                                {
                                    "name": "playbackDurationMin",
                                    "type": "FLOAT_32",
                                    "offset": 8
                                },
                                {
                                    "name": "playbackDurationMax",
                                    "type": "FLOAT_32",
                                    "offset": 12
                                }
                            ]
                        },
                        {
                            "name": "soundbanks",
                            "type": "LIST",
                            "offset": 48,
                            "itemSize": 8,
                            "maximumCount": 256,
                            "item": {
                                "type": "STRING",
                                "offset": 0
                            }
                        },
                        {
                            "name": "wwiseID",
                            "type": "STRING",
                            "offset": 56
                        },
                        {
                            "name": "maxRadiusAttenuation",
                            "type": "FLOAT_32",
                            "offset": 64
                        },
                        {
                            "name": "is2D",
                            "type": "UINT_8",
                            "offset": 68
                        },
                        {
                            "name": "isLoop",
                            "type": "UINT_8",
                            "offset": 69
                        },
                        {
                            "name": "isVital",
                            "type": "UINT_8",
                            "offset": 70
                        }
                    ]
                },
                {
                    "name": "SoundBanks",
                    "type": "MAP",
                    "offset": 16,
                    "recordSize": 64,
                    "key": {
                        "type": "STRING",
                        "offset": 0
                    },
                    "fields": [
                        {
                            "name": "id",
                            "type": "STRING",
                            "offset": 8
                        },
                        {
                            "name": "name",
                            "type": "STRING",
                            "offset": 16
                        },
                        {
                            "name": "parent",
                            "type": "MAP",
                            "offset": 24,
                            "recordSize": 16,
                            "key": {
                                "type": "STRING",
                                "offset": 0
                            },
                            "value": {
                                "type": "STRING",
                                "offset": 8
                            }
                        },
                        {
                            "name": "path",
                            "type": "STRING",
                            "offset": 40
                        },
                        {
                            "name": "shortId",
                            "type": "UINT_64",
                            "offset": 48
                        },
                        {
                            "name": "EssentialMedia",
                            "type": "UINT_8",
                            "offset": 56
                        },
                        {
                            "name": "EssentialSoundBank",
                            "type": "UINT_8",
                            "offset": 57
                        }
                    ]
                },
                {
                    "name": "WemFileIDs",
                    "type": "MAP",
                    "offset": 32,
                    "recordSize": 24,
                    "key": {
                        "type": "STRING",
                        "offset": 0
                    },
                    "fields": [
                        {
                            "name": "SoundBank",
                            "type": "STRING",
                            "offset": 8
                        },
                        {
                            "name": "IsEssential",
                            "type": "UINT_64",
                            "offset": 16
                        }
                    ]
                }
            ]
        }
    }));

}

function AssertCounts(bytes, decoded, size)
{
    const schemaPath = CjsFsd64SchemaAudioMetadata.getFsdSchema().path;
    const binary = new CjsFsd64Binary(bytes, { path: schemaPath });

    for (const section of SECTIONS)
    {
        const expected = binary.Uint64(binary.RootOffset + section.countOffset);
        const actual = size(decoded[section.name]);

        if (actual !== expected)
        {
            const error = new Error(
                `Decoded ${actual} of ${expected} ${section.name} records from ${schemaPath}`,
            );

            error.code = "CJS_FSD_RECORD_COUNT_INVALID";
            error.actualCount = actual;
            error.expectedCount = expected;
            error.path = schemaPath;
            error.section = section.name;
            throw error;
        }
    }

    return decoded;
}

export default new CjsFsd64SchemaAudioMetadata();
