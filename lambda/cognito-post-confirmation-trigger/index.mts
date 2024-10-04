import { PostConfirmationTriggerEvent } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({});

export const handler = async (event: PostConfirmationTriggerEvent) => {
  console.log({
    TopicArn: process.env.ACCOUNTCREATEDTOPIC_TOPIC_ARN,
    Message: JSON.stringify({ user_id: event.request.userAttributes.sub }),
  });

  await snsClient.send(
    new PublishCommand({
      TopicArn: process.env.ACCOUNTCREATEDTOPIC_TOPIC_ARN,
      Message: JSON.stringify({ user_id: event.request.userAttributes.sub }),
    })
  );
  return event;
};
