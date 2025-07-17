import { useState, useEffect } from "react";
import { Send, Bot, User, Heart, AlertCircle, Camera, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import { GeminiService } from "@/services/gemini";
import { useAuth } from "@/hooks/useAuth";
import { getUserPets } from "@/services/firestore";
import { Pet } from "@/types";
import { useToast } from "@/hooks/use-toast";

const DrPurr = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('gemini_api_key') || "");
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "1",
      type: "ai",
      content: "Hello! I'm Dr. Purr, your AI veterinary assistant. I'm here to help with any questions about your pet's health and well-being. How can I assist you today?",
      timestamp: new Date(),
    },
    {
      id: "2",
      type: "user",
      content: "Hi! My cat Whiskers has been sleeping more than usual lately. Should I be concerned?",
      timestamp: new Date(),
    },
    {
      id: "3",
      type: "ai",
      content: "I understand your concern about Whiskers' increased sleeping. While cats do sleep 12-16 hours a day normally, a sudden change in sleep patterns can indicate various things. Here are some questions to help me better assess:\n\n• Has Whiskers' appetite changed?\n• Any changes in litter box habits?\n• Is she still playing or responding to you?\n• Any visible signs of discomfort?\n\nBased on her profile, she's a 2-year-old Persian. If this behavior continues for more than a few days, I'd recommend scheduling a check-up with your vet.",
      timestamp: new Date(),
    },
  ]);

  useEffect(() => {
    if (user) {
      loadUserPets();
    }
  }, [user]);

  const loadUserPets = async () => {
    try {
      const pets = await getUserPets(user!.uid);
      setUserPets(pets);
      if (pets.length > 0 && !selectedPet) {
        setSelectedPet(pets[0]);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    if (!geminiApiKey) {
      toast({
        title: "API Key Required",
        description: "Please add your Gemini API key in settings to chat with Dr. Purr.",
        variant: "destructive",
      });
      return;
    }

    const newMessage = {
      id: Date.now().toString(),
      type: "user" as const,
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    const currentMessage = message;
    setMessage("");
    setIsLoading(true);

    try {
      const geminiService = new GeminiService(geminiApiKey);
      const petContext = selectedPet ? {
        name: selectedPet.name,
        age: selectedPet.age,
        species: selectedPet.species,
        breed: selectedPet.breed
      } : undefined;

      const response = await geminiService.sendMessage(
        currentMessage,
        messages.filter(m => m.type === 'ai').map(m => ({
          role: 'model' as const,
          parts: [{ text: m.content }]
        })),
        petContext
      );

      const aiResponse = {
        id: (Date.now() + 1).toString(),
        type: "ai" as const,
        content: response,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', geminiApiKey);
    toast({
      title: "API Key Saved",
      description: "Your Gemini API key has been saved locally.",
    });
  };

  const quickQuestions = [
    "Is my pet's behavior normal?",
    "What should I feed my pet?",
    "How often should I exercise my pet?",
    "When should I visit the vet?",
    "Help with pet training tips",
    "Emergency symptoms to watch for",
  ];

  const handleQuickQuestion = (question: string) => {
    setMessage(question);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-accent p-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold">Dr. Purr</h1>
              <p className="text-white/90 text-sm">
                {selectedPet ? `Chatting about ${selectedPet.name}` : 'Your AI Veterinary Assistant'}
              </p>
            </div>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Settings className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dr. Purr Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">Gemini API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your free API key from Google AI Studio
                  </p>
                </div>
                
                {userPets.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Pet for Context</Label>
                    <div className="space-y-2">
                      {userPets.map((pet) => (
                        <div key={pet.id} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={pet.id}
                            name="selectedPet"
                            checked={selectedPet?.id === pet.id}
                            onChange={() => setSelectedPet(pet)}
                          />
                          <label htmlFor={pet.id} className="text-sm">
                            {pet.name} ({pet.age}y {pet.species})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button onClick={saveApiKey} className="w-full">
                  Save Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Questions */}
      <div className="p-6 pb-0">
        <h2 className="font-semibold mb-3">Quick Questions</h2>
        <div className="grid grid-cols-2 gap-2">
          {quickQuestions.map((question, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-left h-auto p-3 text-xs"
              onClick={() => handleQuickQuestion(question)}
            >
              {question}
            </Button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-6 pb-0">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex items-start gap-3 max-w-[80%] ${msg.type === "user" ? "flex-row-reverse" : ""}`}>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={msg.type === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}>
                    {msg.type === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className={`rounded-2xl p-3 ${msg.type === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Health Tips Card */}
      <div className="p-6 pt-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Daily Health Tip</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Regular dental care is crucial for pets. Brush your dog's teeth 2-3 times a week and your cat's teeth weekly to prevent dental disease.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Notice */}
      <div className="px-6 pb-4">
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-destructive">Emergency Notice</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Dr. Purr is not a replacement for professional veterinary care. In case of emergency, contact your vet immediately.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Input */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t">
        <div className="flex items-center gap-2 max-w-md mx-auto">
          <Button variant="outline" size="icon" className="shrink-0">
            <Camera className="w-4 h-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask Dr. Purr anything..."
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="pr-12"
            />
            <Button
              size="icon"
              className="absolute right-1 top-1 h-8 w-8"
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default DrPurr;