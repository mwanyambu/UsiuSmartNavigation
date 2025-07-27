import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { api } from './api';


// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const speak = (text) => {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  speechSynthesis.speak(utterance);
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // meters
};

export const getDeviceId = () => {
  let id = localStorage.getItem('anon_device_id');
  if (!id) {
    id = crypto.randomUUID(); // browser-native
    localStorage.setItem('anon_device_id', id);
  }
  return id;
};

function App() {
  const usiuColors = {
    royalBlue: '#0033A0',
    yellow: '#FFC72C',
    white: '#FFFFFF',
    lightGray: '#f5f5f5',
    darkGray: '#333333',
    lightBlue: '#E6F0FF',
  };

  const baseButton = {
    backgroundColor: usiuColors.royalBlue,
    color: usiuColors.white,
    border: 'none',
    padding: '10px 15px',
    borderRadius: '5px',
    cursor: 'pointer',
    margin: '5px 0',
    fontSize: '1em',
    transition: 'background-color 0.2s ease-in-out',
    textAlign: 'center',
    width: '100%',
  };

  const styles = {
    button: baseButton,
    buttonYellow: {
      ...baseButton,
      backgroundColor: usiuColors.yellow,
      color: usiuColors.darkGray,
    },
    input: {
      padding: '10px',
      border: `1px solid ${usiuColors.royalBlue}`,
      borderRadius: '5px',
      margin: '5px 0',
      width: 'calc(100% - 22px)', // Adjust for padding and border
    },
    select: {
      padding: '10px',
      border: `1px solid ${usiuColors.royalBlue}`,
      borderRadius: '5px',
      margin: '5px 0',
      width: '100%',
      backgroundColor: usiuColors.white,
    },
    panel: {
      position: 'absolute',
      zIndex: 1000,
      background: usiuColors.lightBlue,
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      width: '300px',
      color: usiuColors.darkGray,
    },
  };

  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [map, setMap] = useState(null);
  //const [travelMode, setTravelMode] = useState('foot');
  const [parkingLots, setParkingLots] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(''); // was null
  const [floors, setFloors] = useState([]);
  const [routeInstructions, setRouteInstructions] = useState([]);
  const routeLayerRef = useRef(null);
  const [destinationInput, setDestinationInput] = useState('');
  const [parkingSessions, setParkingSessions] = useState({});
  const [voiceEnabled, setVoiceEnabled] = useState(false); // Default to off
  const [userPosition, setUserPosition] = useState(null);
  const watchIdRef = useRef(null);
  const spokenStepIndexRef = useRef(-1);
  const [mapBounds, setMapBounds] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [useReservedMap, setUseReservedMap] = useState({});
  const [appMode, setAppMode] = useState('intro'); // intro | active
  const [travelMode, setTravelMode] = useState('foot'); // was null
  const [geoLoading, setGeoLoading] = useState(false); // Loading indicator for geolocation
  const [geoError, setGeoError] = useState(null);      // Error state for geolocation

  

  // Helper to display API messages
  const showApiMessage = (data) => {
    if (data.error) alert(`Error: ${data.error}`);
    else if (data.warning) alert(`Warning: ${data.warning}`);
    else if (data.info) alert(`Info: ${data.info}`);
    else if (data.success) alert(`Success: ${data.success}`);
    else if (data.message) alert(data.message);
  };
  useEffect(() => {
    const existing = localStorage.getItem('anon_device_id');
    if (!existing) {
      const newId = crypto.randomUUID();
      localStorage.setItem('anon_device_id', newId);
    }
  }, []);
  useEffect(() => {
  const saved = localStorage.getItem('parking_sessions');
  if (saved) {
    setParkingSessions(JSON.parse(saved));
  }
}, []);
useEffect(() => {
  const id = getDeviceId();
  api.get(`/parking/active-sessions/?device_id=${id}`).then(res => {
    const sessionMap = {};
    res.data.forEach(s => sessionMap[s.parking_lot] = s.session_id);
    setParkingSessions(sessionMap);
  });
}, []);

useEffect(() => {
  localStorage.setItem('parking_sessions', JSON.stringify(parkingSessions));
}, [parkingSessions]);

  const handleRegister = async (lotId, reserved = false) => {
    const deviceId = getDeviceId();
    if (parkingSessions[lotId]) {
      return alert("Already registered for this parking lot");
    }

    try {
      const res = await api.post(`/parking/register/${lotId}/`, {
        device_id: deviceId,
        reserved: reserved
      });

      showApiMessage(res.data);

      if (res.data.session_id) {
        setParkingSessions(prev => ({ ...prev, [lotId]: res.data.session_id }));

        setParkingLots(prevLots => prevLots.map(lot => {
          if (lot.id === lotId) {
            return {
              ...lot,
              properties: {
                ...lot.properties,
                available_slots: res.data.remaining
              }
            };
          }
          return lot;
        }));
      } else {
        alert("No session ID returned from server");
      }

    } catch (err) {
      console.error("Registration error:", err);
      const errorMsg = err.response?.data?.error || "Failed to register for parking";
      alert(errorMsg);
    }
  };
  const handleDeregister = async (lotId, reserved = false) => {
    const deviceId = getDeviceId();
    const sessionId = parkingSessions[lotId];
    if (!sessionId) return alert("No session to deregister");

    try {
      const res = await api.post(`/parking/deregister/${lotId}/`, {
        session_id: sessionId,
        device_id: deviceId,
        reserved: reserved
      });

      showApiMessage(res.data);

      setParkingLots(prevLots => prevLots.map(lot => {
        if (lot.id === lotId) {
          return {
            ...lot,
            properties: {
              ...lot.properties,
              available_slots: res.data.available
            }
          };
        }
        return lot;
      }));

      setParkingSessions(prev => {
        const updated = { ...prev };
        delete updated[lotId];
        return updated;
      });

    } catch (err) {
      console.error("Deregistration error:", err);
      const errorMsg = err.response?.data?.error || "Failed to deregister from parking";
      alert(errorMsg);
    }
  };

  useEffect(() => {
    // This sets the cookie named `csrftoken`
    api.get('/get-csrf-token/')
      .then(() => console.log('CSRF cookie set'))
      .catch((err) => console.error('Failed to set CSRF cookie', err));
  }, []);
    

  useEffect(() => {
    const fetchDataAndSetBounds = async () => {
      try {
        const [buildingsRes, roomsRes, parkingLotsRes] = await Promise.all([
          api.get('/buildings/'),
          api.get('/rooms/'),
          api.get('/parking-lots/'),
        ]);

        const buildingsData = buildingsRes.data.features;
        const roomsData = roomsRes.data.features;
        const parkingLotsData = parkingLotsRes.data.features;

        setBuildings(buildingsData);
        setRooms(roomsData);
        setParkingLots(parkingLotsData);

        const allFeatures = [...buildingsData, ...parkingLotsData];
        if (allFeatures.length > 0) {
          const bounds = L.latLngBounds();
          allFeatures.forEach(feature => {
            if (!feature.geometry) return;

            const type = feature.geometry.type;
            const coords = feature.geometry.coordinates;

            if (type === 'Point') {
              bounds.extend([coords[1], coords[0]]); // lat, lng
            } else if (type === 'Polygon') {
              coords[0].forEach(([lng, lat]) => bounds.extend([lat, lng]));
            } else if (type === 'MultiPolygon') {
              coords.forEach(polygon => polygon[0].forEach(([lng, lat]) => bounds.extend([lat, lng])));
            }
          });

          if (bounds.isValid()) {
            setMapBounds(bounds.pad(0.05)); // Add 5% padding
          }
        }
      } catch (error) {
        console.error("Error fetching initial map data:", error);
      }
    };
    fetchDataAndSetBounds();
  }, []);

  useEffect(() => {
    if (!map || !start || !end) return;

    const profile = travelMode === 'foot' ? 'foot-walking' : 'driving-car';
  
    api.post(`/ors-proxy/?profile=${profile}`, {
      coordinates: [
        [start.lng, start.lat],
        [end.lng, end.lat]
      ]
    })
    .then(res => {
      // Remove previous layer
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }

      // Add route layer
      const routeLayer = L.geoJSON(res.data, {
        style: {
          color: usiuColors.yellow,
          weight: 5,
        }
      }).addTo(map);

      routeLayerRef.current = routeLayer;
      map.fitBounds(routeLayer.getBounds());

      // Parse route instructions
      const allSteps = res.data.features[0].properties.segments.flatMap(segment => segment.steps);

      // Assign a unique ID for tracking
      allSteps.forEach((step, index) => { step.id = index; });

      setRouteInstructions(allSteps);
      setRouteCoords(res.data.features[0].geometry.coordinates);
    })
    .catch(err => {
      console.error('ORS routing error:', err);
      alert('Failed to fetch directions');
    });
    
    return () => {
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
    };
    
  }, [map, start, end, travelMode]);

  // Effect for voice guidance and live tracking
  useEffect(() => {
    if (!voiceEnabled || routeInstructions.length === 0) {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    spokenStepIndexRef.current = -1; // Reset for new route

    const handlePositionUpdate = (position) => {
      const { latitude, longitude } = position.coords;
      const nextStepIndex = spokenStepIndexRef.current + 1;

      if (nextStepIndex >= routeInstructions.length) return;

      const nextStep = routeInstructions[nextStepIndex];
      const stepCoordIndex = nextStep.way_points[0];
      const [lon, lat] = routeCoords[stepCoordIndex];

      const distance = getDistance(latitude, longitude, lat, lon);

      if (distance < 20) { // Proximity threshold: 20 meters
        speak(nextStep.instruction);
        spokenStepIndexRef.current = nextStepIndex;
      }
    };

    const handleError = (err) => console.error('Live tracking failed:', err);

    watchIdRef.current = navigator.geolocation.watchPosition(handlePositionUpdate, handleError, { enableHighAccuracy: true });

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [voiceEnabled, routeInstructions, routeCoords]);

  const handleMapClick = (e) => {
    if (!start) setStart(e.latlng);
    else if (!end) setEnd(e.latlng);
  };

  function MapClickHandler() {
    useMapEvents({ click: handleMapClick });
    return null;
  }
  const getUserLocation = (isRetry = false) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const handleSuccess = (position) => {
      const { latitude, longitude } = position.coords;
      const latlng = L.latLng(latitude, longitude);
      setUserPosition(latlng);
      setStart(latlng);
      map && map.setView(latlng, 18);
      setGeoLoading(false);
      setGeoError(null);
      // Persist last known good location
      localStorage.setItem('last_known_location', JSON.stringify({ lat: latitude, lng: longitude }));
    };

    const handleError = (error) => {
      setGeoLoading(false);
      setGeoError(error);
      let message = '';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location permission denied. Please enable location access in your browser settings.';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Location information is unavailable. Try moving to an open area or check your network.';
          break;
        case error.TIMEOUT:
          message = 'Location request timed out. Please try again.';
          break;
        default:
          message = 'Unable to retrieve your location. Please try again.';
      }
      alert(message);
      // Fallback: try getCurrentPosition if watchPosition fails (only on first attempt)
      if (!isRetry) {
        navigator.geolocation.getCurrentPosition(handleSuccess, (err) => {
          // Fallback to last known good location if available
          const last = localStorage.getItem('last_known_location');
          if (last) {
            const { lat, lng } = JSON.parse(last);
            const latlng = L.latLng(lat, lng);
            setUserPosition(latlng);
            setStart(latlng);
            map && map.setView(latlng, 18);
            alert('Using last known location.');
          } else {
            alert('No previous location available.');
          }
        }, options);
      }
    };

    navigator.geolocation.watchPosition(handleSuccess, handleError, options);
  };
  const handleDestinationSelect = (name) => {
    const searchTerm = name.toLowerCase();

    // Priority 1: Search for a room
    const roomMatch = rooms.find(r =>
      r.properties.name?.toLowerCase() === searchTerm && r.geometry.type === 'Point'
    );

    if (roomMatch) {
      const [lng, lat] = roomMatch.geometry.coordinates;
      setEnd(L.latLng(lat, lng));
      // Do NOT show the building/floor/room dropdown when searching by room name
      setSelectedBuilding(null);
      setSelectedFloor('');
      return;
    }

    // Priority 2: Search for buildings and parking lots
    const otherTargets = travelMode === 'car'
      ? [...buildings, ...parkingLots]
      : buildings;

    const match = otherTargets.find(f =>
      f?.properties?.name?.toLowerCase() === searchTerm
    );

    if (!match || !match.geometry) {
      alert('Location not found or missing geometry');
      return;
    }

    let lat, lng;
    const { type, coordinates } = match.geometry;

    if (type === 'Point') {
      [lng, lat] = coordinates;
    } else if (type === 'Polygon') {
      const coords = coordinates[0]; // outer ring
      const bounds = L.latLngBounds(coords.map(([x, y]) => [y, x]));
      const center = bounds.getCenter();
      lat = center.lat;
      lng = center.lng;
    } else if (type === 'MultiPolygon') {
      const coords = coordinates[0][0]; // first outer ring
      const bounds = L.latLngBounds(coords.map(([x, y]) => [y, x]));
      const center = bounds.getCenter();
      lat = center.lat;
      lng = center.lng;
    }

    if (lat && lng) {
      setEnd(L.latLng(lat, lng));
    } else {
      alert('Unsupported geometry type or coordinates');
    }
  };
  return (
    <>
      {/* Travel Options */}
      <div style={{ ...styles.panel, top: 10, right: 10 }}>
        <button onClick={() => getUserLocation(false)} style={styles.button} disabled={geoLoading}>
          {geoLoading ? 'Locating...' : 'Use My Location'}
        </button>
        {geoError && (
          <div style={{ color: 'red', margin: '5px 0' }}>
            {(() => {
              switch (geoError.code) {
                case geoError.PERMISSION_DENIED:
                  return 'Permission denied.';
                case geoError.POSITION_UNAVAILABLE:
                  return 'Position unavailable.';
                case geoError.TIMEOUT:
                  return 'Request timed out.';
                default:
                  return 'Location error.';
              }
            })()}
            <button style={{ ...styles.button, backgroundColor: '#e67e22', marginTop: 5 }} onClick={() => getUserLocation(true)}>
              Retry
            </button>
          </div>
        )}
        <input
          type="text"
          placeholder="Search destination"
          value={destinationInput}
          style={styles.input}
          onChange={(e) => setDestinationInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Clear previous route and destination
              setEnd(null);
              setRouteInstructions([]);
              speechSynthesis.cancel();
              handleDestinationSelect(destinationInput);
            }
          }}
          list="destination-options"
        />

        <datalist id="destination-options">
          {buildings.map(b => (
            <option key={`b-${b.id}`} value={b.properties.name} />
          ))}
          {rooms
            .filter(r => r.properties.name) // Only show rooms with names
            .map(r => (
              <option key={`r-${r.id}`} value={r.properties.name} />
            ))}
          {travelMode === 'car' &&
            parkingLots.map(p => (
              <option key={`p-${p.id}`} value={p.properties.name} />
            ))}
        </datalist>
        <button style={{...styles.button, backgroundColor: '#c0392b'}} onClick={() => {
          setStart(null);
          setEnd(null);
          setRouteInstructions([]);
          speechSynthesis.cancel(); // 🔇 stop ongoing voice
        }}>Clear</button>
        <div style={{ marginTop: '10px' }}>
          <label>
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
            />
            Enable Voice Guidance
          </label>
        </div>
        <div style={{ marginTop: '10px' }}>
          <label htmlFor="travelMode">Travel Mode: </label>
          <select
            id="travelMode"
            style={styles.select}
            value={travelMode === null ? '' : travelMode}
            onChange={(e) => setTravelMode(e.target.value)}
          >
            <option value="foot">Walking</option>
            <option value="car">Driving</option>
          </select>
        </div>
      </div>

      {/* Floor Selection */}
      {selectedBuilding && (
        <div style={{ ...styles.panel, top: 250, right: 10 }}>
          <strong>{selectedBuilding.properties.name}</strong><br />
          <label>Choose Floor: </label>
          <select style={styles.select} value={selectedFloor === null ? '' : selectedFloor} onChange={(e) => setSelectedFloor(parseInt(e.target.value))}>
            <option value="">Select</option>
            {floors.map(floor => (
              <option key={floor.id} value={floor.level}>Floor {floor.level}</option>
            ))}
          </select>
        </div>
      )}
      {selectedBuilding && selectedFloor !== '' && (
        <div style={{ ...styles.panel, top: 360, right: 10, maxHeight: '30vh', overflowY: 'auto' }}>
          <h4 style={{marginTop: 0}}>Rooms on Floor {selectedFloor}</h4>
          <ul style={{ maxHeight: '200px', overflowY: 'auto', padding: 0, listStyle: 'none' }}>
            {rooms
              .filter(r =>
                r.properties.floor__building_id === selectedBuilding.id &&
                r.properties.floor__level === selectedFloor)
              .map(r => (
                <li key={r.id} style={{ marginBottom: '5px' }}>
                  <button
                    onClick={() => {
                      const roomCoords = r.geometry.coordinates;
                      setEnd({ lat: roomCoords[1], lng: roomCoords[0] });
                    }}
                    style={{
                      ...styles.button,
                      backgroundColor: usiuColors.white,
                      color: usiuColors.darkGray,
                      textAlign: 'left'
                    }}
                  >
                    {r.properties.name}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
      {appMode === 'intro' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: usiuColors.royalBlue,
          color: usiuColors.white,
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '20px',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}>
          <h1 style={{ fontSize: '3em', marginBottom: '15px', color: usiuColors.yellow }}>Welcome to USIU-Africa</h1>
          <div style={{ maxWidth: '800px', margin: '0 auto 25px auto' }}>
            <p style={{ fontSize: '1.1em', lineHeight: '1.5' }}>
              Your smart guide to navigating the United States International University-Africa. Find buildings, Faculty offices, lecture halls, and available parking spots with real-time, voice-guided directions.
            </p>
            <p style={{ fontSize: '1.1em', lineHeight: '1.5', marginTop: '15px' }}>
              Our vibrant campus is home to several schools, fostering a diverse and dynamic learning environment:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '15px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', fontSize: '0.9em' }}>
              <li style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '8px 12px', borderRadius: '5px' }}>Chandaria School of Business</li>
              <li style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '8px 12px', borderRadius: '5px' }}>School of Science and Technology</li>
              <li style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '8px 12px', borderRadius: '5px' }}>School of Humanities &amp; Social Sciences</li>
              <li style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '8px 12px', borderRadius: '5px' }}>School of Communication, Cinematic &amp; Creative Arts</li>
              <li style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '8px 12px', borderRadius: '5px' }}>School of Pharmacy &amp; Health Sciences</li>
            </ul>
          </div>
          <p style={{ fontSize: '1.2em', marginBottom: '30px', fontWeight: 'bold' }}>To get started, how will you be moving around campus?</p>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={() => { setTravelMode('foot'); setAppMode('active'); }} style={{ ...styles.buttonYellow, padding: '15px 30px', fontSize: '1.2em' }}>
              🚶‍♂️ Walking
            </button>
            <button onClick={() => { setTravelMode('car'); setAppMode('active'); }} style={{ ...styles.buttonYellow, padding: '15px 30px', fontSize: '1.2em' }}>
              🚗 Driving
            </button>
          </div>
        </div>
      )}

      {appMode === 'active' && (
        <> 
          {/* Map Rendering */}
          <MapContainer
            center={[-1.219750072616673, 36.87837859438083]}
            zoom={18}
            minZoom={16}
            style={{ height: '100vh', width: '100%' }}
            ref={setMap}
            maxBounds={mapBounds}
            maxBoundsViscosity={1.0}
          >
            <MapClickHandler />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            {buildings.map(building => (
              <GeoJSON key={building.id} data={building}
                eventHandlers={{
                  click: () => {
                    setSelectedBuilding(building);
                    setSelectedFloor('');
                    api.get(`/floors/?building=${building.id}`).then(res => {
                      const floorsForBuilding = res.data.features
                        .filter(f => f.properties.building === building.id)
                        .map(f => ({
                          id: f.properties.id,
                          level: f.properties.level,
                          building: f.properties.building
                        }));
                      setFloors(floorsForBuilding);
                    }).catch(err => {
                      console.error("Failed to fetch floors:", err);
                      alert("Could not load floors.");
                    });
                  }
                }}
                style={{ color: usiuColors.royalBlue, weight: 2, fillOpacity: 0.1 }}
              />
            ))}
            {selectedBuilding && selectedFloor !== '' && (
              <>
                {/* Render Room Markers */}
                {rooms
                  .filter(room =>
                    room.geometry.type === 'Point' &&
                    room.properties.floor__building_id === selectedBuilding.id &&
                    room.properties.floor__level === selectedFloor)
                  .map(room => (
                    <Marker
                      key={room.id}
                      position={[room.geometry.coordinates[1], room.geometry.coordinates[0]]}
                    >
                      <Popup>
                        <strong>{room.properties.name}</strong><br />
                        Type: {room.properties.room_type}
                      </Popup>
                    </Marker>
                ))}

                {/* Render Internal Indoor Paths (LineString) */}
                {rooms
                  .filter(room =>
                    room.geometry.type === 'LineString' &&
                    room.properties.floor__building_id === selectedBuilding.id &&
                    room.properties.floor__level === selectedFloor)
                  .map(path => (
                    <GeoJSON
                      key={path.id}
                      data={path}
                      style={{ color: 'purple', weight: 3, dashArray: '5,5' }}
                    />
                ))}
              </>
            )}
            {parkingLots.map(lot => {
              const percentUsed = ((lot.properties.capacity - lot.properties.available_slots) / lot.properties.capacity) * 100;
              const color = percentUsed > 80 ? 'red' : percentUsed > 50 ? 'orange' : 'green';
              const useReserved = useReservedMap[lot.id] || false;

              return (
                <Marker
                  key={`parking-${lot.id}`}
                  position={[lot.geometry.coordinates[1], lot.geometry.coordinates[0]]}
                  icon={L.divIcon({
                    className: 'custom-icon',
                    html: `<div style="background-color:${color}; width:12px; height:12px; border-radius:50%;"></div>`,
                  })}
                >
                  <Popup>
                    <strong>{lot.properties.name}</strong><br />
                    Capacity: {lot.properties.capacity}<br />
                    Available: {lot.properties.available_slots}<br />
                    Reserved Slots: {lot.properties.reserved_slots}<br />

                    {/* Reserved Toggle */}
                    <label>
                      <input
                        type="checkbox"
                        checked={useReserved}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUseReservedMap(prev => ({
                            ...prev,
                            [lot.id]: checked
                          }));
                        }}
                      />
                      Use Reserved Slot
                    </label>
                    <br />

                    {/* Register/Deregister */}
                    {parkingSessions[lot.id] ? (
                      <button onClick={() => handleDeregister(lot.id, useReserved)}>Deregister</button>
                    ) : (
                      <button onClick={() => handleRegister(lot.id, useReserved)}>Register</button>
                    )}
                  </Popup>
                </Marker>
              );
            })}

            {userPosition && (
              <Marker position={userPosition} icon={userIcon}>
                <Popup>You are here</Popup>
              </Marker>
            )}

            {end && (
              <Marker position={end}>
                <Popup>Destination</Popup>
              </Marker>
            )}
          </MapContainer>
        </>
      )}
      {/* Route Instructions */}
      {routeInstructions.length > 0 && (
        <div style={{ ...styles.panel,
          bottom: 10,
          left: 10,
          maxHeight: '40vh',
          overflowY: 'auto',
        }}>
          <h4 style={{marginTop: 0, color: usiuColors.royalBlue}}>Directions</h4>
          <ol>
            {routeInstructions.map(step => (
              <li key={step.id} style={{ marginBottom: '8px' }}>
                {step.instruction}<br />
                <small>{step.distance.toFixed(1)} m, {Math.ceil(step.duration)} sec</small>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

export default App;