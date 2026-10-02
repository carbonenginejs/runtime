import { meta } from "#schema";

/** One authored RGBA character color value. */
@meta.define({ className: "CjsCharacterColorValue", family: "character" })
export class CjsCharacterColorValue
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.vec4
    value = [ 0, 0, 0, 1 ];

}

export default CjsCharacterColorValue;
