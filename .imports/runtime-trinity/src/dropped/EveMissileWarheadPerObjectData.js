// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\EveMissileWarhead.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\EveMissileWarhead.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


@type.define({ className: "EveMissileWarheadPerObjectData", family: "eve/perObjectData" })
export class EveMissileWarheadPerObjectData extends CjsModel
{
  @type.mat4
  world = mat4.create();

  @type.vec4
  missileSize = vec4.create();
}
