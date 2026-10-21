// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/EveSmartLightAttributeModifierExpressionBucket.h:50-55
import { type, meta } from "#schema";

/**
 * Carbon EveSmartLightAttributeModifierExpressionBucket::Arguments: the
 * expression's variable bindings, refreshed every update and read by the
 * compiled expression.
 */
@meta.define({"className":"EveSmartLightAttributeModifierExpressionBucketArguments","carbon":"EveSmartLightAttributeModifierExpressionBucket::Arguments"})
export class EveSmartLightAttributeModifierExpressionBucketArguments
{

  /** m_time (float) = 0 (h:52). */
  @type.float32
  time = 0;

  /** m_shipSpeed (float) = 0 (h:53). */
  @type.float32
  shipSpeed = 0;

  /** m_shipMaxSpeed (float) = 0 (h:54). */
  @type.float32
  shipMaxSpeed = 0;

}
