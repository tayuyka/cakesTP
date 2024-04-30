from django.urls import path
from . import views
from .views import *

urlpatterns = [
    path('', home, name='home'),
    path('cake_info/', cake_info, name='cake_info'),
    path('account/', account, name='account'),
    path('registration_form/', registration_form, name='registration_form'),
    path('login_form/', login_form, name='login_form'),
    path('recovery_form/', recovery_form, name='recovery_form'),
    path('catalog/', catalog, name='catalog'),
    path('cart/', cart, name='cart'),
    path('order_form/', order_form, name='order_form'),
    path('order_details/', order_details, name='order_details'),
    path('constructor/', constructor, name='constructor'),
]