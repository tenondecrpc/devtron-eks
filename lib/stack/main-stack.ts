import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ParamsConfig, EnvironmentConfig } from './shared/util/env-config';
import { EksFactory } from './eks';

interface MainStackProps extends cdk.StackProps {
  env: EnvironmentConfig;
  params: ParamsConfig;
}

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);

    const { params } = props;
    const { envName, projectName } = params;

    // Create EKS cluster with essential add-ons
    const eksFactory = new EksFactory(this, "EksFactory", {
      params,
      installDevtron: true // This can be done manually from INSTALL_DEVTRON.md
    });

    cdk.Tags.of(this).add('Project', projectName);
    cdk.Tags.of(this).add('Environment', envName);
  }
}
