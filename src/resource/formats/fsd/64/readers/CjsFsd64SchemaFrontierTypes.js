import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `types.fsdbinary` bytes **as EVE Frontier stores them**.
 *
 * Frontier is a different game on the same engine, and its type record is a
 * different layout: 144 bytes against Tranquility's 152, with a presence word at
 * 140 rather than 148. It is not a version of the other schema, so it is not a
 * variant of `CjsFsd64SchemaTypes` - the two are separate pinned layouts, and a
 * caller picks the one its target ships.
 *
 * What the two records disagree about is the game, not the format. Frontier
 * carries `tags` and drops `manufacturers`, `shipTreeGroupID`, `soundID` and the
 * show-info quote pair; it also stores `typeID` a second time inside the record,
 * where it equals the map key on every record.
 *
 * **This reads the current layout only (build 3573151 onward).** Frontier does
 * not return to an older client, so the previous layout (`639467dd…`, 136 bytes,
 * build 3512930) was replaced rather than kept beside it. The current layout
 * adds `quantityKind`, a string pointer at 40 between `portionSize` and
 * `radius`, in the loader's field order, under presence bit 14. Every field from
 * offset 40 moved up 8 bytes, and every presence bit from 14 moved up one.
 * Measured by matching bytes per typeID across the 32,627 types both builds
 * share: every moved field agreed on every type, apart from real data changes
 * between the builds (26 `groupID`, 10 `graphicID`, 7 `published`, 2
 * `capacity`, 1 `descriptionID`), and every old presence bit maps to exactly one
 * new bit on all shared records. `quantityKind` is set on 22 of 32,895 types -
 * `continuous` on 21, `discrete` on 1 - which are the types the new
 * `neoTypeProperty` table keys.
 *
 * **`name` and `description` are not in this file.** The record carries the
 * localisation label identifiers, and the strings live in
 * `res:/localizationfsd/localization_fsd_<language>.pickle` - which Frontier
 * ships as pickle protocol 4, not protocol 0. The label field is declared here
 * as `nameID`, matching the shape the official EVE export publishes and the
 * spelling `CjsFsd64SchemaTypes` uses; Frontier's own loader calls it
 * `typeNameID`.
 *
 * The fields themselves were derived against build 3512930, from
 * `app:/bin64/typesLoader.pyd`'s field list and referential integrity against
 * the containers each identifier points into. The claims below are that build's
 * measurements on all 32,627 records, with offsets and bits restated for the
 * current layout:
 *
 * - The stride was the only one in 128-152 that yields unique keys; in the
 *   current build only 144 does.
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
 * Two four-byte slots at 80 and 108 carry data this schema does not claim; one
 * and four records set them in build 3573151. Presence bits 6 (7,272 records)
 * and 17 (920) are likewise informative and unassigned, which is where the
 * loader's remaining field, `platforms`, will be.
 */
export class CjsFsd64SchemaFrontierTypes extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "types",
        "schemaVersion": 1,
        "path": "res:/staticdata/types.fsdbinary",
        "schemaID": "8d7a099712d997ddc7b0f218c5c8a396",
        "container": {
            "type": "MAP",
            "recordSize": 144,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 140,
                "allowedMask": 4194303
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
                    "name": "quantityKind",
                    "type": "STRING",
                    "offset": 40,
                    "presenceMask": 16384
                },
                {
                    "name": "radius",
                    "type": "FLOAT_64",
                    "offset": 48
                },
                {
                    "name": "tags",
                    "type": "LIST",
                    "offset": 56,
                    "itemSize": 4,
                    "item": {
                        "type": "UINT_32_IDENTIFIER",
                        "offset": 0
                    }
                },
                {
                    "name": "volume",
                    "type": "FLOAT_64",
                    "offset": 64
                },
                {
                    "name": "descriptionID",
                    "type": "UINT_32",
                    "offset": 72,
                    "presenceMask": 4
                },
                {
                    "name": "factionID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 76,
                    "presenceMask": 8
                },
                {
                    "name": "graphicID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 84,
                    "presenceMask": 16
                },
                {
                    "name": "groupID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 88
                },
                {
                    "name": "iconID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 92,
                    "presenceMask": 32
                },
                {
                    "name": "marketGroupID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 96,
                    "presenceMask": 128
                },
                {
                    "name": "metaGroupID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 100,
                    "presenceMask": 512
                },
                {
                    "name": "metaLevel",
                    "type": "UINT_32",
                    "offset": 104,
                    "presenceMask": 1024
                },
                {
                    "name": "raceID",
                    "type": "UINT_32",
                    "offset": 112,
                    "presenceMask": 32768
                },
                {
                    "name": "techLevel",
                    "type": "UINT_32",
                    "offset": 116,
                    "presenceMask": 262144
                },
                {
                    "name": "typeID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 120
                },
                {
                    "name": "nameID",
                    "type": "UINT_32",
                    "sourceName": "typeNameID",
                    "renamed": true,
                    "offset": 124
                },
                {
                    "name": "variationParentTypeID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 128,
                    "presenceMask": 524288
                },
                {
                    "name": "wreckTypeID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 132,
                    "presenceMask": 2097152
                },
                {
                    "name": "isDynamicType",
                    "type": "BOOLEAN",
                    "offset": 136,
                    "bit": 0
                },
                {
                    "name": "published",
                    "type": "BOOLEAN",
                    "offset": 137,
                    "bit": 0
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaFrontierTypes();
