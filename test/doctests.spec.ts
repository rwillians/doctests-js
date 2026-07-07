import { doctest } from '../src';

doctest({
  include: ['examples/**/*.ts'],
  exclude: ['examples/**/*.d.ts', 'examples/**/*.{spec,test}.ts'],
});
