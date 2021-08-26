/**
 * @file Analyze the dependencies of a class analyzed by the TypeScript compiler
 */

import * as path from 'path'
import { ClassDeclaration, InterfaceDeclaration, ts, Type } from 'ts-morph'
import { unreachable } from '../logging'
import { ResolvedTypeDeps, resolveTypeDependencies } from './typedeps'

export function analyzeClassDeps(
  decl: ClassDeclaration | InterfaceDeclaration,
  relativeFilePath: string,
  absoluteSrcPath: string
): ResolvedTypeDeps[] {
  if (path.isAbsolute(relativeFilePath)) {
    unreachable(
      'Internal error: got absolute file path in class dependencies analyzer, when expecting a relative one (got {magentaBright})',
      relativeFilePath
    )
  }

  const toLookup = new Array<Type<ts.Type>>()

  const superClasses = decl.getExtends()

  if (superClasses) {
    for (const sup of Array.isArray(superClasses) ? superClasses : [superClasses]) {
      toLookup.push(sup.getType())
    }
  }

  for (const prop of decl.getProperties()) {
    toLookup.push(prop.getType())
  }

  return toLookup.map((typeText) => resolveTypeDependencies(typeText, relativeFilePath, absoluteSrcPath))
}
