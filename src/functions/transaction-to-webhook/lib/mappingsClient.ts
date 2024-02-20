import { MappingsClient } from "@stedi/sdk-client-mappings";
import { fromAwsCredentialIdentity } from "@stedi/sdk-token-provider-aws-identity";

export const mappingsClient = () => {
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

  return new MappingsClient({
    ...credentials,
    region: "us",
    ...(isProd
      ? {}
      : {
          stage: "preproduction",
        }),
  });
};
