from django.shortcuts import render, redirect, get_object_or_404
from . import models
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import Sum, Count, F


def home(request):
    return render(request, 'main/home.html')


def cake_info(request):
    return render(request, 'main/cake_info.html')


def account(request):
    print(models.Cake.objects.all()[0].text)
    return render(request, 'main/account.html')


def registration_form(request):
    return render(request, 'main/registration_form.html')


def login_form(request):
    return render(request, 'main/login_form.html')


def recovery_form(request):
    return render(request, 'main/recovery_form.html')


def catalog(request):
    return render(request, 'main/catalog.html')


def cart(request):
    return render(request, 'main/cart.html')


def order_form(request):
    return render(request, 'main/order_form.html')


def order_details(request):
    return render(request, 'main/order_details.html')


def constructor(request):
    return render(request, 'main/constructor.html')
