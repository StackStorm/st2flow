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
plain: yaml
foo: {
  bar: baz,
  bar2: baz2,
  existing: [ array ]
}
more:
  plain: yaml`;

const expectedJsonInYaml = `---
plain: yaml
foo: {
  bar: baz,
  bar2: baz2,
  existing: [ array ],
  bing: {
    bar3: {
      buzz3: bar3
    },
    buzz: bam,
    boo: [
      boom
    ]
  }
}
more:
  plain: yaml`;

describe('Token Refinery', () => {
  it('refines data into the correct yaml format', () => {
    const mappingToken = factory.createToken(complexObj);
    const refinery = new TokenRefinery(mappingToken, '');
    const { yaml } = refinery.refineTree(mappingToken);
    expect(yaml).to.equal(complexYaml);
  });

  it('refines JSON data embedded in yaml', () => {
    const set = new TokenSet(jsonInYaml);

    // The crawler calls `set.refineTree()` internally
    crawler.assignMappingItem(set, 'foo.bing', {
      bar3: { buzz3: 'bar3' },
      buzz: 'bam',
      boo: [ 'boom' ],
    });

    expect(set.toYAML()).to.equal(expectedJsonInYaml);
  });
});
