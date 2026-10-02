import assert from "node:assert/strict";
import test from "node:test";
import { parseExpression } from "@babel/parser";
import { isCarbonDecorator, findCarbonMethod } from "../scripts/trinity/carbon-decorators.js";

test("Trinity parity recognizes both Carbon method decorator namespaces", () =>
{
  for (const source of [ "carbon.method", "carbon.method()", "meta.carbon.method", "meta.carbon.method()", "meta.blue.method", "meta.blue.method()" ])
  {
    assert.equal(isCarbonDecorator(parseExpression(source), "method"), true, source);
  }
});

test("Trinity parity recognizes composed bases through both Carbon namespaces", () =>
{
  for (const source of [ "carbon.inherit(Owner)", "meta.carbon.inherit(Owner, OtherOwner)", "meta.blue.inherit(Owner, OtherOwner)" ])
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
    "factory().method", "meta.carbon.method()()", "meta.blue.method()()",
    "meta.ui.method", "meta.type.method", "meta['blue'].method", "meta.blue['method']", "other.blue.method"
  ])
  {
    assert.equal(isCarbonDecorator(parseExpression(source), "method"), false, source);
  }
});

test("Trinity parity resolves native statics through the prescribed JavaScript casing", () =>
{
  for (const name of ["Variable", "Function", "StringFunction"])
  {
    const declaration = { isStatic: true, hasCarbon: false };
    const methods = new Map([[name[0].toLowerCase() + name.slice(1), declaration]]);
    assert.equal(findCarbonMethod(methods, name, true), declaration);
    assert.equal(findCarbonMethod(methods, name, false), undefined);
  }
});

test("Trinity parity casing cannot hide a missing static behind an instance method", () =>
{
  const methods = new Map([["variable", { isStatic: false }]]);
  assert.equal(findCarbonMethod(methods, "Variable", true), undefined);
  assert.equal(findCarbonMethod(methods, "Function", true), undefined);
});

test("Trinity parity keeps exact method lookup ahead of a casing alternative", () =>
{
  const exact = { isStatic: true, hasCarbon: true };
  const alternate = { isStatic: true, hasCarbon: false };
  assert.equal(findCarbonMethod(new Map([["Variable", exact], ["variable", alternate]]), "Variable", true), exact);
});

test("Blue exposure matching preserves renamed, contextual and interface declarations", () =>
{
  for (const name of ["renamed", "contextual", "mapInterface"])
  {
    assert.equal(isCarbonDecorator(parseExpression("meta.blue." + name + "(Value)"), name), true);
    assert.equal(isCarbonDecorator(parseExpression("meta.type." + name + "(Value)"), name), false);
  }
});
