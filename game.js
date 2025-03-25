// Obtener el canvas y su contexto
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Cargar imágenes para la nave del jugador y la nave enemiga
const spaceshipImg = new Image();
spaceshipImg.src = "nave_buena.png";

const alienImg = new Image();
alienImg.src = "nave_mala.webp";

// Cargar sprite de explosión (se asume 5 frames horizontales, 64x64 cada uno)
const explosionSprite = new Image();
explosionSprite.src = "explosion.gif";

// Propiedades de la nave del jugador
const spaceship = {
  x: canvas.width / 2 - 15,
  y: canvas.height - 40,
  width: 30,
  height: 30,
  speed: 5,
  dx: 0
};

// Balas disparadas
const bullets = [];
const bulletSpeed = 7;
const bulletWidth = 4;
const bulletHeight = 10;

// Variables de niveles, enemigos y score
let level = 1;
let score = 0;
const alienCols = 8;
const alienWidth = 30;
const alienHeight = 30;
const alienPadding = 10;
const alienOffsetTop = 30;
const alienOffsetLeft = 30;
let alienDirection = 1; // 1: derecha, -1: izquierda
const baseAlienSpeed = 1;
let alienSpeed = baseAlienSpeed + (level - 1) * 0.5;
const alienDrop = 20;
let aliens = [];

// Arreglos para efectos visuales
let explosions = [];   // Explosiones al destruir enemigos (usando sprite animado)
let scorePopups = [];  // Pop-ups de puntuación

// Variables para control de estado del juego
let paused = false;
let gameOverFlag = false;
let victoryFlag = false;

// Función para crear la cuadrícula de enemigos
function createAliens() {
  aliens = [];
  const rows = Math.min(3 + level, 6);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < alienCols; col++) {
      const x = alienOffsetLeft + col * (alienWidth + alienPadding);
      const y = alienOffsetTop + row * (alienHeight + alienPadding);
      aliens.push({ x, y, width: alienWidth, height: alienHeight });
    }
  }
}

// Función para pasar al siguiente nivel
function nextLevel() {
  level++;
  alienSpeed = baseAlienSpeed + (level - 1) * 0.5;
  createAliens();
}

// SISTEMA DE EXPLOSIONES CON SPRITE
function addExplosion(x, y) {
  explosions.push({
    x: x,
    y: y,
    frame: 0,
    frameCount: 5,
    frameWidth: 64,
    frameHeight: 64,
    frameInterval: 5, // número de frames (ticks) por cambio de sprite
    frameTimer: 0
  });
}

function updateExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    let exp = explosions[i];
    exp.frameTimer++;
    if (exp.frameTimer >= exp.frameInterval) {
      exp.frame++;
      exp.frameTimer = 0;
      if (exp.frame >= exp.frameCount) {
        explosions.splice(i, 1);
      }
    }
  }
}

function drawExplosions() {
  explosions.forEach(exp => {
    ctx.drawImage(
      explosionSprite,
      exp.frame * exp.frameWidth, 0, // coordenadas de origen en el sprite
      exp.frameWidth, exp.frameHeight, // tamaño del frame
      exp.x - exp.frameWidth / 2, exp.y - exp.frameHeight / 2, // posición destino centrada
      exp.frameWidth, exp.frameHeight
    );
  });
}

// SISTEMA DE SCORE POPUPS
function addScorePopup(x, y, text) {
  scorePopups.push({
    x: x,
    y: y,
    text: text,
    alpha: 1,
    dy: -1
  });
}

function updateScorePopups() {
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    let sp = scorePopups[i];
    sp.y += sp.dy;
    sp.alpha -= 0.02;
    if (sp.alpha <= 0) {
      scorePopups.splice(i, 1);
    }
  }
}

function drawScorePopups() {
  scorePopups.forEach(sp => {
    ctx.save();
    ctx.globalAlpha = sp.alpha;
    ctx.fillStyle = "yellow";
    ctx.font = "18px Orbitron, sans-serif";
    ctx.fillText(sp.text, sp.x, sp.y);
    ctx.restore();
  });
}

// Dibuja la nave del jugador usando la imagen "nave_buena"
function drawSpaceship() {
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = "cyan";
  ctx.drawImage(spaceshipImg, spaceship.x, spaceship.y, spaceship.width, spaceship.height);
  ctx.restore();
}

// Dibuja las balas con efecto brillante
function drawBullets() {
  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = "magenta";
  ctx.fillStyle = "red";
  bullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bulletWidth, bulletHeight);
  });
  ctx.restore();
}

// Dibuja los enemigos usando la imagen "nave_mala"
function drawAliens() {
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = "lime";
  aliens.forEach(alien => {
    ctx.drawImage(alienImg, alien.x, alien.y, alien.width, alien.height);
  });
  ctx.restore();
}

// Mueve la nave, evitando que se salga del canvas
function moveSpaceship() {
  spaceship.x += spaceship.dx;
  if (spaceship.x < 0) spaceship.x = 0;
  if (spaceship.x + spaceship.width > canvas.width)
    spaceship.x = canvas.width - spaceship.width;
}

// Mueve las balas y las elimina al salir del canvas
function moveBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= bulletSpeed;
    if (bullets[i].y < 0) {
      bullets.splice(i, 1);
    }
  }
}

// Mueve los enemigos y hace que cambien de dirección al llegar a un borde
function moveAliens() {
  let hitEdge = false;
  aliens.forEach(alien => {
    alien.x += alienSpeed * alienDirection;
    if (alien.x + alien.width > canvas.width || alien.x < 0) {
      hitEdge = true;
    }
  });
  if (hitEdge) {
    alienDirection *= -1;
    aliens.forEach(alien => {
      alien.y += alienDrop;
    });
  }
}

// Detección de colisiones entre bala y enemigo
function collisionDetection() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = aliens.length - 1; j >= 0; j--) {
      if (
        bullets[i].x < aliens[j].x + aliens[j].width &&
        bullets[i].x + bulletWidth > aliens[j].x &&
        bullets[i].y < aliens[j].y + aliens[j].height &&
        bullets[i].y + bulletHeight > aliens[j].y
      ) {
        let explosionX = aliens[j].x + aliens[j].width / 2;
        let explosionY = aliens[j].y + aliens[j].height / 2;
        addExplosion(explosionX, explosionY);
        addScorePopup(explosionX, explosionY, "+10");
        score += 10;
        bullets.splice(i, 1);
        aliens.splice(j, 1);
        break;
      }
    }
  }
}

// Condición de fin de juego: si algún enemigo alcanza la nave
function checkGameOver() {
  for (let alien of aliens) {
    if (alien.y + alien.height >= spaceship.y) {
      return true;
    }
  }
  return false;
}

// Dibuja el HUD (Nivel y Score)
function drawHUD() {
  ctx.save();
  ctx.fillStyle = "cyan";
  ctx.font = "20px Orbitron, sans-serif";
  ctx.fillText("Nivel: " + level, 10, 30);
  ctx.fillText("Score: " + score, 10, 60);
  ctx.restore();
}

// Dibuja un overlay de pausa (además del overlay HTML)
function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "40px Orbitron, sans-serif";
  ctx.fillText("PAUSA", canvas.width / 2 - 70, canvas.height / 2);
  ctx.restore();
}

// Bucle principal del juego
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (!paused && !gameOverFlag && !victoryFlag) {
    moveSpaceship();
    moveBullets();
    moveAliens();
    collisionDetection();
  }
  
  drawSpaceship();
  drawBullets();
  drawAliens();
  drawHUD();
  updateExplosions();
  drawExplosions();
  updateScorePopups();
  drawScorePopups();
  
  if (paused) {
    drawPauseOverlay();
  }
  
  if (checkGameOver()) {
    gameOverFlag = true;
    showEndScreen("GAME OVER");
    return;
  }
  
  if (aliens.length === 0) {
    // Se considera victoria al completar 5 rondas (nivel 5 finalizado)
    if (level === 5) {
      victoryFlag = true;
      showEndScreen("¡VICTORIA!");
      return;
    } else {
      nextLevel();
    }
  }
  
  requestAnimationFrame(update);
}

// Función para mostrar el overlay final de partida
function showEndScreen(message) {
  const endScreen = document.getElementById("endScreen");
  const endMessage = document.getElementById("endMessage");
  endMessage.innerText = message;
  endScreen.classList.remove("hidden");
}

// Manejo de eventos del teclado para controlar la nave y disparar
function keyDown(e) {
  if (e.key === "ArrowRight" || e.key === "d") {
    spaceship.dx = spaceship.speed;
  } else if (e.key === "ArrowLeft" || e.key === "a") {
    spaceship.dx = -spaceship.speed;
  } else if (e.key === " ") {
    bullets.push({
      x: spaceship.x + spaceship.width / 2 - bulletWidth / 2,
      y: spaceship.y
    });
  } else if (e.key === "p" || e.key === "P") {
    togglePause();
  }
}

function keyUp(e) {
  if (
    e.key === "ArrowRight" ||
    e.key === "ArrowLeft" ||
    e.key === "a" ||
    e.key === "d"
  ) {
    spaceship.dx = 0;
  }
}

document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

// Funciones para controles táctiles (dispositivos móviles)
function setupTouchControls() {
  const touchLeft = document.getElementById("touchLeft");
  const touchRight = document.getElementById("touchRight");
  const touchFire = document.getElementById("touchFire");

  touchLeft.addEventListener("touchstart", function(e) {
    e.preventDefault();
    spaceship.dx = -spaceship.speed;
  });
  touchLeft.addEventListener("touchend", function(e) {
    e.preventDefault();
    spaceship.dx = 0;
  });

  touchRight.addEventListener("touchstart", function(e) {
    e.preventDefault();
    spaceship.dx = spaceship.speed;
  });
  touchRight.addEventListener("touchend", function(e) {
    e.preventDefault();
    spaceship.dx = 0;
  });

  touchFire.addEventListener("touchstart", function(e) {
    e.preventDefault();
    bullets.push({
      x: spaceship.x + spaceship.width / 2 - bulletWidth / 2,
      y: spaceship.y
    });
  });
}

// Función para alternar pausa
function togglePause() {
  paused = !paused;
  const pauseScreen = document.getElementById("pauseScreen");
  if (paused) {
    pauseScreen.classList.remove("hidden");
  } else {
    pauseScreen.classList.add("hidden");
  }
}

// Inicializar la cuadrícula de enemigos, controles táctiles y comenzar el juego
createAliens();
setupTouchControls();
update();
