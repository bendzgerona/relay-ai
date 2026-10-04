import { loadRegistry } from '../dist/chunk-BTGODHIT.js';

const registry = loadRegistry();
for (const p of registry.providers) {
  const hasModels = p.modelsCache?.models?.length > 0;
  console.log(`${p.id}: enabled=${p.enabled}, authRef=${p.authRef}, hasModelsCache=${!!p.modelsCache}, hasModels=${hasModels}, modelCount=${p.modelsCache?.models?.length || 0}`);
}
