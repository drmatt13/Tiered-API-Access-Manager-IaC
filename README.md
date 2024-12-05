# Tiered API Access Manager

The **Tiered API Access Manager** automates the deployment of a scalable, subscription-based API platform with integrated user management and tiered access control. This solution simplifies infrastructure setup and enables developers to focus on delivering business value while leveraging AWS best practices.

## Features

- **Scalable Backend Infrastructure**: Automatically provisions a VPC, subnets, Auto Scaling Groups with EC2 instances, and an Application Load Balancer.
- **API Management**: API Gateway configurations for throttling, tiered access control, and integration with AWS Cognito for authentication and authorization.
- **Frontend API Key Manager**: A React-based web application hosted on S3 and served via CloudFront for optimal delivery.
- **Subscription Management**: Scheduled jobs for subscription renewals, asynchronous processing with SQS and DLQs, and CloudWatch monitoring for alarms and failure notifications.
- **Ease of Deployment**: Fully automated with Infrastructure as Code (IaC) using AWS SAM and CloudFormation.

---

## Prerequisites

- **AWS CLI**: Installed and configured with appropriate permissions.
- **AWS SAM CLI**: Installed for building and deploying the stack.
- **Node.js**: Installed for running the frontend React app.

---

## Deployment Steps

### Backend Deployment

1. **Build the SAM project**:
   ```bash
   sam build
   ```
2. **Deploy the stack**:
   ```bash
   sam deploy
   ```
   - Follow the prompts to provide stack configuration details.

### Frontend Deployment

3. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
4. Create an `.env` file with the outputs from the deployed CloudFormation stack:
   ```
   VITE_ManagedApiURL=<ManagedApiURL>
   VITE_ApiKeyManagerBackendUrl=<ApiKeyManagerBackendUrl>
   VITE_CognitoUserPoolId=<CognitoUserPoolId>
   VITE_CognitoUserPoolClientId=<CognitoUserPoolClientId>
   ```
5. Install dependencies:
   ```bash
   npm install
   ```
6. Build the frontend app:
   ```bash
   npm run build
   ```
7. Sync the built app to the S3 bucket:
   ```bash
   aws s3 sync ./dist s3://<BUCKET NAME>
   ```

---

## Cleanup

To remove all resources created by the stack, run:

```bash
aws cloudformation delete-stack --stack-name <stack-name>
```

---

## Accessing the Application

The frontend website will be accessible at the `CloudFrontURL` output generated during the deployment process.

---

## Outputs

Key outputs from the CloudFormation stack:

- **CloudFrontURL**: The URL of the deployed frontend website.
- **ManagedApiURL**: The URL of the API Gateway with managed API access.
- **ApiKeyManagerBackendUrl**: Backend URL for the API Key Manager.
- **CognitoUserPoolId**: Cognito User Pool ID.
- **CognitoUserPoolClientId**: Cognito User Pool Client ID.

---

## License

This project is open source and available under the [MIT License](LICENSE).
