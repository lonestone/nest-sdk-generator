import * as path from 'path'
import { ts, Type } from 'ts-morph'
import { ErrMsg, List, Ok, RecordDict, Regex, Result, unimplemented, unreachable } from 'typescript-core'

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
  const _nested = (type: Type<ts.Type>) => resolveTypeDependencies(type, relativeFilePath, absoluteSrcPath)

  const ret: Pick<ResolvedTypeDeps, 'rawType' | 'relativeFilePath'> = { rawType: type.getText(), relativeFilePath }

  if (path.isAbsolute(ret.relativeFilePath)) {
    unreachable(
      'Internal error: got absolute file path in type dependencies resolver, when expecting a relative one (got {magentaBright})\n{}',
      relativeFilePath,
      new Error('Failed')
    )
  }

  let dependencies: ResolvedTypeDeps['dependencies']
  let localTypes: ResolvedTypeDeps['localTypes']
  let resolvedType: ResolvedTypeDeps['resolvedType']

  // Imported types
  if (ret.rawType.startsWith('import(')) {
    const match = new Regex(/^import\(['"](.*)['"]\)\.(.*)$/, ['filePath', 'type']).matchNamed(ret.rawType)

    if (match.isNone()) {
      return ErrMsg('Type {yellow} does not match the expected syntax of import types', ret.rawType)
    }

    const filePath = path.isAbsolute(match.data.filePath) ? path.relative(absoluteSrcPath, match.data.filePath) : match.data.filePath

    // TODO: Handle generics, etc. (globally in this function, not just for imported types)
    const basicType = match.data.type.replace(/\[\]$/, '').replace(/^Array<(.*)>$/, '$1')
    const isArrayType = match.data.type !== basicType

    dependencies = new RecordDict()
    dependencies.set(filePath, new List([basicType]))
    localTypes = new List()
    resolvedType = isArrayType ? `Array<${basicType}>` : basicType
  }

  // Native types & literals
  else if (
    type.isAny() ||
    type.isUnknown() ||
    type.isUndefined() ||
    type.isBoolean() ||
    type.isBooleanLiteral() ||
    type.isNumber() ||
    type.isNumberLiteral() ||
    type.isString() ||
    type.isStringLiteral() ||
    type.isObject()
  ) {
    dependencies = new RecordDict()
    localTypes = new List()
    resolvedType = type.getText()
  }

  // Arrays
  else if (type.isArray()) {
    const resolved = _nested(type.getArrayElementTypeOrThrow())
    if (resolved.isErr()) return resolved.asErr()

    dependencies = resolved.data.dependencies
    localTypes = resolved.data.localTypes
    resolvedType = 'Array<' + resolved.data.resolvedType + '>'
  }

  // Tuples
  else if (type.isTuple()) {
    dependencies = new RecordDict()
    localTypes = new List()

    const resolvedUnion = new List<string>()

    for (const typ of type.getTupleElements()) {
      const resolved = _nested(typ)
      if (resolved.isErr()) return resolved.asErr()

      dependencies.merge(resolved.data.dependencies)
      localTypes.pushNew(...resolved.data.localTypes)
      resolvedUnion.push(resolved.data.resolvedType)
    }

    resolvedType = resolvedUnion.join(' | ')
  }

  // Unions
  else if (type.isUnion()) {
    dependencies = new RecordDict()
    localTypes = new List()

    const resolvedUnion = new List<string>()

    for (const typ of type.getUnionTypes()) {
      const resolved = _nested(typ)
      if (resolved.isErr()) return resolved.asErr()

      dependencies.merge(resolved.data.dependencies)
      localTypes.pushNew(...resolved.data.localTypes)
      resolvedUnion.push(resolved.data.resolvedType)
    }

    resolvedType = resolvedUnion.join(' | ')
  }

  // Intersections
  else if (type.isIntersection()) {
    dependencies = new RecordDict()
    localTypes = new List()

    const resolvedUnion = new List<string>()

    for (const typ of type.getUnionTypes()) {
      const resolved = _nested(typ)
      if (resolved.isErr()) return resolved.asErr()

      dependencies.merge(resolved.data.dependencies)
      localTypes.pushNew(...resolved.data.localTypes)
      resolvedUnion.push(resolved.data.resolvedType)
    }

    resolvedType = resolvedUnion.join(' | ')
  }

  // Interfaces
  else if (type.isLiteral()) {
    dependencies = new RecordDict()
    localTypes = new List()
    unimplemented('TYPE LITERAL')

    /*const resolvedUnion = new List<string>()

    for (const typ of ) {
      const resolved = _nested(typ)
      if (resolved.isErr()) return resolved.asErr()

      dependencies.merge(resolved.data.dependencies)
      localTypes.pushNew(...resolved.data.localTypes)
      resolvedUnion.push(resolved.data.resolvedType)
    }

    resolvedType = resolvedUnion.join(' | ')*/
  }

  // TODO: Functions
  // TODO: Type aliases
  // TODO: Handle type parameters

  // Unknown type "type"
  else {
    return ErrMsg('Unknown TypeScript type variant:\n{yellow}', type.getText())
  }

  // dump({
  //   ...ret,
  //   resolvedType,
  //   dependencies,
  //   localTypes,
  // })

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
