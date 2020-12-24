# Nest.js SDK Generator

The Nest.js SDK Generator is a tool that aims to build a SDK for client applications to consume a Nest.js server's API.

The project is split in two parts:

- The **analyzer** looks for all modules, controllers, methods and types in the Nest.js server, and builds a JSON schema containing all informations
- The **generator** takes this JSON schema and generates a directory containing the SDK

**Table of contents:**

- [Features](#features)
- [Instructions](#instructions)
- [Using the SDK](#using-the-sdk)
- [Step-by-step generation tutorial](#step-by-step-generation-tutorial)
    - [Typing the configuration object](#typing-the-configuration-object)
    - [Exporting configuration from an existing file](#exporting-configuration-from-an-existing-file)
    - [Clean the output directory automatically](#clean-the-output-directory-automatically)
    - [Recommandations](#recommandations)
- [SDK usage](#sdk-usage)
    - [Importing API types](#importing-api-types)

## Features

- Full support for idiomatic Nest.js modules and controllers
- Recursive extraction of types controllers depend on, including types located in `node_modules`
- Can extract classes, interfaces, enumerations and type aliases
- Supports inheritance and implementation constraints (`extends X` and `implements Y`)
- Built with tree-shaking in mind
- Fully compatible with WSL, even if packages are installed using symbolic links from Windows
- Compatible with alternative package managers like PNPM
- SDK makes requests through a shared, configurable Axios instance
- Minimal configuration (only the API's url is mandatory)
- Less than 2k lines of code unminified
- Complete logging options
- Extremely detailed output by default for easier debugging in case of errors

## Instructions

1. Create a configuration file exporting your API's url (`{ apiUrl: '<some_url>' }`)
2. Run `nsdkgen <nest api path> <sdk output path> -c <path of config file relative to sdk output path>`

**WARNING:** The SDK generator does not check if the source files compile correctly. Therefore, if you try to use a type that doesn't exist, the generation may still succeed although compiling the code would fail. In such case, the resulting output type is `any`.

**WARNING:** A current limitation of the SDK generator is that it finds a controller's module by looking for a `.module.ts` file in the current directory, and parent directories if none is found in the controller's one. This means controller files must be put under a module's directory, and two module files cannot be put in the same directory.

## Using the SDK

The SDK exposes several directories:

- One directory for each module in your Nest.js application, with inside one file for each controller belonging to this module
- `_types`, containing the types used by the controllers, with the same directory structure than in your original project

Each controller file exposes a simple record object with keys being your controller's methods' name. Each method takes the route's arguments (e.g. the identifier in `/users/get/:id`), the request's BODY (JSON) as well as the query parameters (e.g. `?something=...`).

Methods return a typed `Promise<>` with the original method's return type.

- If the requests succeeds and returns a valid JSON string, it is parse and returned by the method
- If the requests fail or cannot be decoded correctly, the promise fails with an `AxiosResponse` object

**WARNING:** As TypeScript does not allow derive macros or interface validations, although methods will return an object typed like the original method, no verification is performed when the response is received to ensure weither the response's JSON content matches the intended interface.

## Step-by-step generation tutorial

Generating a SDK is made in two steps:

- Creating a configuration file for the generator
- Performing the generation through `nsdkgen generate`

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

First, we must create a configuration file. Let's put it in `apps/front/sdk-config.ts`:

```typescript
export default {
  apiUrl: 'http://localhost:3000',
}
```

Given the SDK will be located in `apps/front/sdk`, our configuration file is, relatively to the SDK, `../sdk-config.ts`.

Let's now generate the SDK:

```shell
nsdkgen generate apps/api apps/front/sdk -c ../sdk-config.ts
```

We now have a `apps/front/sdk` directory with our SDK inside!

#### Typing the configuration object

Note, if you want to get strict typing for the configuration object, you can generate the SDK a first time and then add in your file:

```typescript
import { CentralConfig } from './sdk/central'

const config: CentralConfig = {
  apiUrl: 'http://localhost:3000',
}

export default config
```

#### Exporting configuration from an existing file

It's also possible to export the object from an existing file, using the `-n` option which indicates to not get the configuration from the file's `default` export, but from a named export:

```typescript
import { CentralConfig } from './sdk/central'

export const config: CentralConfig = {
  apiUrl: 'http://localhost:3000',
}
```

```shell
nsdkgen generate apps/api apps/front/sdk -c ../sdk-config.ts -n config
```

#### Clean the output directory automatically

By default, generating the SDK requires the output path to not exist yet, in order to avoid garbage files from a previous generation.

You can force automatic removal of the previous output directory with the `-r` parameter.

Note that the removal will fail if either `nsdk.json` or `central.ts` are not found, as these are files always generated for the SDK, in order to avoid removing the directory if you specified a wrong path by accident.

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
