import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "./CjsCharacterNode.js";

@type.define({ className: "CjsCharacterViseme", family: "character" })
/** One exact authored speech control and its optional skeletal animation source. */
export class CjsCharacterViseme extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.string
    @io.persist
    parameterName = "";

    @type.string
    @io.persist
    animationName = null;

    @type.path
    @io.persist
    resourcePath = null;

    @type.float32
    @io.persist
    minimum = 0;

    @type.float32
    @io.persist
    maximum = 1;

    @type.float32
    @io.persist
    defaultValue = 0;
}
