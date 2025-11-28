#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MyChatAppStack } from '../lib/my-chat-app-stack';

const app = new cdk.App();
new MyChatAppStack(app, 'MyChatAppStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});