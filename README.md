Gen3 CDK Config Manager
========================================

This script automates the management of AWS SSM Parameters and Secrets for configuring Gen3 EKS clusters. It handles the deployment of environment-specific configurations, IAM role configurations, and ArgoCD admin secrets. The script ensures that parameter and secret values are up-to-date and creates them if they don't exist.

Table of Contents
-----------------

-   [Getting Started](#getting-started)
-   [Prerequisites](#prerequisites)
-   [Usage](#usage)
-   [Arguments](#arguments)
-   [Script Functions](#script-functions)
-   [License](#license)

Getting Started
---------------

### 1\. Fork the Repository

To use this script in your own AWS environment, fork this repository to your GitHub account. This will allow you to make modifications and updates as needed.

### 2\. Clone the Forked Repository

Clone the forked repository to your local machine:


        git clone https://github.com/AustralianBioCommonsE/gen3-cdk-config-manager.git
        cd gen3-cdk-config-manager

### 3\. Install Dependencies

Ensure you have Node.js installed on your system. Install the necessary packages by running:


        npm install


Install TypeScript globally (if not already installed):


        npm install -g typescript       

### 4\. Set Up Configuration Files

The script expects configuration files to be in a directory, with `.secrets/` as the default path. If you choose a different path, use the `--config-path` argument to specify it (see below for usage).

Create the configuration files in the path as follows:

-   **config.json**: Contains the general configuration for each environment.
-   **iamRolesConfig.yaml**: Holds IAM roles configuration for different services across environments.
-   **clusterConfig.yaml**: Contains EKS cluster configuration details.
-   **blueprint-repo.yaml**: Holds information about the GitHub repository for EKS blueprints.

Prerequisites
-------------

-   **AWS Credentials**: Ensure your AWS CLI is configured with credentials that have permissions to manage SSM Parameters and Secrets Manager in the target AWS account.
-   **Environment Variables**:
    -   `AWS_REGION`: (Optional) The AWS region to use. Defaults to `ap-southeast-2`.


Script Functions
----------------

The script loads configuration data from the specified directory:

-   **config.json**: General configuration for each environment.
-   **iamRolesConfig.yaml**: IAM roles configuration for different services across environments.
-   **clusterConfig.yaml**: EKS cluster configuration details.
-   **blueprint-repo.yaml**: GitHub repository information for EKS blueprints.

### Key Actions

-   **SSM Parameters**:

    -   Updates or creates parameters in AWS SSM Parameter Store, depending on the presence of the `--update` flag.
    -   Supports configurations for each specified environment.
-   **Secrets Manager**:

    -   Manages the ArgoCD admin password for each environment.
    -   Restores secrets if they are marked for deletion.


Configuration
-------------

### Configuration Directory Structure

The tool expects a specific directory structure for configuration files. By default, it looks for configuration files in the `.secrets` directory, which should be placed in the root of the project.

The expected files are:

-   `config.json`: Contains environment-specific configuration.
-   `iamRolesConfig.yaml`: Defines IAM roles configuration for services.
-   `clusterConfig.yaml`: Contains cluster configuration settings.
-   `blueprint-repo.yaml`: Configuration for the blueprint repository.

### Running the Script

You can run the configuration manager script with the following command:

        npx ts-node src/index.ts --configDir <path-to-config-dir> --environments <env1> <env2> ... --update

#### Parameters

-   `--configDir`: (Optional) Path to the configuration directory. Defaults to `.secrets`.
-   `--environments`: (Required) List of environments to process (e.g., `dev staging prod`).
-   `--update`: (Optional) Flag to overwrite existing parameters in SSM. Defaults to `false`.


Script Details
--------------

The script performs the following actions:

1.  **Load Configuration**: It reads the necessary configuration files from the specified directory.
2.  **Check Existing Parameters**: It checks if SSM parameters already exist and decides whether to update them based on the provided flags.
3.  **Handle Secrets**: It manages secrets in AWS Secrets Manager, including creating, retrieving, and restoring secrets if necessary.

Troubleshooting
---------------

-   Ensure that the AWS CLI is configured properly and that you have the necessary permissions to access SSM and Secrets Manager.
-   Check that the specified configuration directory exists and contains the required files.
-   If you encounter any errors, verify the structure of your configuration files and ensure they match the expected format.

License
-------

This project is licensed under the Apache 2.0 License.