import * as fc from '../../../src/index'
import {Stack} from '../../../src/benchmarks/stack/original/main'
import {it} from 'mocha'
import {expect} from 'chai'

const PBTS = fc.PBT_R_S1()

describe('Benchmark tests', () => {
  it('should push one element to the stack and have size one', () => {
    expect(fc.scenario()
      .config(PBTS)
      .forall('e', fc.integer())
      .given('stack', () => new Stack<number>())
      .when(({e, stack}) => stack.push(e))
      .then(({stack}) => stack.size() === 1)
      .check()).to.have.property('satisfiable', true)
  })

  it('should push several elements to the stack and have size equal to the number of pushed elements', () => {
    expect(fc.scenario()
      .config(PBTS)
      .forall('es', fc.array(fc.integer()))
      .given('stack', () => new Stack<number>())
      .when(({es, stack}) => stack.push(...es))
      .then(({es, stack}) => stack.size() === es.length)
      .check()).to.have.property('satisfiable', true)
  })

  it('should find an example where pushing a collection of elements keeps the stack empty', () => {
    expect(fc.scenario()
      .config(PBTS)
      .given('stack', () => new Stack<number>())
      .forall('es', fc.array(fc.integer()))
      .when(({es, stack}) => stack.push(...es))
      .then(({es, stack}) => stack.size() === es.length)
      .and(({stack}) => stack.size() > 0)
      .check()).to.deep.include({satisfiable: false, example: {es: []}})
  })

  it('should find if two different stacks behave the same', () => {
    expect(fc.scenario()
      .config(PBTS)
      .forall('es', fc.array(fc.integer()))
      .given('s1', () => new Stack<number>())
      .and('s2', () => new Stack<number>())
      .when(({es, s1}) => s1.push(...es))
      .and(({es, s2}) => s2.push(...es))
      .then(({s1, s2}) => s1.size() === s2.size())
      .and(({es, s1}) => s1.size() === es.length)
      .and(({es, s2}) => s2.size() === es.length)
      .check()).to.have.property('satisfiable', true)
  })

  it('should check if after being pushed some elements, and then popped just one,' +
    'it has size equal to the number of elements minus one', () => {

    expect(fc.scenario()
      .config(PBTS)
      .given('stack', () => new Stack<number>())
      .forall('es', fc.array(fc.integer(), 1))
      .when(({es, stack}) => stack.push(...es))
      .then(({es, stack}) => stack.size() === es.length)
      .when(({stack}) => stack.pop())
      .then(({es, stack}) => stack.size() === es.length - 1)
      .check()).to.have.property('satisfiable', true)
  })
})