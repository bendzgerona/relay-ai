import { loadRegistry, saveRegistry } from '../dist/chunk-BTGODHIT.js';
import { getTemplateById } from '../dist/provider-templates-EP6LK7OA.js';

const registry = loadRegistry();
console.log('Current providers:', registry.providers.map(p => p.id));

const providersToAdd = ['nous', 'pollinations', 'kiro', 'atuin', 'poolside'];

for (const id of providersToAdd) {
  if (registry.providers.find(p => p.id === id)) {
    console.log(`${id}: already exists`);
    continue;
  }
  
  const template = getTemplateById(id);
  if (!template) {
    console.log(`${id}: template not found`);
    continue;
  }
  
  const provider = {
    id: template.id,
    templateId: template.id,
    name: template.name,
    enabled: true,
    authRef: 'keyring:' + id,
    api: {
      npm: template.npm,
      baseUrl: template.defaultBaseUrl,
    },
    addedAt: new Date().toISOString(),
    authType: template.authType,
    modelsCache: { models: [], fetchedAt: Date.now() },
  };
  
  registry.providers.push(provider);
  console.log(`${id}: added to registry`);
}

saveRegistry(registry);
console.log('Saved!');
