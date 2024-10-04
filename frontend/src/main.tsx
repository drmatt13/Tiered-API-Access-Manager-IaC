// import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./css/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// layout
import SecureApplication from "./components/SecureApplication.tsx";
import AppLayout from "./components/AppLayout.tsx";
import ModalLayout from "./components/ModalLayout.tsx";

// pages
import Home from "./pages/Home.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Account from "./pages/Account.tsx";
import ApiKeys from "./pages/ApiKey.tsx";
import Billing from "./pages/Billing.tsx";
import Development from "./pages/Development.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <BrowserRouter>
    <AppLayout>
      <SecureApplication>
        <ModalLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/account" element={<Account />} />
            <Route path="/api-key" element={<ApiKeys />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/development" element={<Development />} />
          </Routes>
        </ModalLayout>
      </SecureApplication>
    </AppLayout>
  </BrowserRouter>
  // </StrictMode>
);
