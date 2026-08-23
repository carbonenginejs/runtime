// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { CjsSchema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Effect compile define retained as source metadata. */
export class Tr2EffectDefine extends CjsModel
{

  /** name (const char*) */
  name = "";

  /** value (const char*) */
  value = "";

}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2EffectDefine, {
  className: "Tr2EffectDefine",
  family: "shader",
  fields: {
    name: type.string,
    value: type.string
  }
});
