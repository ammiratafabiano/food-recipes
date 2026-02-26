const path = require('path');

module.exports = {
  'frontend/src/**/*.{ts,html}': (absolutePaths) => {
    const cwd = process.cwd();
    const frontendDir = path.join(cwd, 'frontend');
    const relativePaths = absolutePaths.map((f) => path.relative(frontendDir, f));
    return [
      `prettier --write ${absolutePaths.join(' ')}`,
      `cd frontend && npx eslint --fix ${relativePaths.join(' ')}`,
    ];
  },
  'frontend/src/**/*.scss': ['prettier --write'],
  'backend/src/**/*.ts': (absolutePaths) => {
    const cwd = process.cwd();
    const backendDir = path.join(cwd, 'backend');
    const relativePaths = absolutePaths.map((f) => path.relative(backendDir, f));
    return [
      `prettier --write ${absolutePaths.join(' ')}`,
      `cd backend && npx eslint --fix ${relativePaths.join(' ')}`,
    ];
  },
};
