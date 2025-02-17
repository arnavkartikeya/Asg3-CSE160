class Cube {
    static #cubeVertexBuffer = null;
    static #cubeUVBuffer = null;
    static #initialized = false;

    static #VERTICES = new Float32Array([
      // Front face
      0,0,0,   1,1,0,   1,0,0,
      0,0,0,   0,1,0,   1,1,0,
      // Top face
      0,1,0,   0,1,1,   1,1,1,
      0,1,0,   1,1,1,   1,1,0,
      // Right face
      1,0,0,   1,1,0,   1,1,1,
      1,0,0,   1,1,1,   1,0,1,
      // Left face
      0,0,0,   0,1,0,   0,1,1,
      0,0,0,   0,1,1,   0,0,1,
      // Back face
      0,0,1,   0,1,1,   1,1,1,
      0,0,1,   1,1,1,   1,0,1,
      // Bottom face
      0,0,0,   0,0,1,   1,0,1,
      0,0,0,   1,0,1,   1,0,0
    ]);
  
    static #UVS = new Float32Array([
      // Front face
      0,0,  1,1,  1,0,
      0,0,  0,1,  1,1,
      // Top face
      0,0,  0,1,  1,1,
      0,0,  1,1,  1,0,
      // Right face
      0,0,  0,1,  1,1,
      0,0,  1,1,  1,0,
      // Left face
      0,0,  0,1,  1,1,
      0,0,  1,1,  1,0,
      // Back face
      0,0,  0,1,  1,1,
      0,0,  1,1,  1,0,
      // Bottom face
      0,0,  0,1,  1,1,
      0,0,  1,1,  1,0
    ]);
  
    static #NUM_VERTICES = 36; 

    static initCubeBuffers() {
      if (Cube.#initialized) return; 
      
      Cube.#cubeVertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube.#cubeVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, Cube.#VERTICES, gl.STATIC_DRAW);
  
      Cube.#cubeUVBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube.#cubeUVBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, Cube.#UVS, gl.STATIC_DRAW);
  
      Cube.#initialized = true;
    }
  
    constructor() {
      this.color = [1.0, 1.0, 1.0, 1.0]; 
      this.matrix = new Matrix4();      
      this.textureNum = 0;             
    }
  
    render() {
      if (!Cube.#initialized) {
        Cube.initCubeBuffers();
      }

      gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
      gl.uniform1i(u_whichTexture, this.textureNum);
      gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube.#cubeVertexBuffer);
      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Position);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube.#cubeUVBuffer);
      gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_UV);
  
      gl.drawArrays(gl.TRIANGLES, 0, Cube.#NUM_VERTICES);
    }
  }
  