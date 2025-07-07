
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Mic, MicOff, Play, Stop } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FeatureCard } from "@/components/FeatureCard";
import { ProcessStep } from "@/components/ProcessStep";
import { TechBadge } from "@/components/TechBadge";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Camera,
      title: "Real-time Camera + AI",
      description: "Advanced object detection using computer vision and AI to identify surroundings in real-time."
    },
    {
      icon: Mic,
      title: "Audio Instructions",
      description: "Clear, natural voice guidance delivered through Bluetooth-enabled audio devices."
    },
    {
      icon: Play,
      title: "Obstacle Detection",
      description: "Ultrasonic sensors provide instant alerts about nearby obstacles and hazards."
    }
  ];

  const processSteps = [
    { step: 1, title: "Connect Device", description: "Pair your Vision Assistant device via Bluetooth" },
    { step: 2, title: "Start Camera", description: "Activate live video feed with AI processing" },
    { step: 3, title: "Receive Guidance", description: "Listen to real-time audio descriptions" },
    { step: 4, title: "Navigate Safely", description: "Move confidently with AI-powered assistance" }
  ];

  const techStack = [
    "Raspberry Pi", "FastAPI", "OpenAI", "Gemini AI", "WebSocket", "Computer Vision", "Bluetooth Audio"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Camera className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl text-foreground">Vision Assistant</span>
            </div>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="gradient-bg text-white hover:opacity-90 transition-opacity"
            >
              Try Demo
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-gradient py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center fade-in">
          <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Vision Assistant
          </h1>
          <p className="text-2xl lg:text-3xl text-muted-foreground mb-4 font-light">
            See the world through sound
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            AI-powered guidance for the visually impaired. Experience real-time object detection, 
            audio navigation, and obstacle alerts in one seamless assistive technology solution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/dashboard')}
              className="gradient-bg text-white text-lg px-8 py-4 hover:opacity-90 transition-opacity"
            >
              Try Demo
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-4 border-2 hover:bg-primary/5"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 slide-up">
            <h2 className="text-4xl font-bold text-foreground mb-4">Key Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Cutting-edge technology designed to enhance independence and mobility
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple steps to start your AI-powered navigation experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, index) => (
              <ProcessStep key={index} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">Built With Modern Tech</h2>
          <p className="text-xl text-muted-foreground mb-12">
            Powered by cutting-edge technologies for reliable, real-time assistance
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            {techStack.map((tech, index) => (
              <TechBadge key={index} name={tech} />
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 hero-gradient">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-foreground mb-8">Get Started Today</h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Ready to experience AI-powered navigation? Connect with us to learn more about 
            Vision Assistant and how it can enhance your independence.
          </p>
          
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold mb-6">Contact Us</h3>
              <div className="space-y-4 text-left">
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-muted-foreground">support@visionassistant.ai</p>
                </div>
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-muted-foreground">+1 (555) 123-4567</p>
                </div>
                <div>
                  <p className="font-medium">Support Hours</p>
                  <p className="text-muted-foreground">24/7 Accessibility Support</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Camera className="h-8 w-8" />
            <span className="font-bold text-xl">Vision Assistant</span>
          </div>
          <p className="text-background/80 mb-4">
            Making the world more accessible through AI-powered assistance
          </p>
          <p className="text-background/60 text-sm">
            © 2024 Vision Assistant. Empowering independence through technology.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
