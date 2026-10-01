import assert from "node:assert/strict";
import test from "node:test";
import { parseExpression } from "@babel/parser";
import { isCarbonDecorator } from "../scripts/trinity/carbon-decorators.js";

test("Trinity parity recognizes both Carbon method decorator namespaces", () =>
{
  for (const source of [ "carbon.method", "carbon.method()", "meta.carbon.method", "meta.carbon.method()" ])
  {
    assert.equal(isCarbonDecorator(parseExpression(source), "method"), true, source);
  }
});

test("Trinity parity recognizes composed bases through both Carbon namespaces", () =>
{
  for (const source of [ "carbon.inherit(Owner)", "meta.carbon.inherit(Owner, OtherOwner)" ])
  {
    const expression = parseExpression(source);
    assert.equal(isCarbonDecorator(expression, "inherit"), true, source);
    assert.equal(isCarbonDecorator(expression, "method"), false, source);
    assert.equal(expression.arguments[0].name, "Owner");
  }
});

test("Trinity parity rejects unrelated and computed decorator expressions", () =>
{
  for (const source of [
    "method", "other.method", "other.carbon.method", "meta.method", "meta.other.method",
    "meta.carbon.other", "carbon['method']", "meta['carbon'].method", "meta.carbon['method']",
    "factory().method", "meta.carbon.method()()"
  ])
  {
    assert.equal(isCarbonDecorator(parseExpression(source), "method"), false, source);
  }
});
