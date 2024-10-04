import { useLocation } from "react-router-dom";

// css
import "../css/clouds.css";

const CloudsBackground = () => {
  const location = useLocation();

  return (
    <>
      <div
        className={`${
          !["/login", "/register"].includes(location.pathname)
            ? "opacity-0"
            : "opacity-100"
        }  z-10 absolute top-0 left-0 w-full h-full min-h-[33rem] bg-black/10 overflow-hidden will-change-auto transition-opacity duration-300 ease-out`}
      >
        <div id="foglayer_01" className="fog">
          <div className="image01"></div>
          <div className="image02"></div>
        </div>
        <div id="foglayer_02" className="fog">
          <div className="image01"></div>
          <div className="image02"></div>
        </div>
        <div id="foglayer_03" className="fog">
          <div className="image01"></div>
          <div className="image02"></div>
        </div>
      </div>
    </>
  );
};

export default CloudsBackground;
