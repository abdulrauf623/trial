const [major] = process.versions.node.split('.').map(Number);

if (major !== 20) {
  console.error(
    [
      '[mobile] Unsupported Node.js version for this Expo app.',
      '[mobile] Required: Node 20.x (see .nvmrc = 20.11.0).',
      `[mobile] Current: Node ${process.version}.`,
      '[mobile] Run: nvm use 20.11.0',
    ].join('\n')
  );
  process.exit(1);
}

