# C2PA Node.js library

The [c2pa-node-v2](https://github.com/contentauth/c2pa-node-v2) repository implements a Node.js API that can:
- Read and validate C2PA data from media files in supported formats.
- Add signed manifests to media files in supported formats.

**WARNING**: This is an early version of this library, and there may be bugs and unimplemented features.

## Prerequisites

To use the C2PA Node library, you must install:
- A [supported version of Node](https://github.com/neon-bindings/neon#platform-support).
- [Rust](https://www.rust-lang.org/tools/install).

If you need to manage multiple versions of Node on your machine, use a tool such as [nvm](https://github.com/nvm-sh/nvm).

## Installation

### Installing for use in an app

Using npm:

```sh
$ npm install @contentauth/c2pa-node
```

Using Yarn:

```sh
$ yarn add @contentauth/c2pa-node
```

Using pnpm:

```sh
$ pnpm add @contentauth/c2pa-node
```

This command will download precompiled binaries for the following systems:

- Linux x86_64
- Linux aarch64 (ARM)
- macOS aarch64 (Apple Silicon)
- macOS x86_64 (Intel Mac)
- Windows x86
- Windows ARM

All other platforms require building a custom binary as described below, since the `postinstall` step builds the Rust library into a native Node.js module on your machine.
