import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Shader/Parameter/TriFloatArrayParameter.h
// Source: trinity/trinity/Shader/Parameter/TriFloatArrayParameter.cpp
import { vec4 } from "#math/vec4";
import { type, blue } from "#schema";


/** One vec4 row of a TriFloatArrayParameter's value list. */
@be.define("TriVector4")
@blue.inherit(IRoot)

export class TriVector4
{
  @blue.readwrite
  @blue.persist
  @type.vec4
  data = vec4.create();
}
