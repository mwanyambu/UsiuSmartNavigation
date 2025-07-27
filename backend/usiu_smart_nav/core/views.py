from rest_framework import generics
import requests
from rest_framework.response import Response
from rest_framework import status
from .models import Location, Amenity, ParkingLot, Building, Floor, Room, ParkingSession
from .serializers import LocationSerializer, AmenitySerializer, ParkingLotSerializer, BuildingSerializer, FloorSerializer, RoomSerializer, ParkingSessionSerializer
from django.db import transaction
from django.db.models import F
from rest_framework.decorators import api_view
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.request import Request
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.permissions import AllowAny
from django_ratelimit.decorators import ratelimit
import uuid

class LocationList(generics.ListAPIView):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer


class AmenityList(generics.ListAPIView):
    queryset = Amenity.objects.all()
    serializer_class = AmenitySerializer

class ParkingLotList(generics.ListAPIView):
    queryset = ParkingLot.objects.all()
    serializer_class = ParkingLotSerializer

class BuildingList(generics.ListAPIView):
    queryset = Building.objects.all()
    serializer_class = BuildingSerializer

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        print(response.data)
        return response

class FloorList(generics.ListAPIView):
    queryset = Floor.objects.all()
    serializer_class = FloorSerializer

class RoomList(generics.ListAPIView):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

@method_decorator(csrf_exempt, name='dispatch')
class ORSProxyView(APIView):
    """
    A secure proxy to call OpenRouteService directions API without CORS issues.
    """
    # Allow any user (authenticated or not) to access this view.
    # This bypasses Django REST Framework's default permission checks.
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        print("🚨 ORS Proxy endpoint hit")
        profile = request.query_params.get('profile', 'foot-walking')
        ors_url = f'https://api.openrouteservice.org/v2/directions/{profile}/geojson'

        api_key = getattr(settings, 'ORS_API_KEY', None)
        if not api_key:
            return Response({'error': 'ORS API key not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            headers = {
                'Authorization': api_key,
                'Content-Type': 'application/json',
            }
            ors_response = requests.post(ors_url, headers=headers, json=request.data)
            return Response(ors_response.json(), status=ors_response.status_code)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    View to set the CSRF cookie on the client.
    This is called by the frontend on startup.
    """
    return Response({"detail": "CSRF cookie set"})

@api_view(['GET'])
def active_sessions(request):
    try:
        device_id = uuid.UUID(request.query_params.get("device_id"))
    except (ValueError, TypeError):
        return Response({'error': 'Invalid or missing device ID'}, status=400)

    sessions = ParkingSession.objects.filter(device_id=device_id, end_time__isnull=True)
    serializer = ParkingSessionSerializer(sessions, many=True)
    return Response(serializer.data)


@ratelimit(key='ip', rate='5/m', block=True) # Limit to 5 registrations per minute per IP
@api_view(['POST'])
@transaction.atomic
def register_parking(request, pk): 
    device_id = request.data.get("device_id")
    use_reserved = request.data.get("reserved", False)
    if not device_id:
        return Response({'error': 'Device ID is required'}, status=400)
    
    try:
        device_id = uuid.UUID(device_id)
    except ValueError:
        return Response({'error': 'Invalid Device ID format'}, status=400)

    try:
        parking_lot = ParkingLot.objects.select_for_update().get(pk=pk)
    except ParkingLot.DoesNotExist:
        return Response({'error': 'Parking lot not found'}, status=404)

    if parking_lot.available_slots <= 0:
        return Response({'error': 'No available parking slots'}, status=400)

    if use_reserved:
        if parking_lot.reserved_slots <= 0:
            return Response({'error': 'No reserved slots available'}, status=400)
        parking_lot.reserved_slots -= 1
    else:
        if parking_lot.available_slots <= 0:
            return Response({'error': 'No general slots available'}, status=400)
        parking_lot.available_slots -= 1

    parking_lot.save()

    # Check if the device has any active session across all parking lots.
    any_active_session = ParkingSession.objects.filter(
        device_id=device_id,
        end_time__isnull=True
    ).select_related('parking_lot').first()

    if any_active_session:
        return Response({'error': f'You are already registered at another parking lot: "{any_active_session.parking_lot.name}". Please deregister first.'}, status=status.HTTP_409_CONFLICT)

    session = ParkingSession.objects.create(
        device_id=device_id,
        parking_lot=parking_lot
    )

    # Atomically decrement the slot count and refresh the object to get the new value
    ParkingLot.objects.filter(pk=pk).update(available_slots=F('available_slots') - 1)
    parking_lot.refresh_from_db()

    return Response({
        'message': f'Registered at {parking_lot.name}',
        'session_id': str(session.session_id),
        'remaining': parking_lot.available_slots
    }, status=200)
    
  
    
@ratelimit(key='ip', rate='5/m', block=True) # Limit to 5 deregistrations per minute per IP
@api_view(['POST'])
@transaction.atomic
def deregister_parking(request, pk):
    device_id = request.data.get("device_id")
    session_id = request.data.get("session_id")

    if not device_id or not session_id:
        return Response({'error': 'Device ID and Session ID are required'}, status=400)
    
    try:
        device_id = uuid.UUID(device_id)
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        return Response({'error': 'Invalid UUID format'}, status=400)

    try:
        session = ParkingSession.objects.select_for_update().get(
            session_id=session_uuid,
            parking_lot_id=pk,
            device_id=device_id,
            end_time__isnull=True
        )
    except ParkingSession.DoesNotExist:
        return Response({'error': 'Session not found or already ended'}, status=404)

    session.end_time = timezone.now()
    session.save()

    parking_lot = session.parking_lot
    # Atomically increment the slot count and refresh the object to get the new value
    ParkingLot.objects.filter(pk=parking_lot.pk).update(available_slots=F('available_slots') + 1)
    parking_lot.refresh_from_db()

    return Response({
        'message': f'Deregistered from {parking_lot.name}',
        'available': parking_lot.available_slots
    }, status=200)