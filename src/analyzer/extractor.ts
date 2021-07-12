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
  unimplemented,
  unreachable,
  warn,
} from 'typescript-core'
import { analyzeClassDeps } from './classdeps'
import { SdkModules } from './controllers'
import { getImportResolvedType, ResolvedTypeDeps, resolveTypeDependencies } from './typedeps'

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

  findTypeRelativeFilePath(loc: TypeLocation): Result<string, string> {
    if (path.isAbsolute(loc.relativePathNoExt)) {
      unreachable(
        'Internal error: got absolute file path in types extractor, when expecting a relative one (got {magentaBright})\n{}',
        loc.relativePathNoExt,
        new Error('Failed')
      )
    }

    const absolutePathNoExt = path.resolve(this.absoluteSrcPath, loc.relativePathNoExt)

    const cached = this.findExtractedTypeWithoutExt(loc)

    if (cached.isSome()) {
      return Ok(cached.data.relativePath)
    }

    const tryFile = Result.any(
      MODULE_EXTENSIONS.map((ext) => () =>
        [this.project.getSourceFileOrThrow(absolutePathNoExt + ext), loc.relativePathNoExt + ext] as const
      )
    )

    if (tryFile.isErr()) {
      return ErrMsg('File {magenta} was not found (was expected to contain dependency type {yellow})', loc.relativePathNoExt, loc.typename)
    }

    return Ok(tryFile.data[1])
  }

  extractType(
    loc: TypeLocation,
    typesPath: string[] = []
    //toExtractLater: Array<[TypeLocation, string[]]> = []
  ): Result<ExtractedType, string> {
    if (path.isAbsolute(loc.relativePathNoExt)) {
      unreachable(
        'Internal error: got absolute file path in types extractor, when expecting a relative one (got {magentaBright})\n{}',
        loc.relativePathNoExt,
        new Error('Failed')
      )
    }

    const absolutePathNoExt = path.resolve(this.absoluteSrcPath, loc.relativePathNoExt)

    const cached = this.findExtractedTypeWithoutExt(loc)

    if (cached.isSome()) {
      return Ok(cached.data)
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

    debug(
      '-> '.repeat(typesPath.length + 1) + 'Extracting type {yellow} from file {magentaBright}...',
      loc.typename,
      loc.relativePathNoExt + path.extname(file.getFilePath())
    )

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

    let extractedDecl = decl.getText()

    // Handle enumerations
    if (Node.isEnumDeclaration(decl)) {
      // TODO: Handle imported values such as `enum A { A = ExternalEnum.A }`
      resolvedDeps = []
      typeParams = []
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

    // Handle interfaces
    else if (Node.isInterfaceDeclaration(decl)) {
      const classDeps = analyzeClassDeps(decl, relativeFilePath, this.absoluteSrcPath)

      if (classDeps.isErr()) return classDeps.asErr()

      resolvedDeps = classDeps.data.values().collectArray()
      typeParams = decl.getTypeParameters().map((tp) => tp.getText())
    }

    // Handle classes
    // Methods are not handled because they shouldn't be used as DTOs and won't be decodable from JSON in all cases
    else if (Node.isClassDeclaration(decl)) {
      const classDeps = analyzeClassDeps(decl, relativeFilePath, this.absoluteSrcPath)

      if (classDeps.isErr()) return classDeps.asErr()

      const classHead = decl.getText().match(/\b(export[^{]+class[^{]+{)/)

      if (!classHead) {
        unreachable('Failed to match class head in declaration: {yellow}', decl.getText())
      }

      extractedDecl = classHead[1]

      for (const member of decl.getMembers()) {
        if (!Node.isPropertyDeclaration(member)) {
          warn('Found non-property member: {magenta}', member.getText())
          continue
        }

        const memberType = member.getType()

        extractedDecl += `\npublic ${member.getName()}${member.getText().includes('?') ? '?' : ''}: ${getImportResolvedType(memberType)};`
      }

      extractedDecl += '\n}'

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

    const dependencies: TypeLocationWithExt[] = []

    typesPath.push(loc.typename)

    if ([...new Set([...typesPath])].length !== typesPath.length) {
      unreachable('Internal error: types path contains at least one duplicate type during extraction')
    }

    for (const dependencyLoc of locateTypesFile(resolvedDeps)) {
      if (typeParams.includes(dependencyLoc.typename)) {
        continue
      }

      let fallibleRelativePath: Result<string, string>

      const cached = this.findExtractedTypeWithoutExt(dependencyLoc)

      if (cached.isSome()) {
        fallibleRelativePath = Ok(cached.data.relativePath)
      } else if (typesPath.includes(dependencyLoc.typename)) {
        fallibleRelativePath = this.findTypeRelativeFilePath(dependencyLoc)

        // if (!toExtractLater.find((entry) => entry[0].typename === dependencyLoc.typename)) {
        //   toExtractLater.push([dependencyLoc, [...typesPath]])
        // }
      } else {
        fallibleRelativePath = this.extractType(dependencyLoc, typesPath /*, toExtractLater*/).map((ex) => ex.relativePath)
      }

      if (fallibleRelativePath.isErr()) {
        return ErrMsg(
          '> Failed to extract type {yellow} due to an error in dependency type {yellow}\nfrom file {magenta} :\n{}',
          loc.typename,
          dependencyLoc.typename,
          relativeFilePath,
          indentStr(fallibleRelativePath.err, 2)
        )
      }

      dependencies.push({ ...dependencyLoc, relativePath: fallibleRelativePath.data })
    }

    typesPath.pop()

    const extracted: ExtractedType = {
      ...loc,
      relativePath: relativeFilePath,
      typeParams,
      content: extractedDecl,
      dependencies,
    }

    this.extracted.getOrSet(relativeFilePath, new RecordDict()).set(loc.typename, extracted)

    // if (typesPath.length === 0) {
    //   while (toExtractLater.length > 0) {
    //     debug(
    //       'Going to extract {yellow} reported cycling types: {yellow}',
    //       toExtractLater.length,
    //       toExtractLater.map((entry) => entry[0].typename).join(format('{magenta}', ' / '))
    //     )

    //     const toExtract = [...toExtractLater]
    //     toExtractLater = []

    //     for (const [dependencyLoc, typesPath] of toExtract) {
    //       if (this.findExtractedTypeWithoutExt(dependencyLoc).isSome()) {
    //         continue
    //       }

    //       debug(
    //         '> Extracting reported cycling type {yellow} from path {yellow}',
    //         dependencyLoc.typename,
    //         typesPath.join(format('{magenta}', ' -> '))
    //       )

    //       const extracted = this.extractType(dependencyLoc, typesPath, toExtractLater)

    //       if (extracted.isErr()) {
    //         return ErrMsg(
    //           '> Failed to extract type {yellow} due to an error in dependency type {yellow}\nfrom file {magenta} :\n{}',
    //           loc.typename,
    //           dependencyLoc.typename,
    //           relativeFilePath,
    //           indentStr(extracted.err, 2)
    //         )
    //       }
    //     }
    //   }
    // }

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
