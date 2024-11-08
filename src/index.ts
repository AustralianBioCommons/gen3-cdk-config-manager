import { SSMClient, PutParameterCommand, GetParameterCommand } from "@aws-sdk/client-ssm";
import { SecretsManagerClient, CreateSecretCommand, GetSecretValueCommand, DescribeSecretCommand, RestoreSecretCommand } from "@aws-sdk/client-secrets-manager";
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Config, IamRolesConfig, ClusterConfig } from "@australianbiocommons/gen3-cdk-types";


interface Arguments {
  configDir: string;
  environments: string[];
  updateenv: boolean;
  updatenetwork: boolean;
}

const region = process.env.AWS_REGION || 'ap-southeast-2';
const ssmClient = new SSMClient({ region });
const secretsManagerClient = new SecretsManagerClient({ region });

// Command-line argument parsing
const argv: Arguments = yargs(hideBin(process.argv))
  .option('configDir', {
    alias: 'c',
    type: 'string',
    description: 'Path to the configuration directory',
    default: '../.secrets',
  })
  .option('environments', {
    alias: 'e',
    type: 'array',
    description: 'List of environments to process',
    demandOption: true, // Make it required
  })
  .option('updateenv', {
    type: 'boolean',
    description: 'Overwrite existing parameters in SSM',
    default: false,
  })
  .option('updatenetwork', {
    type: 'boolean',
    description: 'Overwrite existing parameters in SSM',
    default: false,
  })
  .help()
  .argv as Arguments;

// Retrieve command-line arguments
const environments = argv.environments;
const overwrite = argv.updateenv;
const updateNetwork = argv.updatenetwork;

const configDir = path.resolve(__dirname, argv.configDir);

console.log(configDir)
// Load configuration files using the resolved configDir
const jsonConfigPath = path.join(configDir, 'config.yaml');
const yamlConfigPath = path.join(configDir, 'iamRolesConfig.yaml');
const clusterConfigPath = path.join(configDir, 'clusterConfig.yaml');
const blueprintRepoConfigPath = path.join(configDir, 'blueprint-repo.yaml');

// Load configuration files

const configs = yaml.parse(fs.readFileSync(jsonConfigPath, 'utf-8')) as Config;
const iamRolesConfig = yaml.parse(fs.readFileSync(yamlConfigPath, 'utf-8')) as IamRolesConfig;
const clusterConfig = yaml.parse(fs.readFileSync(clusterConfigPath, 'utf-8')) as ClusterConfig;
const blueprintRepoConfig = yaml.parse(fs.readFileSync(blueprintRepoConfigPath, 'utf-8'));

// SSM parameter handling
async function handleSsmParameter(parameterName: string, value: string, overwrite: boolean) {
  const parameterExists = await parameterExistsInSSM(parameterName);
  if (!parameterExists || overwrite) {
    await updateSsmParameter(parameterName, value, overwrite);
  } else {
    console.log(`Skipping parameter update for ${parameterName}`);
  }
}

async function parameterExistsInSSM(parameterName: string): Promise<boolean> {
  try {
    const command = new GetParameterCommand({ Name: parameterName });
    await ssmClient.send(command);
    return true;
  } catch (error) {
    return (error as any).name === 'ParameterNotFound' ? false : Promise.reject(error);
  }
}

async function updateSsmParameter(parameterName: string, value: string, overwrite: boolean) {
  const command = new PutParameterCommand({
    Name: parameterName,
    Value: value,
    Type: 'String',
    Overwrite: overwrite,
  });
  console.log(`${overwrite ? 'Updating' : 'Creating'} SSM Parameter: ${parameterName} with value: ${value}`);
  await ssmClient.send(command);
}

function generateRandomPassword(length = 16) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

async function cancelSecretDeletion(secretName: string) {
  try {
    const describeCommand = new DescribeSecretCommand({ SecretId: secretName });
    const secretDescription = await secretsManagerClient.send(describeCommand);

    if (secretDescription.DeletedDate) {
      const restoreCommand = new RestoreSecretCommand({ SecretId: secretName });
      await secretsManagerClient.send(restoreCommand);
      console.log(`Restored secret marked for deletion: ${secretName}`);
    }
  } catch (error) {
    if ((error as any).name !== 'ResourceNotFoundException') {
      throw error;
    }
  }
}

async function handleArgoCdAdminSecret(env: string) {
  const secretName = `argocdAdmin-${env}`;
  try {
    await cancelSecretDeletion(secretName);

    const getSecretCommand = new GetSecretValueCommand({ SecretId: secretName });
    await secretsManagerClient.send(getSecretCommand);
    console.log(`Secret ${secretName} already exists; skipping creation.`);
  } catch (error) {
    if ((error as any).name === 'ResourceNotFoundException') {
      const secretValue = generateRandomPassword();
      const createSecretCommand = new CreateSecretCommand({
        Name: secretName,
        SecretString: secretValue,
      });
      console.log(`Creating ArgoCD admin secret: ${secretName} with generated password.`);
      await secretsManagerClient.send(createSecretCommand);
    } else {
      throw error;
    }
  }
}

async function processBlueprintRepoConfig() {
  const parameterName = '/gen3/eks-blueprint-repo';
  const blueprintRepoData = {
    gitRepoOwner: blueprintRepoConfig.gitRepoOwner,
    repoUrl: blueprintRepoConfig.repoUrl,
    targetRevision: blueprintRepoConfig.targetRevision,
  };
  await handleSsmParameter(parameterName, JSON.stringify(blueprintRepoData), true);
}

async function processAwsConfig() {
  if (configs) {
    const parameterName = `/gen3/config`;
    await handleSsmParameter(parameterName, JSON.stringify(configs), updateNetwork);
  } else {
    console.warn('No config data found');
  }
}

async function processEnvironmentConfig(env: string) {
  console.log(`Processing configuration for environment: ${env}`);
  
  const configData = configs[env];

  const iamRolesData = iamRolesConfig.services[env];
  if (iamRolesData) {
    const iamRolesParameterName = `/gen3/${env}/iamRolesConfig`;
    await handleSsmParameter(iamRolesParameterName, JSON.stringify(iamRolesData), overwrite);
  } else {
    console.warn(`No IAM roles data found for environment: ${env}`);
  }

  const clusterData = clusterConfig.clusters[env];
  if (clusterData) {
    const clusterConfigParameterName = `/gen3/${env}/cluster-config`;
    await handleSsmParameter(clusterConfigParameterName, JSON.stringify(clusterData), overwrite);
  } else {
    console.warn(`No cluster config data found for environment: ${env}`);
  }

  await handleArgoCdAdminSecret(env);
}

// Process each environment and the blueprint repo config
(async () => {
  await processBlueprintRepoConfig();
  await processAwsConfig();
  for (const env of environments) {
    await processEnvironmentConfig(env);
  }
})();
