import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Camera, Mic, MicOff, ArrowDown, ArrowUp, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { VideoFeed } from "@/components/VideoFeed";
import { ChatMessages } from "@/components/ChatMessages";
import { AudioControls } from "@/components/AudioControls";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender: "user" | "ai" | "system";
  content: string;
  timestamp: Date;
}

interface ConnectionInfo {
  status: "disconnected" | "connecting" | "connected";
  clientId: string;
  role: string;
  broadcaster: string;
  totalClients: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  // Hardcoded variable to control audio playback
  const ENABLE_AUDIO_PLAYBACK = true; // Set to true to enable audio playback
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    status: "disconnected",
    clientId: "Unknown",
    role: "None",
    broadcaster: "None",
    totalClients: 0
  });
  const [videoFrame, setVideoFrame] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [volume, setVolume] = useState(50);
  const [isRecording, setIsRecording] = useState(false);
  const [audioStatus, setAudioStatus] = useState<string>("Ready");
  const [isAudioEnabled, setIsAudioEnabled] = useState(ENABLE_AUDIO_PLAYBACK);

  const fpsCounterRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  // Initialize audio context
  const initAudio = async () => {
    if (!ENABLE_AUDIO_PLAYBACK) {
      setAudioStatus("Disabled");
      return false;
    }

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);

      // Set initial volume
      gainNodeRef.current.gain.value = volume / 100;

      setAudioStatus("Ready");
      return true;
    } catch (error) {
      console.error("Failed to initialize audio:", error);
      setAudioStatus("Error");
      return false;
    }
  };

  // Play raw PCM audio data
  const playAudio = async (audioData: string, sampleRate: number = 24000) => {
    if (!ENABLE_AUDIO_PLAYBACK || !audioContextRef.current || !gainNodeRef.current) {
      return;
    }

    try {
      // Resume audio context if suspended
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // Decode base64 audio data
      const binaryString = atob(audioData);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }

      // Convert bytes to 16-bit PCM samples
      const samples = new Int16Array(arrayBuffer);
      const floatSamples = new Float32Array(samples.length);
      
      // Convert from Int16 to Float32 (normalize to -1.0 to 1.0)
      for (let i = 0; i < samples.length; i++) {
        floatSamples[i] = samples[i] / 32768.0;
      }

      // Create audio buffer
      const audioBuffer = audioContextRef.current.createBuffer(
        1, // mono
        floatSamples.length,
        sampleRate
      );

      // Copy the PCM data to the audio buffer
      audioBuffer.copyToChannel(floatSamples, 0);

      // Create and play audio source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNodeRef.current);
      source.start();

      setAudioStatus("Playing");

      // Reset status after estimated playback duration
      const duration = audioBuffer.duration * 1000; // Convert to milliseconds
      setTimeout(() => {
        setAudioStatus("Ready");
      }, Math.max(duration, 500)); // At least 500ms
      
    } catch (error) {
      console.error("Audio playback error:", error);
      setAudioStatus("Error");
      
      // Reset status after error
      setTimeout(() => {
        setAudioStatus("Ready");
      }, 2000);
    }
  };

  // Update volume
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume / 100;
    }
  };

  // WebSocket connection
  const connect = async () => {
    if (connectionInfo.status === "connected") return;

    try {
      setConnectionInfo(prev => ({ ...prev, status: "connecting" }));
      
      // Initialize audio
      await initAudio();
      
      const wsUri = import.meta.env.VITE_WS_URI || "ws://localhost:8000/ws";
      const websocket = new WebSocket(wsUri);
      websocketRef.current = websocket;

      websocket.onopen = () => {
        setConnectionInfo(prev => ({ ...prev, status: "connected" }));
        
        // Set role as receiver
        websocket.send(JSON.stringify({
          type: "set_role",
          role: "receiver"
        }));

        // Get initial status
        getStatus();
        
        toast({
          title: "Connected",
          description: "Successfully connected to Vision Assistant",
        });
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
      };

      websocket.onclose = () => {
        setConnectionInfo(prev => ({ ...prev, status: "disconnected" }));
        websocketRef.current = null;
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionInfo(prev => ({ ...prev, status: "disconnected" }));
        toast({
          title: "Connection Error",
          description: "Failed to connect to Vision Assistant",
          variant: "destructive"
        });
      };

    } catch (error) {
      console.error("Connection failed:", error);
      setConnectionInfo(prev => ({ ...prev, status: "disconnected" }));
      toast({
        title: "Connection Failed",
        description: "Unable to establish connection",
        variant: "destructive"
      });
    }
  };

  const disconnect = () => {
    if (websocketRef.current) {
      websocketRef.current.send(JSON.stringify({ type: "disconnect" }));
      websocketRef.current.close();
    }
    setConnectionInfo(prev => ({ ...prev, status: "disconnected" }));
  };

  const handleMessage = (data: any) => {
    const msgType = data.type;

    switch (msgType) {
      case "role_confirmed":
        setConnectionInfo(prev => ({ ...prev, role: data.role }));
        break;

      case "frame-to-show-frontend":
        displayFrame(data.data);
        break;

      case "ai":
        addMessage("ai", data.data);
        break;

      case "user":
        addMessage("user", data.data);
        break;

      case "audio_from_gemini":
        // Play audio automatically if enabled
        if (ENABLE_AUDIO_PLAYBACK && data.data) {
          const sampleRate = data.sample_rate || 24000;
          playAudio(data.data, sampleRate);
        }
        break;

      case "broadcaster_changed":
        setConnectionInfo(prev => ({ ...prev, broadcaster: data.broadcaster_id }));
        addMessage("system", `New broadcaster: ${data.broadcaster_id}`);
        break;

      case "status":
        updateStatus(data);
        break;

      case "error":
        console.error("Server error:", data.data);
        addMessage("system", `Server error: ${data.data}`);
        break;

      default:
        console.log("Unknown message type:", msgType, data);
    }
  };

  const displayFrame = (frameData: string) => {
    setFrameCount(prev => prev + 1);
    
    // Update FPS
    const now = Date.now();
    if (now - lastFrameTimeRef.current >= 1000) {
      setFps(fpsCounterRef.current);
      fpsCounterRef.current = 0;
      lastFrameTimeRef.current = now;
    }
    fpsCounterRef.current++;

    setLastUpdate(new Date());
    setVideoFrame(`data:image/jpeg;base64,${frameData}`);
  };

  const addMessage = (sender: "user" | "ai" | "system", content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const updateStatus = (status: any) => {
    setConnectionInfo(prev => ({
      ...prev,
      clientId: status.client_id || "Unknown",
      role: status.is_receiver ? "Receiver" : "Unknown",
      broadcaster: status.broadcaster_id || "None",
      totalClients: status.total_clients || 0
    }));
  };

  const getStatus = () => {
    if (websocketRef.current && connectionInfo.status === "connected") {
      websocketRef.current.send(JSON.stringify({ type: "get_status" }));
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast({
      title: "Chat Cleared",
      description: "All messages have been cleared",
    });
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    if (!isAudioEnabled) {
      initAudio();
    }
  };

  // Auto-connect on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      connect();
    }, 500);

    return () => {
      clearTimeout(timer);
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="text-primary hover:text-primary/80"
              >
                <ArrowDown className="h-4 w-4 mr-2 rotate-90" />
                Back to Home
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-2">
                <Camera className="h-6 w-6 text-primary" />
                <span className="font-semibold text-lg">Vision Assistant Dashboard</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Audio Status Indicator */}
              <div className="flex items-center space-x-2 text-sm">
                {isAudioEnabled ? (
                  <Volume2 className="h-4 w-4 text-green-600" />
                ) : (
                  <VolumeX className="h-4 w-4 text-red-600" />
                )}
                <span className="text-muted-foreground">Audio: {audioStatus}</span>
              </div>
              <ConnectionStatus connectionInfo={connectionInfo} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Status Bar */}
        <Card className="mb-6 bg-white/70 backdrop-blur-sm border-2">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{connectionInfo.clientId}</p>
                <p className="text-sm text-muted-foreground">Client ID</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{connectionInfo.role}</p>
                <p className="text-sm text-muted-foreground">Role</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{connectionInfo.broadcaster}</p>
                <p className="text-sm text-muted-foreground">Broadcaster</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{connectionInfo.totalClients}</p>
                <p className="text-sm text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2">
            <VideoFeed 
              videoFrame={videoFrame}
              frameCount={frameCount}
              fps={fps}
              lastUpdate={lastUpdate}
            />
          </div>

          {/* Chat & Audio Controls */}
          <div className="space-y-6">
            <ChatMessages messages={messages} />
            
            {/* Enhanced Audio Controls */}
            <Card className="bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Volume2 className="h-5 w-5" />
                  <span>Audio Controls</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Audio Status:</span>
                  <span className="text-sm font-medium">{audioStatus}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Audio Enabled:</span>
                  <span className="text-sm font-medium">
                    {ENABLE_AUDIO_PLAYBACK ? "Yes" : "No (Hardcoded)"}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Volume:</span>
                    <span className="text-sm font-medium">{volume}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <AudioControls 
              volume={volume}
              onVolumeChange={handleVolumeChange}
              isRecording={isRecording}
              onToggleRecording={() => setIsRecording(!isRecording)}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <Card className="mt-6 bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                onClick={connect} 
                disabled={connectionInfo.status === "connected"}
                className="gradient-bg text-white hover:opacity-90"
              >
                🔗 Connect
              </Button>
              <Button 
                onClick={disconnect} 
                disabled={connectionInfo.status === "disconnected"}
                variant="outline"
              >
                📴 Disconnect
              </Button>
              <Button onClick={getStatus} variant="outline">
                📊 Get Status
              </Button>
              <Button onClick={clearChat} variant="outline">
                🗑️ Clear Chat
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;