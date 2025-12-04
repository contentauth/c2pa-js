# Testbed for c2pa-js

This directory contains code for a minimal website that displays Content Credentials using c2pa-web as a sandbox for local development.

## Building

NOTE: These are the instructions for building and running on macOS.  Other operating systems may require different steps.

Prerequisites:
- Brew
- Rust
- pnpm

Enter these commands to set up the application:

```
brew install llvm
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.105
npm install -D vite
pnpm install
```

Then build the app by entering this command:

```
CC=/opt/homebrew/opt/llvm/bin/clang AR=/opt/homebrew/opt/llvm/bin/llvm-ar pnpm exec nx build c2pa-wasm
```


pnpm exec vite