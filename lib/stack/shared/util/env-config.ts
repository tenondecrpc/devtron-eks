import * as dotenv from 'dotenv';

export interface EnvironmentConfig {
  account?: string;
  region?: string;
}

export interface ParamsConfig {
  envName: string;
  projectName: string;
  isProd: boolean;
  ssoRoleName?: string;
  accessRoleName?: string;
}

export interface AppConfig {
  env: EnvironmentConfig;
  params: ParamsConfig;
}

export function loadEnvironment(): AppConfig {
  dotenv.config();

  if (!process.env.ENV_NAME || !process.env.PROJECT_NAME) {
    console.error('Error: The environment variable (ENV_NAME or PROJECT_NAME) is not defined');
    process.exit(1);
  }

  const env: EnvironmentConfig = {
    account: process.env.AWS_ACCOUNT,
    region: process.env.AWS_REGION,
  };
  
  const params: ParamsConfig = {
    envName: process.env.ENV_NAME,
    projectName: process.env.PROJECT_NAME,
    isProd: process.env.ENV_NAME == 'prod' ? true : false,
    ssoRoleName: process.env.SSO_ROLE_NAME,
    accessRoleName: process.env.ACCESS_ROLE_NAME,
  };


  return { env, params };
}

export const config: AppConfig = loadEnvironment();