import * as fs from 'fs'
import * as prettier from 'prettier'
import { JsonValue, Option, panic } from 'typescript-core'
import { Config } from '../config'
import { findFileAbove } from '../fileUtils'

export function findPrettierConfig(config: Config): Option<JsonValue> {
  return config.prettierConfig
    .map((path) =>
      fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : panic('Prettier configuration was not found at specified path {magenta}', path)
    )
    .orElse(() => findFileAbove('.prettier.rc', config.sdkOutput))
    .map((txt) => JsonValue.parse(txt).unwrapWith((err) => 'Failed to parse Prettier configuration: ' + err))
}

export function prettify(source: string, config: Option<JsonValue>, parser: 'typescript' | 'json'): string {
  return prettier.format(source, {
    parser,
    ...config.cast<any>().unwrapOr({}),
  })
}
