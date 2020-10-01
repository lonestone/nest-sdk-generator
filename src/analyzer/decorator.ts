import { Decorator, Node } from 'ts-morph'
import { Err, ErrMsg, None, Ok, Option, Result, Some } from 'typescript-core'

/**
 * Expect a decorator to have a single, string literal argument
 * @param dec The decorator
 * @returns Nothing if the decorator has no argument, a { lit: string } if the decorator has a string literal, an Error else
 */
export function expectSingleStrLitDecorator(dec: Decorator): Result<Option<string>, string> {
  const args = dec.getArguments()

  if (args.length > 1) {
    return Err(`Multiple (${args.length}) arguments were provided to the decorator`)
  } else if (args.length === 0) {
    return Ok(None())
  }

  const arg = args[0]

  if (!Node.isStringLiteral(arg)) {
    return ErrMsg('The argument provided to the decorator is not a string literal:\n>>> {cyan}', arg.getText())
  }

  return Ok(Some(arg.getLiteralText()))
}
