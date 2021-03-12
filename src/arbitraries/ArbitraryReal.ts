import {ArbitraryInteger} from './internal'

export class ArbitraryReal extends ArbitraryInteger {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super(min, max)
  }

  pick(generator: () => number = Math.random)  {
    const value = generator() * (this.max - this.min) + this.min
    return {value, original: value}
  }
}
