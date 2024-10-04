import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

// images
import background from "../assets/images/8155b41ae43140299c342079a2c134dd-700.jpg";
import CloudsBackground from "./CloudsBackground";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();

  return (
    <>
      <CloudsBackground />
      <div className="w-full h-screen relative text-white">
        <div>
          <div
            className={`${
              !["/login", "/register"].includes(location.pathname)
                ? "bg-black/20"
                : "bg-black/0"
            } min-h-[30rem] absolute top-0 left-0 w-screen h-screen z-10 pointer-events-none transition-colors ease-out duration-[400ms]`}
          />
          <img
            className={`min-h-[30rem] w-full h-full object-cover absolute top-0 left-0 z-0 pointer-events-none transition-all ease-out duration-[400ms]`}
            src={background}
            alt="background"
          />
        </div>
        <div className="z-10 absolute top-0 w-full min-h-[30rem] ">
          {children}
        </div>
      </div>
    </>
  );
};

export default AppLayout;
