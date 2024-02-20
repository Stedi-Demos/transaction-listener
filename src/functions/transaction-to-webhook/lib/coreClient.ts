import { CoreClient } from "@stedi/sdk-client-core";
import { fromAwsCredentialIdentity } from "@stedi/sdk-token-provider-aws-identity";

export const coreClient = () => {
  const isProd = process.env.USE_PREVIEW !== "true";
  const credentials = process.env.STEDI_API_KEY
    ? { apiKey: process.env.STEDI_API_KEY }
    : {
        token: fromAwsCredentialIdentity({
          clientConfig: isProd
            ? {}
            : {
                stage: "preproduction",
              },
        }),
      };

  return new CoreClient({
    ...credentials,
    region: "us",
    ...(isProd
      ? {}
      : {
          stage: "preproduction",
        }),
  });
};
