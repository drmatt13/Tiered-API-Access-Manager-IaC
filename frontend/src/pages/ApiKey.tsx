import { useState, useCallback, useContext, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Clipboard from "clipboard";

// context
import SessionContext from "../context/SessionContext";

const formatDate = (date: Date) => {
  const [year, month, day] = date.toISOString().split("T")[0].split("-");
  return `${month}-${day}-${year}`;
};

function getAdjustedDate(dateStr: string, direction: "forward" | "backward") {
  const [month, day, year] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (direction === "forward") date.setMonth(date.getMonth() + 1);
  else if (direction === "backward") date.setMonth(date.getMonth() - 1);
  return formatDate(date);
}

function ApiKey() {
  const {
    sessionData,
    setSessionData,
    invokeBackendService,
    handleBackendServiceError,
  } = useContext(SessionContext);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const btnRef = useRef<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);
  const timoutRef = useRef<NodeJS.Timeout | null>(null);

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
        recurringBilling: recurring?.BOOL ?? false, // Fallback to false if recurring is undefined
      }));
    } catch (error) {
      setSessionData((current) => ({
        ...current,
        cardStatus: "no card",
      }));
    }
  }, [invokeBackendService]);

  const upgradeTier = useCallback(async () => {
    setLoading(true);
    if (sessionData.cardStatus === "no card") {
      alert(
        "To upgrade your account, you first need to add a credit card. Visit the billing page to add a credit card."
      );
      return setLoading(false);
    }
    const upgradeChoice = confirm(
      "Pay $20 to upgrade your account for 1 month? This will allow you to make 1000 api requests per day."
    );
    if (!upgradeChoice) return setLoading(false);
    const recurring = confirm(
      "Would you like to enable automatic monthly payments, ensuring uninterrupted access to your account features? Selecting 'Ok' will charge your payment method each month."
    );
    try {
      const response = await invokeBackendService("MakeCrediCardPayment", {
        recurring,
      });

      if (!response.success) {
        handleBackendServiceError(response.error);
      }

      const payment = {
        date: formatDate(new Date()),
        amount: 20,
      };

      setSessionData((current) => ({
        ...current,
        recurringBilling: recurring,
        tier: "paid",
        nextPaymentDate: getAdjustedDate(payment.date, "forward"),
        payments: sessionData.payments
          ? [...sessionData.payments, payment]
          : undefined,
      }));
    } catch (error) {
      alert(
        "Payment unsuccessful. Please try again. If the issue persists, verify your payment method or contact support for assistance."
      );
    }
    setLoading(false);
  }, [invokeBackendService, sessionData.cardStatus]);

  const randomizeKey = useCallback(async () => {
    setLoading(true);
    const option = confirm(
      "Are you certain you want to randomize your API key? Keep in mind that changing your API key means you'll need to update all applications using it to ensure they continue working properly."
    );
    if (option) {
      try {
        const response = await invokeBackendService("ResetAccountApiKey");
        if (!response.success) {
          handleBackendServiceError(response.error);
        }
        setSessionData((current) => ({
          ...current,
          key: response.apiKey,
        }));
      } catch (error) {
        alert("Failed to randomize your API key. Please try again.");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!initialLoad) return;
    setLoading(true);
    let getUsersApiKeyDataPromise: Promise<void> | null = null;
    let getUsersCardDataPromise: Promise<void> | null = null;
    if (!sessionData.key || !sessionData.tier)
      getUsersApiKeyDataPromise = getUsersApiKeyData();
    if (!sessionData.cardStatus) getUsersCardDataPromise = getUsersCardData();
    const promises = [
      getUsersApiKeyDataPromise,
      getUsersCardDataPromise,
    ].filter((p) => p !== null) as Promise<void>[];
    Promise.all(promises).then(() => {
      setLoading(false);
    });
    setInitialLoad(false);
  }, [
    getUsersApiKeyData,
    getUsersCardData,
    sessionData.cardStatus,
    sessionData.key,
    sessionData.tier,
  ]);

  // clipboard
  useEffect(() => {
    if (!btnRef.current) return;

    const clipboard = new Clipboard(btnRef.current, {
      text: () => sessionData.key || "",
    });

    clipboard.on("success", () => {
      setCopied(true);

      if (timoutRef.current) clearTimeout(timoutRef.current);

      const removeCopied = () => {
        setCopied(false);
        window.removeEventListener("mousemove", removeCopied);
      };

      window.addEventListener("mousemove", removeCopied);

      timoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 1000);
    });

    clipboard.on("error", () => {
      alert("Failed to copy Api Key to clipboard");
    });

    // Cleanup when the component unmounts
    return () => {
      clipboard.destroy();
    };
  }, [sessionData.key]);

  return (
    <>
      <div className="w-full h-full min-h-screen flex flex-col justify-center items-center p-8 pb-14">
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
          <h1 className="text-3xl font-bold font-mono">ApiKey</h1>

          {/* {sessionData.tier && sessionData.key ? ( */}
          <div className="px-5 relative flex flex-col items-left w-96 max-w-[90vw] py-4 mt-3 bg-slate-800/60 rounded">
            <div className={!loading ? "opacity-100" : "opacity-0"}>
              <div className="text-lg">
                <span className="text-yellow-600 mr-2.5">tier:</span>
                <span
                  className={`${
                    sessionData.tier === "paid"
                      ? "text-green-500/80"
                      : "text-red-500"
                  }`}
                >
                  {sessionData.tier}
                </span>
              </div>
              <div className="flex">
                <div className="text-lg truncate text-green-500/80 mr-2.5">
                  <span className="text-yellow-600 mr-2.5">key:</span>
                  {sessionData.key}
                </div>
                <div className="relative text-xl h-full">
                  <i
                    className="fa-regular fa-copy cursor-pointer text-purple-500 hover:text-purple-400 transition-colors ease-out"
                    ref={btnRef}
                  />
                  <div
                    className={`${
                      copied ? "opacity-100" : "opacity-0"
                    } absolute bottom-0 translate-y-[125%] -translate-x-[33%] mt-2 px-2 py-1 bg-black/80 text-white text-sm rounded`}
                  >
                    Copied!
                  </div>
                </div>
              </div>
            </div>
            <div
              className={`${
                loading ? "opacity-100" : "opacity-0"
              } absolute top-0 left-0 h-full w-full flex justify-center items-center pointer-events-none`}
            >
              loading...
            </div>
          </div>

          <button
            className={`${
              loading ||
              sessionData.tier === "paid" ||
              !sessionData.tier ||
              !sessionData.key
                ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                : "bg-emerald-500 sepia-[0.4] border-emerald-600 hover:brightness-110 cursor-pointer"
            } w-52 mt-3 py-2 rounded transition-colors border ease-out duration-75`}
            onClick={upgradeTier}
            disabled={
              loading ||
              sessionData.tier === "paid" ||
              !sessionData.tier ||
              !sessionData.key
            }
          >
            Upgrade Tier
          </button>
          <button
            className={`${
              loading || !sessionData.tier || !sessionData.key
                ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                : "bg-purple-500/[72.5%] hover:bg-purple-500/90 border border-purple-600/20 cursor-pointer"
            } w-52 mt-3 py-2 rounded transition-colors border ease-out duration-75`}
            onClick={randomizeKey}
            disabled={loading || !sessionData.tier || !sessionData.key}
          >
            Randomize Key
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

export default ApiKey;
