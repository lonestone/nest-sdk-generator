/**
 * @file Type dependencies builders from the source API
 */

import * as path from 'path'
import { ts, Type } from 'ts-morph'
import { unreachable } from '../logging'

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
  readonly dependencies: Map<string, string[]>

  /**
   * Non-native types that are not imported
   * They may be either local types (declared in the same file than the one analyzed) or globally-defined types
   */
  readonly localTypes: string[]
}

/**
 * Resolve the dependencies of a TS-Morph analyzed type
 * @param type
 * @param relativeFilePath
 * @param absoluteSrcPath
 * @returns
 */
export function resolveTypeDependencies(type: Type<ts.Type>, relativeFilePath: string, absoluteSrcPath: string): ResolvedTypeDeps {
  /** Raw type's text (e.g. `Array<import("somefile.ts").SomeType>`) */
  const rawType = type.getText()

  if (path.isAbsolute(relativeFilePath)) {
    unreachable(
      'Internal error: got absolute file path in type dependencies resolver, when expecting a relative one (got {magentaBright})',
      relativeFilePath
    )
  }

  let dependencies: ResolvedTypeDeps['dependencies'] = new Map()
  let localTypes: ResolvedTypeDeps['localTypes'] = []

  /** Resolved type (without import statements) */
  const resolvedType: ResolvedTypeDeps['resolvedType'] = rawType.replace(IMPORTED_TYPE_REGEX, (_, matchedFilePath, type) => {
    const filePath = path.isAbsolute(matchedFilePath) ? path.relative(absoluteSrcPath, matchedFilePath) : matchedFilePath

    const deps = dependencies.get(filePath)

    if (deps) {
      if (!deps.includes(type)) {
        deps.push(type)
      }
    } else {
      dependencies.set(filePath, [type])
    }

    return type
  })

  if (resolvedType.includes('import(')) {
    unreachable('Internal error: resolved still contains an {magenta} statement: {green}', 'import(...)', resolvedType)
  }

  for (const depFile of dependencies.keys()) {
    if (path.isAbsolute(depFile)) {
      unreachable(
        'Internal error: resolved absolute file path in type dependencies, when should have resolved a relative one\nIn type: {yellow}\nGot: {magentaBright}',
        type.getText(),
        depFile
      )
    }
  }

  return {
    rawType,
    relativeFilePath,
    resolvedType,
    dependencies,
    localTypes,
  }
}

/**
 * Extract an import type's name from a TS-Morph type
 * @example "import('dir/file').TypeName" => "TypeName"
 * @param type
 * @returns
 */
export function getImportResolvedType(type: Type<ts.Type>): string {
  return type.getText().replace(IMPORTED_TYPE_REGEX, (_, __, typename) => typename)
}

/**
 * Convert paths for external files
 * @param importedFilePath
 */
export function normalizeExternalFilePath(importedFilePath: string): string {
  let level = 0

  while (importedFilePath.startsWith('../')) {
    level++
    importedFilePath = importedFilePath.substr(3)
  }

  return `_external${level}/${importedFilePath}`
}
