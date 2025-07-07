
import { Badge } from "@/components/ui/badge";

interface ConnectionInfo {
  status: "disconnected" | "connecting" | "connected";
  clientId: string;
  role: string;
  broadcaster: string;
  totalClients: number;
}

interface ConnectionStatusProps {
  connectionInfo: ConnectionInfo;
}

export const ConnectionStatus = ({ connectionInfo }: ConnectionStatusProps) => {
  const getStatusColor = () => {
    switch (connectionInfo.status) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500 pulse-slow";
      case "disconnected":
      default:
        return "bg-red-500";
    }
  };

  const getStatusText = () => {
    switch (connectionInfo.status) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "disconnected":
      default:
        return "Disconnected";
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
      <Badge variant="outline" className="text-xs">
        {connectionInfo.totalClients} clients
      </Badge>
    </div>
  );
};
