import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Categories from "@/pages/Categories";
import Discounts from "@/pages/Discounts";
import Displays from "@/pages/Displays";
import Settings from "@/pages/Settings";
import Images from "@/pages/Images";
import General from "@/pages/General";
import Display from "@/display/Display";
import LiveDisplay from "@/pages/LiveDisplay";
import { getToken } from "@/lib/api";
import ToastRoot, { pushToast } from "@/components/Toast";

function Protected({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/admin/login" replace />;
}

export default function App() {
  const [adminConnected, setAdminConnected] = useState(false);
  return (
    <>
      <Routes>
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin/*"
          element={
            <Protected>
              <Layout wsOnline={adminConnected}>
                <Routes>
                  <Route path="" element={<Dashboard />} />
                  <Route path="products" element={<Products />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="discounts" element={<Discounts />} />
                  <Route path="displays" element={<Displays />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="images" element={<Images />} />
                  <Route path="general" element={<General />} />
                  <Route path="live-display" element={<LiveDisplay />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </Layout>
            </Protected>
          }
        />
        <Route path="/display" element={<Display />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
      <ToastRoot />
    </>
  );
}

export { pushToast };
