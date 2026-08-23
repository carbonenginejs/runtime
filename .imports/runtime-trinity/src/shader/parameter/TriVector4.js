// Source: E:\carbonengine\trinity\trinity\Shader\Parameter\TriFloatArrayParameter.h
// Source: E:\carbonengine\trinity\trinity\Shader\Parameter\TriFloatArrayParameter.cpp
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { io, type } from "@carbonenginejs/runtime-utils/schema";


/** One vec4 row of a TriFloatArrayParameter's value list. */
@type.define({
  className: "TriVector4",
  family: "shader"
})
export class TriVector4 extends CjsModel
{
  @io.persist
  @type.vec4
  data = vec4.create();
}
