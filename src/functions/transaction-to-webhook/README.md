# Transaction to webhook

Sends a POST http request with the body of the transaction set to the configured destination URL. Optionally transforms the transaction set to a different shape using a Stedi Mapping.

## Configuration

### Environment variables

**STEDI_API_KEY**: Required. An API Key to access Stedi resources.

**WEBHOOK_URL**: Required. The location to send the transaction set.

**MAPPING_ID**: Optional. A Mapping to transform the transaction set prior to sending to the webhook.

**AUTHORIZATION**: Optional. Authorization HTTP header value to use when calling the webhook.

### Post-install instructions

1. Edit `package.json`, updating the `ava` test runner configuration to include a `WEBHOOK_URL` environment variable (required for running the included unit tests for the `transaction-to-webhook` template):

    ```bash
      "ava": {
        "environmentVariables": {
          "WEBHOOK_URL": "https://test-webhook.url"
        },
        // ...
      }
    ```

   _Note_: the `WEBHOOK_URL` configured for `ava` is only used when running unit tests and will not receive any actual requests.

2. If desired, run the unit tests for the `transaction-to-webhook` function template:

    ```bash
    npm run test
    ```

3. Edit the `.env` file as follows: below the existing `STEDI_API_KEY` entry, add the webhook url to send events to, (optionally) the ID of the mapping to be used to transform the transaction set to a different shape, and (optionally) the value to use as the authentication header to make authenticated calls (if your webhook destination requires authentication):

    ```bash
    STEDI_API_KEY=<YOUR_STEDI_API_KEY>
    WEBHOOK_URL=<YOUR_WEBHOOK_URL>
    MAPPING_ID=<YOUR_OPTIONAL_MAPPING_ID>
    AUTHORIZATION=<YOUR_OPTIONAL_AUTHENTICATION_HEADER_VALUE>
    ```

   _Note_: if you do not have a webhook available to use, you can use a webhook testing service like [webhook.site](https://webhook.site).

4. Deploy the function as shown in [step 7 of the function template deployment instructions](/README.md#deploying-function-templates)

### Post-deployment instructions

1. Add an [event binding](https://www.stedi.com/docs/core/consume-events-with-functions#subscribe-to-events) to link the `transaction-to-webhook` function to the `transaction.processed` events that are emitted by Core:

    1. Navigate to the [Functions UI](https://www.stedi.com/app/functions)
    2. Select the link for the `transaction-to-webhook` function
    3. Click the `Add Event Binding` button
    4. Provide a name for the binding (for example: `all-processed-txns`)
    5. Select the `transaction.processed` Detail Type
    6. Select the `Received` Direction
    7. Click Done
