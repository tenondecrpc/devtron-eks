import * as iam from "aws-cdk-lib/aws-iam";

export const appSyncPolicy = new iam.PolicyStatement({
  actions: ["appsync:*"],
  resources: ["*"],
});
