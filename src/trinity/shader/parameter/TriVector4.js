// Source: trinity/trinity/Shader/Parameter/TriFloatArrayParameter.h
// Source: trinity/trinity/Shader/Parameter/TriFloatArrayParameter.cpp
import { vec4 } from "#math/vec4";
import { meta } from "#schema";


/** One vec4 row of a TriFloatArrayParameter's value list. */
@meta.define({
  className: "TriVector4",
  family: "shader"
})
export class TriVector4
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec4
  data = vec4.create();
}
