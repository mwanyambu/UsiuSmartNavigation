from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Polygon, Point
from core.models import Building, Floor, Room

class Command(BaseCommand):
    help = 'Populates the database with initial data'

    def handle(self, *args, **options):
        # Clear existing data
        Room.objects.all().delete()
        Floor.objects.all().delete()
        Building.objects.all().delete()

        # School of Science and Technology
        sst_building = Building.objects.create(
            name='School of Science and Technology',
            geom=Polygon(((-1.223, 36.886), (-1.223, 36.887), (-1.224, 36.887), (-1.224, 36.886), (-1.223, 36.886)))
        )
        sst_floor_1 = Floor.objects.create(building=sst_building, level=1)
        Room.objects.create(floor=sst_floor_1, name='Classroom 1', room_type='classroom', geom=Point(36.8865, -1.2235))
        Room.objects.create(floor=sst_floor_1, name='Faculty Office 1', room_type='office', geom=Point(36.8866, -1.2236))

        # Chandaria School of Business
        csb_building = Building.objects.create(
            name='Chandaria School of Business',
            geom=Polygon(((-1.225, 36.888), (-1.225, 36.889), (-1.226, 36.889), (-1.226, 36.888), (-1.225, 36.888)))
        )
        csb_floor_1 = Floor.objects.create(building=csb_building, level=1)
        Room.objects.create(floor=csb_floor_1, name='Lecture Hall 1', room_type='classroom', geom=Point(36.8885, -1.2255))
        Room.objects.create(floor=csb_floor_1, name="Dean's Office", room_type='office', geom=Point(36.8886, -1.2256))

        # School of Humanities and Social Sciences
        shss_building = Building.objects.create(
            name='School of Humanities and Social Sciences',
            geom=Polygon(((-1.227, 36.890), (-1.227, 36.891), (-1.228, 36.891), (-1.228, 36.890), (-1.227, 36.890)))
        )
        shss_floor_1 = Floor.objects.create(building=shss_building, level=1)
        Room.objects.create(floor=shss_floor_1, name='Seminar Room 1', room_type='classroom', geom=Point(36.8905, -1.2275))
        Room.objects.create(floor=shss_floor_1, name='Department Office', room_type='office', geom=Point(36.8906, -1.2276))

        # Freida Brown Students Center
        fbsc_building = Building.objects.create(
            name='Freida Brown Students Center',
            geom=Polygon(((-1.229, 36.892), (-1.229, 36.893), (-1.230, 36.893), (-1.230, 36.892), (-1.229, 36.892)))
        )
        fbsc_floor_1 = Floor.objects.create(building=fbsc_building, level=1)
        Room.objects.create(floor=fbsc_floor_1, name='Cafeteria', room_type='amenity', geom=Point(36.8925, -1.2295))
        Room.objects.create(floor=fbsc_floor_1, name='Student Affairs Office', room_type='office', geom=Point(36.8926, -1.2296))

        # Lilian Beam Building
        lbb_building = Building.objects.create(
            name='Lilian Beam Building',
            geom=Polygon(((-1.231, 36.894), (-1.231, 36.895), (-1.232, 36.895), (-1.232, 36.894), (-1.231, 36.894)))
        )
        lbb_floor_1 = Floor.objects.create(building=lbb_building, level=1)
        Room.objects.create(floor=lbb_floor_1, name='Library', room_type='amenity', geom=Point(36.8945, -1.2315))
        Room.objects.create(floor=lbb_floor_1, name='IT Help Desk', room_type='office', geom=Point(36.8946, -1.2316))

        self.stdout.write(self.style.SUCCESS('Successfully populated the database.'))
