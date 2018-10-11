type Kind = 0 | 1 | 2 | 3 | 4;

type BaseToken = {
	startPosition: number,
  endPosition: number,
  kind: Kind,
  jpath: Array<string | number>,
};

export type TokenRawValue = BaseToken & {
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

export type TokenKeyValue = BaseToken & {
	// kind = 1
	key: TokenRawValue | TokenCollection,
	value: TokenRawValue | TokenCollection,
};

export type TokenMapping = BaseToken & {
	// kind = 2
  mappings: Array<TokenKeyValue>,
};

export type TokenCollection = BaseToken & {
	// kind = 3
  items: Array,
};

export type TokenReference = BaseToken & {
	// kind = 4
  referencesAnchor: string,
  value: BaseToken,
};

export type AnyToken = TokenRawValue | TokenKeyValue | TokenMapping | TokenCollection | TokenReference;

export type Refinement = {
  tree: TokenMapping,
  head: string,
  tail: string,
};

/**
 * This information is exposed during "objectification" and provides
 * metatdata about the original YAML tokens.
 */
export type TokenMeta = {
  jpath: Array<string>, // provides the jpath to the token
  comments: string, // provides any comments associated with the token

  keys?: Array<string>, // for mappings (objects), provides the keys in YAML source order
};
