// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Effect compile define retained as source metadata. */
@type.define({ className: "Tr2EffectDefine", family: "shader" })
export class Tr2EffectDefine extends CjsModel
{

  /** name (const char*) */
  @type.string
  name = "";

  /** value (const char*) */
  @type.string
  value = "";

}
