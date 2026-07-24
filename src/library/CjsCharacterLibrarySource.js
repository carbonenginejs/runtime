import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterLibrarySource", family: "character" })
/** Metadata for one path in the containing library's sourceRefs table. */
export class CjsCharacterLibrarySource extends CjsCharacterNode
{
    @type.string
    @io.persist
    ref = "";

    @type.string
    @io.persist
    profile = null;

    @type.string
    @io.persist
    build = null;

    @type.string
    @io.persist
    checksum = null;

    @type.uint32
    @io.persist
    byteLength = null;
}
