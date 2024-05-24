# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Cake(models.Model):
    cake_id = models.AutoField(db_column='cake_ID', primary_key=True)  # Field name made lowercase.
    weight = models.IntegerField()
    cost = models.TextField()  # This field type is a guess.
    layers_count = models.IntegerField()
    text = models.TextField(blank=True, null=True)
    image = models.TextField(blank=True, null=True)
    cake_size = models.ForeignKey('CakeSize', models.DO_NOTHING, db_column='cake_size_ID')  # Field name made lowercase.
    cake_shape = models.ForeignKey('CakeShape', models.DO_NOTHING, db_column='cake_shape_ID')  # Field name made lowercase.
    cake_coverage = models.ForeignKey('CakeCoverage', models.DO_NOTHING, db_column='cake_coverage_ID')  # Field name made lowercase.
    cake_topping = models.ForeignKey('CakeTopping', models.DO_NOTHING, db_column='cake_topping_ID')  # Field name made lowercase.
    cake_addition = models.ForeignKey('CakeAddition', models.DO_NOTHING, db_column='cake_addition_ID')  # Field name made lowercase.

    class Meta:
        db_table = 'Cake'


class CakeAddition(models.Model):
    cake_addition_id = models.AutoField(db_column='cake_addition_ID', primary_key=True)  # Field name made lowercase.
    ingridient = models.TextField(unique=True)
    cost_per_gram = models.IntegerField()
    primary_color = models.TextField()
    secondary_color = models.TextField()

    class Meta:
        db_table = 'Cake_addition'


class CakeCoverage(models.Model):
    cake_coverage_id = models.AutoField(db_column='Cake_coverage_ID', primary_key=True)  # Field name made lowercase.
    ingridient = models.TextField(unique=True)
    cost_per_gram = models.IntegerField()
    density = models.IntegerField()
    primary_color = models.TextField()
    secondary_color = models.TextField()

    class Meta:
        db_table = 'Cake_coverage'


class CakeShape(models.Model):
    cake_shape_id = models.AutoField(db_column='cake_shape_ID', primary_key=True)  # Field name made lowercase.
    shape = models.TextField(unique=True)
    cost = models.IntegerField()

    class Meta:
        db_table = 'Cake_shape'


class CakeSize(models.Model):
    cake_size_id = models.AutoField(db_column='cake_size_ID', primary_key=True)  # Field name made lowercase.
    type = models.TextField(unique=True)
    base_area = models.IntegerField(unique=True)

    class Meta:
        db_table = 'Cake_size'


class CakeStructure(models.Model):
    cake = models.ForeignKey(Cake, models.DO_NOTHING, db_column='cake_ID')  # Field name made lowercase.
    layer = models.ForeignKey('Layer', models.DO_NOTHING, db_column='layer_ID')  # Field name made lowercase.
    cake_structure_id = models.AutoField(db_column='cake_structure_ID', primary_key=True)  # Field name made lowercase.

    class Meta:
        db_table = 'Cake_structure'


class CakeTopping(models.Model):
    cake_topping_id = models.AutoField(db_column='Cake_topping_ID', primary_key=True)  # Field name made lowercase.
    ingridient = models.TextField(unique=True)
    cost_per_gram = models.IntegerField()
    density = models.IntegerField()
    primary_color = models.TextField()
    secondary_color = models.TextField()

    class Meta:
        db_table = 'Cake_topping'


class Layer(models.Model):
    layer_id = models.AutoField(db_column='layer_ID', primary_key=True)  # Field name made lowercase.
    layer_filling = models.ForeignKey('LayerFilling', models.DO_NOTHING, db_column='layer_filling_ID')  # Field name made lowercase.
    layer_base = models.ForeignKey('LayerBase', models.DO_NOTHING, db_column='layer_base_ID')  # Field name made lowercase.

    class Meta:
        db_table = 'Layer'


class LayerBase(models.Model):
    layer_base_id = models.AutoField(db_column='layer_base_ID', primary_key=True)  # Field name made lowercase.
    ingridient = models.TextField(unique=True)
    cost_per_gram = models.IntegerField()
    density = models.IntegerField()
    primary_color = models.TextField()
    secondary_color = models.TextField()

    class Meta:
        db_table = 'Layer_base'


class LayerFilling(models.Model):
    layer_filling_id = models.AutoField(db_column='layer_filling_ID', primary_key=True)  # Field name made lowercase.
    ingridient = models.TextField(unique=True)
    cost_per_gram = models.IntegerField()
    density = models.IntegerField()
    primary_color = models.TextField()
    secondary_color = models.TextField()

    class Meta:
        db_table = 'Layer_filling'


class Order(models.Model):
    order_id = models.AutoField(db_column='order_ID', primary_key=True)  # Field name made lowercase.
    date = models.TextField()
    delivery_date = models.TextField()
    price = models.FloatField()
    delivery_address = models.TextField()
    status = models.IntegerField()
    user = models.ForeignKey('User', models.DO_NOTHING, db_column='user_ID')  # Field name made lowercase.

    class Meta:
        db_table = 'Order'


class OrderContent(models.Model):
    order = models.ForeignKey(Order, models.DO_NOTHING, db_column='order_ID')  # Field name made lowercase.
    cake = models.ForeignKey(Cake, models.DO_NOTHING, db_column='cake_ID')  # Field name made lowercase.
    order_content_id = models.AutoField(db_column='order_content_ID', primary_key=True)  # Field name made lowercase.

    class Meta:
        db_table = 'Order_content'


class User(models.Model):
    user_id = models.AutoField(db_column='user_ID', primary_key=True)  # Field name made lowercase.
    first_name = models.TextField()
    password = models.TextField()
    email = models.TextField(unique=True)
    last_name = models.TextField()
    date_birth = models.TextField()
    phone_number = models.TextField(unique=True)
    is_superuser = models.IntegerField()

    class Meta:
        db_table = 'User'
