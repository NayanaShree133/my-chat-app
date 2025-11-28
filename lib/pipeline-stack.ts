import * as cdk from 'aws-cdk-lib';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { MyChatAppStack } from './my-chat-app-stack';

interface PipelineStackProps extends cdk.StackProps {
  githubOwner: string;      // Your GitHub username
  githubRepo: string;       // Repository name
  githubBranch?: string;    // Branch to deploy (default: main)
  approverEmail: string;    // Email for approval notifications
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    // ========================================
    // 1. ARTIFACTS - Storage for pipeline data
    // ========================================
    
    // Where pipeline stores code and build outputs
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // ========================================
    // 2. SNS TOPIC - For notifications
    // ========================================
    
    const approvalTopic = new sns.Topic(this, 'ApprovalTopic', {
      displayName: 'Pipeline Approval Notifications',
      topicName: 'ChatAppPipelineApprovals',
    });

    // Subscribe your email to get approval notifications
    approvalTopic.addSubscription(
      new sns_subscriptions.EmailSubscription(props.approverEmail)
    );

    // ========================================
    // 3. SOURCE STAGE - Get code from GitHub
    // ========================================
    
    // Store GitHub token in AWS Secrets Manager first (we'll do this manually)
    // Then reference it here
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub_Source',
      owner: props.githubOwner,
      repo: props.githubRepo,
      branch: props.githubBranch || 'main',
      oauthToken: cdk.SecretValue.secretsManager('github-token'), // We'll create this
      output: sourceOutput,
      trigger: codepipeline_actions.GitHubTrigger.WEBHOOK, // Auto-trigger on push
    });

    // ========================================
    // 4. BUILD STAGE - Build and test
    // ========================================
    
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      projectName: 'ChatAppBuild',
      
      // Build environment
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0, // Latest Amazon Linux
        privileged: false, // Don't need Docker
        computeType: codebuild.ComputeType.SMALL, // Small instance (cheapest)
      },

      // Build instructions from buildspec.yml
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),

      // Where to store cache for faster builds
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.SOURCE),

      // Environment variables
      environmentVariables: {
        // Can add API keys, configs, etc.
      },
    });

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build_and_Test',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    // ========================================
    // 5. DEPLOY DEV STAGE
    // ========================================
    
    const deployDevAction = new codepipeline_actions.CloudFormationCreateUpdateStackAction({
      actionName: 'Deploy_to_Dev',
      stackName: 'ChatAppDevStack',
      templatePath: buildOutput.atPath('DevStack.template.json'),
      adminPermissions: true, // Simplified - in production, use specific permissions
      parameterOverrides: {
        // Pass any parameters to your stack
      },
    });

    // ========================================
    // 6. MANUAL APPROVAL STAGE
    // ========================================
    
    const approvalAction = new codepipeline_actions.ManualApprovalAction({
      actionName: 'Approve_Production_Deployment',
      notificationTopic: approvalTopic,
      additionalInformation: 'Please review the dev deployment and approve for production',
      externalEntityLink: 'https://dev-url.com', // Link to dev environment
    });

    // ========================================
    // 7. DEPLOY PRODUCTION STAGE
    // ========================================
    
    const deployProdAction = new codepipeline_actions.CloudFormationCreateUpdateStackAction({
      actionName: 'Deploy_to_Production',
      stackName: 'ChatAppProdStack',
      templatePath: buildOutput.atPath('ProdStack.template.json'),
      adminPermissions: true,
    });

    // ========================================
    // 8. CREATE THE PIPELINE
    // ========================================
    
    const pipeline = new codepipeline.Pipeline(this, 'ChatAppPipeline', {
      pipelineName: 'ChatApp-CICD-Pipeline',
      
      // Enable cross-account deployments (optional)
      crossAccountKeys: false,
      
      // Restart execution on update
      restartExecutionOnUpdate: true,

      stages: [
        // Stage 1: Get source code
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        
        // Stage 2: Build and test
        {
          stageName: 'Build',
          actions: [buildAction],
        },
        
        // Stage 3: Deploy to dev
        {
          stageName: 'Deploy_Dev',
          actions: [deployDevAction],
        },
        
        // Stage 4: Manual approval
        {
          stageName: 'Approve',
          actions: [approvalAction],
        },
        
        // Stage 5: Deploy to production
        {
          stageName: 'Deploy_Prod',
          actions: [deployProdAction],
        },
      ],
    });

    // ========================================
    // 9. OUTPUTS
    // ========================================
    
    new cdk.CfnOutput(this, 'PipelineName', {
      value: pipeline.pipelineName,
      description: 'Name of the CI/CD Pipeline',
    });

    new cdk.CfnOutput(this, 'PipelineConsoleUrl', {
      value: `https://console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipeline.pipelineName}/view`,
      description: 'URL to view pipeline in AWS Console',
    });
  }
}