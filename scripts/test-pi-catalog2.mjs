import { loadRegistry, getProviderModels } from '../dist/chunk-BTGODHIT.js';
import { cachedModelToLocal } from '../dist/chunk-B6HWTWRR.js';
import { shouldHideModel } from '../dist/chunk-B6HWTWRR.js';

const registry = loadRegistry();

for (const provider of registry.providers) {
  if (!provider.enabled) continue;
  const models = getProviderModels(provider);
  console.log(`\n${provider.id} (${provider.name}):`);
  for (const cached of models) {
    const local = cachedModelToLocal(cached, provider);
    if (!local) {
      console.log(`  ${cached.id}: null (filtered out by cachedModelToLocal)`);
      continue;
    }
    const hidden = shouldHideModel({ providerId: provider.id, modelId: local.id, agent: 'pi' });
    console.log(`  ${local.id}: hidden=${hidden}`);
  }
}
