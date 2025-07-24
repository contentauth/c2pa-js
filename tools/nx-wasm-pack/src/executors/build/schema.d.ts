export interface BuildExecutorSchema {
  'project-dir': string;
  profile?: 'dev' | 'profiling' | 'release';
}
