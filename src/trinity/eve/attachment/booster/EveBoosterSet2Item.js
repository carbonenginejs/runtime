// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveBoosterSet2.h
//
// NOT A CARBON CLASS. Its six fields are the argument list of
// EveBoosterSet2::Add( const Matrix*, const Vector4*, bool hasTrail, uint32_t
// atlasIndex0, uint32_t atlasIndex1, float lightScale ) in declaration order.
// Carbon adds boosters imperatively and keeps only the DERIVED
// EveBoosterSet2::SingleBoosterData (which carries light position, radius and
// phase instead, and neither hasTrail nor lightScale). We need the AUTHORED
// placements to survive a values round trip, so the call's arguments are held
// as a record. The name is ours and reads as though Carbon had an Item type;
// it does not.
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { io, type } from "#schema";

/**
 * One authored booster placement: its local transform, functionality inputs,
 * atlas slots, light scale and whether it emits a trail.
 */
@type.define({ className: "EveBoosterSet2Item", family: "eve/attachment/boosters" })
export class EveBoosterSet2Item extends CjsModel
{
  @io.rebuild("packedGeometry")
  @io.persist
  @type.mat4
  transform = mat4.create();

  @io.rebuild("packedGeometry")
  @io.persist
  @type.vec4
  functionality = vec4.fromValues(0, 1, 1, 1);

  @io.rebuild("packedGeometry")
  @io.persist
  @type.boolean
  hasTrail = true;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.uint32
  atlasIndex0 = 0;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.uint32
  atlasIndex1 = 0;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.float32
  lightScale = 1;
}
