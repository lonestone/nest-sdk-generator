/**
 * @file Utilities for analyzing the source API's decorators
 */

import { Decorator, Node } from 'ts-morph'
import { format } from '../logging'

/**
 * Expect a decorator to have a single, string literal argument
 * @param dec The decorator
 * @returns Nothing if the decorator has no argument, a { lit: string } if the decorator has a string literal, an Error else
 */
export function expectSingleStrLitDecorator(dec: Decorator): string | null | Error {
  const args = dec.getArguments()

  if (args.length > 1) {
    return new Error(`Multiple (${args.length}) arguments were provided to the decorator`)
  } else if (args.length === 0) {
    return null
  }

  const [arg] = args

  if (!Node.isStringLiteral(arg)) {
    return new Error(format('The argument provided to the decorator is not a string literal:\n>>> {cyan}', arg.getText()))
  }

  return arg.getLiteralText()
}
