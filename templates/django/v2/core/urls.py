from django.urls import path

from .views import healthz, home

urlpatterns = [
    path("", home),
    path("healthz", healthz),
]

