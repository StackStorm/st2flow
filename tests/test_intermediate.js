'use strict';

let expect = require('chai').expect
  , fs = require('fs')
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

    it('should return an array of tasks touched by the cursor', () => {
      let coordinates = [20, 5]; // `·····|···ref: core.local`

      let result = intermediate.search(...coordinates);

      expect(result).to.be.an('object');
      expect(result).to.be.equal(intermediate.task('setup_uninstall_pack_to_install_1'));
    });

    it('should return undefined when cursor is outside all the ranges', () => {
      let coordinates = [1, 1]; // `·|·······base_repo_url: "https://github.com/StackStorm"`

      let result = intermediate.search(...coordinates);

      expect(result).to.be.undefined;
    });

  });

});
