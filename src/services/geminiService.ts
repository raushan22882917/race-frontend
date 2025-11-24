import { GoogleGenerativeAI } from '@google/generative-ai';
import { useTelemetryStore } from '../store/telemetryStore';

// Get API key from environment variable
const getApiKey = (): string => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ VITE_GEMINI_API_KEY not found in environment variables');
    console.log('Available env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
    return '';
  }
  // Trim whitespace and check if it's actually a valid key
  const trimmedKey = apiKey.trim();
  if (!trimmedKey || trimmedKey.length < 10) {
    console.warn('⚠️ VITE_GEMINI_API_KEY appears to be invalid (too short or empty)');
    return '';
  }
  return trimmedKey;
};

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

// Initialize Gemini AI
const initializeGemini = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('❌ Cannot initialize Gemini: API key is missing or invalid');
    return null;
  }
  
  try {
    if (!genAI) {
      console.log('🔑 Initializing Gemini AI with API key (length:', apiKey.length, ')');
      genAI = new GoogleGenerativeAI(apiKey);
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      console.log('✅ Gemini AI initialized successfully');
    }
    return model;
  } catch (error: any) {
    console.error('❌ Failed to initialize Gemini AI:', error);
    return null;
  }
};

// Get page name from active component
const getPageName = (activeComponent: string | null): string => {
  const pageMap: Record<string, string> = {
    'live-telemetry': 'Live Telemetry Dashboard',
    'post-event': 'Post-Event Analysis',
    'driver-training-insights': 'Driver Training',
    'realtime': 'Real-Time Analytics',
  };
  return activeComponent ? pageMap[activeComponent] || 'Main Dashboard' : 'Main Dashboard';
};

// Get context from telemetry store (using getState() to access store outside React)
const getPageContext = (activeComponent: string | null = null): string => {
  const state = useTelemetryStore.getState();
  
  const context: string[] = [];
  
  // Current page context
  const pageName = getPageName(activeComponent);
  context.push(`Current Page: ${pageName}`);
  context.push('');
  
  // Vehicle information
  const vehicleCount = Object.keys(state.vehicles).length;
  if (vehicleCount > 0) {
    context.push(`Currently tracking ${vehicleCount} vehicle(s) on the track.`);
    
    const selectedVehicle = state.selectedVehicleId 
      ? state.vehicles[state.selectedVehicleId] 
      : null;
    
    if (selectedVehicle) {
      const telemetry = selectedVehicle.telemetry;
      context.push(`Selected vehicle: ${state.selectedVehicleId}`);
      context.push(`Current speed: ${telemetry.speed?.toFixed(1) || 'N/A'} km/h`);
      context.push(`RPM: ${telemetry.rpm?.toFixed(0) || 'N/A'}`);
      context.push(`Gear: ${telemetry.gear || 'N/A'}`);
      context.push(`Lap: ${telemetry.lap || 'N/A'}`);
      context.push(`Lap distance: ${telemetry.lap_distance?.toFixed(1) || 'N/A'} m`);
      context.push(`Throttle: ${((telemetry.throttle || 0) * 100).toFixed(1)}%`);
      context.push(`Brake: ${(((telemetry.brake_front || 0) + (telemetry.brake_rear || 0)) * 50).toFixed(1)}%`);
      context.push(`Steering: ${((telemetry.steering || 0) * 100).toFixed(1)}%`);
      if (telemetry.acceleration_x || telemetry.acceleration_y) {
        context.push(`Acceleration: X=${telemetry.acceleration_x?.toFixed(2) || 'N/A'} m/s², Y=${telemetry.acceleration_y?.toFixed(2) || 'N/A'} m/s²`);
      }
    }
    
    // All vehicles summary
    context.push('');
    context.push('All Vehicles Summary:');
    Object.entries(state.vehicles).forEach(([id, vehicle]) => {
      const t = vehicle.telemetry;
      context.push(`  Vehicle ${id}: Speed ${t.speed?.toFixed(1) || 'N/A'} km/h, Lap ${t.lap || 'N/A'}, Gear ${t.gear || 'N/A'}, RPM ${t.rpm?.toFixed(0) || 'N/A'}`);
    });
  } else {
    context.push('No vehicles currently on track.');
  }
  
  // Weather information
  if (state.weather) {
    context.push('');
    const w = state.weather;
    context.push(`Weather Conditions:`);
    context.push(`  Temperature: ${w.air_temp?.toFixed(1) || 'N/A'}°C`);
    context.push(`  Humidity: ${w.humidity?.toFixed(1) || 'N/A'}%`);
    context.push(`  Wind Speed: ${w.wind_speed?.toFixed(1) || 'N/A'} m/s`);
    if (w.wind_direction != null) {
      context.push(`  Wind Direction: ${w.wind_direction.toFixed(1)}°`);
    }
    if (w.rain && w.rain > 0) {
      context.push(`  Rain: ${w.rain.toFixed(2)} mm`);
    }
  }
  
  // Leaderboard information
  if (state.leaderboard.length > 0) {
    context.push('');
    context.push(`Leaderboard (Top 5):`);
    state.leaderboard.slice(0, 5).forEach((entry) => {
      const bestLapTime = entry.best_lap_time;
      const formattedBestLap = bestLapTime 
        ? (typeof bestLapTime === 'number' ? bestLapTime.toFixed(2) : parseFloat(bestLapTime.toString()).toFixed(2))
        : 'N/A';
      context.push(`  Position ${entry.position}: Vehicle ${entry.vehicle_id}, Lap ${entry.lap}, Best Lap ${formattedBestLap}s`);
    });
  }
  
  // Playback status
  context.push('');
  context.push(`Playback Status: ${state.isPlaying ? 'Playing' : 'Paused'} at ${state.playbackSpeed}x speed`);
  
  // Lap events
  const totalLapEvents = Object.values(state.lapEvents).reduce((sum, events) => sum + events.length, 0);
  if (totalLapEvents > 0) {
    context.push(`Total lap events recorded: ${totalLapEvents}`);
  }
  
  return context.join('\n');
};

// Send message to Gemini AI with context
export const sendMessageToGemini = async (
  userMessage: string,
  onStream?: (chunk: string) => void,
  activeComponent: string | null = null
): Promise<string> => {
  const model = initializeGemini();
  
  if (!model) {
    throw new Error('Gemini AI not initialized. Please set VITE_GEMINI_API_KEY in your .env file.');
  }
  
  const context = getPageContext(activeComponent);
  
  const systemPrompt = `You are an AI assistant for a racing telemetry analysis system. You help users understand telemetry data, vehicle performance, race strategies, and provide insights about the current race session.

Current Race Context:
${context || 'No telemetry data available yet.'}

Provide helpful, concise, and technical insights about the racing data. Be specific with numbers and metrics when available. If the user is asking about a specific page or feature, tailor your response to that context.`;

  const fullPrompt = `${systemPrompt}\n\nUser Question: ${userMessage}\n\nAssistant:`;
  
  try {
    if (onStream) {
      // Streaming response
      const result = await model.generateContentStream(fullPrompt);
      let fullResponse = '';
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        onStream(chunkText);
      }
      
      return fullResponse;
    } else {
      // Non-streaming response
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    }
  } catch (error: any) {
    console.error('Gemini AI error:', error);
    
    // Check if it's an API key error
    if (error.message?.includes('API_KEY') || error.message?.includes('api key') || error.message?.includes('API key')) {
      throw new Error('Invalid or missing Gemini API key. Please check your VITE_GEMINI_API_KEY in .env file and restart the dev server.');
    }
    
    // Check if it's a model error
    if (error.message?.includes('model') || error.message?.includes('Model')) {
      throw new Error(`Model error: ${error.message}. The model 'gemini-2.5-flash' might not be available. Try 'gemini-pro' or 'gemini-1.5-flash' instead.`);
    }
    
    // Generic error
    throw new Error(`Failed to get AI response: ${error.message || 'Unknown error'}. Please check your API key and try again.`);
  }
};

// Check if Gemini AI is available
export const isGeminiAvailable = (): boolean => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return false;
  }
  
  // Additional validation: check if it looks like a valid API key
  // Gemini API keys typically start with "AIza" and are around 39 characters
  if (apiKey.length < 20 || !apiKey.startsWith('AIza')) {
    console.warn('⚠️ API key format looks invalid. Gemini keys usually start with "AIza"');
    return false;
  }
  
  return true;
};

// Test API key by making a simple request
export const testApiKey = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const model = initializeGemini();
    if (!model) {
      return { 
        success: false, 
        message: 'API key not found or invalid. Please check your .env file and restart the dev server.' 
      };
    }
    
    // Make a simple test request
    const result = await model.generateContent('Say "OK" if you can read this.');
    const response = await result.response;
    const text = response.text();
    
    return { 
      success: true, 
      message: `API key is working! Response: ${text.substring(0, 50)}` 
    };
  } catch (error: any) {
    return { 
      success: false, 
      message: `API key test failed: ${error.message}` 
    };
  }
};

