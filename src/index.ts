import {FluentCheck} from './FluentCheck'
import {FluentStrategyTypeFactory} from './strategies/FluentStrategyFactory'
export {expect} from './FluentReporter'
export {FluentResult} from './FluentCheck'
export const scenario = () => new FluentCheck()
export const strategy = () => new FluentStrategyTypeFactory()
export {
  integer,
  real,
  nat,
  char,
  hex,
  base64,
  ascii,
  unicode,
  string,
  array,
  union,
  boolean,
  empty,
  constant,
  set,
  tuple,
  oneof
} from './arbitraries'
