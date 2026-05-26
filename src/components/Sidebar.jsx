import { Activity, Bell, FileText, Gauge, Server, Settings, Shield, Mail } from "lucide-react";

export function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Server size={24} />
        <span>GrafOps Node</span>
      </div>
      <nav>
        <button type="button" className={activeTab === "overview" ? "active" : ""} onClick={() => onTabChange("overview")}>
          <Activity size={18} /> Tổng quan
        </button>
        <button type="button" className={activeTab === "servers" ? "active" : ""} onClick={() => onTabChange("servers")}>
          <Server size={18} /> Máy chủ
        </button>
        <button type="button" className={activeTab === "services" ? "active" : ""} onClick={() => onTabChange("services")}>
          <Server size={18} /> Dịch vụ
        </button>
        <button type="button" className={activeTab === "alerts" ? "active" : ""} onClick={() => onTabChange("alerts")}>
          <Bell size={18} /> Cảnh báo
        </button>
        <button type="button" className={activeTab === "logs" ? "active" : ""} onClick={() => onTabChange("logs")}>
          <FileText size={18} /> Nhật ký
        </button>
        <button type="button" className={activeTab === "security" ? "active" : ""} onClick={() => onTabChange("security")}>
          <Shield size={18} /> Bảo mật
        </button>
        <button type="button" className={activeTab === "smtp" ? "active" : ""} onClick={() => onTabChange("smtp")}>
          <Mail size={18} /> Cấu hình cảnh báo
        </button>
        <button type="button" className={activeTab === "settings" ? "active" : ""} onClick={() => onTabChange("settings")}>
          <Settings size={18} /> Cài đặt
        </button>
      </nav>
    </aside>
  );
}

