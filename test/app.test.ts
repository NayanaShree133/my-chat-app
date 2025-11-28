import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MyChatAppStack } from '../lib/my-chat-app-stack';

describe('ChatApp Stack Tests', () => {
  test('DynamoDB Table Created', () => {
    const app = new App();
    const stack = new MyChatAppStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    // Check that DynamoDB table exists
    template.resourceCountIs('AWS::DynamoDB::Table', 1);

    // Check table has correct keys
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' },
        { AttributeName: 'timestamp', KeyType: 'RANGE' },
      ],
    });
  });

  test('Lambda Function Created', () => {
    const app = new App();
    const stack = new MyChatAppStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    // Check that Lambda exists
    template.resourceCountIs('AWS::Lambda::Function', 1);

    // Check Lambda has correct runtime
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs18.x',
    });
  });

  test('API Gateway Created', () => {
    const app = new App();
    const stack = new MyChatAppStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    // Check API Gateway exists
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
  });

  test('Lambda has DynamoDB Permissions', () => {
    const app = new App();
    const stack = new MyChatAppStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    // Check IAM policy exists for DynamoDB access
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'dynamodb:BatchGetItem',
              'dynamodb:GetRecords',
              'dynamodb:GetShardIterator',
              'dynamodb:Query',
              'dynamodb:GetItem',
              'dynamodb:Scan',
              'dynamodb:ConditionCheckItem',
              'dynamodb:BatchWriteItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
              'dynamodb:DescribeTable',
            ],
            Effect: 'Allow',
          },
        ],
      },
    });
  });
});