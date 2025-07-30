from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Location, Amenity, ParkingLot, Building, Floor, Room, ParkingSession, EntryPoint
from rest_framework import serializers

class LocationSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Location
        geo_field = "geom"
        fields = ('id', 'name', 'description')

class AmenitySerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Amenity
        geo_field = "geom"
        fields = ('id', 'name', 'description')

class ParkingLotSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = ParkingLot
        geo_field = "geom"
        fields = ('id', 'name', 'capacity', 'available_slots', 'reserved_slots')

class BuildingSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Building
        geo_field = "geom"
        fields = ('id', 'name', 'geom')

class FloorSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Floor
        geo_field = None
        fields = ('id', 'level', 'building')

class RoomSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Room
        geo_field = "geom"
        fields = ('id', 'name', 'room_type', 'floor')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Inject nested fields into the GeoJSON "properties"
        data['properties']['floor__level'] = instance.floor.level
        data['properties']['floor__building_id'] = instance.floor.building.id
        return data

class ParkingSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingSession
        fields = ('session_id', 'parking_lot', 'device_id', 'start_time', 'end_time')


class EntryPointSerializer(GeoFeatureModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)
    
    class Meta:
        model = EntryPoint
        geo_field = "geom"
        fields = ('id', 'building', 'building_name', 'name', 'entry_type', 'is_main', 
                 'is_accessible', 'is_24_7', 'opening_hours', 'description')