const { createApp, nextTick } = Vue;
const { OrbitControls } = THREE;
const { DragControls } = THREE;
const { GLTFLoader } = THREE;
const { OBJLoader } = THREE;
const { TGALoader } = THREE;
const { FontLoader } = THREE;
const { TextGeometry } = THREE;

const CDN_BASE_URL = '/static/main/assets/';

createApp({
  delimiters: ['[[', ']]'],
  data() {
    return {
      toppingModel: null,
      trinketModel: null,
      currentTopping: 'none',
      currentCover: 'none',
      currentShape: 'круглый',

      currentFont: 'Miama',
      currentSize: 2,
      cakeLayers: [],
      cakeCovers: [],
      cakeDrips: [],
      trinkets: [],
      objectsToDrag: [],
      selectedObject: null,
      rotatingObject: null,
      initialMouseX: null,
      initialRotationZ: null,
      imageObject: null,
      textObject: null,
      textContent: '',
      textSize: 0.4,
      textColor: '#000000',
      textOutlineColor: '#ffffff',
      initialTrinketScale: null,
      trinketMode: 'single',
      imageHandle: document.createElement('div'),
      textHandle: document.createElement('div'),
      animationFrameId: null,
      numberOfLayers: 1,
      bases: [],
      fillings: [],
      shapes: [],
      sizes: [],
      toppings: [],
      covers: [],
      decorations: [],
      cakeWeight: 0,
      cakeCost: 0,
      layerDiameter: 0,
      cakeJson: '',
      defaultCenterTrinket: 'none',  // Установите значение по умолчанию для центра
      defaultPerimeterTrinket: 'None',  // Установите значение по умолчанию для периметра
      currentCenterTrinket: 'none',  // Установите значение по умолчанию для центра
      currentPerimeterTrinket: 'None'  // Установите значение по умолчанию для периметра

    };
  },

  computed: {
    centerDecorations() {
      return this.decorations.filter(decoration => decoration.amount === 1);
    },
    perimeterDecorations() {
      return this.decorations.filter(decoration => decoration.amount === 2);
    }
  },

  mounted() {
    nextTick(() => {
      this.fetchCakeData();
//      this.sendTestCakeToCart();

    });
  },
  beforeUnmount() {
    cancelAnimationFrame(this.animationFrameId);
  },
  methods: {
    getCookie(name) {
      let cookieValue = null;
      if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.substring(0, name.length + 1) === (name + '=')) {
            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
            break;
          }
        }
      }
      return cookieValue;
    },
  initializeDefaultValues() {
    // Инициализация значений по умолчанию
    this.currentCenterTrinket = this.centerDecorations.length > 0 ? this.centerDecorations[1].ingridient : 'none';
    this.currentPerimeterTrinket = this.perimeterDecorations.length > 0 ? this.perimeterDecorations[3].ingridient : 'none';
  },

        async fetchCakeData() {
    try {
      const response = await axios.get('/api/cake-components/');
      const data = response.data;

      if (!data.bases || !data.fillings || !data.shapes || !data.toppings || !data.covers || !data.trinkets) {
        throw new Error('Invalid data structure received from API.');
      }

      this.sizes = data.sizes;
      this.bases = data.bases.map(base => ({ ...base, primary_color: this.addSharpIfNeeded(base.primary_color) }));
      this.fillings = data.fillings.map(filling => ({ ...filling, primary_color: this.addSharpIfNeeded(filling.primary_color) }));
      this.shapes = data.shapes;
      this.toppings = data.toppings.map(topping => ({ ...topping, primary_color: this.addSharpIfNeeded(topping.primary_color) }));
      this.covers = data.covers.map(cover => ({ ...cover, primary_color: this.addSharpIfNeeded(cover.primary_color) }));
      this.decorations = data.trinkets.map(trinket => ({
        ...trinket,
        primary_color: this.addSharpIfNeeded(trinket.primary_color),
        positionOffset: parseFloat(trinket.position_offset) || 0
      }));

      console.log("Bases:", this.bases);
      console.log("Fillings:", this.fillings);
      console.log("Shapes:", this.shapes);
      console.log("Toppings:", this.toppings);
      console.log("Covers:", this.covers);
      console.log("Decorations:", this.decorations);

      // Установим значение размера по умолчанию
      if (this.sizes.length > 0) {
        this.currentSize = this.sizes[0].cake_size_id;
      }

      nextTick(() => {
        this.initThreeJS();
        this.startAnimation();
      });
    } catch (error) {
      console.error('There was an error fetching the cake data!', error);
    }
  },

  async updateCake() {
    const layers = parseInt(this.numberOfLayers);

    const bases = [];
    const fillings = [];

    for (let i = 1; i <= layers; i++) {
      const base = document.getElementById(`base${i}`).value;
      const filling = document.getElementById(`filling${i}`).value;
      bases.push(base);
      fillings.push(filling);
    }

    this.createCake(layers, this.currentShape, bases, fillings);

    const cakeLayers = this.cakeLayers.map((layer, index) => {
      console.log(`Layer ${index + 1}: Shape: ${this.currentShape}, Radius: ${this.getShapeRadius(layer)}, Base Color: ${bases[index]}, Filling Color: ${fillings[index]}`);
      return {
        shape: this.currentShape,
        radius: this.getShapeRadius(layer),
        height: 1,
        baseColor: bases[index],
        fillingColor: fillings[index]
      };
    });

    this.cakeJson = this.serializeCake(cakeLayers, bases, fillings);
    console.log(this.cakeJson);

    await this.loadDecoration();

    // Вызываем функцию для расчета веса и стоимости после обновления торта
    this.calculateCakeWeightAndCost();
  },



    sendTestCakeToCart() {
    const testCakeJson = {
        weight: 1500,
        cost: 500,
        layers_count: 3,
        text: "Happy Birthday!",
        name: "Test Cake",
        constructor_image: "test_image.png",
        preview_image: "test_preview.png",
        cake_size: 1,
        cake_shape: 1,
        cake_coverage: 1,
        cake_topping: 1,
        cake_addition: 5, // Исправлено значение
        cake_addition_perimeter: 6, // Указываем null для украшений по периметру
        layers: [
            {
                base: 1,
                filling: 1
            },
            {
                base: 2,
                filling: 2
            },
            {
                base: 3,
                filling: 3
            }
        ]
    };

    console.log("Отправляем тестовый торт в корзину:", testCakeJson); // Отладочное сообщение

    axios.post('/cart/add/', testCakeJson, {
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCookie('csrftoken')
        }
    })
    .then(response => {
        console.log("Ответ сервера:", response.data);
        alert('Тестовый торт добавлен в корзину');
    })
    .catch(error => {
        console.error("Ошибка при добавлении торта в корзину:", error);
        if (error.response) {
            console.error("Ответ сервера:", error.response.data);
        }
        alert('Произошла ошибка при добавлении тестового торта в корзину');
    });
},
async saveScreenshotToServer() {
          const tempScene = new THREE.Scene();

          if (this.imageObject) tempScene.add(this.imageObject.clone());
          if (this.textObject) tempScene.add(this.textObject.clone());

          const originalCameraPosition = this.camera.position.clone();
          const originalCameraRotation = this.camera.rotation.clone();

          const topLayer = this.cakeLayers[this.cakeLayers.length - 1];
          this.camera.position.set(0, topLayer.position.y + 10, 0);
          this.camera.lookAt(0, topLayer.position.y, 0);

          this.camera.updateProjectionMatrix();

          this.renderer.render(tempScene, this.camera);
          const dataURL = this.renderer.domElement.toDataURL('image/png');

          this.camera.position.copy(originalCameraPosition);
          this.camera.rotation.copy(originalCameraRotation);
          this.camera.updateProjectionMatrix();

          const fileName = `screenshot_${Date.now()}.png`;

          const blob = this.dataURLtoBlob(dataURL);

          const formData = new FormData();
          formData.append('file', blob, fileName);

          const response = await fetch('/save-screenshot/', {
            method: 'POST',
            body: formData,
          });

          const filePath = await response.text();

          return filePath;
        },

        dataURLtoBlob(dataURL) {
          const arr = dataURL.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          return new Blob([u8arr], { type: mime });
        },
/*
    addToCart() {
      const cakeData = JSON.parse(this.cakeJson);

      const cakeSize = this.sizes.find(size => size.type === cakeData.currentSize);
      const cakeShape = this.shapes.find(shape => shape.shape === cakeData.currentShape);
      const cakeCover = this.covers.find(cover => cover.ingridient === cakeData.currentCover);
      const cakeTopping = this.toppings.find(topping => topping.ingridient === cakeData.currentTopping);
      const cakeTrinket = this.decorations.find(trinket => trinket.ingridient === (cakeData.currentCenterTrinket || cakeData.currentPerimeterTrinket));

      const layers = cakeData.cakeLayers.map((layer) => {
        const base = this.bases.find(base => base.primary_color === layer.baseColor);
        const filling = this.fillings.find(filling => filling.primary_color === layer.fillingColor);

        return {
          base: base ? base.layer_base_id : null,
          filling: filling ? filling.layer_filling_id : null
        };
      });

      const cake = {
        weight: this.cakeWeight || 0,
        cost: this.cakeCost || 0,
        layers_count: cakeData.numberOfLayers || 1,
        text: cakeData.textContent || "",
        name: this.cakeName || "Cake",
        constructor_image: this.constructorImage || "default_image",
        preview_image: this.previewImage || "default_image",
        cake_size: cakeSize ? cakeSize.cake_size_id : null,
        cake_shape: cakeShape ? cakeShape.cake_shape_id : null,
        cake_coverage: cakeCover ? cakeCover.cake_coverage_id : null,
        cake_topping: cakeTopping ? cakeTopping.cake_topping_id : null,
        cake_addition: cakeTrinket ? cakeTrinket.cake_addition_id : null,
        layers: layers
      };

      console.log("Отправка торта в корзину: ", cake);

      axios.post('/cart/add/', cake, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCookie('csrftoken')
        }
      })
      .then(response => {
        console.log(response.data);
        alert('Торт добавлен в корзину');
      })
      .catch(error => {
        console.error(error);
        if (error.response) {
          console.error("Ответ сервера: ", error.response.data);
        }
        alert('Произошла ошибка при добавлении торта в корзину');
      });
    },*/
/*
addToCart() {
  const cakeData = JSON.parse(this.cakeJson);

  const cakeSize = this.sizes.find(size => size.type === cakeData.currentSize);
  const cakeShape = this.shapes.find(shape => shape.shape === cakeData.currentShape);
  const cakeCover = this.covers.find(cover => cover.ingridient === cakeData.currentCover);
  const cakeTopping = this.toppings.find(topping => topping.ingridient === cakeData.currentTopping);
  const cakeAddition = this.decorations.find(decoration => decoration.ingridient === (cakeData.currentCenterTrinket || this.defaultCenterTrinket));
  const cakeAdditionPerimeter = this.decorations.find(decoration => decoration.ingridient === (cakeData.currentPerimeterTrinket || this.defaultPerimeterTrinket));

  const layers = cakeData.cakeLayers.map((layer) => {
    const base = this.bases.find(base => base.primary_color === layer.baseColor);
    const filling = this.fillings.find(filling => filling.primary_color === layer.fillingColor);

    return {
      base: base ? base.layer_base_id : null,
      filling: filling ? filling.layer_filling_id : null
    };
  });

  const cake = {
    weight: this.cakeWeight || 0,
    cost: this.cakeCost || 0,
    layers_count: cakeData.numberOfLayers || 1,
    text: cakeData.textContent || "",
    name: this.cakeName || "Cake",
    constructor_image: this.constructorImage || "default_image",
    preview_image: this.previewImage || "default_image",
    cake_size: cakeSize ? cakeSize.cake_size_id : null,
    cake_shape: cakeShape ? cakeShape.cake_shape_id : null,
    cake_coverage: cakeCover ? cakeCover.cake_coverage_id : null,
    cake_topping: cakeTopping ? cakeTopping.cake_topping_id : null,

    cake_addition: this.currentCenterTrinket || null,
    cake_addition_perimeter: this.currentPerimeterTrinket || null,
    layers: layers
  };

  console.log("Отправка торта в корзину: ", cake);

  axios.post('/cart/add/', cake, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': this.getCookie('csrftoken')
    }
  })
  .then(response => {
    console.log(response.data);
    alert('Торт добавлен в корзину');
  })
  .catch(error => {
    console.error(error);
    if (error.response) {
      console.error("Ответ сервера: ", error.response.data);
    }
    alert('Произошла ошибка при добавлении торта в корзину');
  });
},*/

/*
addToCart() {
    const cakeData = {
        weight: this.cakeWeight || 0,
        cost: this.cakeCost || 0,
        layers_count: this.numberOfLayers || 1,
        text: this.textContent || "",
        name: this.cakeName || "Cake",
        constructor_image: this.constructorImage || "default_image",
        preview_image: this.previewImage || "default_image",
        cake_size: this.cakeSizeId || null,
        cake_shape: this.cakeShapeId || null,
        cake_coverage: this.cakeCoverageId || null,
        cake_topping: this.cakeToppingId || null,
        cake_addition: this.currentCenterTrinket || null,
        cake_addition_perimeter: this.currentPerimeterTrinket || null,
        layers: this.layers || []
    };

    axios.post('/cart/add/', cakeData, {
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCookie('csrftoken')
        }
    })
    .then(response => {
        console.log(response.data);
        alert('Торт добавлен в корзину');
    })
    .catch(error => {
        console.error(error);
        if (error.response) {
            console.error("Ответ сервера: ", error.response.data);
        }
        alert('Произошла ошибка при добавлении торта в корзину');
    });
},*/
/*
addToCart() {
  const cakeData = JSON.parse(this.cakeJson);

  const cakeSize = this.sizes.find(size => size.type === cakeData.currentSize);
  const cakeShape = this.shapes.find(shape => shape.shape === cakeData.currentShape);
  const cakeCover = this.covers.find(cover => cover.ingridient === cakeData.currentCover);
  const cakeTopping = this.toppings.find(topping => topping.ingridient === cakeData.currentTopping);

  // Получаем ID украшений
  const cakeAddition = this.decorations.find(trinket => trinket.ingridient === this.currentCenterTrinket);
  const cakeAdditionPerimeter = this.decorations.find(trinket => trinket.ingridient === this.currentPerimeterTrinket);

  const layers = cakeData.cakeLayers.map((layer) => {
    const base = this.bases.find(base => base.primary_color === layer.baseColor);
    const filling = this.fillings.find(filling => filling.primary_color === layer.fillingColor);

    return {
      base: base ? base.layer_base_id : null,
      filling: filling ? filling.layer_filling_id : null
    };
  });

  const cake = {
    weight: this.cakeWeight || 0,
    cost: this.cakeCost || 0,
    layers_count: cakeData.numberOfLayers || 1,
    text: cakeData.textContent || "",
    name: this.cakeName || "Cake",
    constructor_image: this.constructorImage || "default_image",
    preview_image: this.previewImage || "default_image",
    cake_size: cakeSize ? cakeSize.cake_size_id : null,
    cake_shape: cakeShape ? cakeShape.cake_shape_id : null,
    cake_coverage: cakeCover ? cakeCover.cake_coverage_id : null,
    cake_topping: cakeTopping ? cakeTopping.cake_topping_id : null,
    cake_addition: cakeAddition ? cakeAddition.cake_addition_id : null,
    cake_addition_perimeter: cakeAdditionPerimeter ? cakeAdditionPerimeter.cake_addition_id : null,
    layers: layers
  };

  console.log("Отправка торта в корзину: ", cake);

  axios.post('/cart/add/', cake, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': this.getCookie('csrftoken')
    }
  })
  .then(response => {
    console.log(response.data);
    alert('Торт добавлен в корзину');
  })
  .catch(error => {
    console.error(error);
    if (error.response) {
      console.error("Ответ сервера: ", error.response.data);
    }
    alert('Произошла ошибка при добавлении торта в корзину');
  });
},*/
/*
addToCart() {
    const cakeData = JSON.parse(this.cakeJson);

    const cakeSize = this.sizes.find(size => size.type === cakeData.currentSize);
    const cakeShape = this.shapes.find(shape => shape.shape === cakeData.currentShape);
    const cakeCover = this.covers.find(cover => cover.ingridient === cakeData.currentCover);
    const cakeTopping = this.toppings.find(topping => topping.ingridient === cakeData.currentTopping);
    const cakeTrinketCenter = this.decorations.find(trinket => trinket.ingridient === cakeData.currentCenterTrinket);
    const cakeTrinketPerimeter = this.decorations.find(trinket => trinket.ingridient === cakeData.currentPerimeterTrinket);

    const layers = cakeData.cakeLayers.map((layer) => {
        const base = this.bases.find(base => base.primary_color === layer.baseColor);
        const filling = this.fillings.find(filling => filling.primary_color === layer.fillingColor);

        return {
            base: base ? base.layer_base_id : null,
            filling: filling ? filling.layer_filling_id : null
        };
    });

    const cake = {
        weight: this.cakeWeight || 0,
        cost: parseFloat(this.cakeCost) || 0,
        layers_count: cakeData.numberOfLayers || 1,
        text: cakeData.textContent || "",
        name: this.cakeName || "Cake",
        constructor_image: this.constructorImage || "default_image",
        preview_image: this.previewImage || "default_image",
        cake_size: cakeSize ? cakeSize.cake_size_id : null,
        cake_shape: cakeShape ? cakeShape.cake_shape_id : null,
        cake_coverage: cakeCover ? cakeCover.cake_coverage_id : null,
        cake_topping: cakeTopping ? cakeTopping.cake_topping_id : null,
        cake_addition: cakeTrinketCenter ? cakeTrinketCenter.cake_addition_id : null,
        cake_addition_perimeter: cakeTrinketPerimeter ? cakeTrinketPerimeter.cake_addition_id : null,
        layers: layers
    };

    // Логируем данные перед отправкой
    console.log("Отправка торта в корзину: ", cake);

    axios.post('/cart/add/', cake, {
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCookie('csrftoken')
        }
    })
    .then(response => {
        console.log(response.data);
        alert('Торт добавлен в корзину');
    })
    .catch(error => {
        console.error(error);
        if (error.response) {
            console.error("Ответ сервера: ", error.response.data);
        }
        alert('Произошла ошибка при добавлении торта в корзину');
    });
},*/

addToCart() {
    const cakeData = JSON.parse(this.cakeJson);

    const cakeSize = this.sizes.find(size => size.cake_size_id == this.currentSize);
    const cakeShape = this.shapes.find(shape => shape.shape === this.currentShape);
    const cakeCover = this.covers.find(cover => cover.ingridient === this.currentCover);
    const cakeTopping = this.toppings.find(topping => topping.ingridient === this.currentTopping);
    const cakeAddition = this.decorations.find(decoration => decoration.ingridient === (this.currentCenterTrinket || this.defaultCenterTrinket));
    const cakeAdditionPerimeter = this.decorations.find(decoration => decoration.ingridient === (this.currentPerimeterTrinket || this.defaultPerimeterTrinket));

    const layers = this.cakeLayers.map((layer, index) => {
      const base = this.bases.find(base => base.primary_color === layer.baseColor);
      const filling = this.fillings.find(filling => filling.primary_color === layer.fillingColor);

      return {
        base: base ? base.layer_base_id : null,
        filling: filling ? filling.layer_filling_id : null
      };
    });
    this.constructorImage = this.saveScreenshotToServer();

    const cake = {
      weight: parseFloat(this.cakeWeight) || 0,
      cost: parseFloat(this.cakeCost) || 0,
      layers_count: cakeData.numberOfLayers || 1,
      text: cakeData.textContent || "",
      name: this.cakeName || "Cake",
      constructor_image: this.constructorImage || "default_image",
      preview_image: this.previewImage || "default_image",
      cake_size: cakeSize ? cakeSize.cake_size_id : null,
      cake_shape: cakeShape ? cakeShape.cake_shape_id : null,
      cake_coverage: cakeCover ? cakeCover.cake_coverage_id : null,
      cake_topping: cakeTopping ? cakeTopping.cake_topping_id : null,
      cake_addition: cakeAddition ? cakeAddition.cake_addition_id : null,
      cake_addition_perimeter: cakeAdditionPerimeter ? cakeAdditionPerimeter.cake_addition_id : null,
      layers: layers
    };

    console.log("Отправка торта в корзину: ", cake);

    axios.post('/cart/add/', cake, {

      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': this.getCookie('csrftoken')
      }
    })
    .then(response => {
      console.log(response.data);
      alert('Торт добавлен в корзину');
    })
    .catch(error => {
      console.error(error);
      if (error.response) {
        console.error("Ответ сервера: ", error.response.data);
      }
      alert('Произошла ошибка при добавлении торта в корзину');
    });
  },


  calculateCakeWeightAndCost() {
    const cake_size = this.sizes.find(size => size.cake_size_id == this.currentSize);
    const cake_coverage = this.covers.find(cover => cover.ingridient === this.currentCover);
    const cake_topping = this.toppings.find(topping => topping.ingridient === this.currentTopping);
    const layers_count = this.numberOfLayers;

    console.log('Размер торта:', cake_size);
    console.log('Покрытие торта:', cake_coverage);
    console.log('Топпинг торта:', cake_topping);
    console.log('Количество слоев:', layers_count);

    if (!cake_size || !cake_coverage || !cake_topping || layers_count <= 0) {
      console.error('Некоторые данные торта отсутствуют или некорректны');
      return;
    }

    const Vc = cake_size.base_area || 0;
    const Vt = Vc * 0.1;
    const Vl = Vc * 0.5;
    const Vb = Vc * 0.1;
    const Vcov = Vc * 0.1;

    const pc = parseFloat(cake_coverage.density || 0) / 1000;
    const pt = parseFloat(cake_topping.density || 0) / 1000;

    const Mc = pc * Vcov;
    const Mt = pt * Vt;

    console.log('Объем и плотность:', { Vc, Vt, Vl, Vb, pc, pt });
    console.log('Начальная масса покрытия и топпинга:', { Mc, Mt });

    let Ml = 0;
    let Sl = 0;

    for (let i = 1; i <= layers_count; i++) {
      const baseColor = document.getElementById(`base${i}`).value;
      const fillingColor = document.getElementById(`filling${i}`).value;

      const base = this.bases.find(b => b.primary_color === baseColor);
      const filling = this.fillings.find(f => f.primary_color === fillingColor);

      if (!base || !filling) {
        console.error(`Ошибка: база или начинка не найдены для слоя ${i}`);
        continue;
      }

      const pf = parseFloat(filling.density) / 1000;
      const pb = parseFloat(base.density) / 1000;

      const df = parseFloat(filling.cost_per_gram);
      const db = parseFloat(base.cost_per_gram);

      console.log('Данные слоя:', { base, filling, pf, pb, df, db });

      Ml += (pf * Vl + pb * Vb);
      Sl += (pf * Vl * df + pb * Vb * db);
    }

    Ml *= layers_count;

    console.log('Масса и стоимость слоев:', { Ml, Sl });

    let M_add = 0;
    let d_add = 0;

    if (this.currentCenterTrinket !== 'none') {
      const centerTrinket = this.decorations.find(d => d.ingridient === this.currentCenterTrinket);
      if (centerTrinket) {
        const centerTrinketMass = parseFloat(centerTrinket.cost_per_gram) * 25 / 100;
        const centerTrinketCost = parseFloat(centerTrinket.cost_per_gram) * 25;
        M_add += centerTrinketMass;
        d_add += centerTrinketCost;
        console.log('Масса и стоимость центрального украшения:', { centerTrinketMass, centerTrinketCost });
      }
    }

    if (this.currentPerimeterTrinket !== 'none') {
      const perimeterTrinket = this.decorations.find(d => d.ingridient === this.currentPerimeterTrinket);
      if (perimeterTrinket) {
        const perimeterTrinketMass = parseFloat(perimeterTrinket.cost_per_gram) * 25 / 100;
        const perimeterTrinketCost = parseFloat(perimeterTrinket.cost_per_gram) * 25;
        M_add += perimeterTrinketMass;
        d_add += perimeterTrinketCost;
        console.log('Масса и стоимость украшений по периметру:', { perimeterTrinketMass, perimeterTrinketCost });
      }
    }

    const total_weight = Mc + Mt + Ml + M_add;
    console.log('Общая масса торта:', total_weight);

    const dc = parseFloat(cake_coverage.cost_per_gram);
    const dt = parseFloat(cake_topping.cost_per_gram);

    const S = Mc * dc + Mt * dt + Sl + d_add;
    const total_cost = S;
    console.log('Общая стоимость торта:', total_cost);

    let sizeMultiplier = 1;
    if (cake_size.cake_size_id == 1) {
      sizeMultiplier = 1.5;
    } else if (cake_size.cake_size_id == 2) {
      sizeMultiplier = 1.25;
    }

    this.cakeWeight = Math.round(total_weight * sizeMultiplier);
    this.cakeCost = Math.round(total_cost * sizeMultiplier);

    console.log('Итоговые вес и стоимость торта:', { cakeWeight: this.cakeWeight, cakeCost: this.cakeCost });
  },



  async fetchCakeData() {
    try {
        const response = await axios.get('/api/cake-components/');
        const data = response.data;

        if (!data.bases || !data.fillings || !data.shapes || !data.toppings || !data.covers || !data.trinkets) {
            throw new Error('Invalid data structure received from API.');
        }

        this.sizes = data.sizes;
        this.bases = data.bases.map(base => ({
            ...base,
            primary_color: this.addSharpIfNeeded(base.primary_color)
        }));
        this.fillings = data.fillings.map(filling => ({
            ...filling,
            primary_color: this.addSharpIfNeeded(filling.primary_color)
        }));
        this.shapes = data.shapes;
        this.toppings = data.toppings.map(topping => ({
            ...topping,
            primary_color: this.addSharpIfNeeded(topping.primary_color)
        }));
        this.covers = data.covers.map(cover => ({
            ...cover,
            primary_color: this.addSharpIfNeeded(cover.primary_color)
        }));
        this.decorations = data.trinkets.map(trinket => ({
            ...trinket,
            primary_color: this.addSharpIfNeeded(trinket.primary_color),
            positionOffset: parseFloat(trinket.position_offset) || 0
        }));

        console.log("Bases:", this.bases);
        console.log("Fillings:", this.fillings);
        console.log("Shapes:", this.shapes);
        console.log("Toppings:", this.toppings);
        console.log("Covers:", this.covers);
        console.log("Decorations:", this.decorations);

        nextTick(() => {
            this.initThreeJS();
            this.startAnimation();
        });
    } catch (error) {
        console.error('There was an error fetching the cake data!', error);
    }
},

    async addTrinkets() {
      this.removeCenterTrinket();
      this.removePerimeterTrinkets();

      if (this.currentCenterTrinket !== 'none') {
        await this.addCenterTrinket();
      }

      if (this.currentPerimeterTrinket !== 'none') {
        await this.addPerimeterTrinkets();
      }
    },

    initThreeJS() {
      this.initScene();
      this.initCamera();
      this.initRenderer();
      this.initLights();
      this.initControls();
      this.initDragControls();
      this.setupHandles();

      this.updateLayerControls();
      this.updateCake();
    },
    initScene() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xfff8e3);
    },
    initCamera() {
      this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight * 0.5, 0.1, 1000);
      this.camera.position.set(0, 5, 5);
    },
    initRenderer() {
      this.renderer = new THREE.WebGLRenderer({ alpha: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight * 0.91);
      document.getElementById('threejs-container').appendChild(this.renderer.domElement);
    },
    initLights() {
      const ambientLight = new THREE.AmbientLight(0x404040);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 5, 5).normalize();
      this.scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0xffffff, 1, 100);
      pointLight.position.set(10, 10, 10);
      this.scene.add(pointLight);
    },
    initControls() {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.25;
      this.controls.screenSpacePanning = false;
      this.controls.maxPolarAngle = Math.PI / 2;
    },
    initDragControls() {
      this.dragControls = new DragControls(this.objectsToDrag, this.camera, this.renderer.domElement);
      this.dragControls.addEventListener('dragstart', (event) => {
        this.controls.enabled = false;
        this.selectedObject = event.object;
        this.updateHandlesVisibility();
      });
      this.dragControls.addEventListener('dragend', (event) => {
        this.controls.enabled = true;
        this.adjustPositionAfterDrag(event.object);
        this.selectedObject = null;
        this.updateHandlesVisibility();
      });
    },
    setupHandles() {
      this.imageHandle.style.width = '20px';
      this.imageHandle.style.height = '20px';
      this.imageHandle.style.background = 'blue';
      this.imageHandle.style.position = 'absolute';
      this.imageHandle.style.cursor = 'pointer';
      this.imageHandle.style.borderRadius = '50%';
      this.imageHandle.style.display = 'none';
      document.body.appendChild(this.imageHandle);

      this.textHandle.style.width = '20px';
      this.textHandle.style.height = '20px';
      this.textHandle.style.background = 'red';
      this.textHandle.style.position = 'absolute';
      this.textHandle.style.cursor = 'pointer';
      this.textHandle.style.borderRadius = '50%';
      this.textHandle.style.display = 'none';
      document.body.appendChild(this.textHandle);

      this.imageHandle.addEventListener('mousedown', this.startRotation);
      this.textHandle.addEventListener('mousedown', this.startRotation);

      window.addEventListener('mousemove', this.rotateObject);
      window.addEventListener('mouseup', this.stopRotation);
    },
    startRotation(event) {
      if (event.target === this.imageHandle) {
        this.rotatingObject = this.imageObject;
      } else if (event.target === this.textHandle) {
        this.rotatingObject = this.textObject;
      }
      this.initialMouseX = event.clientX;
      if (this.rotatingObject) {
        this.initialRotationZ = this.rotatingObject.rotation.z;
      }
    },
    rotateObject(event) {
      if (this.rotatingObject) {
        const deltaX = event.clientX - this.initialMouseX;
        this.rotatingObject.rotation.z = this.initialRotationZ + deltaX * 0.01;
      }
    },
    stopRotation() {
      this.rotatingObject = null;
    },
    updateHandlesVisibility() {
      if (this.imageObject && this.imageObject.visible) {
        const screenPos = this.toScreenPosition(this.imageObject, this.camera);
        this.imageHandle.style.left = `${screenPos.x + 30}px`;
        this.imageHandle.style.top = `${screenPos.y + 30}px`;
        this.imageHandle.style.display = 'block';
      } else {
        this.imageHandle.style.display = 'none';
      }
      if (this.textObject && this.textObject.visible) {
        const screenPos = this.toScreenPosition(this.textObject, this.camera);
        this.textHandle.style.left = `${screenPos.x + 30}px`;
        this.textHandle.style.top = `${screenPos.y + 30}px`;
        this.textHandle.style.display = 'block';
      } else {
        this.textHandle.style.display = 'none';
      }
    },
    loadGLTFModel(url, onLoadCallback) {
      const loader = new GLTFLoader();
      loader.load(url, (gltf) => {
        const model = gltf.scene;
        onLoadCallback(model);
      }, undefined, (error) => {
        console.error('Error loading GLTF model:', error);
      });
    },
    loadOBJModel(url, onLoadCallback) {
      const loader = new OBJLoader();
      loader.load(url, (obj) => {
        onLoadCallback(obj);
      }, undefined, (error) => {
        console.error('Error loading OBJ model:', error);
      });
    },
    adjustModelScaleAndPosition(model, isSingle, positionOffset = 0) {
      const boundingBox = new THREE.Box3().setFromObject(model);
      const size = boundingBox.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);
      const scaleFactor = 1 / maxDimension;
      model.scale.set(scaleFactor, scaleFactor, scaleFactor);
      const desiredSize = isSingle ? 1.25 : 0.75;
      model.scale.multiplyScalar(desiredSize);

      boundingBox.setFromObject(model);
      const modelHeight = boundingBox.getSize(new THREE.Vector3()).y;

      const group = new THREE.Group();
      group.add(model);

      model.position.y += modelHeight / 2 + positionOffset;

      return group;
    },
    createLayer(shape, radius, height, baseColor, fillingColor) {
      const group = new THREE.Group();
      const segmentHeight = height / 5;

      for (let i = 0; i < 5; i++) {
        let geometry;
        switch (shape) {
          case 'круглый':
            geometry = new THREE.CylinderGeometry(radius, radius, segmentHeight, 32);
            break;
          case 'квадратный':
            geometry = new THREE.BoxGeometry(radius * 2, segmentHeight, radius * 2);
            break;
          case 'шестиугольный':
            geometry = new THREE.CylinderGeometry(radius, radius, segmentHeight, 6);
            break;
          case 'звезда':
            geometry = this.createExtrudedShapeGeometry(this.createStarShape(radius), segmentHeight);
            geometry.rotateX(Math.PI / 2);
            break;
          case 'сердце':
            geometry = this.createExtrudedShapeGeometry(this.createHeartShape(radius), segmentHeight);
            geometry.rotateX(Math.PI / 2);
            break;

          case 'прямоугольный': // новый случай
            geometry = new THREE.BoxGeometry(radius * 2, segmentHeight, radius * 3);
            break;
          default:
            geometry = new THREE.CylinderGeometry(radius, radius, segmentHeight, 32);
        }
        const material = new THREE.MeshBasicMaterial({ color: (i % 2 === 0) ? baseColor : fillingColor });
        const mesh = new THREE.Mesh(geometry, material);

        if (shape === 'сердце') {
          const boundingBox = new THREE.Box3().setFromObject(mesh);
          const center = boundingBox.getCenter(new THREE.Vector3());
          mesh.position.set(-center.x, i * segmentHeight - height / 2 + segmentHeight / 2, -center.z);
        } else {
          mesh.position.y = i * segmentHeight - height / 2 + segmentHeight / 2;
        }
        if (shape === 'сердце' || shape === 'звезда') {
          group.position.y += 0.0; // ПОДНИМАЕМ ТОРТ ВВЕРХ ТОЛЬКО ДЛЯ СЕРДЦА И ЗВЕЗДЫ
        }
        group.add(mesh);
      }

      return group;
    },
    createStarShape(radius) {
      const shape = new THREE.Shape();
      const outerRadius = radius;
      const innerRadius = radius / 2;
      const numPoints = 5;
      const angleStep = (Math.PI * 2) / (numPoints * 2);

      shape.moveTo(outerRadius, 0);
      for (let i = 1; i < numPoints * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = i * angleStep;
        shape.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
      }
      shape.lineTo(outerRadius, 0);

      return shape;
    },
    createHeartShape(radius) {
      const shape = new THREE.Shape();
      const x = 0, y = 0;
      const scaleFactor = radius / 70;

      shape.moveTo(x, y);
      shape.bezierCurveTo(x - 25 * scaleFactor, y - 40 * scaleFactor, x - 70 * scaleFactor, y + 20 * scaleFactor, x, y + 55 * scaleFactor);
      shape.bezierCurveTo(x + 70 * scaleFactor, y + 20 * scaleFactor, x + 25 * scaleFactor, y - 40 * scaleFactor, x, y);

      return shape;
    },
    createExtrudedShapeGeometry(shape, height) {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: false
      });

      geometry.center(); // Центруем геометрию

      return geometry;
    },
    createHeartPerimeter(radius, pointsCount) {
      const scaleFactor = 1.65;
      const shape = this.createHeartShape(radius * scaleFactor);
      const spacedPoints = shape.getSpacedPoints(pointsCount);
      const zOffset = -0.5 * radius;

      spacedPoints.forEach(point => {
        point.y += zOffset;
      });
      return spacedPoints;
    },
    createCake(layers, shape, bases, fillings) {
      this.cakeLayers = [];
      this.cakeCovers = [];
      this.cakeDrips = [];
      this.objectsToDrag = [];

      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }

      const ambientLight = new THREE.AmbientLight(0x404040);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 5, 5).normalize();
      this.scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0xffffff, 1, 100);
      pointLight.position.set(10, 10, 10);
      this.scene.add(pointLight);

      const layerHeight = (shape === 'сердце' || shape === 'звезда') ? 1 : 1;    // ВЫСОТА УРОВНЯ
      const radii = shape === 'сердце' ? [3.5, 2.5, 1.5] : shape === 'звезда' ? [2.5, 2, 1.5] : shape === 'прямоугольный' ? [2.5, 2, 1.5] : [2, 1.5, 1];

      for (let i = 0; i < layers; i++) {
        const baseColor = bases[i];
        const fillingColor = fillings[i];
        const layer = this.createLayer(shape, radii[i], layerHeight, baseColor, fillingColor);
        layer.position.y = i * layerHeight;

        this.cakeLayers.push(layer);
        this.scene.add(layer);
      }

      nextTick(() => {
        this.applyCover();
        this.addTopping();
        this.reapplyDecorations();
        this.addTrinkets();

        this.dragControls = new DragControls(this.objectsToDrag, this.camera, this.renderer.domElement);
        this.dragControls.addEventListener('dragstart', (event) => {
          this.controls.enabled = false;
          this.selectedObject = event.object;
          this.updateHandlesVisibility();
        });
        this.dragControls.addEventListener('dragend', (event) => {
          this.controls.enabled = true;
          this.adjustPositionAfterDrag(event.object);
          this.selectedObject = null;
          this.updateHandlesVisibility();
        });
      });
    },

    getShapeRadius(layer) {
      const boundingBox = new THREE.Box3().setFromObject(layer);
      return boundingBox.max.x;
    },
    applyCover() {
      this.cakeCovers.forEach(cover => {
        this.scene.remove(cover);
      });
      this.cakeCovers = [];

      if (this.currentCover === 'none') {
        return;
      }

      const cover = this.covers.find(c => c.ingridient === this.currentCover);
      if (!cover) {
        return;
      }

      const coverColor = `${cover.primary_color}`;

      this.cakeLayers.forEach((layer, index) => {
        const coverLayer = layer.clone();
        coverLayer.scale.set(1.010, 1.010, 1.010);

        coverLayer.children.forEach(child => {
          if (child.material) {
            child.material = new THREE.MeshBasicMaterial({
              color: coverColor,
              transparent: true,
              opacity: 0.8
            });
          }
        });

        coverLayer.visible = true;
        this.scene.add(coverLayer);
        this.cakeCovers.push(coverLayer);
      });
    },
    findCoverColor(ingredient) {
      const cover = this.covers.find(c => c.ingridient === ingredient);
      return cover ? cover.primary_color : null;
    },
    async addTopping() {
      this.cakeDrips.forEach(drip => {
        this.scene.remove(drip);
      });
      this.cakeDrips = [];

      const generalZOffset = 0.57;

      if (this.currentTopping === 'none') {
        return;
      }

      const topping = this.toppings.find(t => t.ingridient === this.currentTopping);
      if (!topping) {
        return;
      }

      const dripColor = `${topping.primary_color}`;
      const texturePath = `${CDN_BASE_URL}${topping.texture_path}`;
      const dripTexture = new THREE.TextureLoader().load(texturePath);
      const dripNormalMap = new THREE.TextureLoader().load(texturePath.replace('.png', '_norm.png'));

      this.cakeLayers.forEach((layer, index) => {
        let radius = this.getShapeRadius(layer);
        const height = 0.5;
        let dripGeometry;

        if (this.currentShape === 'круглый') {
          radius *= 1.015;
          dripGeometry = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true);
        } else if (this.currentShape === 'квадратный') {
          radius *= 1.015;
          dripGeometry = new THREE.BoxGeometry(radius * 2, height, radius * 2);
        } else if (this.currentShape === 'шестиугольный') {
          radius *= 1.168;
          dripGeometry = new THREE.CylinderGeometry(radius, radius, height, 6, 1, true);
        } else if (this.currentShape === 'звезда') {
          radius *= 1.12;
          dripGeometry = this.createExtrudedShapeGeometry(this.createStarShape(radius), height);
          dripGeometry.rotateX(Math.PI / 2);
          this.adjustStarUVs(dripGeometry);
        } else if (this.currentShape === 'сердце') {
          radius *= 1.77;
          const newradius = radius * 1.07;
          dripGeometry = this.createExtrudedShapeGeometry(this.createHeartShape(newradius), height);
          dripGeometry.rotateX(Math.PI / 2);
          this.adjustHeartUVs(dripGeometry);
        } else if (this.currentShape === 'прямоугольный') {
          radius *= 1.015;
          dripGeometry = new THREE.BoxGeometry(radius * 2, height, radius * 3);
        }

        const repeats = [3, 3, 2];
        const repeatCount = repeats[index % repeats.length];
        dripTexture.wrapS = THREE.RepeatWrapping;
        dripTexture.wrapT = THREE.RepeatWrapping;
        if (this.currentShape === 'звезда') {
          dripTexture.repeat.set(repeatCount * 0.23, 1); // Уменьшаем количество повторений
        } else if (this.currentShape === 'сердце') {
          dripTexture.repeat.set(repeatCount * 0.35, 1); // Уменьшаем количество повторений для сердца
        } else {
          dripTexture.repeat.set(repeatCount, 1);
        }

        const dripMaterial = new THREE.MeshStandardMaterial({
          map: dripTexture,
          normalMap: dripNormalMap,
          color: dripColor,
          roughness: 0.5,
          metalness: 0.3,
          transparent: true,
          opacity: 0.95
        });
        const drip = new THREE.Mesh(dripGeometry, dripMaterial);
        drip.position.y = layer.position.y + layer.children[layer.children.length - 1].position.y - height / 3.5;
        if (this.currentShape === 'звезда') {
          drip.position.y += 0.0;
        }
        if (this.currentShape === 'сердце') {
          drip.position.y += 0.0;
        }

        this.cakeDrips.push(drip);
        this.scene.add(drip);

        let topGeometry;
        if (this.currentShape === 'круглый') {
          topGeometry = new THREE.CylinderGeometry(radius, radius, 0.05, 32);
        } else if (this.currentShape === 'квадратный') {
          topGeometry = new THREE.BoxGeometry(radius * 2, 0.05, radius * 2);
        } else if (this.currentShape === 'шестиугольный') {
          topGeometry = new THREE.CylinderGeometry(radius, radius, 0.05, 6);
        } else if (this.currentShape === 'звезда') {
          topGeometry = this.createExtrudedShapeGeometry(this.createStarShape(radius * 1.00), 0.05);
          topGeometry.rotateX(Math.PI / 2);
        } else if (this.currentShape === 'сердце') {
          topGeometry = this.createExtrudedShapeGeometry(this.createHeartShape(radius * 1.08), 0.05);
          topGeometry.rotateX(Math.PI / 2);
        } else if (this.currentShape === 'прямоугольный') {
          topGeometry = new THREE.BoxGeometry(radius * 2, 0.05, radius * 3);
        }
        const topMaterial = new THREE.MeshStandardMaterial({ color: dripColor });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.set(layer.position.x, layer.position.y + 0.50, layer.position.z);
        if (this.currentShape === 'звезда') {
          top.position.y += 0.01;
        }
        if (this.currentShape === 'сердце') {
          top.position.y += 0.01;
        }
        this.scene.add(top);
      });
    },
    calculateHeartYOffset(layerIndex) {
      const baseOffset = 0.5;
      const layerFactor = 0.3;
      return baseOffset - (layerIndex * layerFactor);
    },
    findToppingColor(ingredient) {
      const topping = this.toppings.find(t => t.ingridient === ingredient);
      return topping ? topping.primary_color : null;
    },
    findToppingTexturePath(ingredient) {
      const topping = this.toppings.find(t => t.ingridient === ingredient);
      return topping ? topping.texture_path : null;
    },
    addCircularTrinkets(layer, radius, quantity, positionOffset) {
      if (quantity === 1) {
        const trinketClone = this.trinketModel.clone();
        const trinketGroup = this.adjustModelScaleAndPosition(trinketClone, true, positionOffset);
        trinketGroup.position.set(0, layer.position.y + 0.25, 0);
        this.scene.add(trinketGroup);
        this.trinkets.push(trinketGroup);
      } else {
        const angleStep = (2 * Math.PI) / quantity;
        for (let i = 0; i < quantity; i++) {
          const trinketClone = this.trinketModel.clone();
          const trinketGroup = this.adjustModelScaleAndPosition(trinketClone, false, positionOffset);
          const angle = i * angleStep;
          const x = radius * Math.cos(angle);
          const z = radius * Math.sin(angle);

          trinketGroup.position.set(x, layer.position.y + 0, z);
          this.scene.add(trinketGroup);
          this.trinkets.push(trinketGroup);
        }
      }
    },
    addPerimeterTrinkets() {
      const trinketData = this.perimeterDecorations.find(t => t.ingridient === this.currentPerimeterTrinket);
      if (!trinketData) {
        console.error('Decoration not found');
        return;
      }

      const textureLoader = new THREE.TextureLoader();
      const modelPath = `${CDN_BASE_URL}${trinketData.texture_top_path}`;
      const isGLTF = modelPath.endsWith('.gltf') || modelPath.endsWith('.glb');
      const isOBJ = modelPath.endsWith('.obj');

      const loadModelCallback = (model) => {
        this.trinketModel = model;
        this.initialTrinketScale = null;

        const trinketQuantity = trinketData.amount === 1 ? 'single' : 'multiple';
        const trinketQuantities = trinketQuantity === 'single' ? [1, 1, 1] : [10, 8, 6];

        this.cakeLayers.forEach((layer, index) => {
          const quantity = trinketQuantities[index];
          const radius = this.getShapeRadius(layer) * (trinketQuantity === 'single' ? 1 : this.currentShape === 'сердце' ? 0.85 : 0.85);

          if (this.currentShape === 'звезда') {
            this.addStarTrinkets(layer, radius, quantity, trinketData.positionOffset);
          } else if (this.currentShape === 'сердце') {
            this.addHeartTrinkets(layer, radius, quantity, trinketData.positionOffset);
          } else if (this.currentShape === 'прямоугольный') {
            this.addRectangularTrinkets(layer, radius, quantity, trinketData.positionOffset, index);
          } else {
            this.addCircularTrinkets(layer, radius, quantity, trinketData.positionOffset);
          }
        });
      };

      if (isGLTF) {
        this.loadGLTFModel(modelPath, loadModelCallback);
      } else if (isOBJ) {
        this.loadOBJModel(modelPath, (obj) => {
          textureLoader.load(trinketData.texture_side_path, (texture) => {
            obj.traverse((child) => {
              if (child.isMesh) {
                child.material.map = texture;
                child.material.needsUpdate = true;
              }
            });
            loadModelCallback(obj);
          });
        });
      } else {
        console.error('Unsupported model format');
      }
    },
    updateCenterTrinket(event) {
      this.currentCenterTrinket = event.target.value || 5;
      this.updateCake();
    },
    updatePerimeterTrinket(event) {
      this.currentPerimeterTrinket = event.target.value || 6;
      this.updateCake();
    },
/*
  updateCenterTrinket() {
    const selectedTrinket = this.decorations.find(trinket => trinket.cake_addition_id === this.currentCenterTrinket);
    this.currentCenterTrinket = selectedTrinket ? selectedTrinket.cake_addition_id : null;
    this.updateCake();
  },
  updatePerimeterTrinket() {
    const selectedTrinket = this.decorations.find(trinket => trinket.cake_addition_id === this.currentPerimeterTrinket);
    this.currentPerimeterTrinket = selectedTrinket ? selectedTrinket.cake_addition_id : null;
    this.updateCake();
  },*/




    async addCenterTrinket() {
      const trinketData = this.centerDecorations.find(t => t.ingridient === this.currentCenterTrinket);
      if (!trinketData) {
        console.error('Decoration not found');
        return;
      }

      const textureLoader = new THREE.TextureLoader();
      const modelPath = `${CDN_BASE_URL}${trinketData.texture_top_path}`;
      const isGLTF = modelPath.endsWith('.gltf') || modelPath.endsWith('.glb');
      const isOBJ = modelPath.endsWith('.obj');

      const loadModelCallback = (model) => {
        this.trinketModel = model;
        this.initialTrinketScale = null;

        const trinketGroup = this.adjustModelScaleAndPosition(model, true, trinketData.positionOffset);
        const topLayer = this.cakeLayers[this.cakeLayers.length - 1];

        if (this.currentShape === 'звезда') {
          trinketGroup.position.set(-0.25, topLayer.position.y + 0.5, 0);
          trinketGroup.rotation.y = Math.PI / 2.5;
        } else {
          trinketGroup.position.set(0, topLayer.position.y + 0.5, 0);
        }

        this.scene.add(trinketGroup);
        this.trinkets.push(trinketGroup);
      };

      if (isGLTF) {
        this.loadGLTFModel(modelPath, loadModelCallback);
      } else if (isOBJ) {
        this.loadOBJModel(modelPath, (obj) => {
          textureLoader.load(trinketData.texture_side_path, (texture) => {
            obj.traverse((child) => {
              if (child.isMesh) {
                child.material.map = texture;
                child.material.needsUpdate = true;
              }
            });
            loadModelCallback(obj);
          });
        });
      } else {
        console.error('Unsupported model format');
      }
    },
    addStarTrinkets(layer, radius, quantity, positionOffset) {
      if (quantity === 1) {
        const trinketClone = this.trinketModel.clone();
        const trinketGroup = this.adjustModelScaleAndPosition(trinketClone, true, positionOffset);

        if (this.currentShape === 'звезда') {
          trinketGroup.position.set(-0.25, layer.position.y + 0.25, 0);
        } else {
          trinketGroup.position.set(0, layer.position.y + 0.25, 0);
        }

        this.scene.add(trinketGroup);
        this.trinkets.push(trinketGroup);
      } else {
        const points = this.createStarShape(radius).getPoints();
        points.forEach(point => {
          const trinketClone = this.trinketModel.clone();
          const trinketGroup = this.adjustModelScaleAndPosition(trinketClone, false, positionOffset);

          if (this.currentShape === 'звезда') {
            trinketGroup.position.set(point.x - 0.25, layer.position.y + 0, point.y);
          } else {
            trinketGroup.position.set(point.x, layer.position.y + 0, point.y);
          }

          this.scene.add(trinketGroup);
          this.trinkets.push(trinketGroup);
        });
      }
    },
    addHeartTrinkets(layer, radius, quantity, positionOffset) {
      if (quantity === 1) {
        const trinketClone = this.trinketModel.clone();
        const trinketGroup = this.adjustModelScaleAndPosition(trinketClone, true, positionOffset);
        trinketGroup.position.set(0, layer.position.y + 0.25, 0);
        this.scene.add(trinketGroup);
        this.trinkets.push(trinketGroup);
      } else {
        const points = this.createHeartPerimeter(radius, quantity);
        points.forEach(point => {
          const trinketClone = this.trinketModel.clone();
          const trinketGroup = this.adjustModelScaleAndPosition(trinketClone, false, positionOffset);
          trinketGroup.position.set(point.x, layer.position.y + 0, point.y);
          this.scene.add(trinketGroup);
          this.trinkets.push(trinketGroup);
        });
      }
    },
    async addTrinkets() {
      this.removeCenterTrinket();
      this.removePerimeterTrinkets();

      if (this.currentCenterTrinket !== 'none') {
        await this.addCenterTrinket();
      }

      if (this.currentPerimeterTrinket !== 'none') {
        await this.addPerimeterTrinkets();
      }
    },
    addSingleTrinket() {
      const topLayer = this.cakeLayers[this.cakeLayers.length - 1];
      const trinketClone = this.trinketModel.clone();
      const trinketGroup = this.adjustModelScaleAndPosition(trinketClone, true);
      trinketGroup.position.set(0, topLayer.position.y + 0.5, 0);
      this.scene.add(trinketGroup);
      this.trinkets.push(trinketGroup);
    },
    addMultipleTrinkets() {
      const trinketQuantities = [10, 8, 6];
      this.cakeLayers.forEach((layer, index) => {
        const quantity = trinketQuantities[index];
        const radius = this.getShapeRadius(layer) * 0.85;

        if (this.currentShape === 'звезда') {
          this.addStarTrinkets(layer, radius, quantity);
        } else if (this.currentShape === 'сердце') {
          this.addHeartTrinkets(layer, radius, quantity);
        } else {
          this.addCircularTrinkets(layer, radius, quantity);
        }
      });
    },
    applyTrinketTexture(texture) {
      if (this.trinketModel) {
        this.trinketModel.traverse(function (child) {
          if (child.isMesh) {
            child.material.map = texture;
            child.material.needsUpdate = true;
          }
        });
      }
    },
    reapplyDecorations() {
      if (this.imageObject) {
        const texture = this.imageObject.material.map;
        const position = new THREE.Vector3(0, this.cakeLayers[this.cakeLayers.length - 1].position.y + 0.51 + 0.03, 0);
        const rotation = new THREE.Euler(-Math.PI / 2, 0, 0);
        this.scene.remove(this.imageObject);
        this.objectsToDrag = this.objectsToDrag.filter(obj => obj !== this.imageObject);
        this.imageObject = null;
        this.addImageToCake(texture, position, rotation);
      }

      if (this.textObject) {
        const text = this.textContent;
        const position = new THREE.Vector3(0, this.cakeLayers[this.cakeLayers.length - 1].position.y + 0.51 + 0.03, 0);
        const rotation = new THREE.Euler(-Math.PI / 2, 0, 0);
        this.scene.remove(this.textObject);
        this.objectsToDrag = this.objectsToDrag.filter(obj => obj !== this.textObject);
        this.textObject = null;
        this.addTextToCake(text, position, rotation);
      }

      this.dragControls.objects = this.objectsToDrag;
    },
    startAnimation() {
      const animate = () => {
        this.animationFrameId = requestAnimationFrame(animate);

        this.controls.update();

        try {
          this.renderer.render(this.scene, this.camera);
        } catch (e) {
          console.error('Render error:', e);
        }

        this.updateHandles();
      };

      animate();
    },
    updateHandles() {
      if (this.imageObject) {
        const screenPos = this.toScreenPosition(this.imageObject, this.camera);
        this.imageHandle.style.left = `${screenPos.x + 30}px`;
        this.imageHandle.style.top = `${screenPos.y + 30}px`;
        this.imageHandle.style.display = 'block';
      } else {
        this.imageHandle.style.display = 'none';
      }
      if (this.textObject) {
        const screenPos = this.toScreenPosition(this.textObject, this.camera);
        this.textHandle.style.left = `${screenPos.x + 30}px`;
        this.textHandle.style.top = `${screenPos.y + 30}px`;
        this.textHandle.style.display = 'block';
      } else {
        this.textHandle.style.display = 'none';
      }
    },
    toScreenPosition(obj, camera) {
      if (!obj) return { x: 0, y: 0 };
      const vector = new THREE.Vector3();

      obj.updateMatrixWorld();
      vector.setFromMatrixPosition(obj.matrixWorld);
      vector.project(camera);

      const widthHalf = 0.5 * this.renderer.getContext().canvas.width;
      const heightHalf = 0.5 * this.renderer.getContext().canvas.height;

      return {
        x: (vector.x * widthHalf) + widthHalf,
        y: -(vector.y * heightHalf) + heightHalf
      };
    },
    addImageToCake(texture, position = null, rotation = null) {
      this.removeImage();  // Удаляем старую картинку перед добавлением новой

      nextTick(() => {
        const topLayer = this.cakeLayers[this.cakeLayers.length - 1];
        if (!topLayer) {
          console.error('Top layer is undefined');
          return;
        }

        const toppingOffset = (this.currentTopping !== 'none') ? 0.05 : 0;
        const additionalOffset = (this.currentShape === 'сердце' || this.currentShape === 'звезда') ? 0.00 : 0;
        const sizeFactor = (this.currentShape === 'сердце' || this.currentShape === 'звезда') ? 1.5 : 2;
        const planeGeometry = new THREE.PlaneGeometry(this.getShapeRadius(topLayer) * sizeFactor, this.getShapeRadius(topLayer) * sizeFactor);

        const planeMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);

        plane.position.set(0, topLayer.position.y + 0.55 + toppingOffset + additionalOffset, 0);
        plane.rotation.x = -Math.PI / 2;

        if (position) plane.position.copy(position);
        if (rotation) plane.rotation.copy(rotation);

        this.scene.add(plane);
        this.objectsToDrag.push(plane);
        this.dragControls.objects = this.objectsToDrag;

        this.imageObject = plane;
        this.updateHandlesVisibility();
      });
    },
    async addTextToCake(text, position = null, rotation = null) {
      this.removeText();  // Удаляем старый текст

      const topLayer = this.cakeLayers[this.cakeLayers.length - 1];
      if (!topLayer) {
        console.error('Top layer is undefined');
        return;
      }

      const fontUrl = `${CDN_BASE_URL}fonts/${this.currentFont}.ttf`;
      try {
        const texture = await this.createTextTexture(text, this.textSize, this.textColor, fontUrl);
        const aspectRatio = texture.image.width / texture.image.height;
        const planeGeometry = new THREE.PlaneGeometry(this.textSize * aspectRatio, this.textSize);
        const planeMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);

        const toppingOffset = (this.currentTopping !== 'none') ? 0.05 : 0;
        const additionalOffset = (this.currentShape === 'сердце' || this.currentShape === 'звезда') ? 0.0 : 0;
        const textYOffset = 0.04;
        plane.position.set(0, topLayer.position.y + 0.51 + toppingOffset + additionalOffset + textYOffset, 0);
        plane.rotation.x = -Math.PI / 2;

        if (position) plane.position.copy(position);
        if (rotation) plane.rotation.copy(rotation);

        this.scene.add(plane);
        this.objectsToDrag.push(plane);
        this.dragControls.objects = this.objectsToDrag;

        this.textObject = plane;
        this.updateHandlesVisibility();
      } catch (error) {
        console.error('Error adding text to cake:', error);
      }
    },

    async createTextTexture(text, size, color, fontUrl) {
      return new Promise((resolve, reject) => {
        const fontFace = new FontFace('customFont', `url(${fontUrl})`);
        fontFace.load().then((loadedFace) => {
          document.fonts.add(loadedFace);

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          const fontSize = 100;
          context.font = `${fontSize}px customFont`;
          const textWidth = context.measureText(text).width;

          canvas.width = textWidth;
          canvas.height = fontSize * 1.2;

          context.font = `${fontSize}px customFont`;
          context.fillStyle = color;
          context.fillText(text, 0, fontSize);

          const texture = new THREE.CanvasTexture(canvas);
          resolve(texture);
        }).catch((error) => {
          console.error('Font loading error:', error);
          reject(error);
        });
      });
    },

    updateFont(event) {
      this.currentFont = event.target.value;
      if (this.textObject) {
        this.updateTextFont();
      }
    },

    async updateTextFont() {
      if (this.textObject) {
        await this.removeText();
        await this.addTextToCake(this.textContent);
      }
    },

    removeImage() {
      if (this.imageObject) {
        this.scene.remove(this.imageObject);
        this.imageObject.geometry.dispose();
        this.imageObject.material.map.dispose();
        this.imageObject.material.dispose();
        this.imageObject = null;
        this.objectsToDrag = this.objectsToDrag.filter(obj => obj !== this.imageObject);
        this.dragControls.objects = this.objectsToDrag;
        this.updateHandlesVisibility();
        this.updateCake();
      }
    },

    removeText() {
      if (this.textObject) {
        this.scene.remove(this.textObject);
        this.textObject.geometry.dispose();
        this.textObject.material.map.dispose();
        this.textObject.material.dispose();
        this.textObject = null;
        this.objectsToDrag = this.objectsToDrag.filter(obj => obj !== this.textObject);
        this.dragControls.objects = this.objectsToDrag;
        this.updateHandlesVisibility();
        this.updateCake();
      }
    },

    renderScene() {
      this.renderer.render(this.scene, this.camera);
    },

    adjustPositionAfterDrag(object) {
      const topLayer = this.cakeLayers[this.cakeLayers.length - 1];
      const toppingOffset = (this.currentTopping !== 'none') ? 0.05 : 0;
      const additionalOffset = (this.currentShape === 'HEART' || this.currentShape === 'STAR') ? 0.00 : 0;
      const textYOffset = 0.01;
      const radius = this.getShapeRadius(topLayer);
      const pos = object.position;
      const distance = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

      if (distance > radius) {
        object.position.set(0, topLayer.position.y + 0.51 + 0.03 + toppingOffset + additionalOffset, 0);
      } else {
        object.position.y = topLayer.position.y + 0.51 + 0.03 + toppingOffset + additionalOffset;
      }

      if (object === this.textObject) {
        object.position.y += textYOffset;
      }

      this.updateHandlesVisibility();
    },

    addLayer() {
      this.numberOfLayers++;
      this.updateLayerControls();
    },

    removeLayer() {
      this.numberOfLayers--;
      this.updateLayerControls();
    },

    updateLayerControls() {
      const layers = parseInt(this.numberOfLayers);
      const layerControlsDiv = document.getElementById('layer-controls');

      if (!layerControlsDiv) {
        console.error('Layer controls element not found.');
        return;
      }
      layerControlsDiv.innerHTML = '';

      for (let i = 1; i <= this.numberOfLayers; i++) {
        const layerDiv = document.createElement('div');
        const layerHeader = document.createElement('div');

        layerDiv.className = 'layer-select';
        layerHeader.className = 'layer-header';

        const addLayerButton = document.createElement('button');
        addLayerButton.type = 'button';
        addLayerButton.textContent = '+';
        addLayerButton.className = 'add-button';
        addLayerButton.addEventListener('click', this.addLayer);

        const removeLayerButton = document.createElement('button');
        removeLayerButton.type = 'button';
        removeLayerButton.textContent = '-';
        removeLayerButton.className = 'remove-button';
        removeLayerButton.addEventListener('click', this.removeLayer);

        const layerLabel = document.createElement('label');
        layerLabel.textContent = `Слой ${i}`;
        const baseSelect = document.createElement('select');
        const basePlaceholderOption = document.createElement('option');
        basePlaceholderOption.value = '';
        basePlaceholderOption.disabled = true;
        basePlaceholderOption.textContent = 'Выберите основу';
        baseSelect.appendChild(basePlaceholderOption);
        baseSelect.id = `base${i}`;
        baseSelect.innerHTML = this.bases.map(base => `<option value="${base.primary_color}" placeholder="Выберите основу">${base.ingridient}</option>`).join('');

        const fillingSelect = document.createElement('select');
        fillingSelect.id = `filling${i}`;
        fillingSelect.innerHTML = this.fillings.map(filling => `<option value="${filling.primary_color}">${filling.ingridient}</option>`).join('');

        baseSelect.addEventListener('change', this.updateCake);
        fillingSelect.addEventListener('change', this.updateCake);

        layerHeader.appendChild(layerLabel);

        if (this.numberOfLayers > 1 && i != 1) {
          layerHeader.appendChild(removeLayerButton);
        }

        layerDiv.appendChild(layerHeader);
        layerDiv.appendChild(baseSelect);
        layerDiv.appendChild(fillingSelect);

        layerControlsDiv.appendChild(layerDiv);
        if (this.numberOfLayers < 3) {
          if (i == 1 && this.numberOfLayers != 2) {
            layerControlsDiv.appendChild(addLayerButton);
          }
          if (i == 2) {
            layerControlsDiv.appendChild(addLayerButton);
          }
        }
      }

      this.updateCake();
    },

     async updateCake() {
    const layers = parseInt(this.numberOfLayers);

    const bases = [];
    const fillings = [];

    for (let i = 1; i <= layers; i++) {
      const base = document.getElementById(`base${i}`).value;
      const filling = document.getElementById(`filling${i}`).value;
      bases.push(base);
      fillings.push(filling);
    }

    this.createCake(layers, this.currentShape, bases, fillings);

    const cakeLayers = this.cakeLayers.map((layer, index) => {
      console.log(`Layer ${index + 1}: Shape: ${this.currentShape}, Radius: ${this.getShapeRadius(layer)}, Base Color: ${bases[index]}, Filling Color: ${fillings[index]}`);
      return {
        shape: this.currentShape,
        radius: this.getShapeRadius(layer),
        height: 1,
        baseColor: bases[index],
        fillingColor: fillings[index]
      };
    });

    this.cakeJson = this.serializeCake(cakeLayers, bases, fillings);
    console.log(this.cakeJson);

    await this.loadDecoration();

    // Вызываем функцию для расчета веса и стоимости после обновления торта
    this.calculateCakeWeightAndCost();
  },



    async loadDecoration() {
      this.removeCenterTrinket();
      this.removePerimeterTrinkets();

      if (this.currentCenterTrinket !== 'none') {
        await this.addCenterTrinket();
      }

      if (this.currentPerimeterTrinket !== 'none') {
        await this.addPerimeterTrinkets();
      }
    },

//    saveScreenshot() {
//      const tempScene = new THREE.Scene();
//
//      if (this.imageObject) tempScene.add(this.imageObject.clone());
//      if (this.textObject) tempScene.add(this.textObject.clone());
//
//      const originalCameraPosition = this.camera.position.clone();
//      const originalCameraRotation = this.camera.rotation.clone();
//
//      const topLayer = this.cakeLayers[this.cakeLayers.length - 1];
//      this.camera.position.set(0, topLayer.position.y + 10, 0);
//      this.camera.lookAt(0, topLayer.position.y, 0);
//
//      this.camera.updateProjectionMatrix();
//
//      this.renderer.render(tempScene, this.camera);
//      const dataURL = this.renderer.domElement.toDataURL('image/png');
//
//      this.camera.position.copy(originalCameraPosition);
//      this.camera.rotation.copy(originalCameraRotation);
//      this.camera.updateProjectionMatrix();
//
//      const link = document.createElement('a');
//      link.href = dataURL;
//      link.download = 'screenshot.png';
//      document.body.appendChild(link);
//      link.click();
//      document.body.removeChild(link);
//    },


    adjustStarUVs(geometry) {
      const uvAttribute = geometry.attributes.uv;
      for (let i = 0; i < uvAttribute.count; i++) {
        const u = uvAttribute.getX(i);
        const v = uvAttribute.getY(i);
        uvAttribute.setXY(i, u, v * 2 + 0.05);
      }
      uvAttribute.needsUpdate = true;
    },
    adjustHeartUVs(geometry) {
      const uvAttribute = geometry.attributes.uv;
      const boundingBox = new THREE.Box3().setFromObject(new THREE.Mesh(geometry));
      const height = boundingBox.max.y - boundingBox.min.y;
      const width = boundingBox.max.x - boundingBox.min.x;

      for (let i = 0; i < uvAttribute.count; i++) {
        const u = uvAttribute.getX(i);
        const v = uvAttribute.getY(i);
        const newV = (v - boundingBox.min.y) / height * 0.9;
        const newU = (u - boundingBox.min.x) / width;
        uvAttribute.setXY(i, newU, newV + 0.7);
      }
      uvAttribute.needsUpdate = true;
    },
    updateShape(event) {
      this.currentShape = event.target.value;
      this.updateCake();
    },
    updateTopping(event) {
      this.currentTopping = event.target.value;
      this.updateCake();
    },
    updateCover(event) {
      this.currentCover = event.target.value;
      this.updateCake();
    },
    updateDecoration(event) {
      this.currentDecoration = event.target.value;
      this.updateCake();
    },
    updateTrinket(event) {
      const trinketType = event.target.getAttribute('data-trinket-type');
      if (trinketType === 'center') {
        this.currentCenterTrinket = event.target.value;
      } else if (trinketType === 'perimeter') {
        this.currentPerimeterTrinket = event.target.value;
      }
      this.updateCake();
    },
    updateTrinketQuantity(event) {
      this.trinketMode = event.target.value;
      this.updateCake();
    },
    updateSize(event) {
    this.currentSize = event.target.value;
    console.log('Updated size:', this.currentSize);
    this.updateCake();
  },
    uploadImage(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const texture = new THREE.TextureLoader().load(event.target.result, (texture) => {
            this.addImageToCake(texture);
          });
        };
        reader.readAsDataURL(file);
      }
    },
    addText() {
      this.addTextToCake(this.textContent);
    },
    async updateTextSize() {
      if (this.textObject) {
        await this.removeText();
        await this.addTextToCake(this.textContent);
      }
    },
    async updateTextColor() {
      if (this.textObject) {
        await this.removeText();
        await this.addTextToCake(this.textContent);
      }
    },
    removeCenterTrinket() {
      this.trinkets.forEach(trinket => {
        if (trinket && trinket.geometry) {
          this.scene.remove(trinket);
          trinket.geometry.dispose();
          if (trinket.material) {
            if (trinket.material.map) trinket.material.map.dispose();
            trinket.material.dispose();
          }
        }
      });
      this.trinkets = [];
    },
    addRectangularTrinkets(layer, radius, quantity, positionOffset, layerIndex) {
      const trinketCountX = Math.ceil(quantity / 2);
      const trinketCountZ = Math.floor(quantity / 2);
      const stepX = (radius * 2.5) / trinketCountX;
      const stepZ = (radius * 3.8) / trinketCountZ;
      const layerOffsetX = 0.1;
      let x = 0;
      let z = 0;

      for (let i = 0; i < trinketCountX; i++) {
        for (let j = 0; j < trinketCountZ; j++) {
          const trinketClone = this.trinketModel.clone();
          const trinketGroup = this.adjustModelScaleAndPosition(trinketClone, false, positionOffset);

          if (layerIndex !== 0) {
            x = -radius + i * stepX + layerOffsetX;
          } else {
            x = -radius + i * stepX;
          }
          z = -radius * 1.5 + j * stepZ;

          trinketGroup.position.set(x, layer.position.y + 0, z);
          if ((i === 0) || (j === 0) || (i === (trinketCountX - 1)) || (j === (trinketCountZ - 1))) {
            this.scene.add(trinketGroup);
          }
          this.trinkets.push(trinketGroup);
        }
      }
    },
    removePerimeterTrinkets() {
      if (this.trinkets.length > 0) {
        this.trinkets.forEach(trinket => {
          this.scene.remove(trinket);
          trinket.geometry.dispose();
          if (trinket.material.map) trinket.material.map.dispose();
          trinket.material.dispose();
        });
        this.trinkets = [];
      }
    },
    uploadTrinket(event) {
      const file = event.target.files[0];
      const decoration = this.decorations.find(d => d.ingridient === this.currentDecoration);

      if (decoration) {
        this.loadModel(decoration.texture_top_path, (model) => {
          this.trinketModel = model;
          this.initialTrinketScale = null;
          this.updateCake();
        });
      } else if (file) {
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.obj') || fileName.endsWith('.gltf') || fileName.endsWith('.glb')) {
          this.loadModel(file, (model) => {
            this.trinketModel = model;
            this.initialTrinketScale = null;
            this.updateCake();
          }, true);
        }
      }
    },
    uploadTrinketTexture(event) {
      const file = event.target.files[0];
      if (file) {
        const fileName = file.name.toLowerCase();
        const loader = fileName.endsWith('.tga') ? new TGALoader() : new THREE.TextureLoader();
        const reader = new FileReader();
        reader.onload = (event) => {
          const texture = loader.load(event.target.result, (texture) => {
            this.applyTrinketTexture(texture);
          });
        };
        reader.readAsDataURL(file);
      }
    },
    calculateHeartYOffset(layerIndex) {
      const baseOffset = 0.5;
      const layerFactor = 0.3;
      return baseOffset - (layerIndex * layerFactor);
    },
    addSharpIfNeeded(color) {
      if (!color) return '';
      return color.startsWith('#') ? color : `#${color}`;
    },
    serializeCake(cakeLayers, bases, fillings) {
      const cakeData = {
        currentTopping: this.currentTopping,
        currentCover: this.currentCover,
        currentShape: this.currentShape,
        currentFont: this.currentFont,
        currentSize: this.currentSize,
        numberOfLayers: this.numberOfLayers,
        cakeLayers: cakeLayers,
        currentCenterTrinket: this.currentCenterTrinket,
        currentPerimeterTrinket: this.currentPerimeterTrinket,
        textContent: this.textContent,
        textSize: this.textSize,
        textColor: this.textColor,
        textOutlineColor: this.textOutlineColor
      };

      return JSON.stringify(cakeData);
    },

    deserializeCake(jsonString) {
      const cakeData = JSON.parse(jsonString);

      this.currentTopping = cakeData.currentTopping;
      this.currentCover = cakeData.currentCover;
      this.currentShape = cakeData.currentShape;
      this.currentFont = cakeData.currentFont;
      this.currentSize = cakeData.currentSize;
      this.numberOfLayers = cakeData.numberOfLayers;
      this.cakeLayers = cakeData.cakeLayers.map(layer => this.createLayer(layer.shape, layer.radius, layer.height, layer.baseColor, layer.fillingColor));
      this.currentCenterTrinket = cakeData.currentCenterTrinket;
      this.currentPerimeterTrinket = cakeData.currentPerimeterTrinket;
      this.textContent = cakeData.textContent;
      this.textSize = cakeData.textSize;
      this.textColor = cakeData.textColor;
      this.textOutlineColor = cakeData.textOutlineColor;

      this.updateCake();
    }
  }
}).mount('#constructor');