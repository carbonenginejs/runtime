// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/IEveDistributionModifier.h
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { meta } from "#schema";


/**
 * One generated placement in a distribution: the initial transform the generator
 * produced, the extra translation, rotation and scale the attribute modifiers
 * have accumulated, and the identity and lifetime that let those modifiers
 * recognise the same placement between frames.
 */
@meta.define({
  className: "PlacementDataWithIdentifier",
  family: "eve/distribution/attributeModifiers"
})
export class PlacementDataWithIdentifier
{
  @meta.type.vec3
  initialTranslation = vec3.create();

  @meta.type.quat
  initialRotation = quat.create();

  @meta.type.vec3
  initialScale = vec3.fromValues(1, 1, 1);

  @meta.type.vec3
  additionalTranslation = vec3.create();

  @meta.type.vec3
  translationFrameDelta = vec3.create();

  @meta.type.quat
  additionalRotation = quat.create();

  @meta.type.vec3
  additionalScale = vec3.fromValues(1, 1, 1);

  @meta.type.int32
  boneIndex = -1;

  @meta.type.float32
  lifeTime = 0;

  @meta.type.uint32
  uniqueID = 0;

  @meta.type.int32
  initialPlacementID = -1;
}
