import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "./CjsCharacterNode.js";

@type.define({ className: "CjsCharacterFaceControls", family: "character" })
/** Lossless authored face-control tuples, separated by sex. */
export class CjsCharacterFaceControls extends CjsCharacterNode
{
    @type.map("unknown")
    @io.persist
    female = new Map();

    @type.map("unknown")
    @io.persist
    male = new Map();
}
