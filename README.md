# nest-sdk-generator by [![](https://user-images.githubusercontent.com/73881870/130991041-a4a1f0f4-21f5-4a54-a085-974f80f56ed2.png)](https://lonestone.io/)

[![](https://img.shields.io/npm/v/nest-sdk-generator)](https://www.npmjs.com/package/nest-sdk-generator)

`nest-sdk-generator` is a tool that allows you to build automatically and in seconds a SDK for client applications to consume a Nest.js server's API.

The project is split in two parts:

- The **analyzer** looks for all modules, controllers, methods and types in the Nest.js server, and builds a JSON schema containing all informations
- The **generator** takes this JSON schema and generates a directory containing the SDK

The project has been created and is currently maintained by our developers at [Lonestone](https://lonestone.io/).

For a quick glance at performances, check [here](#how-fast-is-it).

**Table of contents:**

- [What is nest-sdk-generator and why should I use it?](#what-is-nest-sdk-generator-and-why-should-i-use-it)
- [Quick usage example](#quick-usage-example)
- [How fast is it?](#how-fast-is-it)
- [Features](#features)
- [Limitations](#limitations)
- [Using the SDK](#using-the-sdk)
- [Architecture](#architecture)
- [Step-by-step generation tutorial](#step-by-step-generation-tutorial)
    - [Recommandations](#recommandations)
- [SDK usage](#sdk-usage)
    - [Importing API types](#importing-api-types)
  - [External files](#external-files)
- [Configuration options](#configuration-options)
- [Frequently-asked questions](#frequently-asked-questions)
  - [Does this replace Swagger?](#does-this-replace-swagger)
  - [I have a GraphQL API, what can this project do for me?](#i-have-a-graphql-api-what-can-this-project-do-for-me)
  - [Does the SDK has any performance overhead?](#does-the-sdk-has-any-performance-overhead)
  - [How do I update the SDK once I change the API's source code?](#how-do-i-update-the-sdk-once-i-change-the-apis-source-code)
  - [Is the SDK documented?](#is-the-sdk-documented)
  - [Can I add header or other data on-the-fly when making requests?](#can-i-add-header-or-other-data-on-the-fly-when-making-requests)
  - [Is there a way to log the requests or responses somewhere?](#is-there-a-way-to-log-the-requests-or-responses-somewhere)
  - [Does the API server needs to be running to generate a SDK?](#does-the-api-server-needs-to-be-running-to-generate-a-sdk)
  - [Can I fork this project to make my own version of it?](#can-i-fork-this-project-to-make-my-own-version-of-it)
  - [Can I use this project in commercial software?](#can-i-use-this-project-in-commercial-software)
- [License](#license)

## What is nest-sdk-generator and why should I use it?

nest-sdk-generator is a tool that creates a client-side SDK based on a Nest.js REST API. The SDK can be used to call the API's routes seamlessly without any friction, and also enforces type safety by typing all parameters and return values based on the API itself.

This brings several advantages, including:

- Missing or bad parameters and return types will be detected at compilation time
- IDE autocompletion for parameters and return values without needing to look at the doc
- All API routes are listed in a single block allowing to list all at once
- Routes are split across controllers, themselves split across modules, keeping the same hierarchy as your API even if the routes don't
- Global request and response handler acting as the main request actor, allowing to customize requests by providing additional values like headers if required
- Simple & clean placeholders for server-side types that can't be ported to client-side (e.g. ORM dictionary types)

The generator also allows you to (re-)generate a full SDK in seconds with a single command. And in case something goes wrong, you'll be able to pinpoint exactly what the problem is thanks to the colorful (can be disabled) verbose output. A log file can also be used to store all output informations in one place.

## Quick usage example

The SDK generator only requires you to create a small JSON configuration file to indicate where you API is located at, and to run a simple `npx nest-sdk-generator <path to the configuration file>` command. This will generate a client-side SDK hierarchised in modules, controllers and methods that will allow you to call your API's routes without manually writing the URIs yourself. The query parameters and body content is also strictly typed and automatically converted to be sent to your API.

Calling methods will look like this:

```typescript
import { userController } from "../sdk/userModule"
import { articleController } from "../sdk/articleModule"

const user = await userController.profile({ username: "jack" })

const userArticles = await articleController.getAll({ author: user.id })

const user = await articleController.publish({}, {
  author: user.id,
  content: `${user.pseudo} has already published ${userArticles.length} articles!`
})
```

You can find a complete demonstration API in the [`demo/server`](demo/server) directory, as well as a frontend using a SDK based on this API in [`demo/front`](demo/front). The SDK configuration is located in [`demo/front/sdk-generator.json`](demo/front/sdk-generator.json).

## How fast is it?

On our internal test project, with 20 controllers and 80 routes, the full process takes 3 seconds (from a cold start) on a Core i7-8750H (6-core laptop CPU from 2018) to generate 84 file with 2246 lines of code.

The duration should be roughly proportional to the quantity of routes and DTOs you use in your application, although on very small applications in usually won't go below 2 seconds on such a CPU.

## Features

- Full support for idiomatic Nest.js modules and controllers
- Recursive extraction of types controllers depend on, including types located in `node_modules`
- Can extract classes, interfaces, enumerations and type aliases
- Fully compatible with WSL, even if packages are installed using symbolic links from Windows
- Compatible with alternative package managers like PNPM
- Extremely detailed output by default for easier debugging in case of errors
- Tree-shaking so the compiled code will only contain the methods you use from the generated SDK, no matter its size

## Limitations

nest-sdk-generator comes with a set of limitations which can find below:

1. nest-sdk-generator does not check if the source files compile correctly. Therefore, if you try to use a type that doesn't exist, the generation may still succeed although compiling the code would fail. In such case, the resulting output type is `any`.

2. A current limitation of nest-sdk-generator is that it finds a controller's module by looking for a `.module.ts` file in the current directory, and parent directories if none is found in the controller's one. This means controller files must be put under a module's directory, and two module files cannot be put in the same directory.

3. Types belonging to namespaces are currently not supported and will result in error in the generated code

4. Due to limitations of the TypeScript compiler, importing from the project's root (e.g. `import { SomeType } from "src/file.ts"` instead of `import { SomeType } from "../file.ts"`) will result in an `any` type at generation, because such types are not recognized when manipulating types. If you want to avoid this behaviour in Visual Studio Code, you can add `"typescript.preferences.importModuleSpecifier": "relative"` to your settings.

## Using the SDK

The SDK exposes several directories:

- One directory for each module in your Nest.js application, with inside one file for each controller belonging to this module
- `_types`, containing the types used by the controllers, with the same directory structure than in your original project

Each controller file exposes a simple record object with keys being your controller's methods' name. Each method takes the route's arguments (e.g. the identifier in `/users/get/:id`), the request's BODY (JSON) as well as the query parameters (e.g. `?something=...`).

Methods return a typed `Promise<>` with the original method's return type.

- If the requests succeeds and returns a valid JSON string, it is parsed and returned by the method
- If the requests fail or cannot be decoded correctly, the promise fails

## Architecture

nest-sdk-generator analyzes your Nest.js API using a provided configuration file, and produces a client-side SDK. This SDK is made of modules containing route methods that all call a central handler with the corresponding URI and parameters. The handler makes the request to the server and transmits the response. This is where you can customize the data to send to the server, if they need normalization, encryption, hashing, parsing, authentication, or anything else.

## Step-by-step generation tutorial

Generating a SDK is made in two steps:

- Creating a configuration file for the generator
- Performing the generation through `sdk-generator generate`

Let's suppose we have a monorepo, with our server being in `apps/api` and running at `http://localhost:3000`, while our frontend is located in `apps/front`. We have the following structure:

```
.
└── apps
    ├── api
    |   └── src
    |       └── index.ts
    └── front
        └── src
            └── index.ts
```

We want the SDK to be located in `apps/front/sdk`.

First, we must create a configuration file. Let's put it in `front/sdk-generator.json`:

```json
{
  "apiInputPath": "../server/src",
  "sdkOutput": "sdk",
  "sdkInterfacePath": "sdk-interface.ts"
}
```

Let's now generate the SDK:

```shell
sdk-generator apps/front/sdk-generator.json
```

We now have a `apps/front/sdk` directory with our SDK inside, and a default interface located in `apps/front/sdk-interface.ts`, which will handle the requests. It will only be generated if it doesn't exist, so you can edit it and commit in your repository without worrying about it being overwritten.

**NOTE:** You can disable this generation by setting the `generateDefaultSdkInterface` setting to `false` in the `sdk-generator.json` file.

#### Recommandations

In most cases, you should add the SDK's output path to your `.gitignore` and perform the generation automatically in your CI.

If you want to save time in the CI, you can save the generated SDK as an artifact and put it in the registry with the key being the hash of the server's source directory. This way, the SDK will only be rebuilt when the source directory changes.

## SDK usage

Let's suppose the Nest.js server has an `UserModule` module, containing an `UserController` controller with a `getOne(id: string): Promise<UserDTO>` method. We can use it from the SDK:

```typescript
import { userController } from '<sdk path>/userModule/userController'

const user = await userController.getOne({ id: 'some_id' })
// typeof user == UserDTO
```

Each method takes three arguments: the parameters (`:xxx` in the original method's route), the body's content, and the query (`?xxx=yyy`). The query is always optional, while the body is only optional if nothing or an empty object is expected. The parameters are only optional if no parameter, nor body, is expected.

#### Importing API types

It's also possible to manually import types the API depends on.

For instance, let's suppose `UserDTO` comes from a shared DTO package which is installed in our Nest.js API's directory under `node_modules/@project/dtos/user.d.ts`.

We can import it from the SDK like this:

```typescript
import { UserDTO } from '<sdk path>/_types/node_modules/@project/dtos/user.d'
```

It can then be used normally:

```typescript
import { userController } from '<sdk path>/userModule/userController'
import { UserDTO } from '<sdk path>/_types/node_modules/@project/dtos/user.d'

const user: UserDTO = await userController.getOne({ id: 'some_id' })
```

### External files

In some situations, some of the types you are importing may belong to an external directory than the provided API source directory. For instance, if you use a mono-repository, you may have your API in `apps/api` but your DTOs built as a package in `node_modules/@apps/dtos`. In such case, the files will be placed in a special directory in `_types` called `_externalX` where `X` is the depth level (the farest the exernal file is, the larger this number will be).

This will make no difference when using these types, but this is a special case where the types hierarchy isn't perfectly respected.

## Configuration options

Here is the list of the configuration options you can use in the JSON file:

| Option name                   | Default | Value type    | Description                                                                            |
| ----------------------------- | ------- | ------------- | -------------------------------------------------------------------------------------- |
| `apiInputPath`                | -       | `string`      | Path to your API's source folder (e.g. `apps/api/src`)                                 |
| `sdkOutput`                   | -       | `string`      | Path to generate the SDK at (e.g. `apps/front/src/sdk`)                                |
| `sdkInterfacePath`            | -       | `string`      | Path to the SDK interface (e.g. `apps/front/src/sdk-interface.ts`)                     |
| `magicTypes`                  | `[]`    | `MagicType[]` | Magic types (see below)                                                                |
| `jsonOutput`                  | `null`  | `string`      | Write the analyzer's output to a file                                                  |
| `jsonPrettyOutput`            | `null`  | `boolean`     | Prettify the output JSON if the option above is enabled                                |
| `prettierConfig`              | `null`  | `string`      | Use a specific Prettier config (otherwise will try to find one in a parent directory)  |
| `prettify`                    | `true`  | `boolean`     | Set to `false` to disable SDK files prettifying                                        |
| `overwriteOldOutputDir`       | `true`  | `boolean`     | Set to `false` to not remove the old SDK directory when re-generating it               |
| `generateDefaultSdkInterface` | `true`  | `boolean`     | Set to `false` to not generate a default SDK interface when it does not exist yet      |
| `generateTimestamps`          | `true`  | `boolean`     | Set to `false` to not put the timestamp in the generated SDK files                     |
| `rejectIfNodeModules`         | `true`  | `boolean`     | Set to `false` to force generating the SDK even if a `node_modules` directory is found |
| `verbose`                     | `false` | `boolean`     | Display verbose informations                                                           |
| `noColor`                     | `false` | `boolean`     | Disable colored output                                                                 |

## Frequently-asked questions

### Does this replace Swagger?

No, nest-sdk-generator only generates a client-side SDK to make requests more easily to the server ; it doesn't generate a documentation by itself. Although all routes are organized with their original name and split across controllers and modules the same way they were in the API, that doesn't make a full documentation in itself.

### I have a GraphQL API, what can this project do for me?

Unfortunately, nest-sdk-generator isn't compatible with GraphQL API, and for a good reason: the whole point of this project is to bring structural typing to an API, but GraphQL already provides that. So there would be no point in this tool being compatible with GraphQL projects.

### Does the SDK has any performance overhead?

Absolutely not. The generated SDK is only made of simple objets that will call the handler you provided through the interface script, and the said script will be in charge of making the request (with `fetch` by default). This means that no kind of data transformation/conversion happens behind-the-scenes.

### How do I update the SDK once I change the API's source code?

You simply run the same shell command you used to generate the source code originally. There isn't a special subcommand for it, as it will simply delete the old SDK and replace it with the new one.

### Is the SDK documented?

Each file in the SDK uses a generic documentation, including the exact route model for route methods. This means you will be able to check what route is called by which method each time.

Here is a quick glance at a generated file sample:

```ts
// ...
/// Parent module: articleModule
/// Controller: "articleController" registered as "article" (5 routes)

// ...

export default {
  // GET @ /article
  getAll(params: {} = {}, body: {} = {}, query: {} = {}): Promise<Article[]> {
    return request('GET', `/article`, query, body)
  },

  // GET @ /article/:slug
  getOne(
    params: { slug: string },
    body: {} = {},
    query: {} = {},
  ): Promise<Article> {
    return request('GET', `/article/${params.slug}`, query, body)
  },

  // ...
}
```

### Can I add header or other data on-the-fly when making requests?

All of the SDK's methods use a central handler which calls a function you provided, where you can absolutely everything you can. You are in charge of making the requests thanks to the provided URI and query/body parameters, which means you can add, edit or remove whatever data you want.

### Is there a way to log the requests or responses somewhere?

All of the SDK's methods use a central handler which calls a function you provided, where you can do absolutely everything you can. You are in charge of making 
the requests thanks to the provided URI and query/body parameters, which means you can write the requests and responses to the local storage, send them to a log server, or anything else.

### Does the API server needs to be running to generate a SDK?

No, the SDK is generated by analyzing the source code of your API, which means you don't need a server running for this.

### Can I fork this project to make my own version of it?

Absolutely, that's what the MIT license is for. Although, if you could get in touch with us to indicate what changes you made to the generator it would be hugely helpful to improve it on our side ;)

### Can I use this project in commercial software?

Absolutely, the MIT license allows you to do that without any royalties or particular constraint.

If you use this project to produce any kind of program, be it paid or not, we'd love to hear about it! Feel free to get in touch with us at [contact@lonestone.studio](mailto:contact@lonestone.studio) to tell us about your projects, so we can improve our tool even more with additional real-use cases.

## License

This project is published under the terms of the [MIT License](LICENSE.md).
