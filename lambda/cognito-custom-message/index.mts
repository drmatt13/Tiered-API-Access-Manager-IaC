import { CustomMessageTriggerEvent } from "aws-lambda";

export const handler = async (event: CustomMessageTriggerEvent) => {
  // Modify the message for different trigger sources
  if (event.triggerSource === "CustomMessage_ForgotPassword") {
    event.response.emailSubject =
      "Tiered API Access Manager IaC - Password Reset Code";
    event.response.emailMessage = `Your password reset code is ${event.request.codeParameter}. Please enter this code to reset your password.`;
  }
  return event;
};
