import * as path from 'path'
import { Node, Project } from 'ts-morph'
import {
    Err, ErrMsg, List, ListLike, None, Ok, Option, RecordDict, Result, Some, debug, mapStrLines, todo, unimplemented, unreachable
} from 'typescript-core'

import { analyzeClassDeps } from './classdeps'
import { SdkModules } from './controllers'
import { ResolvedTypeDeps } from './typedeps'

export const MODULE_EXTENSIONS = ['.ts', '.d.ts', '.tsx', '.d.tsx', '.js', '.jsx']

export interface TypeLocation {
  readonly typename: string
  readonly pathNoExt: string
}

export interface TypeLocationWithExt extends TypeLocation {
  readonly path: string
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
      .get(loc.path)
      .map((files) => files.has(loc.typename))
      .unwrapOr(false)
  }

  getExtractedType(loc: TypeLocationWithExt): Option<ExtractedType> {
    return this.extracted.get(loc.path).andThen((files) => files.get(loc.typename))
  }

  guessExtractedTypeExt(loc: TypeLocation): Option<string> {
    for (const ext of MODULE_EXTENSIONS) {
      if (this.extracted.has(loc.pathNoExt + ext)) {
        return Some(loc.pathNoExt + ext)
      }
    }

    return None()
  }

  findExtractedTypeWithoutExt(loc: TypeLocation): Option<ExtractedType> {
    return Option.any(
      MODULE_EXTENSIONS.map((ext) => () => this.extracted.get(loc.pathNoExt + ext).andThen((files) => files.get(loc.typename)))
    )
  }

  memorizeExtractedType(loc: TypeLocationWithExt, extracted: ExtractedType) {
    this.extracted.getOrSet(loc.path, new RecordDict()).getOrSet(loc.typename, extracted)
  }

  extractType(loc: TypeLocation, refresh = false): Result<ExtractedType, string> {
    const pathNoExt = path.resolve(this.absoluteSrcPath, loc.pathNoExt)

    if (!refresh) {
      const cached = this.findExtractedTypeWithoutExt(loc)

      if (cached.isSome()) {
        return Ok(cached.data)
      }
    }

    debug('> Extracting type {yellow} from file {magentaBright}...', loc.typename, loc.pathNoExt)

    const tryFile = Result.any(
      MODULE_EXTENSIONS.map((ext) => () => [this.project.getSourceFileOrThrow(pathNoExt + ext), loc.pathNoExt + ext] as const)
    )

    if (tryFile.isErr()) {
      return ErrMsg('File {magenta} was not found (was expected to contain dependency type {yellow})', loc.pathNoExt, loc.typename)
    }

    const [file, filePath] = tryFile.data

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
      return ErrMsg(`Type {yellow} was not found in file {magenta}`, loc.typename, filePath)
    }

    this.findExtractedTypeWithoutExt(loc).some((typ) => {
      if (typ.path !== filePath) {
        unimplemented(
          'Found two conflicting files at same path but with different extensions:\n> {magentaBright}\n> {magentaBright}',
          typ.path,
          filePath
        )
      }
    })

    let resolvedDeps: ResolvedTypeDeps[]
    let typeParams: string[]

    // Handle enumerations
    if (Node.isEnumDeclaration(decl)) {
      // TODO
      todo()
    }

    // Handle type aliases
    else if (Node.isTypeAliasDeclaration(decl)) {
      // TODO
      todo()
    }

    // Handle interfaces and classes
    // Methods are not handled because they shouldn't be used as DTOs and won't be decodable from JSON in all cases
    else if (Node.isInterfaceDeclaration(decl) || Node.isClassDeclaration(decl)) {
      const classDeps = analyzeClassDeps(decl, filePath, this.absoluteSrcPath)

      if (classDeps.isErr()) {
        return Err(classDeps.err)
      }

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
          '> Failed to extract type {yellow} from file {magenta} due to an error in dependency type {yellow}:\n{}',
          loc.typename,
          filePath,
          dependencyLoc.typename,
          mapStrLines(extracted.err, (line) => '  ' + line)
        )
      }

      dependencies.push({ ...dependencyLoc, path: extracted.data.path })

      for (const ext of extracted.data.dependencies) {
        if (!dependencies.find((t) => t.typename === ext.typename && t.pathNoExt === ext.pathNoExt)) {
          dependencies.push(ext)
        }
      }
    }

    const extracted: ExtractedType = {
      ...loc,
      path: filePath,
      typeParams,
      content: decl.getText(),
      dependencies,
    }

    this.extracted.getOrSet(filePath, new RecordDict()).set(loc.typename, extracted)

    return Ok(extracted)
  }
}

export function locateTypesFile(resolvedTypes: ListLike<ResolvedTypeDeps>): List<TypeLocation> {
  const out = new List<TypeLocation>()

  for (const resolved of resolvedTypes) {
    for (const [file, types] of resolved.dependencies) {
      for (const typename of types) {
        if (!out.findHas((loc) => loc.typename === typename && loc.pathNoExt === file)) {
          out.push({ typename, pathNoExt: file })
        }
      }
    }

    for (const typename of resolved.nonNativeTypes) {
      if (!out.findHas((loc) => loc.typename === typename && loc.pathNoExt === resolved.relativeFilePath)) {
        out.push({ typename, pathNoExt: resolved.relativeFilePath })
      }
    }
  }

  return out
}

export function flattenSdkResolvedTypes(sdkModules: SdkModules): List<ResolvedTypeDeps> {
  const flattened = new List<ResolvedTypeDeps>()

  for (const module of sdkModules.values()) {
    for (const controller of module.values()) {
      flattened.push(...controller.classDeps)

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
