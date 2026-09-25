// Source: trinity/trinity/Shader/Parameter/TriFloatArrayParameter.h
// Source: trinity/trinity/Shader/Parameter/TriFloatArrayParameter.cpp
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { edit, type } from "#schema";


/** One vec4 row of a TriFloatArrayParameter's value list. */
@type.define({
  className: "TriVector4",
  family: "shader"
})
export class TriVector4 extends CjsModel
{
  @edit.readwrite
  @edit.persist
  @type.vec4
  data = vec4.create();
}
