'use strict';

let _ = require('lodash')
  , expect = require('chai').expect
  , fs = require('fs')
  , Range = require('../js/lib/range')
  ;

let Intermediate = require('../js/lib/intermediate');

describe('Intermediate', () => {

  let intermediate;

  beforeEach(() => {
    intermediate = new Intermediate();
  });

  describe('#task()', () => {

    it('should create a new task when there no task with this name', () => {
      let result = intermediate.task('some');

      expect(result).to.be.an('object');
      expect(result.name).to.be.equal('some');
      expect(intermediate.tasks).to.include(result);
    });

    it('should return the task with the same name if there is one already', () => {
      let existing = intermediate.task('some');

      let result = intermediate.task('some');

      expect(result).to.be.an('object');
      expect(result).to.be.equal(existing);
    });

    it('should extend the existing task with the object provided', () => {
      let existing = intermediate.task('some');
      existing.a = 1;
      existing.b = 'will be rewritten';

      let result = intermediate.task('some', {b: 2, c: 3});

      expect(result).to.be.an('object');
      expect(result).to.be.deep.equal({name: 'some', a: 1, b: 2, c: 3});
    });

  });

  describe('#search()', () => {

    beforeEach(() => {
      let code = fs.readFileSync(`${ __dirname }/fixtures/chain.yaml`).toString();
      intermediate.parse(code);
    });

    it('should return an array of sectors touched by the range', () => {
      let coordinates = new Range(16, 6, 18, 18);
      // `······[··on-failure: setup_uninstall_pack_to_install_1
      // `····-
      // `········name: setu]p_uninstall_pack_to_install_1`

      let result = intermediate.search(coordinates);

      expect(result).to.be.an('array');
      expect(result).to.have.length(3);

      expect(result[0].type).to.be.equal('task');
      expect(result[0].task)
        .to.be.equal(intermediate.task('setup_check_pack_to_install_1_installed'));

      expect(result[1].type).to.be.equal('task');
      expect(result[1].task)
        .to.be.equal(intermediate.task('setup_uninstall_pack_to_install_1'));

      expect(result[2].type).to.be.equal('name');
    });

    it('should filter only specific types of sectors when requested', () => {
      let coordinates = new Range(16, 6, 18, 18);
      // `······[··on-failure: setup_uninstall_pack_to_install_1
      // `····-
      // `········name: setu]p_uninstall_pack_to_install_1`

      let result = intermediate.search(coordinates, 'task');

      expect(result).to.be.an('array');
      expect(result).to.have.length(2);

      expect(_.every(result, 'type', 'task')).to.be.true;
    });

    it('should return undefined when cursor is outside all the ranges', () => {
      let coordinates = new Range(1, 1, 1, 3);
      // `·[··]·····base_repo_url: "https://github.com/StackStorm"`

      let result = intermediate.search(coordinates);

      expect(result).to.be.an('array');
      expect(result).to.have.length(0);
    });

    it('should support zero character ranges (cursor)', () => {
      let coordinates = new Range(20, 5, 20, 5);
      // `·····|···ref: core.local`

      let result = intermediate.search(coordinates);

      expect(result).to.be.an('array');
      expect(result).to.have.length(1);
      expect(result[0].task).to.be.equal(intermediate.task('setup_uninstall_pack_to_install_1'));
    });

  });

});
