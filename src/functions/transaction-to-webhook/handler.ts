import { type CoreTransactionProcessedEvent } from "@stedi/integrations-sdk";
import { MapDocumentCommand } from "@stedi/sdk-client-mappings";
import { DocumentType } from "@aws-sdk/types";
import { coreClient } from "./lib/coreClient.js";
import { GetTransactionOutputDocumentCommand } from "@stedi/sdk-client-core";
import fetch from "node-fetch";
import { mappingsClient } from "./lib/mappingsClient.js";

// configuration for trading partners
const configuration: { [key: string]: Record<string, string> } = {
  // partnership ID
  "ThisIsMe-AnotherMerch": {
    // format: "inbound transaction setting ID": "mapping ID"
    "4010-850": "mapping-id",
  },
    // mappings are optional; if not defined the raw Guide JSON will be sent to the configured `WEBHOOK_URL`
  "ThisIstMe-SomeOtherMerch": {},
};

type TransactionProcessedEvent = CoreTransactionProcessedEvent & {
  detail: {
    transactionId: string;
    x12: { transactionSetting: { transactionSettingId: string } };
  };
};

export const handler = async (rawEvent: object) => {
  // fail fast if WEBHOOK_URL env var is not defined; WEBHOOK_URL is where the output of this function will be sent
  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl === undefined) throw new Error("WEBHOOK_URL is not defined");

  if (process.env.STEDI_API_KEY === undefined)
    throw new Error(
      "STEDI_API_KEY is not defined."
    );

  // ensure the input matches expectations
  let event: TransactionProcessedEvent;
  if (
    "routeKey" in rawEvent &&
    "body" in rawEvent &&
    typeof rawEvent.body === "string"
  ) {
    // function URL invoke
    event = JSON.parse(rawEvent.body).event;
  } else {
    throw new Error("Unexpected input shape received.");
  }

  // pull the transaction ID, partnership, etc from the incoming event in order to call the Get Transactions API (https://www.stedi.com/docs/api-reference/core/get-transactions)
  const {
    detail: {
      transactionId,
      partnership: { partnershipId },
      x12: {
        transactionSetting: { transactionSettingId },
      },
    },
  } = event;

  // check if the partnership is configured for delivery
  const partnerConfiguration = configuration[partnershipId];
  if (partnerConfiguration === undefined)
    throw new Error(
      `No configuration found for partnershipId: '${partnershipId}'`
    );

  // determine if a mapping is configured for the transaction setting
  const mappingId = partnerConfiguration[transactionSettingId];

  console.log({
    partnershipId,
    transactionSettingId,
    mappingId,
    transactionId,
    webhookUrl,
  });
  // retrieve the Guide JSON payload download link using the Get Transactions Output API (https://www.stedi.com/docs/api-reference/core/get-transactions-output); requires Stedi API key
  const core = coreClient();
  const getFile = await core.send(
    new GetTransactionOutputDocumentCommand({
      transactionId: transactionId,
    })
  );

// Downloads from presigned URL (no API key required)
  const transactionOutputRequest = await fetch(getFile.documentDownloadUrl!);

  if (!transactionOutputRequest.ok)
    throw new Error("Failed to download output artifact.");

  const bodyString = await transactionOutputRequest.text();
  let body: unknown;

  try {
    body = JSON.parse(bodyString);
  } catch (e) {
    throw new Error("File is not a JSON file.");
  }

  const combinedPayload = {
    event,
    artifact: {
      detail: body,
    },
  };

  // call the Mappings API to transform the Guide JSON if a mapping is defined (https://www.stedi.com/docs/api-reference/post-invoke-mapping)
  const webhookPayload =
    mappingId === undefined
      ? JSON.stringify(combinedPayload)
      : await invokeMapping(mappingId, combinedPayload);

  // send mapped JSON to configured WEBHOOK_URL endpoint; AUTHORIZATION is defined as an environment variable
  const result = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.AUTHORIZATION && {
        Authorization: process.env.AUTHORIZATION,
      }),
    },
    body: webhookPayload,
  });

  if (!result.ok) {
    throw new Error(
      `delivery to ${webhookUrl} failed: ${result.statusText} (status code: ${result.status})`
    );
  }

  const resultBody = { ok: result.ok, statusCode: result.status };

  return { body: resultBody };
};

const invokeMapping = async (
  mappingId: string,
  input: unknown
): Promise<string> => {
  const mappingResult = await mappingsClient().send(
    new MapDocumentCommand({
      id: mappingId,
      content: input as DocumentType,
    })
  );

  if (!mappingResult.content) {
    throw new Error(
      `map (id=${mappingId}) operation did not return any content`
    );
  }

  return JSON.stringify(mappingResult.content);
};
