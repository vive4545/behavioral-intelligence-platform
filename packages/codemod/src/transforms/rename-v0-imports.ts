import { Transform } from 'jscodeshift';

const transform: Transform = (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Example: Rename 'oldHook' to 'newHook'
  root.find(j.Identifier, { name: 'useOldSession' })
    .forEach(path => {
      j(path).replaceWith(j.identifier('useSession'));
    });

  return root.toSource();
};

export default transform;
