// @flow

export type JSONable = string | number | { [string]: JSONable } | Array<JSONable>;

export type NodeMeta = {
  indent: string,
};

export interface Node {
  meta: NodeMeta;
  children: NodeList;

  constructor(meta: NodeMeta, data: any): void;

  toJSON(): JSONable;
  toYAML(): string;
}

export type NodeList = Array<Node>;
