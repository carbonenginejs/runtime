// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { blueEnums, EnumRegistrationType } from "#blue/enums/CjsBlueEnumRegistry";

export const LifeTimeFormulas = Object.freeze({
  PER_INSTANCE_LIFETIME: 0,
  PER_MODIFIER_PLAYTIME: 1,
  STATIC: 2,
});

// Registered as Carbon registers it (trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/EveSmartLightBaseAttributeModifier_Blue.cpp:13).
blueEnums.Create("trinity.LifetimeFormula", LifeTimeFormulas, {
  exposedName: "LifetimeFormula", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Per Instance Lifetime", value: LifeTimeFormulas.PER_INSTANCE_LIFETIME, description: "animate each object individually" },
    { name: "Modifier Play Time", value: LifeTimeFormulas.PER_MODIFIER_PLAYTIME, description: "simultanously animate all things in group" },
    { name: "Static", value: LifeTimeFormulas.STATIC, description: "not animated, only use curve for per instance offset values" }
  ]
});
