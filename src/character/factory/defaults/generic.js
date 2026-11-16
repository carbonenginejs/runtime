import { CjsCharacterPdpType } from "../../formats/characterPdpType.js";

/**
 * The character library's shipped generic: `CjsCharacterGeneric`'s starting values, in its own values shape, built
 * once with the graph (`CjsGraph.from`) and overridden by an installed library's generic. Edit freely: the engine
 * reads it as data.
 *
 * Ours (no Carbon counterpart), modelled on Carbon's one SOF data file (`EveSOFDataMgr::LoadData`,
 * EveSOFDataMgr.cpp:592-611): the client's paper doll is Python.
 */
export const genericDefaults = {
    // How the parts library finds each paper doll category's options, maps, palettes and colour
    // areas, by its path below the sex's paper doll root. Ours: the client's paper doll is Python. Derived: the
    // content does not state these rules. Each was found from the content (build 3670638) and from the sources that
    // read it before the parts library did (character-structure-and-plugins.md R5). options: type, one option per
    // .type, named by its file; folder, one option per first-level folder, whose .types name the bloodlines that wear
    // it (underwear: telling it from the content would mean reading every .type); self, the category folder is its one
    // option (skin tone). maps: name, a variation's map replaces the part folder's of the same name (map decals);
    // composed, the composed names in the option's folder; catalog, one map per stem directly in the part folder, with
    // no variation; garment, the garment name lists, the variation folder first; variation, the composed names of the
    // variation folder, else the part folder (hair; moved from Graphene, derived); accessory, by region and role
    // across the item's folders: its variation's, its part's, its metadata's alternativeTextureSourcePath and the one
    // holding its types/ (accessories; derived, with an unqualified-name fallback behind the
    // characterAccessoryMapFallback setting). palettes: own, the .color files directly in the option's folder; shared,
    // those and the category's colors/ (female eye shadow ships a colors/ too, which is not offered: its options keep
    // their own); variant, its own where its .type's colour variant names one, else the category's colors/ (hair;
    // derived); folders, the .color files of an accessory's folders (derived); styles, every option's colour-variant
    // (else default) palette, the option's own first (beards; any style may wear any style's, moved from Graphene,
    // derived). areas: how its colour areas are found (FetchColorAreas): zone, detail, count (the metadata's
    // numColorAreas where stated, else as detail; derived), stated (the part metadata's numColorAreas where stated and
    // a palette ships, else none; accessories, derived) or none. Every category that ships .type files is listed. An
    // empty rule is no rule: the content has not been surveyed for it (the mesh parts, and categories no paper doll
    // part reads), and the query for it throws. head has no option rule: a head is a folder whose options the
    // archetype decides. An archetype is one option per folder. accessories/piercings repeats type names across its
    // folders (stud02 in five) and its types name parts the index does not hold (accessories/earslow/stud02; build
    // 3670638), so its option ids are not unique. requiresModel: an option is offered only when its part ships a mesh;
    // skipPatternedPalettes: a patterned palette is not offered, since nothing composes its pattern yet (accessories;
    // both moved from Graphene, derived). defaultColors: the colours of areas 1 to 3 for an option that takes no
    // palette; the lashes ship none, and are black (moved from Graphene's demo palette, derived). In the generic's own
    // shape: `categories`, a CjsCharacterDataCategory each, keyed by `name`, the category path. Which category each
    // paper doll part reads is partCategories.json. Edit freely: the library reads this as data; a library's
    // generic categories override it by name.
    categories: [
        { name: "makeup/aging", options: "type", maps: "name", palettes: "own", areas: "none" },
        { name: "makeup/augmentations", options: "type", maps: "name", palettes: "own", areas: "none" },
        { name: "makeup/freckles", options: "type", maps: "name", palettes: "own", areas: "none" },
        { name: "makeup/scarring", options: "type", maps: "name", palettes: "own", areas: "none" },
        { name: "scars", options: "type", maps: "name", palettes: "own", areas: "none" },
        { name: "makeup/eyeshadow", options: "type", maps: "composed", palettes: "own", areas: "zone" },
        { name: "makeup/eyeliner", options: "type", maps: "composed", palettes: "own", areas: "zone" },
        { name: "makeup/lipstick", options: "type", maps: "composed", palettes: "own", areas: "zone" },
        { name: "tattoo/head", options: "type", maps: "composed", palettes: "shared", areas: "zone" },
        { name: "skintone/basic", options: "self", maps: "composed", palettes: "own", areas: "detail" },
        { name: "makeup/blush", options: "type", maps: "catalog", palettes: "shared", areas: "detail" },
        { name: "makeup/eyebrows", options: "type", maps: "catalog", palettes: "shared", areas: "detail" },
        { name: "makeup/eyes", options: "type", maps: "catalog", palettes: "shared", areas: "detail" },
        { name: "makeup/armleft", options: "type", maps: "garment", palettes: "own", areas: "detail" },
        { name: "makeup/armright", options: "type", maps: "garment", palettes: "own", areas: "detail" },
        {
            name: "makeup/bodyaugmentations",
            options: "type",
            maps: "garment",
            palettes: "own",
            areas: "detail"
        },
        { name: "bottommiddle", options: "type", maps: "garment", palettes: "own", areas: "detail" },
        { name: "bottomouter", options: "type", maps: "garment", palettes: "own", areas: "detail" },
        { name: "topmiddle", options: "type", maps: "garment", palettes: "own", areas: "detail" },
        { name: "topouter", options: "type", maps: "garment", palettes: "own", areas: "detail" },
        { name: "outer", options: "type", maps: "garment", palettes: "own", areas: "detail" },
        { name: "feet", options: "type", maps: "garment", palettes: "own", areas: "detail" },
        { name: "bottomunderwear", options: "folder", maps: "garment", palettes: "own", areas: "detail" },
        { name: "topunderwear", options: "folder", maps: "garment", palettes: "own", areas: "detail" },
        { name: "hair", options: "type", maps: "variation", palettes: "variant", areas: "count" },
        { name: "beard", options: "type", maps: "variation", palettes: "styles", areas: "detail" },
        { name: "bottominner", options: "type", maps: "", palettes: "", areas: "" },
        { name: "skintype", options: "type", maps: "", palettes: "", areas: "" },
        { name: "tattoo/armleft", options: "type", maps: "", palettes: "", areas: "" },
        { name: "makeup/blemish", options: "type", maps: "", palettes: "", areas: "" },
        {
            name: "makeup/eyelashes",
            options: "type",
            maps: "composed",
            palettes: "own",
            areas: "zone",
            defaultColors: [ [ 0, 0, 0, 1 ], [ 0, 0, 0, 1 ], [ 0, 0, 0, 1 ] ]
        },
        { name: "makeup/implants", options: "type", maps: "", palettes: "", areas: "" },
        { name: "makeup/teeth", options: "type", maps: "", palettes: "", areas: "" },
        {
            name: "accessories/brow",
            options: "type",
            maps: "accessory",
            palettes: "folders",
            areas: "stated",
            requiresModel: true,
            skipPatternedPalettes: true
        },
        {
            name: "accessories/chin",
            options: "type",
            maps: "accessory",
            palettes: "folders",
            areas: "stated",
            requiresModel: true,
            skipPatternedPalettes: true
        },
        {
            name: "accessories/ears",
            options: "type",
            maps: "accessory",
            palettes: "folders",
            areas: "stated",
            requiresModel: true,
            skipPatternedPalettes: true
        },
        {
            name: "accessories/earshigh",
            options: "type",
            maps: "accessory",
            palettes: "folders",
            areas: "stated",
            requiresModel: true,
            skipPatternedPalettes: true
        },
        {
            name: "accessories/earslow",
            options: "type",
            maps: "accessory",
            palettes: "folders",
            areas: "stated",
            requiresModel: true,
            skipPatternedPalettes: true
        },
        {
            name: "accessories/glasses",
            options: "type",
            maps: "accessory",
            palettes: "folders",
            areas: "stated",
            requiresModel: true,
            skipPatternedPalettes: true
        },
        {
            name: "accessories/lips",
            options: "type",
            maps: "accessory",
            palettes: "folders",
            areas: "stated",
            requiresModel: true,
            skipPatternedPalettes: true
        },
        {
            name: "accessories/masks",
            options: "type",
            maps: "accessory",
            palettes: "folders",
            areas: "stated",
            requiresModel: true,
            skipPatternedPalettes: true
        },
        {
            name: "accessories/nose",
            options: "type",
            maps: "accessory",
            palettes: "folders",
            areas: "stated",
            requiresModel: true,
            skipPatternedPalettes: true
        },
        {
            name: "accessories/piercings",
            options: "type",
            maps: "accessory",
            palettes: "folders",
            areas: "stated",
            requiresModel: true,
            skipPatternedPalettes: true
        },
        { name: "head", options: "", maps: "", palettes: "", areas: "" },
        { name: "archetypes", options: "folder", maps: "", palettes: "", areas: "" }
    ],

    // Each character area shader's generic data, which only the library loads and resolves
    // (CjsCharacterLibraryManager); the paper doll sets the result, in the shape of Carbon's EveSOFDataGenericShader.
    // Ours: the client's paper doll is Python, so no Carbon source states these. shader: the shader file name,
    // lowercase. parameters: kept for Carbon's shape and left empty (Carbon filters hull parameters by it; the paper
    // doll has none). Every shader a character area uses has an entry (the library refuses a model with a shader that
    // has none, where Carbon stops building that batch type); the eye, hair and portrait shaders need nothing.
    // defaultTextures: a texture fills the slot of that name where the area leaves it empty or has none; an authored
    // binding is kept. List only textures the shader samples: the compiled glass and portrait shaders sample neither
    // lookup map. Every character model (483, build 3698585) leaves FresnelLookupMap empty and authors
    // ColorNdotLLookupMap as the NdotL library or leaves it empty; an empty NdotL slot gives no diffuse from any
    // light, only ambient. defaultParameters: values every area of the shader starts from (none yet). rules:
    // parameters set on the areas a rule picks by part category, batch (TriBatchType name) and atlas region; an empty
    // list picks any. DecalClip 1 makes the shader discard a pixel whose diffuse alpha is below 192/255 (the effect's
    // annotation: Decal clipping = 1.0, Opaque clipping = 0.0); the areas below author none, and the compiled 0 drew
    // their cut-away texels black: a hair style's BRDF areas in the hair or body region (the braided buns' band and
    // rear clip), and the decal and transparent DoubleLinear areas of the body carriers' categories (the torso's
    // shells; none of the 25 garment models in those categories has such an area in build 3698585, and one that did
    // would clip too). A hair style ships no accessory-region maps, so its accessory-region areas (hair_bun_hp_02
    // glass helmet, the only one) sample the hair maps whole at their own UVs: TransformUV0 the identity, over the
    // area placement. The drape (a top's lower edge, `dependants/drape`, DoubleLinear decal areas in every model of build
    // 3698585) samples the body atlas whole (TransformUV0 the identity) and clips as a decal (DecalClip 1; it authors
    // none, and the compiled 0 drew the black below the hem). A value is four floats; a float parameter reads the first,
    // and a one-component shader constant (DecalClip) is written [ value, 0, 0, 0 ].
    // In the generic's own shape: `areaShaders`, a CjsCharacterDataShader each, keyed by `shader`; a library's generic
    // shader replaces the shipped one of its name. Edit freely: the library reads this file as data.
    areaShaders: [
        {
            shader: "skinnedavatarbrdf.fx",
            parameters: [],
            defaultTextures: [
                { name: "FresnelLookupMap", resFilePath: "res:/texture/global/brdflibrary.dds" },
                { name: "ColorNdotLLookupMap", resFilePath: "res:/texture/global/ndotllibrary.png" }
            ],
            defaultParameters: [],
            rules: [
                {
                    categories: [ { str: "hair" } ],
                    batches: [],
                    regions: [ { str: "hair" }, { str: "body" } ],
                    parameters: [ { name: "DecalClip", value: [ 1, 0, 0, 0 ] } ]
                }
            ]
        },
        {
            shader: "skinnedavatarbrdflinear.fx",
            parameters: [],
            defaultTextures: [
                { name: "FresnelLookupMap", resFilePath: "res:/texture/global/brdflibrary.dds" },
                { name: "ColorNdotLLookupMap", resFilePath: "res:/texture/global/ndotllibrary.png" }
            ],
            defaultParameters: [],
            rules: [
                {
                    categories: [ { str: "hair" } ],
                    batches: [],
                    regions: [ { str: "hair" }, { str: "body" } ],
                    parameters: [ { name: "DecalClip", value: [ 1, 0, 0, 0 ] } ]
                }
            ]
        },
        {
            shader: "skinnedavatarbrdfdoublelinear.fx",
            parameters: [],
            defaultTextures: [
                { name: "FresnelLookupMap", resFilePath: "res:/texture/global/brdflibrary.dds" },
                { name: "ColorNdotLLookupMap", resFilePath: "res:/texture/global/ndotllibrary.png" }
            ],
            defaultParameters: [],
            rules: [
                {
                    categories: [ { str: "hair" } ],
                    batches: [],
                    regions: [ { str: "hair" }, { str: "body" } ],
                    parameters: [ { name: "DecalClip", value: [ 1, 0, 0, 0 ] } ]
                },
                {
                    categories: [
                        { str: "topinner" },
                        { str: "bottominner" },
                        { str: "hands" },
                        { str: "feet" },
                        { str: "dependants/sleevesupper" },
                        { str: "dependants/sleeveslower" },
                        { str: "dependants/collar" },
                        { str: "dependants/hood" }
                    ],
                    batches: [ { str: "TRIBATCHTYPE_DECAL" }, { str: "TRIBATCHTYPE_TRANSPARENT" } ],
                    regions: [],
                    parameters: [ { name: "DecalClip", value: [ 1, 0, 0, 0 ] } ]
                },
                {
                    categories: [ { str: "dependants/drape" } ],
                    batches: [],
                    regions: [],
                    parameters: [ { name: "TransformUV0", value: [ 0, 0, 1, 1 ] }, { name: "DecalClip", value: [ 1, 0, 0, 0 ] } ]
                }
            ]
        },
        {
            shader: "portraitbasic.fx",
            parameters: [],
            defaultTextures: [],
            defaultParameters: [],
            rules: []
        },
        {
            shader: "glassshader.fx",
            parameters: [],
            defaultTextures: [],
            defaultParameters: [],
            rules: [
                {
                    categories: [ { str: "hair" } ],
                    batches: [],
                    regions: [ { str: "acc" } ],
                    parameters: [ { name: "TransformUV0", value: [ 0, 0, 1, 1 ] } ]
                }
            ]
        },
        {
            shader: "eyeshader.fx",
            parameters: [],
            defaultTextures: [],
            defaultParameters: [],
            rules: []
        },
        {
            shader: "skinnedavatarhair.fx",
            parameters: [],
            defaultTextures: [],
            defaultParameters: [],
            rules: []
        },
        {
            shader: "skinnedavatarhair_detailed.fx",
            parameters: [],
            defaultTextures: [],
            defaultParameters: [],
            rules: []
        }
    ],

    // Each character sex's resource facts, in the generic's own shape (CjsCharacterGeneric.sexes, a
    // CjsCharacterDataSex each), which only the library loads (CjsCharacterLibraryManager.GetSexFacts): `name`, the
    // sex; `root`, the paper doll content root every category path is relative to; `skeleton`, the master skeleton the
    // character is skinned to; `defaultMorphs`, morph weights every character of the sex starts from, under any sculpt
    // (the eye-missing morphs at these weights seat the eyeball against the lids, which the shipped idle poses leave
    // proud of them; our setting: neither Carbon nor the client has default morph weights). Ours: the client's paper
    // doll is Python. Edit freely: the library reads this as data. `genericHead`: the generic head's folder below
    // the root. `body`: the nude body's folder below the root. `bodyFallbacks`: for each foundation texture
    // (`region.Channel`) an archetype does not ship, the folder below the root that supplies it. `eyeWetReference` and
    // `eyeWetMesh`, a workaround: the generic head's eye-wet mesh (`eyeWetMesh`) takes the effect of the matching area
    // of a baked character-select model (`eyeWetReference`; CjsCharacterLibraryManager.FetchEyeWet).
    sexes: [
        {
            name: "female",
            root: "res:/graphics/character/female/paperdoll/",
            skeleton: "res:/graphics/character/female/skeleton/masterskeletonfemale.gr2",
            defaultMorphs: [ { name: "BothEyeMissingShape", value: 0.2 } ],
            genericHead: "head/head_generic",
            body: "basenude",
            bodyFallbacks: [
                { name: "body.NormalMap", value: "head/head_generic" },
                { name: "body.SpecularMap", value: "head/head_generic" }
            ],
            eyeWetReference: "res:/graphics/character/unique/characterselect/deteisfemaleclothing/unique.black",
            eyeWetMesh: "EyeWet_GeoShape"
        },
        {
            name: "male",
            root: "res:/graphics/character/male/paperdoll/",
            skeleton: "res:/graphics/character/male/skeleton/masterskeletonmale.gr2",
            defaultMorphs: [ { name: "LeftEyeMissingShape", value: 0.05 }, { name: "RightEyeMissingShape", value: 0.05 } ],
            genericHead: "head/head_generic",
            body: "topinner/torso_nude",
            bodyFallbacks: [
                { name: "body.NormalMap", value: "head/head_generic" },
                { name: "body.SpecularMap", value: "head/head_generic" }
            ],
            eyeWetReference: "res:/graphics/character/unique/characterselect/deteismaleclothing/unique.black",
            eyeWetMesh: "EyeWet_GeoShape"
        }
    ],

    // Which name rules give an archetype its bloodline and morph target, in the generic's own
    // shape (CjsCharacterGeneric.bloodlineRule and bloodlineMorphTargetRule), which only the library loads
    // (CjsCharacterLibraryManager.FetchBloodline). `bloodlineRule`: `headFolderLastWord`, the bloodline is the last
    // word of the folder of the head that depends on the archetype (`head/caldari_deteis` is `deteis`).
    // `bloodlineMorphTargetRule`: `archetypeCodeUpperShape`, the archetype's code in capitals then `Shape`
    // (`archetypes/cdshape` is `CDShape`). Derived: no content record names an archetype's head, bloodline or morph.
    // Ours: the client's paper doll is Python.
    bloodlineRule: "headFolderLastWord",

    bloodlineMorphTargetRule: "archetypeCodeUpperShape",

    // The paper doll texture tables the parts library reads every map name by
    // (CjsCharacterTextureRoles, through CjsCharacterLibraryManager.GetTextureRoles), in the generic's own shape.
    // `textureRoles`: the role of each suffix (a CjsCharacterDataTextureRole each: the property it draws into, what
    // its channels hold, the composition operation or the role it is an input of, an empty `operation` or `inputOf`
    // being none, replace or add, whether it is drawn through the option's diffuse coverage, its sources, and the
    // facts no source states, `derived`); a `name` `<family>_<suffix>` is a role for that family alone.
    // `textureRegions`: the regions a file name can carry. `textureAtlas`: where each region sits in the character
    // atlas (a TransformUV0 rect, [u0, v0, u1, v1]). `textureAtlasTolerance`: how far an authored TransformUV0 rect
    // may lie outside an atlas region and still be placed in it; rects are authored as floats (moved from Graphene
    // atlasRegions.js). `textureGarmentMaps`: the garment map names, searched folder first, then size tier, then name,
    // `<part>` the part folder's name and `*` any name. The five are one set: an installed library holding texture
    // roles replaces them whole, and must hold all five. Ours: Carbon ships no paper doll, and the client's is Python.
    // Only the library loads this file.
    textureRoles: [
        {
            name: "d",
            families: [ { str: "comp" } ],
            property: "DiffuseMap",
            channels: [ { name: "rgb", value: "colour" }, { name: "a", value: "coverage" } ],
            operation: "Simple",
            inputOf: "",
            plan: "replace",
            covered: false,
            source: "simpleblit: RGB = Texture.rgb, SRC_ALPHA/INV_SRC_ALPHA (character-compositing.md:370, :395); DiffuseMap (shaders.yaml partSlots)",
            derived: "its alpha is coverage: matches Graphene's working behaviour, today's look (Graphene 6a47517 augmentations.js:13)"
        },
        {
            name: "l",
            families: [ { str: "colorize" }, { str: "comp" } ],
            property: "DiffuseMap",
            channels: [
                { name: "rgb", value: "detail, multiplied by the colour areas" },
                { name: "a", value: "coverage (UseMask 0 keeps the detail's alpha)" }
            ],
            operation: "Colorized",
            inputOf: "",
            plan: "replace",
            covered: false,
            source: "colorizedblit D (character-compositing.md:367, :395)",
            derived: "drawn as it is (Simple) without a zone map or palette (CjsPaperDollCompositor.CreateMaterialLayer); comp_body_l is a garment detail: matches Graphene's working behaviour, today's look (Graphene 6a47517 bodyComposition.js:74)"
        },
        {
            name: "z",
            families: [ { str: "colorize" } ],
            property: "DiffuseMap",
            channels: [
                { name: "r", value: "colour area 1 weight" },
                { name: "g", value: "colour area 2 weight" },
                { name: "b", value: "colour area 3 weight" },
                { name: "a", value: "where colourising applies" }
            ],
            operation: "",
            inputOf: "l",
            plan: "replace",
            covered: false,
            source: "colorizedblit Z, and the one-channel compact zone decode (character-compositing.md:367, :379-383)"
        },
        {
            name: "comp_z",
            families: [ { str: "comp" } ],
            property: "DiffuseMap",
            channels: [
                { name: "r", value: "colour area 1 weight" },
                { name: "g", value: "colour area 2 weight" },
                { name: "b", value: "colour area 3 weight" },
                { name: "a", value: "where colourising applies" }
            ],
            operation: "",
            inputOf: "",
            plan: "replace",
            covered: false,
            source: "the colorizedblit Z decode (character-compositing.md:367, :379-383); every head tattoo folder holds one `comp_head_z` beside its `projection.proj` (resource index)",
            derived: "PROVISIONAL (Ruru, 2026-11-09): the zone of the head tattoo's bake, which is its colourised detail (no source states it): matches Graphene's working behaviour, today's look (Graphene 5a7e30d tattoos.js); every head tattoo's is a 16x16 map of one texel selecting colour area 1 everywhere (all 115, both sexes)"
        },
        {
            name: "n",
            families: [ { str: "comp" } ],
            property: "NormalMap",
            channels: [ { name: "rgb", value: "normal (or two-channel: R = X, A = Y, Z rebuilt)" } ],
            operation: "Simple",
            inputOf: "",
            plan: "replace",
            covered: true,
            source: "covered SimpleBlit replacement (character-compositing.md:593); RGB at 4k, LA at base (:337-338)",
            derived: "the coverage is the option's own diffuse: matches Graphene's working behaviour, today's look (Graphene 6a47517 bodyComposition.js:146, hairSupport.js:144, beardSupport.js:67, augmentations.js:14)"
        },
        {
            name: "s",
            families: [ { str: "comp" }, { str: "colorize" } ],
            property: "SpecularMap",
            channels: [ { name: "rgba", value: "specular (LA at base, RGBA in some variations)" } ],
            operation: "Simple",
            inputOf: "",
            plan: "replace",
            covered: true,
            source: "LA versus RGBA (character-compositing.md:329-330); SpecularMap (shaders.yaml partSlots)",
            derived: "drawn by simpleblit, through the option's diffuse coverage as n; colorize_body_s is a boot's only specular: matches Graphene's working behaviour, today's look (Graphene 6a47517 surfaceDetails.js:60, bodyComposition.js:63)"
        },
        {
            name: "tn",
            families: [ { str: "comp" } ],
            property: "NormalMap",
            channels: [
                {
                    name: "rg",
                    value: "signed XY perturbation, (2 * value - 1) * strength / 2 (two-channel: A gives Y)"
                }
            ],
            operation: "Twist",
            inputOf: "",
            plan: "add",
            covered: false,
            source: "twistnormalblit, two passes ONE/ONE ADD then REV_SUBTRACT, destination alpha kept (character-compositing.md:373, :397)"
        },
        {
            name: "mn",
            families: [ { str: "comp" } ],
            property: "NormalMap",
            channels: [ { name: "rg", value: "normal XY, Z rebuilt" }, { name: "b", value: "coverage" } ],
            operation: "MaskedNormal",
            inputOf: "",
            plan: "replace",
            covered: false,
            source: "maskednormalblit: XY = 2 * rg - 1, alpha = b * strength; SRC_ALPHA/INV_SRC_ALPHA, destination alpha kept (character-compositing.md:372, :396)"
        },
        {
            name: "m",
            families: [ { str: "comp" } ],
            property: "CutMaskMap",
            channels: [ { name: "rgb", value: "black" }, { name: "a", value: "where the body is cut" } ],
            operation: "Simple",
            inputOf: "",
            plan: "replace",
            covered: false,
            source: "black RGB, variable alpha, drawn through alpha onto a white target (character-compositing.md:341-348); CutMaskMap (shaders.yaml partSlots)",
            derived: "the white target and a simpleblit: matches Graphene's working behaviour, today's look (Graphene 6a47517 bodyComposition.js:149, :335)"
        }
    ],

    textureRegions: [ { str: "head" }, { str: "body" }, { str: "hair" }, { str: "acc" } ],

    textureAtlas: [
        { name: "body", value: [ 0, 0, 0.5, 1 ] },
        { name: "head", value: [ 0.5, 0, 1, 0.5 ] },
        { name: "hair", value: [ 0.5, 0.5, 0.75, 1 ] },
        { name: "acc", value: [ 0.75, 0.5, 1, 1 ] }
    ],

    textureAtlasTolerance: 0.001,

    textureGarmentMaps: [
        { name: "detail", value: "colorize_body_l" },
        { name: "detail", value: "comp_body_l" },
        { name: "detail", value: "comp_body_d" },
        { name: "detail", value: "_l" },
        { name: "detail", value: "colorize_body_d" },
        { name: "detail", value: "<part>_d" },
        { name: "zone", value: "colorize_body_z" },
        { name: "normal", value: "comp_body_n" },
        { name: "normal", value: "<part>_n" },
        { name: "normal", value: "_n" },
        { name: "normal", value: "colorize_body_n" },
        { name: "normal", value: "<part>_body_n" },
        { name: "normal", value: "comp_body_mn" },
        { name: "normal", value: "*_n" },
        { name: "twist", value: "comp_body_tn" },
        { name: "twist", value: "_tn" },
        { name: "specular", value: "comp_body_s" },
        { name: "specular", value: "<part>_s" },
        { name: "specular", value: "_s" },
        { name: "specular", value: "colorize_body_s" },
        { name: "specular", value: "comb_body_s" },
        { name: "specular", value: "<part>_body_s" },
        { name: "specular", value: "*_s" },
        { name: "cutMask", value: "comp_body_m" }
    ],

    // Corrections of shipped morph data, applied on top in memory: a correction is a setting with a default, and the
    // shipped files are never changed. Each entry: the model (resource path, compared without case), the morph target
    // (a name pattern), and per mesh either mirror (regions: a sphere center/inner/outer in metres, or right:
    // true, inner/outer from the midline, the character's right is -x) or carry (the mirrored mesh it rides). Evidence: the
    // male head_generic.gr2 fatShape is asymmetric: right nostril and left upper lid; the right half of the lower
    // teeth, tongue and upper teeth moves down up to 3.0, 2.9 and 1.7 mm against 0.3 to 0.5 mm on the left
    // (2026-11-13). Each correction's tuning: mirrorTolerance (metres a mirror partner may sit from the mirrored
    // position), seamPrecision (the position key that joins a vertex's UV-seam copies), cell (metres, the mirror search
    // grid), carrySmoothing (metres of skin a riding mesh averages over).
    morphCorrections: [
        {
            name: "male-head-weight-face",
            model: "res:/graphics/character/male/paperdoll/head/head_generic/head_generic.gr2",
            morph: "^fatShape",
            mirrorTolerance: 0.0005, seamPrecision: 1000000, cell: 0.0005, carrySmoothing: 0.005,
            meshes: [
                { name: "meshShape", mirror: [
                    { name: "right nostril", center: [ -0.016, 1.728, 0.13 ], inner: 0.012, outer: 0.022 },
                    { name: "left upper lid", center: [ 0.0375, 1.771, 0.12 ], inner: 0.006, outer: 0.014 } ] },
                { name: "Eyelashes_GeoShape", carry: "meshShape" },
                { name: "EyeWet_GeoShape", carry: "meshShape" },
                { name: "EyeShadow_GeoShape", carry: "meshShape" },
                { name: "Tearducts_GeoShape", carry: "meshShape" }
            ]
        },
        {
            name: "male-head-weight-mouth",
            model: "res:/graphics/character/male/paperdoll/head/head_generic/head_generic.gr2",
            morph: "^fatShape",
            mirrorTolerance: 0.0005, seamPrecision: 1000000, cell: 0.0005, carrySmoothing: 0.005,
            meshes: [
                { name: "TeethLower_GeoShape", mirror: [
                    { name: "right half of the mouth", right: true, inner: 0.004, outer: 0.0005 } ] },
                { name: "Tongue_GeoShape", mirror: [
                    { name: "right half of the mouth", right: true, inner: 0.004, outer: 0.0005 } ] },
                { name: "TeethUpper_GeoShape", mirror: [
                    { name: "right half of the mouth", right: true, inner: 0.004, outer: 0.0005 } ] }
            ]
        }
    ],

    // The dependant meshes the paper doll draws with their owner's diffuse. Ours: no content states which dependant
    // meshes draw, with whose diffuse or with which overrides, and the client's paper doll is Python. Each entry: path,
    // the dependant's modifier path; owner, the definition member whose worn garment lists it; state, the owner's field
    // naming the version to draw (0 the folder's own model, n its vN); diffuseSize, the width and height of the target
    // its owner's colourised detail is drawn into (2048, the old body target's size). Its areas take the setup the
    // library resolves for its category (FetchModelAreas over `areaShaders`, whose drape rule sets TransformUV0 and
    // DecalClip). Edit freely: the library reads this as data.
    meshDependants: [
        {
            path: "dependants/drape/standard",
            owner: "topMiddle",
            state: "tuck",
            diffuseSize: [ 2048, 2048 ]
        }
    ],

    // The paper doll parts that cannot be worn together: each group lists definition members of which at most one is
    // worn (on with an option). When two are, the one switched on last stays; a character restored wearing both keeps
    // the later part in its group. Ours: the client's paper doll is Python and no metadata states it. The top and the
    // over top: no shipped recipe wears both (63 recipes, build 3687575: 30 with a top, 6 with an over top, none with
    // both), and both list dependants/drape, so wearing both brought two drapes whose shapes conflict, so they are not
    // worn together. Edit freely: the library reads this as data.
    exclusiveParts: [
        { members: [ { str: "topMiddle" }, { str: "topOuter" } ] }
    ],

    // The body carriers: the nude parts every character wears under its garments, and the folders a garment's own body
    // pieces come from. Ours: the client's paper doll is Python, so no Carbon source states these. parts: each nude
    // part, drawn while nothing covers or replaces it, with the dependant categories whose dependants it names as its
    // own carriers (the torso's sleeves). garmentDependants: the dependant categories whose models are body pieces a
    // garment can ask for (sleeves, collar, hood); each model there is a carrier a worn garment shows. cutMaskClip:
    // which nude carrier areas the composed cut mask clips (the clip parameter set to 1): an area holding the mask
    // resource whose influence parameter is above the threshold. At 0 (legs_nude) the shader's alpha is the composed
    // bake's, which clipping would cut away; a garment's own body piece is never clipped. meshCopy: when a shown
    // garment model carries its own copy of a nude carrier's mesh (the same mesh name, and at least share of its
    // bind-pose vertices on the carrier mesh's, positions compared at 1/positionScale metres), the carrier's mesh is
    // hidden and the garment's draws in its place. Chosen from the measured female corpus: robeaf01's cloth TorsoShape
    // 0.000; the reshaped LegsShape of nine bottom families 0.209 (pantsprtf01) to 0.809 (pantsmf01); 0.1 sits between
    // them. shells: whether a nude carrier's cut-mask shells draw (a mesh whose every area is transparent with the
    // cutMaskClip influence above its threshold: torso_nude's Torso5Shape, BridgeShape and Torso4Shape). Not drawn
    // (nothing seen so far needs them): the neck shell's top sits 1.8 mm under the head, a visible seam; the nape patch
    // draws an unpainted atlas corner; the shells poke through tight tops. backingCutout: every carrier's opaque and
    // decal areas whose cutout colour parameter has a weight above alpha are set to alpha, so the backing areas draw
    // the composite instead of darkening towards their cutout colour (the male torso's backing has no separate shell).
    // Edit freely: the library reads this as data.
    // In the generic: parts is bodyCarriers, garmentDependants is bodyCarrierGarmentDependants, and each group is plain
    // fields (cutMaskClip*, meshCopy*, shellsDraw, backingCutout*). A library that holds body carriers replaces them all,
    // and must give every name and a share and position scale above 0.
    bodyCarriers: [
        { path: "topinner/torso_nude", dependants: [ { str: "dependants/sleevesupper" }, { str: "dependants/sleeveslower" } ] },
        { path: "bottominner/legs_nude", dependants: [] },
        { path: "hands/hands_nude", dependants: [] },
        { path: "feet/feet_nude", dependants: [] }
    ],
    bodyCarrierGarmentDependants: [ { str: "dependants/sleevesupper" }, { str: "dependants/sleeveslower" }, { str: "dependants/collar" }, { str: "dependants/hood" } ],
    cutMaskClipResource: "CutMaskMap", cutMaskClipInfluence: "CutMaskInfluence", cutMaskClipAbove: 0, cutMaskClipParameter: "DecalClip",
    meshCopyShare: 0.1, meshCopyPositionScale: 10000,
    shellsDraw: false,
    backingCutoutParameter: "MaterialCutoutColor", backingCutoutAlpha: 0,

    // The library's indexing: which files it lists, what each is, and how its reader lays a file onto its record.
    // Ours: the client's paper doll is Python. sourceRoots: the res: folders it indexes; sourceExcludes: what below them
    // it never indexes. sourceTypes: each source type's record class, the file shape it stores (CjsCharacterPdpType),
    // and its layout: envelope (the file is the record's value, its name the path), generic (its records are the
    // generic's), slots (an envelope tuple's fields in order), pathOnly (indexed, never read), derived (made by the
    // library: a part join). sourceRows: which res: pattern is which source type; plain .yaml files say nothing of what
    // they are, so their folder and name do. sourceBlackPatterns: the .black/.red resources indexed by path (a pattern
    // without its extension); sourceStaticNames: the res:/staticdata/<name>.fsdbinary files indexed by path.
    // sourceListForms (normalizeCharacterYamlValues): per record class and file key, a positional form (the key's list
    // fills these fields in order) or a records form (the key becomes a list of records: keyed, a mapping whose key
    // fills that field; value, the field a whole value fills; tuple / tupleByLength, the fields a tuple fills, rest the
    // trailing items). Incarna is not the character library's (its former patterns: docs/research/incarna-content.md).
    // In the generic's own shape. CjsCharacterLibraryConfiguration reads the shipped generic's; an installed library's
    // generic does not change the indexing yet. Edit freely: the library reads this as data.
    sourceRoots: [ "res:/graphics/character/", "res:/animation/", "res:/animation_gstate/", "res:/dx9/model/character/", "res:/dx9/scene/postprocess/", "res:/ui/texture/charactercreation/backdrops/", "res:/staticdata/" ],
    sourceExcludes: [ "**/*.py", "**/*.pickle", "**/*.apb", "**/*.16", "**/*.64", "**/*.128", "**/*.256", "**/*.512", "**/*.1024" ],
    sourceTypes: [
        { name: "parts", className: "CjsCharacterPart", pdpType: CjsCharacterPdpType.PART, derived: true },
        { name: "avatarPartMetaData", className: "CjsAvatarPartMetaData", pdpType: CjsCharacterPdpType.AVATAR_PART_META_DATA },
        { name: "colorVariations", className: "CjsCharacterColorVariation", pdpType: CjsCharacterPdpType.COLOR_VARIATION },
        { name: "baseColors", className: "CjsCharacterBaseColor", pdpType: CjsCharacterPdpType.BASE_COLOR, envelope: true },
        { name: "types", className: "CjsCharacterType", pdpType: CjsCharacterPdpType.TYPE, envelope: true, slots: [ "partPath", "variation", "colorVariant", "bloodlineIDs" ] },
        { name: "projectedDecals", className: "CjsProjectedDecal", pdpType: CjsCharacterPdpType.PROJECTED_DECAL },
        { name: "cameras", className: "CjsCharacterCamera", pdpType: CjsCharacterPdpType.CAMERA },
        { name: "cameraSequences", className: "CjsCharacterCamera", pdpType: CjsCharacterPdpType.CAMERA_SEQUENCE },
        { name: "positions", className: "CjsCharacterPosition", pdpType: CjsCharacterPdpType.POSITION },
        { name: "poses", className: "CjsCharacterPose", pdpType: CjsCharacterPdpType.POSE, envelope: true },
        { name: "lights", className: "CjsCharacterLightRig", pdpType: CjsCharacterPdpType.LIGHT_RIG },
        { name: "backgrounds", className: "CjsCharacterBackground", pdpType: CjsCharacterPdpType.BACKGROUND },
        { name: "posts", className: "CjsCharacterPost", pdpType: CjsCharacterPdpType.POST },
        { name: "scalarPosts", className: "CjsCharacterPost", pdpType: CjsCharacterPdpType.POST_SCALAR },
        { name: "characters", className: "CjsCharacterPreset", pdpType: CjsCharacterPdpType.PRESET },
        { name: "scenes", className: "CjsCharacterScene", pdpType: CjsCharacterPdpType.SCENE },
        { name: "curveSetMetadata", className: "CjsCharacterCurveSetMetadata", pdpType: CjsCharacterPdpType.CURVE_SET_METADATA },
        { name: "curveCacheLists", className: "CjsCharacterCurveCacheList", pdpType: CjsCharacterPdpType.CURVE_CACHE_LIST, envelope: true },
        { name: "materialSets", className: "CjsCharacterMaterialSet", pdpType: CjsCharacterPdpType.MATERIAL_SET },
        { name: "animationInfo", className: "CjsCharacterAnimationInfo", pdpType: CjsCharacterPdpType.ANIMATION_INFO, envelope: true, generic: true },
        { name: "movementStates", className: "CjsCharacterMovementStates", pdpType: CjsCharacterPdpType.MOVEMENT_STATES, envelope: true, generic: true },
        { name: "animationData", className: "CjsCharacterAnimationData", pdpType: CjsCharacterPdpType.ANIMATION_DATA, envelope: true, generic: true },
        { name: "animationOffsets", className: "CjsCharacterAnimationOffsets", pdpType: CjsCharacterPdpType.ANIMATION_OFFSETS, envelope: true, generic: true },
        { name: "bindPoses", className: "CjsCharacterBindPose", pdpType: CjsCharacterPdpType.BIND_POSE, envelope: true, generic: true },
        { name: "postBaseNames", className: "CjsCharacterPostBaseNames", pdpType: CjsCharacterPdpType.POST_BASE_NAMES, envelope: true, generic: true },
        { name: "blendShapes", className: "CjsCharacterBlendShapes", pdpType: CjsCharacterPdpType.BLEND_SHAPES, envelope: true, generic: true },
        { name: "faceMappings", className: "CjsCharacterFaceMapping", pdpType: CjsCharacterPdpType.FACE_MAPPING, envelope: true, generic: true },
        { name: "faceTweakSettings", className: "CjsCharacterFaceTweakSettings", pdpType: CjsCharacterPdpType.FACE_TWEAK_SETTINGS, generic: true },
        { name: "modifierNames", className: "CjsCharacterModifierNames", pdpType: CjsCharacterPdpType.MODIFIER_NAMES, envelope: true, generic: true },
        { name: "sculptingLimits", className: "CjsCharacterSculptingLimits", pdpType: CjsCharacterPdpType.SCULPTING_LIMITS, generic: true },
        { name: "fieldSets", className: "CjsCharacterFieldSet", pdpType: CjsCharacterPdpType.FIELD_SET, generic: true },
        { name: "clips", className: "CjsCharacterClip", pdpType: CjsCharacterPdpType.CLIP, pathOnly: true },
        { name: "rigs", className: "CjsCharacterRig", pdpType: CjsCharacterPdpType.RIG, pathOnly: true },
        { name: "gstates", className: "CjsCharacterGState", pdpType: CjsCharacterPdpType.GSTATE, pathOnly: true },
        { name: "textures", className: "CjsCharacterTexture", pdpType: CjsCharacterPdpType.TEXTURE, pathOnly: true },
        { name: "blackResources", className: "CjsCharacterNamedValue", pdpType: CjsCharacterPdpType.BLACK_RESOURCE, pathOnly: true },
        { name: "geometryResources", className: "CjsCharacterNamedValue", pdpType: CjsCharacterPdpType.GEOMETRY_RESOURCE, pathOnly: true },
        { name: "staticResources", className: "CjsCharacterNamedValue", pdpType: CjsCharacterPdpType.STATIC_RESOURCE, pathOnly: true },
    ],
    sourceRows: [
        { match: "res:/graphics/character/global/facesetup/animationdata.yaml", sourceType: "animationData" },
        { match: "res:/graphics/character/unique/characterselect/*/animationoffsets.yaml", sourceType: "animationOffsets" },
        { match: "res:/graphics/character/**/metadata.yaml", sourceType: "avatarPartMetaData" },
        { match: "res:/graphics/character/global/paperdolllibrary/backgrounds/*.yaml", sourceType: "backgrounds" },
        { match: "res:/graphics/character/**/*.base", sourceType: "baseColors" },
        { match: "res:/graphics/character/global/facesetup/basefemalebindpose.yaml", sourceType: "bindPoses" },
        { match: "res:/graphics/character/global/facesetup/basemalebindpose.yaml", sourceType: "bindPoses" },
        { match: "res:/graphics/character/global/paperdolllibrary/posts/basename", sourceType: "postBaseNames" },
        { match: "res:/graphics/character/unique/characterselect/*/blendshapes.yaml", sourceType: "blendShapes" },
        { match: "res:/graphics/character/global/paperdolllibrary/cameras/*.yaml", sourceType: "cameras" },
        { match: "res:/graphics/character/global/paperdolllibrary/characters/*.yaml", sourceType: "characters" },
        { match: "res:/graphics/character/**/*.color", sourceType: "colorVariations" },
        { match: "res:/graphics/character/global/facesetup/*.face", sourceType: "faceMappings" },
        { match: "res:/graphics/character/global/facesetup/facetweaksettings.yaml", sourceType: "faceTweakSettings" },
        { match: "res:/graphics/character/**/*.info", sourceType: "materialSets" },
        { match: "res:/graphics/character/**/modifiernames.yaml", sourceType: "modifierNames" },
        { match: "res:/graphics/character/**/*.pose", sourceType: "poses" },
        { match: "res:/graphics/character/global/paperdolllibrary/positions/*.yaml", sourceType: "positions" },
        { match: "res:/graphics/character/global/paperdolllibrary/posts/*.yaml", sourceType: "posts" },
        { match: "res:/graphics/character/**/*.proj", sourceType: "projectedDecals" },
        { match: "res:/graphics/character/global/facesetup/scultpinglimits/*.yaml", sourceType: "sculptingLimits" },
        { match: "res:/graphics/character/global/facesetup/*.trif", sourceType: "fieldSets" },
        { match: "res:/graphics/character/**/*.type", sourceType: "types" },
        { match: "res:/animation/animinfo.yaml", sourceType: "animationInfo" },
        { match: "res:/animation/movementstates.yaml", sourceType: "movementStates" },
        { match: "res:/animation_gstate/scenes/**/curvesets/*_metadata.yaml", sourceType: "curveSetMetadata" },
        { match: "res:/animation_gstate/scenes/**/background.yaml", sourceType: "backgrounds" },
        { match: "res:/animation_gstate/scenes/**/camera.yaml", sourceType: "cameras" },
        { match: "res:/animation_gstate/scenes/**/curve_cache_list.yaml", sourceType: "curveCacheLists" },
        { match: "res:/animation_gstate/scenes/**/*_curve_cache_list.yaml", sourceType: "curveCacheLists" },
        { match: "res:/animation_gstate/scenes/**/position_*.yaml", sourceType: "positions" },
        { match: "res:/animation_gstate/scenes/**/post.yaml", sourceType: "posts" },
        { match: "res:/animation_gstate/scenes/**/scene.yaml", sourceType: "scenes" },
        { match: "res:/animation_gstate/scenes/**/scene-new.yaml", sourceType: "scenes" },
        { match: "res:/graphics/character/global/paperdolllibrary/lights/*.yaml", sourceType: "lights" },
        { match: "res:/animation_gstate/scenes/**/lights.yaml", sourceType: "lights" },
        { match: "res:/animation/charactercreatorv2/gstate/*.gsf", sourceType: "gstates" },
        { match: "res:/animation_gstate/gstate/*.gsf", sourceType: "gstates" },
        { match: "res:/animation/charactercreatorv2/female/**/*.gr2", sourceType: "clips" },
        { match: "res:/animation/charactercreatorv2/male/**/*.gr2", sourceType: "clips" },
        { match: "res:/animation/portraitcreator/female/**/*.gr2", sourceType: "clips" },
        { match: "res:/animation/portraitcreator/male/**/*.gr2", sourceType: "clips" },
        { match: "res:/animation_gstate/female/granny/**/*.gr2", sourceType: "clips" },
        { match: "res:/animation_gstate/male/granny/**/*.gr2", sourceType: "clips" },
        { match: "res:/animation/charactercreatorv2/master_rigs/**/*.gr2", sourceType: "rigs" },
        { match: "res:/animation_gstate/master_rigs/granny/**/*.gr2", sourceType: "rigs" },
        { match: "res:/graphics/character/**/*.gr2", sourceType: "geometryResources" },
        { match: "res:/graphics/character/**/*.png", sourceType: "textures" },
        { match: "res:/graphics/character/**/*.dds", sourceType: "textures" },
        { match: "res:/graphics/character/**/*.tga", sourceType: "textures" },
        { match: "res:/ui/texture/charactercreation/backdrops/*.dds", sourceType: "textures" },
        { match: "res:/ui/texture/charactercreation/backdrops/*.png", sourceType: "textures" },
        // The portrait post-process's textures (character_postprocess.black, portraitlut.black name them).
        { match: "res:/dx9/scene/postprocess/lutdefault.dds", sourceType: "textures" },
        { match: "res:/dx9/scene/postprocess/ncc_normal.dds", sourceType: "textures" },
    ],
    sourceBlackPatterns: [ "res:/graphics/character/**/*", "res:/animation_gstate/scenes/**/curvesets/*", "res:/animation_gstate/scenes/**/lights_client", "res:/dx9/model/character/corpse/corpse_rotation", "res:/dx9/scene/postprocess/character_postprocess", "res:/dx9/scene/postprocess/portraitlut" ],
    sourceStaticNames: [ "ancestries", "archetypes", "bloodlines", "character_avatarbehaviors", "character_colorlocations", "character_colornames", "character_modifierlocations", "character_portraitresources", "character_resources", "character_sculptinglocations", "npccharacters", "paperdolls", "races" ],
    sourceListForms: [
        { _type: "CjsCharacterDataListFormPositional", className: "CjsCharacterColorVariation", key: "colors", fields: [ "color1", "color2", "color3" ] },
        { _type: "CjsCharacterDataListFormPositional", className: "CjsCharacterColorVariation", key: "specularColors", fields: [ "specularColor1", "specularColor2", "specularColor3" ] },
        { _type: "CjsCharacterDataListFormPositional", className: "CjsCharacterColorVariation", key: "patternColors", fields: [ "patternColor1", "patternColor2", "patternColor3", "patternAreaColor2", "patternAreaColor3", "patternTransform", "patternRotation" ] },
        { _type: "CjsCharacterDataListFormPositional", className: "CjsCharacterAttributes", key: "ambientColor", fields: [ "ambientColor" ] },
        { _type: "CjsCharacterDataListFormPositional", className: "CjsCharacterAttributes", key: "color", fields: [ "color" ] },
        { _type: "CjsCharacterDataListFormPositional", className: "CjsCharacterAttributes", key: "incandescence", fields: [ "incandescence" ] },
        { _type: "CjsCharacterDataListFormPositional", className: "CjsCharacterAttributes", key: "transparency", fields: [ "transparency" ] },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterPose", key: "value", keyed: "name" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterBindPose", key: "value", keyed: "name" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterAnimationData", key: "value", keyed: "name" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterAnimationInfo", key: "value", keyed: "name" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterFieldSet", key: "Fields", keyed: "name" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterMaterialSet", key: "Materials", keyed: "name" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterMaterial", key: "Textures", keyed: "name", value: "value" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterAnimationInfoEntry", key: "ControlParameters", keyed: "name", value: "value" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterBlendShapes", key: "value", keyed: "name", value: "value" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterFaceTweakSettings", key: "gammaCurves", keyed: "name", value: "value" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterAnimationOffsets", key: "value", keyed: "name", value: "value" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterSculptingLimits", key: "limits", keyed: "name", tuple: [ "min", "max" ] },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterFaceMapping", key: "value", keyed: "name", tupleByLength: [ { length: 4, fields: [ "joint", "index", "axis" ] }, { length: 7, fields: [ "joint", "pairedJoint", "index" ] } ], rest: "values" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterField", key: "Triangles", keyed: "index", value: "vertices" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterField", key: "Tris", value: "corners" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterField", key: "VertData", keyed: "index", value: "parameters" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterField", key: "VertPositions", keyed: "index", value: "position" },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterFieldTri", key: "corners", tuple: [ "vertex", "position" ] },
        { _type: "CjsCharacterDataListFormRecords", className: "CjsCharacterFieldVertexData", key: "parameters", tuple: [ "name", "value" ] },
    ]

};
