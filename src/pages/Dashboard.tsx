import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Camera,
  Mic,
  MicOff,
  ArrowDown,
  ArrowUp,
  Volume2,
  VolumeX,
} from "lucide-react";
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

interface AudioItem {
  audioData: string;
  format: string;
  sampleRate: number;
  timestamp: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);

  // Audio processing state
  const audioQueueRef = useRef<AudioItem[]>([]);
  const isPlayingAudioRef = useRef(false);
  const lastAudioEndTimeRef = useRef(0);
  const audioStatsRef = useRef({ played: 0, errors: 0 });

  // Hardcoded variable to control audio playback
  const ENABLE_AUDIO_PLAYBACK = true;
  const AUDIO_SAMPLE_RATE = 16000;
  const VISUALIZER_BARS = 20;

  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    status: "disconnected",
    clientId: "Unknown",
    role: "None",
    broadcaster: "None",
    totalClients: 0,
  });
  const [videoFrame, setVideoFrame] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [volume, setVolume] = useState(50);
  const [isRecording, setIsRecording] = useState(false);
  const [audioStatus, setAudioStatus] = useState<string>("Initializing");
  const [isAudioEnabled, setIsAudioEnabled] = useState(ENABLE_AUDIO_PLAYBACK);
  const [audioStats, setAudioStats] = useState({
    played: 0,
    errors: 0,
    queue: 0,
  });
  const [audioBars, setAudioBars] = useState<number[]>(
    new Array(VISUALIZER_BARS).fill(2)
  );

  const fpsCounterRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const animationFrameRef = useRef<number>();

  // Initialize audio context with advanced settings
  const initAudio = async () => {
    if (!ENABLE_AUDIO_PLAYBACK) {
      setAudioStatus("Disabled");
      return false;
    }

    try {
      // Create audio context with optimal settings
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext({
        sampleRate: AUDIO_SAMPLE_RATE,
        latencyHint: "interactive",
      });

      // Create gain node for volume control
      gainNodeRef.current = audioContextRef.current.createGain();

      // Create analyser for visualization
      analyserNodeRef.current = audioContextRef.current.createAnalyser();
      analyserNodeRef.current.fftSize = 256;
      analyserNodeRef.current.smoothingTimeConstant = 0.8;

      // Connect nodes
      gainNodeRef.current.connect(analyserNodeRef.current);
      analyserNodeRef.current.connect(audioContextRef.current.destination);

      // Set initial volume
      gainNodeRef.current.gain.value = volume / 100;

      // Start visualizer animation
      startAudioVisualization();

      // Initialize audio scheduler
      lastAudioEndTimeRef.current = audioContextRef.current.currentTime;

      setAudioStatus("Ready");
      return true;
    } catch (error) {
      console.error("Failed to initialize audio:", error);
      setAudioStatus("Error: " + (error as Error).message);
      return false;
    }
  };

  // Start audio visualization
  const startAudioVisualization = () => {
    if (!analyserNodeRef.current) return;

    const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);

    const animate = () => {
      if (!analyserNodeRef.current) return;

      analyserNodeRef.current.getByteFrequencyData(dataArray);

      // Update bars based on frequency data
      const step = Math.floor(dataArray.length / VISUALIZER_BARS);
      const newBars = [];
      for (let i = 0; i < VISUALIZER_BARS; i++) {
        const index = i * step;
        const height = Math.max(2, (dataArray[index] / 255) * 35);
        newBars.push(height);
      }
      setAudioBars(newBars);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  // Convert PCM int16 data to AudioBuffer with anti-glitch processing
  const convertPCMToAudioBuffer = async (
    arrayBuffer: ArrayBuffer,
    sampleRate: number
  ) => {
    const dataView = new DataView(arrayBuffer);
    const numSamples = arrayBuffer.byteLength / 2; // 16-bit = 2 bytes per sample

    // Create AudioBuffer
    const audioBuffer = audioContextRef.current!.createBuffer(
      1,
      numSamples,
      sampleRate
    );
    const channelData = audioBuffer.getChannelData(0);

    // Convert int16 to float32 with smoothing
    for (let i = 0; i < numSamples; i++) {
      const sample = dataView.getInt16(i * 2, true); // little endian
      let floatSample = sample / 32768.0; // Convert to float32 range [-1, 1]

      // Apply smoothing filter to reduce glitches
      if (i > 0) {
        const prevSample = channelData[i - 1];
        const diff = Math.abs(floatSample - prevSample);

        // If there's a large jump, apply smoothing
        if (diff > 0.5) {
          floatSample = prevSample + (floatSample - prevSample) * 0.3;
        }
      }

      // Clamp values to prevent overflow
      channelData[i] = Math.max(-1.0, Math.min(1.0, floatSample));
    }

    // Apply fade-in/fade-out to chunk boundaries
    const fadeLength = Math.min(64, numSamples / 4); // Fade length in samples

    // Fade in at the beginning
    for (let i = 0; i < fadeLength; i++) {
      const fadeFactor = i / fadeLength;
      channelData[i] *= fadeFactor;
    }

    // Fade out at the end
    for (let i = numSamples - fadeLength; i < numSamples; i++) {
      const fadeFactor = (numSamples - i) / fadeLength;
      channelData[i] *= fadeFactor;
    }

    return audioBuffer;
  };

  // Enhanced audio processing with glitch reduction
  const processAudioData = async (
    audioData: string,
    format: string = "int16",
    sampleRate: number = AUDIO_SAMPLE_RATE
  ) => {
    try {
      // Decode base64 audio data
      const binaryString = atob(audioData);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const dataView = new DataView(arrayBuffer);

      // Convert binary string to ArrayBuffer
      for (let i = 0; i < binaryString.length; i++) {
        dataView.setUint8(i, binaryString.charCodeAt(i));
      }

      let audioBuffer;

      if (format === "int16") {
        // Handle raw PCM int16 data with smoothing
        audioBuffer = await convertPCMToAudioBuffer(arrayBuffer, sampleRate);
      } else {
        // Handle encoded audio (MP3, WAV, etc.)
        audioBuffer = await audioContextRef.current!.decodeAudioData(
          arrayBuffer
        );
      }

      return audioBuffer;
    } catch (error) {
      console.error("Audio processing error:", error);
      throw error;
    }
  };

  // Schedule audio playback with precise timing
  const scheduleAudioPlayback = async (
    audioBuffer: AudioBuffer
  ): Promise<void> => {
    return new Promise((resolve) => {
      const source = audioContextRef.current!.createBufferSource();
      source.buffer = audioBuffer;

      // Apply low-pass filter to reduce high-frequency noise
      const filter = audioContextRef.current!.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 8000; // Cut off frequencies above 8kHz
      filter.Q.value = 0.5;

      // Connect: source -> filter -> gain -> analyser -> destination
      source.connect(filter);
      filter.connect(gainNodeRef.current!);

      // Calculate precise start time for seamless playback
      const currentTime = audioContextRef.current!.currentTime;
      const startTime = Math.max(currentTime, lastAudioEndTimeRef.current);

      // Small overlap to prevent gaps
      const overlapTime = 0.01; // 10ms overlap
      const actualStartTime = Math.max(startTime - overlapTime, currentTime);

      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        resolve();
      };

      source.start(actualStartTime);
      lastAudioEndTimeRef.current = actualStartTime + audioBuffer.duration;
    });
  };

  // Process audio queue with seamless playback
  const processAudioQueue = async () => {
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) return;

    isPlayingAudioRef.current = true;
    setAudioStatus("Processing");

    while (audioQueueRef.current.length > 0) {
      const audioItem = audioQueueRef.current.shift()!;
      updateAudioStats();

      try {
        // Resume audio context if suspended
        if (audioContextRef.current!.state === "suspended") {
          await audioContextRef.current!.resume();
        }

        setAudioStatus("Playing");

        // Process audio data
        const audioBuffer = await processAudioData(
          audioItem.audioData,
          audioItem.format,
          audioItem.sampleRate
        );

        // Schedule audio for seamless playback
        await scheduleAudioPlayback(audioBuffer);

        audioStatsRef.current.played++;
        updateAudioStats();
      } catch (error) {
        console.error("Audio playback error:", error);
        audioStatsRef.current.errors++;
        updateAudioStats();
        setAudioStatus("Error: " + (error as Error).message);
      }
    }

    isPlayingAudioRef.current = false;
    setAudioStatus("Ready");
  };

  // Enhanced audio playback with seamless transitions
  const playAudio = async (
    audioData: string,
    format: string = "int16",
    sampleRate: number = AUDIO_SAMPLE_RATE
  ) => {
    if (
      !ENABLE_AUDIO_PLAYBACK ||
      !audioContextRef.current ||
      !gainNodeRef.current
    ) {
      return;
    }

    // Add to queue with timestamp
    audioQueueRef.current.push({
      audioData,
      format,
      sampleRate,
      timestamp: Date.now(),
    });
    updateAudioStats();

    // Process queue if not already playing
    if (!isPlayingAudioRef.current) {
      await processAudioQueue();
    }
  };

  // Update audio stats display
  const updateAudioStats = () => {
    setAudioStats({
      played: audioStatsRef.current.played,
      errors: audioStatsRef.current.errors,
      queue: audioQueueRef.current.length,
    });
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
      setConnectionInfo((prev) => ({ ...prev, status: "connecting" }));

      // Initialize audio
      const audioInitialized = await initAudio();
      if (!audioInitialized) {
        throw new Error("Failed to initialize audio");
      }

      const wsUri =
        import.meta.env.VITE_WS_URI || "wss://vision-v2.onrender.com/ws";
      const websocket = new WebSocket(wsUri);
      websocketRef.current = websocket;

      websocket.onopen = () => {
        setConnectionInfo((prev) => ({ ...prev, status: "connected" }));

        // Set role as receiver
        websocket.send(
          JSON.stringify({
            type: "set_role",
            role: "receiver",
          })
        );

        // Get initial status
        getStatus();

        toast({
          title: "Connected",
          description: "Successfully connected to Vision Assistant",
        });
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error("Message parsing error:", error);
          addMessage("system", "Error parsing message from server");
        }
      };

      websocket.onclose = (event) => {
        setConnectionInfo((prev) => ({ ...prev, status: "disconnected" }));
        websocketRef.current = null;

        // Clear audio queue
        audioQueueRef.current = [];
        updateAudioStats();

        if (event.code !== 1000) {
          addMessage(
            "system",
            `Connection closed unexpectedly: ${event.reason}`
          );
        }
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionInfo((prev) => ({ ...prev, status: "disconnected" }));
        addMessage("system", "WebSocket connection error");
        toast({
          title: "Connection Error",
          description: "Failed to connect to Vision Assistant",
          variant: "destructive",
        });
      };
    } catch (error) {
      console.error("Connection failed:", error);
      setConnectionInfo((prev) => ({ ...prev, status: "disconnected" }));
      addMessage("system", `Connection failed: ${(error as Error).message}`);
      toast({
        title: "Connection Failed",
        description: "Unable to establish connection",
        variant: "destructive",
      });
    }
  };

  const disconnect = () => {
    if (websocketRef.current) {
      websocketRef.current.send(JSON.stringify({ type: "disconnect" }));
      websocketRef.current.close();
    }

    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
    updateAudioStats();

    setConnectionInfo((prev) => ({ ...prev, status: "disconnected" }));
  };

  const handleMessage = (data: any) => {
    const msgType = data.type;

    try {
      switch (msgType) {
        case "role_confirmed":
          console.log("Role confirmed:", data.role);
          setConnectionInfo((prev) => ({ ...prev, role: data.role }));
          addMessage("system", `Role confirmed: ${data.role}`);
          break;

        case "role_error":
          console.error("Role error:", data.message);
          addMessage("system", `Role error: ${data.message}`);
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
          const format = data.format || "int16";
          const sampleRate = data.sample_rate || AUDIO_SAMPLE_RATE;
          playAudio(data.data, format, sampleRate);
          break;

        case "broadcaster_changed":
          setConnectionInfo((prev) => ({
            ...prev,
            broadcaster: data.broadcaster_id,
          }));
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
          addMessage("system", `Unknown message type: ${msgType}`);
      }
    } catch (error) {
      console.error("Message handling error:", error);
      addMessage(
        "system",
        `Error handling message: ${(error as Error).message}`
      );
    }
  };

  const displayFrame = (frameData: string) => {
    try {
      // Update frame counter
      setFrameCount((prev) => prev + 1);

      // Update FPS
      const now = Date.now();
      if (now - lastFrameTimeRef.current >= 1000) {
        setFps(fpsCounterRef.current);
        fpsCounterRef.current = 0;
        lastFrameTimeRef.current = now;
      }
      fpsCounterRef.current++;

      // Update last update time
      setLastUpdate(new Date());

      // Display frame
      setVideoFrame(`data:image/jpeg;base64,${frameData}`);
    } catch (error) {
      console.error("Frame display error:", error);
      addMessage("system", "Error displaying video frame");
    }
  };

  const addMessage = (sender: "user" | "ai" | "system", content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const updateStatus = (status: any) => {
    setConnectionInfo((prev) => ({
      ...prev,
      clientId: status.client_id || "Unknown",
      role: status.is_receiver ? "Receiver" : "Unknown",
      broadcaster: status.broadcaster_id || "None",
      totalClients: status.total_clients || 0,
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

  // Auto-connect on component mount
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     connect();
  //   }, 500);

  //   return () => {
  //     clearTimeout(timer);
  //     if (websocketRef.current) {
  //       websocketRef.current.close();
  //     }
  //     // Clean up audio context
  //     if (audioContextRef.current) {
  //       audioContextRef.current.close();
  //     }
  //     // Clean up animation frame
  //     if (animationFrameRef.current) {
  //       cancelAnimationFrame(animationFrameRef.current);
  //     }
  //   };
  // }, []);

  // Handle visibility change to pause/resume audio
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && audioContextRef.current) {
        audioContextRef.current.suspend();
      } else if (
        !document.hidden &&
        audioContextRef.current &&
        connectionInfo.status === "connected"
      ) {
        audioContextRef.current.resume();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [connectionInfo.status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="text-primary hover:text-primary/80"
              >
                <ArrowDown className="h-4 w-4 mr-2 rotate-90" />
                Back to Home
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-2">
                <Camera className="h-6 w-6 text-primary" />
                <span className="font-semibold text-lg">
                  Vision Assistant Dashboard
                </span>
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
                <span className="text-muted-foreground">
                  Audio: {audioStatus}
                </span>
              </div>
              <ConnectionStatus connectionInfo={connectionInfo} />
            </div>
          </div>
        </div>
      </div>

      <div className=" mx-auto p-6">
        {/* Status Bar */}
        {/* <Card className="mb-6 bg-white/70 backdrop-blur-sm border-2">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {connectionInfo.clientId}
                </p>
                <p className="text-sm text-muted-foreground">Client ID</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {connectionInfo.role}
                </p>
                <p className="text-sm text-muted-foreground">Role</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {connectionInfo.broadcaster}
                </p>
                <p className="text-sm text-muted-foreground">Broadcaster</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {connectionInfo.totalClients}
                </p>
                <p className="text-sm text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* Main Content */}
        <div className="grid lg:grid-cols-4 gap-6">
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
          <div className=" flex  lg:col-span-2 ">
            <div className="w-[30rem]">
              <ChatMessages messages={messages} />
            </div>
            {/* Enhanced Audio Controls */}
            <Card className="bg-white/70 backdrop-blur-sm  ml-10 w-80 h-[35rem] ">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Volume2 className="h-5 w-5" />
                  <span>Audio Controls</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Audio Status:
                  </span>
                  <span className="text-sm font-medium">{audioStatus}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Audio Enabled:
                  </span>
                  <span className="text-sm font-medium">
                    {ENABLE_AUDIO_PLAYBACK ? "Yes" : "No (Hardcoded)"}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Volume:
                    </span>
                    <span className="text-sm font-medium">{volume}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) =>
                        handleVolumeChange(parseInt(e.target.value))
                      }
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Audio Visualizer */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">
                    Audio Visualizer:
                  </span>
                  <div className="w-full h-10 bg-gray-200 rounded-lg overflow-hidden flex items-end p-1 gap-1">
                    {audioBars.map((height, index) => (
                      <div
                        key={index}
                        className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-sm transition-all duration-100"
                        style={{ height: `${height}px`, minHeight: "2px" }}
                      />
                    ))}
                  </div>
                </div>

                {/* Audio Stats */}
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p className="font-semibold text-primary">
                      {audioStats.played}
                    </p>
                    <p className="text-muted-foreground">Played</p>
                  </div>
                  <div>
                    <p className="font-semibold text-primary">
                      {audioStats.errors}
                    </p>
                    <p className="text-muted-foreground">Errors</p>
                  </div>
                  <div>
                    <p className="font-semibold text-primary">
                      {audioStats.queue}
                    </p>
                    <p className="text-muted-foreground">Queue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
              {/* <Button onClick={getStatus} variant="outline">
                📊 Get Status
              </Button> */}
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
