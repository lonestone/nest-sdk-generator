# Nest.js SDK Generator

The Nest.js SDK Generator is a tool that aims to build a SDK for client applications to consume a Nest.js server's API.

The project is split in two parts:

* The **analyzer** looks for all modules, controllers, methods and types in the Nest.js server, and builds a JSON schema containing all informations
* The **generator** takes this JSON schema and generates a directory containing the SDK

## Features

* Full support for idiomatic Nest.js modules and controllers
* Recursive extraction of types controllers depend on, including types located in `node_modules`
* Can extract classes, interfaces, enumerations and type aliases
* Supports inheritance and implementation constraints (`extends X` and `implements Y`)
* Built with tree-shaking in mind
* Fully compatible with WSL, even if packages are installed using symbolic links from Windows
* Compatible with alternative package managers like PNPM
* SDK makes requests through a shared, configurable Axios instance
* Minimal configuration (only the API's url is mandatory)
* Less than 2k lines of code unminified
* Complete logging options
* Extremely detailed output by default for easier debugging in case of errors

## Usage