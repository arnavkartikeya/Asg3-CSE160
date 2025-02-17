class Ellipsoid {
    constructor(radiusX = 0.5, radiusY = 0.5, radiusZ = 0.5) {
        this.type = 'ellipsoid';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.radiusX = radiusX;
        this.radiusY = radiusY;
        this.radiusZ = radiusZ;
        this.phiBands = 15;
        this.thetaBands = 30;
        this.vertices = [];
        this.uvCoords = [];  
        this.indices = [];
        this.textureNum = -2;
        this.generateVertices();
    }

    generateVertices() {
        for (let phiNum = 0; phiNum <= this.phiBands; phiNum++) {
            const phi = (phiNum / this.phiBands) * Math.PI;
            const v = phiNum / this.phiBands;  
            
            for (let thetaNum = 0; thetaNum <= this.thetaBands; thetaNum++) {
                const theta = (thetaNum / this.thetaBands) * 2 * Math.PI;
                const u = thetaNum / this.thetaBands; 
                
                const x = this.radiusX * Math.cos(theta) * Math.sin(phi);
                const y = this.radiusY * Math.sin(theta) * Math.sin(phi);
                const z = this.radiusZ * Math.cos(phi);
                
                this.vertices.push(x, y, z);
                this.uvCoords.push(u, v); 
            }
        }

        for (let phiNum = 0; phiNum < this.phiBands; phiNum++) {
            for (let thetaNum = 0; thetaNum < this.thetaBands; thetaNum++) {
                const first = (phiNum * (this.thetaBands + 1)) + thetaNum;
                const second = first + this.thetaBands + 1;

                this.indices.push(first, second, first + 1);
                this.indices.push(second, second + 1, first + 1);
            }
        }
    }

    render() {
        const rgba = this.color;
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniform1i(u_whichTexture, this.textureNum); 

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        const uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvCoords), gl.STATIC_DRAW);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.deleteBuffer(vertexBuffer);
        gl.deleteBuffer(uvBuffer);
        gl.deleteBuffer(indexBuffer);
    }
}
