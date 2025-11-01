
import React from 'react';

// This is a placeholder component for the web version, as the original was missing.
// It provides the basic structure expected by App.tsx.

const ControlPanel = (props: any) => {
  const { settings, cameraZ, setCameraZ, destination, onNewDestination } = props;

  return (
    <div style={{ padding: '10px', color: 'white', backgroundColor: '#222', width: '300px' }}>
      <h2>Control Panel</h2>
      <div>
        <p>Current Corridor: {settings.id}</p>
        {destination && <p>Destination: {destination.name}</p>}
        <button onClick={onNewDestination}>New Destination</button>
      </div>
      <div>
        <label>Camera Depth: {Math.round(cameraZ)}</label>
        <input
          type="range"
          min={0}
          max={settings.numSegments - 2}
          value={cameraZ}
          onChange={(e) => setCameraZ(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

export default ControlPanel;
