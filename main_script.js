var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
var ballRadius = 5;
var paddleHeight = 15;
var paddleWidth = 75;
var paddleY = canvas.height - paddleHeight;
var paddleX = (canvas.width-paddleWidth)/2;
var rightPressed = false;
var leftPressed = false;
var brickRowCount = 7; 
var brickColumnCount = 3;
var brickWidth = 75;
var brickHeight = 20;
var brickPadding = 10;
var brickOffsetTop = 30;
var brickOffsetLeft = 60;
var score = 0;
var lives = 3;
var acceleration = 1;
var baseSpeed = 2;
var isPaused = false;
var isGameOver = false;
var isGameWin = false;
var bricks = [];
var balls = [];
var powerups = [];
var bonusChance = 0.2;
var bonusTypes = ['life', 'extraBall'];
var bonusRadius = 10;
var lastActiveBall = null;

for(var c=0; c<brickColumnCount; c++) {
    bricks[c] = [];
    for(var r=0; r<brickRowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1, hasBonus: false };
    }
}

// Устанавливаем hasBonus = true для случайных кирпичей (примерно 20%, минимум 10%)
var totalBricks = brickRowCount * brickColumnCount;
var minBonusCount = Math.max(1, Math.floor(totalBricks * 0.1));
var maxBonusCount = Math.floor(totalBricks * 0.2);
var bonusCount = Math.floor(Math.random() * (maxBonusCount - minBonusCount + 1)) + minBonusCount;

// Уникальные позиции бонусов
var bonusPositions = [];
while(bonusPositions.length < bonusCount) {
    var randomC = Math.floor(Math.random() * brickColumnCount);
    var randomR = Math.floor(Math.random() * brickRowCount);
    var position = randomC + ',' + randomR;
    if(bonusPositions.indexOf(position) === -1) {
        bonusPositions.push(position);
        bricks[randomC][randomR].hasBonus = true;
    }
}

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);
document.addEventListener("mousemove", mouseMoveHandler, false);

function keyDownHandler(e) {
    if(e.keyCode == 39) {
        rightPressed = true;
    }
    else if(e.keyCode == 37) {
        leftPressed = true;
    }
    else if(e.keyCode == 32) {
        isPaused = !isPaused;
    }
}

function keyUpHandler(e) {
    if(e.keyCode == 39) {
        rightPressed = false;
    }
    else if(e.keyCode == 37) {
        leftPressed = false;
    }
}

function mouseMoveHandler(e) {
    var relativeX = e.clientX - canvas.offsetLeft;
    if(relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth/2;
        if(paddleX < 0) paddleX = 0;
        if(paddleX + paddleWidth > canvas.width) paddleX = canvas.width - paddleWidth;
    }
}

function initBalls() {
    balls = [{ x: canvas.width/2, y: canvas.height-30, dx: 1, dy: -1 }];
    lastActiveBall = balls[0];
}

function spawnBonus(x, y, c, r) {
    // Бонус гарантированно появляется из желтых кирпичей
    var bonusType = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
    powerups.push({
        x: x,
        y: y,
        type: bonusType,
        dy: 2,
        width: 20,
        height: 10
    });
}

function drawBonus(bonus) {
    ctx.beginPath();
    if(bonus.type === 'life') {
        ctx.fillStyle = "#00ff00";
        ctx.arc(bonus.x, bonus.y, bonusRadius, 0, Math.PI*2);
    } else {
        ctx.fillStyle = "#ff00ff";
        ctx.arc(bonus.x, bonus.y, bonusRadius, 0, Math.PI*2);
    }
    ctx.fill();
    ctx.closePath();
}

function drawBalls() {
    for(var i=0; i<balls.length; i++) {
        var b = balls[i];
        ctx.beginPath();
        ctx.arc(b.x, b.y, ballRadius, 0, Math.PI*2);
        ctx.fillStyle = "#cc00ff";
        ctx.fill();
        ctx.closePath();
    }
}

function updateBalls() {
    for(var i=balls.length-1; i>=0; i--) {
        var b = balls[i];
        b.x += b.dx * acceleration;
        b.y += b.dy * acceleration;

        // Отскок от стен
        if(b.x + b.dx > canvas.width-ballRadius || b.x + b.dx < ballRadius) {
            b.dx = -b.dx;
        }
        // Отскок от верха
        if(b.y + b.dy < ballRadius) {
            b.dy = -b.dy;
        }
        // Проверка столкновения с платформой
        if(b.y + b.dy >= paddleY - 2 && b.y + b.dy <= paddleY + paddleHeight + 2) {
            if(b.x > paddleX && b.x < paddleX + paddleWidth) {
                b.dy = -b.dy;
                b.y = paddleY - ballRadius - 1;
                lastActiveBall = b;
            }
        }
        // Проверка падения вниз
        if(b.y + b.dy > canvas.height-ballRadius) {
            balls.splice(i, 1);
            if(balls.length === 0) {
                lives--;
                if(!lives) {
                    isGameOver = true;
                } else {
                    resetBall();
                }
            }
        }
    }
}

function drawPowerups() {
    for(var i=0; i<powerups.length; i++) {
        var p = powerups[i];
        drawBonus(p);
        p.y += p.dy;
    }
}

function checkPowerupCollection() {
    for(var i=powerups.length-1; i>=0; i--) {
        var p = powerups[i];
        if(p.y > canvas.height) {
            powerups.splice(i, 1);
            continue;
        }
        // Проверка сбора бонуса только платформой
        if(paddleX < p.x && paddleX + paddleWidth > p.x &&
           paddleY <= p.y + bonusRadius && paddleY + paddleHeight >= p.y - bonusRadius) {
            if(p.type === 'life') {
                lives++;
            } else if(p.type === 'extraBall') {
                // Создаем дополнительный шарик, отлетающий в случайную сторону от последнего активного шарика
                if(lastActiveBall) {
                    var randomDx = Math.random() < 0.5 ? -1 : 1;
                    var randomDy = Math.random() < 0.5 ? -1 : 1;
                    balls.push({
                        x: lastActiveBall.x,
                        y: lastActiveBall.y,
                        dx: lastActiveBall.dx * randomDx * 0.8,
                        dy: lastActiveBall.dy * randomDy * 0.8
                    });
                }
            }
            powerups.splice(i, 1);
        }
    }
}

function resetBall() {
    balls = [{ x: canvas.width/2, y: canvas.height-30, dx: 1, dy: -1 }];
    lastActiveBall = balls[0];
    acceleration = 1;
    paddleX = (canvas.width-paddleWidth)/2;
}

function collisionDetection() {
    for(var c=0; c<brickColumnCount; c++) {
        for(var r=0; r<brickRowCount; r++) {
            var b = bricks[c][r];
            if(b.status == 1) {
                for(var i=0; i<balls.length; i++) {
                    var ball = balls[i];
                    if(ball.x > b.x && ball.x < b.x+brickWidth && 
                       ball.y > b.y && ball.y < b.y+brickHeight) {
                        ball.dy = -ball.dy;
                        b.status = 0;
                        score++;
                        if(b.hasBonus) {
                            spawnBonus(b.x + brickWidth/2, b.y + brickHeight, c, r);
                        }
                        lastActiveBall = ball;
                        
                        if(score == brickRowCount*brickColumnCount) {
                            isGameWin = true;
                        }
                    }
                }
            }
        }
    }
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, paddleY, paddleWidth, paddleHeight);
    ctx.fillStyle = "#666600";
    ctx.fill();
    ctx.closePath();
}

function drawBricks() {
    for(var c=0; c<brickColumnCount; c++) {
        for(var r=0; r<brickRowCount; r++) {
            if(bricks[c][r].status == 1) {
                var brickX = (r*(brickWidth+brickPadding))+((canvas.width-(brickWidth*brickRowCount+brickPadding*(brickRowCount-1)))/2);
                var brickY = (c*(brickHeight+brickPadding))+brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.beginPath();					
                
                // Кирпичи с бонусами имеют желтую заливку
                if(bricks[c][r].hasBonus) {
                    ctx.fillStyle = "#ffff00";
                } else {
                    ctx.fillStyle = "#0095DD";
                }
                
                ctx.rect(brickX, brickY, brickWidth, brickHeight);					
                ctx.fill();
                ctx.shadowColor = '#696969';
                ctx.shadowOffsetX = 4;
                ctx.shadowBlur = 4;
                ctx.closePath();
            }
        }
    }
}

function drawScore() {
    ctx.font = "22px Harrington";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("Score: "+score, 8, 20);
}

function drawLives() {
    ctx.font = "22px Harrington";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("Lives: "+lives, canvas.width-80, 20);
}

function drawPause() {
    ctx.font = "40px Harrington";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText("PAUSE", canvas.width/2, canvas.height/2);
    ctx.font = "20px Harrington";
    ctx.fillText("Press SPACE to continue", canvas.width/2, canvas.height/2 + 40);
}

function drawGameOver() {
    ctx.font = "50px Harrington";
    ctx.fillStyle = "#ff0000";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 - 20);
    ctx.font = "22px Harrington";
    ctx.fillText("Final Score: "+score, canvas.width/2, canvas.height/2 + 30);
    ctx.font = "20px Harrington";
    ctx.fillText("Press F5 to restart", canvas.width/2, canvas.height/2 + 70);
}

function drawGameWin() {
    ctx.font = "50px Harrington";
    ctx.fillStyle = "#00ff00";
    ctx.textAlign = "center";
    ctx.fillText("YOU WIN!", canvas.width/2, canvas.height/2 - 20);
    ctx.font = "22px Harrington";
    ctx.fillText("Final Score: "+score, canvas.width/2, canvas.height/2 + 30);
    ctx.font = "20px Harrington";
    ctx.fillText("Press F5 to restart", canvas.width/2, canvas.height/2 + 70);
}

function draw() {
    if(!isPaused && !isGameOver && !isGameWin) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBricks();
        drawBalls();
        drawPaddle();
        drawPowerups();
        drawScore();
        drawLives();
        collisionDetection();
        updateBalls();
        checkPowerupCollection();
        acceleration += 0.001;
    }
    if(isGameOver) {
        drawGameOver();
    }
    else if(isGameWin) {
        drawGameWin();
    }
    else if(isPaused) {
        drawPause();
    }
    requestAnimationFrame(draw);
}

initBalls();
draw();
