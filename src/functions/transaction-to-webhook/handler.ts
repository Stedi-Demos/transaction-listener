import { type CoreTransactionProcessedEvent } from "@stedi/integrations-sdk";
import { MapDocumentCommand } from "@stedi/sdk-client-mappings";
import { DocumentType } from "@aws-sdk/types";
import { coreClient } from "./lib/coreClient.js";
import { GetTransactionOutputDocumentCommand } from "@stedi/sdk-client-core";
import fetch from "node-fetch";
import { mappingsClient } from "./lib/mappingsClient.js";

export const handler = async (
  event: CoreTransactionProcessedEvent & { detail: { transactionId: string } }
) => {
  // fail fast if WEBHOOK_URL env var is not defined
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("WEBHOOK_URL is not defined");
  }

  // pull the transaction ID from the incoming event in order to call the Get Transaction API
  const {
    detail: { transactionId },
  } = event;

  // retrieve the Guide JSON payload
  const core = coreClient();
  const getFile = await core.send(
    new GetTransactionOutputDocumentCommand({
      transactionId: transactionId,
    })
  );

  const transactionOutputRequest = await fetch(getFile.documentDownloadUrl!);

  if (!transactionOutputRequest.ok)
    throw new Error("Failed to download output artfiact.");

  const bodyString = await transactionOutputRequest.text();
  let body: unknown;

  try {
    body = JSON.parse(bodyString);
  } catch (e) {
    throw new Error("Transaction is not in JSON format.");
  }

  const combinedPayload = {
    event,
    artifact: {
      detail: body,
    },
  };

  // call the Mappings API to transform the Guide JSON if a mapping is defined
  const webhookPayload =
    process.env.MAPPING_ID === undefined
      ? JSON.stringify(combinedPayload)
      : await invokeMapping(process.env.MAPPING_ID, combinedPayload);

  // send mapped JSON to final destination
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

  return { ok: result.ok, statusCode: result.status };
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
