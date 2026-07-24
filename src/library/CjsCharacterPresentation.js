import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterPresentation", family: "character" })
/** Authored portrait and character-presentation profiles grouped by purpose. */
export class CjsCharacterPresentation extends CjsCharacterNode
{
    @type.map("unknown")
    @io.persist
    backgrounds = new Map();

    @type.map("unknown")
    @io.persist
    cameras = new Map();

    @type.map("unknown")
    @io.persist
    characters = new Map();

    @type.map("unknown")
    @io.persist
    lights = new Map();

    @type.map("unknown")
    @io.persist
    positions = new Map();

    @type.map("unknown")
    @io.persist
    posts = new Map();
}
