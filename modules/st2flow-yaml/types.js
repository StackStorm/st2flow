// @flow

type JPath = Array<string | number>;

type BaseToken = {
	startPosition: number,
  endPosition: number,
  jpath: JPath,
};

type TokenRawValue = BaseToken & {
	kind: 0,
	value: string,
  rawValue: string,
  doubleQuoted: boolean,
  plainScalar: boolean,
  prefix: Array<TokenRawValue>,

  singleQuoted?: boolean,
  valueObject?: any,
  anchorId?: string,
  isTag?: boolean,
};

type TokenKeyValue = BaseToken & {
	kind: 1,
	key: TokenRawValue | TokenCollection,
	value: ?ValueToken,
};

type TokenMapping = BaseToken & {
	kind: 2,
  mappings: Array<TokenKeyValue>,
  suffix?: Array<TokenRawValue>,
  anchorId?: string,
};

type TokenCollection = BaseToken & {
	kind: 3,
  items: Array<ValueToken>,
  suffix?: Array<TokenRawValue>,
};

type TokenReference = BaseToken & {
	kind: 4,
  referencesAnchor: string,
  value: BaseToken,
  prefix: Array<TokenRawValue>,
  isTag?: boolean,
};

type ParentToken = TokenKeyValue | TokenMapping | TokenCollection;
type ValueToken = TokenRawValue | TokenMapping | TokenCollection | TokenReference;
type AnyToken = TokenRawValue | TokenKeyValue | TokenMapping | TokenCollection | TokenReference;

type Refinement = {
  tree: TokenMapping,
  yaml: string
};

/**
 * This information is exposed during "objectification" and provides
 * metatdata about the original YAML tokens.
 */
type TokenMeta = {
  jpath: JPath, // provides the jpath to the token
  comments: string, // provides any comments associated with the token

  keys?: Array<string>, // for mappings (objects), provides the keys in YAML source order
  inlineInput?: boolean, // whether or not "input" statements are declared as inline string
  withString?: boolean, // whether or not the "with" statements are declared as inline string
};

type JpathKey = string | Array<string | number>;

export type {
  JPath,
  TokenRawValue,
  TokenKeyValue,
  TokenMapping,
  TokenCollection,
  TokenReference,
  ParentToken,
  ValueToken,
  AnyToken,
  Refinement,
  TokenMeta,
  JpathKey,
};
