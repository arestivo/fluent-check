import {FluentPick} from './types'
import {MappedArbitrary, NoArbitrary} from './internal'
import * as fc from './index'

export class ArbitraryBoolean extends MappedArbitrary<number, boolean> {
  constructor() { super(fc.integer(0, 1), x => x === 0) }
  shrink(_: FluentPick<boolean>) { return NoArbitrary }
  canGenerate(pick: FluentPick<boolean>) { return pick.value !== undefined }
  mutate(pick: FluentPick<boolean>, _: () => number, __: number): FluentPick<boolean>[] {
    return [pick.value === true ? {value: false, original: 1} : {value: true, original: 0}]
  }
  toString(depth = 0) { return ' '.repeat(2 * depth) + 'Boolean Arbitrary' }
}
