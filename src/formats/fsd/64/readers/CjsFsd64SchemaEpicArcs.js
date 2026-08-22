import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `epicarcs.fsdbinary` bytes.
 *
 * `epicArcNameID` is a localisation label identifier; resolve it through
 * `CjsFsdLocalization`.
 *
 * `missions` is an inner map keyed by mission identifier, and each mission
 * carries `nextMissions` - a list of identifiers into the same map - so the arc
 * is a graph rather than a sequence. `comments` is inline authoring text, not a
 * label.
 */
export class CjsFsd64SchemaEpicArcs extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "epicArcs",
        "schemaVersion": 1,
        "path": "res:/staticdata/epicarcs.fsdbinary",
        "schemaID": "14836e9e91f0d6ac652715fc47cc2d2a",
        "container": {
            "type": "MAP",
            "recordSize": 56,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 48,
                "allowedMask": 7
            },
            "fields": [
                {
                    "name": "comments",
                    "type": "STRING",
                    "offset": 8,
                    "sourceName": "comments",
                    "presenceMask": 1
                },
                {
                    "name": "missions",
                    "type": "MAP",
                    "offset": 16,
                    "recordSize": 32,
                    "key": {
                        "type": "UINT_32_IDENTIFIER",
                        "offset": 0
                    },
                    "presence": {
                        "type": "UINT_32",
                        "offset": 24,
                        "allowedMask": 3
                    },
                    "fields": [
                        {
                            "name": "nextMissions",
                            "type": "LIST",
                            "offset": 8,
                            "itemSize": 4,
                            "item": {
                                "type": "UINT_32_IDENTIFIER",
                                "offset": 0
                            },
                            "sourceName": "nextMissions",
                            "presenceMask": 2
                        },
                        {
                            "name": "agentID",
                            "type": "UINT_32_IDENTIFIER",
                            "offset": 16,
                            "sourceName": "agentID"
                        },
                        {
                            "name": "failMissionID",
                            "type": "UINT_32_IDENTIFIER",
                            "offset": 20,
                            "sourceName": "failMissionID",
                            "presenceMask": 1
                        }
                    ],
                    "sourceName": "missions"
                },
                {
                    "name": "arcRestartInterval",
                    "type": "UINT_32",
                    "offset": 32,
                    "sourceName": "arcRestartInterval"
                },
                {
                    "name": "epicArcNameID",
                    "type": "UINT_32",
                    "offset": 36,
                    "sourceName": "epicArcNameID"
                },
                {
                    "name": "factionID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 40,
                    "sourceName": "factionID",
                    "presenceMask": 2
                },
                {
                    "name": "iconID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 44,
                    "sourceName": "iconID",
                    "presenceMask": 4
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaEpicArcs();
