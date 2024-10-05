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
      <div className="min-h-screen relative flex flex-col items-center justify-center text-white">
        <CloudsBackground />
        <div
          className={`${
            !["/login", "/register"].includes(location.pathname)
              ? "bg-black/20"
              : "bg-black/0"
          } h-full absolute top-0 left-0 w-screen object-cover pointer-events-none transition-colors ease-out duration-[400ms]`}
        />
        <img
          className={`h-full absolute top-0 left-0 w-screen object-cover -z-10 pointer-events-none`}
          src={background}
          alt="background"
        />
        <div className="w-full mx-auto overflow-hidden /p-8 z-10">
          {children}
        </div>
      </div>
    </>
  );
};

export default AppLayout;
