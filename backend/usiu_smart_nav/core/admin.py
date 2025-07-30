from django.contrib.gis import admin
from leaflet.admin import LeafletGeoAdmin
from .models import Building, Room, ParkingLot, Location, Amenity, Floor, PathNode, PathEdge, ParkingSession, EntryPoint


class EntryPointInline(admin.TabularInline):
    model = EntryPoint
    extra = 1
    fields = ('name', 'entry_type', 'is_main', 'is_accessible', 'is_24_7', 'opening_hours')


@admin.register(Building)
class BuildingAdmin(LeafletGeoAdmin):
    list_display = ('id', 'name', 'entry_count')
    inlines = [EntryPointInline]
    
    def entry_count(self, obj):
        return obj.entry_points.count()
    entry_count.short_description = 'Entry Points'


@admin.register(EntryPoint)
class EntryPointAdmin(LeafletGeoAdmin):
    list_display = ('id', 'building', 'name', 'entry_type', 'is_main', 'is_accessible', 'is_24_7')
    list_filter = ('entry_type', 'is_main', 'is_accessible', 'is_24_7', 'building')
    search_fields = ('name', 'building__name')
    fieldsets = (
        ('Basic Information', {
            'fields': ('building', 'name', 'entry_type', 'geom')
        }),
        ('Access Settings', {
            'fields': ('is_main', 'is_accessible', 'is_24_7', 'opening_hours')
        }),
        ('Additional Details', {
            'fields': ('description',),
            'classes': ('collapse',)
        })
    )

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