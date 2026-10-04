import { fetchProviderCatalog } from '../dist/chunk-B6HWTWRR.js';

async function test() {
  const catalog = await fetchProviderCatalog({ agent: 'pi' });
  console.log('Catalog:');
  for (const p of catalog) {
    console.log(`  ${p.id}: ${p.name} - ${p.models.length} models`);
  }
}

test();
