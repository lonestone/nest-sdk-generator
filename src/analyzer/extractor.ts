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

/** Valid extensions for TypeScript module files */
export const MODULE_EXTENSIONS = ['.ts', '.d.ts', '.tsx', '.d.tsx', '.js', '.jsx']

/**
 * Location of an imported type
 */
export interface TypeLocation {
  readonly typename: string
  readonly relativePathNoExt: string
}

/**
 * Location of an imported type after figuring out its extension
 */
export interface TypeLocationWithExt extends TypeLocation {
  readonly relativePath: string
}

/**
 * Extracted imported type
 */
export interface ExtractedType extends TypeLocationWithExt {
  /** Type's declaration */
  readonly content: string

  /** Type parameters (e.g. <T>) */
  readonly typeParams: string[]

  /** Types this one depends on */
  readonly dependencies: TypeLocationWithExt[]
}

// Maps files to records mapping themselves type names to their declaration code
export type TypesExtractorContent = Map<string, Map<string, ExtractedType>>

/**
 * Types extractor
 */
export class TypesExtractor {
  constructor(
    /** TS-Morph project */
    public readonly project: Project,

    /** Absolute source path */
    public readonly absoluteSrcPath: string,

    /** Magic types to replace non-portable types */
    public readonly magicTypes: Array<MagicType>,

    /** Extracted types */
    public readonly extracted: TypesExtractorContent = new Map()
  ) {}

  /**
   * Check if a type has already been extracted
   */
  hasExtractedType(loc: TypeLocationWithExt): boolean {
    const files = this.extracted.get(loc.relativePath)
    return files ? files.has(loc.typename) : false
  }

  /**
   * Get a type that was previously extracted
   */
  getExtractedType(loc: TypeLocationWithExt): ExtractedType | null {
    return this.extracted.get(loc.relativePath)?.get(loc.typename) ?? null
  }

  /**
   * Find the extension of a TypeScript module
   * @param loc
   * @returns
   */
  guessExtractedTypeModuleFileExt(loc: TypeLocation): string | null {
    for (const ext of MODULE_EXTENSIONS) {
      if (this.extracted.has(loc.relativePathNoExt + ext)) {
        return loc.relativePathNoExt + ext
      }
    }

    return null
  }

  /**
   * Find if a type has previously been extracted, without providing its extension
   * @param loc
   * @returns
   */
  findExtractedTypeWithoutExt(loc: TypeLocation): ExtractedType | null {
    for (const ext of MODULE_EXTENSIONS) {
      const typ = this.extracted.get(loc.relativePathNoExt + ext)?.get(loc.typename)

      if (typ) {
        return typ
      }
    }

    return null
  }

  /**
   * Memorize an extracted type so it can be reused later on
   * @param loc
   * @param extracted
   */
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

  /**
   * Find the relative file location of a type
   * @param loc
   * @returns
   */
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

  /**
   * Extract a type
   * @param loc
   * @param typesPath
   * @returns
   */
  extractType(loc: TypeLocation, typesPath: string[] = []): ExtractedType | Error {
    if (path.isAbsolute(loc.relativePathNoExt)) {
      unreachable(
        'Internal error: got absolute file path in types extractor, when expecting a relative one (got {magentaBright})',
        loc.relativePathNoExt
      )
    }

    // Get the absolute path of the type's parent file
    // We don't know its extension yet as imported file names in import statements don't have an extension
    const absolutePathNoExt = path.resolve(this.absoluteSrcPath, loc.relativePathNoExt)

    // If the type is already in cache, return it directly
    const cached = this.findExtractedTypeWithoutExt(loc)

    if (cached) {
      return cached
    }

    // Try to find the path with extension of the file and get it as a TS-Morph file
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

    // Use magic types to replace non-portable types
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

    // Analyze the type's declaration
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

    // Handle a limitation of the tool: you can't import two types from two files at the same path with just two different extensions
    // Example: importing a type named "User" from two files in the same directory called "user.entity.ts" and "user.entity.js"
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

    /** Resolved type's dependencies */
    let resolvedDeps: ResolvedTypeDeps[]

    /** Type's parameters (e.g. <T>) */
    let typeParams: string[]

    /** Type declaration */
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
    // This part is tricky as we remake the class from scratch using the informations we have on it, given we have to get rid
    //  of methods as well as removing decorators
    else if (Node.isClassDeclaration(decl)) {
      const classHead = decl.getText().match(/\b(export[^{]+class[^{]+{)/)

      if (!classHead) {
        unreachable('Failed to match class head in declaration: {yellow}', decl.getText())
      }

      extractedDecl = classHead[1]

      const index = decl.getType().getStringIndexType() ?? decl.getType().getNumberIndexType()

      if (index) {
        extractedDecl += '\npublic [input: string | number]: ' + getImportResolvedType(index)
      }

      // Export all members
      for (const member of decl.getMembers()) {
        if (!Node.isPropertyDeclaration(member)) {
          warn('Found non-property member in class {cyan}: {magenta}', decl.getName() ?? '<anonymous>', member.getText())
          continue
        }

        const memberType = member.getType()

        extractedDecl += `\npublic ${member.getName()}${
          member.getText().includes('?') ? '?' : member.getText().includes('!:') ? '!' : ''
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

    // Handle unknown types
    else {
      unreachable('Unknown node type when extracting types: ' + decl.getKindName())
    }

    /** Normalized dependencies */
    const dependencies: TypeLocationWithExt[] = []

    typesPath.push(loc.typename)

    // Ensure we're not stuck in an infinite loop where we analyze a type A, then its dependency B, which itself depends on A, and so on
    if ([...new Set([...typesPath])].length !== typesPath.length) {
      unreachable('Internal error: types path contains at least one duplicate type during extraction')
    }

    // Analyze all dependencies
    for (const dependencyLoc of locateTypesFile(resolvedDeps)) {
      // If the "dependency" is one of the type's parameters (e.g. "T"), ignore this part
      if (typeParams.includes(dependencyLoc.typename)) {
        continue
      }

      // Find the dependency's relative path
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

      // Update dependencies
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

    // Save the dependency
    types.set(loc.typename, extracted)

    return extracted
  }
}

/**
 * Locate the files containing a list of a resolved types
 * @param resolvedTypes
 * @returns
 */
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

/**
 * Flatten a tree of resolved type dependencies
 * @param sdkModules
 * @returns
 */
export function flattenSdkResolvedTypes(sdkModules: SdkModules): ResolvedTypeDeps[] {
  const flattened = new Array<ResolvedTypeDeps>()

  for (const module of sdkModules.values()) {
    for (const controller of module.values()) {
      for (const method of controller.methods.values()) {
        const { parameters: args, query, body } = method.params

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
