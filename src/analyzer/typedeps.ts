import * as path from 'path'
import { Err, List, Ok, RecordDict, Result, Some, format, panic, warn } from 'typescript-core'

import { cmdArgs } from './cmdargs'

// Pre-compile the regexp for better performances
const IMPORT_REGEXP = /import\("((?:[^"\\]|\\.)*)"\)\.([A-Za-zÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ_\d]+)(?=[,\.<>\[\]]|$)/g

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
  readonly nonNativeTypes: List<string>
}

// Another 'return' strategy could be to return everything that has been resolved and replace all unresolved types by 'unknown's
// This function only resolves *import statements* found in the provided type
export function resolveTypeDependencies(
  rawType: string,
  relativeFilePath: string,
  absoluteSrcPath: string,
  restrictFileEndName = false
): Result<ResolvedTypeDeps, string[]> {
  const absoluteFilePath = path.resolve(absoluteSrcPath, relativeFilePath)
  const absoluteFileParentPath = path.basename(absoluteFilePath)

  const dependencies = new RecordDict<List<string>>()

  const foundTypes = new RecordDict<string>()

  let errors: string[] = []

  let accept: boolean[] = []
  let resolvedStr: string[] = []

  for (const [_, depPath, depType] of rawType.matchAll(IMPORT_REGEXP)) {
    const absoluteDepPath = path.resolve(absoluteFileParentPath, depPath)

    const relativeDepPath = path.relative(absoluteSrcPath, absoluteDepPath)

    if (restrictFileEndName && !cmdArgs.allowAllImportExt && !depPath.endsWith('.dto') && !depPath.endsWith('.enum')) {
      warn(
        `>>>> Warning: Type {magentaBright} comes from file {magentaBright} which does not end in {magentaBright} or {magentaBright}. ` +
          `This type will be ignored and replace by the {magentaBright} type.`,
        depType,
        relativeDepPath,
        '.dto',
        '.enum',
        'unknown'
      )

      resolvedStr.push('unknown')
      accept.push(false)
      continue
    }

    if (dependencies.get(relativeDepPath).toBoolean((list) => list.includes(relativeDepPath))) {
      resolvedStr.push(depType)
      accept.push(true)
      continue
    }

    if (foundTypes.has(depType)) {
      errors.push(
        format(
          `Two types with the same name {yellow} are imported from different files:\n- One at {yellow}\n- One at {yellow}`,
          depType,
          path.resolve(absoluteSrcPath, foundTypes.get(depType).unwrap()),
          relativeDepPath
        )
      )

      continue
    }

    foundTypes.set(depType, relativeFilePath)

    dependencies.get(relativeDepPath).match({
      Some: (existing) => {
        existing.push(depType)
      },
      None: () => {
        dependencies.set(relativeDepPath, new List([depType]))
      },
    })

    resolvedStr.push(depType)
    accept.push(true)
  }

  const nonNativeTypes = new List<string>()

  for (const [_, typeName] of rawType.replace(IMPORT_REGEXP, '').matchAll(/\b([A-ZÀ-ÖØ-öø-ÿ_][A-Za-zÀ-ÖØ-öø-ÿ_\d]+)\b/g)) {
    if (!(typeName in global)) {
      nonNativeTypes.pushNew(typeName)
    }
  }

  if (errors.length > 0) return Err(errors)

  return Ok({
    rawType: rawType.replace(IMPORT_REGEXP, (_, depPath, depType) =>
      accept.shift() ?? panic('Internal error: not enough corrected type strings to complete replacement in raw type')
        ? `import("${path.relative(absoluteFilePath, depPath)}").${depType}`
        : 'unknown'
    ),

    resolvedType: rawType.replace(
      IMPORT_REGEXP,
      () => resolvedStr.shift() ?? panic('Internal error: not enough type resolution strings to complete replacement in unresolved type')
    ),

    relativeFilePath,

    dependencies,

    nonNativeTypes,
  })
}

export function unifyDepsResolutionErrors(errors: string[]): string {
  return `${errors.length} type resolution errors detected:\n` + errors.map((err, i) => `${i + 1}. ${err}`).join('\n')
}
