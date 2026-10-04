import { listVisibleOAuthTemplates, init_provider_templates } from '../dist/chunk-64APTK44.js';
import { loadRegistry } from '../dist/chunk-BTGODHIT.js';

init_provider_templates();

const registry = loadRegistry();
const configuredIds = registry.providers.map(p => p.id);

const oauthTemplates = listVisibleOAuthTemplates(configuredIds);
console.log('Visible OAuth templates:');
for (const t of oauthTemplates) {
  if (['nous', 'pollinations', 'kiro', 'atuin', 'zai', 'zhipu', 'poolside'].includes(t.id)) {
    console.log(`  ${t.id}: ${t.name} (${t.npm}) - auth: ${t.authType}${t.authMethods ? '/' + t.authMethods.join('/') : ''}`);
  }
}
