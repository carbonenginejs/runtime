import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/IEveSpaceObjectAttachment.h
import { meta } from "#schema";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { EveEntity } from "../EveEntity.js";


/** Carbon space-object attachment contract with its interface defaults. */
@be.interface("IEveSpaceObjectAttachment")
@be.inherit(IRoot)
export class IEveSpaceObjectAttachment extends EveEntity
{

  /**
   * Updates attachment visibility and reports whether it contributes visible content.
   *
   * @implemented
   */

  @meta.implemented
  UpdateVisibility(_updateContext, _parentTransform, _bones, _boneCount)
  {
    return false;
  }

  /**
   * Contributes renderer-neutral batches when the attachment supports them.
   *
   * @adapted
   */

  @meta.adapted
  GetBatches(_batches, _batchType, _perObjectData, _reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
  }

  /**
   * Registers optional attachment content with a quad renderer.
   *
   * @adapted
   */

  @meta.adapted
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /**
   * Adds optional attachment records to a quad renderer.
   *
   * @adapted
   */

  @meta.adapted
  AddToQuadRenderer(_quadRenderer, _parentTransform, _activation, _boosterGain, _bones, _boneCount)
  {
  }

  /**
   * Adds attachment-specific debug controls when available.
   *
   * @adapted
   */

  @meta.adapted
  GetDebugOptions(_options)
  {
  }

  /**
   * Renders optional attachment debug information.
   *
   * @adapted
   */

  @meta.adapted
  RenderDebugInfo(_renderer, _parentTransform, _bones, _boneCount)
  {
  }

  /**
   * Applies an optional shader option to the attachment.
   *
   * @adapted
   */

  @meta.adapted
  SetShaderOption(_name, _value)
  {
  }

  /**
   * Updates optional lights owned by the attachment.
   *
   * @adapted
   */

  @meta.adapted
  UpdateLights(_parentTransform, _bones, _boneCount, _parentStrength, _boosterGain)
  {
  }

}
