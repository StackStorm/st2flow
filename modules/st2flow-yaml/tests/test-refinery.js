import { expect } from 'chai';
import factory from '../token-factory';
import TokenRefinery from '../token-refinery';

const complexObj = {
  name: 'doSomething',
  action: 'some.action',
  anobject: {
    foo: 'bar',
  },
  nextitem: [
    {
      do: 'llama',
      when: 'depress',
    }, {
      dodo: [
        'taboot',
        [ 'tabooot', 'taboooot' ],
      ],
      when: 'depress depress',
    },
  ],
  arr: [
    [
      [
        {
          'asdf': [ 'boo' ],
          'qwer': 'reqw',
          'uiop': [ 'hjkl' ],
        },
        'sloth',
      ],
      'wombat',
    ],
  ],
  arr2: [
    [
      [
        'boohoo',
      ],
      'booboo',
    ],
  ],
};

const expected = `name: doSomething
action: some.action
anobject:
  foo: bar
nextitem:
  - do: llama
    when: depress
  - dodo:
      - taboot
      -
        - tabooot
        - taboooot
    when: depress depress
arr:
  -
    -
      - asdf:
          - boo
        qwer: reqw
        uiop:
          - hjkl
      - sloth
    - wombat
arr2:
  -
    -
      - boohoo
    - booboo`;

describe('Token Refinery', () => {
  it('refines data into the expected format', () => {
    const mappingToken = factory.createToken(complexObj);
    const refinery = new TokenRefinery(mappingToken, '');
    const { yaml } = refinery.refineTree(mappingToken);
    expect(yaml).to.equal(expected);
  });
});
