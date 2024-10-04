type Service =
  | "MakeCrediCardPayment"
  | "GetAccountCreditCard"
  | "CreateAccountCreditCard"
  | "EditAccountCreditCard"
  | "DeleteAccountCreditCard"
  | "GetAccountApiKey"
  | "ResetAccountApiKey"
  | "DeleteAcount"
  | "GetAccountPaymentHistory"
  // Development Services
  | "CreateTestUser"
  | "FormatAccount"
  | "InvokeDailyBilling"
  | "ResetAccount"
  | "PollAllPayments";

// return types
import {
  GetAccountApiKeyResponse,
  GetAccountCreditCardResponse,
  ResetAccountApiKeyResponse,
  MakeCreditCardPaymentResponse,
  DeleteAccountResponse,
  EditAccountCreditCardResponse,
  GetAccountPaymentHistoryResponse,
  CreateTestUserResponse,
  InvokeDailyBillingResponse,
  FormatAccountResponse,
  ResetAccountResponse,
  PollAllPaymentsResponse,
} from "./lambdaFunctionResponses";

type ServicePayloadMap = {
  MakeCrediCardPayment: {
    // recurring: boolean;
  };
  GetAccountCreditCard: undefined;
  CreateAccountCreditCard: undefined;
  EditAccountCreditCard: {
    valid?: boolean;
    recurring?: boolean;
  };
  DeleteAccountCreditCard: undefined;
  GetAccountApiKey: undefined;
  ResetAccountApiKey: undefined;
  DeleteAcount: undefined;
  GetAccountPaymentHistory: {};
  // Development Services
  CreateTestUser: undefined;
  FormatAccount: undefined;
  InvokeDailyBilling: undefined;
  ResetAccount: undefined;
  PollAllPayments: undefined;
};

type ServiceResponseMap = {
  MakeCrediCardPayment: MakeCreditCardPaymentResponse;
  GetAccountCreditCard: GetAccountCreditCardResponse;
  CreateAccountCreditCard: EditAccountCreditCardResponse;
  EditAccountCreditCard: EditAccountCreditCardResponse;
  DeleteAccountCreditCard: EditAccountCreditCardResponse;
  GetAccountApiKey: GetAccountApiKeyResponse;
  ResetAccountApiKey: ResetAccountApiKeyResponse;
  DeleteAcount: DeleteAccountResponse;
  GetAccountPaymentHistory: GetAccountPaymentHistoryResponse;
  // Development Services
  CreateTestUser: CreateTestUserResponse;
  FormatAccount: FormatAccountResponse;
  InvokeDailyBilling: InvokeDailyBillingResponse;
  ResetAccount: ResetAccountResponse;
  PollAllPayments: PollAllPaymentsResponse;
};

// export the types
export type { Service, ServiceResponseMap, ServicePayloadMap };
