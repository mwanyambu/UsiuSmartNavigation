from django.contrib.gis import admin
from leaflet.admin import LeafletGeoAdmin
from .models import Building, Room, ParkingLot, Location, Amenity, Floor, PathNode, PathEdge, ParkingSession


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


@admin.register(PathNode)
class PathNodeAdmin(LeafletGeoAdmin):  # 👈 Use Leaflet for map input
    list_display = ('id', 'room', 'floor', 'node_type', 'geom')
    list_filter = ('floor', 'node_type')
    search_fields = ('room__name', 'floor__building__name',)
    raw_id_fields = ('room',)

@admin.register(PathEdge)
class PathEdgeAdmin(admin.ModelAdmin):  # No need for map widget; FK fields
    list_display = ('id', 'start_node', 'end_node', 'distance')
    search_fields = ('start_node__id', 'end_node__id')

    # Optional: auto-calculate distance
    def save_model(self, request, obj, form, change):
        if not obj.distance:
            obj.distance = obj.start_node.geom.distance(obj.end_node.geom)
        obj.save()

@admin.register(ParkingSession)
class ParkingSessionAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'parking_lot', 'device_id', 'start_time', 'end_time')
    list_filter = ('parking_lot', 'start_time', 'end_time')
    search_fields = ('device_id', 'parking_lot__name', 'session_id')
    readonly_fields = ('session_id', 'start_time')