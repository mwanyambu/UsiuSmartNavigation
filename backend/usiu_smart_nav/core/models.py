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
