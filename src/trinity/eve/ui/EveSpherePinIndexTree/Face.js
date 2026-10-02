// Source: trinity/trinity/Eve/UI/EveSpherePinIndexTree.cpp
import { vec3 } from "#math/vec3";

/** Native face record; its AABB midpoint and enclosing radius are Cartesian. */
export class Face
{
  center = vec3.create();
  radius = 0;
  index1 = 0;
  index2 = 0;
  index3 = 0;
  flag = false;
}
