
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "lucide-react";

interface VideoFeedProps {
  videoFrame: string | null;
  frameCount: number;
  fps: number;
  lastUpdate: Date | null;
}

export const VideoFeed = ({ videoFrame, frameCount, fps, lastUpdate }: VideoFeedProps) => {
  return (
    <Card className="bg-white/70 backdrop-blur-sm border-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Camera className="h-5 w-5" />
          <span>📹 Live Video Feed</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {videoFrame ? (
            <img 
              src={videoFrame} 
              alt="Live video feed" 
              className="w-full h-auto rounded-lg shadow-lg"
            />
          ) : (
            <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center text-gray-500">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-lg">📷 Waiting for video feed...</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
          <span>Frames: <strong className="text-primary">{frameCount}</strong></span>
          <span>FPS: <strong className="text-primary">{fps}</strong></span>
          <span>Last Update: <strong className="text-primary">
            {lastUpdate ? lastUpdate.toLocaleTimeString() : "Never"}
          </strong></span>
        </div>
      </CardContent>
    </Card>
  );
};
