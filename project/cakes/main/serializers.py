from rest_framework import serializers
from .models import LayerBase, LayerFilling, CakeSize, CakeShape, CakeTopping, CakeAddition, CakeCoverage, Layer, Cake, CakeStructure

class LayerBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = LayerBase
        fields = '__all__'

class LayerFillingSerializer(serializers.ModelSerializer):
    class Meta:
        model = LayerFilling
        fields = '__all__'

class CakeSizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CakeSize
        fields = '__all__'

class CakeShapeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CakeShape
        fields = '__all__'

class CakeToppingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CakeTopping
        fields = '__all__'

class CakeAdditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CakeAddition
        fields = '__all__'

class CakeCoverageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CakeCoverage
        fields = '__all__'

class LayerSerializer(serializers.ModelSerializer):
    layer_base = LayerBaseSerializer()
    layer_filling = LayerFillingSerializer()

    class Meta:
        model = Layer
        fields = '__all__'

class CakeStructureSerializer(serializers.ModelSerializer):
    layer = LayerSerializer()

    class Meta:
        model = CakeStructure
        fields = '__all__'

class CakeSerializer(serializers.ModelSerializer):
    cake_shape = CakeShapeSerializer()
    cake_topping = CakeToppingSerializer(default=4)
    cake_coverage = CakeCoverageSerializer(default=4)
    cake_addition = CakeAdditionSerializer(default=5)
    cake_addition_perimeter = CakeAdditionSerializer(default=6)
    cake_structure = CakeStructureSerializer(many=True, source='cakestructure_set')

    class Meta:
        model = Cake
        fields = '__all__'