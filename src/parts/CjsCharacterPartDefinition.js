import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterPartDefinition", family: "character" })
/** One selectable paperdoll part in the built character library. */
export class CjsCharacterPartDefinition extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

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

    @type.string
    @io.persist
    metadataId = null;

    @type.list("path")
    @io.persist
    resourcePaths = [];

    @type.list("CjsCharacterLodBundle")
    @io.persist
    lodBundles = [];

    @type.list("string")
    @io.persist
    colorIds = [];

    @type.string
    @io.persist
    projectionId = null;

}
