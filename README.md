# Stedi Integrations Project

This Stedi Integrations project helps you manage your Stedi Functions. You can:

- Import source code from official [Stedi Function Templates](https://github.com/Stedi-Demos/function-templates), including their tests.
- Execute tests for each of your functions.
- Package and deploy the TypeScript code to the [Stedi Functions](https://www.stedi.com/docs/functions) compute platform.

### Requirements

You must have a working Node 18 or later environment installed on your machine before you proceed with the Getting Started steps.

### Getting Started

1. Ensure you have the dependencies installed.

   ```bash
     npm install
   ```

1. Create your first function using the guided `new-function` command:

   ```bash
     npm run new-function -- my-function-name --guided
   ```

This command will generate a basic Stedi Function placeholder, along with a test to help you get started.

**NOTE:** The `--guided` flag will prompt you to select which Stedi Event you'd like your function to consume.

1. Run the tests for your newly created function.

   ```bash
     npm run test
   ```

**NOTE:** Generated functions use the [AVA test runner](https://github.com/avajs/ava) for Node.js.

### Deploying the functions to Stedi

To deploy the project to your Stedi account:

1. Update the provided `.env` in the project root and ensure the following environment variable is defined:

   - `STEDI_API_KEY`: A Stedi API key is required for authentication. You
     can [generate an API key](https://www.stedi.com/app/settings/api-keys) in your Stedi account.

1. Deploy the resources:

   ```bash
     npm run deploy
   ```
