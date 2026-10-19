import { createAgeStoreWithOperations } from '../../dist/internal/age-files.js';
import { nodeFileOperations } from '../../dist/internal/file-operations.js';

const [rootPath, recipient, phase] = process.argv.slice(2);
async function checkpoint() {
  process.send({ checkpoint: phase });
  setInterval(() => {}, 1000);
  await new Promise(() => {});
}
const operations = {
  ...nodeFileOperations,
  async rename(source, destination) {
    if (phase === 'before') await checkpoint();
    await nodeFileOperations.rename(source, destination);
    if (phase === 'after') await checkpoint();
  },
};
const store = await createAgeStoreWithOperations({ rootPath, recipients: [recipient], identityProvider: async () => [] }, operations);
await store.setValue('api-token', 'synthetic-crash-value');
