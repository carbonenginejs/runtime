import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";

@type.define({ className: "CjsCharacterNode", family: "character" })
/** Base for schema-backed, GPU-free character graph records. */
export class CjsCharacterNode extends CjsModel {}
