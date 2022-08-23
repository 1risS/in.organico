import * as THREE from 'three'
import Hydra from 'hydra-synth/dist/hydra-synth'
import { WebMidi } from 'webmidi'
import GUI from 'lil-gui'
import './style.css'

import mainFragment from './glsl/main.frag'
import mainVertex from './glsl/main.vert'

let scene, camera, renderer;
let geometry, mesh, material, texture;
let mouse, center;

let mustRender = true;
let alwaysRender = true;

init();
animate(0);

function init() {
  // const container = document.createElement('div');
  // document.body.appendChild(container);
  const container = document.getElementById("three")

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.set(0, 0, 500);

  scene = new THREE.Scene();
  center = new THREE.Vector3();
  center.z = - 1000;

  const video = document.getElementById('video');

  texture = new THREE.VideoTexture(video);
  texture.minFilter = THREE.NearestFilter;

  const width = 640, height = 480;
  const nearClipping = 850, farClipping = 4000;

  geometry = new THREE.BufferGeometry();

  const numPoints = width * height;
  const vertices = new Float32Array(numPoints * 3);
  const indices = new Uint16Array(numPoints);

  for (let i = 0, j = 0, l = vertices.length; i < l; i += 3, j++) {
    vertices[i] = j % width;
    vertices[i + 1] = Math.floor(j / width);
  }

  for (let i = 0; i < numPoints; i++) {
    indices[i] = i;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('pindex', new THREE.InstancedBufferAttribute(indices, 1, false));

  material = new THREE.ShaderMaterial({
    uniforms: {
      'time': { value: 0 },
      'hue': { value: 0.0 },
      'saturation': { value: 1.0 },
      'uRandom': { value: 0.0 },
      'uDepth': { value: 0.0 },

      'map': { value: texture },
      'width': { value: width },
      'height': { value: height },
      'nearClipping': { value: nearClipping },
      'farClipping': { value: farClipping },

      'pointSize': { value: 1 },
      'zOffset': { value: 1500 },
      'clipX': { value: 0.0 },
      'clipY': { value: 0.0 },
      'clipWidthX': { value: 0 },
      'clipWidthY': { value: 0 }

    },
    vertexShader: mainVertex,
    fragmentShader: mainFragment,
    blending: THREE.AdditiveBlending,
    depthTest: false, depthWrite: false,
    transparent: true
  });

  mesh = new THREE.Points(geometry, material);
  scene.add(mesh);

  mouse = new THREE.Vector3(0, 0, 1);

  const gui = new GUI();

  const positionFolder = gui.addFolder("Position").onChange(() => { mustRender = true });
  positionFolder.add(mouse, 'x', -3000, 3000, 10).name('X');
  positionFolder.add(mouse, 'y', -6000, 6000, 20).name('Y');

  const materialFolder = gui.addFolder("Material").onChange(() => { mustRender = true });
  materialFolder.add(material.uniforms.nearClipping, 'value', 1, 10000, 1.0).name('Near Clipping');
  materialFolder.add(material.uniforms.farClipping, 'value', 1, 10000, 1.0).name('Far Clipping');
  materialFolder.add(material.uniforms.pointSize, 'value', 1, 10, 1.0).name('Point Size');
  materialFolder.add(material.uniforms.zOffset, 'value', 0, 4000, 1.0).name('Z offset');
  materialFolder.add(material.uniforms.uRandom, 'value', 0.0, 1.0, 0.001).name('Random');
  materialFolder.add(material.uniforms.uDepth, 'value', 0.0, 1.0, 0.0001).name('Depth');
  materialFolder.add(material.uniforms.clipX, 'value', 0.0, 1.0, 0.001).name('Clip X');
  materialFolder.add(material.uniforms.clipY, 'value', 0.0, 1.0, 0.001).name('Clip Y');
  materialFolder.add(material.uniforms.clipWidthX, 'value', 0.0, 1.0, 0.001).name('Clip Width X');
  materialFolder.add(material.uniforms.clipWidthY, 'value', 0.0, 1.0, 0.001).name('Clip Width Y');
  materialFolder.add(material.uniforms.hue, 'value', 0.0, 1.0, 0.001).name('Hue');
  materialFolder.add(material.uniforms.saturation, 'value', 0.0, 1.0, 0.001).name('Saturation');

  gui.close();

  video.play();

  //

  enableMIDI();

  //

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  initHydra(renderer);

  window.addEventListener('resize', onWindowResize);
  window.addEventListener("message", handleFlokMessages, false);

}

function initHydra(renderer) {
  let canvas = document.getElementById("hydra");
  let hydra = new Hydra({ canvas: canvas, detectAudio: false });

  extendHydra();

  let threeCanvas = renderer.domElement;
  s0.init({ src: threeCanvas });

  // output threejs canvas to hydra canvas by default
  src(s0).out()

  setImage("textures/monteConstanza-05.jpg");
}

function extendHydra() {
  const scenes = {};
  let currentScene = null;
  window.scenes = scenes;

  window.defScene = (id, cb) => {
    if (id < 0 || id > 127) {
      throw "scene id must be a number between 0 and 127, was " + id;
    }
    scenes[id] = cb;
    // If we are redefining currently playing scene, re-play it
    if (currentScene == id) cb();
  }

  window.setScene = (id) => {
    const sceneFn = scenes[id];
    if (!sceneFn) {
      throw "scene id " + id + " not defined";
    }
    if (currentScene !== id) sceneFn();
    currentScene = id;
  }

  window.setVideo = (src) => {
    const video = document.getElementById('video');
    video.src = src;
    video.play()
    texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.NearestFilter;
    material.uniforms.map.value = texture;
    alwaysRender = true;
    console.log("Video set to:", src);
  }

  window.setImage = (src) => {
    const loader = new THREE.TextureLoader()
    const startTs = new Date();
    loader.load(src, (texture) => {
      texture.minFilter = THREE.NearestFilter;
      material.uniforms.map.value = texture;
      alwaysRender = false;
      mustRender = true;
      const endTs = new Date();
      console.log(`Image ${src} took ${endTs - startTs} to load`);
    });
    console.log("Image set to:", src);
  }
}

function rescale(v, min, max) {
  return (v / 127) * (max - min) + min;
}

function enableMIDI() {
  WebMidi.enable(function (err) {
    if (err) {
      console.log("WebMidi could not be enabled.", err);
    } else {
      console.log("WebMidi enabled!");
      console.log("Inputs:", WebMidi.inputs);
      subscribeToAllMIDIInputs();
    }
  });
}

function subscribeToAllMIDIInputs() {
  WebMidi.inputs.forEach(input => {
    input.addListener("controlchange", "all", function (e) {
      const ccn = e.controller.number;
      const ccv = e.value;

      if (ccn === 0) material.uniforms.nearClipping.value = rescale(ccv, 1, 10000);
      if (ccn === 1) material.uniforms.farClipping.value = rescale(ccv, 1, 10000);
      if (ccn === 2) material.uniforms.pointSize.value = rescale(ccv, 1, 10);
      if (ccn === 3) material.uniforms.zOffset.value = rescale(ccv, -2000, 2000);
      if (ccn === 4) material.uniforms.hue.value = rescale(ccv, 0.0, 1.0);
      if (ccn === 5) material.uniforms.saturation.value = rescale(ccv, 0.0, 1.0);
      if (ccn === 16) material.uniforms.uRandom.value = rescale(ccv, 0.0, 1.0);
      if (ccn === 17) material.uniforms.uDepth.value = rescale(ccv, 0.0, 2.0);
      if (ccn === 18) material.uniforms.clipX.value = rescale(ccv, 0.0, 1.0);
      if (ccn === 19) material.uniforms.clipY.value = rescale(ccv, 0.0, 1.0);
      if (ccn === 20) mouse.x = rescale(ccv, -3000, 3000);
      if (ccn === 21) mouse.y = rescale(ccv, -6000, 6000);
      if (ccn === 22) material.uniforms.clipWidthX.value = rescale(ccv, 0.0, 1.0);
      if (ccn === 23) material.uniforms.clipWidthY.value = rescale(ccv, 0.0, 1.0);

      if (ccn === 80) {
        setScene(ccv);
      }

      mustRender = true;

      console.debug("MIDI CC", ccn, "=", ccv);
    });
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(delta) {
  requestAnimationFrame(animate);

  updateCameraPosition()

  material.uniforms.time.value += delta;

  if (alwaysRender || mustRender) {
    renderer.render(scene, camera);
    mustRender = false;
    // console.debug("Render at", delta);
  }
}

function updateCameraPosition() {
  const newIncX = (mouse.x - camera.position.x) * 0.5;
  const newIncY = (- mouse.y - camera.position.y) * 0.5;

  if (newIncX || newIncY) {
    camera.position.x += newIncX
    camera.position.y += newIncY
    camera.lookAt(center);
    mustRender = true;
  }
}

function handleFlokMessages(event) {
  const msg = event.data;
  if (msg.cmd == "evaluateCode" && msg.args.target == "hydra") {
    const body = msg.args.body;
    console.log("Evaluate hydra:", body);
    try {
      setError("");
      eval(body);
    } catch (err) {
      setError(err);
    }
  }
}

function setError(err) {
  const el = document.getElementById("error");
  if (err) {
    console.log("Error:", err);
    el.innerHTML = err;
    el.classList.remove("hide");
  } else {
    el.innerHTML = "";
    el.classList.add("hide");
  }
}