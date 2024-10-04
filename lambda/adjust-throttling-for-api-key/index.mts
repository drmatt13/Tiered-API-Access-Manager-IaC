import { SQSEvent } from "aws-lambda";

export const handler = async (event: SQSEvent) => {
  // Process each message in the SQS event
  for (const record of event.Records) {
    // Parse the message body, which contains the EventBridge event
    const messageBody = JSON.parse(record.body);
    const { sub, amount } = messageBody.detail; // Extract the user ID (`sub`) and amount from the event detail

    // Log the message details to ensure they are as expected
    console.log("Message received:", messageBody);

    return;
  }
};
