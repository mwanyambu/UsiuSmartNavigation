import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

test('renders welcome message on intro screen', () => {
  render(<App />);
  const heading = screen.getByText(/Welcome to USIU Smart Navigation/i);
  expect(heading).toBeInTheDocument();
});

test('switches to active mode when travel option selected', () => {
  render(<App />);
  const walkBtn = screen.getByText(/Walking/i);
  fireEvent.click(walkBtn);
  const map = screen.queryByTestId("map-container");
  expect(map).toBeInTheDocument();
});

test('shows loading text or error when indoor path fails', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "No path found" }),
    })
  );
  render(<App />);
  fireEvent.click(screen.getByText(/Walking/i));
  // logic to simulate selecting nodes if applicable
});

test('shows error message when no path found', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "No path found" }),
    })
  );
  render(<App />);
  fireEvent.click(screen.getByText(/Walking/i));
  const errorMessage = await screen.findByText(/No path found/i);
  expect(errorMessage).toBeInTheDocument();
});

test('shows error message when API call fails', async () => {
  global.fetch = jest.fn(() =>
    Promise.reject(new Error("API call failed"))
  );
  render(<App />);
  fireEvent.click(screen.getByText(/Walking/i));
  const errorMessage = await screen.findByText(/API call failed/i);
  expect(errorMessage).toBeInTheDocument();
});

test('loads map with correct initial state', () => {
  render(<App />);
  const map = screen.getByTestId("map-container");
  expect(map).toBeInTheDocument();
  // Additional checks for initial map state can be added here
});

test('handles user input for start and end nodes', () => {
  render(<App />);
  const startInput = screen.getByPlaceholderText(/Start Node/i);
  const endInput = screen.getByPlaceholderText(/End Node/i);
  
  fireEvent.change(startInput, { target: { value: 'Node A' } });
  fireEvent.change(endInput, { target: { value: 'Node B' } });
  
  expect(startInput.value).toBe('Node A');
  expect(endInput.value).toBe('Node B');
});

test('locates user on map', () => {
  render(<App />);
  const locateBtn = screen.getByText(/Locate Me/i);
  fireEvent.click(locateBtn);
  
  // Assuming the map updates to show user location
  const userLocation = screen.getByTestId("user-location");
  expect(userLocation).toBeInTheDocument();
});

test('use my location button works', () => {
  render(<App />);
  const useMyLocationBtn = screen.getByText(/Use My Location/i);
  fireEvent.click(useMyLocationBtn);
  
  // Assuming the map updates to show user location
  const userLocation = screen.getByTestId("user-location");
  expect(userLocation).toBeInTheDocument();
});

test('room search functionality', () => {
  render(<App />);
  const searchInput = screen.getByPlaceholderText(/Search for a room/i);
  fireEvent.change(searchInput, { target: { value: 'Room 101' } });
  
  const searchBtn = screen.getByText(/Search/i);
  fireEvent.click(searchBtn);
  
  const result = screen.getByText(/Room 101/i);
  expect(result).toBeInTheDocument();
});

test('handles invalid room search gracefully', () => {
  render(<App />);
  const searchInput = screen.getByPlaceholderText(/Search for a room/i);
  fireEvent.change(searchInput, { target: { value: 'Invalid Room' } });
  
  const searchBtn = screen.getByText(/Search/i);
  fireEvent.click(searchBtn);
  
  const errorMessage = screen.getByText(/Room not found/i);
  expect(errorMessage).toBeInTheDocument();
});

test('floor selection works', () => {
  render(<App />);
  const floorSelect = screen.getByLabelText(/Select Floor/i);
  fireEvent.change(floorSelect, { target: { value: '2' } });
  
  expect(floorSelect.value).toBe('2');
  
  // Assuming the map updates to show the selected floor
  const floorMap = screen.getByTestId("floor-2-map");
  expect(floorMap).toBeInTheDocument();
});

test('handles invalid floor selection gracefully', () => {
  render(<App />);
  const floorSelect = screen.getByLabelText(/Select Floor/i);
  fireEvent.change(floorSelect, { target: { value: 'Invalid' } });
  
  const errorMessage = screen.getByText(/Invalid floor selected/i);
  expect(errorMessage).toBeInTheDocument();
});

test('route selection works', () => {
  render(<App />);
  const routeSelect = screen.getByLabelText(/Select Route/i);
  fireEvent.change(routeSelect, { target: { value: 'Route A' } });
  
  expect(routeSelect.value).toBe('Route A');
  
  // Assuming the map updates to show the selected route
  const routeMap = screen.getByTestId("route-a-map");
  expect(routeMap).toBeInTheDocument();
});
test('handles invalid route selection gracefully', () => {
  render(<App />);
  const routeSelect = screen.getByLabelText(/Select Route/i);
  fireEvent.change(routeSelect, { target: { value: 'Invalid' } });
  
  const errorMessage = screen.getByText(/Invalid route selected/i);
  expect(errorMessage).toBeInTheDocument();
});

test('handles API errors gracefully', async () => {
  global.fetch = jest.fn(() =>
    Promise.reject(new Error("Network error"))
  );
  render(<App />);
  
  fireEvent.click(screen.getByText(/Walking/i));
  
  const errorMessage = await screen.findByText(/Network error/i);
  expect(errorMessage).toBeInTheDocument();
});

test('handles empty path response gracefully', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ path: [] }),
    })
  );
  render(<App />);
  
  fireEvent.click(screen.getByText(/Walking/i));
  
  const errorMessage = await screen.findByText(/No path found/i);
  expect(errorMessage).toBeInTheDocument();
});
