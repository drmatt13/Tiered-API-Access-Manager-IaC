import { useCallback, useState, useContext } from "react";
import { Link } from "react-router-dom";

// context
import SessionContext from "../context/SessionContext";
import ModalContext from "../context/ModalContext";

// const formatDate = (date: Date) => {
//   const [year, month, day] = date.toISOString().split("T")[0].split("-");
//   return `${month}-${day}-${year}`;
// };

function Page() {
  const { setModal } = useContext(ModalContext);
  const { invokeBackendService, handleBackendServiceError, setSessionData } =
    useContext(SessionContext);

  const [loading, setLoading] = useState(false);

  const createTestUser = useCallback(async () => {
    setLoading(true);
    try {
      const response = await invokeBackendService("CreateTestUser");

      if (!response.success) {
        handleBackendServiceError(response.error);
      }
    } catch (error) {}
    setLoading(false);
  }, []);

  const invokeDailyBilling = useCallback(async () => {
    setLoading(true);
    try {
      const response = await invokeBackendService("InvokeDailyBilling");

      if (!response.success) {
        handleBackendServiceError(response.error);
      }
    } catch (error) {}
    setLoading(false);
  }, []);

  const resetAccount = useCallback(async () => {
    setLoading(true);
    try {
      const response = await invokeBackendService("ResetAccount");

      if (!response.success) {
        handleBackendServiceError(response.error);
      }
      setSessionData((prev) => ({
        key: response.apiKey,
        cardStatus: "no card",
        payments: [],
        tier: "free",
        sessionLogs: prev.sessionLogs,
      }));
    } catch (error) {}
    setLoading(false);
  }, []);

  const FormatAccount = useCallback(async () => {
    setLoading(true);
    try {
      const response = await invokeBackendService("FormatAccount");

      if (!response.success) {
        handleBackendServiceError(response.error);
      }
      setSessionData((prev) => ({
        key: response.tableItems?.apiKeysTableItem.apiKey.S,
        sessionLogs: prev.sessionLogs,
        cardStatus: response.tableItems?.creditCardsTableItem.valid.BOOL
          ? "valid"
          : "no card",
        recurringBilling:
          response.tableItems?.creditCardsTableItem.recurring.BOOL,
        tier: response.tableItems?.apiKeysTableItem.tier.S,
        nextPaymentDate: response.tableItems?.apiKeysTableItem.nextPayment.S,
        payments: response.tableItems?.paymentTableItems
          .map((item) => ({
            amount: +item.amount.S,
            date: item.date.S,
          }))
          .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB.getTime() - dateA.getTime(); // Ascending order
          }),
      }));
    } catch (error) {}
    setLoading(false);
  }, []);

  return (
    <>
      <div className="w-full h-full min-h-screen flex flex-col justify-center items-center p-8">
        <div className="w-52 flex flex-col items-center">
          <h1 className="text-3xl font-bold font-mono mb-4">Development</h1>
          <button
            onClick={createTestUser}
            disabled={loading}
            className={`${
              loading
                ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60 border"
                : "bg-yellow-500/80 hover:bg-yellow-500 border border-yellow-600/20"
            } w-full py-2 mb-2.5 rounded transition-colors ease-out duration-75`}
          >
            Create Test User
          </button>
          <button
            onClick={FormatAccount}
            disabled={loading}
            className={`${
              loading
                ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60 border"
                : "bg-orange-500/[72.5%] hover:bg-orange-500/90 border border-orange-600/20 rounded"
            } w-full py-2 mb-2.5 transition-colors ease-out duration-75`}
          >
            Format Account
          </button>
          <button
            onClick={invokeDailyBilling}
            disabled={loading}
            className={`${
              loading
                ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60 border"
                : "bg-pink-400/[72.5%] hover:bg-pink-400/90 border border-pink-600/30"
            } w-full py-2 mb-2.5 rounded transition-colors ease-out duration-75`}
          >
            Invoke Daily Billing
          </button>
          <button
            onClick={() => setModal("ViewSuccessfulPayments")}
            disabled={loading}
            className={`${
              loading
                ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60 border"
                : "bg-green-500/80 hover:bg-green-500 border border-green-600/20"
            } w-full py-2 mb-2.5 rounded transition-colors ease-out duration-75`}
          >
            Review Payments
          </button>
          <button
            onClick={() => setModal("testApiKey")}
            disabled={loading}
            className={`${
              loading
                ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60 border"
                : "bg-purple-500/[72.5%] hover:bg-purple-500/90 border border-purple-600/20"
            } w-full py-2 mb-2.5 rounded transition-colors ease-out duration-75`}
          >
            Test API Key
          </button>
          <button
            disabled={loading}
            onClick={resetAccount}
            className={`${
              loading
                ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60 border"
                : "bg-red-500/80 hover:bg-red-500 border border-red-600/20"
            } w-full py-2 rounded transition-colors ease-out duration-75`}
          >
            Reset Account
          </button>
          <Link
            className={`${
              loading
                ? "pointer-events-none text-gray-400"
                : "text-blue-400 hover:text-sky-300 visited:text-purple-500 visited:hover:text-purple-400"
            } mt-2`}
            to="/"
            replace={true}
          >
            return /home
          </Link>
        </div>
      </div>
    </>
  );
}

export default Page;
