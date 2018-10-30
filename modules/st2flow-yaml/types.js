// @flow

type Kind = 0 | 1 | 2 | 3 | 4;

type JPath = Array<string | number>;

type BaseToken = {
	startPosition: number,
  endPosition: number,
  kind: Kind,
  jpath: JPath,
};

type TokenRawValue = BaseToken & {
	// kind = 0
	value: string,
  rawValue: string,
  doubleQuoted: boolean,
  plainScalar: boolean,
  prefix: Array<TokenRawValue>,

  singleQuoted?: boolean,
  valueObject?: string | number,
  anchorId?: string,
  isTag?: boolean,
};

type TokenKeyValue = BaseToken & {
	// kind = 1
	key: TokenRawValue | TokenCollection,
	value: AnyToken,
};

type TokenMapping = BaseToken & {
	// kind = 2
  mappings: Array<TokenKeyValue>,
};

type TokenCollection = BaseToken & {
	// kind = 3
  items: Array<TokenRawValue | TokenMapping | TokenCollection | TokenReference>,
};

type TokenReference = BaseToken & {
	// kind = 4
  referencesAnchor: string,
  value: BaseToken,
};

type AnyToken = TokenRawValue | TokenKeyValue | TokenMapping | TokenCollection | TokenReference;

type Refinement = {
  tree: TokenMapping,
  head: string,
  tail: string,
};

/**
 * This information is exposed during "objectification" and provides
 * metatdata about the original YAML tokens.
 */
type TokenMeta = {
  jpath: Array<string>, // provides the jpath to the token
  comments: string, // provides any comments associated with the token

  keys?: Array<string>, // for mappings (objects), provides the keys in YAML source order
  inlineInput?: boolean, // whether or not "input" statements are declared inline
};

export type {
  JPath,
  TokenRawValue,
  TokenKeyValue,
  TokenMapping,
  TokenCollection,
  TokenReference,
  AnyToken,
  Refinement,
  TokenMeta,
};
