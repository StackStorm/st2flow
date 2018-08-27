import { expect } from 'chai';
import fs from 'fs';
import path from 'path';

import Reader from '../reader';

describe('st2flow-yaml: Reader', () => {

  describe('parses simple.yaml', () => {
    const yaml = fs.readFileSync(path.join(__dirname, 'data', 'simple.yaml'), 'utf-8');
    const reader = new Reader(yaml);

    [
      {"start":0,"end":5,"level":1,"type":"key","value":"bools","prefix":"","suffix":"","newline":true,"line":0,"col":0},
      {"start":5,"end":6,"level":2,"type":"token-separator","value":":","prefix":"","suffix":"","newline":false,"line":0,"col":5},
      {"start":6,"end":13,"level":3,"type":"key","value":"trues","prefix":"  ","suffix":"","newline":false,"line":1,"col":0},
      {"start":13,"end":14,"level":4,"type":"token-separator","value":":","prefix":"","suffix":"","newline":false,"line":1,"col":7},
      {"start":14,"end":19,"level":5,"type":"token-sequence","value":"-","prefix":"    ","suffix":"","newline":false,"line":2,"col":0},
      {"start":19,"end":24,"level":6,"type":"value","value":true,"prefix":" ","suffix":"","newline":false,"line":2,"col":5,"valueMetadata":"lower"},
      {"start":24,"end":29,"level":7,"type":"token-sequence","value":"-","prefix":"    ","suffix":"","newline":false,"line":3,"col":0},
      {"start":29,"end":34,"level":8,"type":"value","value":true,"prefix":" ","suffix":"","newline":false,"line":3,"col":5,"valueMetadata":"title"},
      {"start":34,"end":39,"level":9,"type":"token-sequence","value":"-","prefix":"    ","suffix":"","newline":false,"line":4,"col":0},
      {"start":39,"end":44,"level":10,"type":"value","value":true,"prefix":" ","suffix":"","newline":false,"line":4,"col":5,"valueMetadata":"upper"},
      {"start":44,"end":44,"level":10,"type":"empty-line","value":"","prefix":"","suffix":"","newline":true,"line":5,"col":0},
      {"start":44,"end":51,"level":11,"type":"key","value":"strings","prefix":"","suffix":"","newline":false,"line":6,"col":0},
      {"start":51,"end":52,"level":12,"type":"token-separator","value":":","prefix":"","suffix":"","newline":false,"line":6,"col":7},
      {"start":52,"end":60,"level":13,"type":"key","value":"string","prefix":"  ","suffix":"","newline":false,"line":7,"col":0},
      {"start":60,"end":61,"level":14,"type":"token-separator","value":":","prefix":"","suffix":"","newline":false,"line":7,"col":8},
      {"start":61,"end":80,"level":15,"type":"value","value":"string with spaces","prefix":" ","suffix":"","newline":false,"line":7,"col":9,"valueMetadata":""},
      {"start":80,"end":93,"level":16,"type":"key","value":"longstring1","prefix":"  ","suffix":"","newline":false,"line":8,"col":0},
      {"start":93,"end":94,"level":17,"type":"token-separator","value":":","prefix":"","suffix":"","newline":false,"line":8,"col":13}
    ].map((token) => {
      it(`finds ${token.type}${token.value ? ' of ' + JSON.stringify(token.value) : ''} at ${token.start}-${token.end}`, () => {
        const next = { ...reader.next() };
        for (const key in next) {
          if (typeof token[key] === 'undefined') {
            delete next[key];
          }
        }
        expect(next).to.deep.equal(token);
      });
    });
  });

});
