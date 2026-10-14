// Source: trinity/trinity/PostProcess/Effects/Tr2PPTonemappingEffect.h
// Source: trinity/trinity/PostProcess/Effects/Tr2PPTonemappingEffect.cpp
import { meta } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";


/**
 * Tonemapping curve selection - Uncharted2, ACES or AgX - together with the toe,
 * shoulder and clipping parameters that shape it.
 */
@meta.define({ className: "Tr2PPTonemappingEffect", family: "postProcess" })
export class Tr2PPTonemappingEffect extends Tr2PPEffect
{

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("Method")
  method = Tr2PPTonemappingEffect.Aces;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Aces (new)")
  toe = 0.55;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Aces (new)")
  shoulder = 0.26;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Aces (new)")
  blackClip = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Aces (new)")
  whiteClip = 0.04;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Aces (new)")
  blueCorrection = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Aces (new)")
  slope = 0.88;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Aces (new)")
  scale = 1;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  @meta.ui.group("Aces (new)")
  useSweeteners = true;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Uncharted 2 (old)")
  shoulderStrength = 0.125;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Uncharted 2 (old)")
  linearStrength = 0.25;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Uncharted 2 (old)")
  linearAngle = 0.1;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Uncharted 2 (old)")
  toeStrength = 0.15;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Uncharted 2 (old)")
  toeNumerator = 0.021;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Uncharted 2 (old)")
  toeDenominator = 0.3;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  @meta.ui.group("Uncharted 2 (old)")
  whiteScale = 2.5;

  static Method = Object.freeze({ Uncharted2: 0, Aces: 1, AgX: 2 });

  static Uncharted2 = 0;

  static Aces = 1;

  static AgX = 2;

}
