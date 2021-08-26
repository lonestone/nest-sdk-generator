/**
 * @file Analyze the dependencies of a class analyzed by the TypeScript compiler
 */

import * as path from 'path'
import { ClassDeclaration, InterfaceDeclaration, ts, Type } from 'ts-morph'
import { List, O, Result, unreachable } from 'typescript-core'
import { ResolvedTypeDeps, resolveTypeDependencies } from './typedeps'

export function analyzeClassDeps(
  decl: ClassDeclaration | InterfaceDeclaration,
  relativeFilePath: string,
  absoluteSrcPath: string
): Result<List<ResolvedTypeDeps>, string> {
  if (path.isAbsolute(relativeFilePath)) {
    unreachable(
      'Internal error: got absolute file path in class dependencies analyzer, when expecting a relative one (got {magentaBright})\n{}',
      relativeFilePath,
      new Error('Failed')
    )
  }

  const toLookup = new List<Type<ts.Type>>()

  const superClasses = decl.getExtends()

  if (superClasses) {
    for (const sup of O.isArray(superClasses) ? superClasses : [superClasses]) {
      toLookup.push(sup.getType())
    }
  }

  for (const prop of decl.getProperties()) {
    toLookup.push(prop.getType())
  }

  return toLookup.resultable((typeText) => resolveTypeDependencies(typeText, relativeFilePath, absoluteSrcPath))
}
