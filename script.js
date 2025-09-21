// 게임 변수들
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const livesElement = document.getElementById('lives');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// 게임 상태
let gameRunning = false;
let gamePaused = false;
let score = 0;
let lives = 3;
let level = 1;

// 파워업 시스템
let powerUps = [];
let powerUpTypes = {
    BIG_PADDLE: { color: '#00ff00', duration: 10000 },
    SMALL_PADDLE: { color: '#ff0000', duration: 10000 },
    BIG_BALL: { color: '#ffff00', duration: 10000 },
    SMALL_BALL: { color: '#ff00ff', duration: 10000 },
    MULTI_BALL: { color: '#00ffff', duration: 0 },
    EXTRA_LIFE: { color: '#ff8800', duration: 0 }
};

// 파티클 시스템
let particles = [];

// 사운드 효과 (Web Audio API 사용)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// 공 객체들 (다중 공 지원)
let balls = [{
    x: canvas.width / 2,
    y: canvas.height - 50,
    radius: 10,
    dx: 4,
    dy: -4,
    color: '#ff6b6b'
}];

// 파워업 상태
let powerUpStates = {
    bigPaddle: false,
    smallPaddle: false,
    bigBall: false,
    smallBall: false
};

// 패들 객체
const paddle = {
    x: canvas.width / 2 - 50,
    y: canvas.height - 20,
    width: 100,
    height: 15,
    dx: 0,
    speed: 8,
    color: '#4ecdc4',
    originalWidth: 100
};

// 벽돌 배열
const bricks = [];
const brickRowCount = 5;
const brickColumnCount = 10;
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 5;
const brickOffsetTop = 50;
const brickOffsetLeft = 35;

// 사운드 효과 함수들
function playSound(frequency, duration, type = 'sine') {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// 파티클 생성
function createParticles(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 4,
            dy: (Math.random() - 0.5) * 4,
            life: 30,
            maxLife: 30,
            color: color,
            size: Math.random() * 3 + 1
        });
    }
}

// 파티클 업데이트 및 그리기
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.life--;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        } else {
            const alpha = particle.life / particle.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// 파워업 생성
function createPowerUp(x, y) {
    const types = Object.keys(powerUpTypes);
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    powerUps.push({
        x: x,
        y: y,
        type: randomType,
        color: powerUpTypes[randomType].color,
        width: 20,
        height: 20,
        dy: 2
    });
}

// 파워업 업데이트
function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.y += powerUp.dy;
        
        // 패들과 충돌
        if (powerUp.x < paddle.x + paddle.width &&
            powerUp.x + powerUp.width > paddle.x &&
            powerUp.y < paddle.y + paddle.height &&
            powerUp.y + powerUp.height > paddle.y) {
            
            applyPowerUp(powerUp.type);
            powerUps.splice(i, 1);
            playSound(800, 0.2);
            createParticles(powerUp.x, powerUp.y, powerUp.color, 8);
        }
        // 화면 밖으로 나감
        else if (powerUp.y > canvas.height) {
            powerUps.splice(i, 1);
        }
    }
}

// 파워업 적용
function applyPowerUp(type) {
    switch(type) {
        case 'BIG_PADDLE':
            paddle.width = paddle.originalWidth * 1.5;
            powerUpStates.bigPaddle = true;
            setTimeout(() => {
                paddle.width = paddle.originalWidth;
                powerUpStates.bigPaddle = false;
            }, powerUpTypes.BIG_PADDLE.duration);
            break;
        case 'SMALL_PADDLE':
            paddle.width = paddle.originalWidth * 0.7;
            powerUpStates.smallPaddle = true;
            setTimeout(() => {
                paddle.width = paddle.originalWidth;
                powerUpStates.smallPaddle = false;
            }, powerUpTypes.SMALL_PADDLE.duration);
            break;
        case 'BIG_BALL':
            balls.forEach(ball => ball.radius = 15);
            powerUpStates.bigBall = true;
            setTimeout(() => {
                balls.forEach(ball => ball.radius = 10);
                powerUpStates.bigBall = false;
            }, powerUpTypes.BIG_BALL.duration);
            break;
        case 'SMALL_BALL':
            balls.forEach(ball => ball.radius = 5);
            powerUpStates.smallBall = true;
            setTimeout(() => {
                balls.forEach(ball => ball.radius = 10);
                powerUpStates.smallBall = false;
            }, powerUpTypes.SMALL_BALL.duration);
            break;
        case 'MULTI_BALL':
            if (balls.length < 3) {
                const newBall = {
                    x: balls[0].x,
                    y: balls[0].y,
                    radius: balls[0].radius,
                    dx: -balls[0].dx,
                    dy: balls[0].dy,
                    color: '#ff6b6b'
                };
                balls.push(newBall);
            }
            break;
        case 'EXTRA_LIFE':
            lives++;
            livesElement.textContent = lives;
            break;
    }
}

// 벽돌 생성
function createBricks() {
    bricks.length = 0;
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = { x: 0, y: 0, status: 1, color: getBrickColor(r) };
        }
    }
}

// 벽돌 색상 생성
function getBrickColor(row) {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
    return colors[row % colors.length];
}

// 벽돌 그리기
function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                
                // 그라데이션 효과
                const gradient = ctx.createLinearGradient(brickX, brickY, brickX + brickWidth, brickY + brickHeight);
                gradient.addColorStop(0, bricks[c][r].color);
                gradient.addColorStop(1, darkenColor(bricks[c][r].color, 0.3));
                
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = gradient;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.closePath();
            }
        }
    }
}

// 색상 어둡게 만들기
function darkenColor(color, factor) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgb(${Math.floor(r * (1 - factor))}, ${Math.floor(g * (1 - factor))}, ${Math.floor(b * (1 - factor))})`;
}

// 공 그리기 (다중 공 지원)
function drawBalls() {
    balls.forEach(ball => {
        // 그라데이션 효과
        const gradient = ctx.createRadialGradient(ball.x - ball.radius/3, ball.y - ball.radius/3, 0, ball.x, ball.y, ball.radius);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(1, ball.color);
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    });
}

// 패들 그리기
function drawPaddle() {
    // 그라데이션 효과
    const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y + paddle.height);
    gradient.addColorStop(0, paddle.color);
    gradient.addColorStop(1, darkenColor(paddle.color, 0.3));
    
    ctx.beginPath();
    ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
}

// 파워업 그리기
function drawPowerUps() {
    powerUps.forEach(powerUp => {
        // 깜빡이는 효과
        const alpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = powerUp.color;
        ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        ctx.restore();
    });
}

// 충돌 감지 (다중 공 지원)
function collisionDetection() {
    balls.forEach(ball => {
        for (let c = 0; c < brickColumnCount; c++) {
            for (let r = 0; r < brickRowCount; r++) {
                const brick = bricks[c][r];
                if (brick.status === 1) {
                    if (ball.x > brick.x && 
                        ball.x < brick.x + brickWidth && 
                        ball.y > brick.y && 
                        ball.y < brick.y + brickHeight) {
                        ball.dy = -ball.dy;
                        brick.status = 0;
                        score += 10;
                        scoreElement.textContent = score;
                        
                        // 사운드 효과
                        playSound(440, 0.1);
                        
                        // 파티클 효과
                        createParticles(brick.x + brickWidth/2, brick.y + brickHeight/2, brick.color, 6);
                        
                        // 20% 확률로 파워업 생성
                        if (Math.random() < 0.2) {
                            createPowerUp(brick.x + brickWidth/2, brick.y + brickHeight/2);
                        }
                        
                        // 모든 벽돌이 깨졌는지 확인
                        if (score === brickRowCount * brickColumnCount * 10) {
                            gameWin();
                        }
                    }
                }
            }
        }
    });
}

// 게임 승리
function gameWin() {
    gameRunning = false;
    alert('축하합니다! 모든 벽돌을 깼습니다!');
    resetGame();
}

// 게임 오버
function gameOver() {
    gameRunning = false;
    lives--;
    livesElement.textContent = lives;
    
    if (lives <= 0) {
        alert('게임 오버! 최종 점수: ' + score);
        resetGame();
    } else {
        resetBalls();
    }
}

// 공 리셋 (다중 공 지원)
function resetBalls() {
    balls = [{
        x: canvas.width / 2,
        y: canvas.height - 50,
        radius: 10,
        dx: 4 * (Math.random() > 0.5 ? 1 : -1),
        dy: -4,
        color: '#ff6b6b'
    }];
}

// 공 업데이트 (다중 공 지원)
function updateBalls() {
    for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // 벽 충돌
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.dx = -ball.dx;
            playSound(200, 0.1);
        }
        
        if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
            playSound(200, 0.1);
        }
        
        // 패들 충돌
        if (ball.y + ball.radius > paddle.y && 
            ball.x > paddle.x && 
            ball.x < paddle.x + paddle.width) {
            ball.dy = -ball.dy;
            // 패들의 어느 부분에 맞았는지에 따라 각도 조정
            const hitPos = (ball.x - paddle.x) / paddle.width;
            ball.dx = 8 * (hitPos - 0.5);
            playSound(600, 0.1);
            createParticles(ball.x, ball.y, '#4ecdc4', 3);
        }
        
        // 바닥에 떨어짐
        if (ball.y + ball.radius > canvas.height) {
            balls.splice(i, 1);
            if (balls.length === 0) {
                gameOver();
            }
        }
    }
}

// 패들 업데이트
function updatePaddle() {
    paddle.x += paddle.dx;
    
    // 패들이 화면 밖으로 나가지 않도록
    if (paddle.x < 0) {
        paddle.x = 0;
    }
    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

// 게임 루프
function gameLoop() {
    if (!gameRunning || gamePaused) return;
    
    // 화면 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 게임 객체들 그리기
    drawBricks();
    drawBalls();
    drawPaddle();
    drawPowerUps();
    updateParticles();
    
    // 충돌 감지
    collisionDetection();
    
    // 객체들 업데이트
    updateBalls();
    updatePaddle();
    updatePowerUps();
    
    // 다음 프레임 요청
    requestAnimationFrame(gameLoop);
}

// 게임 시작
function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        gamePaused = false;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        gameLoop();
    }
}

// 게임 일시정지
function pauseGame() {
    if (gameRunning) {
        gamePaused = !gamePaused;
        if (!gamePaused) {
            gameLoop();
        }
        pauseBtn.textContent = gamePaused ? '계속하기' : '일시정지';
    }
}

// 게임 리셋
function resetGame() {
    gameRunning = false;
    gamePaused = false;
    score = 0;
    lives = 3;
    level = 1;
    scoreElement.textContent = score;
    levelElement.textContent = level;
    livesElement.textContent = lives;
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = '일시정지';
    
    // 파워업 상태 리셋
    powerUpStates = {
        bigPaddle: false,
        smallPaddle: false,
        bigBall: false,
        smallBall: false
    };
    
    // 파워업과 파티클 초기화
    powerUps = [];
    particles = [];
    
    resetBalls();
    createBricks();
    
    // 화면 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawBalls();
    drawPaddle();
}

// 마우스 이벤트
canvas.addEventListener('mousemove', (e) => {
    if (gameRunning && !gamePaused) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        paddle.x = mouseX - paddle.width / 2;
    }
});

// 키보드 이벤트
document.addEventListener('keydown', (e) => {
    if (gameRunning && !gamePaused) {
        switch(e.key) {
            case 'ArrowLeft':
                paddle.dx = -paddle.speed;
                break;
            case 'ArrowRight':
                paddle.dx = paddle.speed;
                break;
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        paddle.dx = 0;
    }
});

// 버튼 이벤트
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
resetBtn.addEventListener('click', resetGame);

// 게임 초기화
createBricks();
drawBricks();
drawBalls();
drawPaddle();
