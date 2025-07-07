
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Mic, MicOff } from "lucide-react";

interface AudioControlsProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  isRecording: boolean;
  onToggleRecording: () => void;
}

export const AudioControls = ({ 
  volume, 
  onVolumeChange, 
  isRecording, 
  onToggleRecording 
}: AudioControlsProps) => {
  return (
    <Card className="bg-white/70 backdrop-blur-sm border-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mic className="h-5 w-5" />
          <span>🔊 Audio Controls</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Audio Status:</span>
            <span className="text-sm text-primary font-semibold">Ready</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Volume</span>
            <span className="text-sm text-muted-foreground">{volume}%</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-lg">🔇</span>
            <Slider
              value={[volume]}
              onValueChange={([value]) => onVolumeChange(value)}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-lg">🔊</span>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button
            onClick={onToggleRecording}
            variant={isRecording ? "destructive" : "default"}
            className="w-full"
            size="lg"
          >
            {isRecording ? (
              <>
                <MicOff className="h-4 w-4 mr-2" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
