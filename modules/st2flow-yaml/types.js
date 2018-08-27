export type Value = string | number | boolean | null;

export type TokenType = 'key' | 'value' | 'token-separator' | 'token-sequence' | 'empty-line' | 'eof';

export type Token = {
  start: number,
  end: number,
  level: number,
  type: TokenType,
  value: Value,
  valueMetadata?: string,
  prefix: string,
  suffix: string,
  newline: bool,
};

export type TokenList = Array<Token>;
