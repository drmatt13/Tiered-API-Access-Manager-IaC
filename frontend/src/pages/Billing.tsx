import { useState, useCallback, useContext, useEffect } from "react";
import { Link } from "react-router-dom";

// css
import "../css/scroll.css";

// context
import SessionContext from "../context/SessionContext";

const formatDate = (date: Date) => {
  const [year, month, day] = date.toISOString().split("T")[0].split("-");
  return `${month}-${day}-${year}`;
};

const todaysDate = formatDate(new Date());

function Billing() {
  const {
    sessionData,
    setSessionData,
    invokeBackendService,
    handleBackendServiceError,
  } = useContext(SessionContext);
  const [loading, setLoading] = useState(false);

  const getUsersApiKeyData = useCallback(async () => {
    try {
      const response = await invokeBackendService("GetAccountApiKey");

      if (!response.success) {
        handleBackendServiceError(response.error);
      }

      const { apiKey, tier, nextPayment } = response.tableItem ?? {};

      setSessionData((current) => ({
        ...current,
        key: apiKey?.S ?? "",
        tier: (tier?.S as "free" | "paid") ?? "free",
        nextPaymentDate: nextPayment?.S ?? "",
      }));
    } catch (error) {
      alert(
        "Failed to get account api key, fatal error, please contact support."
      );
    }
  }, [invokeBackendService]);

  const getUsersCardData = useCallback(async () => {
    try {
      const response = await invokeBackendService("GetAccountCreditCard");

      if (!response.success) {
        handleBackendServiceError(response.error);
      }

      const { valid, recurring } = response.tableItem ?? {};

      setSessionData((current) => ({
        ...current,
        cardStatus: valid?.BOOL ? "valid" : "invalid",
        recurringBilling: recurring?.BOOL ?? false,
      }));
    } catch (error) {
      setSessionData((current) => ({
        ...current,
        cardStatus: "no card",
      }));
    }
  }, []);

  const getUsersPaymentData = useCallback(async () => {
    try {
      const response = await invokeBackendService("GetAccountPaymentHistory");

      if (!response.success) {
        handleBackendServiceError(response.error);
      }

      setSessionData((current) => ({
        ...current,
        payments: response.tableItems
          ?.map((item) => ({
            amount: +item.amount.S,
            date: item.date.S,
          }))
          .sort((a, b) => {
            // Convert the date strings to Date objects for comparison
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB.getTime() - dateA.getTime(); // Ascending order
          }),
      }));
    } catch (error) {
      setSessionData((current) => ({
        ...current,
        payments: [],
      }));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    let getUsersApiKeyDataPromise: Promise<void> | null = null;
    let getUsersCardDataPromise: Promise<void> | null = null;
    let getUsersPaymentDataPromise: Promise<void> | null = null;
    if (!sessionData.key || !sessionData.tier)
      getUsersApiKeyDataPromise = getUsersApiKeyData();
    if (!sessionData.cardStatus) getUsersCardDataPromise = getUsersCardData();
    if (!sessionData.payments)
      getUsersPaymentDataPromise = getUsersPaymentData();
    const promises = [
      getUsersApiKeyDataPromise,
      getUsersCardDataPromise,
      getUsersPaymentDataPromise,
    ].filter((p) => p !== null) as Promise<void>[];
    Promise.all(promises).then(() => {
      setLoading(false);
    });
  }, []);

  const addCard = useCallback(async () => {
    setLoading(true);
    const option = confirm("Add a credit card to your account?");

    if (!option) {
      setLoading(false);
      return;
    }

    try {
      const response = await invokeBackendService("CreateAccountCreditCard");

      if (!response.success) {
        handleBackendServiceError(response.error);
      }

      setSessionData((current) => ({
        ...current,
        cardStatus: "valid",
      }));
    } catch (error) {}
    setLoading(false);
  }, []);

  const validateCard = useCallback(async () => {
    setLoading(true);
    const option = confirm("Validate your credit card?");

    if (!option) {
      setLoading(false);
      return;
    }

    try {
      const response = await invokeBackendService("EditAccountCreditCard", {
        valid: true,
      });

      if (!response.success) {
        handleBackendServiceError(response.error);
      }

      setSessionData((current) => ({
        ...current,
        cardStatus: "valid",
      }));
    } catch (error) {}
    setLoading(false);
  }, []);

  const invalidateCard = useCallback(async () => {
    setLoading(true);
    const option = confirm(
      "Invalidate your credit card? Transactions in the backend will be declined."
    );

    if (!option) {
      setLoading(false);
      return;
    }

    try {
      const response = await invokeBackendService("EditAccountCreditCard", {
        valid: false,
      });

      if (!response.success) {
        handleBackendServiceError(response.error);
      }

      setSessionData((current) => ({
        ...current,
        cardStatus: "invalid",
      }));
    } catch (error) {}
    setLoading(false);
  }, []);

  const enableReccuringBilling = useCallback(async () => {
    setLoading(true);
    const option = confirm("Enable recurring billing?");
    if (option) {
      try {
        const response = await invokeBackendService("EditAccountCreditCard", {
          recurring: true,
        });

        if (!response.success) {
          handleBackendServiceError(response.error);
        }

        setSessionData((current) => ({ ...current, recurringBilling: true }));
      } catch (error) {}
    }
    setLoading(false);
  }, [sessionData]);

  const disableReccuringBilling = useCallback(async () => {
    setLoading(true);
    const option = confirm("Disable recurring billing?");
    if (option) {
      try {
        const response = await invokeBackendService("EditAccountCreditCard", {
          recurring: false,
        });

        if (!response.success) {
          handleBackendServiceError(response.error);
        }

        setSessionData((current) => ({ ...current, recurringBilling: false }));
      } catch (error) {}
    }
    setLoading(false);
  }, [sessionData]);

  const deleteCard = useCallback(async () => {
    setLoading(true);
    const option = confirm("Delete credit card from your account?");

    if (!option) {
      setLoading(false);
      return;
    }

    try {
      const response = await invokeBackendService("DeleteAccountCreditCard");

      if (!response.success) {
        handleBackendServiceError(response.error);
      }

      setSessionData((current) => ({
        ...current,
        cardStatus: "no card",
        recurringBilling: false,
      }));
    } catch (error) {}
    setLoading(false);
  }, []);

  return (
    <>
      <div className="w-full h-screen min-h-[33rem] flex flex-col items-center justify-center">
        <div className="absolute bottom-4 right-4">
          <Link
            className={`${
              loading
                ? "pointer-events-none text-gray-400"
                : "text-blue-400 hover:text-sky-300 visited:text-purple-500 visited:hover:text-purple-400"
            } `}
            to="/development"
            replace={true}
          >
            /development-test-page
          </Link>
        </div>
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-bold font-mono">Billing</h1>
          <div
            className={`${
              loading && "min-h-[7.5rem]"
            } relative flex flex-col min-w-[16rem] items-start w-full mb-3 /px-5 py-4 mt-3 bg-slate-800/60 rounded`}
          >
            <div className={`${loading ? "opacity-0" : "opacity-100"} w-full`}>
              <div className="px-5">
                card status:
                <span className="mx-2.5">
                  {sessionData.cardStatus === "valid" ? (
                    <span className="text-green-400">valid credit card</span>
                  ) : sessionData.cardStatus === "invalid" ? (
                    <span className="text-yellow-400">invalid credit card</span>
                  ) : (
                    <span className="text-red-400">no credit card</span>
                  )}
                </span>
              </div>
              {sessionData.tier === "paid" &&
              sessionData.cardStatus !== "no card" ? (
                <div className="px-5">
                  <div>
                    recurring billing:
                    <span className="mx-2">
                      {sessionData.recurringBilling ? (
                        <span className="text-green-400">enabled</span>
                      ) : (
                        <span className="text-yellow-400">disabled</span>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <></>
              )}
              {sessionData.tier === "paid" && sessionData.nextPaymentDate && (
                <div className="px-5">
                  api-key {sessionData.recurringBilling ? "renews" : "expires"}{" "}
                  :
                  <span
                    className={`mx-2.5 ${
                      sessionData.recurringBilling
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {sessionData.nextPaymentDate === todaysDate
                      ? "today"
                      : sessionData.nextPaymentDate}
                  </span>
                </div>
              )}
              {sessionData.payments?.length ? (
                <div className="flex flex-col items-center">
                  <div className="flex justify-center mt-6 mb-3">
                    <div className="underline">payment history:</div>
                  </div>
                  <div className="max-h-28 w-fit overflow-y-auto scroll pl-2.5 pr-5 ml-1.5">
                    {sessionData.payments.map((payment, index) => (
                      <div
                        key={index}
                        className="flex justify-center space-x-5"
                      >
                        <div className="text-center text-yellow-400">
                          {payment.date}:
                        </div>
                        <div className="text-green-400 text-center">
                          ${payment.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <></>
              )}
            </div>
            <div
              className={`${
                loading ? "opacity-100" : "opacity-0"
              } absolute top-0 left-0 h-full w-full flex justify-center items-center pointer-events-none`}
            >
              loading...
            </div>
          </div>
          {!sessionData.cardStatus ? (
            <></>
          ) : sessionData.cardStatus === "no card" ? (
            <>
              <button
                className={`${
                  loading
                    ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                    : "bg-emerald-500 border-emerald-600/20 sepia-[0.4] hover:brightness-110 cursor-pointer"
                } border w-52 py-2 rounded transition-colors ease-out mb-2`}
                onClick={addCard}
                disabled={loading}
              >
                Add Credit Card
              </button>
            </>
          ) : (
            <>
              <button
                className={`${
                  loading
                    ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                    : `${
                        sessionData.cardStatus === "valid"
                          ? "bg-red-500/80 hover:bg-red-500 border-red-600/20"
                          : "bg-emerald-500 sepia-[0.4] hover:brightness-110 border-emerald-600/20"
                      } cursor-pointer`
                } border w-52 py-2 mb-2.5 rounded transition-colors ease-out duration-75`}
                onClick={
                  sessionData.cardStatus === "valid"
                    ? invalidateCard
                    : validateCard
                }
                disabled={loading}
              >
                {sessionData.cardStatus === "valid" ? "Invalidate" : "Validate"}{" "}
                Credit Card
              </button>
              {sessionData.tier === "paid" && (
                <button
                  className={`${
                    loading
                      ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                      : `${
                          sessionData.recurringBilling
                            ? "bg-red-500/80 hover:bg-red-500 border-red-600/20"
                            : "bg-emerald-500 sepia-[0.4] hover:brightness-110 border-emerald-600/20"
                        } cursor-pointer`
                  } border w-52 py-2 mb-2.5 rounded transition-colors ease-out duration-75`}
                  onClick={
                    sessionData.recurringBilling
                      ? disableReccuringBilling
                      : enableReccuringBilling
                  }
                  disabled={loading}
                >
                  {sessionData.recurringBilling ? "Disable" : "Enable"}{" "}
                  Recurring Billing
                </button>
              )}
              <button
                className={`${
                  loading
                    ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                    : "bg-red-500/80 hover:bg-red-500 border-red-600/20 cursor-pointer"
                } border w-52 py-2 mb-2.5 rounded transition-colors ease-out duration-75`}
                onClick={deleteCard}
              >
                Delete Credit Card
              </button>
            </>
          )}
          <Link
            className={`${
              loading
                ? "pointer-events-none text-gray-400"
                : "text-blue-400 hover:text-sky-300 visited:text-purple-500 visited:hover:text-purple-400"
            }`}
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

export default Billing;
