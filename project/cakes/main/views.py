from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import logout, authenticate, login
from django.contrib.auth.hashers import make_password
from django.contrib import messages
from django.db import connection
from .models import *
from django.utils import timezone


def add_to_cart(request, cake_id):
    cart = request.session.get('cart', {})
    if str(cake_id) in cart:
        cart[str(cake_id)] += 1
    else:
        cart[str(cake_id)] = 1
    request.session['cart'] = cart
    messages.success(request, 'Торт добавлен в корзину.')
    return redirect('cart')


def remove_from_cart(request, cake_id):
    cart = request.session.get('cart', {})
    action = request.GET.get('action', 'remove')
    if str(cake_id) in cart:
        if action == 'decrease':
            cart[str(cake_id)] -= 1
            if cart[str(cake_id)] == 0:
                del cart[str(cake_id)]
        else:
            del cart[str(cake_id)]
    request.session['cart'] = cart
    messages.success(request, 'Торт удален из корзины.')
    return redirect('cart')


def cart(request):
    cart = request.session.get('cart', {})
    cakes = Cake.objects.filter(pk__in=cart.keys())
    cart_items = []
    total_cost = 0
    total_items = 0
    for cake in cakes:
        quantity = cart[str(cake.pk)]
        cost = float(cake.cost.replace(' ₽', '').replace(',', '.'))
        total_cost += cost * quantity
        total_items += quantity
        cart_items.append({
            'cake': cake,
            'quantity': quantity,
        })
    return render(request, 'main/cart.html', {
        'cart_items': cart_items,
        'total_cost': total_cost,
        'total_items': total_items
    })


def home(request):
    return render(request, 'main/home.html')


def cake_info(request, cake_id):
    cake = get_object_or_404(Cake, pk=cake_id)
    cake.preview_image = cake.preview_image.replace(
        'C:\\Users\\User\\Desktop\\cakesTP\\project\\cakes\\main\\static\\', '')
    return render(request, 'main/cake_info.html', {'cake': cake})


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
    cakes = Cake.objects.all()
    for cake in cakes:
        cake.preview_image = cake.preview_image.replace(
            'C:\\Users\\User\\Desktop\\cakesTP\\project\\cakes\\main\\static\\', '')
    rows = [cakes[i:i + 3] for i in range(0, len(cakes), 3)]
    return render(request, 'main/catalog.html', {'rows': rows})


def order_form(request):
    if request.method == 'POST':
        first_name = request.POST['firstName']
        last_name = request.POST['lastName']
        email = request.POST['email']
        phone = request.POST['phone']
        address = request.POST['address']

        # Save the order
        order = Order(
            date=timezone.now(),
            delivery_date=timezone.now() + timezone.timedelta(days=3),
            price=0,  # Will be updated later
            delivery_address=address,
            status=1,  # Assuming 1 is the default status
            user=request.user if request.user.is_authenticated else None
        )
        order.save()

        cart = request.session.get('cart', {})
        total_cost = 0

        for cake_id, quantity in cart.items():
            cake = get_object_or_404(Cake, pk=cake_id)
            cost = float(cake.cost.replace(' ₽', '').replace(',', '.'))
            total_cost += cost * quantity

            for _ in range(quantity):
                OrderContent.objects.create(
                    order=order,
                    cake=cake
                )

        # Update the order price
        order.price = total_cost
        order.save()

        # Clear the cart
        request.session['cart'] = {}

        return redirect('order_details', order_id=order.pk)

    cart = request.session.get('cart', {})
    cakes = Cake.objects.filter(pk__in=cart.keys())
    total_cost = 0
    total_items = 0

    for cake in cakes:
        quantity = cart[str(cake.pk)]
        cost = float(cake.cost.replace(' ₽', '').replace(',', '.'))
        total_cost += cost * quantity
        total_items += quantity

    return render(request, 'main/order_form.html', {
        'total_cost': total_cost,
        'total_items': total_items
    })


def order_details(request, order_id):
    order = get_object_or_404(Order, pk=order_id)
    order_contents = OrderContent.objects.filter(order=order)
    return render(request, 'main/order_details.html', {
        'order': order,
        'order_contents': order_contents
    })


def constructor(request):
    return render(request, 'main/constructor.html')
