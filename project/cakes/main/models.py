from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


class Cake(models.Model):
    cake_id = models.AutoField(db_column='cake_ID', primary_key=True)
    weight = models.IntegerField()
    cost = models.TextField()
    layers_count = models.IntegerField()
    text = models.TextField(blank=True, null=True)
    name = models.TextField(blank=True, null=True)
    constructor_image = models.TextField(blank=True, null=True)
    preview_image = models.TextField(blank=True, null=True)
    cake_size = models.ForeignKey('CakeSize', models.DO_NOTHING, db_column='cake_size_ID')
    cake_shape = models.ForeignKey('CakeShape', models.DO_NOTHING, db_column='cake_shape_ID')
    cake_coverage = models.ForeignKey('CakeCoverage', models.DO_NOTHING, db_column='cake_coverage_ID', default=1)
    cake_topping = models.ForeignKey('CakeTopping', models.DO_NOTHING, db_column='cake_topping_ID', default=1)
    cake_addition = models.ForeignKey('CakeAddition', models.DO_NOTHING, db_column='cake_addition_ID', default=1)
    cake_addition_perimeter = models.ForeignKey('CakeAddition', models.DO_NOTHING, db_column='cake_addition_perimeter_ID', related_name='cake_addition_perimeter', null=True, blank=True)

    class Meta:
        db_table = 'Cake'

    def __str__(self):
        return self.name


class CakeAddition(models.Model):
    cake_addition_id = models.AutoField(db_column='cake_addition_ID', primary_key=True)
    ingridient = models.TextField(unique=True)
    cost_per_gram = models.IntegerField()
    primary_color = models.TextField()
    secondary_color = models.TextField()
    texture_side_path = models.CharField(max_length=255, blank=True, null=True)
    texture_top_path = models.CharField(max_length=255, blank=True, null=True)
    amount = models.IntegerField(blank=True, null=True)

    class Meta:
        db_table = 'Cake_addition'

    def __str__(self):
        return self.ingridient


class CakeCoverage(models.Model):
    cake_coverage_id = models.AutoField(db_column='Cake_coverage_ID', primary_key=True)
    ingridient = models.TextField(unique=True)
    cost_per_gram = models.IntegerField()
    density = models.IntegerField()
    primary_color = models.TextField()
    secondary_color = models.TextField()

    class Meta:
        db_table = 'Cake_coverage'

    def __str__(self):
        return self.ingridient


class CakeShape(models.Model):
    cake_shape_id = models.AutoField(db_column='cake_shape_ID', primary_key=True)
    shape = models.TextField(unique=True)
    cost = models.IntegerField()
    texture_path = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'Cake_shape'

    def __str__(self):
        return self.shape


class CakeSize(models.Model):
    cake_size_id = models.AutoField(db_column='cake_size_ID', primary_key=True)
    type = models.TextField(unique=True)
    base_area = models.IntegerField(unique=True)

    class Meta:
        db_table = 'Cake_size'

    def __str__(self):
        return self.type


class CakeStructure(models.Model):
    cake = models.ForeignKey(Cake, models.DO_NOTHING, db_column='cake_ID')
    layer = models.ForeignKey('Layer', models.DO_NOTHING, db_column='layer_ID')
    cake_structure_id = models.AutoField(db_column='cake_structure_ID', primary_key=True)

    class Meta:
        db_table = 'Cake_structure'


class CakeTopping(models.Model):
    cake_topping_id = models.AutoField(db_column='Cake_topping_ID', primary_key=True)
    ingridient = models.TextField(unique=True)
    cost_per_gram = models.IntegerField()
    density = models.IntegerField()
    primary_color = models.TextField()
    texture_path = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'Cake_topping'

    def __str__(self):
        return self.ingridient


class Layer(models.Model):
    layer_id = models.AutoField(db_column='layer_ID', primary_key=True)
    layer_filling = models.ForeignKey('LayerFilling', models.DO_NOTHING, db_column='layer_filling_ID')
    layer_base = models.ForeignKey('LayerBase', models.DO_NOTHING, db_column='layer_base_ID')

    class Meta:
        db_table = 'Layer'


class LayerBase(models.Model):
    layer_base_id = models.AutoField(db_column='layer_base_ID', primary_key=True)
    ingridient = models.TextField(unique=True)
    cost_per_gram = models.IntegerField()
    density = models.IntegerField()
    primary_color = models.TextField()
    secondary_color = models.TextField()

    class Meta:
        db_table = 'Layer_base'

    def __str__(self):
        return self.ingridient


class LayerFilling(models.Model):
    layer_filling_id = models.AutoField(db_column='layer_filling_ID', primary_key=True)
    ingridient = models.TextField(unique=True)
    cost_per_gram = models.IntegerField()
    density = models.IntegerField()
    primary_color = models.TextField()
    secondary_color = models.TextField()

    class Meta:
        db_table = 'Layer_filling'

    def __str__(self):
        return self.ingridient


class Order(models.Model):
    order_id = models.AutoField(db_column='order_ID', primary_key=True)
    date = models.TextField()
    delivery_date = models.TextField()
    price = models.FloatField()
    delivery_address = models.TextField()
    status = models.TextField()
    user = models.ForeignKey('User', models.DO_NOTHING, db_column='user_ID', null=True, blank=True)

    class Meta:
        db_table = 'Order'


class OrderContent(models.Model):
    order = models.ForeignKey(Order, models.DO_NOTHING, db_column='order_ID')
    cake = models.ForeignKey(Cake, models.DO_NOTHING, db_column='cake_ID')
    order_content_id = models.AutoField(db_column='order_content_ID', primary_key=True)

    class Meta:
        db_table = 'Order_content'


class UserManager(BaseUserManager):
    def create_user(self, email, first_name, last_name, date_birth, phone_number, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, first_name=first_name, last_name=last_name, date_birth=date_birth,
                          phone_number=phone_number, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, first_name, last_name, date_birth, phone_number, password=None, **extra_fields):
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_staff', True)

        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')

        return self.create_user(email, first_name, last_name, date_birth, phone_number, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    user_id = models.AutoField(db_column='user_ID', primary_key=True)
    first_name = models.TextField()
    password = models.TextField()
    email = models.EmailField(unique=True)
    last_name = models.TextField()
    date_birth = models.DateField()
    phone_number = models.CharField(max_length=15, unique=True)
    is_superuser = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'date_birth', 'phone_number']

    class Meta:
        db_table = 'User'

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
