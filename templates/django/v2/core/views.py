from django.http import HttpResponse, JsonResponse


def home(_request):
    return HttpResponse("V03 Django Template (v2)")


def healthz(_request):
    return JsonResponse({"ok": True})

