export interface TripEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  type: 'flight' | 'hotel' | 'meeting' | 'transport';
  status: 'upcoming' | 'ongoing' | 'completed';
  safetyTip?: string;
}

export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  riskLevel: 'Low' | 'Moderate' | 'High';
  events: TripEvent[];
  cityCenter: string;
  temperature: string;
  sosProtocol: string;
  insights: {
    cyberSafety: { value: string; desc: string };
    localEvents: { value: string; desc: string };
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
