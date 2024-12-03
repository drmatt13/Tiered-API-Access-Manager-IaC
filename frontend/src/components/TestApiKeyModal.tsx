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

const API_ENDPOINT = import.meta.env.VITE_ManagedApi as string;
// const API_ENDPOINT = "http://MyALB-2076243712.us-east-1.elb.amazonaws.com";

const TestApiKeyModal = () => {
  const {
    sessionData,
    invokeBackendService,
    handleBackendServiceError,
    setSessionData,
  } = useContext(SessionContext);

  const apiImageDivRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const apiKeyBtnRef = useRef<HTMLElement | null>(null);
  const urlBtnRef = useRef<HTMLElement | null>(null);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const apiKeyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const urlTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // animation

  const animationContainerRef = useRef<HTMLDivElement | null>(null);
  const rangeValueRef = useRef<number>(1);
  const [rangeValue, setRangeValue] = useState(1);
  const [polling, setPolling] = useState(false);
  const isPollingRef = useRef(false);
  const [animationRunning, setAnimationRunning] = useState(false);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const badCountRef = useRef(0);
  const resetFlagRef = useRef(false);
  const resetPollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const [activeRequestCount, setActiveRequestCount] = useState(0);
  const activeRequestCountRef = useRef(0);
  const [draining, setDraining] = useState(false);

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

  const ResetInvocationQuota = useCallback(async () => {
    setLoading(true);
    try {
      const response = await invokeBackendService("ResetInvocationQuota");

      if (!response.success) {
        handleBackendServiceError(response.error);
      }

      const { apiKey } = response;

      setSessionData((current) => ({
        ...current,
        key: apiKey,
      }));

      // reset everything
      apiKeyTimeoutRef.current = null;
      urlTimeoutRef.current = null;
      setPolling(false);
      setAnimationRunning(false);
      badCountRef.current = 0;
      isPollingRef.current = false;
      resetFlagRef.current = true;
      setDraining(false);
      if (animationIntervalRef.current)
        clearInterval(animationIntervalRef.current);
      if (resetPollingTimeoutRef.current)
        clearTimeout(resetPollingTimeoutRef.current);

      alert("Invocation quota reset successfully.");
    } catch (error) {
      alert(
        "Failed to reset invocation quota, fatal error, please contact support."
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    console.log("sessionData", sessionData);
  }, [sessionData]);

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
  }, [sessionData]);

  useEffect(() => {
    // console.log("draining", draining);
    // console.log("activeRequestCount", activeRequestCount);
    if (draining && activeRequestCount === 0) {
      // console.log("draining done");
      setDraining(false);
      isPollingRef.current = true;
      poll();
    }
  }, [draining, activeRequestCount]);

  // ANIMATION

  const animateRequest = useCallback(async () => {
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
    child.classList.add("w-12", "h-[1.5px]", "rounded-full", "bg-yellow-400");

    // Apply the random Y translation instantly with a range of -5px to 5px
    const randomY = Math.floor(Math.random() * 13) - 14; // Random value between -5 and 5
    child.style.transform = `translateY(${randomY}px)`; // Set the random Y instantly

    parent.appendChild(child);
    animationContainerRef.current?.appendChild(parent);

    const easingArray = ["easeInSine", "linear", "easeInQuad"];
    const durationArray = [240, 250, 260, 350, 375, 400];

    const promise = new Promise((resolve) => {
      anime({
        targets: parent,
        translateX: "calc(100% - 3rem)", // Only animate the X movement
        easing: easingArray[Math.floor(Math.random() * easingArray.length)],
        duration:
          durationArray[Math.floor(Math.random() * durationArray.length)],
        complete: () => {
          animationContainerRef.current?.removeChild(parent);
          resolve(undefined);
        },
      });
    });
    return promise;
  }, []);

  // useEffect(() => {
  //   console.log("activeRequestCount", activeRequestCount);
  // }, [activeRequestCount]);

  const animateResponse = useCallback((success: boolean) => {
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
      "h-[1.5px]",
      "rounded-full",
      success ? "bg-green-400" : "bg-red-400"
    );

    // Apply the random Y translation instantly with a range of -25px to 25px
    const randomY = Math.floor(Math.random() * 11) + 3; // Random value between -25 and 25
    child.style.transform = `translateY(${randomY}px)`; // Set the random Y instantly

    parent.appendChild(child);
    animationContainerRef.current?.appendChild(parent);

    const easingArray = ["easeInSine", "linear", "easeInQuad"];
    const durationArray = [240, 250, 260, 350, 375, 400];

    const promise = new Promise((resolve) => {
      anime({
        targets: parent,
        translateX: "calc(-100% + 3rem)", // Only animate the X movement
        easing: easingArray[Math.floor(Math.random() * easingArray.length)],
        duration:
          durationArray[Math.floor(Math.random() * durationArray.length)],
        complete: () => {
          animationContainerRef.current?.removeChild(parent);
          setActiveRequestCount((prev) => {
            activeRequestCountRef.current = prev - 1;
            return prev - 1;
          });
          resolve(undefined);
        },
      });
    });
    return promise;
  }, []);

  const resetPolling = useCallback(() => {
    if (!isPollingRef.current) return;
    if (animationIntervalRef.current)
      clearInterval(animationIntervalRef.current);
    setAnimationRunning(false);
    setPolling(true);
    isPollingRef.current = false;
    badCountRef.current = 0;
    setDraining(true);
  }, []);

  const processRequestsAtInterval = useCallback(() => {
    if (resetFlagRef.current) return;
    setPolling(false);
    setAnimationRunning(true);

    if (animationIntervalRef.current)
      clearInterval(animationIntervalRef.current);

    animationIntervalRef.current = setInterval(() => {
      const axiosPromise = axios.get(API_ENDPOINT, {
        // api key
        headers: {
          "x-api-key": sessionData.key,
        },
      });
      setActiveRequestCount((prev) => {
        activeRequestCountRef.current = prev + 1;
        return prev + 1;
      });
      const animateRequestPromise = animateRequest();

      axiosPromise
        .then(() => {
          if (badCountRef.current > 0) badCountRef.current -= 1;
        })
        .catch(() => {
          badCountRef.current += 1;
          if (badCountRef.current > 4) {
            resetFlagRef.current = true;
            // console.log("resetting polling", activeRequestCount);
            resetPolling();
          }
        });

      // Run this when both Axios request and animateRequestPromise are settled
      Promise.allSettled([axiosPromise, animateRequestPromise]).then(
        ([axiosResult]) => {
          const requestSuccess = axiosResult.status === "fulfilled";
          animateResponse(requestSuccess);
        }
      );
    }, 1000 / rangeValueRef.current);
  }, [animationIntervalRef.current, sessionData]);

  const poll = useCallback(() => {
    if (!isPollingRef.current || !isMountedRef.current) return;

    resetFlagRef.current = false;

    setPolling(true);

    const oneSecond = new Promise((resolve) => setTimeout(resolve, 1500));
    const axiosPromise = axios.get(API_ENDPOINT, {
      headers: {
        "x-api-key": sessionData.key,
      },
    });
    setActiveRequestCount((prev) => {
      activeRequestCountRef.current = prev + 1;
      return prev + 1;
    });
    const animateRequestPromise = animateRequest();

    Promise.allSettled([axiosPromise, animateRequestPromise]).then(
      async ([axiosResult]) => {
        if (!isMountedRef.current) return;

        // console.log("axiosResult", axiosResult.status);

        const requestSuccess = axiosResult.status === "fulfilled";
        await animateResponse(requestSuccess);

        if (requestSuccess) {
          if (isMountedRef.current && isPollingRef.current) {
            processRequestsAtInterval();
          }
        } else {
          if (isMountedRef.current && isPollingRef.current) {
            oneSecond.then(() => {
              if (isMountedRef.current && isPollingRef.current) {
                poll();
              }
            });
          }
        }
      }
    );
  }, [sessionData]);

  const trueStop = useCallback(() => {
    setAnimationRunning(false);
    setPolling(false);
    resetFlagRef.current = true;
    badCountRef.current = 0;
    isPollingRef.current = false;
    setDraining(false);
    if (animationIntervalRef.current)
      clearInterval(animationIntervalRef.current);
    if (resetPollingTimeoutRef.current)
      clearTimeout(resetPollingTimeoutRef.current);
  }, []);

  const refreshApiKey = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    trueStop();

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
  }, [loading, invokeBackendService, handleBackendServiceError, trueStop]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isPollingRef.current = false;
      if (animationIntervalRef.current)
        clearInterval(animationIntervalRef.current);
    };
  }, []);

  return (
    <>
      <div className="w-full flex flex-col pt-12 pb-6 items-center bg-gradient-to-br from-gray-900 to-purple-900/75 backdrop-blur-3xl">
        <button
          className={`${
            loading || activeRequestCount > 0 || polling || animationRunning
              ? "cursor-not-allowed"
              : "cursor-pointer"
          } absolute top-1.5 left-[7px] aspect-square h-6 text-center group`}
          onClick={refreshApiKey}
          disabled={
            loading || activeRequestCount > 0 || polling || animationRunning
          }
        >
          <i
            className={`${
              loading
                ? "text-green-400 animate-spin duration-150"
                : activeRequestCount > 0 || polling || animationRunning
                ? "text-white/50"
                : `text-white/50 group-hover:text-white/80 duration-300`
            } fa-solid fa-arrows-rotate text-xl transition-colors ease-out -mt-[1px]`}
          />
        </button>
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
              <div className="relative" ref={apiImageDivRef}>
                <img
                  className="relative aspect-square h-14 rounded z-10"
                  src={apiImage}
                />
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
                name=""
                id=""
                className={`cursor-pointer w-full accent-purple-400`}
                min={1}
                max={100}
                value={rangeValueRef.current}
                onChange={(e) => {
                  rangeValueRef.current = parseInt(e.target.value);
                  setRangeValue(rangeValueRef.current);
                  if (animationRunning) processRequestsAtInterval();
                }}
              />
            </div>
            <div className="flex mt-2.5 w-full justify-center space-x-2.5">
              {!(polling || animationRunning) && (
                <button
                  type="button"
                  onClick={() => {
                    isPollingRef.current = true;
                    poll();
                  }}
                  disabled={loading || activeRequestCount > 0}
                  className={`${
                    loading || activeRequestCount > 0
                      ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                      : "bg-green-500/80 hover:bg-green-500 border-green-600/20 cursor-pointer"
                  } border px-8 py-2 rounded transition-colors ease-out truncate text-xs sm:text-base`}
                >
                  Start
                </button>
              )}
              {(polling || animationRunning) && (
                <button
                  type="button"
                  onClick={trueStop}
                  disabled={loading}
                  className={`${
                    loading
                      ? "bg-gray-500 cursor-not-allowed border-black/20 text-white/60"
                      : "bg-red-500/80 hover:bg-red-500 border-red-600/20 cursor-pointer"
                  } border px-8 py-2 rounded transition-colors ease-out truncate text-xs sm:text-base`}
                >
                  Stop
                </button>
              )}
              <button
                type="button"
                onClick={ResetInvocationQuota}
                disabled={polling || animationRunning || activeRequestCount > 0}
                className={`${
                  polling || animationRunning || activeRequestCount > 0
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
