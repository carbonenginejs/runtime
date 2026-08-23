// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/IEveDistributionModifier.h
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { type } from "#schema";


/**
 * One generated placement in a distribution: the initial transform the generator
 * produced, the extra translation, rotation and scale the attribute modifiers
 * have accumulated, and the identity and lifetime that let those modifiers
 * recognise the same placement between frames.
 */
@type.define({
  className: "PlacementDataWithIdentifier",
  family: "eve/distribution/attributeModifiers"
})
export class PlacementDataWithIdentifier extends CjsModel
{
  @type.vec3
  initialTranslation = vec3.create();

  @type.quat
  initialRotation = quat.create();

  @type.vec3
  initialScale = vec3.fromValues(1, 1, 1);

  @type.vec3
  additionalTranslation = vec3.create();

  @type.vec3
  translationFrameDelta = vec3.create();

  @type.quat
  additionalRotation = quat.create();

  @type.vec3
  additionalScale = vec3.fromValues(1, 1, 1);

  @type.int32
  boneIndex = -1;

  @type.float32
  lifeTime = 0;

  @type.uint32
  uniqueID = 0;

  @type.int32
  initialPlacementID = -1;
}
