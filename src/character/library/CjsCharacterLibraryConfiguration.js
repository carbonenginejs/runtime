import { CjsCharacterPdpType } from "../formats/characterPdpType.js";

/** Declarative source families for the flat character library. */
export class CjsCharacterLibraryConfiguration
{
    /** Roots are logical Blue paths, independent of the host mounting them. */
    static roots = [
        "res:/graphics/character/", "res:/animation/", "res:/animation_gstate/",
        "res:/dx9/model/character/", "res:/dx9/scene/postprocess/",
        "res:/graphics/interior/charactercreation/", "res:/graphics/interior/charactersheet/",
        "res:/ui/texture/charactercreation/backdrops/", "res:/staticdata/"
    ];

    /**
     * Source kinds and their approved class/container declarations; `pdpType` is the file shape the reader sets on each
     * record (`CjsCharacterRecord._pdpType`).
     */
    static kinds = {
        parts: { className: "CjsCharacterPart", pdpType: CjsCharacterPdpType.PART, derived: true },
        avatarPartMetaData: { className: "CjsAvatarPartMetaData", pdpType: CjsCharacterPdpType.AVATAR_PART_META_DATA },
        colorVariations: { className: "CjsCharacterColorVariation", pdpType: CjsCharacterPdpType.COLOR_VARIATION },
        baseColors: { className: "CjsCharacterBaseColor", pdpType: CjsCharacterPdpType.BASE_COLOR, envelope: true },
        types: { className: "CjsCharacterType", pdpType: CjsCharacterPdpType.TYPE, envelope: true, slots: [ "partPath", "variation", "colorVariant", "bloodlineIDs" ] },
        projectedDecals: { className: "CjsProjectedDecal", pdpType: CjsCharacterPdpType.PROJECTED_DECAL },
        cameras: { className: "CjsCharacterCamera", pdpType: CjsCharacterPdpType.CAMERA },
        cameraSequences: { className: "CjsCharacterCamera", pdpType: CjsCharacterPdpType.CAMERA_SEQUENCE },
        positions: { className: "CjsCharacterPosition", pdpType: CjsCharacterPdpType.POSITION },
        poses: { className: "CjsCharacterPose", pdpType: CjsCharacterPdpType.POSE, envelope: true },
        lights: { className: "CjsCharacterLightRig", pdpType: CjsCharacterPdpType.LIGHT_RIG },
        backgrounds: { className: "CjsCharacterBackground", pdpType: CjsCharacterPdpType.BACKGROUND },
        posts: { className: "CjsCharacterPost", pdpType: CjsCharacterPdpType.POST },
        scalarPosts: { className: "CjsCharacterPost", pdpType: CjsCharacterPdpType.POST_SCALAR },
        characters: { className: "CjsCharacterPreset", pdpType: CjsCharacterPdpType.PRESET },
        scenes: { className: "CjsCharacterScene", pdpType: CjsCharacterPdpType.SCENE },
        curveSetMetadata: { className: "CjsCharacterCurveSetMetadata", pdpType: CjsCharacterPdpType.CURVE_SET_METADATA },
        curveCacheLists: { className: "CjsCharacterCurveCacheList", pdpType: CjsCharacterPdpType.CURVE_CACHE_LIST, envelope: true },
        materialSets: { className: "CjsCharacterMaterialSet", pdpType: CjsCharacterPdpType.MATERIAL_SET },
        animationInfo: { className: "CjsCharacterAnimationInfo", pdpType: CjsCharacterPdpType.ANIMATION_INFO, envelope: true, generic: true },
        movementStates: { className: "CjsCharacterMovementStates", pdpType: CjsCharacterPdpType.MOVEMENT_STATES, envelope: true, generic: true },
        animationData: { className: "CjsCharacterAnimationData", pdpType: CjsCharacterPdpType.ANIMATION_DATA, envelope: true, generic: true },
        animationOffsets: { className: "CjsCharacterAnimationOffsets", pdpType: CjsCharacterPdpType.ANIMATION_OFFSETS, envelope: true, generic: true },
        bindPoses: { className: "CjsCharacterBindPose", pdpType: CjsCharacterPdpType.BIND_POSE, envelope: true, generic: true },
        postBaseNames: { className: "CjsCharacterPostBaseNames", pdpType: CjsCharacterPdpType.POST_BASE_NAMES, envelope: true, generic: true },
        blendShapes: { className: "CjsCharacterBlendShapes", pdpType: CjsCharacterPdpType.BLEND_SHAPES, envelope: true, generic: true },
        faceMappings: { className: "CjsCharacterFaceMapping", pdpType: CjsCharacterPdpType.FACE_MAPPING, envelope: true, generic: true },
        faceTweakSettings: { className: "CjsCharacterFaceTweakSettings", pdpType: CjsCharacterPdpType.FACE_TWEAK_SETTINGS, generic: true },
        modifierNames: { className: "CjsCharacterModifierNames", pdpType: CjsCharacterPdpType.MODIFIER_NAMES, envelope: true, generic: true },
        sculptingLimits: { className: "CjsCharacterSculptingLimits", pdpType: CjsCharacterPdpType.SCULPTING_LIMITS, generic: true },
        fieldSets: { className: "CjsCharacterFieldSet", pdpType: CjsCharacterPdpType.FIELD_SET, generic: true },
        clips: { className: "CjsCharacterClip", pdpType: CjsCharacterPdpType.CLIP, pathOnly: true },
        rigs: { className: "CjsCharacterRig", pdpType: CjsCharacterPdpType.RIG, pathOnly: true },
        gstates: { className: "CjsCharacterGState", pdpType: CjsCharacterPdpType.GSTATE, pathOnly: true },
        textures: { className: "CjsCharacterTexture", pdpType: CjsCharacterPdpType.TEXTURE, pathOnly: true },
        blackResources: { className: "CjsCharacterNamedValue", pdpType: CjsCharacterPdpType.BLACK_RESOURCE, pathOnly: true },
        geometryResources: { className: "CjsCharacterNamedValue", pdpType: CjsCharacterPdpType.GEOMETRY_RESOURCE, pathOnly: true },
        staticResources: { className: "CjsCharacterNamedValue", pdpType: CjsCharacterPdpType.STATIC_RESOURCE, pathOnly: true }
    };

    /**
     * The kind a file shape is stored under: a shared family's file (cameras, posts) is read before its shape is known.
     * @param {number} pdpType A `CjsCharacterPdpType` value.
     * @returns {string} The kind.
     * @throws {Error} For a value no kind declares.
     */
    static kindOf(pdpType)
    {
        for (const [ kind, declaration ] of Object.entries(this.kinds)) if (declaration.pdpType === pdpType) return kind;
        throw new Error("No character kind has file shape " + pdpType);
    }

    /** Explicit path rules; camera/post content variants are identified after reading. */
    static rows = [
        [ "res:/graphics/character/global/facesetup/animationdata.yaml", "animationData" ],
        [ "res:/graphics/character/unique/characterselect/*/animationoffsets.yaml", "animationOffsets" ],
        [ "res:/graphics/character/**/metadata.yaml", "avatarPartMetaData" ],
        [ "res:/graphics/character/global/paperdolllibrary/backgrounds/*.yaml", "backgrounds" ],
        [ "res:/graphics/character/**/*.base", "baseColors" ],
        [ "res:/graphics/character/global/facesetup/basefemalebindpose.yaml", "bindPoses" ],
        [ "res:/graphics/character/global/facesetup/basemalebindpose.yaml", "bindPoses" ],
        [ "res:/graphics/character/global/paperdolllibrary/posts/basename", "postBaseNames" ],
        [ "res:/graphics/character/unique/characterselect/*/blendshapes.yaml", "blendShapes" ],
        [ "res:/graphics/character/global/paperdolllibrary/cameras/*.yaml", "cameras" ],
        [ "res:/graphics/character/global/paperdolllibrary/characters/*.yaml", "characters" ],
        [ "res:/graphics/character/**/*.color", "colorVariations" ],
        [ "res:/graphics/character/global/facesetup/*.face", "faceMappings" ],
        [ "res:/graphics/character/global/facesetup/facetweaksettings.yaml", "faceTweakSettings" ],
        [ "res:/graphics/character/**/*.info", "materialSets" ],
        [ "res:/graphics/character/**/modifiernames.yaml", "modifierNames" ],
        [ "res:/graphics/character/**/*.pose", "poses" ],
        [ "res:/graphics/character/global/paperdolllibrary/positions/*.yaml", "positions" ],
        [ "res:/graphics/character/global/paperdolllibrary/posts/*.yaml", "posts" ],
        [ "res:/graphics/character/**/*.proj", "projectedDecals" ],
        [ "res:/graphics/character/global/facesetup/scultpinglimits/*.yaml", "sculptingLimits" ],
        [ "res:/graphics/character/global/facesetup/*.trif", "fieldSets" ],
        [ "res:/graphics/character/**/*.type", "types" ],
        [ "res:/animation/animinfo.yaml", "animationInfo" ],
        [ "res:/animation/movementstates.yaml", "movementStates" ],
        [ "res:/animation_gstate/scenes/**/curvesets/*_metadata.yaml", "curveSetMetadata" ],
        [ "res:/animation_gstate/scenes/**/background.yaml", "backgrounds" ],
        [ "res:/animation_gstate/scenes/**/camera.yaml", "cameras" ],
        [ "res:/animation_gstate/scenes/**/curve_cache_list.yaml", "curveCacheLists" ],
        [ "res:/animation_gstate/scenes/**/*_curve_cache_list.yaml", "curveCacheLists" ],
        [ "res:/animation_gstate/scenes/**/position_*.yaml", "positions" ],
        [ "res:/animation_gstate/scenes/**/post.yaml", "posts" ],
        [ "res:/animation_gstate/scenes/**/scene.yaml", "scenes" ],
        [ "res:/animation_gstate/scenes/**/scene-new.yaml", "scenes" ],
        [ "res:/graphics/character/global/paperdolllibrary/lights/*.yaml", "lights" ],
        [ "res:/animation_gstate/scenes/**/lights.yaml", "lights" ],
        [ "res:/animation/charactercreatorv2/gstate/*.gsf", "gstates" ],
        [ "res:/animation_gstate/gstate/*.gsf", "gstates" ],
        [ "res:/animation/charactercreatorv2/female/**/*.gr2", "clips" ],
        [ "res:/animation/charactercreatorv2/male/**/*.gr2", "clips" ],
        [ "res:/animation/portraitcreator/female/**/*.gr2", "clips" ],
        [ "res:/animation/portraitcreator/male/**/*.gr2", "clips" ],
        [ "res:/animation_gstate/female/granny/**/*.gr2", "clips" ],
        [ "res:/animation_gstate/male/granny/**/*.gr2", "clips" ],
        [ "res:/animation/charactercreatorv2/master_rigs/**/*.gr2", "rigs" ],
        [ "res:/animation_gstate/master_rigs/granny/**/*.gr2", "rigs" ],
        [ "res:/graphics/character/**/*.gr2", "geometryResources" ],
        [ "res:/graphics/character/**/*.png", "textures" ],
        [ "res:/graphics/character/**/*.dds", "textures" ],
        [ "res:/graphics/character/**/*.tga", "textures" ],
        [ "res:/ui/texture/charactercreation/backdrops/*.dds", "textures" ],
        [ "res:/ui/texture/charactercreation/backdrops/*.png", "textures" ]
    ].map(([ match, kind ]) => ({ match, kind }));

    /** Black aliases depend on the mounted filesystem; both spellings are explicit. */
    static blackPatterns = [
        "res:/graphics/shaders/shaderdescriptions/incarnadetailed",
        "res:/graphics/shaders/shaderdescriptions/incarnadetailed_normaldepth",
        "res:/graphics/shaders/shaderdescriptions/incarnadetailed_shadow",
        "res:/graphics/shaders/shaderdescriptions/incarnadetailedtransparent",
        "res:/graphics/shaders/shaderdescriptions/incarnasimple",
        "res:/graphics/shaders/shaderdescriptions/incarnasimple_normaldepth",
        "res:/graphics/shaders/shaderdescriptions/incarnasimple_shadow",
        "res:/graphics/shaders/shaderdescriptions/incarnasimpletransparent",
        "res:/graphics/shaders/shaderdescriptions/incarnastaticcustomizable",
        "res:/graphics/shaders/shaderdescriptions/incarnastaticcustomizable_normaldepth",
        "res:/graphics/shaders/shaderdescriptions/incarnastaticshadow",
        "res:/graphics/shaders/shaderdescriptions/incarnastatictransparent",
        "res:/graphics/shaders/shaderdescriptions/legacy/clothavatar",
        "res:/graphics/shaders/shaderdescriptions/legacy/glassavatar",
        "res:/graphics/shaders/shaderdescriptions/legacy/skinnedavatar",
        "res:/graphics/shaders/shaderdescriptions/legacy/skinnedavatarbrdf",
        "res:/graphics/shaders/shaderdescriptions/legacy/skinnedavatarbrdfdouble",
        "res:/graphics/character/**/*",
        "res:/animation_gstate/scenes/**/curvesets/*",
        "res:/animation_gstate/scenes/**/lights_client",
        "res:/dx9/model/character/corpse/corpse_rotation",
        "res:/dx9/scene/postprocess/character_postprocess",
        "res:/dx9/scene/postprocess/portraitlut",
        "res:/graphics/interior/charactercreation/**/*",
        "res:/graphics/interior/charactersheet/*"
    ];

    /** Exact references from the discovery corpus, without broad shared-texture scans. */
    static texturePaths = [
        "res:/dx9/scene/postprocess/lutdefault.dds", "res:/dx9/scene/postprocess/ncc_normal.dds",
        "res:/graphics/shared_texture/global/ds_flat.dds", "res:/graphics/shared_texture/global/normal_flat.dds",
        "res:/graphics/shared_texture/global/normal_nm.dds", "res:/graphics/shared_texture/global/packed_flat.dds",
        "res:/texture/global/50gray.dds", "res:/texture/global/black.dds",
        "res:/texture/global/flatnormal.dds", "res:/texture/global/white.dds"
    ];

    /** Opaque static candidates; no undocumented binary schema is implied. */
    static staticNames = [
        "ancestries", "archetypes", "bloodlines", "character_avatarbehaviors", "character_colorlocations",
        "character_colornames", "character_modifierlocations", "character_portraitresources", "character_resources",
        "character_sculptinglocations", "npccharacters", "paperdolls", "races"
    ];

    /**
     * The list forms of the kinds' files, by record class (`normalizeCharacterYamlValues`): a key holding one tuple or
     * number per named field, or a keyed mapping read as a list of records, each key its record's `name` (an envelope
     * kind's file is its `value`). The `.prs` recipes are the character factory's
     * (`CjsCharacterFactory.recipeConfiguration`), so their modifier's list forms are too.
     */
    static sourceLists = {
        CjsCharacterColorVariation: {
            colors: [ "color1", "color2", "color3" ],
            specularColors: [ "specularColor1", "specularColor2", "specularColor3" ],
            patternColors: [ "patternColor1", "patternColor2", "patternColor3", "patternAreaColor2", "patternAreaColor3", "patternTransform", "patternRotation" ]
        },
        CjsCharacterAttributes: {
            ambientColor: [ "ambientColor" ],
            color: [ "color" ],
            incandescence: [ "incandescence" ],
            transparency: [ "transparency" ]
        },
        CjsCharacterPose: { value: { keyed: "name" } },
        CjsCharacterBindPose: { value: { keyed: "name" } },
        CjsCharacterAnimationData: { value: { keyed: "name" } },
        CjsCharacterAnimationInfo: { value: { keyed: "name" } },
        CjsCharacterFieldSet: { Fields: { keyed: "name" } },
        CjsCharacterMaterialSet: { Materials: { keyed: "name" } },
        CjsCharacterMaterial: { Textures: { keyed: "name", value: "value" } },
        CjsCharacterAnimationInfoEntry: { ControlParameters: { keyed: "name", value: "value" } },
        CjsCharacterBlendShapes: { value: { keyed: "name", value: "value" } },
        CjsCharacterFaceTweakSettings: { gammaCurves: { keyed: "name", value: "value" } },
        CjsCharacterAnimationOffsets: { value: { keyed: "name", value: "value" } },
        CjsCharacterSculptingLimits: { limits: { keyed: "name", tuple: [ "min", "max" ] } },
        CjsCharacterFaceMapping: { value: { keyed: "name", tuple: { 4: [ "joint", "index", "axis" ], 7: [ "joint", "pairedJoint", "index" ] }, rest: "values" } },
        CjsCharacterField: {
            Triangles: { keyed: "index", value: "vertices" },
            Tris: { value: "corners" },
            VertData: { keyed: "index", value: "parameters" },
            VertPositions: { keyed: "index", value: "position" }
        },
        CjsCharacterFieldTri: { corners: { tuple: [ "vertex", "position" ] } },
        CjsCharacterFieldVertexData: { parameters: { tuple: [ "name", "value" ] } }
    };

    /** Non-data and unestablished opaque inputs, relative to each configured root. */
    static excludes = [ "**/*.py", "**/*.pickle", "**/*.apb", "**/*.16", "**/*.64", "**/*.128", "**/*.256", "**/*.512", "**/*.1024" ];

    /**
     * Returns explicit match/kind rows including reader-owned resource paths.
     * @returns {Array<{match:string,kind:string}>} Detached configuration rows.
     */
    static getRows()
    {
        const rows = this.rows.map(row => ({ ...row }));
        for (const prefix of this.blackPatterns)
        {
            rows.push({ match: prefix + ".red", kind: "blackResources" });
            rows.push({ match: prefix + ".black", kind: "blackResources" });
        }
        for (const match of this.texturePaths) rows.push({ match, kind: "textures" });
        for (const name of this.staticNames) rows.push({ match: `res:/staticdata/${name}.fsdbinary`, kind: "staticResources" });
        return rows;
    }
}
