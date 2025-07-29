# USIU Smart Navigation

A full-stack web application designed to provide intelligent, real-time navigation across the United States International University-Africa (USIU-Africa) campus. This system helps students, staff, and visitors find buildings, lecture halls, amenities, and available parking with ease.

## Features

- **Interactive Campus Map**: A dynamic Leaflet map displaying buildings, parking lots, and amenities.
- **Outdoor Navigation**: Real-time, voice-guided walking and driving directions between any two points on campus, powered by OpenRouteService.
- **Indoor Navigation**: Floor-by-floor, room-to-room pathfinding within buildings, utilizing Dijkstra's algorithm.
- **Real-time Parking Management**: View available parking slots in real-time and virtually register/deregister your vehicle to occupy a slot.
- **Search Functionality**: Easily search for buildings, rooms, and amenities by name.
- **Responsive UI**: A user-friendly interface that works on both desktop and mobile devices.

## Tech Stack

### Backend
- **Framework**: Django & Django REST Framework
- **Geospatial**: GeoDjango, PostGIS
- **Routing**: NetworkX (for indoor graphs), OpenRouteService (for outdoor paths)
- **Database**: PostgreSQL
- **API**: RESTful API with GeoJSON support

### Frontend
- **Library**: React.js
- **Mapping**: Leaflet, React-Leaflet
- **Routing Display**: leaflet-routing-machine
- **State Management**: React Hooks

## Getting Started

Follow these instructions to get a local copy of the project up and running for development and testing purposes.

### Prerequisites

- **Python** (3.8+)
- **Node.js** & **npm**
- **PostgreSQL** with **PostGIS** extension

### Backend Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/mwanyambu/UsiuSmartNavigation.git
    cd UsiuSmartNavigation/backend
    ```

2.  **Create and activate a virtual environment:**
    ```sh
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install Python dependencies:**
    ```sh
    pip install -r requirements.txt
    ```

4.  **Set up the database:**
    - Make sure PostgreSQL is running.
    - Create a new database and enable the PostGIS extension.
    ```sql
    -- In your psql shell:
    CREATE DATABASE usiu_nav_db;
    \c usiu_nav_db
    CREATE EXTENSION postgis;
    ```

5.  **Configure environment variables:**
    - Create a `.env` file in the `backend/usiu_smart_nav/` directory.
    - Add the necessary environment variables.
    ```env
    # .env
    SECRET_KEY='your-django-secret-key'
    DEBUG=True
    DATABASE_URL='postgres://USER:PASSWORD@HOST:PORT/usiu_nav_db'
    ORS_API_KEY='your-openrouteservice-api-key'
    ```

6.  **Run database migrations:**
    ```sh
    python manage.py migrate
    ```

7.  **Run the backend server:**
    ```sh
    python manage.py runserver
    ```
    The backend API will be available at `http://127.0.0.1:8000/api/`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```sh
    cd ../frontend
    ```

2.  **Install npm packages:**
    ```sh
    npm install
    ```

3.  **Configure the proxy:**
    - The `package.json` file should have a proxy entry to redirect API requests to the backend.
    ```json
    "proxy": "http://127.0.0.1:8000"
    ```

4.  **Start the frontend development server:**
    ```sh
    npm start
    ```
    The application will be available at `http://localhost:3000`.

## API Endpoints

The following are the primary API endpoints provided by the backend:

- `GET /api/buildings/`: List all campus buildings.
- `GET /api/rooms/`: List all rooms.
- `GET /api/amenities/`: List all amenities (searchable via `?search=...`).
- `GET /api/parking-lots/`: List all parking lots with real-time availability.
- `POST /api/ors-proxy/`: Proxy for outdoor route generation.
- `GET /api/indoor-path/dijkstra/?start=<node_id>&end=<node_id>`: Get an indoor navigation path.
- `POST /api/parking/register/{id}/`: Register a vehicle at a parking lot.
- `POST /api/parking/deregister/{id}/`: Deregister a vehicle from a parking lot.

## Project Structure

```
UsiuSmartNavigation/
├── backend/
│   ├── usiu_smart_nav/   # Django project
│   ├── core/             # Main Django app
│   ├── manage.py
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── public/
│   ├── src/              # React source code
│   └── package.json      # Node.js dependencies
└── README.md
```
