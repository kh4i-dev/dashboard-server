import { execFileSync } from "node:child_process";
import os from "node:os";

function firstIPv4() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }
  return "127.0.0.1";
}

function normalizeServiceStatus(status) {
  const value = String(status || "unknown").toLowerCase();
  if (value === "running") return "running";
  if (value === "stopped") return "stopped";
  if (value === "paused") return "paused";
  return "unknown";
}

function fallbackSnapshot() {
  const totalMb = Math.round(os.totalmem() / 1024 / 1024);
  const freeMb = Math.round(os.freemem() / 1024 / 1024);
  const usedMb = totalMb - freeMb;
  const ramPercent = totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0;

  return {
    server: {
      name: os.hostname(),
      hostname: os.hostname(),
      ipAddress: firstIPv4(),
      osVersion: `${os.type()} ${os.release()}`,
      environment: "local",
      status: "online"
    },
    metric: {
      cpuPercent: 0,
      ramPercent,
      ramUsedMb: usedMb,
      ramTotalMb: totalMb,
      diskPercent: 0,
      networkRxKbps: 0,
      networkTxKbps: 0,
      uptimeSeconds: Math.round(os.uptime())
    },
    services: []
  };
}

export function collectLocalSnapshot() {
  if (process.platform !== "win32") {
    return fallbackSnapshot();
  }

  const script = `
    $ErrorActionPreference = "SilentlyContinue"
    $os = Get-CimInstance Win32_OperatingSystem
    $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Sort-Object DeviceID | Select-Object -First 1
    $adapters = Get-NetAdapterStatistics | Measure-Object -Property ReceivedBytes, SentBytes -Sum
    $services = @("W3SVC","MSSQLSERVER","FTPSVC") | ForEach-Object {
      $svc = Get-Service -Name $_ -ErrorAction SilentlyContinue
      if ($svc) {
        $cim = Get-CimInstance Win32_Service -Filter "Name='$($svc.Name)'"
        [pscustomobject]@{
          serviceName = $svc.Name
          displayName = $svc.DisplayName
          status = $svc.Status.ToString().ToLower()
          startupType = if ($cim) { $cim.StartMode.ToString().ToLower() } else { "unknown" }
        }
      } else {
        [pscustomobject]@{
          serviceName = $_
          displayName = $_
          status = "unknown"
          startupType = "unknown"
        }
      }
    }
    [pscustomobject]@{
      server = [pscustomobject]@{
        name = $env:COMPUTERNAME
        hostname = $env:COMPUTERNAME
        ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } | Select-Object -First 1 -ExpandProperty IPAddress)
        osVersion = $os.Caption
        environment = "local"
        status = "online"
      }
      metric = [pscustomobject]@{
        cpuPercent = [math]::Round([double]$cpu, 2)
        ramPercent = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 2)
        ramUsedMb = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1024)
        ramTotalMb = [math]::Round($os.TotalVisibleMemorySize / 1024)
        diskPercent = if ($disk.Size -gt 0) { [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2) } else { 0 }
        networkRxKbps = 0
        networkTxKbps = 0
        uptimeSeconds = [math]::Round((New-TimeSpan -Start $os.LastBootUpTime -End (Get-Date)).TotalSeconds)
      }
      services = $services
    } | ConvertTo-Json -Depth 5 -Compress
  `;

  try {
    const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
      encoding: "utf8",
      timeout: 7000,
      windowsHide: true
    });
    const snapshot = JSON.parse(output);
    const rawServices = Array.isArray(snapshot.services) ? snapshot.services : [snapshot.services];
    const services = [];
    for (const service of rawServices) {
      if (!service) continue;
      services.push({
        serviceName: service.serviceName,
        displayName: service.displayName,
        status: normalizeServiceStatus(service.status),
        startupType: service.startupType || "unknown"
      });
    }

    return {
      ...snapshot,
      server: {
        ...snapshot.server,
        ipAddress: snapshot.server.ipAddress || firstIPv4()
      },
      services
    };
  } catch {
    return fallbackSnapshot();
  }
}
