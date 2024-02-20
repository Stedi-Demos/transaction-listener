# Reference implementation for receiving transactions >1MB

## Overview

Stedi is able to process inbound EDI files of virtually any size, including transactions that are hundreds of megabytes in size. [Stedi's Destinations webhooks](https://www.stedi.com/docs/configure/destinations/index) has several limitations around payload size; if you plan to receive transactions above a certain size (explained in more detail below), you will need to implement a solution to handle these payloads. This repo provides a reference implementation.

## Context: Destinations behavior for various size transaction payloads

### Without using mappings

When using Destinations webhooks to send `transaction.processed.v2` events **without** a mapping configured, Destinations will include the transaction when the total payload is less than 1MB.

When the total payload is less than 1MB, the `artifact.attachedReason` will be `WITHIN_SIZE_LIMIT` and the `artifact.detail` will contain the transaction payload:

```json
{
  "event": {
    // metadata about the event
  },
  "artifact": {
    "artifactType": "application/json",
    "usage": "output",
    "attachedReason": "WITHIN_SIZE_LIMIT",
    "detail": {
      // the actual Guide JSON transaction payload
    }
  }
}
```

When the total payload is greater than 1MB, the `artifact.attachedReason` will be `SIZE_LIMIT_EXCEEDED` and the `artifact.detail` will be omitted:

```json
{
  "event": {
    // metadata about the event
  },
  "artifact": {
    "artifactType": "application/json",
    "usage": "output",
    "attachedReason": "SIZE_LIMIT_EXCEEDED"
  }
}
```

If you expect to receive payloads greater than 1MB, you have your webhook listener use the [Get Transactions Output API](https://www.stedi.com/docs/api-reference/core/get-transactions-output) to fetch the omitted transaction payload. This API returns a pre-signed URL, allowing you to fetch transactions of unlimited size. This repo provides a reference implementation of an AWS Lambda function that you can use as a starting point for your own implementation.

### Using mappings

When using Destinations webhooks to send `transaction.processed.v2` events **with** a mapping configured, the 1MB limit applies to the _output of the mapping_. Since the [Mappings API has an input limit](https://www.stedi.com/docs/mappings/limits) of 4MB, the Guide JSON transaction payload must be less than 4MB – and since Destinations has a 1MB limit on the output of the mapping, the output payload from the mapping must be less than 1MB.

If either of these size limits are exceeded, Stedi considers the event delivery a failure and, after retrying the operation for 6 hours, adds the event to the destination’s [error queue](https://www.stedi.com/docs/configure/destinations/webhook-error-handling#error-queue). In these cases, you would need to manually process a transaction, which is a tedious process. For this reason, **we don’t recommend using a destination with a mapping if you plan to receive payloads that might exceed 1MB in size at any point.**

Instead, you should:

- Configure Destinations to send `transaction.processed.v2` events **without** a mapping to a webhook listener
- Use the Get Transactions Output API to fetch the transaction payload
- Call the Mappings API to map the transaction payload.

This reference implementation allows you to optionally call the Mappings API to map the transaction payload after retrieving it from the Get Transactions Output API. 

**Note that the Mappings API has a 4MB input AND output limit. If you expect to receive transactions that are approaching 4MB, or if your mapping results in larger payloads (e.g. by adding extra fields) that might exceed 4MB, you cannot using the Mappings API for entire transactions.** Instead, you will need to use [Fragments](https://www.stedi.com/docs/fragments) to map the transaction in smaller pieces.

## Requirements

You must have a working Node 18 or later environment installed on your machine before you proceed with the Getting Started steps.
