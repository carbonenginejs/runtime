import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `types.fsdbinary` bytes.
 *
 * **`name` and `description` are not in this file.** The record carries
 * `nameID` and `descriptionID`, which are localisation label identifiers, and
 * the strings live in `res:/localizationfsd/localization_fsd_<language>.pickle`.
 * The official export publishes resolved strings per language, so a consumer
 * reproducing its shape must resolve them - see `CjsFsdLocalization`. This
 * reader deliberately returns the identifiers rather than pretending to a text
 * field it cannot supply.
 *
 * Eleven identifiers are optional and guarded by the presence word at 148.
 * Everything else in the schema is stored unconditionally, including
 * `basePrice`, `capacity`, `mass`, `volume` and `radius`, where zero is a real
 * value rather than an absence.
 *
 * **Three fields here are not in the official export**, so the export cannot
 * verify them and a consumer reproducing its shape should not emit them
 * unasked. They were found by searching the client for values the export never
 * publishes, and each is checked against what the game shows:
 *
 * - `manufacturers` is a list of NPC corporation identifiers at offset 24 -
 *   Kronos is Duvolle Laboratories, Megathron is Federation Navy and Roden
 *   Shipyards. 437 types carry one and 73 name more than one, which is why it
 *   is a list and not the single identifier it first looks like. It has **no
 *   presence bit**: the pointer is non-zero on all 52,863 records, so a type
 *   with no manufacturer has an empty list rather than an absent field.
 * - `quoteID` and `quoteAuthorID` are the show-info flavour quote and its
 *   attribution, on 434 types. The author is free prose - "Martial handbook of
 *   the Garoun Empire" as often as a person - and is not a reference to
 *   anything.
 *
 * **Which of bits 16 and 17 belongs to which quote field is inferred, not
 * measured.** The two are set together on all 434 records and cleared together
 * on the rest, so no record distinguishes them and swapping them would decode
 * every known type identically. The order here follows the alphabetical rule
 * the other bits obey, under the field names the offsets imply -
 * `quoteAuthorID` before `quoteID`, matching their order in the record. A
 * build that ever ships one without the other settles it, and nothing else can.
 *
 * The record is 152 bytes and still carries fields this schema does not claim.
 * Presence bits 2, 4, 8 and 24 remain informative and unassigned, which is
 * where those fields will be.
 */
export class CjsFsd64SchemaTypes extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "types",
        "schemaVersion": 1,
        "path": "res:/staticdata/types.fsdbinary",
        "schemaID": "4f25d0f64115864bd8c4f58da09c1758",
        "container": {
            "type": "MAP",
            "recordSize": 152,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 148,
                "allowedMask": 33554431
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
                    "name": "manufacturers",
                    "type": "LIST",
                    "offset": 24,
                    "itemSize": 4,
                    "item": {
                        "type": "UINT_32_IDENTIFIER",
                        "offset": 0
                    }
                },
                {
                    "name": "mass",
                    "type": "FLOAT_64",
                    "offset": 32
                },
                {
                    "name": "portionSize",
                    "type": "UINT_32",
                    "offset": 40
                },
                {
                    "name": "radius",
                    "type": "FLOAT_64",
                    "offset": 48
                },
                {
                    "name": "volume",
                    "type": "FLOAT_64",
                    "offset": 56
                },
                {
                    "name": "descriptionID",
                    "type": "UINT_32",
                    "offset": 68,
                    "presenceMask": 8
                },
                {
                    "name": "factionID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 72,
                    "presenceMask": 32
                },
                {
                    "name": "graphicID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 80,
                    "presenceMask": 64
                },
                {
                    "name": "groupID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 84
                },
                {
                    "name": "iconID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 88,
                    "presenceMask": 128
                },
                {
                    "name": "shipTreeGroupID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 92,
                    "presenceMask": 512
                },
                {
                    "name": "marketGroupID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 96,
                    "presenceMask": 1024
                },
                {
                    "name": "metaGroupID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 100,
                    "presenceMask": 4096
                },
                {
                    "name": "metaLevel",
                    "type": "UINT_32",
                    "offset": 104,
                    "presenceMask": 8192
                },
                {
                    "name": "quoteAuthorID",
                    "type": "UINT_32",
                    "offset": 108,
                    "presenceMask": 65536
                },
                {
                    "name": "quoteID",
                    "type": "UINT_32",
                    "offset": 112,
                    "presenceMask": 131072
                },
                {
                    "name": "raceID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 116,
                    "presenceMask": 262144
                },
                {
                    "name": "soundID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 120,
                    "presenceMask": 1048576
                },
                {
                    "name": "techLevel",
                    "type": "UINT_32",
                    "offset": 124,
                    "presenceMask": 2097152
                },
                {
                    "name": "nameID",
                    "type": "UINT_32",
                    "offset": 132
                },
                {
                    "name": "variationParentTypeID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 136,
                    "presenceMask": 4194304
                },
                {
                    "name": "isDynamicType",
                    "type": "BOOLEAN",
                    "offset": 144,
                    "bit": 0
                },
                {
                    "name": "published",
                    "type": "BOOLEAN",
                    "offset": 145,
                    "bit": 0
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaTypes();
