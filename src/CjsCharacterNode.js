import { CjsModel } from "@carbonenginejs/core-types/model";
import { type } from "@carbonenginejs/core-types/schema";

@type.define({ className: "CjsCharacterNode", family: "character" })
/** Base for schema-backed, GPU-free character graph records. */
export class CjsCharacterNode extends CjsModel {}
