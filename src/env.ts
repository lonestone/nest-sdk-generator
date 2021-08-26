/**
 * @file This file sets up the configuration for TSCore
 */

import * as chalk from 'chalk'
import * as fs from 'fs'
import { formatAdvanced, matchString, None, panic, Stringifyable, TSCoreEnvUpdater } from 'typescript-core'
import { config } from './config-loader'

export const tsCoreEnv: TSCoreEnvUpdater = (prev) => ({
  devMode: () => false,

  // Set the verbosity based on the provided configuration option
  verbosity: (devMode, context) => {
    const configLevel = config
      .value()
      .andThen((config) => config.verbosity)
      .unwrapOr('default')

    return matchString(configLevel, {
      'full-silent': () => false,
      silent: () => context === 'error',
      warnings: () => context === 'error' || context === 'warn',
      default: () => (context !== 'debug' && context !== 'dump') || devMode,
      verbose: () => true,
    })
  },

  defaultFormattingOptions: () => ({
    ...prev.defaultFormattingOptions(),

    missingParam: (position, message) => panic("Internal error: Missing parameter {} in panic message '{}'", position + 1, message),

    stringifyOptions: (devMode, context, prettify) => ({
      ...prev.defaultFormattingOptions().stringifyOptions(devMode, context, prettify),

      // Set up color highlighting
      highlighter: (type, content) =>
        config.mapKeyOr('noColor', None()).unwrapOr(false)
          ? content
          : matchString(type, {
              typename: () => chalk.yellow(content),
              prefix: () => chalk.cyan(content),
              unknown: () => chalk.yellow(content),
              unknownWrapper: () => chalk.blue(content),
              unknownTypename: () => chalk.magentaBright(content),
              reference: () => chalk.blue(content),
              referenceWrapper: () => chalk.yellow(content),
              punctuation: () => chalk.cyan(content),
              listIndex: () => chalk.magenta(content),
              listValue: () => chalk.blue(content),
              collKey: () => chalk.magenta(content),
              collValue: () => chalk.blue(content),
              text: () => chalk.green(content),
              string: () => chalk.green(content),
              number: () => chalk.yellow(content),
              errorMessage: () => chalk.red(content),
              errorStack: () => chalk.red(content),
              remainingProperties: () => chalk.yellow(content),
              remainingPropertiesWrapper: () => chalk.blue(content),
              _: () => content,
            }),
    }),
  }),

  formatExt: (color, params, paramCounter, context, options) => {
    if (params.length === 0) {
      return false
    }

    const param = params[paramCounter]

    if (!COLORS.includes(color)) {
      panic(`Internal error: unknown color ${chalk.magentaBright(color)}`)
    }

    const text = (param as Stringifyable).toString()

    if (config.mapKey('noColor').unwrapOr(None()).unwrapOr(false)) {
      return text
    } else {
      // @ts-ignore
      return chalk[color](text)
    }
  },

  panicWatcher: (message, params) => {
    console.error(chalk.red('NSdkGen panicked: ' + formatAdvanced(message, params, 'panic')))
    process.exit(1)
  },

  debug(message, params) {
    console.debug(chalk.cyan(formatAdvanced(message, params, 'debug')))
  },

  warn(message, params) {
    console.warn(chalk.yellow(formatAdvanced(message, params, 'warn')))
  },

  eprintln: (message, params) => {
    console.error(chalk.redBright(formatAdvanced(message, params, 'error')))
  },

  logger: (context, message, params) => {
    const logFile = config.value().andThen((config) => config.logFile)

    if (logFile.isSome()) {
      const formatted = `[${context}] ` + formatAdvanced(message, params, 'logging')

      if (!fs.existsSync(logFile.data)) {
        fs.writeFileSync(logFile.data, formatted, 'utf8')
      } else {
        fs.appendFileSync(logFile.data, formatted, 'utf8')
      }
    }
  },
})

/** List of valid colors */
export const COLORS = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'gray',
  'grey',
  'blackBright',
  'redBright',
  'greenBright',
  'yellowBright',
  'blueBright',
  'magentaBright',
  'cyanBright',
  'whiteBright',
]
