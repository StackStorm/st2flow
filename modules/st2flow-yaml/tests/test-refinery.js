import { expect } from 'chai';
import factory from '../token-factory';
import crawler from '../crawler';
import TokenSet from '../token-set';
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

const complexYaml = `name: doSomething
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

const jsonInYaml = `---
foo: {
  bar: baz
}`;

const expectedJsonInYaml = `---
foo: {
  bar: baz,
  bing: {
    buzz: bam
  }
}`;

describe('Token Refinery', () => {
  it('refines data into the correct yaml format', () => {
    const mappingToken = factory.createToken(complexObj);
    const refinery = new TokenRefinery(mappingToken, '');
    const { yaml } = refinery.refineTree(mappingToken);
    expect(yaml).to.equal(complexYaml);
  });

  it.only('refines JSON data embedded in yaml', () => {
    const set = new TokenSet(jsonInYaml);
    crawler.assignMappingItem(set, 'foo.bing', { buzz: 'bam' });
    // console.log(JSON.stringify(set.tree, null, '  '));
    const refinery = new TokenRefinery(set.tree, '');
    const { yaml } = refinery.refineTree();
    expect(yaml).to.equal(expectedJsonInYaml);
  });
});
