// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/IEveSpaceObjectAttachment.h
import { meta } from "#schema";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { EveEntity } from "../EveEntity.js";


/** Carbon space-object attachment contract with its interface defaults. */
@meta.define({ className: "IEveSpaceObjectAttachment", family: "eve/attachment" })
export class IEveSpaceObjectAttachment extends EveEntity
{

  /** Updates attachment visibility and reports whether it contributes visible content. */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(_updateContext, _parentTransform, _bones, _boneCount)
  {
    return false;
  }

  /** Contributes renderer-neutral batches when the attachment supports them. */
  @meta.blue.method
  @meta.noop
  GetBatches(_batches, _batchType, _perObjectData, _reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
  }

  /** Registers optional attachment content with a quad renderer. */
  @meta.blue.method
  @meta.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /** Adds optional attachment records to a quad renderer. */
  @meta.blue.method
  @meta.noop
  AddToQuadRenderer(_quadRenderer, _parentTransform, _activation, _boosterGain, _bones, _boneCount)
  {
  }

  /** Adds attachment-specific debug controls when available. */
  @meta.blue.method
  @meta.noop
  GetDebugOptions(_options)
  {
  }

  /** Renders optional attachment debug information. */
  @meta.blue.method
  @meta.noop
  RenderDebugInfo(_renderer, _parentTransform, _bones, _boneCount)
  {
  }

  /** Applies an optional shader option to the attachment. */
  @meta.blue.method
  @meta.noop
  SetShaderOption(_name, _value)
  {
  }

  /** Updates optional lights owned by the attachment. */
  @meta.blue.method
  @meta.noop
  UpdateLights(_parentTransform, _bones, _boneCount, _parentStrength, _boosterGain)
  {
  }

}
