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

    /** Source kinds and their approved class/container declarations. */
    static kinds = {
        parts: { className: "CjsCharacterPart", derived: true },
        avatarPartMetaData: { className: "CjsAvatarPartMetaData" },
        colorVariations: { className: "CjsCharacterColorVariation" },
        baseColors: { className: "CjsCharacterBaseColor", envelope: true },
        types: { className: "CjsCharacterType", envelope: true },
        projectedDecals: { className: "CjsProjectedDecal" },
        recipes: { className: "CjsCharacterRecipe", envelope: true },
        cameras: { className: "CjsCharacterCamera" },
        cameraSequences: { className: "CjsCharacterCameraSequence", envelope: true },
        positions: { className: "CjsCharacterPosition" },
        poses: { className: "CjsCharacterPose", envelope: true },
        lights: { className: "Tr2InteriorScene" },
        backgrounds: { className: "CjsCharacterBackground" },
        posts: { className: "CjsCharacterPost" },
        scalarPosts: { className: "CjsCharacterScalarPost" },
        characters: { className: "CjsCharacterPreset" },
        scenes: { className: "CjsCharacterScene" },
        curveSetMetadata: { className: "CjsCharacterCurveSetMetadata" },
        curveCacheLists: { className: "CjsCharacterCurveCacheList", envelope: true },
        materialSets: { className: "CjsCharacterMaterialSet" },
        animationInfo: { className: "CjsCharacterAnimationInfo", envelope: true, generic: true },
        movementStates: { className: "CjsCharacterMovementStates", envelope: true, generic: true },
        animationData: { className: "CjsCharacterAnimationData", envelope: true, generic: true },
        animationOffsets: { className: "CjsCharacterAnimationOffsets", envelope: true, generic: true },
        bindPoses: { className: "CjsCharacterBindPose", envelope: true, generic: true },
        postBaseNames: { className: "CjsCharacterPostBaseNames", envelope: true, generic: true },
        blendShapes: { className: "CjsCharacterBlendShapes", envelope: true, generic: true },
        faceMappings: { className: "CjsCharacterFaceMapping", envelope: true, generic: true },
        faceTweakSettings: { className: "CjsCharacterFaceTweakSettings", generic: true },
        modifierNames: { className: "CjsCharacterModifierNames", envelope: true, generic: true },
        sculptingLimits: { className: "CjsCharacterSculptingLimits", generic: true },
        fieldSets: { className: "CjsCharacterFieldSet", generic: true },
        clips: { className: "CjsCharacterClip", pathOnly: true },
        rigs: { className: "CjsCharacterRig", pathOnly: true },
        gstates: { className: "CjsCharacterGState", pathOnly: true },
        textures: { className: "CjsCharacterTexture", pathOnly: true },
        blackResources: { className: "CjsCharacterNamedValue", pathOnly: true },
        geometryResources: { className: "CjsCharacterNamedValue", pathOnly: true },
        staticResources: { className: "CjsCharacterNamedValue", pathOnly: true }
    };

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
        [ "res:/graphics/character/**/*.prs", "recipes" ],
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
        [ "res:/animation_gstate/scenes/**/*.prs", "recipes" ],
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
