
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { CorridorSettings, Door, Destination, Journey } from './types';
import ControlPanel from './components/ControlPanel';
import CorridorCanvas from './components/CorridorCanvas';
import ChatBot from './components/ChatBot';
import SupabaseSync from './components/SupabaseSync';
import { stringToSeed, mulberry32 } from './utils/random';

const generateThematicId = (random: () => number, part: number): string => {
    const prefixes = ['Wing', 'Block', 'Sector', 'Hall', 'Section', 'Area'];
    const letters = 'ABCDEFG';
    if (part === 0) {
        return `Main Lobby`;
    }
    if (part < 4) {
         return `${prefixes[Math.floor(random() * prefixes.length)]} ${letters.charAt(Math.floor(random() * letters.length))}`;
    }
    return `Room ${Math.floor(random() * 900) + 100}`;
};

const generatePathForDestination = (destinationName: string): string[] => {
    const seed = stringToSeed(destinationName);
    const random = mulberry32(seed);
    const pathLength = Math.floor(random() * 3) + 3; // 3 to 5 steps
    const path = ['START-0'];
    for (let i = 0; i < pathLength; i++) {
        path.push(generateThematicId(random, i + 1));
    }
    path.push(destinationName);
    return path;
};


const generateCorridorSettings = (id: string, destination: Destination | null, path: string[]): CorridorSettings => {
  const seed = stringToSeed(id + (destination?.name || ''));
  const random = mulberry32(seed);
  const isDestination = id === destination?.name;

  const hue = isDestination ? 45 : Math.floor(random() * 360);
  const saturation = isDestination ? 90 : 100;
  const lightness = isDestination ? 60 : 70;
  const lineColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  const numSegments = 40;
  const numDoors = Math.floor(random() * 4) + 2; // 2 to 5 doors
  const doors: Door[] = [];
  
  // Find where the current corridor is on the path, using the pre-calculated path
  const currentPathIndex = path.indexOf(id);
  const nextPathId = (currentPathIndex !== -1 && currentPathIndex < path.length - 1) 
    ? path[currentPathIndex + 1] 
    : null;

  // New, improved door placement logic
  const minDoorPosition = 5;
  const maxDoorPosition = numSegments - 10;
  const minDistanceBetweenDoors = 4; // Prevents doors from being visually cluttered

  let availablePositions: number[] = [];
  for (let i = minDoorPosition; i <= maxDoorPosition; i++) {
    availablePositions.push(i);
  }
  
  // A helper to pick a position and remove it and its neighbors from the pool
  const pickPosition = (): number | null => {
    if (availablePositions.length === 0) {
      return null;
    }
    const poolIndex = Math.floor(random() * availablePositions.length);
    const position = availablePositions[poolIndex];
    
    // Remove the chosen position and nearby positions from the available pool
    availablePositions = availablePositions.filter(
      p => Math.abs(p - position) >= minDistanceBetweenDoors
    );
    
    return position;
  };


  // Create one door that is the correct path
  if (nextPathId) {
    const position = pickPosition();
    if (position !== null) {
        doors.push({
        id: nextPathId,
        position,
        side: random() > 0.5 ? 'left' : 'right',
        isPath: true,
        description: "This seems to be the right way."
        });
    }
  }

  // Add other random doors
  const remainingDoors = numDoors - doors.length;
  for (let i = 0; i < remainingDoors; i++) {
    const position = pickPosition();
    if (position === null) break; // Stop if no more valid positions are available
    
    const doorId = generateThematicId(random, Math.floor(random() * 5));
    doors.push({
      id: doorId,
      position,
      side: random() > 0.5 ? 'left' : 'right',
      isPath: false,
      description: `Leads to ${doorId}.`
    });
  }

  return {
    id,
    vanishingPointX: 0.5,
    vanishingPointY: 0.5,
    corridorWidth: 0.8,
    corridorHeight: 0.9,
    numSegments,
    perspectiveStrength: 1.5,
    lineColor,
    doors: doors.sort((a, b) => a.position - b.position),
  };
        <SupabaseSync />
};

const App: React.FC = () => {
  const [corridorId, setCorridorId] = useState<string>('START-0');
  const [destination, setDestination] = useState<Destination | null>(null);
  const [path, setPath] = useState<string[]>(['START-0']);
  const [history, setHistory] = useState<Journey[]>([]);
  const [cameraZ, setCameraZ] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapApiLoaded, setMapApiLoaded] = useState(false);
  const mapScriptLoaded = React.useRef(false);

  useEffect(() => {
      // Load Google Maps API Script
      if (!mapScriptLoaded.current && process.env.API_KEY) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.API_KEY}&libraries=places`;
          script.async = true;
          script.onload = () => {
              setMapApiLoaded(true);
          };
          document.head.appendChild(script);
          mapScriptLoaded.current = true;
      }
      
      // Get User Geolocation
      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  setUserLocation({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                  });
              },
              (error) => {
                  console.error("Geolocation error:", error.message, `(Code: ${error.code})`);
                  // Default location if user denies permission
                  setUserLocation({ lat: 40.7128, lng: -74.0060 }); 
              }
          );
      } else {
        console.error("Geolocation is not available in this browser.");
        setUserLocation({ lat: 40.7128, lng: -74.0060 });
      }
  }, []);

  const corridorSettings = useMemo(
    () => generateCorridorSettings(corridorId, destination, path),
    [corridorId, destination, path]
  );

  const handleNavigate = useCallback((newId: string) => {
    setCorridorId(newId);
    setCameraZ(0);
  }, []);
  
  const handleNewDestination = useCallback(() => {
      if (destination && path.length > 1) {
          const completedJourney: Journey = { destination, path };
          setHistory(prev => [completedJourney, ...prev.slice(0, 4)]); // Keep last 5 journeys
      }
      setDestination(null);
      setPath(['START-0']);
      setCorridorId('START-0');
      setCameraZ(0);
  }, [destination, path]);
  
  const handlePlaceSelected = useCallback((newDestination: Destination) => {
      const newPath = generatePathForDestination(newDestination.name);
      setDestination(newDestination);
      setPath(newPath);
      setCorridorId('START-0');
      setCameraZ(0);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return; // Ignore key presses if user is typing in an input field
    }
    switch (event.key) {
      case 'w':
      case 'ArrowUp':
        setCameraZ(prev => Math.min(corridorSettings.numSegments - 2, prev + 1));
        break;
      case 's':
      case 'ArrowDown':
        setCameraZ(prev => Math.max(0, prev - 1));
        break;
    }
  }, [corridorSettings.numSegments]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <main className="h-screen w-screen flex flex-col-reverse md:flex-row bg-black text-white font-sans">
      <ControlPanel
        settings={corridorSettings}
        cameraZ={cameraZ}
        setCameraZ={setCameraZ}
        destination={destination}
        path={path}
        history={history}
        onNewDestination={handleNewDestination}
        mapApiLoaded={mapApiLoaded}
        userLocation={userLocation}
        onPlaceSelected={handlePlaceSelected}
      />
      <div className="flex-grow h-1/2 md:h-full w-full md:w-auto relative">
        <CorridorCanvas 
          settings={corridorSettings} 
          cameraZ={cameraZ} 
          onNavigate={handleNavigate} 
        />
      </div>
       <ChatBot lineColor={corridorSettings.lineColor} />
    </main>
  );
};

export default App;
