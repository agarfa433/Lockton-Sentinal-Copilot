import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  AlertTriangle, 
  Navigation, 
  PhoneCall, 
  ChevronRight,
  Plane,
  Building,
  Users,
  Search,
  Settings,
  Bell,
  Home,
  Menu,
  X,
  ShieldAlert,
  LogOut,
  Cpu,
  Zap,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Trip, TripEvent, ChatMessage } from './types';
import { GoogleGenAI } from "@google/genai";

// Mock Data for "Kelli"
const INITIAL_TRIP: Trip = {
  id: 'trip-1',
  destination: 'Tokyo, Japan',
  startDate: 'Oct 15, 2024',
  endDate: 'Oct 20, 2024',
  riskLevel: 'Low',
  cityCenter: 'Tokyo Central',
  temperature: '72°F',
  sosProtocol: 'Emergency Protocol Locked: TOKYO / MINATO',
  insights: {
    cyberSafety: { value: 'Secure', desc: 'Encrypted VPN active for all Tokyo Roppongi networks.' },
    localEvents: { value: 'Notice', desc: 'Festival in Minato area tomorrow. Increased pedestrian traffic expected.' }
  },
  events: [
    {
      id: 'e1',
      time: '08:00 AM',
      title: 'Flight NH007 to Tokyo',
      description: 'Business Class, Seat 4A',
      type: 'flight',
      status: 'upcoming',
      safetyTip: 'Ensure you have your digital health credentials ready for quick entry.'
    },
    {
      id: 'e2',
      time: '04:00 PM',
      title: 'Check-in: Grand Hyatt Tokyo',
      description: 'Roppongi Hills, Minato City',
      type: 'hotel',
      status: 'upcoming',
      safetyTip: 'Registered as a Lockton Secure hotel. High-floor room requested for security.'
    },
    {
      id: 'e3',
      time: '10:00 AM (Day 2)',
      title: 'Client Meeting: SoftBank Corp',
      description: 'Tokyo Port City Takeshiba',
      type: 'meeting',
      status: 'upcoming',
      safetyTip: 'Standard business area. Use corporate-approved transport only.'
    }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'itinerary' | 'assistant' | 'safety'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sosState, setSosState] = useState<'idle' | 'countdown' | 'triggered'>('idle');
  const [sosTimer, setSosTimer] = useState(5);
  const [trip, setTrip] = useState<Trip>(INITIAL_TRIP);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [accentColor, setAccentColor] = useState('#3B82F6'); // Default Blue
  const [settings, setSettings] = useState({
    advancedDiagnostics: true,
    detailedIntelligence: false,
    syncFrequency: 'Real-time'
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello Kelli, I\'m your Sentinel Copilot. I see you have an upcoming trip to Tokyo. How can I help you prepare today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', accentColor);
    
    if (themeMode === 'light') {
      root.style.setProperty('--bg', '#F8FAFC');
      root.style.setProperty('--sidebar', '#FFFFFF');
      root.style.setProperty('--card', '#F1F5F9');
      root.style.setProperty('--border', '#E2E8F0');
      root.style.setProperty('--ink', '#0F172A');
      root.style.setProperty('--ink-dim', '#64748B');
    } else {
      root.style.setProperty('--bg', '#0A0B0D');
      root.style.setProperty('--sidebar', '#121417');
      root.style.setProperty('--card', '#1A1D23');
      root.style.setProperty('--border', '#2D3139');
      root.style.setProperty('--ink', '#FFFFFF');
      root.style.setProperty('--ink-dim', '#94A3B8');
    }
  }, [themeMode, accentColor]);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sosState === 'countdown' && sosTimer > 0) {
      interval = setInterval(() => {
        setSosTimer(prev => prev - 1);
      }, 1000);
    } else if (sosTimer === 0 && sosState === 'countdown') {
      setSosState('triggered');
    }
    return () => clearInterval(interval);
  }, [sosState, sosTimer]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: `Current Trip Context: ${JSON.stringify(trip)}. User request: ${currentInput}` }] }
        ],
        config: {
          systemInstruction: `You are Sentinel Copilot, an AI travel safety assistant for business travelers like Kelli. 
          Your goal is to provide concise, accurate, and actionable safety and risk information. 
          You are aware of the traveler's current trip: ${trip.destination}. 
          
          CAPABILITY: You can change the traveler's destination if requested (e.g., "Change my trip to Paris"). 
          When you change a destination, you MUST call the 'update_trip' function.
          You are responsible for generating "accurate" mock data for the new destination, including:
          1. A destination name and specific city center.
          2. Appropriate start and end dates (stating they are upcoming).
          3. A realistic risk level (Low, Medium, High).
          4. Current local temperature for that destination in FAHRENHEIT (e.g., "75°F").
          5. A location-specific SOS Protocol string (e.g., "Emergency Protocol Locked: [CITY] / [DISTRICT]").
          6. Specific security insights (Cyber Safety and Local Events).
          7. A list of 3-4 itinerary events (flights, hotels, meetings) with times, titles, descriptions, types, and SPECIFIC safety tips for that location.
          
          Always prioritize the traveler's wellbeing and corporate policy compliance.`,
          tools: [{
            functionDeclarations: [{
              name: "update_trip",
              description: "Updates the traveler's active trip data with a new destination, itinerary, and context.",
              parameters: {
                type: "object" as any,
                properties: {
                  newTrip: {
                    type: "object" as any,
                    description: "The complete new trip object to replace the current one.",
                    properties: {
                      id: { type: "string" as any },
                      destination: { type: "string" as any },
                      startDate: { type: "string" as any },
                      endDate: { type: "string" as any },
                      riskLevel: { type: "string" as any, enum: ["Low", "Moderate", "High"] },
                      cityCenter: { type: "string" as any },
                      temperature: { type: "string" as any },
                      sosProtocol: { type: "string" as any },
                      insights: {
                        type: "object" as any,
                        properties: {
                          cyberSafety: {
                            type: "object" as any,
                            properties: {
                              value: { type: "string" as any },
                              desc: { type: "string" as any }
                            }
                          },
                          localEvents: {
                            type: "object" as any,
                            properties: {
                              value: { type: "string" as any },
                              desc: { type: "string" as any }
                            }
                          }
                        }
                      },
                      events: {
                        type: "array" as any,
                        items: {
                          type: "object" as any,
                          properties: {
                            id: { type: "string" as any },
                            time: { type: "string" as any },
                            title: { type: "string" as any },
                            description: { type: "string" as any },
                            type: { type: "string" as any, enum: ["flight", "hotel", "meeting", "transport"] },
                            status: { type: "string" as any, enum: ["upcoming", "completed", "cancelled"] },
                            safetyTip: { type: "string" as any }
                          }
                        }
                      }
                    },
                    required: ["id", "destination", "startDate", "endDate", "riskLevel", "events", "cityCenter", "temperature", "sosProtocol", "insights"]
                  }
                },
                required: ["newTrip"]
              }
            }]
          }]
        }
      });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === 'update_trip') {
            const newTrip = (call.args as any).newTrip;
            setTrip(newTrip);
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: `Understood. I have updated your itinerary for ${newTrip.destination}. Your risk level is currently assessed as ${newTrip.riskLevel}. How else can I assist with your preparations?` 
            }]);
          }
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: response.text || "I'm sorry, I couldn't process that request." }]);
      }
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "There was an error connecting to the safety intelligence server." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (isLoggingOut) {
    return (
      <div className="h-screen w-full bg-[#0A0B0D] flex flex-col items-center justify-center space-y-6 text-center">
        <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-widest text-accent">Signing Out</h2>
          <p className="text-[#94A3B8] font-mono text-xs uppercase tracking-tighter">Securely ending your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-bg overflow-hidden text-ink">
      {/* Sidebar - Desktop Only */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden md:flex bg-sidebar text-ink flex-col items-stretch border-r border-border relative z-50 rounded-r-xl my-2 ml-2 shadow-2xl overflow-hidden"
      >
        <div className="p-6 flex items-center gap-3 overflow-hidden">
          <div className="bg-accent p-2 rounded-lg shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-xl tracking-tight text-accent whitespace-nowrap"
              >
                Sentinel <span className="text-ink">Copilot</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-x-hidden">
          <NavItem 
            icon={<Home />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            icon={<Calendar />} 
            label="Itinerary" 
            active={activeTab === 'itinerary'} 
            onClick={() => setActiveTab('itinerary')} 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            icon={<MessageSquare />} 
            label="AI Assistant" 
            active={activeTab === 'assistant'} 
            onClick={() => setActiveTab('assistant')} 
            collapsed={!isSidebarOpen} 
          />
          <NavItem 
            icon={<AlertTriangle />} 
            label="Safety Hub" 
            active={activeTab === 'safety'} 
            onClick={() => setActiveTab('safety')} 
            collapsed={!isSidebarOpen} 
          />
        </nav>

        <div className="p-4 border-t border-border">
           <div className={cn("flex items-center gap-3 mb-4", !isSidebarOpen && "justify-center")}>
              <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border-2 border-accent shrink-0">
                 <img src="https://picsum.photos/seed/kelli/100/100" alt="Kelli" referrerPolicy="no-referrer" />
              </div>
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex flex-col whitespace-nowrap"
                  >
                    <span className="text-sm font-medium">Kelli R.</span>
                    <span className="text-[10px] text-ink-dim uppercase tracking-wider font-semibold">Business Traveler</span>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
           <NavItem 
            icon={<Settings />} 
            label="Settings" 
            collapsed={!isSidebarOpen} 
            onClick={() => setIsSettingsOpen(true)}
           />
           <motion.button 
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.05)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg mt-2 text-ink-dim hover:text-ink transition-colors"
           >
             <motion.div
               key={isSidebarOpen ? 'open' : 'closed'}
               initial={{ rotate: -90, opacity: 0 }}
               animate={{ rotate: 0, opacity: 1 }}
               transition={{ duration: 0.2 }}
             >
               {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
             </motion.div>
           </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-bg md:bg-bg/80 backdrop-blur-md border-b border-border flex items-center justify-between px-8 sticky top-0 z-40">
           <div>
             <div className="text-[10px] text-ink-dim uppercase tracking-[0.2em] font-bold mb-1">Navigation / {activeTab}</div>
             <h1 className="text-2xl font-bold text-ink leading-none tracking-tight">Sentinel <span className="text-accent underline decoration-2 underline-offset-4">Copilot</span></h1>
           </div>
           
           <div className="flex items-center gap-4">
             <div className="relative">
               <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "relative p-2 text-ink-dim hover:text-accent hover:bg-accent/10 rounded-lg transition-colors border border-transparent hover:border-accent/20",
                  isNotificationsOpen && "bg-accent/10 text-accent border-accent/20"
                )}
               >
                 <Bell className="w-5 h-5" />
                 <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-bg"></span>
               </button>

               <AnimatePresence>
                 {isNotificationsOpen && (
                   <>
                     <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.95, y: 10 }}
                       animate={{ opacity: 1, scale: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.95, y: 10 }}
                       className="absolute right-0 mt-2 w-80 bg-sidebar border border-border shadow-2xl rounded-xl z-50 overflow-hidden"
                     >
                       <div className="p-4 border-b border-border bg-card/50 flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest">Active Alerts</span>
                         <span className="text-[10px] bg-error/10 text-error px-2 py-0.5 rounded-full font-bold">2 NEW</span>
                       </div>
                       <div className="max-h-96 overflow-y-auto custom-scrollbar">
                         <div className="p-4 border-b border-border hover:bg-card/50 transition-colors cursor-pointer group">
                           <div className="flex items-start gap-3">
                             <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center text-warning shrink-0">
                               <AlertTriangle size={14} />
                             </div>
                             <div>
                               <p className="text-xs font-bold text-ink mb-1 group-hover:text-accent transition-colors tracking-tight">Weather Alert: Tokyo-Kanto</p>
                               <p className="text-[10px] text-ink-dim leading-relaxed">Incoming heavy precipitation detected via satellite link. Adjust travel windows.</p>
                               <span className="text-[8px] text-ink-dim/40 uppercase font-black mt-2 block">14:22 UTC</span>
                             </div>
                           </div>
                         </div>
                         <div className="p-4 border-b border-border hover:bg-card/50 transition-colors cursor-pointer group">
                           <div className="flex items-start gap-3">
                             <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                               <RefreshCw size={14} />
                             </div>
                             <div>
                               <p className="text-xs font-bold text-ink mb-1 group-hover:text-accent transition-colors tracking-tight">Sync Complete</p>
                               <p className="text-[10px] text-ink-dim leading-relaxed">Local itinerary database synchronized with Corporate Sentinel HQ.</p>
                               <span className="text-[8px] text-ink-dim/40 uppercase font-black mt-2 block">13:10 UTC</span>
                             </div>
                           </div>
                         </div>
                       </div>
                       <button className="w-full py-3 bg-card/80 text-[10px] font-black uppercase tracking-widest text-ink-dim hover:text-ink transition-colors border-t border-border">
                         View Protocol Log
                       </button>
                     </motion.div>
                   </>
                 )}
               </AnimatePresence>
             </div>
           </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <DashboardView 
                key="dash" 
                trip={trip} 
                sosState={sosState}
                sosTimer={sosTimer}
                onInitiateSOS={() => {
                  setSosState('countdown');
                  setSosTimer(5);
                }}
                onCancelSOS={() => setSosState('idle')}
              />
            )}
            {activeTab === 'itinerary' && <ItineraryView key="itin" trip={trip} />}
            {activeTab === 'assistant' && (
              <AssistantView 
                key="assist" 
                messages={messages} 
                input={input} 
                setInput={setInput} 
                onSend={handleSendMessage} 
                isTyping={isTyping}
              />
            )}
            {activeTab === 'safety' && <SafetyHubView key="safety" trip={trip} />}
          </AnimatePresence>
        </div>

        {/* Settings Modal Overlay */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-bg/95 flex items-center justify-center p-6 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-sidebar w-full max-w-lg rounded-2xl border border-border overflow-hidden shadow-2xl"
              >
                <div className="p-6 border-b border-border flex items-center justify-between bg-card/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/20 rounded-lg text-accent">
                      <Settings size={20} />
                    </div>
                    <h3 className="font-bold text-lg tracking-tight uppercase tracking-wider">System Settings</h3>
                  </div>
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-2 hover:bg-card rounded-lg text-ink-dim hover:text-ink transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-8 space-y-8">
                  {/* Persona Customization */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-ink-dim uppercase tracking-[0.2em] flex items-center gap-2">
                       <Cpu size={12} className="text-accent" />
                       Intelligence Diagnostics
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                        <div>
                          <p className="text-sm font-bold text-ink">Advanced Diagnostics</p>
                          <p className="text-[10px] text-ink-dim">Deep-scan local news and weather patterns.</p>
                        </div>
                        <button 
                          onClick={() => setSettings(s => ({ ...s, advancedDiagnostics: !s.advancedDiagnostics }))}
                          className={cn("w-10 h-6 rounded-full p-1 transition-colors", settings.advancedDiagnostics ? "bg-accent" : "bg-bg border border-border")}
                        >
                          <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", settings.advancedDiagnostics ? "translate-x-4" : "translate-x-0")} />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                        <div>
                          <p className="text-sm font-bold text-ink">Detailed Intelligence</p>
                          <p className="text-[10px] text-ink-dim">Allow detailed security contextualization.</p>
                        </div>
                        <button 
                          onClick={() => setSettings(s => ({ ...s, detailedIntelligence: !s.detailedIntelligence }))}
                          className={cn("w-10 h-6 rounded-full p-1 transition-colors", settings.detailedIntelligence ? "bg-accent" : "bg-bg border border-border")}
                        >
                          <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", settings.detailedIntelligence ? "translate-x-4" : "translate-x-0")} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sync Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-ink-dim uppercase tracking-[0.2em] flex items-center gap-2">
                         <Zap size={12} className="text-warning" />
                         Visual Profile (Themes)
                      </h4>
                      <div className="flex bg-card p-1 rounded-lg border border-border">
                        <button 
                          onClick={() => setThemeMode('dark')}
                          className={cn("px-3 py-1 text-[8px] font-bold rounded-md transition-all", themeMode === 'dark' ? "bg-accent text-white" : "text-ink-dim")}
                        >
                          DARK
                        </button>
                        <button 
                          onClick={() => setThemeMode('light')}
                          className={cn("px-3 py-1 text-[8px] font-bold rounded-md transition-all", themeMode === 'light' ? "bg-accent text-white" : "text-ink-dim")}
                        >
                          LIGHT
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { name: 'Elite Blue', color: '#3B82F6' },
                        { name: 'Tactical Red', color: '#EF4444' },
                        { name: 'Cyber Green', color: '#10B981' },
                        { name: 'Amber Alert', color: '#F59E0B' }
                      ].map((theme) => (
                        <button 
                          key={theme.name}
                          onClick={() => setAccentColor(theme.color)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-2 rounded-xl border transition-all",
                            accentColor === theme.color ? "bg-accent/10 border-accent" : "bg-card border-border hover:border-border/60"
                          )}
                        >
                          <div className="w-full h-8 rounded-lg" style={{ backgroundColor: theme.color }} />
                          <span className="text-[8px] font-bold uppercase tracking-tighter whitespace-nowrap">{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sync Settings */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-ink-dim uppercase tracking-[0.2em] flex items-center gap-2">
                       <RefreshCw size={12} className="text-success" />
                       Data Synchronization
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {['Minimal', 'Standard', 'Real-time'].map((freq) => (
                        <button 
                          key={freq}
                          onClick={() => setSettings(s => ({ ...s, syncFrequency: freq }))}
                          className={cn(
                            "py-2 text-[10px] font-bold rounded-lg border transition-all",
                            settings.syncFrequency === freq ? "bg-success/10 border-success text-success" : "bg-card border-border text-ink-dim hover:border-border/60"
                          )}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Account / Action */}
                  <div className="pt-6 border-t border-border mt-8">
                     <button 
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsLoggingOut(true);
                        setTimeout(() => window.location.reload(), 3000);
                      }}
                      className="w-full bg-error/10 hover:bg-error/20 text-error border border-error/20 py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all"
                     >
                        <LogOut size={16} />
                        Terminate Session (Log Out)
                     </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Lockdown Overlay */}
        <AnimatePresence>
          {sosState === 'triggered' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-bg flex flex-col items-center justify-center p-6 text-center"
            >
              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
              
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative z-10 space-y-8 max-w-2xl"
              >
                <div className="flex justify-center">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-24 h-24 bg-error/20 border-2 border-error rounded-full flex items-center justify-center text-error"
                  >
                    <ShieldAlert size={48} />
                  </motion.div>
                </div>

                <div className="space-y-2">
                   <h2 className="text-3xl md:text-5xl font-black text-error uppercase tracking-tighter italic">Emergency Assistance</h2>
                   <p className="text-ink-dim font-mono text-sm tracking-widest uppercase">Support Request Initiated</p>
                </div>

                <div className="bg-card border border-error/30 p-6 md:p-8 rounded-xl space-y-6 text-left font-mono">
                   <div className="space-y-4">
                      <div className="flex items-center gap-3 text-success">
                         <div className="w-2 h-2 bg-success rounded-full pulse-success"></div>
                         <span className="text-[10px] font-bold uppercase tracking-widest">GLOBAL SUPPORT NETWORK: CONNECTED</span>
                      </div>
                      <div className="flex items-center gap-3 text-accent">
                         <div className="w-2 h-2 bg-accent rounded-full pulse-accent"></div>
                         <span className="text-[10px] font-bold uppercase tracking-widest">TRANSMITTING COORDINATES: {trip.cityCenter.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-3 text-warning">
                         <div className="w-2 h-2 bg-warning rounded-full pulse-warning"></div>
                         <span className="text-[10px] font-bold uppercase tracking-widest">ESTIMATED ASSISTANCE TIME: 4M 32S</span>
                      </div>
                   </div>

                   <div className="pt-6 border-t border-error/10">
                      <div className="text-[10px] text-ink-dim uppercase mb-2">Instructions:</div>
                      <ul className="text-xs text-ink space-y-2 opacity-80 font-sans">
                         <li>• Move to a safe, visible public location if possible.</li>
                         <li>• Keep this application open for tracking and updates.</li>
                         <li>• Professional responders have been notified of your priority status.</li>
                      </ul>
                   </div>
                </div>

                <button 
                  onClick={() => setSosState('idle')}
                  className="bg-ink text-bg px-10 py-4 rounded-lg font-black text-xs uppercase tracking-[0.4em] hover:bg-ink/90 transition-all border-b-4 border-ink-dim/30 active:border-b-0 active:translate-y-1"
                >
                  CANCEL / DE-ESCALATE
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden fixed bottom-4 left-4 right-4 bg-sidebar/80 backdrop-blur-lg border border-border px-6 py-4 rounded-2xl flex items-center justify-between z-50 shadow-2xl">
          <MobileNavItem 
            icon={<Home />} 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <MobileNavItem 
            icon={<Calendar />} 
            active={activeTab === 'itinerary'} 
            onClick={() => setActiveTab('itinerary')} 
          />
          <MobileNavItem 
            icon={<MessageSquare />} 
            active={activeTab === 'assistant'} 
            onClick={() => setActiveTab('assistant')} 
          />
          <MobileNavItem 
            icon={<AlertTriangle />} 
            active={activeTab === 'safety'} 
            onClick={() => setActiveTab('safety')} 
          />
          <MobileNavItem 
            icon={<Settings />} 
            active={isSettingsOpen} 
            onClick={() => setIsSettingsOpen(true)} 
          />
        </div>
      </main>
    </div>
  );
}

function MobileNavItem({ icon, active, onClick }: { icon: React.ReactNode, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl transition-all duration-200",
        active ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-ink-dim"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 20 })}
    </button>
  );
}

function NavItem({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, collapsed?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200 group relative",
        active ? "bg-accent text-white font-semibold shadow-lg shadow-accent/10" : "text-ink-dim hover:bg-card hover:text-ink"
      )}
    >
      <motion.div 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={cn("transition-transform duration-200 shrink-0", active && "scale-105")}
      >
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </motion.div>
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.span 
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            className="text-xs uppercase tracking-wider font-semibold whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {collapsed && (
        <div className="absolute left-full ml-4 px-2 py-1 bg-card border border-border text-ink text-[10px] font-bold uppercase tracking-wider rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl">
          {label}
        </div>
      )}
    </button>
  );
}

function DashboardView({ trip, sosState, sosTimer, onInitiateSOS, onCancelSOS }: { trip: Trip, sosState: string, sosTimer: number, onInitiateSOS: () => void, onCancelSOS: () => void, key?: string }) {
  const nextEvent = trip.events.find(e => e.status === 'upcoming') || trip.events[0];
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Hero Banner */}
      <section className="relative h-48 md:h-64 rounded-xl overflow-hidden border border-border group shadow-xl">
        <img 
          src={`https://picsum.photos/seed/${trip.destination.split(',')[0]}/1200/400`} 
          alt={trip.destination} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-60" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent flex flex-col justify-end p-4 md:p-8">
          <div className="flex items-center gap-2 text-accent mb-2">
             <MapPin size={16} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Active Risk Assessment</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-ink mb-2 tracking-tighter">{trip.destination}</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-ink-dim">
             <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs border border-border">
                <Calendar size={14} className="text-accent" />
                <span className="font-semibold">{trip.startDate} - {trip.endDate}</span>
             </div>
             <div className="flex items-center gap-2 bg-success/10 backdrop-blur-sm border border-success/30 px-3 py-1.5 rounded-lg text-xs text-success">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                <span className="font-black uppercase tracking-wider">Risk: {trip.riskLevel}</span>
             </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionHeader title="Next Milestone" />
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:border-border/60 transition-colors">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-accent/10 p-3 rounded-lg text-accent border border-accent/20">
                   {nextEvent.type === 'flight' && <Plane size={24} />}
                   {nextEvent.type === 'hotel' && <Building size={24} />}
                   {nextEvent.type === 'meeting' && <Users size={24} />}
                   {nextEvent.type === 'transport' && <Navigation size={24} />}
                </div>
                <div>
                  <p className="text-[10px] text-ink-dim uppercase font-bold tracking-widest mb-0.5">Primary Transport</p>
                  <h3 className="text-lg font-bold text-ink tracking-tight">{nextEvent.title}</h3>
                </div>
              </div>
              <span className="text-accent font-bold bg-accent/10 border border-accent/20 px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider">{nextEvent.time}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-border">
               <div className="bg-bg/50 p-4 rounded-lg border border-border/50">
                 <p className="text-[10px] text-ink-dim uppercase font-bold tracking-wider mb-1">Status</p>
                 <p className="text-xl md:text-2xl font-bold text-ink tracking-tighter uppercase">{nextEvent.status}</p>
               </div>
               <div className="bg-bg/50 p-4 rounded-lg border border-border/50">
                 <p className="text-[10px] text-ink-dim uppercase font-bold tracking-wider mb-1">Location</p>
                 <p className="text-xl md:text-2xl font-bold text-ink tracking-tighter truncate">{nextEvent.description}</p>
               </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-warning/10 p-2 rounded-lg text-warning border border-warning/20">
                  <AlertTriangle size={16} />
                </div>
                <p className="text-xs text-ink-dim font-medium leading-relaxed">{nextEvent.safetyTip}</p>
              </div>
              <ChevronRight className="text-border" />
            </div>
          </div>

          <SectionHeader title="Security Insights" subtitle="Real-time localized intelligence" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsightCard 
              icon={<Shield className="text-green-500" />} 
              label="Cyber Safety" 
              value={trip.insights.cyberSafety.value} 
              desc={trip.insights.cyberSafety.desc}
            />
             <InsightCard 
              icon={<Users className="text-blue-500" />} 
              label="Local Events" 
              value={trip.insights.localEvents.value} 
              desc={trip.insights.localEvents.desc}
            />
          </div>
        </div>

        <div className="space-y-6">
           <SectionHeader title="SOS Quick Connect" />
           <div className="bg-sidebar p-6 rounded-xl border border-border text-ink shadow-xl relative overflow-hidden">
              <div className={cn("absolute inset-0 bg-error/5 pulse-subtle pointer-events-none transition-opacity duration-1000", sosState === 'countdown' ? 'opacity-100' : 'opacity-0')}></div>
              <p className="text-xs text-ink-dim mb-6 relative z-10 leading-relaxed uppercase tracking-wider font-bold">
                {sosState === 'countdown' ? 'PROTOCOL OVERRIDE IN PROGRESS...' : trip.sosProtocol}
              </p>
              
              <div className="relative z-10">
                {sosState === 'countdown' ? (
                  <div className="space-y-4">
                    <div className="text-center py-4 bg-error/10 border border-error/30 rounded-lg">
                      <div className="text-4xl font-black italic text-error animate-pulse">{sosTimer}</div>
                      <div className="text-[10px] uppercase font-bold text-error tracking-[0.2em] mt-1">Countdown to broadcast</div>
                    </div>
                    <button 
                      onClick={onCancelSOS}
                      className="w-full bg-bg border border-border text-ink-dim hover:text-ink py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all"
                    >
                      ABORT SIGNAL
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={onInitiateSOS}
                    className="w-full bg-error hover:bg-error/90 active:scale-95 transition-all text-white py-4 rounded-lg font-bold flex items-center justify-center gap-3 shadow-lg shadow-error/20 mb-4"
                  >
                    <PhoneCall size={20} />
                    <span className="tracking-widest">INITIATE SOS</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 mt-8 relative z-10">
                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest py-2 border-b border-border">
                    <span className="text-ink-dim">Police / Rescue</span>
                    <span className="text-ink">119</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest py-2 border-b border-border">
                    <span className="text-ink-dim">Lockton Global</span>
                    <span className="text-ink">+1 800 555 SAFE</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest py-2">
                    <span className="text-ink-dim">US Embassy</span>
                    <span className="text-ink">+81 3 3224 5000</span>
                 </div>
              </div>
           </div>

           <SectionHeader title="Climate Analytics" />
           <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-ink">{trip.temperature}</span>
                  <span className="text-[10px] font-bold text-ink-dim uppercase tracking-wider">{trip.cityCenter}</span>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-lg border border-warning/20 flex items-center justify-center text-warning">
                   <div className="w-6 h-6 border-4 border-warning rounded-full"></div>
                </div>
             </div>
             <p className="text-[11px] text-ink-dim leading-relaxed">Atmospheric conditions stable. No significant environmental risks detected for travel period.</p>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function SectionHeader({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-[10px] font-black text-ink-dim uppercase tracking-[0.2em]">{title}</h3>
      {subtitle && <p className="text-sm text-ink-dim/80">{subtitle}</p>}
    </div>
  );
}

function InsightCard({ icon, label, value, desc }: { icon: React.ReactNode, label: string, value: string, desc: string }) {
  return (
    <div className="bg-card p-5 rounded-xl border border-border shadow-md transition-all hover:bg-card/80">
       <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-sidebar rounded-lg border border-border/50">{icon}</div>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] text-ink-dim font-black uppercase tracking-widest mb-1">{label}</span>
            <span className="text-sm font-bold text-ink">{value}</span>
          </div>
       </div>
       <p className="text-xs text-ink-dim leading-relaxed">{desc}</p>
    </div>
  );
}

function ItineraryView({ trip }: { trip: Trip, key?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-ink tracking-tight">Trip Documentation</h2>
        <button className="text-accent text-xs font-bold flex items-center gap-2 uppercase tracking-widest bg-accent/10 px-4 py-2 rounded-lg border border-accent/20">
          <Calendar size={14} />
          <span>Sync To Ledger</span>
        </button>
      </div>

      <div className="relative pl-12 space-y-6 before:content-[''] before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
        {trip.events.map((event, idx) => (
          <motion.div 
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="relative"
          >
            <div className={cn(
              "absolute -left-[12px] top-1 w-6 h-6 rounded-full border border-bg shadow-md flex items-center justify-center z-10",
              idx === 0 ? "bg-accent" : "bg-card border-border"
            )}>
              {event.status === 'completed' && <div className="w-1.5 h-1.5 rounded-full bg-success"></div>}
            </div>
            
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm hover:border-border/60 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-[10px] font-black text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-md uppercase tracking-wider">{event.time}</span>
                  <h4 className="text-lg font-bold mt-3 text-ink">{event.title}</h4>
                </div>
                <div className="p-2.5 bg-sidebar rounded-xl text-ink-dim border border-border/50">
                  {event.type === 'flight' && <Plane size={18} />}
                  {event.type === 'hotel' && <Building size={18} />}
                  {event.type === 'meeting' && <Users size={18} />}
                  {event.type === 'transport' && <Navigation size={18} />}
                </div>
              </div>
              <p className="text-sm text-ink-dim mb-4 leading-relaxed">{event.description}</p>
              {event.safetyTip && (
                <div className="bg-bg/50 p-4 rounded-lg flex gap-3 items-start border border-border/40">
                   <Shield className="text-accent shrink-0 mt-0.5" size={14} />
                   <p className="text-xs text-ink leading-relaxed">
                     <span className="font-bold text-accent uppercase tracking-tighter mr-1">Safety IQ:</span> {event.safetyTip}
                   </p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function AssistantView({ messages, input, setInput, onSend, isTyping }: { messages: ChatMessage[], input: string, setInput: (v: string) => void, onSend: () => void, isTyping: boolean, key?: string }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col max-w-4xl mx-auto rounded-xl bg-card border border-border shadow-2xl relative overflow-hidden"
    >
      {/* AI Header */}
      <div className="p-6 border-b border-border flex items-center gap-4 bg-sidebar/50">
        <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20">
          <MessageSquare size={24} />
        </div>
        <div>
          <h3 className="font-bold text-ink">Sentinel Copilot</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
            <span className="text-[10px] text-ink-dim font-black uppercase tracking-widest">Neural Link Active</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6 flex flex-col custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "max-w-[85%] p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap",
            msg.role === 'user' 
              ? "bg-accent text-white self-end rounded-tr-none shadow-md" 
              : "bg-sidebar text-ink self-start rounded-tl-none border border-border"
          )}>
            {msg.content}
          </div>
        ))}
        {isTyping && (
          <div className="bg-sidebar text-ink self-start p-4 rounded-xl rounded-tl-none border border-border flex gap-1.5 items-center">
            <div className="w-1 h-1 bg-accent rounded-full animate-bounce delay-[0ms]"></div>
            <div className="w-1 h-1 bg-accent rounded-full animate-bounce delay-[150ms]"></div>
            <div className="w-1 h-1 bg-accent rounded-full animate-bounce delay-[300ms]"></div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-border bg-sidebar/30">
        <div className="relative group">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder="System status query..." 
            className="w-full pl-6 pr-20 py-4 rounded-lg border border-border bg-bg text-ink placeholder:text-ink-dim/40 focus:outline-none focus:ring-1 focus:ring-accent shadow-sm transition-all text-sm"
          />
          <button 
            onClick={onSend}
            disabled={!input.trim()}
            className="absolute right-2 top-2 bottom-2 px-6 bg-accent text-white rounded-md font-bold text-[10px] uppercase tracking-widest hover:bg-accent/90 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            Execute
          </button>
        </div>
        <div className="flex justify-center mt-3">
          <p className="text-[9px] text-ink-dim uppercase font-black tracking-[0.3em] flex items-center gap-2">
            <Shield size={10} className="text-accent" />
            End-to-End Encryption Enabled
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function SafetyHubView({ trip }: { trip: Trip, key?: string }) {
  const [isScanning, setIsScanning] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const destinationCity = trip.destination.split(',')[0];

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 2500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
       <div className="bg-gradient-to-br from-sidebar to-bg rounded-xl p-6 md:p-10 text-ink border border-border shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-2">Safety Hub</div>
            <h2 className="text-2xl md:text-4xl font-bold mb-4 tracking-tighter">Support Resources</h2>
            <p className="text-ink-dim mb-8 text-base md:text-lg leading-relaxed">
              Real-time travel safety and medical assistance data for <span className="text-ink font-bold">{trip.destination}</span>. 
              Connectivity: {isScanning ? (
                <span className="text-accent font-bold uppercase tracking-widest animate-pulse">Syncing Alerts...</span>
              ) : (
                <span className="text-success font-bold uppercase tracking-widest">Connected</span>
              )}
            </p>
            <div className="flex flex-wrap gap-4">
               <button 
                onClick={handleScan}
                disabled={isScanning}
                className={cn(
                  "w-full sm:w-auto px-8 py-3.5 rounded-lg font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-lg",
                  isScanning 
                    ? "bg-accent/50 text-white/50 cursor-not-allowed" 
                    : "bg-accent text-white hover:bg-accent/90 shadow-accent/20"
                )}
               >
                 <Shield size={16} className={isScanning ? "animate-spin" : ""} />
                 {isScanning ? "Contacting Servers..." : "Manual Risk Refresh"}
               </button>
            </div>
          </div>
          <Shield className="absolute -right-20 -bottom-20 w-80 h-80 text-white/[0.02] rotate-12 pointer-events-none" />
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SafetyCard 
            title="Location Risk Map" 
            desc={`Detailed spatial data tracking local environmental and safety patterns in ${destinationCity}.`} 
            action={activeModule === 'geo' ? "Refreshing..." : "View Map"}
            icon={<MapPin className="text-error" />}
            onClick={() => {
              setActiveModule('geo');
              setTimeout(() => setActiveModule(null), 2000);
            }}
            active={activeModule === 'geo'}
          />
          <SafetyCard 
            title="Transport Safety" 
            desc={`Verification of ${destinationCity} transit providers against corporate safety standards.`} 
            action={activeModule === 'transport' ? "Checking..." : "Verify Transport"}
            icon={<Navigation className="text-accent" />}
            onClick={() => {
              setActiveModule('transport');
              setTimeout(() => setActiveModule(null), 2000);
            }}
            active={activeModule === 'transport'}
          />
          <SafetyCard 
            title="Medical Facilities" 
            desc={`Lists of pre-cleared health facilities and emergency centers within ${trip.cityCenter} radius.`} 
            action={activeModule === 'medical' ? "Searching..." : "Find Medical"}
            icon={<Shield className="text-success" />}
            onClick={() => {
              setActiveModule('medical');
              setTimeout(() => setActiveModule(null), 2000);
            }}
            active={activeModule === 'medical'}
          />
       </div>

       <div className="bg-card rounded-xl p-8 border border-border shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-ink">Localized Safety Alerts: {destinationCity}</h3>
            <div className="flex gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
               <div className="w-1.5 h-1.5 rounded-full bg-success opacity-50"></div>
            </div>
          </div>
          <div className="space-y-4">
             <BroadcastItem 
               type="warning" 
               title="Regional Alert" 
               time="2h ago" 
               msg={`Civil demonstration scheduled for ${trip.cityCenter}. Risk Level: ${trip.riskLevel}. Avoid Sector 4.`} 
             />
             <BroadcastItem 
               type="info" 
               title="Compliance Directive" 
               time="1d ago" 
               msg={`Updated mask guidelines for corporate suites in ${destinationCity}. No immediate action required.`} 
             />
          </div>
       </div>
    </motion.div>
  );
}

function SafetyCard({ title, desc, action, icon, onClick, active }: { title: string, desc: string, action: string, icon: React.ReactNode, onClick: () => void, active?: boolean }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-card p-8 rounded-xl border transition-all group cursor-pointer relative overflow-hidden",
        active ? "border-accent ring-1 ring-accent/20" : "border-border shadow-sm hover:border-accent/40"
      )}
    >
       {active && (
         <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 0.05 }}
           className="absolute inset-0 bg-accent pointer-events-none"
         />
       )}
       <div className="bg-sidebar w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-border/50">{icon}</div>
       <div className="text-[10px] font-black uppercase tracking-widest text-ink-dim mb-1">Module / Active</div>
       <h4 className="text-lg font-bold mb-2 text-ink tracking-tight">{title}</h4>
       <p className="text-sm text-ink-dim mb-8 leading-relaxed font-medium">{desc}</p>
       <button className={cn(
         "font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 group-hover:gap-3 transition-all",
         active ? "text-success" : "text-accent"
       )}>
         {action}
         <ChevronRight size={14} className={active ? "animate-pulse" : ""} />
       </button>
    </div>
  );
}

function BroadcastItem({ type, title, time, msg }: { type: 'warning' | 'info', title: string, time: string, msg: string }) {
  return (
    <div className="flex gap-5 items-start p-5 rounded-lg bg-bg/50 border border-border/50 hover:bg-bg transition-colors">
       <div className={cn(
         "mt-1 p-2.5 rounded-md border",
         type === 'warning' ? "bg-error/10 text-error border-error/20" : "bg-accent/10 text-accent border-accent/20"
       )}>
         <AlertTriangle size={18} />
       </div>
       <div className="flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <h5 className="font-bold text-sm text-ink tracking-tight">{title}</h5>
            <span className="text-[10px] text-ink-dim font-black uppercase tracking-widest">{time}</span>
          </div>
          <p className="text-xs text-ink-dim leading-relaxed font-medium">{msg}</p>
       </div>
    </div>
  );
}
