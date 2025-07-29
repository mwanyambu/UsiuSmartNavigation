from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Room, PathNode
from .models import PathEdge
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import GEOSGeometry

@receiver(post_save, sender=Room)
def create_or_update_path_node_for_room(sender, instance, **kwargs):
    """
    Creates or updates a PathNode for a given Room instance.
    This ensures that every room is represented as a node in the path network.
    The OneToOneField on PathNode linking to Room ensures that on_delete=CASCADE
    handles the deletion of the PathNode when the Room is deleted, so a
    post_delete signal is not necessary.
    """
    PathNode.objects.update_or_create(
        room=instance,
        defaults={
            'floor': instance.floor,
            'geom': instance.geom,
            'node_type': 'room',
        }
    )

@receiver(post_save, sender=PathNode)
def create_edges_for_node(sender, instance, created, **kwargs):
    if not created:
        return

    floor_nodes = PathNode.objects.filter(
        floor=instance.floor
    ).exclude(id=instance.id)

    for node in floor_nodes:
        dist = instance.geom.distance(node.geom)  # in degrees
        if dist < 0.0001:  # ≈ 10m threshold, depends on projection (WGS84)
            # Avoid duplicate edges
            already_exists = PathEdge.objects.filter(
                start_node=instance, end_node=node
            ).exists() or PathEdge.objects.filter(
                start_node=node, end_node=instance
            ).exists()

            if not already_exists:
                PathEdge.objects.create(
                    start_node=instance,
                    end_node=node,
                    distance=instance.geom.distance(node.geom) * 111000  # degrees → meters
                )