// Source: trinity/trinity/Eve/SpaceObject/EveMissileWarhead.h
// Source: trinity/trinity/Eve/SpaceObject/EveMissileWarhead.cpp
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { type } from "#schema";


@type.define({ className: "EveMissileWarheadPerObjectData", family: "eve/perObjectData" })
export class EveMissileWarheadPerObjectData extends CjsModel
{
  @type.mat4
  world = mat4.create();

  @type.vec4
  missileSize = vec4.create();
}
