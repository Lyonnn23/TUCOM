import { Routes, Route } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import Overview from "./admin/Overview";
import Stations from "./admin/Stations";
import Reports from "./admin/Reports";
import Users from "./admin/Users";
import Analytics from "./admin/Analytics";
import Insights from "./admin/Insights";
import Config from "./admin/Config";

export default function Admin() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="stations" element={<Stations />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="insights" element={<Insights />} />
        <Route path="config" element={<Config />} />
      </Routes>
    </AdminLayout>
  );
}
