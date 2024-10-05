import { useState, useContext, useEffect } from "react";

// css
import "../css/scroll.css";

// context
import SessionContext from "../context/SessionContext";

const LogModal = () => {
  const [showLogs, setShowLogs] = useState(false);

  const { sessionData } = useContext(SessionContext);

  useEffect(() => {
    if (!showLogs) return;
    const logs = document.querySelector(".scroll");
    if (logs) logs.scrollTop = logs.scrollHeight;
  }, [sessionData.sessionLogs, showLogs]);

  return (
    <div className="relative">
      {/* ************************************************************************************************************************** */}
      <button
        onClick={() => setShowLogs(!showLogs)}
        className={`${
          !showLogs
            ? "opacity-100 pointer-events-auto /translate-x-0 ease-out bg-black/20 duration-500"
            : "opacity-0 pointer-events-none /-translate-x-full ease-in bg-black/20 duration-100"
        } absolute top-2.5 left-2.5 py-2.5 px-7 hover:bg-black/30 backdrop-blur rounded text-sm text-white/60 hover:text-white/100 transition-all z-50`}
      >
        logs
      </button>
      {/* ************************************************************************************************************************** */}
      <div
        className={`${
          showLogs
            ? "opacity-100 pointer-events-auto translate-x-0 ease-out bg-black/20 duration-300"
            : "opacity-0 pointer-events-none -translate-x-full ease-in bg-black/30 duration-200"
        } absolute top-2.5 left-2.5 text-sm w-96 h-[6.5rem] backdrop-blur rounded transition-all z-50 overflow-hidden /pt-10 flex`}
      >
        <div
          className="flex h-full justify-center items-center text-[.5rem] w-3 hover:bg-red-500/25 cursor-pointer transition-colors ease-in hover:duration-0 duration-100 group bg-black/10"
          onClick={() => setShowLogs(false)}
        >
          <i className="fa-solid fa-chevron-left text-white/50 group-hover:text-white transition-colors ease-in group-hover:duration-0 duration-100" />
        </div>
        <div className="flex-1 text-xs px-3 py-1.5 h-full overflow-y-auto scroll font-mono">
          {sessionData.sessionLogs.map((log, index) => {
            const [status, message] = log.split(": ");

            let isSessionRefresh =
              status.startsWith("Cognito session refreshed at") ||
              status.startsWith("Account password updated successfully");
            // status.endsWith("has logged in successfully");

            // Determine the color based on the log status
            let leftColor = isSessionRefresh
              ? "text-green-500"
              : status === "Token expired. Refreshing session..."
              ? "text-blue-400"
              : "text-purple-500";
            let rightColor = "text-yellow-500";
            if (message === "Success") {
              rightColor =
                status !== "InvokeDailyBilling"
                  ? "text-green-500"
                  : message === "Success"
                  ? "text-pink-400"
                  : "text-green-500";
              leftColor = "text-yellow-500";
            } else if (message === "Failed") {
              rightColor = "text-red-500";
              leftColor = "text-yellow-500";
            }

            return (
              <div key={index} className={`${leftColor} opacity-90`}>
                {status}
                {message === "Success" || message == "Failure" ? (
                  ":"
                ) : (
                  <>
                    {status !== "Token expired. Refreshing session..." &&
                    !isSessionRefresh ? (
                      <i className="ml-2.5 mr-0.5 -translate-y-[1px] fa-solid fa-arrow-right text-[.5rem] text-orange-500" />
                    ) : (
                      <></>
                    )}
                  </>
                )}{" "}
                <span className={rightColor}>
                  {status !== "InvokeDailyBilling"
                    ? message
                    : message === "Success"
                    ? "Invoked"
                    : message}
                </span>
              </div>
            );
          })}
        </div>
        {/* ************************************************************************************************************************** */}
        {/* <div
          className="absolute right-4 top-1.5 rounded-full bg-white/50 h-5 w-5 flex justify-center items-center hover:bg-red-400 cursor-pointer transition-colors z-10"
          onClick={() => setShowLogs(false)}
        >
          <i className="fas fa-times text-xs text-black" />
        </div> */}
        {/* ************************************************************************************************************************** */}
        {/* <div className="w-full h-full flex flex-col pl-2.5 overflow-y-scroll scroll text-xs">
          <div>item 1</div>
          <div>item 2</div>
          <div>item 3</div>
          <div>item 4</div>
          <div>item 5</div>
          <div>item 6</div>
          <div>item 7</div>
          <div>item 8</div>
          <div>item 9</div>
          <div>item 10</div>
          <div>item 11</div>
        </div> */}
      </div>
    </div>
  );
};

export default LogModal;
