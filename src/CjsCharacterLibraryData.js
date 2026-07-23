import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "./CjsCharacterNode.js";

@type.define({ className: "CjsCharacterLibraryData", family: "character" })
/** Deterministic serialized root produced once from character source records. */
export class CjsCharacterLibraryData extends CjsCharacterNode
{
    @type.string
    @io.persist
    schema = "carbonenginejs.characterLibrary";

    @type.uint32
    @io.persist
    schemaVersion = 1;

    @type.string
    @io.persist
    sourceTarget = null;

    @type.string
    @io.persist
    sourceGame = null;

    @type.string
    @io.persist
    sourceProvider = null;

    @type.string
    @io.persist
    sourceBuild = null;

    @type.string
    @io.persist
    generatedAt = null;

    @type.map("path")
    @io.persist
    sourceRefs = new Map();

    @type.list("CjsCharacterLibrarySource")
    @io.persist
    sources = [];

    @type.list("CjsCharacterPartMetadata")
    @io.persist
    partMetadata = [];

    @type.list("CjsCharacterPartDefinition")
    @io.persist
    parts = [];

    @type.list("CjsCharacterMaterial")
    @io.persist
    materials = [];

    @type.list("CjsCharacterProjection")
    @io.persist
    projections = [];

    @type.list("CjsCharacterPose")
    @io.persist
    poses = [];

    @type.list("CjsCharacterRecipe")
    @io.persist
    presets = [];

    @type.map("CjsCharacterRecipeLinkSet")
    @io.persist
    recipeLinks = new Map();

    @type.list("CjsCharacterSculptField")
    @io.persist
    sculptFields = [];

    @type.list("CjsCharacterBlendshapeLimits")
    @io.persist
    blendshapeLimits = [];

    @type.list("CjsCharacterUniqueCharacter")
    @io.persist
    uniqueCharacters = [];

    @type.list("CjsCharacterVisemeSet")
    @io.persist
    visemeSets = [];

    @type.objectRef("CjsCharacterModifierNames")
    @io.persist
    modifierNames = null;

    @type.objectRef("CjsCharacterFaceSetup")
    @io.persist
    faceSetup = null;

    @type.map("CjsCharacterPartAuthoring")
    @io.persist
    partAuthoring = new Map();

    @type.objectRef("CjsCharacterPresentation")
    @io.persist
    presentation = null;
}
