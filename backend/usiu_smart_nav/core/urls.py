from django.urls import path
from . import views

urlpatterns = [
    path('locations/', views.LocationList.as_view(), name='location-list'),
    path('amenities/', views.AmenityList.as_view(), name='amenity-list'),
    path('parking-lots/', views.ParkingLotList.as_view(), name='parking-lot-list'),
    path('buildings/', views.BuildingList.as_view(), name='building-list'),
    path('floors/', views.FloorList.as_view(), name='floor-list'),
    path('rooms/', views.RoomList.as_view(), name='room-list'),
    path('parking/register/<int:pk>/', views.register_parking, name='register_parking'),
    path('parking/deregister/<int:pk>/', views.deregister_parking, name='deregister_parking'),
    path('ors-proxy/', views.ORSProxyView.as_view(), name='ors-proxy'),
    path('get-csrf-token/', views.get_csrf_token, name='get-csrf-token'),
    path('parking/active-sessions/', views.active_sessions, name='active-sessions'),
    path('indoor-navigation/', views.IndoorNavigationView.as_view(), name='indoor-navigation'),
    path('indoor-path-graph/', views.indoor_path_graph, name='indoor-path-graph'),
    path("indoor-path/dijkstra/", views.dijkstra_path, name="dijkstra_path"),

]
