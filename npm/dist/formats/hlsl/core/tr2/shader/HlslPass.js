import { HlslEffectStageInput } from './HlslEffectStageInput.js';
import { HlslRenderContextEnum } from '../HlslRenderContextEnum.js';

/**
 * Trinity effect pass containing shader stages, resource metadata, and render state.
 */
class HlslPass {
  /**
  * Creates an empty pass with stage input slots for every Trinity shader stage.
  */
  constructor() {
    this.stageInputs = Array.from({
      length: HlslRenderContextEnum.SHADER_TYPE_COUNT
    }, () => new HlslEffectStageInput());
    this.renderStates = 0;
    this.shaderTypeMask = 0;
    this.shaderProgram = 0;
    this.resourceSetDesc = null;
    this.indirectLayout = null;
    this.cjsRenderStateSetup = null;
  }

  /**
  * Returns a JSON-safe pass metadata snapshot.
  *
  * @returns {object} Serializable pass metadata.
  */
  toJSON() {
    return {
      stageInputs: this.stageInputs.map(entry => entry?.toJSON?.() ?? entry),
      renderStates: this.renderStates,
      shaderTypeMask: this.shaderTypeMask,
      shaderProgram: this.shaderProgram,
      resourceSetDesc: this.resourceSetDesc?.toJSON?.() ?? this.resourceSetDesc,
      indirectLayout: this.indirectLayout,
      cjsRenderStateSetup: this.cjsRenderStateSetup?.toJSON?.() ?? this.cjsRenderStateSetup
    };
  }
}

export { HlslPass };
//# sourceMappingURL=HlslPass.js.map
