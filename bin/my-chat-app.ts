import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MyChatAppStack } from '../lib/my-chat-app-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

// Dev Environment
new MyChatAppStack(app, 'ChatAppDevStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Environment: 'Development',
    ManagedBy: 'CDK',
  },
});

// Production Environment
new MyChatAppStack(app, 'ChatAppProdStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Environment: 'Production',
    ManagedBy: 'CDK',
  },
});

// CI/CD Pipeline Stack
new PipelineStack(app, 'ChatAppPipelineStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  githubOwner: 'NayanaShree133',
  githubRepo: 'my-chat-app',
  githubBranch: 'main',
  approverEmail: 'nayanas133@gmail.com',
});
