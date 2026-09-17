import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `types.fsdbinary` bytes **as EVE Frontier stores them**.
 *
 * Frontier is a different game on the same engine, and its type record is a
 * different layout: 136 bytes against Tranquility's 152, with a presence word at
 * 132 rather than 148. It is not a version of the other schema, so it is not a
 * variant of `CjsFsd64SchemaTypes` - the two are separate pinned layouts, and a
 * caller picks the one its target ships.
 *
 * What the two records disagree about is the game, not the format. Frontier
 * carries `tags` and drops `manufacturers`, `shipTreeGroupID`, `soundID` and the
 * show-info quote pair; it also stores `typeID` a second time inside the record,
 * where it equals the map key on all 32,627 records.
 *
 * **`name` and `description` are not in this file.** The record carries the
 * localisation label identifiers, and the strings live in
 * `res:/localizationfsd/localization_fsd_<language>.pickle` - which Frontier
 * ships as pickle protocol 4, not protocol 0. The label field is declared here
 * as `nameID`, matching the shape the official EVE export publishes and the
 * spelling `CjsFsd64SchemaTypes` uses; Frontier's own loader calls it
 * `typeNameID`.
 *
 * Derived against build 3512930, from `app:/bin64/typesLoader.pyd`'s field list
 * and referential integrity against the containers each identifier points into.
 * Every claim below is a measurement on all 32,627 records:
 *
 * - The stride is the only one in 128-152 that yields unique keys.
 * - `groupID` resolves into `groups` on 32,623 of 32,623 non-zero records,
 *   `graphicID` into `graphicids` on 12,636 of 12,636, `iconID` into `iconids`
 *   on 9,984 of 9,984, `marketGroupID` into `marketgroups` on 9,693 of 9,693,
 *   `metaGroupID` into `metagroups` on 4,149 of 4,149, and `descriptionID` and
 *   `nameID` into the localisation table on 20,642 of 20,642 and 32,627 of
 *   32,627.
 * - `variationParentTypeID` and `wreckTypeID` resolve into this same file.
 * - Each presence bit below is the smallest bit set on **every** record whose
 *   field is non-zero. `iconID` (bit 5) is set on 9,998 records against 9,984
 *   non-zero values and `metaLevel` (bit 10) on 1,941 against 1,110: those
 *   fields are present holding zero, which is a real value, not an absence.
 *
 * `raceID` is a **bit mask here, not a single race**: its values are the powers
 * of two the race table keys, plus the combinations 134 and 135. It is declared
 * `UINT_32` for that reason, where `CjsFsd64SchemaTypes` declares an identifier.
 *
 * Two four-byte slots at 72 and 100 carry data this schema does not claim; one
 * record sets each. Presence bits 6 (7,156 records) and 16 (912) are likewise
 * informative and unassigned, which is where the loader's remaining fields -
 * `platforms` among them - will be.
 */
export class CjsFsd64SchemaFrontierTypes extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "types",
        "schemaVersion": 1,
        "path": "res:/staticdata/types.fsdbinary",
        "schemaID": "639467dd23791c31777b3f4ff31f6bad",
        "container": {
            "type": "MAP",
            "recordSize": 136,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 132,
                "allowedMask": 2097151
            },
            "fields": [
                {
                    "name": "basePrice",
                    "type": "FLOAT_64",
                    "offset": 8
                },
                {
                    "name": "capacity",
                    "type": "FLOAT_64",
                    "offset": 16
                },
                {
                    "name": "mass",
                    "type": "FLOAT_64",
                    "offset": 24
                },
                {
                    "name": "portionSize",
                    "type": "UINT_32",
                    "offset": 32
                },
                {
                    "name": "radius",
                    "type": "FLOAT_64",
                    "offset": 40
                },
                {
                    "name": "tags",
                    "type": "LIST",
                    "offset": 48,
                    "itemSize": 4,
                    "item": {
                        "type": "UINT_32_IDENTIFIER",
                        "offset": 0
                    }
                },
                {
                    "name": "volume",
                    "type": "FLOAT_64",
                    "offset": 56
                },
                {
                    "name": "descriptionID",
                    "type": "UINT_32",
                    "offset": 64,
                    "presenceMask": 4
                },
                {
                    "name": "factionID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 68,
                    "presenceMask": 8
                },
                {
                    "name": "graphicID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 76,
                    "presenceMask": 16
                },
                {
                    "name": "groupID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 80
                },
                {
                    "name": "iconID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 84,
                    "presenceMask": 32
                },
                {
                    "name": "marketGroupID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 88,
                    "presenceMask": 128
                },
                {
                    "name": "metaGroupID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 92,
                    "presenceMask": 512
                },
                {
                    "name": "metaLevel",
                    "type": "UINT_32",
                    "offset": 96,
                    "presenceMask": 1024
                },
                {
                    "name": "raceID",
                    "type": "UINT_32",
                    "offset": 104,
                    "presenceMask": 16384
                },
                {
                    "name": "techLevel",
                    "type": "UINT_32",
                    "offset": 108,
                    "presenceMask": 131072
                },
                {
                    "name": "typeID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 112
                },
                {
                    "name": "nameID",
                    "type": "UINT_32",
                    "offset": 116
                },
                {
                    "name": "variationParentTypeID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 120,
                    "presenceMask": 262144
                },
                {
                    "name": "wreckTypeID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 124,
                    "presenceMask": 1048576
                },
                {
                    "name": "isDynamicType",
                    "type": "BOOLEAN",
                    "offset": 128,
                    "bit": 0
                },
                {
                    "name": "published",
                    "type": "BOOLEAN",
                    "offset": 129,
                    "bit": 0
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaFrontierTypes();
