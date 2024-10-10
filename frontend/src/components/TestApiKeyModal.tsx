import { useEffect, useRef, useState, useContext, useCallback } from "react";
import Clipboard from "clipboard";
import anime from "animejs/lib/anime.es.js";
import axios from "axios";

// context
import SessionContext from "../context/SessionContext";

// images
import serverImage from "../assets/images/server.png";
import apiImage from "../assets/images/api.png";

// css
import "../css/slider.css";

// const API_ENDPOINT = import.meta.env.VITE_ApiKeyThrottledApi as string;
const API_ENDPOINT = "http://localhost:3000";

const TestApiKeyModal = () => {
  const {
    sessionData,
    invokeBackendService,
    handleBackendServiceError,
    setSessionData,
  } = useContext(SessionContext);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isInitialRequestRunning, setIsInitialRequestRunning] = useState(false);
  const apiKeyBtnRef = useRef<HTMLElement | null>(null);
  const urlBtnRef = useRef<HTMLElement | null>(null);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const apiKeyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const urlTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [rangeValue, setRangeValue] = useState(1);
  const animationContainerRef = useRef<HTMLDivElement | null>(null);
  const [invoking, setInvoking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const requestCountRef = useRef(0);
  const initialRequestRef = useRef(false);
  const failedCountRef = useRef(0);
  const stopRequestedRef = useRef(false);

  const getUsersApiKeyData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await invokeBackendService("GetAccountApiKey");

      if (!response.success) {
        handleBackendServiceError(response.error);
      }

      const { apiKey, tier, nextPayment } = response.tableItem ?? {};

      setSessionData((current) => ({
        ...current,
        key: apiKey?.S ?? "",
        tier: tier?.S ?? "free",
        nextPaymentDate: nextPayment?.S ?? "",
      }));
    } catch (error) {
      alert(
        "Failed to get account api key, fatal error, please contact support."
      );
    }
    setInitialLoad(false);
    setLoading(false);
  }, [invokeBackendService]);

  const refreshApiKey = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const apiKeyRefreshDelay = new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );
      const responsePromise = invokeBackendService("GetAccountApiKey");

      const [response] = await Promise.all([
        responsePromise,
        apiKeyRefreshDelay,
      ]);

      if (!response.success) {
        handleBackendServiceError(response.error);
      }

      const { apiKey, tier } = response.tableItem ?? {};

      setSessionData((current) => ({
        ...current,
        key: apiKey?.S ?? "",
        tier: tier?.S ?? "free",
      }));
    } catch (error) {
      alert(
        "Failed to refresh account api key, fatal error, please contact support."
      );
      console.error("Failed to refresh API key:", error);
    }

    setLoading(false);
  }, [loading, invokeBackendService, handleBackendServiceError]);

  useEffect(() => {
    if (initialLoad && !sessionData.key) {
      getUsersApiKeyData();
    } else {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    if (!apiKeyBtnRef.current || !urlBtnRef.current) return;

    const clipboardApiKey = new Clipboard(apiKeyBtnRef.current, {
      text: () => sessionData.key || "",
    });

    clipboardApiKey.on("success", () => {
      setCopiedApiKey(true);

      if (apiKeyTimeoutRef.current) clearTimeout(apiKeyTimeoutRef.current);

      apiKeyTimeoutRef.current = setTimeout(() => {
        setCopiedApiKey(false);
      }, 1000);
    });

    clipboardApiKey.on("error", () => {
      alert("Failed to copy API Key to clipboard");
    });

    const clipboardUrl = new Clipboard(urlBtnRef.current, {
      text: () => API_ENDPOINT || "",
    });

    clipboardUrl.on("success", () => {
      setCopiedUrl(true);

      if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current);

      urlTimeoutRef.current = setTimeout(() => {
        setCopiedUrl(false);
      }, 1000);
    });

    clipboardUrl.on("error", () => {
      alert("Failed to copy URL to clipboard");
    });

    return () => {
      clipboardApiKey.destroy();
      clipboardUrl.destroy();
    };
  }, [sessionData.key]);

  const stopInvoking = useCallback(() => {
    console.log("stop invoking");
    setInvoking(false);
    setIsInitialRequestRunning(false);
    stopRequestedRef.current = true;
    initialRequestRef.current = false; // Allow initial request to run again
    failedCountRef.current = 0; // Reset the failure count for the next run
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const createRequest = useCallback(async () => {
    const parent = document.createElement("div");
    parent.classList.add(
      "absolute",
      "h-full",
      "w-full",
      "top-0",
      "left-0",
      "flex",
      "items-center"
    );

    const child = document.createElement("div");
    child.classList.add("w-12", "h-0.5", "rounded-full", "bg-yellow-400");

    // Apply the random Y translation instantly with a range of -5px to 5px
    const randomY = Math.floor(Math.random() * 11) - 5; // Random value between -5 and 5
    child.style.transform = `translateY(${randomY}px)`; // Set the random Y instantly

    parent.appendChild(child);
    animationContainerRef.current?.appendChild(parent);

    const easingArray = ["easeInSine", "linear"];
    const durationArray = [250, 300, 350, 400];

    // Create the animation promise first
    const promise = new Promise((resolve) => {
      anime({
        targets: parent,
        translateX: "calc(100% - 3rem)", // Only animate the X movement
        easing: easingArray[Math.floor(Math.random() * easingArray.length)],
        duration:
          durationArray[Math.floor(Math.random() * durationArray.length)],
        complete: () => {
          animationContainerRef.current?.removeChild(parent);
          resolve(null);
        },
      });
    });

    try {
      requestCountRef.current++;

      const req = axios.get(API_ENDPOINT, {
        // headers: {
        //   "x-api-key": sessionData.key,
        // },
      });

      // Wait for both the request and the animation to complete
      const [reqResult] = await Promise.all([req, promise]);

      const success = reqResult.data.success as boolean;
      await createResponse(success); // Wait for response animation to complete
      failedCountRef.current > 0 && failedCountRef.current--;
      return success; // Make sure to return the success value
    } catch (error) {
      // Wait for the animation to complete before handling the error
      await promise;
      failedCountRef.current++;
      await createResponse(false); // Wait for response animation to complete
      return false; // Explicitly return false if the request fails
    }
  }, []);

  const createResponse = useCallback((success: boolean) => {
    return new Promise<void>((resolve) => {
      const parent = document.createElement("div");
      parent.classList.add(
        "absolute",
        "h-full",
        "w-full",
        "top-0",
        "left-[calc(100%-3rem)]",
        "flex",
        "items-center"
      );

      const child = document.createElement("div");
      child.classList.add(
        "w-12",
        "h-0.5",
        "rounded-full",
        success ? "bg-green-400" : "bg-red-400"
      );

      // Apply the random Y translation instantly with a range of -25px to 25px
      const randomY = Math.floor(Math.random() * 11) - 5; // Random value between -25 and 25
      child.style.transform = `translateY(${randomY}px)`; // Set the random Y instantly

      parent.appendChild(child);
      animationContainerRef.current?.appendChild(parent);

      const easingArray = ["easeInSine", "linear"];
      const durationArray = [250, 300, 350, 400];

      anime({
        targets: parent,
        translateX: "calc(-100% + 3rem)", // Only animate the X movement
        easing: easingArray[Math.floor(Math.random() * easingArray.length)],
        duration:
          durationArray[Math.floor(Math.random() * durationArray.length)],
        complete: () => {
          animationContainerRef.current?.removeChild(parent);
          resolve(); // Resolve the promise when the animation is complete
        },
      });
    });
  }, []);

  const startInvoking = useCallback(() => {
    console.log("start invoking");
    if (intervalRef.current || stopRequestedRef.current) return;

    setInvoking(true);
    intervalRef.current = setInterval(() => {
      if (failedCountRef.current > 5 || stopRequestedRef.current) {
        stopInvoking(); // Automatically stop when too many failures occur or stop is requested
        initialRequest();
      } else {
        createRequest();
      }
    }, 1000 / rangeValue);
  }, [rangeValue, stopInvoking, createRequest]);

  const initialRequest = useCallback(async () => {
    if (initialRequestRef.current) return;

    setIsInitialRequestRunning(true);
    stopRequestedRef.current = false;

    const attemptInitialRequest = async () => {
      if (!initialRequestRef.current || stopRequestedRef.current) return;

      const success = await createRequest(); // Wait for createRequest to resolve

      if (success) {
        setIsInitialRequestRunning(false);
        startInvoking(); // Start the repeated invocation process if the initial request succeeds
      } else {
        // If the request fails, retry only if the stop button wasn't clicked
        if (initialRequestRef.current && !stopRequestedRef.current) {
          console.log("Retrying initial request...");
          setTimeout(attemptInitialRequest, 1000); // Retry after 1 second
        }
      }
    };

    // Mark the initial request as started
    initialRequestRef.current = true;

    // Begin the request attempt
    await attemptInitialRequest();
  }, [startInvoking, createRequest, createResponse]);

  return (
    <>
      <div className="w-full flex flex-col pt-12 pb-6 items-center bg-gradient-to-br from-gray-900 to-purple-900/75 backdrop-blur-3xl">
        <div
          className={`${
            loading ? "cursor-not-allowed" : "cursor-pointer"
          } absolute top-1.5 left-[7px] aspect-square h-6 text-center group`}
          onClick={refreshApiKey}
        >
          <i
            className={`${
              loading
                ? "text-green-400 animate-spin duration-150"
                : "text-white/50 group-hover:text-white/80 duration-300"
            } fa-solid fa-arrows-rotate text-xl transition-colors ease-out -mt-[1px]`}
          />
        </div>
        <div className="px-5 relative flex flex-col items-left w-96 max-w-[90vw]">
          <div
            className={`${
              loading ? "opacity-100" : "opacity-0"
            } absolute top-0 left-0 h-full w-full flex justify-center items-center pointer-events-none`}
          >
            loading...
          </div>
          <div className={!loading ? "opacity-100" : "opacity-0"}>
            <div className="">
              <span className="text-lg text-yellow-600 mr-3">tier:</span>
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
              <div className="truncate text-green-500/80 mr-2.5">
                <span className="text-lg text-yellow-600 mr-2.5">key:</span>
                {sessionData.key}
              </div>
              <div className="relative text-xl h-full z-20">
                <i
                  className="fa-regular fa-copy cursor-pointer text-purple-500 hover:text-purple-400 transition-colors ease-out"
                  ref={apiKeyBtnRef}
                />
                <div
                  className={`${
                    copiedApiKey
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
                  } absolute bottom-0 translate-y-[125%] -translate-x-[33%] mt-2 px-2 py-1 bg-black/80 text-white text-sm rounded z-30`}
                >
                  Copied!
                </div>
              </div>
            </div>
            <div className="flex">
              <div className="truncate text-purple-400/75 mr-2.5">
                <span className="text-lg text-yellow-600 mr-4">url:</span>
                {API_ENDPOINT}
              </div>
              <div className="relative text-xl h-full z-10">
                <i
                  className="fa-regular fa-copy cursor-pointer text-purple-500 hover:text-purple-400 transition-colors ease-out"
                  ref={urlBtnRef}
                />
                <div
                  className={`${
                    copiedUrl ? "opacity-100" : "opacity-0"
                  } absolute bottom-0 translate-y-[125%] -translate-x-[33%] mt-2 px-2 py-1 bg-black/80 text-white text-sm rounded z-15`}
                >
                  Copied!
                </div>
              </div>
            </div>
            <div className="relative mt-6 flex w-full justify-between -z-10">
              <div>
                <img className="aspect-square h-14" src={serverImage} />
              </div>
              <div className="flex-1"></div>
              <div>
                <img className="aspect-square h-14 rounded" src={apiImage} />
              </div>
              <div
                className="absolute h-14 w-full -z-10"
                ref={animationContainerRef}
              ></div>
            </div>

            <div className="mt-5 text-yellow-600">
              <span className="text-md">requests per second: </span>
              <span className="text-green-500">{rangeValue}</span>
            </div>
            <div className="group my-0.5">
              <input
                type="range"
                disabled={invoking}
                name=""
                id=""
                className={`${
                  invoking ? "cursor-not-allowed" : "cursor-pointer"
                } w-full accent-purple-400`}
                min={1}
                max={100}
                value={rangeValue}
                onChange={(e) => setRangeValue(Number(e.target.value))}
                // style={{
                //   background: `linear-gradient(to right, #A855F7 ${
                //     rangeValue === 1 ? 0 : rangeValue * 4.8
                //   }%, #705070 ${rangeValue === 1 ? 0 : rangeValue * 4.8}%)`, // Updated gray color
                // }}
              />
            </div>
            <div className="flex mt-2.5 w-full justify-center space-x-2.5">
              {!invoking && !isInitialRequestRunning && (
                <button
                  type="button"
                  disabled={loading}
                  className={`${
                    loading
                      ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                      : "bg-green-500/80 hover:bg-green-500 border-green-600/20 cursor-pointer"
                  } border px-8 py-2 rounded transition-colors ease-out truncate text-xs sm:text-base`}
                  onClick={initialRequest}
                >
                  Start
                </button>
              )}
              {(invoking || isInitialRequestRunning) && (
                <button
                  type="button"
                  disabled={loading}
                  className={`${
                    loading
                      ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                      : "bg-red-500/80 hover:bg-red-500 border-red-600/20 cursor-pointer"
                  } border px-8 py-2 rounded transition-colors ease-out truncate text-xs sm:text-base`}
                  onClick={stopInvoking}
                >
                  Stop
                </button>
              )}
              <button
                type="button"
                disabled={loading}
                className={`${
                  loading
                    ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                    : "bg-purple-500/80 hover:bg-purple-500 border-purple-600/20 cursor-pointer"
                } border flex-1 px-4 py-2 rounded transition-colors ease-out truncate text-xs sm:text-base`}
              >
                Reset Invocation Quota
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TestApiKeyModal;
