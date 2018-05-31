import { expect } from 'chai';

import Writer from '../writer';

describe('st2flow-yaml: Writer', () => {

  describe('produces simple.yaml', () => {
    const writer = new Writer();

    [
      [{ type: 'key', value: 'bools', prefix: '' }, 'bools' ],
      [{ type: 'token-separator', value: ':', prefix: '' }, ':' ],
      [{ type: 'key', value: 'trues', prefix: '\n  ' }, 'trues' ],
      [{ type: 'token-separator', value: ':', prefix: '' }, ':' ],
      [{ type: 'token-sequence', value: '-', prefix: '\n    ' }, '-' ],
      [{ type: 'value', value: true, prefix: ' ', valueMetadata: 'lower' }, 'true' ],
      [{ type: 'token-sequence', value: '-', prefix: '\n    ' }, '-' ],
      [{ type: 'value', value: true, prefix: ' ', valueMetadata: 'title' }, 'True' ],
      [{ type: 'token-sequence', value: '-', prefix: '\n    ' }, '-' ],
      [{ type: 'value', value: true, prefix: ' ', valueMetadata: 'upper' }, 'TRUE' ],
      [{ type: 'eof', value: '', prefix: '\n' }, '' ],
    ].map(([ token, yaml ]) => {
      if (token.value) {
        it(`finds ${token.type} of ${token.value}`, () => {
          expect(writer.write(token)).to.deep.equal(yaml);
        });
      }
      else {
        it(`finds ${token.type}`, () => {
          expect(writer.write(token)).to.deep.equal(yaml);
        });
      }
    });

  });

});
