import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterResolvedPart", family: "character" })
/** One explicit library selection prepared for a backend-neutral character graph. */
export class CjsCharacterResolvedPart extends CjsCharacterNode
{
    @type.int32
    @io.persist
    recipeEntryIndex = -1;

    @type.string
    @io.persist
    partID = "";

    @type.string
    @io.persist
    typeID = null;

    @type.string
    @io.persist
    name = "";

    @type.string
    @io.persist
    sex = "";

    @type.string
    @io.persist
    category = "";

    @type.string
    @io.persist
    path = "";

    @type.string
    @io.persist
    resourceVersion = null;

    @type.string
    @io.persist
    colorVariant = null;

    @type.float32
    @io.persist
    weight = 1;

    @type.objectRef("CjsCharacterLodBundle")
    @io.persist
    lodBundle = null;

    @type.objectRef("CjsCharacterPartMetadata")
    @io.persist
    metadata = null;

    @type.list("string")
    @io.persist
    materialIDs = [];

    @type.string
    @io.persist
    projectionID = null;

    @type.list("path")
    @io.persist
    resourcePaths = [];

    @type.list("CjsCharacterDependency")
    @io.persist
    dependencies = [];
}
