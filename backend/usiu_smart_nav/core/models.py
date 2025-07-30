from django.contrib.gis.db import models
import uuid
from django.utils import timezone
from django.db.models import Q, UniqueConstraint

class Location(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    geom = models.PointField()

    def __str__(self):
        return self.name

class Amenity(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    geom = models.PointField()

    def __str__(self):
        return self.name

class ParkingLot(models.Model):
    name = models.CharField(max_length=100)
    capacity = models.IntegerField()
    available_slots = models.IntegerField()
    reserved_slots = models.PositiveIntegerField(default=0)
    geom = models.PointField()

    def __str__(self):
        return self.name

class Building(models.Model):
    name = models.CharField(max_length=100)
    geom = models.PolygonField()

    def __str__(self):
        return self.name

    @property
    def main_entry_point(self):
        """Get the main entry point for this building"""
        main_entry = self.entry_points.filter(is_main=True).first()
        if main_entry:
            return main_entry.geom
        # Fallback to building centroid if no entry points defined
        return self.geom.centroid

class EntryPoint(models.Model):
    """Precise entry points for buildings"""
    ENTRY_TYPES = [
        ('main', 'Main Entrance'),
        ('side', 'Side Entrance'),
        ('back', 'Back Entrance'),
        ('emergency', 'Emergency Exit'),
        ('service', 'Service Entrance'),
        ('accessible', 'Accessible Entrance'),
    ]
    
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='entry_points')
    name = models.CharField(max_length=100, help_text="e.g., 'Main Entrance', 'North Door'")
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPES, default='main')
    geom = models.PointField(help_text="Precise coordinates of the entry point")
    is_main = models.BooleanField(default=False, help_text="Is this the main entrance?")
    is_accessible = models.BooleanField(default=True, help_text="Is this entrance wheelchair accessible?")
    is_24_7 = models.BooleanField(default=True, help_text="Is this entrance available 24/7?")
    opening_hours = models.CharField(max_length=100, blank=True, help_text="e.g., '08:00-17:00' if not 24/7")
    description = models.TextField(blank=True, help_text="Additional details about this entrance")
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['building'], 
                condition=models.Q(is_main=True),
                name='unique_main_entrance_per_building'
            )
        ]
    
    def __str__(self):
        return f"{self.building.name} - {self.name}"

class Floor(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE)
    level = models.IntegerField()

    def __str__(self):
        return f"{self.building.name} - Floor {self.level}"

class Room(models.Model):
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    room_type = models.CharField(max_length=50)  # e.g., 'classroom', 'office'
    geom = models.PointField()

    def __str__(self):
        return self.name

class ParkingSession(models.Model):
    session_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    parking_lot = models.ForeignKey(ParkingLot, on_delete=models.CASCADE)
    device_id = models.UUIDField(default=uuid.UUID('00000000-0000-0000-0000-000000000000'))
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True, blank=True)
    used_reserved_slot = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['device_id', 'parking_lot'])
        ]
        constraints = [
            UniqueConstraint(
                fields=['device_id'],
                condition=Q(end_time__isnull=True),
                name='unique_active_parking_session_per_device'
            )
        ]

    def __str__(self):
        return f"{self.parking_lot.name} - {self.session_id}"

class PathNode(models.Model):
    room = models.OneToOneField(Room, on_delete=models.CASCADE, null=True, blank=True, related_name='path_node')
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name='path_nodes')
    node_type = models.CharField(max_length=50, choices=[('room', 'Room'), ('hallway', 'Hallway'), ('stairs', 'Stairs'), ('elevator', 'Elevator')])
    geom = models.PointField()

    def __str__(self):
        if self.room:
            return f'Node for Room: {self.room.name} on {self.floor}'
        return f'Node {self.id} ({self.get_node_type_display()}) on {self.floor}'

class PathEdge(models.Model):
    start_node = models.ForeignKey(PathNode, on_delete=models.CASCADE, related_name='outgoing_edges')
    end_node = models.ForeignKey(PathNode, on_delete=models.CASCADE, related_name='incoming_edges')
    distance = models.FloatField(help_text='Distance in meters')

    def __str__(self):
        return f'Edge from Node {self.start_node.id} to Node {self.end_node.id}'
