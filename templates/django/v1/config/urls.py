from django.http import HttpResponse
from django.urls import path


def home(_request):
    return HttpResponse("V03 Django Template")


urlpatterns = [path("", home)]

