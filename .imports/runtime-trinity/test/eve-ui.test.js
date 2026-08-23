import test from "node:test";
import { EveSprite2dBracket } from "../npm/dist/index.js";
import { vec2 } from "@carbonenginejs/runtime-utils/vec2";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";


test("EveSprite2dBracket ports Carbon's CPU-side UI contract", () =>
{
  const bracket = new EveSprite2dBracket();
  const translation = bracket.translation;
  const out = vec2.create();

  bracket.SetTranslation([4, 5]);
  if (bracket.translation !== translation || bracket.GetTranslation(out) !== out)
  {
    throw new Error("translation storage identity or out-parameter contract changed");
  }
  if (out[0] !== 4 || out[1] !== 5)
  {
    throw new Error("translation was not copied");
  }
  if (bracket.GetIcon() !== null || bracket.GetColor() !== bracket.color || !bracket.IsDisplay())
  {
    throw new Error("Carbon defaults or accessors differ");
  }
  bracket.SetDisplay(0);
  if (bracket.IsDisplay())
  {
    throw new Error("display state was not updated");
  }
  if (CjsSchema.GetConstructor("EveSprite2dBracket") !== EveSprite2dBracket)
  {
    throw new Error("EveSprite2dBracket was not registered");
  }
  if (CjsSchema.getMethod(EveSprite2dBracket, "SetTranslation")?.impl?.status !== "adapted")
  {
    throw new Error("SetTranslation lacks source-backed implementation metadata");
  }
});
