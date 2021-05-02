import * as fc from '../src/index'
import * as utils from '../src/strategies/mixins/utils'
import {it} from 'mocha'
import {expect} from 'chai'

describe('Strategy tests', () => {
  describe('Constants extraction tests', () => {
    it('should be able to extract constant that is compromising the addition commutative property', () => {
      expect(fc.scenario()
        .config(fc.strategy()
          .withRandomSampling(100)
          .withBias()
          .withConstantExtraction()
        )
        .forall('a', fc.integer())
        .forall('b', fc.integer())
        .then(({a, b}) => a + b === 100 ? a + b === b : a + b === b + a)
        .check()
      ).to.have.property('satisfiable', false)
    })

    it('should be able to extract string constants from assertion', () => {
      expect(fc.scenario()
        .config(fc.strategy()
          .withRandomSampling(100)
          .withConstantExtraction()
        )
        .exists('a', fc.string())
        .forall('b', fc.string())
        .exists('c', fc.string())
        .then(({a, b, c}) => {
          const res = a.concat(b).concat(c)
          return res.includes('before-') && res.includes('-after')
        })
        .check()
      ).to.deep.include({satisfiable: true})
    })

    it('should be able to build and use strings with length matching the numerics extracted', () => {
      expect(fc.scenario()
        .config(fc.strategy()
          .withRandomSampling(100)
          .withBias()
          .withConstantExtraction()
        )
        .forall('input', fc.string(0, 64))
        .then(({input}) => {
          if (input.length >= 20) return false
          return true
        })
        .check()
      ).to.have.property('satisfiable', false)
    })

    it('should be able to extract a string constant and use it on an array of strings', () => {
      expect(fc.scenario()
        .config(fc.strategy()
          .withRandomSampling(100)
          .withBias()
          .withConstantExtraction()
        )
        .exists('a', fc.array(fc.string(), 2, 5))
        .exists('b', fc.string())
        .then(({a, b}) => b === 'special' && a.includes(b))
        .check()
      ).to.have.property('satisfiable', true)
    })

    it('should be able to extract a numeric constant and use it on an array of numbers', () => {
      expect(fc.scenario()
        .config(fc.strategy()
          .withRandomSampling(100)
          .withBias()
          .withConstantExtraction()
        )
        .exists('a', fc.array(fc.real(), 2, 5))
        .exists('b', fc.integer())
        .then(({a, b}) => b === 10 && a.includes(b))
        .check()
      ).to.have.property('satisfiable', true)
    })
  })

  describe('Combinator tests', () => {
    it('finds that the set of pairwise combinations is a subset of all possible combinations', () => {
      expect(fc.scenario()
        .given('a', fc.array(fc.string()).pick(Math.random)?.value as string[])
        .given('b', fc.array(fc.boolean()).pick(Math.random)?.value as boolean[])
        .given('c', fc.array(fc.integer()).pick(Math.random)?.value as number[])
        .then(({a, b, c}) => {
          const nwise = utils.computeCombinations([a,b,c])
          const pairwise = utils.computeCombinations([a,b,c], 2)
          return pairwise.every(x => nwise.some(y => x.every(z => y.indexOf(z) !== -1)))
        })
        .check()
      ).to.have.property('satisfiable', true)
    })

    it('finds that the set of pairwise combinations contains all possible pairwise combinations', () => {
      expect(fc.scenario()
        .given('a', fc.array(fc.string(), 1).pick(Math.random)?.value as string[])
        .given('b', fc.array(fc.boolean(), 1).pick(Math.random)?.value as boolean[])
        .given('c', fc.array(fc.integer(), 1).pick(Math.random)?.value as number[])
        .then(({a, b, c}) => {
          const pairwise = utils.computeCombinations([a,b,c], 2)
          const allPairs = [... new Set(utils.computeCombinations([a,b])
            .concat(utils.computeCombinations([b,c]))
            .concat(utils.computeCombinations([a,c])))]
          return allPairs.every(x => pairwise.some(y => x.every(z => y.indexOf(z) !== -1)))
        })
        .check()
      ).to.have.property('satisfiable', true)
    })
  })
})
