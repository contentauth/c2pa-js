import { execSync } from 'node:child_process';
import { PromiseExecutor } from '@nx/devkit';
import { BuildExecutorSchema } from './schema';
import { join } from 'path';

const runExecutor: PromiseExecutor<BuildExecutorSchema> = async (options, context) => {
  console.log('Executor ran for Build', options);

  const projectPath = join(context.root, options['project-dir'])
  
  try {
    execSync('wasm-pack build --release --target web --scope contentauth', { cwd: projectPath })

    return {
      success: true
    }
  } catch (error) {
    console.error('Error building release:', error);

    return {
      success: false,
    };
  }
};

export default runExecutor;