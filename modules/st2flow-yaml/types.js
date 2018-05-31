export type Value = string | number | boolean | null;

export type TokenType = 'key' | 'value' | 'token-separator' | 'token-sequence' | 'eof';

export type Token = {
  start: number,
  end: number,
  type: TokenType,
  value?: Value,
  prefix: string,
};
