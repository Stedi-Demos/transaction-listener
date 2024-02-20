import test from "ava";
import { handler } from "../handler.js";
import {
  mockClient,
  mockBucketStreamResponse,
  sampleTransactionProcessedEvent,
} from "@stedi/integrations-sdk/testing";
import { GetObjectCommand } from "@stedi/sdk-client-buckets";
import { mock } from "node:test";
import { MapDocumentCommand, MappingsClient } from "@stedi/sdk-client-mappings";
import nock from "nock";
import {
  CoreClient,
  GetTransactionOutputDocumentCommand,
} from "@stedi/sdk-client-core";

const transactionId = "transaction-id";
const sampleTxnProcessedEvent = sampleTransactionProcessedEvent();
const event = {
  ...sampleTxnProcessedEvent,
  detail: {
    ...sampleTxnProcessedEvent.detail,
    transactionId,
  },
};
const documentDownloadUrl = `http://fake-core.stedi.com/transactions/${transactionId}/output`;

const sampleEDIAsJSON = { heading: { test: 1 } };
const core = mockClient(CoreClient);
const mappings = mockClient(MappingsClient);

test.afterEach.always(() => {
  core.reset();
  mappings.reset();
  mock.reset();
});

test.before(() => {
  nock.disableNetConnect();
});

test.serial("delivers EDI as mapped JSON to webhook url", async (t) => {
  core.on(GetTransactionOutputDocumentCommand, {}).resolvesOnce({
    documentDownloadUrl,
  });

  nock("http://fake-core.stedi.com")
    .get(`/transactions/${transactionId}/output`)
    .reply(200, JSON.stringify(sampleEDIAsJSON));

  nock("https://example.com").post("/").reply(201);

  mappings
    .on(MapDocumentCommand, {
      id: "mapping-id",
      content: sampleEDIAsJSON,
    })
    .resolvesOnce({
      content: {
        foo: "bar",
      },
    });

  const result = await handler(event);

  const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
  t.assert(invokeMappingCalls.length === 0);

  t.deepEqual(result, {
    ok: true,
    statusCode: 201,
  });
});
