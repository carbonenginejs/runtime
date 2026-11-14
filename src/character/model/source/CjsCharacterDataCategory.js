import { meta, type } from "#schema";

/**
 * One paper doll category's rules: how the parts library finds its options, maps, palettes and colour areas. The
 * generic holds these by category path (`CjsCharacterGeneric.categories`); the shipped defaults are
 * `factory/defaults/categories.json`, which also says what each value means. An empty rule is no rule.
 *
 * Modelled on: EveSOFDataGenericHullCategory (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:2317-2334)
 * Carbon's holds only a category name and a reflection mode, so every field here is ours.
 */
@meta.define("CjsCharacterDataCategory")
export class CjsCharacterDataCategory
{

    /** How its options are listed: `type`, `folder` or `self`. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    options = "";

    /** How an option's maps are found: `name`, `composed`, `catalog` or `garment`. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    maps = "";

    /** Where an option's palettes are: `own` or `shared`. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    palettes = "";

    /** How an option's colour areas are found: `zone`, `detail` or `none`. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    areas = "";

    /** The colours of areas 1 to 3 for an option that takes no palette (the lashes' black); empty for none. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.array("vec4")
    defaultColors = [];

    /** Whether an option is offered only when its part ships a mesh (accessories). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    requiresModel = false;

    /** Whether a patterned palette is left out of an option's palettes, because nothing composes its pattern yet. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    skipPatternedPalettes = false;

}
