from django.core.paginator import Paginator
from django.http import HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import logout, authenticate, login
from django.contrib.auth.hashers import make_password
from django.contrib import messages
from django.db import connection
from .models import *
from django.contrib.auth.decorators import login_required, user_passes_test
from django.db.models import Count, Avg
from django.core.serializers.json import DjangoJSONEncoder
import json
from django.utils import timezone
from django.core.mail import send_mail
from django.utils.crypto import get_random_string


def recovery_form(request):
    if request.method == 'POST':
        email = request.POST['email']
        code = get_random_string(length=6, allowed_chars='1234567890')
        request.session['recovery_code'] = code
        request.session['recovery_email'] = email

        send_mail(
            'Код восстановления пароля',
            f'Ваш код для восстановления пароля: {code}',
            'sweetcr3ations@yandex.ru',
            [email],
            fail_silently=False,
        )
        return redirect('recovery_form_confirm_code')

    return render(request, 'main/recovery_form.html')


def confirm_recovery_code(request):
    if request.method == 'POST':
        input_code = request.POST['code']
        session_code = request.session.get('recovery_code')

        if input_code == session_code:
            return redirect('recovery_form_reset_password')
        else:
            messages.error(request, 'Неверный код.')
    return render(request, 'main/recovery_form_confirm_code.html')


def reset_password(request):
    if request.method == 'POST':
        password = request.POST['password']
        password_confirmed = request.POST['password_confirmed']

        if password == password_confirmed:
            email = request.session.get('recovery_email')
            user = get_object_or_404(User, email=email)
            user.set_password(password)
            user.save()
            messages.success(request, 'Пароль успешно изменен.')
            return redirect('login_form')
        else:
            messages.error(request, 'Пароли не совпадают.')
    return render(request, 'main/recovery_form_reset_password.html')


def add_to_cart(request, cake_id):
    cart_in = request.session.get('cart_in', {})
    if str(cake_id) in cart_in:
        cart_in[str(cake_id)] += 1
    else:
        cart_in[str(cake_id)] = 1
    request.session['cart_in'] = cart_in
    messages.success(request, 'Торт добавлен в корзину.')
    return redirect(request.META.get('HTTP_REFERER', '/'))


def remove_from_cart(request, cake_id):
    cart_in = request.session.get('cart', {})
    action = request.GET.get('action', 'remove')
    if str(cake_id) in cart_in:
        if action == 'decrease':
            cart_in[str(cake_id)] -= 1
            if cart_in[str(cake_id)] == 0:
                del cart_in[str(cake_id)]
        else:
            del cart_in[str(cake_id)]
    request.session['cart'] = cart_in
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
    return render(request, 'main/cake_info.html', {'cake': cake})


def account(request):
    if request.user.is_authenticated:
        user_orders = Order.objects.filter(user=request.user)
        return render(request, 'main/account.html', {'user': request.user, 'orders': user_orders})
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


def catalog(request):
    size = request.GET.get('size')
    shape = request.GET.get('shape')
    topping = request.GET.get('topping')
    coverage = request.GET.get('coverage')
    layer_count = request.GET.get('layer_count')
    additions = request.GET.getlist('additions')

    cakes = Cake.objects.all()

    if size:
        cakes = cakes.filter(cake_size__type=size)
    if shape:
        cakes = cakes.filter(cake_shape__shape=shape)
    if topping:
        cakes = cakes.filter(cake_topping__ingridient=topping)
    if coverage:
        cakes = cakes.filter(cake_coverage__ingridient=coverage)
    if layer_count:
        cakes = cakes.filter(layers_count=layer_count)
    if additions:
        for addition in additions:
            cakes = cakes.filter(cake_addition__ingridient=addition)

    rows = [cakes[i:i + 3] for i in range(0, len(cakes), 3)]
    paginator = Paginator(cakes, 9)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return render(request, 'main/catalog.html', {
        'rows': rows,
        'page_obj': page_obj,
        'selected_size': size,
        'selected_shape': shape,
        'selected_topping': topping,
        'selected_coverage': coverage,
        'selected_layer_count': layer_count,
        'selected_additions': additions,
    })



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

            # Save the cake to the order the number of times indicated by the quantity
            for _ in range(quantity):
                OrderContent.objects.create(order=order, cake=cake)

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

    # Группируем торты по id и считаем количество
    grouped_order_contents = {}
    for item in order_contents:
        if item.cake.pk in grouped_order_contents:
            grouped_order_contents[item.cake.pk]['quantity'] += 1
        else:
            grouped_order_contents[item.cake.pk] = {
                'cake': item.cake,
                'quantity': 1
            }

    return render(request, 'main/order_details.html', {
        'order': order,
        'order_contents': grouped_order_contents.values()
    })


def constructor(request):
    return render(request, 'main/constructor.html')


def staff_required(user):
    return user.is_staff
@login_required
@user_passes_test(staff_required)
def manage_cakes(request):
    if not request.user.is_authenticated:
        print("User is not authenticated")
    if not request.user.is_staff:
        print("User is not staff")

    cakes = Cake.objects.all()
    return render(request, 'staff/manage_cakes.html', {'cakes': cakes})

@login_required
@user_passes_test(staff_required)
def manage_orders(request):
    orders = Order.objects.all()
    return render(request, 'staff/manage_orders.html', {'orders': orders})

@login_required
@user_passes_test(staff_required)
def edit_order(request, order_id):
    order = get_object_or_404(Order, pk=order_id)
    if request.method == 'POST':
        order.status = request.POST.get('status', order.status)
        order.delivery_address = request.POST.get('delivery_address', order.delivery_address)
        order.delivery_date = request.POST.get('delivery_date', order.delivery_date)
        order.save()
        return redirect('manage_orders')
    return render(request, 'staff/edit_order.html', {'order': order})

@login_required
@user_passes_test(staff_required)
def add_cake(request):
    if request.method == 'POST':
        cake = Cake(
            weight=request.POST['weight'],
            cost=request.POST['cost'],
            layers_count=request.POST['layers_count'],
            text=request.POST.get('text', ''),
            name=request.POST.get('name', ''),
            constructor_image=request.POST.get('constructor_image', ''),
            preview_image=request.POST.get('preview_image', ''),
            cake_size_id=request.POST['cake_size'],
            cake_shape_id=request.POST['cake_shape'],
            cake_coverage_id=request.POST['cake_coverage'],
            cake_topping_id=request.POST['cake_topping'],
            cake_addition_id=request.POST['cake_addition'],
        )
        cake.save()
        return redirect('manage_cakes')
    cake_sizes = CakeSize.objects.all()
    cake_shapes = CakeShape.objects.all()
    cake_coverages = CakeCoverage.objects.all()
    cake_toppings = CakeTopping.objects.all()
    cake_additions = CakeAddition.objects.all()
    return render(request, 'staff/add_cake.html', {
        'cake_sizes': cake_sizes,
        'cake_shapes': cake_shapes,
        'cake_coverages': cake_coverages,
        'cake_toppings': cake_toppings,
        'cake_additions': cake_additions,
    })

@login_required
@user_passes_test(staff_required)
def edit_cake(request, cake_id):
    cake = get_object_or_404(Cake, pk=cake_id)
    if request.method == 'POST':
        cake.weight = request.POST.get('weight', cake.weight)
        cake.cost = request.POST.get('cost', cake.cost)
        cake.layers_count = request.POST.get('layers_count', cake.layers_count)
        cake.text = request.POST.get('text', cake.text)
        cake.name = request.POST.get('name', cake.name)
        cake.constructor_image = request.POST.get('constructor_image', cake.constructor_image)
        cake.preview_image = request.POST.get('preview_image', cake.preview_image)
        cake.cake_size_id = request.POST.get('cake_size', cake.cake_size_id)
        cake.cake_shape_id = request.POST.get('cake_shape', cake.cake_shape_id)
        cake.cake_coverage_id = request.POST.get('cake_coverage', cake.cake_coverage_id)
        cake.cake_topping_id = request.POST.get('cake_topping', cake.cake_topping_id)
        cake.cake_addition_id = request.POST.get('cake_addition', cake.cake_addition_id)
        cake.save()
        return redirect('manage_cakes')
    cake_sizes = CakeSize.objects.all()
    cake_shapes = CakeShape.objects.all()
    cake_coverages = CakeCoverage.objects.all()
    cake_toppings = CakeTopping.objects.all()
    cake_additions = CakeAddition.objects.all()
    return render(request, 'staff/edit_cake.html', {
        'cake': cake,
        'cake_sizes': cake_sizes,
        'cake_shapes': cake_shapes,
        'cake_coverages': cake_coverages,
        'cake_toppings': cake_toppings,
        'cake_additions': cake_additions,
    })

@login_required
@user_passes_test(staff_required)
def delete_cake(request, cake_id):
    cake = get_object_or_404(Cake, pk=cake_id)
    if request.method == 'POST':
        cake.delete()
        return redirect('manage_cakes')
    return render(request, 'staff/confirm_delete.html', {'cake': cake})

@login_required
@user_passes_test(staff_required)
def delete_order(request, order_id):
    order = get_object_or_404(Order, pk=order_id)
    order.delete()
    return redirect('manage_orders')

@login_required
@user_passes_test(staff_required)
def statistics_view(request):
    additions = Cake.objects.values('cake_addition__ingridient').annotate(count=Count('cake_addition')).order_by(
        '-count')
    coverages = Cake.objects.values('cake_coverage__ingridient').annotate(count=Count('cake_coverage')).order_by(
        '-count')
    toppings = Cake.objects.values('cake_topping__ingridient').annotate(count=Count('cake_topping')).order_by('-count')
    avg_order_price = OrderContent.objects.aggregate(avg_price=Avg('order__price'))['avg_price']

    # Преобразование данных в JSON-формат
    additions_data = json.dumps(list(additions), cls=DjangoJSONEncoder)
    coverages_data = json.dumps(list(coverages), cls=DjangoJSONEncoder)
    toppings_data = json.dumps(list(toppings), cls=DjangoJSONEncoder)

    context = {
        'additions': additions_data,
        'coverages': coverages_data,
        'toppings': toppings_data,
        'avg_order_price': avg_order_price,
    }

    return render(request, 'staff/statistics.html', context)