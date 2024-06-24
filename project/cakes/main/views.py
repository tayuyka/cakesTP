from django.core.paginator import Paginator
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import logout, authenticate, login
from django.contrib.auth.hashers import make_password
from django.contrib import messages
from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from .models import *
from django.contrib.auth.decorators import login_required, user_passes_test
from django.db.models import Count, Avg
from django.core.serializers.json import DjangoJSONEncoder
import json
from django.utils import timezone
from rest_framework import viewsets, generics
from rest_framework.response import Response
import json
from django.http import JsonResponse
from .models import Cake
from django.core.mail import send_mail
from django.utils.crypto import get_random_string
from collections import Counter
import logging
logger = logging.getLogger(__name__)


def get_recommendations(user):
    if user.is_authenticated:
        user_orders = Order.objects.filter(user=user)
        if user_orders.exists():
            # Получаем все торты, которые пользователь заказывал
            ordered_cakes = OrderContent.objects.filter(order__in=user_orders).values_list('cake', flat=True)
            cakes = Cake.objects.filter(pk__in=ordered_cakes)

            # Собираем параметры заказанных тортов
            layer_counts = cakes.values_list('layers_count', flat=True)
            sizes = cakes.values_list('cake_size__type', flat=True)
            shapes = cakes.values_list('cake_shape__shape', flat=True)
            toppings = cakes.values_list('cake_topping__ingridient', flat=True)
            coverages = cakes.values_list('cake_coverage__ingridient', flat=True)

            # Считаем наиболее часто встречающиеся параметры
            most_common_layer_count = Counter(layer_counts).most_common(1)[0][0]
            most_common_size = Counter(sizes).most_common(1)[0][0]
            most_common_shape = Counter(shapes).most_common(1)[0][0]
            most_common_topping = Counter(toppings).most_common(1)[0][0]
            most_common_coverage = Counter(coverages).most_common(1)[0][0]

            # Получаем рекомендации на основе наиболее часто встречающихся параметров
            recommended_cakes = set()
            recommended_cakes.update(Cake.objects.filter(layers_count=most_common_layer_count)[:5])
            recommended_cakes.update(Cake.objects.filter(cake_size__type=most_common_size)[:5])
            recommended_cakes.update(Cake.objects.filter(cake_shape__shape=most_common_shape)[:5])
            recommended_cakes.update(Cake.objects.filter(cake_topping__ingridient=most_common_topping)[:5])
            recommended_cakes.update(Cake.objects.filter(cake_coverage__ingridient=most_common_coverage)[:5])

            # Ограничиваем количество рекомендаций до 5 и удаляем дубликаты
            return list(recommended_cakes)[:5]

    # Если пользователь не авторизован или у него нет заказов, возвращаем любые 5 тортов
    return list(Cake.objects.all()[:5])


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


"""
def add_to_cart(request, cake_id):
    cart = request.session.get('cart', {})
    if str(cake_id) in cart:
        cart[str(cake_id)] += 1
    else:
        cart[str(cake_id)] = 1
    request.session['cart'] = cart
    messages.success(request, 'Торт добавлен в корзину.')
    return redirect(request.META.get('HTTP_REFERER', '/'))
"""

def add_to_cart(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            print("Полученные данные:", data)

            # Здесь нужно обработать данные и создать торт в базе данных, если требуется
            # Например, можно создать объект Cake и сохранить его в базе данных
            # Но в данном примере мы предполагаем, что торт уже существует и у нас есть cake_id

            cake_id = data.get('cake_id')  # Предполагаем, что cake_id отправляется в данных

            if not cake_id:
                return JsonResponse({'error': 'Отсутствует cake_id'}, status=400)

            # Добавляем торт в корзину
            cart = request.session.get('cart', {})
            if str(cake_id) in cart:
                cart[str(cake_id)] += 1
            else:
                cart[str(cake_id)] = 1
            request.session['cart'] = cart

            messages.success(request, 'Торт добавлен в корзину.')
            return JsonResponse({'message': 'Торт успешно добавлен в корзину'}, status=200)
        except Exception as e:
            print("Ошибка при обработке запроса:", e)
            return JsonResponse({'error': 'Ошибка при обработке запроса', 'details': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Неверный метод запроса'}, status=405)

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
    recommended_cakes = get_recommendations(request.user)
    return render(request, 'main/home.html', {'recommended_cakes': recommended_cakes})


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


def calculate_cake_weight_and_cost(layers_count, cake_size, cake_shape, cake_coverage, cake_topping, cake_additions, cake_layers):

    Vc = cake_size.base_area
    Vt = Vc * 0.1
    Vl = Vc * 0.5
    Vb = Vc * 0.05

    pc = float(cake_coverage.density) / 1000
    pt = float(cake_topping.density) / 1000

    Mc = pc * Vc
    Mt = pt * Vt

    Ml = 0
    for layer in cake_layers:
        pf = float(layer.layer_filling.density) / 1000
        pb = float(layer.layer_base.density) / 1000
        Ml += (pf * Vl + pb * Vb)

    Ml *= layers_count

    M_add = sum(float(addition.cost_per_gram) / 100 for addition in cake_additions)


    total_weight = Mc + Mt + Ml + M_add


    dc = float(cake_coverage.cost_per_gram)
    dt = float(cake_topping.cost_per_gram)
    df = float(cake_layers[0].layer_filling.cost_per_gram)
    db = float(cake_layers[0].layer_base.cost_per_gram)
    d_add = sum(float(addition.cost_per_gram) for addition in cake_additions) / len(cake_additions)


    Sl = 0
    for layer in cake_layers:
        pf = float(layer.layer_filling.density) / 1000
        pb = float(layer.layer_base.density) / 1000
        Sl += (pf * Vl * df + pb * Vb * db)

    Sl *= layers_count

    S = Mc * dc + Mt * dt + Sl + M_add * d_add

    total_cost = S

    return total_weight, total_cost


@login_required
@user_passes_test(staff_required)
def add_cake(request):
    if request.method == 'POST':
        layers_count = int(request.POST['layers_count'])
        cake_size = get_object_or_404(CakeSize, pk=request.POST['cake_size'])
        cake_shape = get_object_or_404(CakeShape, pk=request.POST['cake_shape'])
        cake_coverage = get_object_or_404(CakeCoverage, pk=request.POST['cake_coverage'])
        cake_topping = get_object_or_404(CakeTopping, pk=request.POST['cake_topping'])
        cake_additions = CakeAddition.objects.filter(pk__in=request.POST.getlist('cake_addition'))

        layer_ids = request.POST.getlist('layers')
        layers = Layer.objects.filter(pk__in=layer_ids)

        if not layers:
            messages.error(request, "Выберите слои для торта.")
            return redirect('add_cake')

        weight, cost = calculate_cake_weight_and_cost(
            layers_count, cake_size, cake_shape, cake_coverage, cake_topping, cake_additions, layers
        )

        cake = Cake(
            weight=weight,
            cost=f"{cost:.2f} ₽",
            layers_count=layers_count,
            text=request.POST.get('text', ''),
            name=request.POST.get('name', ''),
            constructor_image=request.POST.get('constructor_image', ''),
            preview_image=request.POST.get('preview_image', ''),
            cake_size=cake_size,
            cake_shape=cake_shape,
            cake_coverage=cake_coverage,
            cake_topping=cake_topping,
            cake_addition=cake_additions.first() if cake_additions.exists() else None,
        )
        cake.save()

        for layer in layers:
            CakeStructure.objects.create(cake=cake, layer=layer)

        return redirect('manage_cakes')

    cake_sizes = CakeSize.objects.all()
    cake_shapes = CakeShape.objects.all()
    cake_coverages = CakeCoverage.objects.all()
    cake_toppings = CakeTopping.objects.all()
    cake_additions = CakeAddition.objects.all()
    layers = Layer.objects.all()
    return render(request, 'staff/add_cake.html', {
        'cake_sizes': cake_sizes,
        'cake_shapes': cake_shapes,
        'cake_coverages': cake_coverages,
        'cake_toppings': cake_toppings,
        'cake_additions': cake_additions,
        'layers': layers,
    })


@login_required
@user_passes_test(staff_required)
def edit_cake(request, cake_id):
    cake = get_object_or_404(Cake, pk=cake_id)
    if request.method == 'POST':
        layers_count = int(request.POST['layers_count'])
        cake_size = get_object_or_404(CakeSize, pk=request.POST['cake_size'])
        cake_shape = get_object_or_404(CakeShape, pk=request.POST['cake_shape'])
        cake_coverage = get_object_or_404(CakeCoverage, pk=request.POST['cake_coverage'])
        cake_topping = get_object_or_404(CakeTopping, pk=request.POST['cake_topping'])
        cake_additions = CakeAddition.objects.filter(pk__in=request.POST.getlist('cake_addition'))

        layer_ids = request.POST.getlist('layers')
        layers = Layer.objects.filter(pk__in=layer_ids)

        if not layers:
            messages.error(request, "Выберите слои для торта.")
            return redirect('edit_cake', cake_id=cake_id)

        weight, cost = calculate_cake_weight_and_cost(
            layers_count, cake_size, cake_shape, cake_coverage, cake_topping, cake_additions, layers
        )

        cake.weight = weight
        cake.cost = f"{cost:.2f} ₽"
        cake.layers_count = layers_count
        cake.text = request.POST.get('text', cake.text)
        cake.name = request.POST.get('name', cake.name)
        cake.constructor_image = request.POST.get('constructor_image', cake.constructor_image)
        cake.preview_image = request.POST.get('preview_image', cake.preview_image)
        cake.cake_size = cake_size
        cake.cake_shape = cake_shape
        cake.cake_coverage = cake_coverage
        cake.cake_topping = cake_topping
        cake.cake_addition = cake_additions.first() if cake_additions.exists() else None
        cake.save()

        CakeStructure.objects.filter(cake=cake).delete()
        for layer in layers:
            CakeStructure.objects.create(cake=cake, layer=layer)

        return redirect('manage_cakes')

    cake_structure_layers = CakeStructure.objects.filter(cake=cake).values_list('layer_id', flat=True)
    cake_sizes = CakeSize.objects.all()
    cake_shapes = CakeShape.objects.all()
    cake_coverages = CakeCoverage.objects.all()
    cake_toppings = CakeTopping.objects.all()
    cake_additions = CakeAddition.objects.all()
    layers = Layer.objects.all()
    layer_range = list(range(1, cake.layers_count + 1))
    return render(request, 'staff/edit_cake.html', {
        'cake': cake,
        'cake_sizes': cake_sizes,
        'cake_shapes': cake_shapes,
        'cake_coverages': cake_coverages,
        'cake_toppings': cake_toppings,
        'cake_additions': cake_additions,
        'layers': layers,
        'cake_structure_layers': cake_structure_layers,
        'layer_range': layer_range,
        'max_layers': range(1, 4),
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

from .models import LayerBase, LayerFilling, CakeSize, CakeShape, CakeTopping, CakeAddition, CakeCoverage, Cake
from .serializers import LayerBaseSerializer, LayerFillingSerializer, CakeSizeSerializer, CakeShapeSerializer, CakeToppingSerializer, CakeAdditionSerializer, CakeCoverageSerializer, CakeSerializer

class CakeViewSet(viewsets.ViewSet):
    def list(self, request):
        data = {
            'bases': LayerBaseSerializer(LayerBase.objects.all(), many=True).data,
            'fillings': LayerFillingSerializer(LayerFilling.objects.all(), many=True).data,
            'sizes': CakeSizeSerializer(CakeSize.objects.all(), many=True).data,
            'shapes': CakeShapeSerializer(CakeShape.objects.all(), many=True).data,
            'toppings': CakeToppingSerializer(CakeTopping.objects.all(), many=True).data,
            'trinkets': CakeAdditionSerializer(CakeAddition.objects.all(), many=True).data,
            'covers': CakeCoverageSerializer(CakeCoverage.objects.all(), many=True).data,
        }
        return Response(data)

class CakeDetailView(generics.RetrieveAPIView):
    queryset = Cake.objects.all()
    serializer_class = CakeSerializer



"""
@csrf_exempt
def add_to_cart_from_constructor(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))
            cake = Cake.objects.create(
                weight=data['weight'],
                cost=data['cost'],
                layers_count=data['layers_count'],
                text=data['text'],
                name=data['name'],
                constructor_image=data['constructor_image'],
                preview_image=data['preview_image'],
                cake_size_id=data['cake_size'],
                cake_shape_id=data['cake_shape'],
                cake_coverage_id=data['cake_coverage'],
                cake_topping_id=data['cake_topping'],
                cake_addition_id=data['cake_addition']
            )

            cart = request.session.get('cart', {})
            if str(cake.id) in cart:
                cart[str(cake.id)] += 1
            else:
                cart[str(cake.id)] = 1
            request.session['cart'] = cart

            messages.success(request, 'Торт добавлен в корзину.')
            return JsonResponse({'message': 'Торт добавлен в корзину'}, status=200)

        except KeyError as e:
            return JsonResponse({'error': f'Missing parameter: {e}'}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            # Логирование ошибки и возврат общего сообщения об ошибке
            print(f'Error: {e}')
            return JsonResponse({'error': 'Internal Server Error'}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)
"""
"""
@csrf_exempt
def add_to_cart_from_constructor(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))

            # Проверка всех необходимых полей
            required_fields = ['weight', 'cost', 'layers_count', 'text', 'name', 'constructor_image', 'preview_image', 'cake_size', 'cake_shape', 'cake_coverage', 'cake_topping', 'cake_addition']
            for field in required_fields:
                if field not in data:
                    return JsonResponse({'error': f'Missing parameter: {field}'}, status=400)

            # Логирование данных перед созданием объекта
            print(f"Received cake data: {data}")

            # Проверка значений ID полей
            if not all([data['cake_size'], data['cake_shape'], data['cake_coverage'], data['cake_topping'], data['cake_addition']]):
                return JsonResponse({'error': 'One of the foreign key IDs is missing or invalid'}, status=400)

            # Создание объекта Cake
            cake = Cake.objects.create(
                weight=data['weight'],
                cost=data['cost'],
                layers_count=data['layers_count'],
                text=data['text'],
                name=data['name'],
                constructor_image=data['constructor_image'],
                preview_image=data['preview_image'],
                cake_size_id=data['cake_size'],
                cake_shape_id=data['cake_shape'],
                cake_coverage_id=data['cake_coverage'],
                cake_topping_id=data['cake_topping'],
                cake_addition_id=data['cake_addition']
            )

            # Проверка наличия ID у созданного объекта
            if not cake.cake_id:
                return JsonResponse({'error': 'Failed to retrieve the ID of the created Cake object'}, status=500)

            # Логирование ID созданного объекта Cake
            print(f"Created cake ID: {cake.cake_id}")

            cart = request.session.get('cart', {})
            if str(cake.cake_id) in cart:
                cart[str(cake.cake_id)] += 1
            else:
                cart[str(cake.cake_id)] = 1
            request.session['cart'] = cart

            messages.success(request, 'Торт добавлен в корзину.')
            return JsonResponse({'message': 'Торт добавлен в корзину'}, status=200)

        except KeyError as e:
            return JsonResponse({'error': f'Missing parameter: {e}'}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            # Логирование ошибки и возврат общего сообщения об ошибке
            print(f'Error: {e}')
            return JsonResponse({'error': 'Internal Server Error'}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)
"""
@csrf_exempt
def add_to_cart_from_constructor(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))

            required_fields = ['weight', 'cost', 'layers_count', 'text', 'name', 'constructor_image', 'preview_image', 'cake_size', 'cake_shape', 'cake_coverage', 'cake_topping', 'cake_addition']
            for field in required_fields:
                if field not in data:
                    return JsonResponse({'error': f'Missing parameter: {field}'}, status=400)

            print(f"Received cake data: {data}")

            if not all([data['cake_size'], data['cake_shape'], data['cake_coverage'], data['cake_topping'], data['cake_addition']]):
                return JsonResponse({'error': 'One of the foreign key IDs is missing or invalid'}, status=400)

            cake = Cake.objects.create(
                weight=data['weight'],
                cost=data['cost'],
                layers_count=data['layers_count'],
                text=data['text'],
                name=data['name'],
                constructor_image=data['constructor_image'],
                preview_image=data['preview_image'],
                cake_size_id=data['cake_size'],
                cake_shape_id=data['cake_shape'],
                cake_coverage_id=data['cake_coverage'],
                cake_topping_id=data['cake_topping'],
                cake_addition_id=data['cake_addition']
            )

            print(f"Created cake ID: {cake.cake_id}")

            cart = request.session.get('cart', {})
            if str(cake.cake_id) in cart:
                cart[str(cake.cake_id)] += 1
            else:
                cart[str(cake.cake_id)] = 1
            request.session['cart'] = cart

            messages.success(request, 'Торт добавлен в корзину.')
            return JsonResponse({'message': 'Торт добавлен в корзину'}, status=200)

        except KeyError as e:
            return JsonResponse({'error': f'Missing parameter: {e}'}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            print(f'Error: {e}')
            return JsonResponse({'error': 'Internal Server Error'}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)