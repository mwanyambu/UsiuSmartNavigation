from django.contrib.gis import admin
from leaflet.admin import LeafletGeoAdmin
from .models import Building, Room, ParkingLot, Location, Amenity, Floor

@admin.register(Building)
class BuildingAdmin(LeafletGeoAdmin):
    list_display = ('id', 'name')

@admin.register(Room)
class RoomAdmin(LeafletGeoAdmin):
    list_display = ('id', 'name', 'room_type', 'floor')

@admin.register(ParkingLot)
class ParkingLotAdmin(LeafletGeoAdmin):
    list_display = ('id', 'name', 'capacity', 'available_slots')

@admin.register(Location)
class LocationAdmin(LeafletGeoAdmin):
    pass

@admin.register(Amenity)
class AmenityAdmin(LeafletGeoAdmin):
    pass

@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ('id', 'building', 'level')
