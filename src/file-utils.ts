import * as chalk from 'chalk'
import * as fs from 'fs'
import * as path from 'path'
import { debug, format, panic, println, warn } from './logging'

/**
 * Find a file in the current directory or one of its parents
 * @param name Name of the file to find
 * @param dir Directory to start looking from
 * @returns The file's content, if found
 */
export function findJsonConfig(
  name: string,
  dir: string
): {
  path: string
  content: object
} | null {
  debug('Looking for a {yellow} file...', `"${name}"`)

  const fpath = findFileAbove(name, dir)

  if (fpath === null) {
    warn('File was not found in destination directory or its parents.')
    return null
  }

  println(chalk.green(format('{green} {magentaBright} {green} {yellow}', 'Found file', name, 'at path:', fpath)))

  let text = fs.readFileSync(fpath, 'utf8')
  let content: object

  try {
    content = JSON.parse(text)
  } catch (err) {
    // TODO: In next TypeScript version, rewrite this with "catch (err: Error) {" and remove the typecast
    panic(`Failed to parse file "${name}" at "${dir}": ${(err as Error).message}`)
  }

  return {
    path: fpath,
    content,
  }
}

export function findFileAbove(pattern: string | RegExp, dir: string): string | null {
  if (!path.isAbsolute(dir)) {
    // Get an absolute path to allow getting its parent using path.dirname()
    dir = path.resolve(process.cwd(), dir)
  }

  // The previous directory
  // This is used to check if we reached the top-level directory ; for instance on Linux:
  // > path.dirname('/') === '/'
  // So if the previous directory and the current one are equal, this means we reached the top-level directory
  let prevDir = dir

  let items = []

  // Search until we find the desired file
  while ((items = fs.readdirSync(dir).filter((item) => (pattern instanceof RegExp ? pattern.exec(item) : pattern === item))).length === 0) {
    // Get path to the parent directory
    dir = path.dirname(dir)

    // If the path is empty or equal to the previous path, we reached the top-level directory
    if (!dir || prevDir === dir) {
      return null
    }

    prevDir = dir
  }

  // Success!
  return path.resolve(dir, items[0])
}

/**
 * Find all files matching a pattern, recursively
 * @param pattern The pattern to look for
 * @param dir The root directory to start searching from
 * @param relative Get relative paths instead of absolute paths (default: true)
 * @returns A list of paths
 */
export function findFilesRecursive(pattern: string | RegExp, dir: string, relative = true): string[] {
  const cwd = process.cwd()

  function find(pattern: string | RegExp, rootDir: string, currDir: string): string[] {
    return fs
      .readdirSync(currDir)
      .map((item) => {
        const fullPath = path.resolve(currDir, item)

        return fs.lstatSync(fullPath).isDirectory()
          ? find(pattern, rootDir, fullPath)
          : (typeof pattern === 'string' ? item === pattern : pattern.exec(item))
          ? [relative ? path.relative(rootDir, fullPath) : path.resolve(cwd, currDir, item)]
          : []
      })
      .flat()
  }

  return find(pattern, dir, dir)
}
