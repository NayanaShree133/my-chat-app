import * as cdk from 'aws-cdk-lib';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

interface PipelineStackProps extends cdk.StackProps {
  githubOwner: string;
  githubRepo: string;
  githubBranch?: string;
  approverEmail: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    // Artifacts
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // SNS Topic for approvals
    const approvalTopic = new sns.Topic(this, 'ApprovalTopic', {
      displayName: 'Pipeline Approval Notifications',
      topicName: 'ChatAppPipelineApprovals',
    });

    approvalTopic.addSubscription(
      new sns_subscriptions.EmailSubscription(props.approverEmail)
    );

    // Source Action - GitHub
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub_Source',
      owner: props.githubOwner,
      repo: props.githubRepo,
      branch: props.githubBranch || 'main',
      oauthToken: cdk.SecretValue.secretsManager('github-token'),
      output: sourceOutput,
      trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
    });

    // Build Project
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      projectName: 'ChatAppBuild',
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: false,
        computeType: codebuild.ComputeType.SMALL,
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.SOURCE),
    });

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build_and_Test',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    // Deploy Dev Action
    const deployDevAction = new codepipeline_actions.CloudFormationCreateUpdateStackAction({
      actionName: 'Deploy_to_Dev',
      stackName: 'ChatAppDevStack',
      templatePath: buildOutput.atPath('ChatAppDevStack.template.json'),  
      adminPermissions: true,
    });

    // Manual Approval
    const approvalAction = new codepipeline_actions.ManualApprovalAction({
      actionName: 'Approve_Production_Deployment',
      notificationTopic: approvalTopic,
      additionalInformation: 'Please review the dev deployment and approve for production',
    });

    // Deploy Prod Action
    const deployProdAction = new codepipeline_actions.CloudFormationCreateUpdateStackAction({
      actionName: 'Deploy_to_Production',
      stackName: 'ChatAppProdStack',
      templatePath: buildOutput.atPath('ChatAppProdStack.template.json'),  
      adminPermissions: true,
    });

    // Create Pipeline
    const pipeline = new codepipeline.Pipeline(this, 'ChatAppPipeline', {
      pipelineName: 'ChatApp-CICD-Pipeline',
      crossAccountKeys: false,
      restartExecutionOnUpdate: true,

      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        {
          stageName: 'Build',
          actions: [buildAction],
        },
        {
          stageName: 'Deploy_Dev',
          actions: [deployDevAction],
        },
        {
          stageName: 'Approve',
          actions: [approvalAction],
        },
        {
          stageName: 'Deploy_Prod',
          actions: [deployProdAction],
        },
      ],
    });

    // Outputs
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
