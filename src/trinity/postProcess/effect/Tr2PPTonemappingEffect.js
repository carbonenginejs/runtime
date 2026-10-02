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
  toe = 0.55;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  shoulder = 0.26;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  blackClip = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  whiteClip = 0.04;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  blueCorrection = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  slope = 0.88;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  scale = 1;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  useSweeteners = true;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  shoulderStrength = 0.125;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  linearStrength = 0.25;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  linearAngle = 0.1;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  toeStrength = 0.15;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  toeNumerator = 0.021;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  toeDenominator = 0.3;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  whiteScale = 2.5;

  static Method = Object.freeze({ Uncharted2: 0, Aces: 1, AgX: 2 });

  static Uncharted2 = 0;

  static Aces = 1;

  static AgX = 2;

}
