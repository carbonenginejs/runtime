// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { CjsSchema, type } from "#schema";

/** Effect compile define retained as source metadata. */
export class Tr2EffectDefine
{

  /** name (const char*). Carbon leaves it unset (Shader/Tr2EffectDescription.h:20). */
  name = "";

  /** value (const char*). Carbon leaves it unset (Shader/Tr2EffectDescription.h:21). */
  value = "";

}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.decorateField(Tr2EffectDefine, "name", type.string);
CjsSchema.decorateField(Tr2EffectDefine, "value", type.string);
CjsSchema.meta.carbon("Tr2EffectDefine")(Tr2EffectDefine);
