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
          currentTrinket: 'none', // добавлено
          currentFont: 'Miama',
          currentSize: 'средний',
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
          decorations: [], // добавлено для хранения украшений
          trinketPositionX: 0,
          trinketPositionY: 0,
          trinketPositionZ: 0,
          trinketRotationX: 0,
          trinketRotationY: 0,
          trinketRotationZ: 0,
          trinketScale: 1,  // Масштабирование
         currentCenterTrinket: 'none',
        currentPerimeterTrinket: 'none',
        decorations: [], // Украшения, полученные из API
        centerTrinketObject: null,  // Объект для центра
        perimeterTrinketObjects: [],  // Объекты для периметра
        cakeWeight: 0,
        cakeCost: 0,
        layerDiameter: 0,
        cakeJson: ''
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
         addToCart() {
    const cake = {
      weight: 666,
      cost: 999,
      layers_count: this.cakeLayers.length,
      text: this.textContent,
      name: this.cakeName,
      constructor_image: this.constructorImage,
      preview_image: this.previewImage,
      cake_size: this.currentSize,
      cake_shape: this.currentShape,
      cake_coverage: this.currentCover,
      cake_topping: this.currentTopping,
      cake_addition: this.currentTrinket,
    };

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
  alert('Произошла ошибка при добавлении торта в корзину');
});
  },
  calculateCakeWeightAndCost() {
  const cake_size = this.sizes.find(size => size.name === this.currentSize);
  const cake_coverage = this.covers.find(cover => cover.name === this.currentCover);
  const cake_topping = this.toppings.find(topping => topping.name === this.currentTopping);
  const cake_layers = this.cakeLayers;
  const cake_additions = this.decorations;
  const layers_count = this.numberOfLayers;

  const Vc = cake_size.base_area;
  const Vt = Vc * 0.1;
  const Vl = Vc * 0.5;
  const Vb = Vc * 0.05;

  const pc = parseFloat(cake_coverage.density) / 1000;
  const pt = parseFloat(cake_topping.density) / 1000;

  const Mc = pc * Vc;
  const Mt = pt * Vt;

  let Ml = 0;
  for (let layer of cake_layers) {
    const pf = parseFloat(layer.filling.density) / 1000;
    const pb = parseFloat(layer.base.density) / 1000;
    Ml += (pf * Vl + pb * Vb);
  }

  Ml *= layers_count;

  const M_add = cake_additions.reduce((sum, addition) => {
    return sum + parseFloat(addition.cost_per_gram) / 100;
  }, 0);

  const total_weight = Mc + Mt + Ml + M_add;

  const dc = parseFloat(cake_coverage.cost_per_gram);
  const dt = parseFloat(cake_topping.cost_per_gram);
  const df = parseFloat(cake_layers[0].filling.cost_per_gram);
  const db = parseFloat(cake_layers[0].base.cost_per_gram);
  const d_add = cake_additions.reduce((sum, addition) => {
    return sum + parseFloat(addition.cost_per_gram);
  }, 0) / cake_additions.length;

  let Sl = 0;
  for (let layer of cake_layers) {
    const pf = parseFloat(layer.filling.density) / 1000;
    const pb = parseFloat(layer.base.density) / 1000;
    Sl += (pf * Vl * df + pb * Vb * db);
  }

  Sl *= layers_count;

  const S = Mc * dc + Mt * dt + Sl + M_add * d_add;

  const total_cost = S;

  // Обновляем значения cakeWeight и cakeCost
  this.cakeWeight = total_weight.toFixed(2);
  this.cakeCost = total_cost.toFixed(2);

  // Возвращаем объект с результатами, если это необходимо
  return { total_weight, total_cost };
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
            positionOffset: parseFloat(trinket.texture_side_path) || 0  // Добавляем смещение
        }));

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
            this.renderer.setSize(window.innerWidth , window.innerHeight * 0.91);
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

    model.position.y += modelHeight / 2 + positionOffset; // Используем смещение

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
          },/*
          createExtrudedShapeGeometry(shape, height) {
            return new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
          },*/
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
            const radii = shape === 'сердце' ? [3.5, 2.5, 1.5] : shape === 'звезда' ? [2.5, 2, 1.5] : [2, 1.5, 1];

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

            const generalZOffset = 0.57; // Общее смещение по оси Z для всей конструкции

            if (this.currentTopping === 'none') {
              return;
            }

            const topping = this.toppings.find(t => t.ingridient === this.currentTopping);
            if (!topping) {
              return;
            }

            const dripColor = `${topping.primary_color}`;
            //const texturePath = topping.texture_path;
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
                radius *= 1.165;
                dripGeometry = new THREE.CylinderGeometry(radius, radius, height, 6, 1, true);
              } else if (this.currentShape === 'звезда') {
                radius *= 1.135;
                dripGeometry = this.createExtrudedShapeGeometry(this.createStarShape(radius), height);
                dripGeometry.rotateX(Math.PI / 2);
                this.adjustStarUVs(dripGeometry);
              } else if (this.currentShape === 'сердце') {
                radius *= 1.77;
                const newradius = radius * 1.09;
                dripGeometry = this.createExtrudedShapeGeometry(this.createHeartShape(newradius), height);
                dripGeometry.rotateX(Math.PI / 2);
                this.adjustHeartUVs(dripGeometry);
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
                transparent: true, // Включаем прозрачность
                opacity: 0.95 // Устанавливаем значение прозрачности
              });
              const drip = new THREE.Mesh(dripGeometry, dripMaterial);
              drip.position.y = layer.position.y + layer.children[layer.children.length - 1].position.y - height / 3.5;
              if (this.currentShape === 'звезда') {
                drip.position.y += 0.0; // Корректировка смещения по оси Z для формы сердца
              }
              if (this.currentShape === 'сердце') {
                drip.position.y += 0.0; // Корректировка смещения по оси Z для формы сердца
              }

              if (this.currentShape === 'сердце') {
                //drip.position.z -= (this.calculateHeartYOffset(index) + generalZOffset); // Корректировка смещения по оси Z для формы сердца
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
                topGeometry = this.createExtrudedShapeGeometry(this.createStarShape(radius * 1.03), 0.05);
                topGeometry.rotateX(Math.PI / 2);
              } else if (this.currentShape === 'сердце') {
                topGeometry = this.createExtrudedShapeGeometry(this.createHeartShape(radius * 1.08), 0.05);
                topGeometry.rotateX(Math.PI / 2);
              }
              const topMaterial = new THREE.MeshStandardMaterial({ color: dripColor });
              const top = new THREE.Mesh(topGeometry, topMaterial);
              top.position.set(layer.position.x, layer.position.y + 0.50, layer.position.z);
              if (this.currentShape === 'звезда') {
                top.position.y += 0.01; // Корректировка смещения по оси Z для формы сердца
              }
              if (this.currentShape === 'сердце') {
                top.position.y += 0.01; // Корректировка смещения по оси Z для формы сердца
              }
              if (this.currentShape === 'сердце') {
                //top.position.z -= (this.calculateHeartYOffset(index) + generalZOffset); // Корректировка смещения по оси Z для формы сердца
                top.position.z -= 0; // Корректировка смещения по оси Z для формы сердца
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

              async addPerimeterTrinkets() {
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
    this.currentCenterTrinket = event.target.value;
    this.updateCake();
  },
  updatePerimeterTrinket(event) {
    this.currentPerimeterTrinket = event.target.value;
    this.updateCake();
  },

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

        const trinketGroup = this.adjustModelScaleAndPosition(model, true, trinketData.positionOffset); // Передаем смещение
        const topLayer = this.cakeLayers[this.cakeLayers.length - 1];
        trinketGroup.position.set(0, topLayer.position.y + 0.5, 0);

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
        trinketGroup.position.set(0, layer.position.y + 0.25, 0);
        this.scene.add(trinketGroup);
        this.trinkets.push(trinketGroup);
    } else {
        const points = this.createStarShape(radius).getPoints();
        points.forEach(point => {
            const trinketClone = this.trinketModel.clone();
            const trinketGroup = this.adjustModelScaleAndPosition(trinketClone, false, positionOffset);
            trinketGroup.position.set(point.x, layer.position.y + 0, point.y);
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

//             const topLayer = this.cakeLayers[this.cakeLayers.length - 1];
//             const toppingOffset = (this.currentTopping !== 'none') ? 0.05 : 0;
//             const additionalOffset = (this.currentShape === 'сердце' || this.currentShape === 'звезда') ? 0.05 : 0;
//             const sizeFactor = (this.currentShape === 'сердце' || this.currentShape === 'звезда') ? 1.5 : 2;
//             const planeGeometry = new THREE.PlaneGeometry(this.getShapeRadius(topLayer) * sizeFactor, this.getShapeRadius(topLayer) * sizeFactor);

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
      const additionalOffset = (this.currentShape === 'HEART' || this.currentShape === 'STAR') ? 0.0 : 0;  //here
      const textYOffset = 0.04; // Увеличиваем смещение по оси Y // again to put text above pic
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
        const fontSize = 100; // Базовый размер шрифта
        context.font = `${fontSize}px customFont`;
        const textWidth = context.measureText(text).width;

        canvas.width = textWidth;
        canvas.height = fontSize * 1.2; // Высота с учетом отступов

        // Установка конечного размера шрифта
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
      await this.removeText(); // Удаляем старый текст
      await this.addTextToCake(this.textContent); // Добавляем новый текст
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
      this.updateCake();  // Перерисовываем торт
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
      this.updateCake();  // Перерисовываем торт
    }
  },

  renderScene() {
    this.renderer.render(this.scene, this.camera);
  },



          adjustPositionAfterDrag(object) {
  const topLayer = this.cakeLayers[this.cakeLayers.length - 1];
  const toppingOffset = (this.currentTopping !== 'none') ? 0.05 : 0;
  const additionalOffset = (this.currentShape === 'HEART' || this.currentShape === 'STAR') ? 0.00 : 0; //
  const textYOffset = 0.01; // Увеличиваем смещение по оси Y для текста // here to put text above pic
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

//
//          adjustPositionAfterDrag(object) {
//            const topLayer = this.cakeLayers[this.cakeLayers.length - 1];
//            const toppingOffset = (this.currentTopping !== 'none') ? 0.05 : 0;
//            const additionalOffset = (this.currentShape === 'сердце' || this.currentShape === 'звезда') ? 0.05 : 0;
//            const radius = this.getShapeRadius(topLayer);
//            const pos = object.position;
//            const distance = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
//           if (distance > radius) {
//              object.position.set(0, topLayer.position.y + 0.51 + 0.03 + toppingOffset + additionalOffset, 0);
//            } else {
//              object.position.y = topLayer.position.y + 0.51 + 0.03 + toppingOffset + additionalOffset;
//            }
//            this.updateHandlesVisibility();
//          },
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
//      const layerDivCont = document.createElement('div');
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
        layerLabel.textContent = `Cлой ${i}`;
        const baseSelect = document.createElement('select');
        const basePlaceholderOption = document.createElement('option');
        basePlaceholderOption.value = '';
        basePlaceholderOption.disabled = true;
        basePlaceholderOption.textContent = 'Выберите начинку';
        baseSelect.appendChild(basePlaceholderOption);
        baseSelect.id = `base${i}`;
        baseSelect.innerHTML = this.bases.map(base => `<option value="${base.primary_color}" placeholder="Выберите начинку">${base.ingridient}</option>`).join('');


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
            if (i == 1 && this.numberOfLayers != 2){
           layerControlsDiv.appendChild(addLayerButton);
          }
          if (i == 2){
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
    await this.loadDecoration();
    this.cakeJson = this.serializeCake();
    console.log(this.cakeJson);
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

          saveScreenshot() {
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

            const link = document.createElement('a');
            link.href = dataURL;
            link.download = 'screenshot.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          },
          adjustStarUVs(geometry) {
            const uvAttribute = geometry.attributes.uv;
            for (let i = 0; i < uvAttribute.count; i++) {
              const u = uvAttribute.getX(i);
              const v = uvAttribute.getY(i);
              uvAttribute.setXY(i, u, v * 2);
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
              uvAttribute.setXY(i, newU, newV + 0.25);
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
      await this.removeText(); // Удаляем старый текст
      await this.addTextToCake(this.textContent); // Добавляем новый текст с новым размером
    }
  },
          async updateTextColor() {
    if (this.textObject) {
      await this.removeText(); // Удаляем старый текст
      await this.addTextToCake(this.textContent); // Добавляем новый текст с новым цветом
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
            // Возвращает корректное смещение по оси Z для заданного слоя торта формы сердца
            const baseOffset = 0.5; // Базовое смещение
            const layerFactor = 0.3; // Фактор смещения для каждого слоя
            return baseOffset - (layerIndex * layerFactor);
          },
          addSharpIfNeeded(color) {
        if (!color) return '';
        return color.startsWith('#') ? color : `#${color}`;
      },

        // Сериализация данных торта в JSON
  serializeCake() {
    const cakeData = {
      currentTopping: this.currentTopping,
      currentCover: this.currentCover,
      currentShape: this.currentShape,
      currentFont: this.currentFont,
      currentSize: this.currentSize,
      numberOfLayers: this.numberOfLayers,
      cakeLayers: this.cakeLayers.map(layer => ({
        shape: layer.shape,
        radius: layer.radius,
        height: layer.height,
        baseColor: layer.baseColor,
        fillingColor: layer.fillingColor
      })),
      currentCenterTrinket: this.currentCenterTrinket,
      currentPerimeterTrinket: this.currentPerimeterTrinket,
      textContent: this.textContent,
      textSize: this.textSize,
      textColor: this.textColor,
      textOutlineColor: this.textOutlineColor
    };

    return JSON.stringify(cakeData);
  },

  // Десериализация данных торта из JSON
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