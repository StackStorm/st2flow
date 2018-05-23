// @flow

export type JSONable = string | number | { [string]: JSONable } | Array<JSONable>;

export type LineMeta = {
	prefix: string,
};

export type LineData = Object;

export type Line = {
	meta: LineMeta,
	data: LineData,
};


export interface Node {
	prefix: string;
	children: NodeList;

	constructor(meta: LineMeta, data: LineData): void;

	toJSON(): JSONable;
  toYAML(): string;
}

export type NodeList = Array<Node>;
