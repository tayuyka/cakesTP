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
    path('recovery_form/confirmed/', recovery_form_confirmed, name='confirmed11'),
    path('catalog/', catalog, name='catalog'),
    path('cart/', cart, name='cart'),
    path('add_to_cart/<int:cake_id>/', views.add_to_cart, name='add_to_cart'),
    path('remove_from_cart/<int:cake_id>/', views.remove_from_cart, name='remove_from_cart'),
    path('order_form/', order_form, name='order_form'),
    path('order_details/<int:order_id>/', order_details, name='order_details'),
    path('constructor/', constructor, name='constructor'),
    path('logout/', logout_view, name='logout'),
    path('staff/cakes/', manage_cakes, name='manage_cakes'),
    path('staff/orders/', manage_orders, name='manage_orders'),
    path('staff/orders/edit/<int:order_id>/', edit_order, name='edit_order'),
    path('staff/orders/delete/<int:order_id>/', views.delete_order, name='delete_order'),
    path('staff/cakes/add/', add_cake, name='add_cake'),
    path('staff/cakes/edit/<int:cake_id>/', edit_cake, name='edit_cake'),
    path('staff/cakes/delete/<int:cake_id>/', delete_cake, name='delete_cake'),
    path('staff/statistics/', statistics_view, name='statistics'),
]