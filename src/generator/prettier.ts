import * as fs from 'fs'
import * as prettier from 'prettier'
import { JsonValue, Option, panic } from 'typescript-core'

import { findFileAbove } from '../fileUtils'
import { CmdArgs } from './cmdargs'

export function findPrettierConfig(cmdArgs: CmdArgs): Option<JsonValue> {
  return Option.maybe(cmdArgs.prettierConfig)
    .map((path) =>
      fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : panic('Prettier configuration was not found at specified path {magenta}', path)
    )
    .orElse(() => findFileAbove('.prettier.rc', cmdArgs.output))
    .map((txt) => JsonValue.parse(txt).unwrapWith((err) => 'Failed to parse Prettier configuration: ' + err))
}

export function prettify(source: string, config: Option<JsonValue>): string {
  return prettier.format(source, {
    parser: 'typescript',
    ...config.cast<any>().unwrapOr({}),
  })
}
