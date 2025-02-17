var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV; 
  varying vec2 v_UV;
  uniform mat4 u_ModelMatrix; 
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix; 
  uniform mat4 u_ProjectionMatrix; 
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV; 
  }
`

var FSHADER_SOURCE = `
precision mediump float;
varying vec2 v_UV; 
uniform vec4 u_FragColor;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;

// ADD THIS
uniform sampler2D u_Sampler2;

uniform int u_whichTexture; 
void main() {
    if (u_whichTexture == -2){
      gl_FragColor = u_FragColor;
    } else if (u_whichTexture == -1){
      gl_FragColor = vec4(v_UV, 1.0, 1.0);
    } else if (u_whichTexture == 0){
      gl_FragColor = texture2D(u_Sampler0, v_UV);
    } else if (u_whichTexture == 1){
      gl_FragColor = texture2D(u_Sampler1, v_UV);
    }
    // NEW CASE FOR THE TREE TEXTURE
    else if (u_whichTexture == 2){
      gl_FragColor = texture2D(u_Sampler2, v_UV);
    }
    else {
      gl_FragColor = vec4(1,0.2,0.2,1);
    }
}

`

const POINT = 0; 
const TRIANGLE = 1;
const CIRCLE = 2;

let a_UV; 

let g_globalAngle = 0; 
let g_verticalAngle = 0;
let g_jawAngle = 0;   
let g_tongueLength = 0.6; 
let g_yellowAngle = 0;
let g_yellowAnimation = false;
let g_snakeAnimation = false;
let g_body5Angle = 0;
let g_body5AnimAngle = 0;

let g_selectedType = POINT; 
let g_selectedSize = 5; 
let canvas; 
let gl; 
let a_Position;
let u_Sampler0; 
let u_Sampler1;
let u_Sampler2;
let u_FragColor; 
let u_GlobalRotateMatrix;
let u_whichTexture;
let u_ModelMatrix; 
let u_ProjectionMatrix; 
let u_ViewMatrix; 
let g_snakePos = [0, 0];
let g_gameOver = false;
let g_gameStartTime = 0;
let cSegments = 10; 
let g_headPos = 0;

function addActionsForHtmlUI(){
  document.getElementById('angleSlide').addEventListener('input', function() {
    g_globalAngle = -1 * this.value;
    renderAllShapes();
  });
  document.getElementById('verticalSlide').addEventListener('input', function() {
    g_verticalAngle = -1 * this.value;
    renderAllShapes();
  });
}

function setupWebGL(){
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

function isColliding(newX, newZ, radius = 0.15) { 
  let halfSize = g_terrainHeights.length / 2;

  let mapX = Math.floor(newX + halfSize);
  let mapZ = Math.floor(newZ + halfSize);

  if (
    mapX < 0 || mapX >= g_terrainHeights.length ||
    mapZ < 0 || mapZ >= g_terrainHeights[0].length
  ) {
    return true;
  }

  if (g_terrainHeights[mapX][mapZ] > 0) {
    let centerX = mapX - halfSize + 0.5; 
    let centerZ = mapZ - halfSize + 0.5;
    let dist = Math.sqrt((newX - centerX) ** 2 + (newZ - centerZ) ** 2);

    return dist < radius;
  }

  return false; 
}

function connectVariablesToGLSL(){
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log('Failed to get the storage location of u_Sampler0');
    return false;
  }
  
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if (!u_Sampler1) {
    console.log('Failed to get the storage location of u_Sampler1');
    return false;
  }
  
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  if (!u_Sampler2) {
    console.log('Failed to get u_Sampler2 location');
    return false;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }
  
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if (!u_whichTexture) {
    console.log('Failed to get the storage location of u_whichTexture');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix'); 
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix'); 
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix'); 
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix'); 
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix'); 
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix'); 
    return;
  }

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix'); 
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix'); 
    return;
  }

  var identityM = new Matrix4(); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

function resetGame() {
  g_terrainHeights = [];
  initTerrain(16, 4, 8);
  g_snakePos[0] = Math.floor(Math.random() * 16) - 8;
  g_snakePos[1] = Math.floor(Math.random() * 16) - 8;
  g_gameOver = false;
  g_yellowAngle = false; 
  g_snakeAnimation = false;
  g_gameStartTime = performance.now() / 1000;
  document.getElementById("winText").innerHTML = "";
}


function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI(); 
  document.onkeydown = keydown;
  canvas.addEventListener('mousedown', function(e){ g_camera.onMouseDown(e); });
  canvas.addEventListener('mouseup', function(e){ g_camera.onMouseUp(e); });
  canvas.addEventListener('mousemove', function(e){ g_camera.onMouseMove(e); });  
  canvas.addEventListener('mousedown', onMouseClick);
  document.getElementById('resetBtn').onclick = resetGame;
  resetGame();
  initTextures();
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  requestAnimationFrame(tick);
}

let g_startTime = performance.now() / 1000.0; 
let g_seconds  = performance.now() / 1000.0 - g_startTime;

function tick() {
  if (!g_gameOver) {
    let now = performance.now() / 1000;
    let elapsed = (now - g_gameStartTime).toFixed(2);
    document.getElementById("timer").innerHTML = "Time: " + elapsed;
    let dx = g_camera.eye.elements[0] - g_snakePos[0];
    let dz = g_camera.eye.elements[2] - g_snakePos[1];
    if (Math.sqrt(dx * dx + dz * dz) < 1) {
      document.getElementById("winText").innerHTML = "<span style='font-size: 32px; color:rgb(255, 38, 0); font-weight: bold;'>You win!</span>";
      g_yellowAnimation = true;
      g_snakeAnimation = true;
      g_gameOver = true;
    }
  }
  updateAnimationAngles();
  renderAllShapes();
  requestAnimationFrame(tick);
}

function onMouseClick(e) {
  e.preventDefault();

  let hit = raycastForTreeBlock(3, 30); 
  if (!hit) {
    return;
  }

  let { mapX, mapZ } = hit;

  if (e.button === 0) {
    if (g_terrainHeights[mapX][mapZ] > 0) {
      g_terrainHeights[mapX][mapZ]--;
    }
  } else if (e.button === 2) {
    g_terrainHeights[mapX][mapZ]++;
  }

  renderAllShapes();
}

function clamp(val, min, max){
  return (val < min) ? min : (val > max) ? max : val;
}

function initTextures() {
  var image = new Image();
  if (!image) {
    console.log('Failed to create the image object');
    return false;
  }
  image.onload = function(){ sendImageToTEXTURE0(image); };
  image.src = '../resources/grass.jpg';
  var skyImage = new Image();
  if (!skyImage) {
    console.log('Failed to create the sky image object');
    return false;
  }
  skyImage.onload = function(){ sendImageToTEXTURE1(skyImage); };
  skyImage.src = '../resources/sky.jpg';

  let treeImage = new Image();
  if (!treeImage) {
    console.log('Failed to create the tree image object');
    return false;
  }
  treeImage.onload = function(){
    sendImageToTEXTURE2(treeImage);
  };
  treeImage.src = '../resources/tree.jpg';

  return true;

}

function sendImageToTEXTURE2(image) {
  let texture = gl.createTexture();
  if (!texture) {
    console.log('Failed to create the texture object for tree');
    return false;
  } 
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(u_Sampler2, 2);
}

function sendImageToTEXTURE0(image) {
  var texture = gl.createTexture();
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  } 
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(u_Sampler0, 0);
}

function sendImageToTEXTURE1(image) {
  var texture = gl.createTexture();
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(u_Sampler1, 1);
}

function updateAnimationAngles(){
  if (g_yellowAnimation){
    if(g_jawAngle < 45){
      g_jawAngle += 0.3;  
    }
  }
  
  let angleFrac = clamp(g_jawAngle, 0, 45) / 45; 
  let targetLength = 0.8 + (1.5 - 0.8) * angleFrac; 

  let diff = targetLength - g_tongueLength;
  if (Math.abs(diff) > 0.01){
    g_tongueLength += 0.01 * Math.sign(diff);
  }

  if (g_snakeAnimation){
    g_body5AnimAngle = 30 * Math.sin(g_seconds * 2);
  } else {
    g_body5AnimAngle = 0;
  }
}

var g_eye = [0,0,3]; 
var g_at = [0, 0, -100];
var g_up = [0,1,0];

var g_camera = new Camera();

function keydown(ev) {
  if (ev.keyCode == 68) {
      g_camera.moveRight();
  } else if (ev.keyCode == 65) {
      g_camera.moveLeft();
  } else if (ev.keyCode == 87) {
      g_camera.forward();
  } else if (ev.keyCode == 83) {
      g_camera.backward();
  } else if (ev.keyCode == 81) {
      g_camera.rotateLeft();
  } else if (ev.keyCode == 69) {
      g_camera.rotateRight();
  }
  renderAllShapes();
  console.log(ev.keyCode);
}

var g_map = [
  [1, 1, 1, 1, 1, 1, 1, 1], 
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1], 
  [1, 0, 0, 0, 0, 0, 0, 1], 
  [1, 0, 0, 0, 0, 0, 0, 1], 
  [1, 0, 0, 0, 0, 0, 0, 1], 
  [1, 0, 0, 0, 0, 0, 0, 1]
]

let g_terrainHeights = [];

function initTerrain(size, minHeight, maxHeight) {
  for (let x = 0; x < size; x++) {
    g_terrainHeights[x] = [];
    for (let z = 0; z < size; z++) {
      if (Math.random() > 0.7){ //change this to param later
        g_terrainHeights[x][z] = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
      }
    }
  }
}

function drawTerrain() {
  const scale = 0.25;       
  const yOffset = -0.75;    
  const halfSize = g_terrainHeights.length / 2;

  for (let x = 0; x < g_terrainHeights.length; x++) {
    for (let z = 0; z < g_terrainHeights[x].length; z++) {
      let trunkHeight = g_terrainHeights[x][z];
      if (trunkHeight <= 0) continue; 
      for (let y = 0; y < trunkHeight; y++) {
        let trunkCube = new Cube();
        trunkCube.color = [139/255, 69/255, 19/255, 1]; 
        trunkCube.textureNum = -2; 

        trunkCube.matrix.translate(
          (x - halfSize),           
          (y * scale) + yOffset,    
          (z - halfSize)
        );
        trunkCube.matrix.scale(scale, scale, scale);

        trunkCube.render();
      }

      let leafY = trunkHeight * scale + yOffset;
      
      for (let lx = -1; lx <= 1; lx++) {
        for (let lz = -1; lz <= 1; lz++) {
          let leafCube = new Cube();
          leafCube.textureNum = 2;
          leafCube.color = [1, 1, 1, 1];

          leafCube.matrix.translate(
            (x - halfSize) + lx * scale, 
            leafY,                      
            (z - halfSize) + lz * scale
          );
          leafCube.matrix.scale(scale, scale, scale);

          leafCube.render();
        }
      }
    }
  }
}

function raycastForTreeBlock(maxDist = 3, steps = 30) {
  let startX = g_camera.eye.elements[0];
  let startZ = g_camera.eye.elements[2];

  let dirX = g_camera.front.elements[0];
  let dirZ = g_camera.front.elements[2];

  let halfSize = g_terrainHeights.length / 2;

  for (let i = 0; i <= steps; i++) {
    let t = (maxDist / steps) * i;
    let testX = startX + dirX * t;
    let testZ = startZ + dirZ * t;

    let mapX = Math.floor(testX + halfSize);
    let mapZ = Math.floor(testZ + halfSize);

    if (
      mapX < 0 || mapX >= g_terrainHeights.length ||
      mapZ < 0 || mapZ >= g_terrainHeights[0].length
    ) {
      break;
    }

    if (g_terrainHeights[mapX][mapZ] > 0) {
      return { mapX, mapZ };
    }
  }
  return null;
}


function drawMap(){
  for(var x = 0; x < 8; x++){
    for(var y =0; y < 8; y++){
      if(g_map[x][y] == 1){
        var body = new Cube(); 
        body.textureNum = -2;
        body.color = [1, 1, 1, 1]; 
        body.matrix.translate(x-4, -0.75, y-4); 
        body.render();
      }
    }
  }
}

function renderSnake() {
  let upperJaw = new Cube();
  upperJaw.color = [0.0, 0.7, 0.0, 1.0];
  upperJaw.textureNum = -2; 
  upperJaw.matrix.translate(g_snakePos[0], 0.55, g_snakePos[1]);
  upperJaw.matrix.scale(0.2, 0.25, 0.5);
  let upperJawMat = new Matrix4(upperJaw.matrix);
  upperJaw.render();

  let lowerJaw = new Cube();
  lowerJaw.color = [0.0, 0.5, 0.0, 1.0];
  lowerJaw.textureNum = -2; 
  lowerJaw.matrix = new Matrix4(upperJawMat);
  lowerJaw.matrix.translate(0, -0.35, 0.15);
  lowerJaw.matrix.rotate(180, 0, 1, 0);
  lowerJaw.matrix.translate(-1.0, 0.25, -0.85);
  lowerJaw.matrix.rotate(g_jawAngle, 1, 0, 0);
  lowerJaw.matrix.scale(1, 0.25, 1);
  lowerJaw.render();

  let rightEye = new Ellipsoid();
  rightEye.color = [0.0, 0.0, 0.0, 1.0];
  rightEye.textureNum = -2; 
  rightEye.matrix = new Matrix4(upperJawMat);
  rightEye.matrix.scale(0.35, 0.35, 0.35);
  rightEye.matrix.translate(0, 1.5, 1.0);
  rightEye.render();

  let leftEye = new Ellipsoid();
  leftEye.color = [0.0, 0.0, 0.0, 1.0];
  leftEye.textureNum = -2; 
  leftEye.matrix = new Matrix4(upperJawMat);
  leftEye.matrix.scale(0.35, 0.35, 0.35);
  leftEye.matrix.translate(2.75, 1.5, 1.0);
  leftEye.render();

  let baseTongue = new Cube();
  baseTongue.color = [0.95, 0.4, 0.4, 1.0];
  baseTongue.textureNum = -2; 
  baseTongue.matrix = new Matrix4(lowerJaw.matrix);
  baseTongue.matrix.translate(0.30, 1.0, 0.0);
  baseTongue.matrix.scale(0.4, 0.25, g_tongueLength);
  baseTongue.render();

  let leftFork = new Cube();
  leftFork.color = [0.95, 0.4, 0.4, 1.0];
  leftFork.textureNum = -2; 
  leftFork.matrix = new Matrix4(baseTongue.matrix);
  leftFork.matrix.translate(0.5, 0, 1);
  leftFork.matrix.rotate(45, 0, 1, 0);
  leftFork.matrix.scale(0.3, 1, 0.5);
  leftFork.render();

  let rightFork = new Cube();
  rightFork.color = [0.95, 0.4, 0.4, 1.0];
  rightFork.textureNum = -2; 
  rightFork.matrix = new Matrix4(baseTongue.matrix);
  rightFork.matrix.translate(0.15, 0, 0.8);
  rightFork.matrix.rotate(-45, 0, 1, 0);
  rightFork.matrix.scale(0.3, 1, 0.5);
  rightFork.render();

  let body1 = new Cube();
  body1.color = [0.0, 0.8, 0.0, 1.0];
  body1.textureNum = -2; 
  body1.matrix = new Matrix4(upperJawMat);
  body1.matrix.translate(0.25, 0, 1.0);
  body1.matrix.rotate(-180, 1, 0, 0);
  body1.matrix.scale(0.5, 1.5, 0.25);
  let body1Mat = new Matrix4(body1.matrix);
  body1.render();

  let body2 = new Cube();
  body2.color = [0.0, 0.6, 0.0, 1.0];
  body2.textureNum = -2; 
  body2.matrix = new Matrix4(body1Mat);
  body2.matrix.translate(0, 1.0, 0);
  body2.matrix.rotate(-15, 1, 0, 0);
  let body2Mat = new Matrix4(body2.matrix);
  body2.render();

  let body3 = new Cube();
  body3.color = [0.0, 0.8, 0.0, 1.0];
  body3.textureNum = -2; 
  body3.matrix = new Matrix4(body2Mat);
  body3.matrix.translate(0, 1, 0);
  body3.matrix.rotate(-25, 1, 0, 0);
  let body3Mat = new Matrix4(body3.matrix);
  body3.render();

  let body4 = new Cube();
  body4.color = [0.0, 0.6, 0.0, 1.0];
  body4.textureNum = -2; 
  body4.matrix = new Matrix4(body3Mat);
  body4.matrix.translate(0, 1, 0);
  body4.matrix.rotate(-50, 1, 0, 0);
  body4.matrix.rotate(g_snakeAnimation ? 30 * Math.sin(g_seconds * 2 + Math.PI/6) : 0, 0, 0, 1);
  body4.matrix.scale(1, 2.5, 0.75);
  let body4Mat = new Matrix4(body4.matrix);
  body4.render();

  let body5 = new Cube();
  body5.color = [0.0, 0.8, 0.0, 1.0];
  body5.textureNum = -2; 
  body5.matrix = new Matrix4(body4Mat);
  body5.matrix.translate(0, 1, 0);
  body5.matrix.rotate(g_body5Angle + g_body5AnimAngle, 0, 0, 1);
  body5.matrix.scale(0.98, 0.98, 0.98);
  let body5Mat = new Matrix4(body5.matrix);
  body5.render();

  let body6 = new Cube();
  body6.color = [0.0, 0.6, 0.0, 1.0];
  body6.textureNum = -2; 
  body6.matrix = new Matrix4(body5Mat);
  body6.matrix.translate(0, 1, 0);
  body6.matrix.rotate(g_snakeAnimation ? -30 * Math.sin(g_seconds * 2 + Math.PI/3) : 0, 0, 0, 1);
  body6.matrix.scale(0.8, 0.75, 0.8);
  let body6Mat = new Matrix4(body6.matrix);
  body6.render();

}


function renderAllShapes() {
  var startTime = performance.now();
  var projMat = new Matrix4();
  projMat.setPerspective(60, canvas.width/canvas.height, 0.1, 100);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);
  var viewMat = new Matrix4();
  viewMat.setLookAt(
    g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2],
    g_camera.at.elements[0], g_camera.at.elements[1], g_camera.at.elements[2],
    g_camera.up.elements[0], g_camera.up.elements[1], g_camera.up.elements[2]
  );
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);
  let yRotationMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
  let xRotationMat = new Matrix4().rotate(g_verticalAngle, 1, 0, 0);
  let globalRotMat = yRotationMat.multiply(xRotationMat);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  renderSnake();

  let floor = new Cube();
  floor.color = [1, 0, 0, 1];
  floor.textureNum = 0;
  floor.matrix.translate(0, -0.75, 0);
  floor.matrix.scale(32, 0, 32);
  floor.matrix.translate(-0.5, 0, -0.5);
  floor.render();

  let skyBox = new Cube();
  skyBox.color = [1, 0, 0, 1];
  skyBox.textureNum = 1;
  skyBox.matrix.scale(50, 50, 50);
  skyBox.matrix.translate(-0.5, -0.5, -0.5);
  skyBox.render();

  drawTerrain();
  let duration = performance.now() - startTime;
  sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(1000/duration), "numdot");
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
      console.log("Failed to get " + htmlID + " from HTML");
      return;
  }
  htmlElm.innerHTML = text;
}
