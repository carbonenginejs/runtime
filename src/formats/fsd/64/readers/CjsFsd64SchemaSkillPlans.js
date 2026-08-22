import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `skillplans.fsdbinary` bytes.
 *
 * `descriptionID`, `nameID` are localisation label identifiers; resolve them
 * through `CjsFsdLocalization`.
 *
 * **Two layouts for one shape, in one file.** `milestones` and
 * `skillRequirements` both hold `{level, typeID}`, and they are not the same
 * record. A milestone is 12 bytes and carries its own presence word guarding
 * `level`; a skill requirement is 8 bytes with none, so its level is always
 * present. Reading either at the other's stride produces plausible, shifted
 * nonsense.
 *
 * **A loader-string trap.** Binary string dedup makes `skillplansloader` appear
 * to name no fields on the milestone class, because both names were already
 * emitted for the outer record and are not repeated. Attributing field names by
 * adjacency in the string run misassigns them here.
 */
export class CjsFsd64SchemaSkillPlans extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "skillPlans",
        "schemaVersion": 1,
        "path": "res:/staticdata/skillplans.fsdbinary",
        "schemaID": "b8ebd28ca6475c3610f2fcb5c358359c",
        "container": {
            "type": "MAP",
            "recordSize": 56,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 52,
                "allowedMask": 127
            },
            "fields": [
                {
                    "name": "milestones",
                    "type": "LIST",
                    "offset": 8,
                    "itemSize": 12,
                    "sourceName": "milestones",
                    "presenceMask": 8,
                    "item": {
                        "type": "OBJECT",
                        "presence": {
                            "type": "UINT_32",
                            "offset": 8,
                            "allowedMask": 1
                        },
                        "fields": [
                            {
                                "name": "level",
                                "type": "UINT_32",
                                "offset": 0,
                                "sourceName": "level",
                                "presenceMask": 1
                            },
                            {
                                "name": "typeID",
                                "type": "UINT_32_IDENTIFIER",
                                "offset": 4,
                                "sourceName": "typeID"
                            }
                        ]
                    }
                },
                {
                    "name": "name",
                    "type": "STRING",
                    "offset": 16,
                    "sourceName": "name",
                    "presenceMask": 16
                },
                {
                    "name": "skillRequirements",
                    "type": "LIST",
                    "offset": 24,
                    "itemSize": 8,
                    "sourceName": "skillRequirements",
                    "item": {
                        "type": "OBJECT",
                        "fields": [
                            {
                                "name": "level",
                                "type": "UINT_32",
                                "offset": 0,
                                "sourceName": "level"
                            },
                            {
                                "name": "typeID",
                                "type": "UINT_32_IDENTIFIER",
                                "offset": 4,
                                "sourceName": "typeID"
                            }
                        ]
                    }
                },
                {
                    "name": "careerPathID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 32,
                    "sourceName": "careerPathID",
                    "presenceMask": 1
                },
                {
                    "name": "descriptionID",
                    "type": "UINT_32",
                    "offset": 36,
                    "sourceName": "descriptionID",
                    "presenceMask": 2
                },
                {
                    "name": "factionID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 40,
                    "sourceName": "factionID",
                    "presenceMask": 4
                },
                {
                    "name": "nameID",
                    "type": "UINT_32",
                    "offset": 44,
                    "sourceName": "nameID",
                    "presenceMask": 32
                },
                {
                    "name": "npcCorporationDivision",
                    "type": "UINT_32",
                    "offset": 48,
                    "sourceName": "npcCorporationDivision",
                    "presenceMask": 64
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaSkillPlans();
