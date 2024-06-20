from django.urls import path
from . import views
from .views import *

urlpatterns = [
    path('', home, name='home'),
    path('cake/<int:cake_id>/', views.cake_info, name='cake_info'),
    path('account/', account, name='account'),
    path('registration_form/', registration_form, name='registration_form'),
    path('login_form/', login_form, name='login_form'),
    path('recovery_form/', recovery_form, name='recovery_form'),
    path('recovery_form/confirmed/', confirm_recovery_code, name='recovery_form_confirm_code'),
    path('recovery_form/reset/', reset_password, name='recovery_form_reset_password'),
    path('catalog/', catalog, name='catalog'),
    path('cart/', cart, name='cart'),
    path('add_to_cart/<int:cake_id>/', views.add_to_cart, name='add_to_cart'),
    path('remove_from_cart/<int:cake_id>/', views.remove_from_cart, name='remove_from_cart'),
    path('order_form/', order_form, name='order_form'),
    path('order_details/<int:order_id>/', order_details, name='order_details'),
    path('constructor/', constructor, name='constructor'),
    path('logout/', logout_view, name='logout'),
]