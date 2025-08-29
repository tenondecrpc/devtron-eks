import * as iam from "aws-cdk-lib/aws-iam";

export const s3Policy = new iam.PolicyStatement({
  actions: ["s3:*"],
  resources: ["*"],
});
