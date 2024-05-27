from django.contrib import admin
from .models import Cake, CakeAddition, CakeCoverage, CakeShape, CakeSize, CakeStructure, CakeTopping, Layer, LayerBase, LayerFilling, Order, OrderContent, User

admin.site.register(Cake)
admin.site.register(CakeAddition)
admin.site.register(CakeCoverage)
admin.site.register(CakeShape)
admin.site.register(CakeSize)
admin.site.register(CakeStructure)
admin.site.register(CakeTopping)
admin.site.register(Layer)
admin.site.register(LayerBase)
admin.site.register(LayerFilling)
admin.site.register(Order)
admin.site.register(OrderContent)
admin.site.register(User)
