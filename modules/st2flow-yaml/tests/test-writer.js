import { expect } from 'chai';

import Reader from '../reader';
import Writer from '../writer';

// TODO: update writer to account for new empty-line tokens
describe.skip('st2flow-yaml: Writer', () => {

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
      it(`finds ${token.type}${token.value ? ' of ' + token.value : ''}`, () => {
        expect(writer.write(token)).to.deep.equal(yaml);
      });
    });

  });

  // it('can regenerate a yaml file', () => {
  //   const yaml = fs.readFileSync(path.join(__dirname, 'data', 'simple.yaml'), 'utf-8');
  //   const reader = new Reader(yaml);
  // })

});
