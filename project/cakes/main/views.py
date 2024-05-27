from django.shortcuts import render, redirect
from django.contrib.auth import logout, authenticate, login
from django.contrib.auth.hashers import make_password
from django.contrib import messages
from django.db import connection


def home(request):
    return render(request, 'main/home.html')


def cake_info(request):
    return render(request, 'main/cake_info.html')


def account(request):
    if request.user.is_authenticated:
        return render(request, 'main/account.html', {'user': request.user})
    else:
        return login_form(request)


def registration_form(request):
    if request.method == 'POST':
        first_name = request.POST['first_name']
        last_name = request.POST['last_name']
        email = request.POST['email']
        day = request.POST['day']
        month = request.POST['month']
        year = request.POST['year']
        phone_number = request.POST['phone_number']
        password = make_password(request.POST['password'])

        date_birth = f"{year}-{month.zfill(2)}-{day.zfill(2)}"

        with connection.cursor() as cursor:
            cursor.execute("""INSERT INTO User 
            (first_name, last_name, email, date_birth, phone_number, password, is_superuser, is_staff)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            [first_name, last_name, email, date_birth, phone_number, password, False, False])
            return render(request, 'main/home.html')
    return render(request, 'main/registration_form.html')


def login_form(request):
    if request.method == 'POST':
        email = request.POST['email']
        password = request.POST['password']
        user = authenticate(request, username=email, password=password)
        if user is not None:
            login(request, user)
            return redirect('account')
        else:
            messages.error(request, 'Invalid email or password')
    return render(request, 'main/login_form.html')


def logout_view(request):
    logout(request)
    return redirect('home')


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
