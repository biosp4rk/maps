import {
  TypeTokenizer, TypeParser, SpecifierType, PointerType, ArrayType, FunctionType, TypeSpecKind
} from '../asset-type.js';

import { assert } from '@open-wc/testing';

const tokenizer = new TypeTokenizer();
const parser = new TypeParser();
const parse = (s: string) => parser.parse(tokenizer.tokenize(s));

suite('asset-type', () => {
  test('parses a built-in specifier', () => {
    const t = parse('int');
    assert.instanceOf(t, SpecifierType);
    assert.equal(t.specKind(), TypeSpecKind.BuiltIn);
    assert.equal(t.specName(), 'int');
  });

  test('parses a multi-word built-in', () => {
    const t = parse('unsigned long') as SpecifierType;
    assert.deepEqual(t.names, ['unsigned', 'long']);
    assert.equal(t.specKind(), TypeSpecKind.BuiltIn);
  });

  test('parses a struct tag', () => {
    const t = parse('struct Foo');
    assert.equal(t.specKind(), TypeSpecKind.Struct);
    assert.equal(t.specName(), 'Foo');
  });

  test('parses a pointer', () => {
    const t = parse('int *');
    assert.instanceOf(t, PointerType);
    assert.equal(t.specName(), 'int');
  });

  test('parses an array with a hex size', () => {
    const t = parse('int [0x10]');
    assert.instanceOf(t, ArrayType);
    assert.equal((t as ArrayType).size, 16);
  });

  test('parses a function pointer', () => {
    const t = parse('void (*)(int, int)');
    assert.instanceOf(t, PointerType);
    assert.instanceOf((t as PointerType).innerType, FunctionType);
  });

  test('declStr round-trips an array', () => {
    assert.equal(parse('int [0x10]').declStr(''), 'int [0x10]');
  });

  test('tokenizer rejects an invalid character', () => {
    assert.throws(() => tokenizer.tokenize('int @'));
  });
});
