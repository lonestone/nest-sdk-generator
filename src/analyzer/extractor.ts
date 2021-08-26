/**
 * @file Types extractor to use in the generated SDK
 */

import * as path from 'path'
import { Node, Project, SourceFile } from 'ts-morph'
import { MagicType } from '../config'
import { debug, format, panic, unreachable, warn } from '../logging'
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
export type TypesExtractorContent = Map<string, Map<string, ExtractedType>>

export class TypesExtractor {
  constructor(
    public readonly project: Project,
    public readonly absoluteSrcPath: string,
    public readonly magicTypes: Array<MagicType>,
    public readonly extracted: TypesExtractorContent = new Map()
  ) {}

  hasExtractedType(loc: TypeLocationWithExt): boolean {
    const files = this.extracted.get(loc.relativePath)
    return files ? files.has(loc.typename) : false
  }

  getExtractedType(loc: TypeLocationWithExt): ExtractedType | null {
    return this.extracted.get(loc.relativePath)?.get(loc.typename) ?? null
  }

  guessExtractedTypeExt(loc: TypeLocation): string | null {
    for (const ext of MODULE_EXTENSIONS) {
      if (this.extracted.has(loc.relativePathNoExt + ext)) {
        return loc.relativePathNoExt + ext
      }
    }

    return null
  }

  findExtractedTypeWithoutExt(loc: TypeLocation): ExtractedType | null {
    for (const ext of MODULE_EXTENSIONS) {
      const typ = this.extracted.get(loc.relativePathNoExt + ext)?.get(loc.typename)

      if (typ) {
        return typ
      }
    }

    return null
  }

  memorizeExtractedType(loc: TypeLocationWithExt, extracted: ExtractedType) {
    let files = this.extracted.get(loc.relativePath)

    if (!files) {
      files = new Map()
      this.extracted.set(loc.relativePath, files)
    }

    if (!files.has(loc.typename)) {
      files.set(loc.typename, extracted)
    }
  }

  findTypeRelativeFilePath(loc: TypeLocation): string | Error {
    if (path.isAbsolute(loc.relativePathNoExt)) {
      unreachable(
        'Internal error: got absolute file path in types extractor, when expecting a relative one (got {magentaBright})',
        loc.relativePathNoExt
      )
    }

    const absolutePathNoExt = path.resolve(this.absoluteSrcPath, loc.relativePathNoExt)

    const cached = this.findExtractedTypeWithoutExt(loc)

    if (cached) {
      return cached.relativePath
    }

    let relativeFilePath: string | null = null

    for (const ext of MODULE_EXTENSIONS) {
      try {
        this.project.getSourceFileOrThrow(absolutePathNoExt + ext)
        relativeFilePath = loc.relativePathNoExt + ext
      } catch (e) {
        continue
      }
    }

    return (
      relativeFilePath ??
      new Error(
        format('File {magenta} was not found (was expected to contain dependency type {yellow})', loc.relativePathNoExt, loc.typename)
      )
    )
  }

  extractType(loc: TypeLocation, typesPath: string[] = []): ExtractedType | Error {
    if (path.isAbsolute(loc.relativePathNoExt)) {
      unreachable(
        'Internal error: got absolute file path in types extractor, when expecting a relative one (got {magentaBright})',
        loc.relativePathNoExt
      )
    }

    const absolutePathNoExt = path.resolve(this.absoluteSrcPath, loc.relativePathNoExt)

    const cached = this.findExtractedTypeWithoutExt(loc)

    if (cached) {
      return cached
    }

    let fileAndPath: [SourceFile, string] | null = null

    for (const ext of MODULE_EXTENSIONS) {
      try {
        fileAndPath = [this.project.getSourceFileOrThrow(absolutePathNoExt + ext), loc.relativePathNoExt + ext]
      } catch (e) {
        continue
      }
    }

    if (!fileAndPath) {
      return new Error(
        format('File {magenta} was not found (was expected to contain dependency type {yellow})', loc.relativePathNoExt, loc.typename)
      )
    }

    const [file, relativeFilePath] = fileAndPath

    for (const magicType of this.magicTypes) {
      if (relativeFilePath.endsWith(`/node_modules/${magicType.nodeModuleFilePath}`) && loc.typename === magicType.typeName) {
        debug(
          '-> '.repeat(typesPath.length + 1) +
            'Found magic type {yellow} from external module file {magentaBright}, using provided placeholder.',
          loc.typename,
          relativeFilePath
        )

        const extracted: ExtractedType = {
          content: '/** @file Magic placeholder from configuration file */\n\n' + magicType.placeholderContent,
          relativePath: relativeFilePath,
          relativePathNoExt: loc.relativePathNoExt,
          typename: loc.typename,
          typeParams: [], // TODO: UNSAFE
          dependencies: [],
        }

        typesPath.pop()

        let types = this.extracted.get(relativeFilePath)

        if (!types) {
          types = new Map()
          this.extracted.set(relativeFilePath, types)
        }

        types.set(loc.typename, extracted)

        return extracted
      }
    }

    debug('-> '.repeat(typesPath.length + 1) + 'Extracting type {yellow} from file {magentaBright}...', loc.typename, relativeFilePath)

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
      return new Error(format(`Type {yellow} was not found in file {magenta}`, loc.typename, relativeFilePath))
    }

    const typ = this.findExtractedTypeWithoutExt(loc)

    if (typ) {
      if (typ.relativePath !== relativeFilePath) {
        panic(
          'Found two conflicting files at same path but with different extensions:\n> {magentaBright}\n> {magentaBright}',
          typ.relativePath,
          relativeFilePath
        )
      }
    }

    let resolvedDeps: ResolvedTypeDeps[]
    let typeParams: string[]

    let extractedDecl = decl.getText()

    // Handle enumerations
    if (Node.isEnumDeclaration(decl)) {
      resolvedDeps = []
      typeParams = []
    }

    // Handle type aliases
    else if (Node.isTypeAliasDeclaration(decl)) {
      resolvedDeps = [resolveTypeDependencies(decl.getType(), relativeFilePath, this.absoluteSrcPath)]
      typeParams = []
    }

    // Handle interfaces
    else if (Node.isInterfaceDeclaration(decl)) {
      resolvedDeps = analyzeClassDeps(decl, relativeFilePath, this.absoluteSrcPath)
      typeParams = decl.getTypeParameters().map((tp) => tp.getText())
    }

    // Handle classes
    // Methods are not handled because they shouldn't be used as DTOs and won't be decodable from JSON in all cases
    else if (Node.isClassDeclaration(decl)) {
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

        extractedDecl += `\npublic ${member.getName()}${
          member.getText().includes('?') ? '?' : member.getText().includes('!:') || member.getText().includes('=') ? '!' : ''
        }: ${getImportResolvedType(memberType)};`
      }

      extractedDecl += '\n}'

      resolvedDeps = analyzeClassDeps(decl, relativeFilePath, this.absoluteSrcPath)
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

      let fallibleRelativePath: string | Error

      const cached = this.findExtractedTypeWithoutExt(dependencyLoc)

      if (cached) {
        fallibleRelativePath = cached.relativePath
      } else if (typesPath.includes(dependencyLoc.typename)) {
        fallibleRelativePath = this.findTypeRelativeFilePath(dependencyLoc)
      } else {
        const extracted = this.extractType(dependencyLoc, typesPath)
        fallibleRelativePath = extracted instanceof Error ? extracted : extracted.relativePath
      }

      if (fallibleRelativePath instanceof Error) {
        return new Error(
          format(
            '> Failed to extract type {yellow} due to an error in dependency type {yellow}\nfrom file {magenta} :\n{}',
            loc.typename,
            dependencyLoc.typename,
            relativeFilePath,
            fallibleRelativePath.message.replace(/^/gm, '  ')
          )
        )
      }

      dependencies.push({ ...dependencyLoc, relativePath: fallibleRelativePath })
    }

    const extracted: ExtractedType = {
      ...loc,
      relativePath: relativeFilePath,
      typeParams,
      content: extractedDecl,
      dependencies,
    }

    typesPath.pop()

    let types = this.extracted.get(relativeFilePath)

    if (!types) {
      types = new Map()
      this.extracted.set(relativeFilePath, types)
    }

    types.set(loc.typename, extracted)

    return extracted
  }
}

export function locateTypesFile(resolvedTypes: Array<ResolvedTypeDeps>): TypeLocation[] {
  const out = new Array<TypeLocation>()

  for (const resolved of resolvedTypes) {
    for (const [file, types] of resolved.dependencies) {
      for (const typename of types) {
        if (!out.find((loc) => loc.typename === typename && loc.relativePathNoExt === file)) {
          out.push({ typename, relativePathNoExt: file })
        }
      }
    }

    for (const typename of resolved.localTypes) {
      if (!out.find((loc) => loc.typename === typename && loc.relativePathNoExt === resolved.relativeFilePath)) {
        out.push({ typename, relativePathNoExt: resolved.relativeFilePath })
      }
    }
  }

  return out
}

export function flattenSdkResolvedTypes(sdkModules: SdkModules): ResolvedTypeDeps[] {
  const flattened = new Array<ResolvedTypeDeps>()

  for (const module of sdkModules.values()) {
    for (const controller of module.values()) {
      for (const method of controller.methods.values()) {
        const { arguments: args, query, body } = method.params

        flattened.push(method.returnType)

        if (args) {
          flattened.push(...args.values())
        }

        if (query) {
          flattened.push(...query.values())
        }

        if (body) {
          if (body.full) {
            flattened.push(body.type)
          } else {
            flattened.push(...body.fields.values())
          }
        }
      }
    }
  }

  return flattened
}
