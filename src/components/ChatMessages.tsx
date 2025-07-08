import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";

interface Message {
  id: string;
  sender: "user" | "ai" | "system";
  content: string;
  timestamp: Date;
}

interface ChatMessagesProps {
  messages: Message[];
}

export const ChatMessages = ({ messages }: ChatMessagesProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const getSenderIcon = (sender: string) => {
    switch (sender) {
      case "ai":
        return "🤖";
      case "user":
        return "👤";
      case "system":
        return "⚙️";
      default:
        return "💬";
    }
  };

  const getSenderName = (sender: string) => {
    switch (sender) {
      case "ai":
        return "AI Assistant";
      case "user":
        return "User";
      case "system":
        return "System";
      default:
        return "Unknown";
    }
  };

  const getMessageStyle = (sender: string) => {
    switch (sender) {
      case "ai":
        return "bg-blue-50 border-l-4 border-blue-400";
      case "user":
        return "bg-green-50 border-l-4 border-green-400";
      case "system":
        return "bg-gray-50 border-l-4 border-gray-400";
      default:
        return "bg-gray-50 border-l-4 border-gray-300";
    }
  };

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-2 h-[35rem]">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>💬 AI Conversation</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80 pr-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground italic py-8">
              Waiting for conversation...
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${getMessageStyle(
                    message.sender
                  )} fade-in`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">
                      {getSenderIcon(message.sender)}
                    </span>
                    <span className="font-semibold text-sm">
                      {getSenderName(message.sender)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
