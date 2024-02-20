import {
  mockClient,
  sampleTransactionProcessedEvent,
} from "@stedi/integrations-sdk/testing";
import {
  CoreClient,
  GetTransactionOutputDocumentCommand,
} from "@stedi/sdk-client-core";
import { MapDocumentCommand, MappingsClient } from "@stedi/sdk-client-mappings";
import test from "ava";
import nock from "nock";
import { handler } from "../handler.js";

const transactionId = "transaction-id";
const sampleTxnProcessedEvent = sampleTransactionProcessedEvent();
const documentDownloadUrl = `http://fake-core.stedi.com/transactions/${transactionId}/output`;

const sampleEDIAsJSON = { heading: { test: 1 } };
const core = mockClient(CoreClient);
const mappings = mockClient(MappingsClient);

test.afterEach.always(() => {
  core.reset();
  mappings.reset();
});

test.before(() => {
  nock.disableNetConnect();
});

test.serial(
  "delivers EDI as mapped JSON to webhook url, when mapping id is configured",
  async (t) => {
    const event = {
      ...sampleTxnProcessedEvent,
      detail: {
        ...sampleTxnProcessedEvent.detail,
        transactionId,
        x12: {
          transactionSetting: {
            transactionSettingId: "4010-850",
          },
        },
      },
    };

    core.on(GetTransactionOutputDocumentCommand, {}).resolvesOnce({
      documentDownloadUrl,
    });

    nock("http://fake-core.stedi.com")
      .get(`/transactions/${transactionId}/output`)
      .reply(200, JSON.stringify(sampleEDIAsJSON));

    // confirm body contains the expected JSON
    nock("https://example.com")
      .post("/", (body) => {
        t.deepEqual(body, { foo: "bar" });
        return true;
      })

      .reply(201);

    mappings
      .on(MapDocumentCommand, {
        id: "mapping-id",
      })
      .resolvesOnce({
        content: {
          foo: "bar",
        },
      });

    const result = await handler(event);

    const invokeMappingCalls = mappings.commandCalls(MapDocumentCommand);
    t.assert(invokeMappingCalls.length === 1);

    t.deepEqual(result, {
      ok: true,
      statusCode: 201,
    });
  }
);

test.serial(
  "delivers EDI as unmapped JSON to webhook url, when partnership but no mapping id is configured",
  async (t) => {
    const event = {
      ...sampleTxnProcessedEvent,
      detail: {
        ...sampleTxnProcessedEvent.detail,
        transactionId,
        x12: {
          transactionSetting: {
            transactionSettingId: "4010-850",
          },
        },
        partnership: {
          ...sampleTxnProcessedEvent.detail.partnership,
          partnershipId: "ThisIstMe-SomeOtherMerch",
        },
      },
    };
    core.on(GetTransactionOutputDocumentCommand, {}).resolvesOnce({
      documentDownloadUrl,
    });

    nock("http://fake-core.stedi.com")
      .get(`/transactions/${transactionId}/output`)
      .reply(200, JSON.stringify(sampleEDIAsJSON));

    // confirm body contains the expected JSON
    nock("https://example.com")
      .post("/", (body) => {
        t.deepEqual(body, { event, artifact: { detail: sampleEDIAsJSON } });
        return true;
      })

      .reply(201);

    mappings
      .on(MapDocumentCommand, {
        id: "mapping-id",
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
  }
);
