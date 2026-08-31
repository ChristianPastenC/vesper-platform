/* eslint-disable */
const fs = require('fs');
const path = require('path');

const replaceInFile = (filePath, replacements) => {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { from, to } of replacements) {
    content = content.replace(from, to);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated: ${filePath}`);
};

// 1. AppProvider.tsx
replaceInFile(path.join(__dirname, 'src/providers/app/AppProvider.tsx'), [
  { from: /from '\.\.\/core/g, to: "from '../../core" },
  { from: /from '\.\.\/store/g, to: "from '../../store" },
  {
    from: /from '\.\/useSovereignInitializer'/g,
    to: "from '../sovereign/useSovereignInitializer'",
  },
  { from: /from '\.\/SovereignClientContext'/g, to: "from '../sovereign/SovereignClientContext'" },
]);

// 2. AppProvider.test.tsx
replaceInFile(path.join(__dirname, 'src/providers/app/AppProvider.test.tsx'), [
  { from: /jest\.mock\('\.\.\/core/g, to: "jest.mock('../../core" },
  { from: /jest\.mock\('\.\.\/store/g, to: "jest.mock('../../store" },
  {
    from: /jest\.mock\('\.\/useSovereignInitializer'/g,
    to: "jest.mock('../sovereign/useSovereignInitializer'",
  },
  { from: /from '\.\.\/store/g, to: "from '../../store" },
  {
    from: /from '\.\/useSovereignInitializer'/g,
    to: "from '../sovereign/useSovereignInitializer'",
  },
]);

// 3. useSovereignInitializer.ts
replaceInFile(path.join(__dirname, 'src/providers/sovereign/useSovereignInitializer.ts'), [
  { from: /from '\.\.\/core/g, to: "from '../../core" },
  { from: /from '\.\.\/store/g, to: "from '../../store" },
]);

// 4. useSovereignInitializer.test.ts
replaceInFile(path.join(__dirname, 'src/providers/sovereign/useSovereignInitializer.test.ts'), [
  { from: /jest\.mock\('\.\.\/core/g, to: "jest.mock('../../core" },
  { from: /jest\.mock\('\.\.\/store/g, to: "jest.mock('../../store" },
  { from: /from '\.\.\/store/g, to: "from '../../store" },
]);

// 5. SovereignClientContext.test.tsx
replaceInFile(path.join(__dirname, 'src/providers/sovereign/SovereignClientContext.test.tsx'), [
  // no external internal imports to fix that start with ../ because it only imports from @vesper-core/ghost-ledger and ./SovereignClientContext
]);

// EXTERNALS:
const externalReplacements = [
  {
    from: /from '\.\.\/\.\.\/providers\/SovereignClientContext'/g,
    to: "from '../../providers/sovereign/SovereignClientContext'",
  },
  {
    from: /from '\.\.\/\.\.\/\.\.\/providers\/SovereignClientContext'/g,
    to: "from '../../../providers/sovereign/SovereignClientContext'",
  },
  {
    from: /jest\.mock\('\.\.\/\.\.\/providers\/SovereignClientContext'/g,
    to: "jest.mock('../../providers/sovereign/SovereignClientContext'",
  },
  {
    from: /jest\.mock\('\.\.\/\.\.\/\.\.\/providers\/SovereignClientContext'/g,
    to: "jest.mock('../../../providers/sovereign/SovereignClientContext'",
  },
];

const externalFiles = [
  'src/__tests__/integration/auth.integration.test.ts',
  'src/__tests__/integration/checkout.integration.test.ts',
  'src/core/auth/useAuthenticatedRequest.test.ts',
  'src/core/auth/useAuthenticatedRequest.ts',
  'src/features/auth/hooks/useSovereignLogin.test.ts',
  'src/features/auth/hooks/useSovereignLogin.ts',
  'src/features/payment/hooks/useSovereignCheckout.test.ts',
  'src/features/payment/hooks/useSovereignCheckout.ts',
];

externalFiles.forEach((f) => replaceInFile(path.join(__dirname, f), externalReplacements));

// 6. App.tsx
replaceInFile(path.join(__dirname, 'App.tsx'), [
  { from: /from '\.\/src\/providers\/AppProvider'/g, to: "from './src/providers/app/AppProvider'" },
]);

// 7. export index.ts
fs.writeFileSync(
  path.join(__dirname, 'src/providers/index.ts'),
  `
export * from './app/AppProvider';
export * from './sovereign/SovereignClientContext';
export * from './sovereign/useSovereignInitializer';
`.trim() + '\n',
  'utf8',
);

console.log('All done');
