#!/usr/bin/env node
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
  // You can add stack-specific props here
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

// ========================================
// OPTION 3: CI/CD Pipeline Stack
// ========================================

new PipelineStack(app, 'ChatAppPipelineStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  
  // 🔧 CONFIGURE THESE:
  githubOwner: 'NayanaShree133',        // Replace with your username
  githubRepo: 'my-chat-app',                  // Replace with your repo name
  githubBranch: 'main',                       // Or 'master'
  approverEmail: 'nayanas133@gmail.com',    // Replace with your email
});