import { useContext, useCallback, useEffect, useState, useRef } from "react";

// context
import SessionContext from "../context/SessionContext";

// css
import "../css/scroll.css";

const ViewSuccessfulPaymentsModal = () => {
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    invokeBackendService,
    allPayments,
    setAllPayments,
    sessionData,
    setSessionData,
    cachedSession,
  } = useContext(SessionContext);

  const pollPayments = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const paymentsLenth = allPayments ? allPayments.length : 0;
      const delay =
        paymentsLenth > 0
          ? new Promise((resolve) => setTimeout(resolve, 2000))
          : Promise.resolve();
      const responsePromise = invokeBackendService("PollAllPayments");
      const [response] = await Promise.all([responsePromise, delay]);

      if (!response.tableItems) {
        throw new Error("No payments found");
      }

      if (!sessionData.payments) {
        setSessionData((current) => ({
          ...current,
          payments: response.tableItems
            ?.filter(
              (item) =>
                item.user_id.S === cachedSession?.getIdToken().payload.sub
            )
            ?.map((item) => ({
              amount: +item.amount.S,
              date: item.date.S,
            }))
            .sort((a, b) => {
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);
              return dateB.getTime() - dateA.getTime(); // Ascending order
            }),
        }));
      }
      setAllPayments(
        response.tableItems?.sort((a, b) => {
          return new Date(b.date.S).getTime() - new Date(a.date.S).getTime();
        })
      );
    } catch (error) {
      alert("No payments found");
      console.error("Failed to poll payments:", error);
    }

    setLoading(false);
  }, [loading, allPayments, invokeBackendService, setAllPayments]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [allPayments]);

  return (
    <>
      <div className="w-full flex flex-col pt-12 items-center bg-gradient-to-br from-gray-900 to-green-900/75 backdrop-blur-3xl">
        {allPayments?.length ? (
          <>
            <div
              className={`${
                loading ? "cursor-not-allowed" : "cursor-pointer"
              } absolute top-1.5 left-[7px]  aspect-square h-6 text-center group`}
              onClick={pollPayments}
            >
              <i
                className={`${
                  loading
                    ? "text-green-400 animate-spin duration-150"
                    : "text-white/50 group-hover:text-white/80 duration-300"
                } fa-solid fa-arrows-rotate text-xl transition-colors ease-out -mt-[1px]`}
              />
            </div>
            <div className="flex max-h-48 w-fit pl-2.5 pr-5 ml-1.5 mb-8">
              <div className="flex flex-col items-center">
                <div className="mb-3 flex justify-between w-full">
                  <div className="text-gray-300 ml-9">date</div>
                  <div
                    className={`text-gray-300 ${
                      allPayments.length > 6
                        ? "translate-x-2"
                        : "translate-x-1.5"
                    }`}
                  >
                    user
                  </div>
                  <div
                    className={`text-gray-300 ${
                      allPayments.length > 6 ? "mr-10" : "mr-7"
                    }`}
                  >
                    $
                  </div>
                </div>
                <div
                  className="flex-1 w-fit overflow-y-auto scroll pl-2.5 pr-5 ml-1.5"
                  ref={scrollRef}
                >
                  {allPayments.map((payment, index) => (
                    <div
                      key={index}
                      className={`${
                        loading && "animate-pulse"
                      } flex justify-center`}
                    >
                      <div className="text-center text-yellow-400 mr-5">
                        {payment.date.S}
                      </div>
                      <div className="text-center text-blue-400 max-w-[5rem] truncate mr-4">
                        {payment.user_id.S}
                      </div>
                      <div className="text-green-400 text-center">
                        ${payment.amount.S}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mb-4">View all appllication payments</div>
        )}
        {!allPayments?.length && (
          <button
            type="button"
            onClick={pollPayments}
            disabled={loading}
            className={`${
              loading
                ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                : "bg-green-500/80 hover:bg-green-500 border-green-600/20 cursor-pointer"
            } mb-12 border flex-1 px-4 py-2 rounded transition-colors ease-out /text-sm`}
          >
            Poll Application Payments
          </button>
        )}
      </div>
    </>
  );
};

export default ViewSuccessfulPaymentsModal;
