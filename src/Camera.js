class Camera {
    constructor() {
      this.eye = new Vector3([0, 0, 3]);
      this.yaw = -Math.PI / 2;
      this.pitch = 0;
      this.worldUp = new Vector3([0, 1, 0]);
      this.mouseSensitivity = 0.002;
      this.moving = false;
      this.lastX = 0;
      this.lastY = 0;
      this.updateCameraVectors();
    }
    updateCameraVectors() {
      let x = Math.cos(this.yaw) * Math.cos(this.pitch);
      let y = Math.sin(this.pitch);
      let z = Math.sin(this.yaw) * Math.cos(this.pitch);
      this.front = new Vector3([x, y, z]).normalize();
      this.right = Vector3.cross(this.front, this.worldUp).normalize();
      this.up = Vector3.cross(this.right, this.front).normalize();
      this.at = new Vector3(this.eye.elements).add(this.front);
    }
    onMouseDown(e) {
      this.moving = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    }
    onMouseUp(e) {
      this.moving = false;
    }
    onMouseMove(e) {
      if (!this.moving) return;
      let offsetX = e.clientX - this.lastX;
      let offsetY = this.lastY - e.clientY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      offsetX *= this.mouseSensitivity;
      offsetY *= this.mouseSensitivity;
      this.yaw += offsetX;
      this.pitch += offsetY;
      if (this.pitch > Math.PI / 2 - 0.01) this.pitch = Math.PI / 2 - 0.01;
      if (this.pitch < -Math.PI / 2 + 0.01) this.pitch = -Math.PI / 2 + 0.01;
      this.updateCameraVectors();
    }
    forward(del = 0.2) {
      let newEye = new Vector3(this.eye.elements)
          .add(this.front.normalize().mul(del));
    
      let newX = newEye.elements[0];
      let newZ = newEye.elements[2];
  
      if (!isColliding(newX, newZ)) {
        this.eye = newEye;
      }
    
      this.updateCameraVectors();
    }
    backward(del = 0.2) {
      let newEye = new Vector3(this.eye.elements)
          .sub(this.front.normalize().mul(del));
    
      let newX = newEye.elements[0];
      let newZ = newEye.elements[2];
      
      if (!isColliding(newX, newZ)) {
        this.eye = newEye;
      }
    
      this.updateCameraVectors();
    }
    moveLeft(del = 0.2) {
      let rightDir = this.right.normalize().mul(del);
      let newEye = new Vector3(this.eye.elements).sub(rightDir);
    
      let newX = newEye.elements[0];
      let newZ = newEye.elements[2];
      
      if (!isColliding(newX, newZ)) {
        this.eye = newEye;
      }
      
      this.updateCameraVectors();
    }
    moveRight(del = 0.2) {
      let rightDir = this.right.normalize().mul(del);
      let newEye = new Vector3(this.eye.elements).add(rightDir);
    
      let newX = newEye.elements[0];
      let newZ = newEye.elements[2];
      
      if (!isColliding(newX, newZ)) {
        this.eye = newEye;
      }
      
      this.updateCameraVectors();
    }
    upMove(del=0.2) {
      this.eye = new Vector3(this.eye.elements).add(this.worldUp.normalize().mul(del));
      this.updateCameraVectors();
    }
    downMove(del = 0.2) {
      this.eye = new Vector3(this.eye.elements).sub(this.worldUp.normalize().mul(del));
      this.updateCameraVectors();
    }
    rotateLeft() {
      this.yaw -= 5 * Math.PI / 180;
      this.updateCameraVectors();
    }
    rotateRight() {
      this.yaw += 5 * Math.PI / 180;
      this.updateCameraVectors();
    }
  }
  