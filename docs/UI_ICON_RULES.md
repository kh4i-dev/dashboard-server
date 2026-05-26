# UI Icon Rules

## Mục tiêu

Quy chuẩn này dùng cho giao diện Web Dashboard quản lý và giám sát server/network. Icon phải giúp người dùng nhận biết nhanh trạng thái hệ thống, không làm giao diện rối hoặc quá màu mè.

Phong cách ưu tiên:

- Minimal.
- Outline.
- Monochrome.
- Rõ nghĩa với dashboard kỹ thuật.
- Hợp với giao diện admin, monitoring, network và security.

## Package icon chính

### 1. Lucide Icons

Lucide là package icon mặc định của dự án.

Lý do chọn:

- Nhẹ.
- Outline đẹp.
- Hợp dashboard hiện đại.
- Hỗ trợ TypeScript tốt.
- Phù hợp phong cách Linear/Vercel/shadcn.
- Dễ dùng với React/Next.js.

Cài đặt:

```bash
npm install lucide-react
```

Ví dụ:

```tsx
import { Server, ShieldAlert, Cpu } from "lucide-react";

export function Example() {
  return (
    <div>
      <Server className="h-5 w-5" />
      <ShieldAlert className="h-5 w-5" />
      <Cpu className="h-5 w-5" />
    </div>
  );
}
```

## Package icon phụ

### 2. Tabler Icons

Dùng Tabler khi cần icon có cảm giác kỹ thuật hơn cho network/admin/system.

Phù hợp cho:

- Network.
- Server tools.
- Monitoring.
- Infrastructure.
- Admin panel.

Cài đặt:

```bash
npm install @tabler/icons-react
```

Quy tắc dùng:

- Chỉ dùng Tabler khi Lucide không có icon đủ rõ nghĩa.
- Không mix Tabler và Lucide trong cùng một cụm UI nhỏ nếu style lệch nhau.
- Giữ cùng kích thước và stroke width với Lucide nếu có thể.

### 3. React Icons

Dùng React Icons khi cần icon từ nhiều bộ khác nhau hoặc cần logo phổ biến.

Cài đặt:

```bash
npm install react-icons
```

Phù hợp cho:

- Logo công nghệ.
- Icon FontAwesome/Heroicons/Bootstrap nếu thật sự cần.
- Trường hợp Lucide/Tabler thiếu icon.

Quy tắc dùng:

- Không dùng React Icons làm package chính.
- Không import cả bộ icon lớn.
- Chỉ import icon cụ thể cần dùng.

Ví dụ:

```tsx
import { FaServer } from "react-icons/fa";
```

## Package không ưu tiên

### Heroicons

Heroicons có thể dùng nếu dự án theo Tailwind/SaaS style, nhưng không phải lựa chọn chính.

Lý do:

- Hợp web app/SaaS hơn dashboard sysadmin.
- Ít cảm giác technical/network hơn Lucide hoặc Tabler.

## Combo khuyến nghị

| Mục đích | Package |
|---|---|
| Main icons | Lucide |
| Technical/network icons | Tabler |
| Extra logos/special icons | React Icons |

## Mapping icon cho dashboard

| Feature | Icon gợi ý | Package |
|---|---|---|
| Server | `Server` | Lucide |
| CPU | `Cpu` | Lucide |
| RAM | `MemoryStick` | Lucide |
| Disk | `HardDrive` | Lucide |
| Alert | `TriangleAlert` hoặc `AlertTriangle` | Lucide |
| Security | `Shield` hoặc `ShieldAlert` | Lucide |
| Network | `Network` | Lucide |
| Logs | `FileText` | Lucide |
| Users | `Users` | Lucide |
| Backup | `DatabaseBackup` | Lucide |
| Monitoring | `Activity` | Lucide |
| Database | `Database` | Lucide |
| Online/Wifi | `Wifi` | Lucide |
| Lock/Auth | `Lock` | Lucide |
| Settings | `Settings` | Lucide |
| Notification | `Bell` | Lucide |

## Visual rules

Không dùng icon màu mè theo từng package.

Ưu tiên:

```tsx
<Server className="h-5 w-5 text-zinc-400" />
```

Hover state:

```tsx
<Server className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-white" />
```

Quy tắc chung:

- Icon sidebar: `h-5 w-5`.
- Icon card metric: `h-5 w-5` hoặc `h-6 w-6`.
- Icon button nhỏ: `h-4 w-4`.
- Icon trạng thái nghiêm trọng có thể dùng màu theo severity.
- Không dùng icon nhiều màu nếu không phải logo.
- Không dùng emoji thay icon trong UI chính.
- Không dùng nhiều style icon trong cùng một màn hình.

## Severity color

Màu icon chỉ nên đổi theo trạng thái hệ thống.

| Severity | Màu gợi ý |
|---|---|
| Normal | `text-zinc-400` |
| Info | `text-sky-400` |
| Warning | `text-amber-400` |
| Critical | `text-red-400` |
| Security | `text-violet-400` hoặc `text-red-400` |
| Success | `text-emerald-400` |

## Quy tắc import

Nên import trực tiếp icon cần dùng:

```tsx
import { Activity, Bell, Cpu, HardDrive, Server } from "lucide-react";
```

Không tạo file import toàn bộ icon nếu chưa cần.

Nếu nhiều component dùng chung icon mapping, có thể tạo file:

```text
src/ui/icon-map.ts
```

Ví dụ:

```tsx
import {
  Activity,
  Bell,
  Cpu,
  DatabaseBackup,
  FileText,
  HardDrive,
  MemoryStick,
  Network,
  Server,
  Shield,
  TriangleAlert,
  Users
} from "lucide-react";

export const dashboardIcons = {
  server: Server,
  cpu: Cpu,
  ram: MemoryStick,
  disk: HardDrive,
  alert: TriangleAlert,
  security: Shield,
  network: Network,
  logs: FileText,
  users: Users,
  backup: DatabaseBackup,
  monitoring: Activity,
  notification: Bell
};
```

## Khi nào dùng SVG custom

Chỉ dùng SVG custom khi:

- Cần Windows Server logo.
- Cần IIS logo.
- Cần SQL Server logo.
- Icon đó không có trong Lucide/Tabler/React Icons.
- Logo phục vụ nhận diện công nghệ trong trang service detail hoặc report.

Không dùng SVG custom cho icon phổ biến như server, alert, user, settings, disk, cpu.

