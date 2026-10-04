import { addProviderFromTemplate } from '../dist/chunk-TQF2MF2E.js';
import { loadRegistry, saveRegistry } from '../dist/chunk-BTGODHIT.js';
import { getTemplateById } from '../dist/provider-templates-EP6LK7OA.js';

const template = getTemplateById('nous');
console.log('Nous template:', template);

const registry = loadRegistry();
console.log('Current providers:', registry.providers.map(p => p.id));

if (!registry.providers.find(p => p.id === 'nous')) {
  const result = await addProviderFromTemplate(template, 'test-key', {});
  console.log('Add result:', result);
} else {
  console.log('nous already exists');
}
