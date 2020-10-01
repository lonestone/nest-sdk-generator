import * as fs from 'fs'
import * as prettier from 'prettier'
import { JsonValue, None, Option, panic } from 'typescript-core'

import { findFileAbove } from '../fileUtils'
import { cmdArgs } from './cmdargs'

export function findPrettierConfig(): Option<JsonValue> {
  return !cmdArgs.prettify
    ? None()
    : Option.maybe(cmdArgs.prettierConfig)
        .map((path) =>
          fs.existsSync(path)
            ? fs.readFileSync(path, 'utf8')
            : panic('Prettier configuration was not found at specified path {magenta}', path)
        )
        .orElse(() => findFileAbove('.prettier.rc', cmdArgs.output))
        .map((txt) => JsonValue.parse(txt).unwrapWith((err) => 'Failed to parse Prettier configuration: ' + err))
}

export function prettify(source: string, config: Option<JsonValue>): string {
  return !cmdArgs.prettify
    ? source
    : prettier.format(source, {
        parser: 'typescript',
        ...config.cast<any>().unwrapOr({}),
      })
}
