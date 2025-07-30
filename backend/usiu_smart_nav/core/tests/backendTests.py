import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from core.models import PathNode, PathEdge, Room, ParkingLot, ParkingSession
from django.contrib.auth.models import User
from django.utils import timezone
import uuid

client = APIClient()

@pytest.mark.django_db
def test_building_list():
    response = client.get('/api/buildings/')
    assert response.status_code == 200

@pytest.mark.django_db
def test_room_list():
    response = client.get('/api/rooms/')
    assert response.status_code == 200

@pytest.mark.django_db
def test_floor_list():
    response = client.get('/api/floors/')
    assert response.status_code == 200

@pytest.mark.django_db
def test_dijkstra_path_not_found():
    response = client.get('/api/indoor-path/dijkstra/?start=999&end=9999')
    assert response.status_code == 404

@pytest.mark.django_db
def test_csrf_token():
    response = client.get('/api/get-csrf-token/')
    assert response.status_code == 200
    assert "detail" in response.data

@pytest.mark.django_db
def test_indoor_path_graph():
    response = client.get('/api/indoor-path-graph/')
    assert response.status_code == 200
    assert "nodes" in response.data and "edges" in response.data

@pytest.mark.django_db
def test_register_and_deregister_parking():
    parking_lot = ParkingLot.objects.create(name="Test Lot", available_slots=5, reserved_slots=2)
    device_id = str(uuid.uuid4())

    reg_response = client.post(f'/api/parking/register/{parking_lot.id}/', data={
        "device_id": device_id,
        "reserved": False
    }, format='json')
    assert reg_response.status_code == 200
    session_id = reg_response.data['session_id']

    dereg_response = client.post(f'/api/parking/deregister/{parking_lot.id}/', data={
        "device_id": device_id,
        "session_id": session_id
    }, format='json')
    assert dereg_response.status_code == 200

    # Check if the parking session was created and then deleted
    assert ParkingSession.objects.filter(device_id=device_id, parking_lot=parking_lot).exists() is False

@pytest.mark.django_db
def test_parking_lot_list():
    response = client.get('/api/parking-lots/')
    assert response.status_code == 200
    assert isinstance(response.data, list)
    assert len(response.data) > 0


@pytest.mark.django_db
def test_parking_lot_detail():
    parking_lot = ParkingLot.objects.create(name="Test Lot", available_slots=5, reserved_slots=2)
    response = client.get(f'/api/parking-lots/{parking_lot.id}/')
    assert response.status_code == 200
    assert response.data['name'] == parking_lot.name
    assert response.data['available_slots'] == parking_lot.available_slots
    assert response.data['reserved_slots'] == parking_lot.reserved_slots

@pytest.mark.django_db
def test_parking_session_creation():
    parking_lot = ParkingLot.objects.create(name="Test Lot", available_slots=5, reserved_slots=2)
    device_id = str(uuid.uuid4())
    
    response = client.post(f'/api/parking/register/{parking_lot.id}/', data={
        "device_id": device_id,
        "reserved": False
    }, format='json')
    
    assert response.status_code == 200
    assert 'session_id' in response.data
    session_id = response.data['session_id']
    
    # Verify the session was created
    session = ParkingSession.objects.get(session_id=session_id)
    assert session.device_id == device_id
    assert session.parking_lot == parking_lot

@pytest.mark.django_db
def test_parking_session_deregistration():
    parking_lot = ParkingLot.objects.create(name="Test Lot", available_slots=5, reserved_slots=2)
    device_id = str(uuid.uuid4())
    
    reg_response = client.post(f'/api/parking/register/{parking_lot.id}/', data={
        "device_id": device_id,
        "reserved": False
    }, format='json')
    
    assert reg_response.status_code == 200
    session_id = reg_response.data['session_id']
    
    dereg_response = client.post(f'/api/parking/deregister/{parking_lot.id}/', data={
        "device_id": device_id,
        "session_id": session_id
    }, format='json')
    
    assert dereg_response.status_code == 200
    
    # Verify the session was deleted
    assert not ParkingSession.objects.filter(session_id=session_id).exists()

@pytest.mark.django_db
def test_parking_lot_availability():
    parking_lot = ParkingLot.objects.create(name="Test Lot", available_slots=5, reserved_slots=2)
    
    response = client.get(f'/api/parking-lots/{parking_lot.id}/availability/')
    assert response.status_code == 200
    assert response.data['available_slots'] == parking_lot.available_slots
    assert response.data['reserved_slots'] == parking_lot.reserved_slots

@pytest.mark.django_db
def test_room_detail():
    room = Room.objects.create(name="Test Room", floor=1, building="Test Building")
    response = client.get(f'/api/rooms/{room.id}/')
    assert response.status_code == 200
    assert response.data['name'] == room.name
    assert response.data['floor'] == room.floor
    assert response.data['building'] == room.building

@pytest.mark.django_db
def test_path_node_creation():
    node = PathNode.objects.create(name="Test Node", x=10, y=20, floor=1)
    assert node.name == "Test Node"
    assert node.x == 10
    assert node.y == 20
    assert node.floor == 1
    assert node.id is not None

@pytest.mark.django_db
def test_path_edge_creation():
    start_node = PathNode.objects.create(name="Start Node", x=0, y=0, floor=1)
    end_node = PathNode.objects.create(name="End Node", x=10, y=10, floor=1)
    edge = PathEdge.objects.create(start_node=start_node, end_node=end_node, weight=5)
    
    assert edge.start_node == start_node
    assert edge.end_node == end_node
    assert edge.weight == 5
    assert edge.id is not None

