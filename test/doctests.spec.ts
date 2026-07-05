import { doctest } from '../src';

doctest({
  include: ['test/fixtures/*.ts'],
  exclude: [],
});
