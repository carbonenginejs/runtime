import { exposure as be } from "#be";
// Source: trinity/trinity/PostProcess/Effects/Tr2PPTonemappingEffect.h
// Source: trinity/trinity/PostProcess/Effects/Tr2PPTonemappingEffect.cpp
import { meta, type, blue } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { blueEnums } from "#blue/enums/CjsBlueEnumRegistry";

/** The anonymous enum behind m_method (Tr2PPTonemappingEffect.h:39-43). */
const TonemappingEffectMethod = Object.freeze({ Uncharted2: 0, Aces: 1, AgX: 2 });

// The C++ enum is anonymous and unregistered; the chooser names it (trinity/trinity/PostProcess/Effects/Tr2PPTonemappingEffect_Blue.cpp:8).
blueEnums.Create("trinity.TonemappingEffectMethodChooser", TonemappingEffectMethod, {
  chooser: [
    { name: "Aces (new)", value: TonemappingEffectMethod.Aces, description: "Aces tonemapper introduced in Frontier." },
    { name: "AgX (new)", value: TonemappingEffectMethod.AgX, description: "AgX tonemapper used in Frontier." },
    { name: "Uncharted 2 (old)", value: TonemappingEffectMethod.Uncharted2, description: "Uncharted 2 tonemapper used in Eve" }
  ]
});


/**
 * Tonemapping curve selection - Uncharted2, ACES or AgX - together with the toe,
 * shoulder and clipping parameters that shape it.
 */
@be.define("Tr2PPTonemappingEffect")
@be.exposureChainTo(Tr2PPEffect)
@be.mapInterface(Tr2PPEffect)
export class Tr2PPTonemappingEffect extends Tr2PPEffect
{

  /** Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/PostProcess/Effects/Tr2PPTonemappingEffect_Blue.cpp:20); chooser TonemappingEffectMethodChooser (trinity/trinity/PostProcess/Effects/Tr2PPTonemappingEffect_Blue.cpp:8). */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, "trinity.TonemappingEffectMethodChooser")
  @type.int32
  @type.enum("trinity.TonemappingEffectMethodChooser")
  method = Tr2PPTonemappingEffect.Aces;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Aces (new)")
  toe = 0.55;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Aces (new)")
  shoulder = 0.26;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Aces (new)")
  blackClip = 0;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Aces (new)")
  whiteClip = 0.04;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Aces (new)")
  blueCorrection = 0;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Aces (new)")
  slope = 0.88;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Aces (new)")
  scale = 1;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  @meta.ui.group("Aces (new)")
  useSweeteners = true;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  shoulderStrength = 0.125;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  linearStrength = 0.25;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  linearAngle = 0.1;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  toeStrength = 0.15;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  toeNumerator = 0.021;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  toeDenominator = 0.3;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  whiteScale = 2.5;

  static Method = TonemappingEffectMethod;

  static Uncharted2 = 0;

  static Aces = 1;

  static AgX = 2;

}
