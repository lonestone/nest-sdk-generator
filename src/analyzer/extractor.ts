import * as path from 'path'
import { Node, Project } from 'ts-morph'
import {
  debug,
  dump,
  ErrMsg,
  indentStr,
  List,
  ListLike,
  None,
  Ok,
  Option,
  RecordDict,
  Result,
  Some,
  todo,
  unimplemented,
  unreachable,
} from 'typescript-core'
import { analyzeClassDeps } from './classdeps'
import { SdkModules } from './controllers'
import { ResolvedTypeDeps, resolveTypeDependencies } from './typedeps'

export const MODULE_EXTENSIONS = ['.ts', '.d.ts', '.tsx', '.d.tsx', '.js', '.jsx']

export interface TypeLocation {
  readonly typename: string
  readonly relativePathNoExt: string
}

export interface TypeLocationWithExt extends TypeLocation {
  readonly relativePath: string
}

export interface ExtractedType extends TypeLocationWithExt {
  readonly content: string
  readonly typeParams: string[]
  readonly dependencies: TypeLocationWithExt[]
}

// Maps files to records mapping themselves type names to their declaration code
export type TypesExtractorContent = RecordDict<RecordDict<ExtractedType>>

export class TypesExtractor {
  constructor(
    public readonly project: Project,
    public readonly absoluteSrcPath: string,
    public readonly extracted: TypesExtractorContent = new RecordDict()
  ) {}

  hasExtractedType(loc: TypeLocationWithExt): boolean {
    return this.extracted
      .get(loc.relativePath)
      .map((files) => files.has(loc.typename))
      .unwrapOr(false)
  }

  getExtractedType(loc: TypeLocationWithExt): Option<ExtractedType> {
    return this.extracted.get(loc.relativePath).andThen((files) => files.get(loc.typename))
  }

  guessExtractedTypeExt(loc: TypeLocation): Option<string> {
    for (const ext of MODULE_EXTENSIONS) {
      if (this.extracted.has(loc.relativePathNoExt + ext)) {
        return Some(loc.relativePathNoExt + ext)
      }
    }

    return None()
  }

  findExtractedTypeWithoutExt(loc: TypeLocation): Option<ExtractedType> {
    return Option.any(
      MODULE_EXTENSIONS.map((ext) => () => this.extracted.get(loc.relativePathNoExt + ext).andThen((files) => files.get(loc.typename)))
    )
  }

  memorizeExtractedType(loc: TypeLocationWithExt, extracted: ExtractedType) {
    this.extracted.getOrSet(loc.relativePath, new RecordDict()).getOrSet(loc.typename, extracted)
  }

  extractType(loc: TypeLocation, refresh = false): Result<ExtractedType, string> {
    if (path.isAbsolute(loc.relativePathNoExt)) {
      unreachable(
        'Internal error: got absolute file path in types extractor, when expecting a relative one (got {magentaBright})\n{}',
        loc.relativePathNoExt,
        new Error('Failed')
      )
    }

    const absolutePathNoExt = path.resolve(this.absoluteSrcPath, loc.relativePathNoExt)

    if (!refresh) {
      const cached = this.findExtractedTypeWithoutExt(loc)

      if (cached.isSome()) {
        return Ok(cached.data)
      }
    }

    const tryFile = Result.any(
      MODULE_EXTENSIONS.map((ext) => () =>
        [this.project.getSourceFileOrThrow(absolutePathNoExt + ext), loc.relativePathNoExt + ext] as const
      )
    )

    if (tryFile.isErr()) {
      return ErrMsg('File {magenta} was not found (was expected to contain dependency type {yellow})', loc.relativePathNoExt, loc.typename)
    }

    const [file, relativeFilePath] = tryFile.data

    debug('> Extracting type {yellow} from file {magentaBright}...', loc.typename, loc.relativePathNoExt + path.extname(file.getFilePath()))

    const decl = file.forEachChildAsArray().find((node) => {
      return (
        (Node.isEnumDeclaration(node) ||
          Node.isTypeAliasDeclaration(node) ||
          Node.isInterfaceDeclaration(node) ||
          Node.isClassDeclaration(node) ||
          Node.isFunctionDeclaration(node)) &&
        node.getName() === loc.typename
      )
    })

    if (!decl) {
      return ErrMsg(`Type {yellow} was not found in file {magenta}`, loc.typename, relativeFilePath)
    }

    this.findExtractedTypeWithoutExt(loc).ifSome((typ) => {
      if (typ.relativePath !== relativeFilePath) {
        unimplemented(
          'Found two conflicting files at same path but with different extensions:\n> {magentaBright}\n> {magentaBright}',
          typ.relativePath,
          relativeFilePath
        )
      }
    })

    let resolvedDeps: ResolvedTypeDeps[]
    let typeParams: string[]

    // Handle enumerations
    if (Node.isEnumDeclaration(decl)) {
      // TODO
      todo('enums not supported')
    }

    // Handle type aliases
    else if (Node.isTypeAliasDeclaration(decl)) {
      dump(decl.getText())
      dump(decl.getChildren().map((child) => child.getFullText()))
      dump(decl.getTypeNodeOrThrow().getText())
      dump(decl.getTypeNodeOrThrow().getFullText())
      dump(decl.getTypeNodeOrThrow().getType().getText())
      process.exit(1) as any

      const resolved = resolveTypeDependencies(decl.getType(), relativeFilePath, this.absoluteSrcPath)
      if (resolved.isErr()) return resolved.asErr()

      resolvedDeps = [resolved.data]
      typeParams = []
    }

    // Handle interfaces and classes
    // Methods are not handled because they shouldn't be used as DTOs and won't be decodable from JSON in all cases
    else if (Node.isInterfaceDeclaration(decl) || Node.isClassDeclaration(decl)) {
      const classDeps = analyzeClassDeps(decl, relativeFilePath, this.absoluteSrcPath)

      if (classDeps.isErr()) return classDeps.asErr()

      resolvedDeps = classDeps.data.values().collectArray()
      typeParams = decl.getTypeParameters().map((tp) => tp.getText())
    }

    // Handle functions
    else if (Node.isFunctionDeclaration(decl)) {
      resolvedDeps = []
      typeParams = []
    }

    // Handle unreachable types
    else {
      unreachable('Unknown node type when extracting types: ' + decl.getKindName())
    }

    //debug('> Found {yellow} companion type' + (companionTypes.length > 1 ? 's' : ''), companionTypes.length)

    const dependencies: TypeLocationWithExt[] = []

    for (const dependencyLoc of locateTypesFile(resolvedDeps)) {
      if (typeParams.includes(dependencyLoc.typename)) {
        continue
      }

      const extracted = this.extractType(dependencyLoc)

      if (extracted.isErr()) {
        return ErrMsg(
          '> Failed to extract type {yellow} due to an error in dependency type {yellow}\nfrom file {magenta} :\n{}',
          loc.typename,
          dependencyLoc.typename,
          relativeFilePath,
          indentStr(extracted.err, 2)
        )
      }

      dependencies.push({ ...dependencyLoc, relativePath: extracted.data.relativePath })

      for (const ext of extracted.data.dependencies) {
        if (!dependencies.find((t) => t.typename === ext.typename && t.relativePathNoExt === ext.relativePathNoExt)) {
          dependencies.push(ext)
        }
      }
    }

    const extracted: ExtractedType = {
      ...loc,
      relativePath: relativeFilePath,
      typeParams,
      content: decl.getText(),
      dependencies,
    }

    this.extracted.getOrSet(relativeFilePath, new RecordDict()).set(loc.typename, extracted)

    return Ok(extracted)
  }
}

export function locateTypesFile(resolvedTypes: ListLike<ResolvedTypeDeps>): List<TypeLocation> {
  const out = new List<TypeLocation>()

  for (const resolved of resolvedTypes) {
    for (const [file, types] of resolved.dependencies) {
      for (const typename of types) {
        if (!out.findHas((loc) => loc.typename === typename && loc.relativePathNoExt === file)) {
          out.push({ typename, relativePathNoExt: file })
        }
      }
    }

    for (const typename of resolved.localTypes) {
      if (!out.findHas((loc) => loc.typename === typename && loc.relativePathNoExt === resolved.relativeFilePath)) {
        out.push({ typename, relativePathNoExt: resolved.relativeFilePath })
      }
    }
  }

  return out
}

export function flattenSdkResolvedTypes(sdkModules: SdkModules): List<ResolvedTypeDeps> {
  const flattened = new List<ResolvedTypeDeps>()

  for (const module of sdkModules.values()) {
    for (const controller of module.values()) {
      // flattened.push(...controller.classDeps)

      for (const method of controller.methods.values()) {
        flattened.push(method.returnType)

        if (method.params.arguments.isSome()) {
          flattened.push(...method.params.arguments.data.values())
        }

        if (method.params.query.isSome()) {
          flattened.push(...method.params.query.data.values())
        }

        if (method.params.body.isSome()) {
          if (method.params.body.data.full) {
            flattened.push(method.params.body.data.type)
          } else {
            flattened.push(...method.params.body.data.fields.values())
          }
        }
      }
    }
  }

  return flattened
}
