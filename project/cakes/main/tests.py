from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core import mail
from .models import Cake, Order, OrderContent, CakeSize, CakeShape, CakeTopping, CakeCoverage, CakeAddition


class CakeTestCase(TestCase):

    def setUp(self):
        self.client = Client()
        self.user = get_user_model().objects.create_user(
            email='testuser@example.com',
            password='password',
            first_name='Test',
            last_name='User',
            date_birth='2000-01-01',
            phone_number='1234567890'
        )
        self.cake_size = CakeSize.objects.create(type='средний', base_area=25)
        self.cake_shape = CakeShape.objects.create(shape='круглый', cost=100)
        self.cake_topping = CakeTopping.objects.create(
            ingridient='шоколад',
            cost_per_gram=50,
            density=1,
            primary_color='brown',
            secondary_color='dark_brown'
        )
        self.cake_coverage = CakeCoverage.objects.create(
            ingridient='крем чиз',
            cost_per_gram=60,
            density=2,
            primary_color='white',
            secondary_color='off_white'
        )
        self.cake_addition = CakeAddition.objects.create(
            ingridient='фисташки',
            cost_per_gram=80,
            primary_color='green',
            secondary_color='brown'
        )
        self.cake = Cake.objects.create(
            name='Тестовый торт',
            cost='500 ₽',
            weight=500,
            layers_count=2,
            cake_size=self.cake_size,
            cake_shape=self.cake_shape,
            cake_topping=self.cake_topping,
            cake_coverage=self.cake_coverage,
            cake_addition=self.cake_addition,
            preview_image='main/img/cake.png'
        )

    def test_add_to_cart(self):
        response = self.client.get(reverse('add_to_cart', args=[self.cake.pk]))
        self.assertEqual(response.status_code, 302)
        cart = self.client.session.get('cart', {})
        self.assertEqual(cart[str(self.cake.pk)], 1)

    def test_remove_from_cart(self):
        self.client.get(reverse('add_to_cart', args=[self.cake.pk]))
        response = self.client.get(reverse('remove_from_cart', args=[self.cake.pk]), {'action': 'remove'})
        self.assertEqual(response.status_code, 302)
        cart = self.client.session.get('cart', {})
        self.assertNotIn(str(self.cake.pk), cart)

    def test_recommendations_authenticated_user(self):
        self.client.login(email='testuser@example.com', password='password')
        order = Order.objects.create(user=self.user, delivery_address='Address', status=1, price=3000.0)
        OrderContent.objects.create(order=order, cake=self.cake)
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Тестовый торт')

    def test_recommendations_unauthenticated_user(self):
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Тестовый торт')

    def test_recovery_form(self):
        response = self.client.post(reverse('recovery_form'), {'email': 'testuser@example.com'})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Код восстановления пароля', mail.outbox[0].subject)

    def test_confirm_recovery_code(self):
        self.client.post(reverse('recovery_form'), {'email': 'testuser@example.com'})
        code = self.client.session['recovery_code']
        response = self.client.post(reverse('recovery_form_confirm_code'), {'code': code})
        self.assertEqual(response.status_code, 302)

    def test_reset_password(self):
        self.client.post(reverse('recovery_form'), {'email': 'testuser@example.com'})
        code = self.client.session['recovery_code']
        self.client.post(reverse('recovery_form_confirm_code'), {'code': code})
        response = self.client.post(reverse('recovery_form_reset_password'), {
            'password': 'newpassword',
            'password_confirmed': 'newpassword'
        })
        self.assertEqual(response.status_code, 302)
        user = get_user_model().objects.get(email='testuser@example.com')
        self.assertTrue(user.check_password('newpassword'))

    def test_home_authenticated_user(self):
        self.client.login(email='testuser@example.com', password='password')
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Тестовый торт')

    def test_home_unauthenticated_user(self):
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Тестовый торт')

    def test_account_authenticated_user(self):
        self.client.login(email='testuser@example.com', password='password')
        response = self.client.get(reverse('account'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'testuser@example.com')

    def test_catalog_filtering(self):
        response = self.client.get(reverse('catalog'), {'size': 'средний', 'shape': 'круглый'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Тестовый торт')

    def test_order_form(self):
        self.client.login(email='testuser@example.com', password='password')
        response = self.client.post(reverse('order_form'), {
            'firstName': 'Test',
            'lastName': 'User',
            'email': 'testuser@example.com',
            'phone': '1234567890',
            'address': 'Test Address'
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Order.objects.filter(user=self.user).exists())

    def test_order_details(self):
        self.client.login(email='testuser@example.com', password='password')
        order = Order.objects.create(user=self.user, delivery_address='Address', status=1, price=3000.0)
        OrderContent.objects.create(order=order, cake=self.cake)
        response = self.client.get(reverse('order_details', args=[order.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Тестовый торт')

    def test_cake_info(self):
        response = self.client.get(reverse('cake_info', args=[self.cake.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Тестовый торт')
