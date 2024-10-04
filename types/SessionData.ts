export default interface SessionData {
  key?: string;
  tier?: "free" | "paid";
  cardStatus?: "no card" | "invalid" | "valid";
  recurringBilling?: boolean;
  payments?: Array<{
    amount: number;
    date: string;
  }>;
  sessionLogs: Array<string>;
  nextPaymentDate?: string;
}
