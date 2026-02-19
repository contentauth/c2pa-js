/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { PromiseExecutor } from '@nx/devkit';
import { TestExecutorSchema } from './schema.js';
import { $, path, ProcessOutput } from 'zx';

const runExecutor: PromiseExecutor<TestExecutorSchema> = async (
  options,
  context
) => {
  const projectPath = path.join(context.root, options['project-dir']);
  const $$ = $({ cwd: projectPath });

  try {
    await $$`wasm-pack test --headless --chrome`;

    return {
      success: true
    };
  } catch (e: unknown) {
    if (e instanceof ProcessOutput) {
      console.error(e.stdout);
    } else {
      console.error('Error running tests', e);
    }

    return {
      success: false
    };
  }
};

export default runExecutor;
