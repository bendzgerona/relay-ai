// pi.ts — relay-ai pi: launch Pi coding agent with registry providers

import pc from 'picocolors';
import * as p from '@clack/prompts';
import { spawn } from 'cross-spawn';
import { findPiBinary, buildPiArgs, launchPi, getInstalledPiVersion } from './pi/launch.js';
import { fetchProviderCatalog, providersForPicker, resolveLocalProviderApiKey } from './provider-catalog.js';
import { loadPreferences, recordLaunchSelection } from './config.js';
import { needsFirstRunSetup, runFirstRunWizard } from './first-run.js';
import { findProviderAndModel, planLaunchWizard, launchAllowsNonTty, wantsCleanAgentStdout } from './launch-target.js';
import { resolveOrCollectApiKey } from './key-setup.js';
import { loadPreferences as loadPrefs } from './config.js';
import { detectConflicts } from './env.js';
import { pickerRefresh } from './picker-refresh.js';
import { setAgentStdoutMode, isAgentStdoutMode } from './agent-io.js';

function piHelpText(): string {
  return `${pc.bold('relay-ai pi')} — launch Pi coding agent with registry providers

${pc.bold('Usage:')}
  relay-ai pi [options] [pi-flags]
  relay-ai pi --help
  relay-ai pi --version

${pc.bold('Options:')}
  --trace      Write proxy debug logs to ~/.relay-ai/logs/ and show errors on exit
  --provider   Provider id (skip wizard when paired with --model or non-interactive)
  --model      Model id (skip wizard when paired with --provider or non-interactive)
  --dry-run    Print launch plan without starting Pi
  --help       Show this help
  --version    Show version

${pc.bold('Description:')}
  Picks a provider and model from ~/.relay-ai/providers.json, sets up the required
  environment variables, and launches Pi coding agent with the selected provider/model.

${pc.bold('Prerequisites:')}
  Pi coding agent installed (pi on PATH or in ~/.local/bin/pi)

${pc.bold('Passing flags to Pi:')}
  Add Pi flags directly — no "--" separator needed.
  relay-ai manages --provider and --model; other flags go to Pi.

${pc.bold('Examples:')}
  relay-ai pi
  relay-ai pi --provider nvidia --model meta/llama-3.2-11b-vision-instruct
  relay-ai pi --provider zai --model glm-4.7-flash
  relay-ai pi --provider kilo --model kilo-auto/free
  relay-ai pi --dry-run
  relay-ai pi --help
${pc.bold('Providers:')}
  When you have saved favorites via ${pc.cyan('relay-ai models')}, Pi can cycle
  through your favorite models with ${pc.cyan('--models')} flag on launch.
  Add favorites with ${pc.cyan('relay-ai models')}.
`;
}

async function runPiCommand(parsed: { claudeArgs: string[]; trace: boolean; launchProvider?: string; launchModel?: string; dryRun: boolean; showHelp?: boolean; showVersion?: boolean }): Promise<number> {
  const { dryRun, trace, launchProvider, launchModel } = parsed;

  // Prerequisite: pi binary
  const piPath = findPiBinary();
  if (!piPath) {
    console.error(pc.red('\nError: pi binary not found on PATH.\n'));
    console.error('Install Pi coding agent: https://pi.dev');
    return 1;
  }

  const prefs = loadPrefs();
  const conflicts = detectConflicts();

  // Pi doesn't have a favorites switch menu like Codex/Claude
  // It uses --models flag for cycling favorites
  const favorites = prefs.favoriteModels ?? [];

  // Plan the launch
  const launchPlan = planLaunchWizard({
    explicit: { providerId: launchProvider, modelId: launchModel },
    childArgs: parsed.claudeArgs || [],
    agent: 'pi' as const, // @ts-expect-error
    prefs,
  });

  if (launchPlan.error) {
    console.error(pc.red(`\nError: ${launchPlan.error}\n`));
    return 1;
  }

  if (!launchAllowsNonTty(launchPlan, false) && !process.stdin.isTTY) {
    console.error(
      pc.red('relay-ai pi requires an interactive terminal (or use --provider and --model for non-interactive launch).'),
    );
    return 1;
  }

  if (!launchPlan.skip && await needsFirstRunSetup()) {
    // For now, skip first-run wizard for Pi
  }

  // Fetch provider catalog
  const catalogSpinner = p.spinner();
  catalogSpinner.start('Loading your providers...');
  let catalog;
  try {
    catalog = await fetchProviderCatalog({ agent: 'pi' as const });
    catalogSpinner.stop('');
  } catch (err) {
    catalogSpinner.stop('');
    console.error(pc.red(String(err instanceof Error ? err.message : err)));
    return 1;
  }

  const allProviders = providersForPicker(catalog);
  if (allProviders.length === 0) {
    console.error(pc.red('No providers available. Run relay-ai providers add to get started.'));
    return 0;
  }

  // Resolve provider and model
  let activeProvider: any;
  let selectedModel: any;

  if (launchPlan.skip) {
    const { providerId: explicitProvider, modelId: explicitModel } = launchPlan.target!;
    activeProvider = allProviders.find(lp => lp.id === explicitProvider);
    if (!activeProvider) {
      console.error(pc.red(`Provider not found: ${explicitProvider}`));
      return 1;
    }
    const model = activeProvider.models.find(m => m.id === explicitModel);
    if (!model) {
      console.error(pc.red(`Model not found: ${explicitModel} in provider ${explicitProvider}`));
      return 1;
    }
    selectedModel = model;
  } else {
    // Interactive selection
    let currentInitialProvider: string | undefined;
    while (true) {
      activeProvider = allProviders.find(lp => lp.id === launchPlan.target?.providerId);
      
      if (!activeProvider) {
        // Provider picker
        const providerChoices = allProviders.map(lp => ({
          value: lp.id,
          label: lp.name,
          hint: `${lp.models.length} models`,
        }));

        const providerChoice = await p.select({
          message: 'Select provider:',
          options: providerChoices,
          initialValue: currentInitialProvider,
        });

        if (p.isCancel(providerChoice)) return 0;
        
        activeProvider = allProviders.find(lp => lp.id === providerChoice)!;
        currentInitialProvider = activeProvider.id;
      }

      // Model picker
      const pickerProvider = activeProvider;
      const pickedModelResult = await pickPiModel(activeProvider, p);
      
      if (pickedModelResult === 'back') {
        currentInitialProvider = activeProvider.id;
        continue;
      }
      if (!pickedModelResult) return 0;
      selectedModel = pickedModelResult;
      break;
    }
  }

  // Resolve API key for the provider
  const launchApiKey = await resolveLocalProviderApiKey(activeProvider);
  if (!launchApiKey?.trim()) {
    console.error(pc.red(`No credential found for ${activeProvider.name}. Add a key with relay-ai providers or set the appropriate API_KEY env var.`));
    return 1;
  }

  // Dry run - print launch plan
  if (parsed.dryRun) {
    console.log('');
    console.log(pc.bold(pc.cyan('  DRY RUN — would execute:')));
    console.log('');
    console.log(`  ${pc.bold('Provider:')}  ${activeProvider.name}`);
    console.log(`  ${pc.bold('Model:')}     ${selectedModel.id}`);
    console.log(`  ${pc.bold('Provider:')}  ${activeProvider.name}`);
    console.log(`  ${pc.bold('API Key:')}   ${launchApiKey.slice(0, 8)}...`);
    console.log('');
    console.log(pc.dim('  (dry run complete — Pi was NOT launched)'));
    console.log('');
    return 0;
  }

  // Build environment for Pi
  const childEnv = buildPiChildEnv(activeProvider, selectedModel, launchApiKey);
  
  // Build Pi arguments
  const piArgs = buildPiArgs(activeProvider.id, selectedModel.id, parsed.claudeArgs || []);

  // Launch Pi
  console.log(pc.green(`Launching Pi with ${activeProvider.name} / ${selectedModel.id}...`));
  
  return new Promise((resolve) => {
    const child = spawn(piPath, piArgs, {
      stdio: 'inherit',
      env: { ...process.env, ...childEnv },
    });

    child.on('exit', (code) => {
      resolve(code ?? 0);
    });

    child.on('error', (err) => {
      console.error(pc.red(`Failed to launch Pi: ${err.message}`));
      resolve(1);
    });
  });
}

async function pickPiModel(provider: any, p: any): Promise<any> {
  const models = provider.models;
  
  if (models.length > 50) {
    const searchInput = await p.text({
      message: `Search ${provider.name} models (${models.length} available):`,
      placeholder: 'e.g. flash 3.6, claude, llama',
    });
    if (p.isCancel(searchInput)) return 'back';
    const filtered = models.filter(m => 
      m.id.toLowerCase().includes(searchInput.toLowerCase()) ||
      (m.name && m.name.toLowerCase().includes(searchInput.toLowerCase()))
    );
    if (filtered.length === 0) {
      p.log.warn('No models match — try a different search');
      return 'back';
    }
    return pickFromList(filtered, p);
  }
  
  return pickFromList(models, p);
}

function pickFromList(models: any[], p: any): Promise<any> {
  const options = models.map(m => {
    const hint = m.contextWindow ? `${m.contextWindow / 1000}k ctx` : '';
    return {
      value: m,
      label: m.name || m.id,
      hint,
    };
  });
  return p.select({
    message: 'Select model:',
    options,
  });
}

function buildPiChildEnv(provider: any, model: any, apiKey: string): NodeJS.ProcessEnv {
  const env = { ...process.env };
  
  // Set the API key based on provider
  switch (provider.id) {
    case 'nvidia':
      env.NVIDIA_API_KEY = apiKey;
      break;
    case 'zai':
      env.ZAI_API_KEY = apiKey;
      break;
    case 'mistral':
      env.MISTRAL_API_KEY = apiKey;
      break;
    case 'cohere':
      env.COHERE_API_KEY = apiKey;
      break;
    case 'kenari':
      env.KENARI_API_KEY = apiKey;
      break;
    case 'poolside':
      env.POOLSIDE_API_KEY = apiKey;
      break;
    case 'openai':
      env.OPENAI_API_KEY = apiKey;
      break;
    case 'anthropic':
      env.ANTHROPIC_API_KEY = apiKey;
      break;
    case 'google':
      env.GEMINI_API_KEY = apiKey;
      break;
    case 'openrouter':
      env.OPENROUTER_API_KEY = apiKey;
      break;
    case 'deepseek':
      env.DEEPSEEK_API_KEY = apiKey;
      break;
    case 'ollama':
      // Ollama doesn't need API key
      break;
    case 'kilo':
      env.KILO_API_KEY = apiKey;
      break;
    case 'openai-oauth':
      env.OPENAI_API_KEY = apiKey;
      break;
    case 'github-copilot':
      env.GITHUB_COPILOT_TOKEN = apiKey;
      break;
    case 'xai':
      env.XAI_API_KEY = apiKey;
      break;
    case 'xai-oauth':
      env.XAI_API_KEY = apiKey;
      break;
    case 'openai-oauth':
      env.OPENAI_API_KEY = apiKey;
      break;
    case 'anthropic':
      env.ANTHROPIC_API_KEY = apiKey;
      break;
  }
  
  return env;
}

function buildPiArgs(providerId: string, modelId: string, extraArgs: string[]): string[] {
  // Pi uses --provider and --model directly
  const args = ['--provider', providerId, '--model', modelId, ...extraArgs];
  return args;
}

export { findPiBinary, buildPiArgs, launchPi, getInstalledPiVersion } from './pi/launch.js';
export { runPiCommand, piHelpText };