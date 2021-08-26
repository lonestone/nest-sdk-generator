/**
 * @file Type dependencies builders from the source API
 */

import * as path from 'path'
import { ts, Type } from 'ts-morph'
import { List, match, Ok, RecordDict, Result, unreachable } from 'typescript-core'

/**
 * Regex to match or replace imported types
 */
export const IMPORTED_TYPE_REGEX = /\bimport\(['"]([^'"]+)['"]\)\.([a-zA-Z0-9_]+)\b/g

/**
 * Type with resolved level 1 dependencies (does not look for dependencies' own dependencies!)
 */
export interface ResolvedTypeDeps {
  /** The original raw type, with import("...") expressions */
  readonly rawType: string

  /** The resolved type, without imports */
  readonly resolvedType: string

  /** File from which the type originates */
  readonly relativeFilePath: string

  /**
   * The type dependencies used by the resolved type
   * A collection of scripts' relative paths mapped with the list of types imported from them
   */
  readonly dependencies: RecordDict<List<string>>

  /**
   * Non-native types that are not imported
   * They may be either local types (declared in the same file than the one analyzed) or globally-defined types
   */
  readonly localTypes: List<string>
}

export function resolveTypeDependencies(
  type: Type<ts.Type>,
  relativeFilePath: string,
  absoluteSrcPath: string
): Result<ResolvedTypeDeps, string> {
  const ret: Pick<ResolvedTypeDeps, 'rawType' | 'relativeFilePath'> = { rawType: type.getText(), relativeFilePath }

  if (path.isAbsolute(ret.relativeFilePath)) {
    unreachable(
      'Internal error: got absolute file path in type dependencies resolver, when expecting a relative one (got {magentaBright})\n{}',
      relativeFilePath,
      new Error('Failed')
    )
  }

  let dependencies: ResolvedTypeDeps['dependencies'] = new RecordDict()
  let localTypes: ResolvedTypeDeps['localTypes'] = new List()

  const resolvedType: ResolvedTypeDeps['resolvedType'] = ret.rawType.replace(IMPORTED_TYPE_REGEX, (_, matchedFilePath, type) => {
    const filePath = path.isAbsolute(matchedFilePath) ? path.relative(absoluteSrcPath, matchedFilePath) : matchedFilePath

    match(dependencies.get(filePath), {
      None: () => dependencies.set(filePath, new List([type])),
      Some: (deps) => deps.pushNew(type),
    })

    return type
  })

  if (resolvedType.includes('import(')) {
    unreachable('Internal error: resolved still contains an {magenta} statement: {green}', 'import(...)', resolvedType)
  }

  for (const depFile of dependencies.keys()) {
    if (path.isAbsolute(depFile)) {
      unreachable(
        'Internal error: resolved absolute file path in type dependencies, when should have resolved a relative one\nIn type: {yellow}\nGot: {magentaBright}\n{}',
        type.getText(),
        depFile,
        new Error('Failed')
      )
    }
  }

  return Ok({
    ...ret,
    resolvedType,
    dependencies,
    localTypes,
  })
}

export function getImportResolvedType(type: Type<ts.Type>): string {
  return type.getText().replace(IMPORTED_TYPE_REGEX, (_, __, typename) => typename)
}
