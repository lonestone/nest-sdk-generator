import * as chalk from 'chalk'
import * as fs from 'fs'
import * as path from 'path'
import { debug, format, JsonValue, None, Option, println, Some, warn } from 'typescript-core'

/**
 * Find a file in the current directory or one of its parents
 * @param name Name of the file to find
 * @param dir Directory to start looking from
 * @returns The file's content, if found
 */
export function findJsonConfig(
  name: string,
  dir: string
): Option<{
  path: string
  content: JsonValue
}> {
  debug('Looking for a {yellow} file...', `"${name}"`)

  const fpath = findFileAbove(name, dir)

  if (fpath.isNone()) {
    warn('File was not found in destination directory or its parents.')
    return None()
  }

  println(chalk.green(format('{green} {yellow}', 'Found at path:', fpath.data)))

  return Some({
    path: fpath.data,
    content: JsonValue.parse(fs.readFileSync(fpath.data, 'utf8')).unwrapWith(
      (err) => `Failed to parse file "${name}" at "${dir}": ${err.message}`
    ),
  })
}

export function findFileAbove(pattern: string | RegExp, dir: string): Option<string> {
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
      return None()
    }

    prevDir = dir
  }

  // Success!
  return Some(path.resolve(dir, items[0]))
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
